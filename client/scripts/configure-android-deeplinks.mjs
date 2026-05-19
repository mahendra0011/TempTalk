import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultHosts = ["temptalk-client.onrender.com", "temptalk.vercel.app", "ghostchat.vercel.app"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getHosts() {
  const raw = process.env.ANDROID_APP_LINK_HOSTS || process.env.VITE_APP_LINK_HOSTS || defaultHosts.join(",");
  return [...new Set(raw.split(",").map((host) => host.trim().toLowerCase()).filter(Boolean))];
}

function intentFilterForHost(host) {
  return `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />

                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />

                <data
                    android:scheme="https"
                    android:host="${host}"
                    android:pathPrefix="/" />
            </intent-filter>`;
}

function buildDeepLinkBlock(hosts) {
  return `
            <!-- TempTalk deep links: invite links should open the installed app. -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />

                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />

                <data
                    android:scheme="temptalk"
                    android:host="open" />
            </intent-filter>
${hosts.map(intentFilterForHost).join("\n")}
            <!-- /TempTalk deep links -->`;
}

function injectDeepLinks(manifest, hosts) {
  const startMarker = "<!-- TempTalk deep links:";
  const endMarker = "<!-- /TempTalk deep links -->";
  const block = buildDeepLinkBlock(hosts);

  if (manifest.includes(startMarker) && manifest.includes(endMarker)) {
    return manifest.replace(new RegExp(`\\s*${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`), block);
  }

  const closingActivity = /(\s*)<\/activity>/;
  if (!closingActivity.test(manifest)) {
    throw new Error("Could not find MainActivity closing tag in AndroidManifest.xml.");
  }

  return manifest.replace(closingActivity, `${block}\n$1</activity>`);
}

const defaultManifestPath = fileURLToPath(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url));
const manifestPath = resolve(process.env.ANDROID_MANIFEST_PATH || defaultManifestPath);
const hosts = getHosts();
const manifest = await readFile(manifestPath, "utf8");
const nextManifest = injectDeepLinks(manifest, hosts);

await mkdir(dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, nextManifest, "utf8");

console.log(`TempTalk Android deep links configured for: ${hosts.join(", ")}`);
