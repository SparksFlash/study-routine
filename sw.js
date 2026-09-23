/* Study Routine — service worker: offline support.
 * Network first (so a new deploy shows up right away), cached copy when offline.
 * Bump VERSION when the list of files changes.
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
      var fromCache = function () {
        return cache.match(req, { ignoreSearch: isPage }).then(function (hit) {
          return hit || (isPage ? cache.match("./") : undefined);
        });
      };
      var network = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(isPage ? "./" : req, res.clone());
        return res;
      });
      // Network first so updates show immediately; fall back to cache when offline or slow (> 3 s).
      var timeout = new Promise(function (resolve) { setTimeout(resolve, 3000); }).then(fromCache);
      return Promise.race([network.catch(fromCache), timeout.then(function (hit) { return hit || network; })])
        .then(function (res) { return res || fromCache(); })
        .then(function (res) { return res || Response.error(); })
        .catch(function () { return fromCache().then(function (res) { return res || Response.error(); }); });
    })
  );
});
