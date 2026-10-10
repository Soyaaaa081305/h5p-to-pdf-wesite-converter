const CACHE_NAME = "h5p-pdf-shell-v4";
const root = new URL("./", self.location.href);
const shell = ["index.html", "manifest.webmanifest", "favicon.svg"].map(
  (p) => new URL(p, root).href,
);
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((c) => c.addAll(shell))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("h5p-pdf-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== root.origin || url.search)
    return;
  const relative = url.pathname.slice(root.pathname.length);
  const isShell = shell.includes(url.href) || url.href === root.href;
  const isBuildAsset =
    url.pathname.startsWith(root.pathname) &&
    /^assets\/[\w.-]+\.(js|css|woff2?|png|svg)$/.test(relative);
  if (!isShell && !isBuildAsset) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((c) => c.put(request, copy)),
          );
        }
        return response;
      })
      .catch(
        async () =>
          (await caches.match(request)) ||
          (isShell ? await caches.match(shell[0]) : undefined) ||
          Response.error(),
      ),
  );
});
