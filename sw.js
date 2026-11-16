const V = 'd8efdfc19c', C = 'bitacora-' + V, PRE = ["./", "manifest.webmanifest", "assets/icon-192.png", "assets/fonts/fraunces-latin.woff2", "assets/fonts/instrument-sans-latin.woff2", "assets/core.css?v=d8efdfc19c", "assets/core.js?v=d8efdfc19c", "assets/ahora.css?v=d8efdfc19c", "assets/ahora.js?v=d8efdfc19c", "jefes/", "assets/jefes.css?v=d8efdfc19c", "assets/jefes.js?v=d8efdfc19c", "tareas/", "assets/tareas.css?v=d8efdfc19c", "assets/tareas.js?v=d8efdfc19c", "personaje/", "assets/personaje.css?v=d8efdfc19c", "assets/personaje.js?v=d8efdfc19c", "pets/", "assets/pets.css?v=d8efdfc19c", "assets/pets.js?v=d8efdfc19c"];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(PRE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bitacora-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
const r = e.request;
if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
if (r.mode === 'navigate') {
e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; })
.catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./'))));
return;
}
e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
return res;
})));
});
self.addEventListener('notificationclick', e => {
e.notification.close();
const href = e.notification.data?.href || './';
e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow(href)));
});
