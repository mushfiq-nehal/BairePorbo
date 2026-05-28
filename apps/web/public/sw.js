/**
 * BairePorbo Service Worker
 * Provides an offline shell so the app loads instantly on repeat visits
 * and shows a friendly offline page when there's no connection.
 *
 * Strategy:
 *  - App shell (HTML, logo, manifest) → Cache-first
 *  - API calls → Network-first (never serve stale scholarship data)
 *  - Everything else → Network-first with cache fallback
 */

const CACHE_NAME = "baireporbo-v1";

const SHELL_ASSETS = [
  "/",
  "/scholarships",
  "/chat",
  "/dashboard",
  "/logo.png",
  "/manifest.json",
  "/offline.html",
];

// ── Install: pre-cache the shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for shell ──────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API routes → always network, never cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Everything else → network-first, fall back to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            caches.match("/offline.html") ||
            new Response("Offline", { status: 503 })
        )
      )
  );
});
