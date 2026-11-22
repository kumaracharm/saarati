/*
 * SAARTHI service worker — app shell caching + offline fallback.
 *
 * Rules (do not weaken):
 *  - Only same-origin GET requests are handled. Cross-origin requests are never cached.
 *  - /api/* is never cached.
 *  - Requests carrying an Authorization header or credentials: "include" are never cached.
 *  - Requests whose query string names a token/auth/secret/session/key/otp/password
 *    parameter are never cached.
 *  - Nothing containing secrets or auth tokens is ever written to Cache Storage.
 */

const CACHE_VERSION = "saarthi-shell-v1";
const SHELL_CACHE = CACHE_VERSION;
const SHELL_URLS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];
const SENSITIVE_PARAM = /token|auth|secret|session|key|otp|password/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Cross-origin (including any external API): do not respond, do not cache.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache API calls.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Never cache authenticated or credentialed requests.
  if (request.headers.has("authorization") || request.credentials === "include") {
    return;
  }

  // Never cache URLs carrying sensitive query parameters.
  for (const name of url.searchParams.keys()) {
    if (SENSITIVE_PARAM.test(name)) {
      return;
    }
  }

  // Navigations: network-first, fall back to the cached offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(SHELL_CACHE).then((cache) => cache.match("/offline.html"))
      )
    );
    return;
  }

  // Static build assets and icons: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(SHELL_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request).then((response) => {
            if (response.ok && response.type === "basic") {
              cache.put(request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Everything else: let the network handle it.
});
