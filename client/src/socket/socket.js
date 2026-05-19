import { io } from "socket.io-client";

const API_STORAGE_KEY = "temptalk:api-url";
const viteEnv = import.meta.env || {};
const DEFAULT_API_URL = viteEnv.VITE_API_URL || "http://localhost:5000";

function normalizeApiUrl(value) {
  try {
    const url = new URL(String(value || "").trim());

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.origin;
  } catch {
    return "";
  }
}

function apiFromHash(hash = "") {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  return params.get("api") || params.get("apiUrl") || "";
}

function getStoredApiUrl() {
  if (typeof localStorage === "undefined") {
    return "";
  }

  try {
    return localStorage.getItem(API_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function setStoredApiUrl(value) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(API_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable in private/browser-restricted contexts.
  }
}

function createSocket(url) {
  return io(url, {
    autoConnect: false,
    transports: ["websocket", "polling"]
  });
}

function resolveInitialApiUrl() {
  const currentHash = typeof window !== "undefined" ? window.location.hash : "";

  return (
    normalizeApiUrl(apiFromHash(currentHash)) ||
    normalizeApiUrl(getStoredApiUrl()) ||
    normalizeApiUrl(DEFAULT_API_URL) ||
    "http://localhost:5000"
  );
}

export let API_URL = resolveInitialApiUrl();
export let socket = createSocket(API_URL);

export function configureApiUrl(value) {
  const nextUrl = normalizeApiUrl(value);

  if (!nextUrl) {
    return false;
  }

  setStoredApiUrl(nextUrl);

  if (nextUrl === API_URL) {
    return true;
  }

  socket.disconnect();
  API_URL = nextUrl;
  socket = createSocket(API_URL);
  return true;
}

export function configureApiUrlFromHash(hash = typeof window !== "undefined" ? window.location.hash : "") {
  return configureApiUrl(apiFromHash(hash));
}

export function configureApiUrlFromInviteUrl(rawUrl) {
  if (!rawUrl) {
    return false;
  }

  try {
    let target = new URL(rawUrl);

    if (target.protocol === "temptalk:" && target.hostname === "open") {
      const originalUrl = target.searchParams.get("url");
      if (!originalUrl) {
        return false;
      }

      target = new URL(originalUrl);
    }

    return configureApiUrlFromHash(target.hash);
  } catch {
    return false;
  }
}

configureApiUrlFromHash();
