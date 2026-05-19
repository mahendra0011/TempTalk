import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { configureApiUrlFromInviteUrl } from "../socket/socket.js";

const ANDROID_PACKAGE = "com.temptalk.app";
const OPEN_APP_MARKER = "openAppTried";

function isChatInviteRoute(pathname) {
  return pathname.startsWith("/chat/");
}

function withOpenAppMarker(url) {
  const target = new URL(url);
  const params = new URLSearchParams(target.hash.replace(/^#/, ""));
  params.set(OPEN_APP_MARKER, "1");
  target.hash = params.toString();
  return target.toString();
}

function hasOpenAppMarker() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get(OPEN_APP_MARKER) === "1";
}

export function routeFromDeepLink(rawUrl) {
  if (!rawUrl) {
    return "";
  }

  try {
    let target = new URL(rawUrl);

    if (target.protocol === "temptalk:" && target.hostname === "open") {
      const originalUrl = target.searchParams.get("url");
      if (!originalUrl) {
        return "";
      }

      target = new URL(originalUrl);
    }

    const route = `${target.pathname}${target.search}${target.hash}`;

    if (route === "/" || route.startsWith("/chat/") || route.startsWith("/privacy") || route.startsWith("/ended")) {
      return route;
    }
  } catch {
    return "";
  }

  return "";
}

export function registerNativeDeepLinks(navigate) {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  let listenerHandle = null;
  let disposed = false;

  function openUrl(url, replace = false) {
    configureApiUrlFromInviteUrl(url);
    const route = routeFromDeepLink(url);

    if (route) {
      navigate(route, { replace });
    }
  }

  CapacitorApp.getLaunchUrl()
    .then((launch) => {
      if (!disposed) {
        openUrl(launch?.url, true);
      }
    })
    .catch(() => {});

  CapacitorApp.addListener("appUrlOpen", (event) => openUrl(event?.url))
    .then((handle) => {
      listenerHandle = handle;
    })
    .catch(() => {});

  return () => {
    disposed = true;
    listenerHandle?.remove?.();
  };
}

export function maybeOpenInstalledAndroidApp() {
  if (Capacitor.isNativePlatform() || !/Android/i.test(navigator.userAgent) || !isChatInviteRoute(window.location.pathname)) {
    return;
  }

  if (hasOpenAppMarker()) {
    return;
  }

  const currentUrl = window.location.href;
  const fallbackUrl = withOpenAppMarker(currentUrl);
  const appUrl = `intent://open?url=${encodeURIComponent(currentUrl)}#Intent;scheme=temptalk;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;

  window.location.replace(appUrl);
}
