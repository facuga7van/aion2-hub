const V = '0cfa7eaaad', C = 'bitacora-' + V, PRE = ["./", "manifest.webmanifest", "assets/icon-192.png", "assets/fonts/fraunces-latin.woff2", "assets/fonts/instrument-sans-latin.woff2", "assets/core.css?v=0cfa7eaaad", "assets/core.js?v=0cfa7eaaad", "assets/ahora.css?v=0cfa7eaaad", "assets/ahora.js?v=0cfa7eaaad", "jefes/", "assets/jefes.css?v=0cfa7eaaad", "assets/jefes.js?v=0cfa7eaaad", "tareas/", "assets/tareas.css?v=0cfa7eaaad", "assets/tareas.js?v=0cfa7eaaad", "personaje/", "assets/personaje.css?v=0cfa7eaaad", "assets/personaje.js?v=0cfa7eaaad", "pets/", "assets/pets.css?v=0cfa7eaaad", "assets/pets.js?v=0cfa7eaaad", "assets/ic/Icon_Currency_Treasure_Key_Legend_004.webp", "assets/ic/Icon_Currency_Treasure_Key_Legend_006.webp", "assets/ic/Icon_Item_Currency_AbyssTicekt_A_c_001.webp", "assets/ic/Icon_Item_Odenergy_A_001.webp", "assets/ic/Icon_Ticket_Entrance_BossChallenge_001.webp", "assets/ic/Icon_Ticket_Entrance_Raid_001.webp", "assets/ic/Icon_abysspoint.webp", "assets/jefes/UT_256_MOB_AbBoss_01-80.webp", "assets/jefes/UT_256_MOB_BeritraD_01-80.webp", "assets/jefes/UT_256_MOB_EleKing_01_V02-80.webp"], HOME = new URL('./', location).href;
const PAGES = [["", "Ahora"], ["jefes/", "Jefes"], ["tareas/", "Tareas"], ["personaje/", "Personaje"], ["pets/", "Pets"]], OFFLINE = "<!doctype html><html lang=\"es-AR\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Sin conexión · Bitácora Daeva</title><meta name=\"robots\" content=\"noindex\"><meta name=\"theme-color\" content=\"#100D12\"><meta name=\"color-scheme\" content=\"dark\">\n<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23100D12'/%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%239C7B40' stroke-width='1.6'/%3E%3Cpath d='M16 5 18.2 13.8 27 16 18.2 18.2 16 27 13.8 18.2 5 16 13.8 13.8Z' fill='%23E3B866'/%3E%3C/svg%3E\"><style>\nbody{margin:0;min-height:100vh;display:grid;place-items:center;background:#100D12;color:#EFE6D6;font:16px/1.55 system-ui,-apple-system,\"Segoe UI\",sans-serif;text-align:center;padding:24px;box-sizing:border-box}\nsvg{width:72px;height:72px}h1{font:600 28px/1.2 Georgia,serif;margin:16px 0 6px}p{margin:0 0 22px;color:#B3A9B8}\n.go{display:inline-flex;align-items:center;min-height:44px;padding:0 22px;border:0;border-radius:12px;background:linear-gradient(180deg,#EDC67A,#D9A955);color:#24180A;font:inherit;font-weight:600;text-decoration:none;cursor:pointer}\n.go:focus-visible,nav a:focus-visible{outline:2px solid #E3B866;outline-offset:3px}\nnav{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 8px;margin-top:22px}nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:#E3B866}.sub{margin:28px 0 0}.sub+nav{margin-top:4px}\n</style></head><body><main><svg viewBox=\"0 0 32 32\" aria-hidden=\"true\"><circle cx=\"16\" cy=\"16\" r=\"12\" fill=\"none\" stroke=\"#9C7B40\" stroke-width=\"1.2\"/><path d=\"M16 5 18.2 13.8 27 16 18.2 18.2 16 27 13.8 18.2 5 16 13.8 13.8Z\" fill=\"#E3B866\"/></svg>\n<h1>Sin conexión</h1><p>Esta sección todavía no está guardada en este dispositivo. Cuando vuelva la red, tocá Reintentar.</p><button class=\"go\" type=\"button\" onclick=\"location.reload()\">Reintentar</button><!--L--></main></body></html>\n";
const get = (r, n = 1) => fetch(r).then(res => res.status >= 500 && n ? new Promise(ok => setTimeout(ok, 700)).then(() => get(r, n - 1)) : res);
async function offline() {
const have = await Promise.all(PAGES.map(([h]) => caches.match(new URL(h, HOME).href, { ignoreSearch: true })));
const links = PAGES.filter((_, i) => have[i]).map(([h, l]) => `<a href="${new URL(h, HOME).href}">${l}</a>`).join('');
return new Response(OFFLINE.replace('<!--L-->', () => links ? `<p class="sub">Estas sí andan sin red:</p><nav aria-label="Secciones guardadas en este dispositivo">${links}</nav>` : ''),
{ status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(PRE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bitacora-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
const r = e.request;
if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
if (r.mode === 'navigate') {
e.respondWith(get(r).then(res => {
if (res.ok || res.type === 'opaqueredirect') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
return res.status >= 500 ? caches.match(r, { ignoreSearch: true }).then(m => m || res) : res;
})
.catch(async () => await caches.match(r, { ignoreSearch: true }) || offline()));
return;
}
e.respondWith(caches.match(r).then(m => m || get(r).then(res => {
if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
return res;
})));
});
self.addEventListener('notificationclick', e => {
e.notification.close();
const href = e.notification.data?.href || './';
e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow(href)));
});
