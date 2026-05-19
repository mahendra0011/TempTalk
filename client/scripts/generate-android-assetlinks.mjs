import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultPackageName = "com.temptalk.app";

function normalizeFingerprint(value) {
  const hex = String(value || "")
    .trim()
    .replace(/[^a-fA-F0-9]/g, "")
    .toUpperCase();

  if (!/^[A-F0-9]{64}$/.test(hex)) {
    throw new Error(`Invalid Android SHA256 fingerprint: ${value}`);
  }

  return hex.match(/../g).join(":");
}

function getFingerprints() {
  const raw =
    process.env.ANDROID_CERT_SHA256_FINGERPRINTS ||
    process.env.ANDROID_CERT_SHA256 ||
    process.env.ANDROID_APP_LINK_SHA256 ||
    "";

  return [
    ...new Set(
      raw
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalizeFingerprint)
    )
  ];
}

const fingerprints = getFingerprints();

if (!fingerprints.length) {
  throw new Error("Set ANDROID_CERT_SHA256_FINGERPRINTS to generate assetlinks.json.");
}

const packageName = process.env.ANDROID_PACKAGE_NAME || defaultPackageName;
const defaultOutputPath = fileURLToPath(new URL("../public/.well-known/assetlinks.json", import.meta.url));
const outputPath = resolve(process.env.ANDROID_ASSETLINKS_OUTPUT || defaultOutputPath);
const assetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: fingerprints
    }
  }
];

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(assetLinks, null, 2)}\n`, "utf8");

console.log(`Android asset links generated for ${packageName}: ${fingerprints.join(", ")}`);
