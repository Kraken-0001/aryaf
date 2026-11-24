// Offline support: cache the app files on install, serve from cache first, refresh in the background.
// Bump CACHE when you change any file so phones pick up the new version.
const CACHE = "aryaf-inventory-v21";
const FILES = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== "aryaf-meta").map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined));
      return hit || net;
    })
  );
});

self.addEventListener("periodicsync", (e) => {
  if (e.tag !== "backup-check") return;
  e.waitUntil(
    caches.open("aryaf-meta").then((c) => c.match("meta.json")).then((r) => (r ? r.json() : null)).then((m) => {
      if (!m || !m.has || Date.now() - m.t < 7 * 864e5) return;
      return self.registration.showNotification("أرياف", { body: "مرّ أسبوع بدون نسخة احتياطية. افتح التطبيق ونزّل نسخة.", icon: "icon-192.png", tag: "backup" });
    }).catch(() => {})
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((l) => (l[0] ? l[0].focus() : self.clients.openWindow("./"))));
});
