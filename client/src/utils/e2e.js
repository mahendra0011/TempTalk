const PREFIX = "e2e:v1:";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getRawKey(value) {
  const clean = String(value || "").trim();

  if (!clean) {
    throw new Error("Encryption key missing.");
  }

  try {
    const decoded = base64UrlToBytes(clean);
    if (decoded.byteLength === 32) {
      return decoded;
    }
  } catch {
    // Fall back to hashing custom passphrases.
  }

  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(clean)));
}

async function importAesKey(value) {
  const rawKey = await getRawKey(value);
  return crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function deriveRoomKey(roomId, secret) {
  const cleanRoomId = String(roomId || "").trim().toLowerCase();
  const cleanSecret = String(secret || "").trim();

  if (!cleanRoomId || !cleanSecret) {
    return "";
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`temptalk:e2e:v1:${cleanRoomId}:${cleanSecret}`)
  );

  return bytesToBase64Url(new Uint8Array(digest));
}

export function isEncryptedText(value) {
  return String(value || "").startsWith(PREFIX);
}

export async function encryptText(value, key) {
  const text = String(value || "");

  if (!text) {
    return "";
  }

  const aesKey = await importAesKey(key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoder.encode(text));

  return `${PREFIX}${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptText(value, key) {
  const text = String(value || "");

  if (!isEncryptedText(text)) {
    return text;
  }

  if (!key) {
    return "Encrypted message";
  }

  try {
    const [ivText, cipherText] = text.slice(PREFIX.length).split(".");
    const aesKey = await importAesKey(key);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(ivText) },
      aesKey,
      base64UrlToBytes(cipherText)
    );

    return decoder.decode(decrypted);
  } catch {
    return "Encrypted message";
  }
}

export function inviteKeyFromHash(hash = "") {
  const clean = String(hash || "").replace(/^#/, "");
  const params = new URLSearchParams(clean);
  return params.get("key") || params.get("e2e") || "";
}

export function inviteSecretFromHash(hash = "") {
  const clean = String(hash || "").replace(/^#/, "");
  const params = new URLSearchParams(clean);
  return params.get("secret") || params.get("roomSecret") || params.get("s") || "";
}

export function appendInviteKey(url, key, secret = "") {
  if (!key && !secret) {
    return url;
  }

  const target = new URL(url, window.location.origin);
  const params = new URLSearchParams(target.hash.replace(/^#/, ""));

  if (key) {
    params.set("key", key);
  }

  if (secret) {
    params.set("secret", secret);
  }

  target.hash = params.toString();
  return target.toString();
}

export function parseRoomInvite(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return { roomId: "", key: "", secret: "" };
  }

  try {
    const parsed = new URL(raw, window.location.origin);
    const match = parsed.pathname.match(/\/chat\/([^/?#]+)/);

    if (match) {
      return {
        roomId: decodeURIComponent(match[1]),
        key: inviteKeyFromHash(parsed.hash),
        secret: inviteSecretFromHash(parsed.hash)
      };
    }
  } catch {
    // Treat non-URL input as a room id below.
  }

  const [roomId, hash = ""] = raw.split("#");
  return {
    roomId: roomId.trim(),
    key: inviteKeyFromHash(hash ? `#${hash}` : ""),
    secret: inviteSecretFromHash(hash ? `#${hash}` : "")
  };
}
