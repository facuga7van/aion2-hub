const V = '7c64b0fb22', C = 'bitacora-' + V, PRE = ["./", "manifest.webmanifest", "assets/icon-192.png", "assets/fonts/fraunces-latin.woff2", "assets/fonts/instrument-sans-latin.woff2", "assets/core.css?v=7c64b0fb22", "assets/core.js?v=7c64b0fb22", "assets/ahora.css?v=7c64b0fb22", "assets/ahora.js?v=7c64b0fb22", "jefes/", "assets/jefes.css?v=7c64b0fb22", "assets/jefes.js?v=7c64b0fb22", "tareas/", "assets/tareas.css?v=7c64b0fb22", "assets/tareas.js?v=7c64b0fb22", "personaje/", "assets/personaje.css?v=7c64b0fb22", "assets/personaje.js?v=7c64b0fb22", "pets/", "assets/pets.css?v=7c64b0fb22", "assets/pets.js?v=7c64b0fb22", "assets/ic/Icon_Currency_Treasure_Key_Legend_004.webp", "assets/ic/Icon_Currency_Treasure_Key_Legend_006.webp", "assets/ic/Icon_Item_Currency_AbyssTicekt_A_c_001.webp", "assets/ic/Icon_Item_Odenergy_A_001.webp", "assets/ic/Icon_Ticket_Entrance_BossChallenge_001.webp", "assets/ic/Icon_Ticket_Entrance_Raid_001.webp", "assets/ic/Icon_abysspoint.webp", "assets/jefes/UT_256_MOB_AbBoss_01-80.webp", "assets/jefes/UT_256_MOB_BeritraD_01-80.webp", "assets/jefes/UT_256_MOB_EleKing_01_V02-80.webp"], HOME = new URL('./', location).href;
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(PRE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bitacora-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
const r = e.request;
if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
if (r.mode === 'navigate') {
e.respondWith(fetch(r).then(res => {
if (res.ok || res.type === 'opaqueredirect') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
return res.status >= 500 ? caches.match(r, { ignoreSearch: true }).then(m => m || res) : res;
})
.catch(async () => await caches.match(r, { ignoreSearch: true }) || (await caches.match(HOME) ? Response.redirect(HOME, 302) : Response.error())));
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
