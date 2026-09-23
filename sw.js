/* Study Routine — service worker: offline support.
 * Serves files from cache instantly and refreshes them in the background,
 * so a new version shows up on the next open. Bump VERSION to force a full refresh.
 */
var VERSION = "v1";
var CACHE = "study-routine-" + VERSION;
var FILES = [
  "./",
  "index.html",
  "styles.css",
  "data.js",
  "logic.js",
  "app.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("study-routine-") === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  var isPage = req.mode === "navigate";
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: isPage }).then(function (cached) {
        var network = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(isPage ? "./" : req, res.clone());
          return res;
        }).catch(function () {
          if (cached) return cached;
          return (isPage ? cache.match("./") : Promise.resolve()).then(function (r) { return r || Response.error(); });
        });
        if (cached) { event.waitUntil(network.catch(function () {})); return cached; }
        return network;
      });
    })
  );
});
