/**
 * BairePorbo Service Worker
 * Provides an offline shell so the app loads instantly on repeat visits
 * and shows a friendly offline page when there's no connection.
 *
 * Strategy:
 *  - App shell (HTML, logo, manifest) → Cache-first
 *  - API calls → Network-first (never serve stale scholarship data)
 *  - Next.js router/RSC data fetches → always network, never intercepted
 *  - Everything else → Network-first with cache fallback
 */

const CACHE_VERSION = "v2";
const CACHE_NAME = `baireporbo-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const SHELL_ASSETS = [
  "/",
  "/scholarships",
  "/chat",
  "/dashboard",
  "/logo.png",
  "/manifest.json",
  OFFLINE_URL,
];

// ── Install: pre-cache the shell ──────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // `cache.addAll` is all-or-nothing: if a single shell asset is
      // momentarily unreachable the whole call rejects and NOTHING gets
      // cached — including the offline page itself. Cache each asset
      // independently instead so one flaky request can't take the rest down.
      await Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)));
    })(),
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
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

  // Next.js's client-side router fetches page data (RSC "flight" streams),
  // not HTML — using the cached HTML page or the offline fallback for one of
  // these breaks the router (it can't parse HTML as a flight stream) and can
  // take down navigation on the page entirely. Always let these hit network.
  const isRouterDataRequest =
    request.headers.has("rsc") ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-segment-prefetch");
  if (isRouterDataRequest) return;

  // Everything else → network-first, fall back to cache, then offline page
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      } catch {
        // Network failed outright (offline / DNS / connection reset). Fall
        // back to a cached copy, then the offline shell — and always resolve
        // to a real Response so the browser never sees an invalid result
        // from respondWith (which shows up as a hard "page couldn't load").
        const cached = await caches.match(request);
        if (cached) return cached;
        const offline = await caches.match(OFFLINE_URL);
        if (offline) return offline;
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })(),
  );
});
