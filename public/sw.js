// Network first for every same-origin GET; the network always wins on deployments.
// Old caches are removed at activation. Hashed Vite assets avoid stale bundle reuse.
const CACHE = "isp-manager-demo-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("isp-manager-demo-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(event.request, { cache: "no-cache" });
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const shell = await cache.match(
            new URL("./", self.registration.scope),
          );
          if (shell) return shell;
        }
        return new Response(
          "الصفحة غير متاحة دون اتصال. افتحها مرة أثناء الاتصال أولاً.",
          {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          },
        );
      }
    })(),
  );
});
