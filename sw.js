const V = 'f93b5aea8d', C = 'bitacora-' + V, PRE = ["./", "manifest.webmanifest", "assets/icon-192.png", "assets/fonts/fraunces-latin.woff2", "assets/fonts/instrument-sans-latin.woff2", "assets/core.css?v=f93b5aea8d", "assets/core.js?v=f93b5aea8d", "assets/ahora.css?v=f93b5aea8d", "assets/ahora.js?v=f93b5aea8d", "jefes/", "assets/jefes.css?v=f93b5aea8d", "assets/jefes.js?v=f93b5aea8d", "tareas/", "assets/tareas.css?v=f93b5aea8d", "assets/tareas.js?v=f93b5aea8d", "personaje/", "assets/personaje.css?v=f93b5aea8d", "assets/personaje.js?v=f93b5aea8d", "pets/", "assets/pets.css?v=f93b5aea8d", "assets/pets.js?v=f93b5aea8d"];
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
