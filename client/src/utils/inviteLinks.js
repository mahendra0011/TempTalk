const DEFAULT_PUBLIC_CLIENT_URL = "https://temptalk-1.onrender.com";

function isPublicHttpOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function getPublicClientOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_CLIENT_URL || import.meta.env.VITE_CLIENT_URL || "";
  const current = typeof window !== "undefined" ? window.location.origin : "";
  const candidates = [configured, current, DEFAULT_PUBLIC_CLIENT_URL];
  const match = candidates.find(isPublicHttpOrigin) || DEFAULT_PUBLIC_CLIENT_URL;

  return new URL(match).origin;
}

export function buildRoomInviteUrl(roomId) {
  const target = new URL(`/chat/${encodeURIComponent(roomId)}`, getPublicClientOrigin());
  return target.toString();
}
