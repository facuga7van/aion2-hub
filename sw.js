const V = 'db50fa3fb7', C = 'bitacora-' + V, PRE = ["./", "manifest.webmanifest", "assets/icon-192.png", "assets/fonts/fraunces-latin.woff2", "assets/fonts/instrument-sans-latin.woff2", "assets/core.css?v=db50fa3fb7", "assets/core.js?v=db50fa3fb7", "assets/ahora.css?v=db50fa3fb7", "assets/ahora.js?v=db50fa3fb7", "jefes/", "assets/jefes.css?v=db50fa3fb7", "assets/jefes.js?v=db50fa3fb7", "tareas/", "assets/tareas.css?v=db50fa3fb7", "assets/tareas.js?v=db50fa3fb7", "personaje/", "assets/personaje.css?v=db50fa3fb7", "assets/personaje.js?v=db50fa3fb7", "pets/", "assets/pets.css?v=db50fa3fb7", "assets/pets.js?v=db50fa3fb7"];
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
