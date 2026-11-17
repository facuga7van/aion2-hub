const V = '46c22c94f0', C = 'bitacora-' + V, PRE = ["./", "manifest.webmanifest", "assets/icon-192.png", "assets/fonts/fraunces-latin.woff2", "assets/fonts/instrument-sans-latin.woff2", "assets/core.css?v=46c22c94f0", "assets/core.js?v=46c22c94f0", "assets/ahora.css?v=46c22c94f0", "assets/ahora.js?v=46c22c94f0", "jefes/", "assets/jefes.css?v=46c22c94f0", "assets/jefes.js?v=46c22c94f0", "tareas/", "assets/tareas.css?v=46c22c94f0", "assets/tareas.js?v=46c22c94f0", "personaje/", "assets/personaje.css?v=46c22c94f0", "assets/personaje.js?v=46c22c94f0", "pets/", "assets/pets.css?v=46c22c94f0", "assets/pets.js?v=46c22c94f0"];
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
