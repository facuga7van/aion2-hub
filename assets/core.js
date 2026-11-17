/* ---------- utilidades ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const ico = (id, c = '') => `<svg class="${c}" aria-hidden="true"><use href="#${id}"/></svg>`;
export const norm = s => String(s ?? '').replace(/<[^>]+>/g, '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export const isTyping = t => !!t?.closest?.('input,textarea,select,[contenteditable]');
export const MIN = 60e3, HOUR = 36e5, DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ---------- datos (inline en cada página por build.py) ---------- */
export const DATA = JSON.parse(document.getElementById('hub-data').textContent);
export const SCHEDULE = DATA.schedule, TASKS = DATA.tasks, SERVERS = DATA.servers, NAV = DATA.nav;
export const ROOT = new URL('../', import.meta.url).href;      // core.js vive en assets/
export const PAGE = document.documentElement.dataset.page;
const REG = SCHEDULE.regions, EVS = SCHEDULE.events;
export const EVENTS = new Map(EVS.map(e => [e.id, e]));
/* ---------- bus de eventos ---------- */
export const hub = new EventTarget();
export const emit = (type, detail) => hub.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => { const h = e => fn(e.detail); hub.addEventListener(type, h); return () => hub.removeEventListener(type, h); };
/* ---------- almacenamiento ---------- */
let warned = false;
function warnStorage() {
if (warned) return;
warned = true;
const w = $('#hub-warn');
if (w) w.hidden = false;
}
export const store = {
get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
set(k, v) {
try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); emit('store', k); return true; }
catch { warnStorage(); return false; }
},
};
export function versioned(key, v, def, migrate) {
return {
get() {
const o = store.get(key, null);
if (o && typeof o === 'object' && o.v === v) return { ...structuredClone(def), ...o };
const m = o && migrate ? migrate(o) : null;
return m ? { ...structuredClone(def), ...m, v } : { ...structuredClone(def), v };
},
set(o) { return store.set(key, { ...o, v }); },
};
}
export function onStore(key, fn) {
const h = e => { if (e.key === key || e.key === null) fn(); };
addEventListener('storage', h);
return () => removeEventListener('storage', h);
}
/* ---------- perfil: región, server, facción ---------- */
export const region = () => { const r = store.get('hub-region', 'la'); return REG[r] ? r : 'la'; };
export const serverTz = () => REG[region()].tz;
export function profile() {
return { region: region(), server: store.get('hub-server', null), faccion: store.get('hub-faccion', null) };
}
export function setProfile(p) {
for (const k of ['region', 'server', 'faccion']) if (k in p) store.set('hub-' + k, p[k] ?? null);
CACHE = null;
emit('profile', profile());
}
export const HUB_API = (v => /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(v) ? v : 'https://mora-server.tail3b8ec1.ts.net:8443')(String(store.get('hub-api', '') || '').replace(/\/$/, ''));
export const LNA_MSG = 'Chrome bloqueó la conexión con el servidor de la Bitácora. Si te preguntó por "dispositivos de tu red local", tocá Permitir (pasa si usás Tailscale).';
export async function lnaBlocked() {
try { return ['denied', 'prompt'].includes((await navigator.permissions.query({ name: 'local-network-access' })).state); } catch { return false; }
}
export const serverFaccion = id => id ? (String(id)[0] === '1' ? 'elyos' : 'asmodian') : null;
export const serverList = (r = region()) => (SERVERS.regions[r] || []).map(([id, name]) => ({ id, name, faccion: serverFaccion(id) }));
export function serverName(id) {
for (const r in SERVERS.regions) for (const [sid, n] of SERVERS.regions[r]) if (sid === +id) return n;
return null;
}
export const FACCION = { elyos: 'Elyos', asmodian: 'Asmodian' };
export const viewFaccion = () => store.get('hub-faccion', null) === 'asmodian' ? 'asmodian' : 'elyos';
export function facNote(p = profile()) {
const sf = serverFaccion(p.server), f = p.faccion === 'asmodian' ? 'asmodian' : 'elyos';
return sf && sf !== f ? `Viendo ${FACCION[f]} · tu server es ${serverName(p.server)} (${FACCION[sf]})` : null;
}
export function setFaccion(f) {
if (!FACCION[f] || f === viewFaccion()) return;
setProfile({ faccion: f });
const n = facNote();
toast(n ? esc(n) + '.' : `Viendo ${FACCION[f]}${store.get('hub-server', null) ? ', la de tu server' : ''}.`);
}
/* ---------- preferencias ---------- */
const PREFS = versioned('hub-prefs', 1, { clock: 'local', h12: false, vis: {} });
let P = PREFS.get();
export const prefs = () => P;
export function setPrefs(patch) { P = { ...P, ...patch }; PREFS.set(P); emit('prefs', P); }
export const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
export const displayTz = () => P.clock === 'server' ? serverTz() : LOCAL_TZ;
export const isVisible = ev => P.vis[ev.id] ?? !ev.hidden;
/* ---------- idioma del juego: la interfaz sigue en español; los nombres del juego, como en tu cliente ---------- */
let GL = store.get('hub-idioma-juego', 'es') === 'en' ? 'en' : 'es';
export const gameLang = () => GL;
export function setGameLang(l, { remote = false } = {}) {
l = l === 'en' ? 'en' : 'es';
if (l === GL) return;
GL = l;
if (!remote) store.set('hub-idioma-juego', l);
document.documentElement.dataset.gl = l;
emit('gamelang', l);
}
export const gname = (o, f = 'name') => (o && ((GL === 'en' && o[f + 'En']) || o[f] || o[f + 'En'])) || '';
export const galt = (o, f = 'name') => { const a = o && (GL === 'en' ? o[f] : o[f + 'En']); return a && a !== gname(o, f) ? a : ''; };
export const gboth = (o, f = 'name') => [o?.[f], o?.[f + 'En']].filter(Boolean).join(' ');
const CLASES = { Gladiador: 'Gladiator', Templario: 'Templar', Asesino: 'Assassin', Arquero: 'Ranger', Hechicero: 'Sorcerer', Espiritualista: 'Spiritmaster', 'Clérigo': 'Cleric', Cantor: 'Chanter' };
export const gclass = c => (GL === 'en' && CLASES[c]) || c;
/* ---------- hora ---------- */
const DTF = new Map(), WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export function partsIn(ts, tz) {
let f = DTF.get(tz);
if (!f) DTF.set(tz, f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
const o = {};
for (const { type, value } of f.formatToParts(ts)) o[type] = value;
return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: WD[o.weekday] };
}
const OFF = new Map();
export function tzOffset(ts, tz) {
const b = Math.floor(ts / 9e5), k = tz + b;
let o = OFF.get(k);
if (o === undefined) {
const t = b * 9e5, p = partsIn(t, tz);
o = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - t;
if (OFF.size > 5000) OFF.clear();
OFF.set(k, o);
}
return o;
}
export function wallToUtc(y, mo, d, h, mi, tz) {
const g = Date.UTC(y, mo - 1, d, h, mi);
let t = g - tzOffset(g, tz);
const o2 = tzOffset(t, tz);
if (g - o2 !== t) t = g - o2;
return t;
}
const hm = s => { const [h, m] = s.split(':'); return h * 60 + +m; };
export function maintWindows(from, to, cfg = SCHEDULE.maintenance) {
if (!cfg) return [];
const ann = (cfg.announced || []).map(a => { const s = Date.parse(a.start); return { start: s, minEnd: s + a.minutes * MIN, maxEnd: s + a.minutes * MIN, announced: true, source: a.source }; });
const out = [], w = cfg.weekly;
if (w) {
const p = partsIn(from - 7 * DAY, w.tz), [h, m] = w.time.split(':').map(Number);
for (let i = 0; i < 400; i++) {
const dt = new Date(Date.UTC(p.y, p.mo - 1, p.d + i));
if (dt.getTime() > to + DAY) break;
if (dt.getUTCDay() !== w.day) continue;
const s = wallToUtc(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), h, m, w.tz);
if (ann.some(a => Math.abs(a.start - s) < 36 * HOUR)) continue;
out.push({ start: s, minEnd: s + w.minMinutes * MIN, maxEnd: s + w.maxMinutes * MIN, announced: false });
}
}
return [...out, ...ann].filter(x => x.maxEnd > from && x.start <= to).sort((a, b) => a.start - b.start);
}
export function maintFlag(start, mw) {
for (const w of mw) {
if (start >= w.start && start < w.minEnd) return 'si';
if (start >= w.start && start <= w.maxEnd) return 'quizas';
}
return null;
}
export function occurrences(ev, reg, from, to, mw) {
const rule = ev.rules[reg] || ev.rules.global;
if (!rule) return [];
mw ??= maintWindows(from - DAY, to);
const tz = !rule.tz || rule.tz === 'server' ? REG[reg].tz : rule.tz;
const slots = rule.windows ? rule.windows.map(([a, b]) => [hm(a), (hm(b) - hm(a) + 1440) % 1440 || 1440])
: rule.minute != null ? Array.from({ length: 24 }, (_, h) => [h * 60 + rule.minute, ev.duration || 0])
: rule.times.map(t => [hm(t), ev.duration || 0]);
const p = partsIn(from - 2 * DAY, tz), out = [];
for (let i = 0; i < 800; i++) {
const dt = new Date(Date.UTC(p.y, p.mo - 1, p.d + i)), y = dt.getUTCFullYear(), mo = dt.getUTCMonth() + 1, d = dt.getUTCDate();
if (wallToUtc(y, mo, d, 0, 0, tz) > to) break;
if (rule.days && !rule.days.includes(dt.getUTCDay())) continue;
for (const [m, dur] of slots) {
const start = wallToUtc(y, mo, d, Math.floor(m / 60), m % 60, tz), end = start + dur * MIN;
if ((dur ? end : start + 1) <= from || start > to) continue;
out.push({ ev, id: ev.id, start, end, entry: ev.entry ? start + ev.entry * MIN : 0, maint: ev.maint === false || !SCHEDULE.maintenance?.skipEvents ? null : maintFlag(start, mw) });
}
}
return out.sort((a, b) => a.start - b.start);
}
let CACHE = null;
export function schedule(now = Date.now()) {
const reg = region();
if (!CACHE || CACHE.reg !== reg || now > CACHE.from + DAY || now < CACHE.from) {
const from = now - DAY / 2, to = now + 9 * DAY, mw = maintWindows(from - DAY, to);
CACHE = { reg, from, to, mw, list: EVS.flatMap(e => occurrences(e, reg, from, to, mw)).sort((a, b) => a.start - b.start) };
}
return CACHE;
}
export const isLive = (o, now) => o.start <= now && now < o.end;
export function upcoming(now = Date.now(), { count = 8, minor = true, resets = false, only = null, hidden = false } = {}) {
const live = [], next = [];
for (const o of schedule(now).list) {
if (o.maint === 'si' || (!resets && o.ev.category === 'reset') || (only && !only.has(o.id))) continue;
if (!only && ((!minor && o.ev.minor) || (!hidden && !isVisible(o.ev)))) continue;
if (isLive(o, now)) live.push(o);
else if (o.start > now) { next.push(o); if (next.length >= count) break; }
}
live.sort((a, b) => (b.entry > now) - (a.entry > now) || a.end - b.end || (a.end - a.start) - (b.end - b.start));
return [...live, ...next].slice(0, count);
}
export const nextOcc = (id, now = Date.now()) => schedule(now).list.find(o => o.id === id && o.start > now && o.maint !== 'si') || null;
export const currentOcc = (id, now = Date.now()) => schedule(now).list.find(o => o.id === id && isLive(o, now) && o.maint !== 'si') || null;
const RS = {};
export function lastReset(period, now = Date.now()) {
const r = RS[period];
if (r && now >= r.last && now < r.next) return r.last;
const ev = EVENTS.get(period === 'weekly' ? 'reset-semanal' : 'reset-diario');
const L = occurrences(ev, region(), now - 8 * DAY, now + 8 * DAY, []), i = L.findIndex(o => o.start > now);
RS[period] = { last: L[i - 1]?.start ?? 0, next: L[i]?.start ?? Infinity };
return RS[period].last;
}
export const nextReset = (period, now = Date.now()) => (lastReset(period, now), RS[period].next);
/* ---------- formato (ux-research §3) ---------- */
export function fmtLeft(ms) {
const s = Math.max(0, Math.ceil(ms / 1000));
if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor(s % 86400 / 3600)}h`;
if (s >= 3600) return `${Math.floor(s / 3600)}h ${pad(Math.floor(s % 3600 / 60))}m`;
return s > 60 ? `${Math.ceil(s / 60)} min` : `${s} s`;
}
export function leftNext(ms) {
const s = Math.ceil(ms / 1000);
if (s <= 0) return 1000;
if (s < 3600 && s > 60) return Math.max(1, ms - Math.max(60, (Math.ceil(s / 60) - 1) * 60) * 1000);
const U = s >= 86400 ? 3600 : s >= 3600 ? 60 : 1;
return Math.max(1, ms - (Math.floor(s / U) * U - 1) * 1000);
}
export const clockLeft = (ts, o = {}) => n => [`${fmtClock(ts, { now: n, ...o })} · en ${fmtLeft(ts - n)}`, n + Math.min(leftNext(ts - n), MIN)];
export function fmtClock(ts, { now = Date.now(), tz = displayTz(), day = true, h12 = P.h12 } = {}) {
const p = partsIn(ts, tz);
const s = h12 ? `${p.h % 12 || 12}:${pad(p.mi)} ${p.h < 12 ? 'a. m.' : 'p. m.'}` : `${pad(p.h)}:${pad(p.mi)}`;
if (!day) return s;
const n = partsIn(now, tz), dd = Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(n.y, n.mo - 1, n.d)) / DAY);
return dd === 0 ? s : dd === 1 ? 'mañana ' + s : dd === -1 ? 'ayer ' + s : dd > 1 && dd < 7 ? `${DOW[p.wd]} ${s}` : `${DOW[p.wd]} ${p.d}/${p.mo} ${s}`;
}
export function statusText(o, now = Date.now()) {
if (now < o.start) return ['en ' + fmtLeft(o.start - now), now + leftNext(o.start - now)];
if (o.entry && now < o.entry) return [`${o.ev?.entryLabel || 'entrada abierta'} · ${fmtLeft(o.entry - now)}`, now + leftNext(o.entry - now)];
if (now < o.end) return ['quedan ' + fmtLeft(o.end - now), now + leftNext(o.end - now)];
return ['terminó', 0];
}
/* ---------- ticker único ---------- */
const BINDS = new Map();
const SUBS = new Set();
export function bind(node, fn) {
const b = { fn, due: 0, last: null };
BINDS.set(node, b);
paintOne(node, b, Date.now());
return () => BINDS.delete(node);
}
export const countdown = (node, target) => bind(node, now => [fmtLeft(target - now), now + leftNext(target - now)]);
export const bindStatus = (node, occ) => bind(node, now => statusText(occ, now));
export function onTick(fn, { hidden = false } = {}) { const s = { fn, hidden }; SUBS.add(s); return () => SUBS.delete(s); }
function paintOne(node, b, now) {
const r = b.fn(now), [t, due] = Array.isArray(r) ? r : [r, 0];
if (t !== b.last) { node.textContent = t; b.last = t; }
b.due = due || 0;
}
let pipWin = null;
const active = () => !document.hidden || !!pipWin;
let lastNow = 0, nextB = 0, prevDaily = 0, prevWeekly = 0, staleS = false;
function tick() {
const now = Date.now(), vis = active();
if (now >= nextB || now < lastNow - 1500 || now - lastNow > 5 * MIN || staleS) {
if (vis) { staleS = false; structure(now); } else staleS = true;
}
lastNow = now;
if (vis) for (const [node, b] of BINDS) {
if (!node.isConnected) { BINDS.delete(node); continue; }
if (b.due > now) continue;
paintOne(node, b, now);
}
for (const s of SUBS) if (vis || s.hidden) try { s.fn(now); } catch (e) { console.error(e); }
pace(now, vis);
}
function structure(now) {
const c = schedule(now);
nextB = now + HOUR;
for (const o of c.list) for (const t of [o.start, o.entry, o.end]) if (t > now && t < nextB) nextB = t;
for (const o of storedTimers(now)) for (const t of [o.start, o.end]) if (t > now && t < nextB) nextB = t;
const d = lastReset('daily', now), w = lastReset('weekly', now);
const rd = nextReset('daily', now);
nextB = Math.min(nextB, rd, nextReset('weekly', now), rd - 2 * HOUR > now ? rd - 2 * HOUR : Infinity);   // a 2 h del reset la tira avisa las diarias
emit('structure', { now });
if (prevDaily && d !== prevDaily) emit('reset', { period: 'daily', at: d });
if (prevWeekly && w !== prevWeekly) emit('reset', { period: 'weekly', at: w });
prevDaily = d; prevWeekly = w;
}
let worker = null, cfgKey = '', fbT = 0, fbIv = 1000, fbWake = 0;
function pace(now, vis) {
const wake = Q[0]?.at || 0;
const fast = vis || titleNeedsSeconds || (wake && wake - now < 65e3);
const iv = fast ? 1000 : 60e3, k = iv + '|' + wake;
if (k === cfgKey) return;
cfgKey = k;
if (worker) worker.postMessage({ iv, wake });
else { fbIv = iv; fbWake = wake; }
}
function fbLoop() {
clearTimeout(fbT);
const n = Date.now();
let d = fbIv - (n % fbIv) + 3;
if (fbWake > n && fbWake - n < d) d = fbWake - n + 1;
fbT = setTimeout(() => { tick(); fbLoop(); }, d);
}
const WORKER_SRC = 'let iv=1000,wake=0,t;function loop(){clearTimeout(t);const n=Date.now();let d=iv-(n%iv)+3;if(wake>n&&wake-n<d)d=wake-n+1;t=setTimeout(()=>{postMessage(0);loop()},d)}onmessage=e=>{iv=e.data.iv;wake=e.data.wake;loop()};loop()';
function startClock() {
try {
const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
worker = new Worker(url);
worker.onmessage = tick;
worker.onerror = () => { worker = null; cfgKey = ''; fbLoop(); };
} catch { worker = null; fbLoop(); }
document.addEventListener('visibilitychange', () => {
if (!document.hidden) for (const b of BINDS.values()) b.due = 0;
cfgKey = '';
tick();
});
}
/* ---------- toast, aviso de estado, modal ---------- */
let tT;
export function toast(html, { ms = 4200, action = null } = {}) {
const el = $('#hub-toast');
el.innerHTML = html;
if (action) el.append(' ', Object.assign(document.createElement('button'), { type: 'button', className: 'linkbtn', textContent: action.label, onclick: () => { hideToast(); action.run(); } }));
el.classList.toggle('act', !!action);
const host = [...document.querySelectorAll('dialog[open]')].pop() || document.body;
if (el.parentNode !== host) host.append(el);
if (el.showPopover) { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); }
el.classList.add('on');
clearTimeout(tT);
tT = setTimeout(hideToast, ms);
}
export function hideToast() { clearTimeout(tT); $('#hub-toast')?.classList.remove('on'); }
export function announce(text) { const l = $('#hub-live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = text; }, 30); } }
export const CREDITS = [
['Horarios y eventos', 'Notas y avisos oficiales de PLAYNC (NCSOFT). Lo que no tiene aviso oficial lo midieron jugadores y se cruzó con questlog.gg y shugo.gg; va rotulado.'],
['Jefes en vivo', 'Telemetría de jugadores: la app de escritorio de questlog.gg ve los jefes en las partidas de sus usuarios. Llega a través del servidor de la Bitácora. Si activás los reportes de la comunidad, también lo que avisan otros jugadores de tu server ("Estimado").'],
['Jefes: nombres, teleports y retratos', 'Base de datos de Aion 2 de questlog.gg. Los ciclos "medidos" los midió la comunidad (Inven); los oficiales, del parche Global.'],
['Jefes: drops', 'Qué suelta cada jefe y con qué chance: base de datos de questlog.gg cruzada con los datos del cliente Global que publica aion2data.com (https://aion2data.com/monsters). Íconos del CDN oficial de PLAYNC, re-guardados chicos.'],
['Personaje', 'Ficha pública de PLAYNC (equipo, skills, Daevanion, nivel de objeto) e íconos del CDN oficial de PLAYNC, re-guardados chicos. Nombres de skills en inglés, tablas de amplificación y builds de la comunidad: questlog.gg. Lo que usan los top: el armory público de PLAYNC sobre la lista de mayor CP de questlog.gg. Guías de builds: aion2data.com (https://aion2data.com). Puertas de contenido: notas oficiales de parche de PLAYNC; las de Expedición y Trascendencia, de guías de la comunidad.'],
['Personaje: títulos y logros', 'Conteo y títulos equipados: ficha pública de PLAYNC. Catálogo de títulos y logros (pasos, metas, recompensas, estatuas del Panteón): base de datos de questlog.gg, cruzada con los datos del cliente de aion2data.com (https://aion2data.com). Qué es "importante": criterio propio con lo que equipan los top. La lista de tus títulos y tu Panteón se carga desde characters.json de la app de escritorio de questlog.gg, en tu navegador. Íconos: CDN oficial de PLAYNC.'],
['Pets', 'El Bestiario Esquivo. Datos, mapas, coordenadas de spawns y retratos: base de datos y mapa interactivo de questlog.gg (Aion 2 global). Tiendas y eventos de las Especiales: aion2vault.com, wikily.gg y notas de NCSOFT. Grieta (Spacetime Rift): guía de expcarry.com. La colección se carga desde characters.json de la app de escritorio de questlog.gg y es la misma del sitio Bestiario Esquivo (https://facuga7van.github.io/aion2-pets/) en el mismo navegador.'],
['Aion 2', 'Nombres, imágenes y marcas de Aion 2 son de NCSOFT. Bitácora Daeva es un sitio de fans, sin relación con NCSOFT: sin anuncios, sin cookies, sin rastreo.'],
];
export function openCredits() {
const box = document.createElement('dl');
box.className = 'credits';
box.innerHTML = CREDITS.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('');
return modal({ title: 'Fuentes y créditos', node: box, cls: 'credits-m', actions: [{ label: 'Listo', value: 'ok', primary: true }] });
}
export function modal({ title, html = '', node = null, actions = [{ label: 'Cerrar', value: null }], cls = '' }) {
const d = document.createElement('dialog');
d.className = 'modal ' + cls;
d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2><div class="modal-b">${html}</div><div class="modal-act">${actions.map((a, i) =>
`<button class="btn${a.primary ? ' gold' : ''}" value="${i}">${esc(a.label)}</button>`).join('')}</div></form>`;
if (node) $('.modal-b', d).append(node);
document.body.append(d);
d.showModal();
return new Promise(res => d.addEventListener('close', () => { const i = d.returnValue; d.remove(); res(i === '' || i == null ? null : actions[+i]?.value ?? null); }, { once: true }));
}
/* ---------- alertas ---------- */
const AKEY = versioned('hub-alertas', 1, { bells: {}, sound: true, vol: 0.6, quiet: { on: false, from: '00:00', to: '08:00' }, muteUntil: 0, title: true });
let A = AKEY.get();
const saveA = () => AKEY.set(A);
const ITEMS = new Map();
export const LEADS = [10, 5, 1, 0];
export function registerAlertable(item) { ITEMS.set(item.id, item); rebuildQueue(Date.now()); }
export const alertable = id => ITEMS.get(id);
export const alertName = it => it ? gname(it, 'short') || gname(it, 'label') : '';
export const alertPrefs = () => A;
export function setAlertPrefs(patch) { A = { ...A, ...patch }; saveA(); rebuildQueue(Date.now()); emit('bells', A); }
export const getBell = id => A.bells[id] || null;
export function setBell(id, leads) {
const b = { ...A.bells };
if (leads && leads.length) b[id] = [...new Set(leads)].sort((x, y) => y - x); else delete b[id];
setAlertPrefs({ bells: b });
for (const el of $$(`.bell[data-bell="${CSS.escape(id)}"]`)) paintBell(el);
}
export const isMuted = (now = Date.now()) => A.muteUntil > now;
export function inQuiet(now = Date.now()) {
if (!A.quiet?.on) return false;
const p = partsIn(now, LOCAL_TZ), m = p.h * 60 + p.mi, f = hm(A.quiet.from), t = hm(A.quiet.to);
return f <= t ? m >= f && m < t : m >= f || m < t;
}
export const isSilenced = (now = Date.now()) => isMuted(now) || inQuiet(now);
export function toggleMute(now = Date.now()) {
if (isMuted(now)) { setAlertPrefs({ muteUntil: 0 }); toast('Avisos activados de nuevo.'); }
else {
setAlertPrefs({ muteUntil: now + HOUR });
toast(`Avisos silenciados hasta las <b>${fmtClock(now + HOUR, { now, tz: LOCAL_TZ })}</b>.`, { action: { label: 'Deshacer', run: () => setAlertPrefs({ muteUntil: 0 }) } });
}
emit('mute', isMuted(now));
}
let AC = null;
function audio() {
try { AC ||= new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch { AC = null; }
return AC;
}
export function chime(vol = A.vol, high = false) {
const a = audio();
if (!a) return false;
const t = a.currentTime + 0.02, f = high ? [987.8, 1480] : [784, 1175];
f.forEach((hz, i) => {
const o = a.createOscillator(), g = a.createGain(), d = t + i * 0.2;
o.type = 'sine'; o.frequency.value = hz;
g.gain.setValueAtTime(0.0001, d);
g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * 0.35), d + 0.02);
g.gain.exponentialRampToValueAtTime(0.0001, d + 1.1);
o.connect(g).connect(a.destination);
o.start(d); o.stop(d + 1.2);
});
return true;
}
const ICON = new URL('icon-192.png', import.meta.url).href;
export function notify(title, opts = {}) {
if (!('Notification' in window) || Notification.permission !== 'granted') return false;
const o = { icon: ICON, badge: ICON, lang: 'es-AR', silent: !!(AC && AC.state === 'running' && A.sound), ...opts };
try {
const n = new Notification(title, o);
n.onclick = () => { focus(); n.close(); };
} catch {
navigator.serviceWorker?.ready.then(r => r.showNotification(title, o)).catch(() => {});
}
return true;
}
let leader = !navigator.locks;
export const isLeader = () => leader;
navigator.locks?.request('hub-alertas-lider', () => { leader = true; emit('leader', true); return new Promise(() => {}); }).catch(() => { leader = true; });
const STALE = 2 * MIN, GRACE = 2 * MIN, DONE = new Set();
let Q = [];
function rebuildQueue(now) {
Q = [];
for (const [id, leads] of Object.entries(A.bells)) {
const it = ITEMS.get(id);
if (!it) continue;
const a = it.next(now - GRACE), b = a && it.next(a.start);
for (const o of [a, b]) if (o) for (const lead of leads) {
const at = o.start - lead * MIN, key = `${id}|${o.start}|${lead}`;
if (at > now - STALE && !DONE.has(key)) Q.push({ id, at, lead, occ: o, key });
}
}
Q.sort((x, y) => x.at - y.at);
}
function checkAlerts(now) {
let fired = false;
while (Q[0] && Q[0].at <= now) { fire(Q.shift(), now); fired = true; }
if (fired || now - lastRebuild > HOUR) { lastRebuild = now; rebuildQueue(now); }
}
let lastRebuild = 0;
function fire(q, now) {
if (DONE.has(q.key)) return;
DONE.add(q.key);
if (now - q.at > STALE) return;                  // la compu estuvo dormida: un aviso viejo no sirve
const it = ITEMS.get(q.id), name = alertName(it);
if (!it || (it.until && now >= it.until)) return;  // timer suelto que dejó de valer (p. ej. hubo mantenimiento)
const title = q.lead ? `${name} en ${q.lead} min` : `¡${name}! ${it.nowText || 'Empieza ahora'}`;
const body = [fmtClock(q.occ.start, { now }), it.note?.(q.occ)].filter(Boolean).join(' · ');
toast(`${ico('i-bell-on')} <b>${esc(title)}</b> · ${esc(body)}`, { ms: 9000 });
announce(title);
if (!leader) return;
const log = store.get('hub-alertas-log', []);
if (log.includes(q.key)) return;                 // otra pestaña líder ya lo disparó
store.set('hub-alertas-log', [...log, q.key].slice(-40));
if (isSilenced(now)) return;                     // horas de silencio o M: solo el toast
notify(title, { body, tag: 'hub-' + q.id, data: { href: it.href || ROOT } });
if (A.sound) chime(A.vol, q.lead === 0);
}
export function testAlert() {
askPermission().then(() => {
notify('Así te aviso', { body: 'Bitácora Daeva · prueba de alerta', tag: 'hub-prueba' });
});
if (A.sound) chime(A.vol);
toast(`${ico('i-bell-on')} <b>Así te aviso</b> · toast en la página${A.sound ? ', sonido' : ''} y notificación del sistema.`);
}
export function askPermission() {
if (!('Notification' in window) || Notification.permission !== 'default') return Promise.resolve(window.Notification?.permission || 'unsupported');
return Notification.requestPermission().catch(() => 'denied');
}
export function nextBelled(now = Date.now()) {
let best = null;
for (const id in A.bells) {
const it = ITEMS.get(id);
if (!it) continue;
const cur = it.current?.(now);
if (cur && now < (cur.entry || cur.start + MIN)) {
if (!best?.live || cur.start < best.occ.start) best = { item: it, occ: cur, live: true };
continue;
}
const n = it.next(now);
if (n && !best?.live && (!best || n.start < best.occ.start)) best = { item: it, occ: n, live: false };
}
return best;
}
export const storedTimers = (now = Date.now()) => (store.get('hub-timers', []) || []).filter(t => now < t.end && !(t.until && now >= t.until));
export function setTimers(list) { store.set('hub-timers', list); syncTimers(); }
const timerText = t => n => n < t.start ? [fmtLeft(t.start - n), n + leftNext(t.start - n)] : [t.liveText || 'ya puede estar', 0];
function syncTimers() {
const now = Date.now();
for (const [id, it] of ITEMS) if (it.stored) ITEMS.delete(id);
for (const t of storedTimers(now)) {
const ok = n => !(t.until && n >= t.until);
ITEMS.set(t.id, { ...t, stored: true, note: () => gname(t, 'note'), next: n => n < t.start && ok(n) ? t : null, current: n => n >= t.start && n < t.end && ok(n) ? t : null });
}
rebuildQueue(now);
nextB = 0;                                         // la tira y las listas se repintan en el próximo tick
}
let BASE_TITLE = document.title;
export function setTitle(t) { BASE_TITLE = t || DEFAULT_TITLE; titleAndFavicon(Date.now()); }
const DEFAULT_TITLE = BASE_TITLE;
let titleNeedsSeconds = false, favDot = null;
function titleAndFavicon(now) {
const nb = A.title ? nextBelled(now) : null;
let t = BASE_TITLE;
titleNeedsSeconds = false;
if (nb) {
const name = alertName(nb.item);
if (nb.live) t = `¡YA! ${name} · Bitácora`;
else { const ms = nb.occ.start - now; titleNeedsSeconds = ms < 2 * MIN; t = `${fmtLeft(ms)} · ${name} · Bitácora`; }
}
if (document.title !== t) document.title = t;
const dot = !!nb && (nb.live || nb.occ.start - now <= 5 * MIN);
if (dot !== favDot) {
favDot = dot;
const l = $('#hub-favicon');
if (l) l.href = dot ? DATA.favicon.dot : DATA.favicon.base;
}
}
/* ---------- campana (componente) ---------- */
const leadTxt = l => l ? `${l} min antes` : 'al inicio';
export function bellButton(id, label = gname(alertable(id), 'label') || id, { hint = '' } = {}) {
const b = document.createElement('button');
b.type = 'button';
b.className = 'bell';
b.dataset.bell = id;
b.dataset.label = label;
if (hint) b.dataset.hint = hint;
b.setAttribute('aria-haspopup', 'dialog');
paintBell(b);
return b;
}
function paintBell(b) {
const L = getBell(b.dataset.bell);
b.setAttribute('aria-pressed', String(!!L));
b.innerHTML = ico(L ? 'i-bell-on' : 'i-bell');
const t = `${L ? 'Aviso: ' + L.map(leadTxt).join(', ') : 'Avisarme'} · ${b.dataset.label}`;
b.setAttribute('aria-label', t);
b.title = t;
}
let bmAnchor = null, askedOnce = false;     // el permiso se pide en la primera campana, una sola vez
function bellMenu() {
let m = $('#hub-bellmenu');
if (m) return m;
m = document.createElement('div');
m.id = 'hub-bellmenu';
m.className = 'bellmenu';
m.popover = 'auto';
m.setAttribute('role', 'dialog');
m.setAttribute('aria-label', 'Avisos');
document.body.append(m);
m.addEventListener('click', e => {
const id = bmAnchor?.dataset.bell;
if (!id) return;
const lb = e.target.closest('[data-lead]');
if (lb) {
const cur = new Set(getBell(id) || []), l = +lb.dataset.lead;
cur.has(l) ? cur.delete(l) : cur.add(l);
setBell(id, [...cur]);
paintMenu(m, id);
} else if (e.target.closest('[data-off]')) { setBell(id, null); m.hidePopover(); bmAnchor?.focus(); }
else if (e.target.closest('[data-test]')) testAlert();
});
m.addEventListener('toggle', e => { if (e.newState === 'closed') bmAnchor = null; });
return m;
}
function paintMenu(m, id) {
const L = getBell(id) || [], perm = window.Notification?.permission;
m.innerHTML = `<p class="bm-t">Avisarme · <b>${esc(bmAnchor?.dataset.label || id)}</b></p>
<div class="bm-leads" role="group" aria-label="Antelación">${LEADS.map(l => `<button type="button" data-lead="${l}" aria-pressed="${L.includes(l)}">${l ? l + ' min' : 'Al inicio'}</button>`).join('')}</div>
${bmAnchor?.dataset.hint ? `<p class="bm-n">${esc(bmAnchor.dataset.hint)}</p>` : ''}
${perm === 'denied' ? '<p class="bm-n">El navegador bloqueó las notificaciones: te aviso en la página' + (A.sound ? ' y con sonido' : '') + '.</p>' : ''}
${isSilenced() ? '<p class="bm-n">Ahora estás en silencio: el aviso aparece solo en la página.</p>' : ''}
<div class="bm-f"><button type="button" class="linkbtn" data-test>Probar</button><button type="button" class="linkbtn danger" data-off>Sacar aviso</button></div>`;
}
function openBellMenu(b) {
const id = b.dataset.bell, m = bellMenu();
if (bmAnchor === b && m.matches(':popover-open')) { m.hidePopover(); return; }
if (!getBell(id)) {
setBell(id, [5]);                                // un clic = campana puesta con el default (5 min)
audio();                                         // desbloquea el sonido dentro del gesto
if (!askedOnce) { askedOnce = true; askPermission().then(() => bmAnchor === b && paintMenu(m, id)); }
}
bmAnchor = b;
paintMenu(m, id);
m.showPopover();
const r = b.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
$('[data-lead]', m)?.focus();
}
/* ---------- confianza: un solo vocabulario en todo el sitio (revisión UX P1) ---------- */
export const CONF_TXT = {
oficial: ['Oficial', 'Sale de notas o avisos oficiales del juego.'],
comunidad: ['Medido por la comunidad', 'No hay aviso oficial: lo midieron jugadores y coinciden varias fuentes (detalle en Fuentes y créditos, en el pie).'],
sin: ['Sin confirmar', 'Una sola fuente, o un dato que todavía no pudimos cruzar. Tomalo como aproximado.'],
};
export const confOf = x => x.confidence === 'baja' ? 'sin' : (x.basis ? x.basis === 'oficial' : x.confidence === 'alta') ? 'oficial' : 'comunidad';
const SITES = /questlog|shugo|aion2timers|aion2data|kisk|aion2hub/gi;
export function cleanSrc(s) {
const t = String(s || '').replace(/\s*\((?:ver )?(?:docs\/)?data-sources[^)]*\)/g, '')
.replace(/[,;]?\s*(?:citada en |ver )?(?:docs\/)?data-sources(?:\.md)?\s*§?\s*[\d.]*\d/g, '').replace(/el dueño[^.;]*/g, 'confirmado en el juego').trim();
const n = new Set((t.match(SITES) || []).map(x => x.toLowerCase())).size;
if (n) return n > 1 ? 'Varias fuentes de la comunidad coinciden (detalle en Fuentes y créditos).' : 'Una fuente de la comunidad (detalle en Fuentes y créditos).';
return /plaync|ncsoft/i.test(t) ? 'Avisos oficiales del juego.' : t;
}
export function confTag(x, { lv = confOf(x), note = '', label = '' } = {}) {
return `<button type="button" class="tag conf c-${lv}" data-conf="${lv}" data-src="${esc(cleanSrc(x.source))}"${note ? ` data-note="${esc(note)}"` : ''} aria-haspopup="dialog">${esc(label || CONF_TXT[lv][0])}</button>`;
}
let cfAnchor = null;
function openConf(b) {
let m = $('#hub-conf');
if (!m) {
m = Object.assign(document.createElement('div'), { id: 'hub-conf', className: 'bellmenu confpop' });
m.popover = 'auto';
m.setAttribute('role', 'dialog');
m.setAttribute('aria-label', 'Qué tan seguro es este dato');
m.addEventListener('toggle', e => { if (e.newState === 'closed') cfAnchor = null; });
}
if (cfAnchor === b && m.matches(':popover-open')) { m.hidePopover(); return; }
const host = [...document.querySelectorAll('dialog[open]')].pop() || document.body;   // dentro del modal abierto (si no, queda inerte)
if (m.parentNode !== host) { if (m.matches(':popover-open')) m.hidePopover(); host.append(m); }
const [t, why] = CONF_TXT[b.dataset.conf] || CONF_TXT.sin;
m.innerHTML = `<p class="bm-t"><b>${esc(t)}</b></p><p class="bm-n">${esc(why)}</p>${b.dataset.note ? `<p class="bm-n"><b>Falta confirmar:</b> ${esc(b.dataset.note)}</p>` : ''}${b.dataset.src ? `<p class="bm-n cf-src">Fuente: ${esc(b.dataset.src)}</p>` : ''}`;
cfAnchor = b;
if (!m.matches(':popover-open')) m.showPopover();
const r = b.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
}
/* ---------- lista "Próximos" (Ahora, modo mini y ventana flotante) ---------- */
const CAT_ICO = { pvp: 'i-pvp', boss: 'i-boss', evento: 'i-evento', reset: 'i-reset' };
export const catIcon = ev => CAT_ICO[ev.category] || 'i-evento';
export const bossPic = (r, px = 80, cls = 'up-p', sz = 32) => /^[\w-]+$/.test(r || '') ? `<img class="${cls}" src="${ROOT}assets/jefes/${r}-${px}.webp" width="${sz}" height="${sz}" alt="" loading="lazy" decoding="async">` : '';
export function renderUpcoming(box, { count = 8, bells = true, minor = true } = {}) {
const doc = box.ownerDocument;
const draw = () => {
const now = Date.now(), seen = new Set();
const L = upcoming(now, { count: count * 3, minor }).filter(o => o.ev.kind !== 'hourly' || (!seen.has(o.id) && seen.add(o.id))).slice(0, count);
const ol = doc.createElement('ol');
ol.className = 'up';
const k = (live, start) => live ? 0 : start;
const rows = [...L.map(o => [k(isLive(o, now), o.start), o]), ...storedTimers(now).filter(t => t.up).map(t => [k(now >= t.start, t.start), null, t])].sort((a, b) => a[0] - b[0]);
for (const [, o, t] of rows) {
if (t) {
const li = doc.createElement('li'), live = now >= t.start;
li.className = 'up-r up-tm' + (live ? ' live' : '');
li.dataset.tm = t.id;
li.innerHTML = `${bossPic(t.pic) || ico('i-boss', 'up-i')}<span class="up-n"><span class="up-nt">${t.approx ? '≈ ' : ''}${esc(alertName(t))}</span>${t.src ? `<small class="up-st">${esc(t.src)}</small>` : ''}</span><time class="up-t" datetime="${new Date(t.start).toISOString()}">${live ? 'desde ' + fmtClock(t.start, { now, day: false }) : fmtClock(t.start, { now })}</time><span class="up-c cd"></span>`;
if (bells) li.append(bellButton(t.id, gname(t, 'label')));
bind($('.up-c', li), timerText(t));
ol.append(li);
continue;
}
const li = doc.createElement('li'), live = isLive(o, now), portal = live && o.entry > now;
li.className = 'up-r' + (live ? ' live' : '') + (o.maint === 'quizas' ? ' quizas' : '');
li.dataset.ev = o.id;
const tags = [o.maint === 'quizas' && '<em class="tag warn" title="Puede caer dentro del mantenimiento del miércoles">¿mantenimiento?</em>',
confOf(o.ev) === 'sin' && confTag(o.ev)].filter(Boolean).join('');
const edge = portal ? o.entry : live ? o.end : o.start;
const when = portal ? `cierra ${fmtClock(o.entry, { now, day: false })}` : live ? `hasta ${fmtClock(o.end, { now, day: false })}` : fmtClock(o.start, { now });
const st = live ? (portal ? esc(o.ev.entryLabel) : 'en curso') : o.ev.kind === 'hourly' ? 'cada hora' : '';
li.innerHTML = `${bossPic(o.ev.retrato) || ico(catIcon(o.ev), 'up-i')}<span class="up-n"><span class="up-nt">${esc(gname(o.ev, 'short') || gname(o.ev))}</span>${tags}${st ? `<small class="up-st${live ? '' : ' up-ev'}">${st}</small>` : ''}</span><time class="up-t" datetime="${new Date(edge).toISOString()}">${when}</time><span class="up-c cd"></span>`;
if (bells) li.append(bellButton(o.id, gname(o.ev)));
countdown($('.up-c', li), edge);
ol.append(li);
}
if (!L.length) ol.innerHTML = '<li class="up-empty">No hay eventos visibles. Activalos en Ajustes.</li>';
box.replaceChildren(ol);
};
draw();
const offs = [on('structure', draw), on('prefs', draw), on('profile', draw), on('gamelang', draw)];
return () => offs.forEach(f => f());
}
/* ---------- tira "Ahora" (36 px, todas las páginas) ---------- */
function stripItem(o, now, cls) {
const a = document.createElement('a');
a.className = 'st-i ' + cls;
a.href = ROOT + '#ev-' + o.id;
const live = isLive(o, now);
a.innerHTML = `${live ? '<i class="st-dot" aria-hidden="true"></i>' : ''}<b>${esc(gname(o.ev, 'short') || gname(o.ev))}</b>${live ? '' : `<small>${fmtClock(o.start, { now })}</small>`}<span class="cd"></span>`;
bindStatus($('.cd', a), o);
return a;
}
const dailyLeft = now => { const c = characters().activo, p = taskProgress(c, now).daily; return p.total - p.done; };
function renderStrip() {
const el = $('#hub-strip');
if (!el) return;
if (document.documentElement.classList.contains('mini')) {   // mini: solo una línea con la sección y el reloj
const box = document.createElement('div');
box.className = 'strip-in';
box.innerHTML = `<span class="st-lab">${esc(NAV.find(n => n.id === PAGE)?.label || 'Bitácora')}</span><span class="st-r"><span class="st-clock"></span></span>`;
bind($('.st-clock', box), n => [fmtClock(n, { now: n, day: false }), n + MIN - n % MIN]);
el.replaceChildren(box);
return;
}
const now = Date.now(), belled = new Set(Object.keys(A.bells));
const L = upcoming(now, { count: 30 }).filter(o => !o.ev.minor || belled.has(o.id));
const live = L.find(o => isLive(o, now)), next = L.filter(o => o.start > now).slice(0, 2);
const box = document.createElement('div');
box.className = 'strip-in';
const lab = document.createElement('span');
lab.className = 'st-lab';
lab.textContent = 'Ahora';
box.append(lab);
if (live) box.append(stripItem(live, now, 'st-live'));
next.forEach((o, i) => box.append(stripItem(o, now, 'st-next' + (i ? ' st-2' : ''))));
const tm = storedTimers(now).sort((a, b) => (a.start <= now) - (b.start <= now) || a.start - b.start)[0];
if (tm) {
const a = document.createElement('a');
a.className = 'st-i st-timer';
a.href = tm.href || ROOT;
a.innerHTML = `<b>${tm.approx ? '≈ ' : ''}${esc(alertName(tm))}</b><small>${fmtClock(tm.start, { now })}</small><span class="cd"></span>`;
bind($('.cd', a), n => { const [t, d] = timerText(tm)(n); return [n < tm.start ? 'en ' + t : t, d]; });
box.append(a);
}
const rd = nextReset('daily', now), rs = document.createElement('a'), left = rd - now < 2 * HOUR ? dailyLeft(now) : 0;
rs.className = 'st-i st-reset' + (left ? ' st-due' : '');
rs.href = left ? ROOT + 'tareas/' : ROOT + '#resets';
rs.innerHTML = left ? `<b>Te faltan ${left} diaria${left > 1 ? 's' : ''}</b><span class="cd"></span>` : `<b>Reset</b><small>${fmtClock(rd, { now })}</small><span class="cd"></span>`;
bind($('.cd', rs), n => [(left ? 'reset en ' : 'en ') + fmtLeft(rd - n), n + leftNext(rd - n)]);
const right = document.createElement('span');
right.className = 'st-r';
right.innerHTML = `<button type="button" class="st-mute" ${isMuted(now) ? '' : 'hidden'} title="Avisos silenciados · M para activar">${ico('i-bell-off')}<span>Silencio</span></button><span class="st-clock" title="Hora ${P.clock === 'server' ? 'del server' : 'tuya'}"></span>`;
bind($('.st-clock', right), n => [fmtClock(n, { now: n, day: false }), n + MIN - n % MIN]);
$('.st-mute', right).onclick = () => toggleMute();
box.append(rs, right);
el.replaceChildren(box);
}
/* ---------- paleta (/ o Ctrl+K) ---------- */
const PAL = new Map();
export function registerPalette(id, src) { PAL.set(id, src); }
function osa(a, b) {
const d = [];
for (let i = 0; i <= a.length; i++) {
d[i] = [i];
for (let j = 1; j <= b.length; j++) d[i][j] = i ? Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1]),
i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ? d[i - 2][j - 2] + 1 : 99) : j;
}
return d[a.length][b.length];
}
function palItems() {
const out = [];
for (const src of PAL.values()) for (const it of (typeof src.items === 'function' ? src.items() : src.items)) {
out.push({ ...it, group: src.group, hay: norm([it.title, it.sub, it.kw, src.group].filter(Boolean).join(' ')), t: norm(it.title) });
}
return out;
}
export function searchPalette(q, items = palItems()) {
const toks = norm(q).trim().split(/\s+/).filter(Boolean);
if (!toks.length) return items.filter(i => i.pin);
const score = it => {
let s = 0;
for (const t of toks) {
if (it.t.startsWith(t)) s += 3; else if (it.hay.includes(t)) s += 1;
else if (t.length >= 4 && it.hay.split(/[^a-z0-9]+/).some(w => w.length >= 3 && osa(t, w.slice(0, t.length + 1)) <= 1)) s += 0.5;
else return 0;
}
return s * (it.w ?? 1);  // w < 1: pierde los empates (las pets no le ganan a un jefe que se llama igual)
};
return items.map(it => [score(it), it]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).map(x => x[1]).slice(0, 12);
}
let palSel = 0, palRes = [];
export function openPalette(q = '') {
let d = $('#hub-pal');
if (!d) {
d = document.createElement('dialog');
d.id = 'hub-pal';
d.className = 'pal';
d.setAttribute('aria-label', 'Buscar en la Bitácora');
d.innerHTML = `<div class="pal-in">${ico('i-search')}<input type="text" role="combobox" aria-expanded="true" aria-controls="hub-pal-l" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Secciones, eventos, tareas, ajustes…"><kbd>Esc</kbd></div>
<ul role="listbox" id="hub-pal-l" aria-label="Resultados"></ul><p class="pal-f" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></p>`;
document.body.append(d);
const inp = $('input', d), ul = $('ul', d);
inp.addEventListener('input', () => paintPal(d));
inp.addEventListener('keydown', e => {
if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palRes.length) % Math.max(1, palRes.length); selPal(d); }
else if (e.key === 'Enter') { e.preventDefault(); runPal(d, palRes[palSel]); }
});
ul.addEventListener('click', e => { const li = e.target.closest('[role=option]'); if (li) runPal(d, palRes[+li.dataset.i]); });
d.addEventListener('click', e => { if (e.target === d) d.close(); });
}
const inp = $('input', d);
inp.value = q;
paintPal(d);
if (!d.open) d.showModal();
inp.focus();
}
function paintPal(d) {
const q = $('input', d).value;
palRes = searchPalette(q);
palSel = 0;
$('ul', d).innerHTML = palRes.map((it, i) => `<li role="option" id="pal-o-${i}" data-i="${i}" aria-selected="false">${ico(it.icon || 'i-r')}<span><b>${esc(it.title)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span><em>${esc(it.group)}</em></li>`).join('')
|| `<li class="pal-0">Nada con “${esc(q)}”. Probá con “grieta”, “reset” o “tareas”.</li>`;
selPal(d);
}
function selPal(d) {
const inp = $('input', d);
$$('[role=option]', d).forEach((li, i) => li.setAttribute('aria-selected', String(i === palSel)));
const cur = $(`#pal-o-${palSel}`, d);
cur ? inp.setAttribute('aria-activedescendant', cur.id) : inp.removeAttribute('aria-activedescendant');
cur?.scrollIntoView({ block: 'nearest' });
}
function runPal(d, it) {
if (!it) return;
d.close();
if (it.run) it.run(); else if (it.href) go(it.href);
}
export function go(href) {
const u = new URL(href, location.href);
if (u.pathname === location.pathname && u.search === location.search && u.hash) { location.hash = u.hash; return; }
location.href = u.href;
}
/* ---------- teclado ---------- */
const KEYS = [];
export function registerKey(k) { KEYS.push(k); }
document.addEventListener('keydown', e => {
if (e.defaultPrevented || e.isComposing) return;
if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector('dialog[open]')) return;
if (/^[1-9]$/.test(e.key) && NAV[+e.key - 1]) { e.preventDefault(); go(ROOT + NAV[+e.key - 1].href); return; }
if (e.key === '/') { e.preventDefault(); openPalette(); return; }
if (e.key === 'm' || e.key === 'M') { toggleMute(); return; }
if (e.key === '?') { openHelp(); return; }
const fi = (e.key === 'f' || e.key === 'F') && $('[data-find]');
if (fi) { e.preventDefault(); fi.focus(); fi.select?.(); return; }
const k = KEYS.find(x => x.key === e.key.toLowerCase());
if (k) { e.preventDefault(); k.run(e); }
});
export function openHelp() {
const rows = [['1 – 5', 'Ir a ' + NAV.map(n => n.label).join(', ')], ['/  o  Ctrl+K', 'Buscar en toda la Bitácora (secciones, eventos, tareas)'], ['F', 'Buscar en esta página (Jefes, Personaje, Pets)'],
['M', 'Silenciar avisos 1 hora (otra vez: activar)'], ['?', 'Esta ayuda'], ['Esc', 'Cerrar'], ...KEYS.filter(k => k.key !== 'f').map(k => [k.key.toUpperCase(), k.label])];
modal({ title: 'Teclado', cls: 'help', html: `<dl class="keys">${rows.map(([k, v]) => `<dt>${k.split('  ').map(x => `<kbd>${esc(x)}</kbd>`).join(' ')}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` });
}
/* ---------- cuenta y sync (src/cuenta.js, lazy) ---------- */
export const loadCuenta = () => import('./cuenta.js' + new URL(import.meta.url).search);
const CUENTA_OFF = 'Sin conexión: la cuenta se carga cuando vuelva.';
function cuentaBox() {
const f = Object.assign(document.createElement('fieldset'), { className: 's-cuenta', innerHTML: '<legend>Cuenta</legend>' });
loadCuenta().then(m => m.mount(f), () => f.insertAdjacentHTML('beforeend', `<p class="hint">${CUENTA_OFF}</p>`));
return f;
}
/* ---------- ajustes y onboarding de un paso ---------- */
export function openSettings({ welcome = false } = {}) {
const pr = profile(), now = Date.now();
const regOpts = Object.entries(REG).map(([k, r]) => `<option value="${k}"${k === pr.region ? ' selected' : ''}>${esc(r.name)}</option>`).join('');
const evRows = EVS.filter(e => e.category !== 'reset').map(e => `<label class="chk"><input type="checkbox" data-vis="${e.id}"${isVisible(e) ? ' checked' : ''}> <span data-evn="${e.id}">${esc(gname(e))}</span>${confOf(e) === 'sin' ? ' ' + confTag(e) : ''}</label>`).join('');
const html = `${welcome ? `<div class="ob-fac" role="group" aria-label="Tu facción" tabindex="-1" autofocus>${Object.entries(FACCION).map(([f, n]) => `<button type="button" class="ob-f" data-fac="${f}"><i class="fe fe-${f}" aria-hidden="true"></i><b>${n}</b></button>`).join('')}</div>` : ''}
<fieldset><legend>${welcome ? 'Tu server <small>(opcional)</small>' : 'Dónde jugás'}</legend>
<div class="f2"><label>Región<span class="sel"><select id="s-reg">${regOpts}</select></span></label>
<label>Servidor<span class="sel"><select id="s-srv"></select></span></label></div>
${welcome ? '' : '<div class="f2" id="s-fac"><span class="flab" id="s-fac-l">Facción</span><div class="seg" role="group" aria-labelledby="s-fac-l"><button type="button" data-fac="elyos">Elyos</button><button type="button" data-fac="asmodian">Asmodian</button></div></div>'}
<p class="hint" id="s-tz"></p></fieldset>
<fieldset><legend>${welcome ? '¿En qué idioma tenés el juego?' : 'Nombres del juego'}</legend>
<div class="f2"><div class="seg" role="group" aria-label="Nombres del juego"><button type="button" data-glang="es">Español</button><button type="button" data-glang="en">English</button></div></div>
${welcome ? '' : '<p class="hint">Jefes, eventos, mapas, ítems y skills con los nombres de tu cliente. La Bitácora sigue en español.</p>'}</fieldset>
${welcome ? '<p class="hint ob-acc">¿Ya la usás en otro dispositivo? <button type="button" class="linkbtn" data-hub="cuenta">Entrá con tu cuenta</button></p>' : `<fieldset><legend>Horas</legend>
<div class="f2"><div class="seg" role="group" aria-label="Qué reloj"><button type="button" data-clock="local">Tu reloj</button><button type="button" data-clock="server">Hora del server</button></div>
<div class="seg" role="group" aria-label="Formato"><button type="button" data-h12="0">24 h</button><button type="button" data-h12="1">12 h</button></div></div></fieldset>
<fieldset><legend>Avisos</legend>
<label class="chk"><input type="checkbox" id="s-snd"${A.sound ? ' checked' : ''}> Sonido</label>
<label class="rng">Volumen <input type="range" id="s-vol" min="0.05" max="1" step="0.05" value="${A.vol}"></label>
<label class="chk"><input type="checkbox" id="s-tit"${A.title ? ' checked' : ''}> Cuenta regresiva en el título de la pestaña</label>
<label class="chk"><input type="checkbox" id="s-qon"${A.quiet.on ? ' checked' : ''}> Horas de silencio (tu reloj)</label>
<div class="f2 q"><label>Desde <input type="time" id="s-qf" value="${A.quiet.from}"></label><label>Hasta <input type="time" id="s-qt" value="${A.quiet.to}"></label></div>
<p class="hint">${'Notification' in window ? (Notification.permission === 'granted' ? 'Notificaciones del sistema: permitidas.' : Notification.permission === 'denied' ? 'Notificaciones del sistema: bloqueadas en este navegador (igual te aviso en la página).' : 'El permiso de notificaciones se pide la primera vez que tocás una campana.') : 'Este navegador no tiene notificaciones: te aviso en la página.'}</p>
<button type="button" class="btn" id="s-test">${ico('i-bell-on')} Probar aviso</button></fieldset>
<p class="hint">De dónde salen los datos: <button type="button" class="linkbtn" data-hub="credits">Fuentes y créditos</button></p>
<fieldset><legend>Eventos que ves</legend><div class="evs">${evRows}</div></fieldset>`}`;
const box = document.createElement('div');
box.innerHTML = html;
if (!welcome) $('fieldset', box).after(cuentaBox());
const srv = $('#s-srv', box), reg = $('#s-reg', box);
const paintSrv = () => {
const r = reg.value, cur = store.get('hub-server', null), L = serverList(r), wf = welcome && store.get('hub-faccion', null);
const grp = f => `<optgroup label="${FACCION[f]}">${L.filter(s => s.faccion === f).map(s => `<option value="${s.id}"${s.id === cur ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`;
srv.innerHTML = `<option value="">Elegí tu server</option>${(wf ? [wf] : ['elyos', 'asmodian']).map(grp).join('')}`;
};
const paintFac = () => {
$$('[data-fac]', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fac === store.get('hub-faccion', null))));
const sf = $('#s-fac', box);
if (sf) sf.hidden = !!store.get('hub-server', null);
};
const paintTz = () => { $('#s-tz', box).textContent = tzSentence(Date.now()); };
const paintSeg = () => {
$$('[data-clock]', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.clock === P.clock)));
$$('[data-h12]', box).forEach(b => b.setAttribute('aria-pressed', String(!!+b.dataset.h12 === P.h12)));
$$('[data-glang]', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.glang === GL)));
$$('[data-evn]', box).forEach(n => { n.textContent = gname(EVENTS.get(n.dataset.evn)); });
};
paintSrv(); paintFac(); paintTz(); paintSeg();
reg.onchange = () => { setProfile({ region: reg.value, server: null }); paintSrv(); paintTz(); paintFac(); };
srv.onchange = () => {
const id = +srv.value || null;
setProfile({ server: id, ...(id ? { faccion: serverFaccion(id) } : {}) });
paintFac();
};
box.addEventListener('click', e => {
const f = e.target.closest('[data-fac]'), c = e.target.closest('[data-clock]'), h = e.target.closest('[data-h12]'), g = e.target.closest('[data-glang]');
if (g) { setGameLang(g.dataset.glang); paintSeg(); }
if (f) {
const s = store.get('hub-server', null);
setProfile({ faccion: f.dataset.fac, ...(welcome && s && serverFaccion(s) !== f.dataset.fac ? { server: null } : {}) });
if (welcome) paintSrv();
paintFac();
}
if (c) { setPrefs({ clock: c.dataset.clock }); paintSeg(); }
if (h) { setPrefs({ h12: !!+h.dataset.h12 }); paintSeg(); }
if (e.target.closest('#s-test')) { audio(); testAlert(); }
});
box.addEventListener('change', e => {
const t = e.target;
if (t.dataset.vis) setPrefs({ vis: { ...P.vis, [t.dataset.vis]: t.checked } });
else if (t.id === 's-snd') { setAlertPrefs({ sound: t.checked }); if (t.checked) audio(); }
else if (t.id === 's-vol') setAlertPrefs({ vol: +t.value });
else if (t.id === 's-tit') setAlertPrefs({ title: t.checked });
else if (['s-qon', 's-qf', 's-qt'].includes(t.id)) setAlertPrefs({ quiet: { on: $('#s-qon', box).checked, from: $('#s-qf', box).value || '00:00', to: $('#s-qt', box).value || '08:00' } });
});
$('#s-vol', box)?.addEventListener('input', e => setAlertPrefs({ vol: +e.target.value }));
store.set('hub-onboarded', 1);
const done = modal({ title: welcome ? '¿Con qué facción jugás?' : 'Ajustes', node: box, cls: 'settings' + (welcome ? ' welcome' : ''), actions: welcome ? [{ label: 'Ahora no', value: 'skip' }, { label: 'Listo', value: 'ok', primary: true }] : [{ label: 'Listo', value: 'ok', primary: true }] });
if (welcome) done.then(() => { if (!store.get('hub-faccion', null)) facHint(); });
return done;
}
function facHint() {
const bar = matchMedia('(max-width: 640px)').matches || html.classList.contains('mini');
toast(`Te muestro <b>Elyos</b>. La facción se cambia ${bar ? 'abajo a la derecha' : 'en el menú de la izquierda, abajo'}.`, { ms: 7000 });
const f = $('.rail .fac');
if (f) { f.classList.remove('ping'); void f.offsetWidth; f.classList.add('ping'); }
}
export function tzSentence(now = Date.now()) {
const r = REG[region()], d = (tzOffset(now, r.tz) - tzOffset(now, LOCAL_TZ)) / HOUR;
if (d === 0) return 'Horas en tu reloj.';          // misma hora que el server: la frase larga no aporta nada
return `El server de ${r.name} usa hora de ${r.tzName}, ${Math.abs(d)} h ${d > 0 ? 'adelante' : 'atrás'} de la tuya.${P.clock === 'server' ? ' Ves las horas del server.' : ' Ves las horas en tu reloj.'}`;
}
/* ---------- tareas: estado compartido (Tareas, Ahora y la paleta) ---------- */
export const PJ = versioned('hub-personajes', 1, { list: [], activo: null });
export const TK = versioned('hub-tareas', 1, { custom: [], hidden: [], done: {} });
export function myChars() {
const old = store.get('hub-pj-mio', null), p = PJ.get();
if (old?.k) {
let c = p.list.find(x => x.name.toLowerCase() === String(old.n).toLowerCase() && (x.server ?? null) === old.s);
if (!c) {
p.list.push(c = { id: 'c' + Math.random().toString(36).slice(2, 9), name: old.n, server: old.s, clase: old.c || null });
const t = TK.get();
if (p.list.length === 1 && t.done.main) { t.done = { ...t.done, [c.id]: t.done.main }; delete t.done.main; TK.set(t); }
}
c.pj = old;
p.principal ||= c.id;
p.activo ||= c.id;
if (PJ.set(p)) store.set('hub-pj-mio', null);
}
return p.list.filter(c => c.pj?.k).map(c => ({ ...c, main: c.id === p.principal }));
}
export function characters() {
const p = PJ.get();
const list = p.list.length ? p.list : [{ id: 'main', name: 'Mi personaje' }];
return { list, activo: list.some(c => c.id === p.activo) ? p.activo : list[0].id };
}
export function taskList() {
const t = TK.get(), hid = new Set(t.hidden);
return [...TASKS.items, ...t.custom.map(c => ({ ...c, custom: true }))].filter(x => !hid.has(x.id));
}
export function taskDone(charId, period, now = Date.now()) {
const g = TK.get().done[charId]?.[period];
return g && g.stamp === lastReset(period, now) ? g.items : {};
}
export function setTaskDone(charId, period, id, val, now = Date.now()) {
const t = TK.get(), items = { ...taskDone(charId, period, now) };
if (val) items[id] = val; else delete items[id];
t.done = { ...t.done, [charId]: { ...t.done[charId], [period]: { stamp: lastReset(period, now), items } } };
const ok = TK.set(t);
emit('tasks');
return ok;
}
export function taskProgress(charId, now = Date.now()) {
const out = {};
for (const per of ['daily', 'weekly']) {
const L = taskList().filter(x => x.period === per && !x.optional), d = taskDone(charId, per, now);
out[per] = { done: L.filter(x => (d[x.id] || 0) >= (x.count || 1)).length, total: L.length };
}
return out;
}
/* ---------- ventana flotante (Document Picture-in-Picture) ---------- */
export async function popOut() {
if (pipWin) { pipWin.focus?.(); return 'pip'; }
if ('documentPictureInPicture' in window) {
try {
const w = await window.documentPictureInPicture.requestWindow({ width: 340, height: 372 });
const d = w.document;
for (const n of $$('link[rel=stylesheet]')) d.head.append(Object.assign(d.createElement('link'), { rel: 'stylesheet', href: n.href }));
d.documentElement.className = 'mini pip';
d.documentElement.lang = 'es-AR';
d.title = 'Bitácora · Próximos';
d.body.append(d.importNode($('#hub-sprite'), true));
const main = d.createElement('main');
main.className = 'mini-main';
d.body.append(main);
pipWin = w;
const stop = renderUpcoming(main, { count: 8, bells: false });
w.addEventListener('pagehide', () => { stop(); pipWin = null; cfgKey = ''; });
cfgKey = '';
tick();
return 'pip';
} catch { /* sin gesto o bloqueado: cae al popup */ }
}
window.open(ROOT + '?mini', 'bitacora-mini', 'popup,width=360,height=430');
return 'popup';
}
/* ---------- arranque ---------- */
const html = document.documentElement;
const FORCED_MINI = new URLSearchParams(location.search).has('mini');
const mqMini = matchMedia('(max-width: 480px) and (pointer: fine)');
const setMini = () => {
const m = FORCED_MINI || mqMini.matches;
if (m !== html.classList.contains('mini')) { html.classList.toggle('mini', m); renderStrip(); }
};
mqMini.addEventListener?.('change', setMini);
function registerBuiltins() {
for (const ev of EVS) registerAlertable({
id: ev.id, label: ev.name, short: ev.short, labelEn: ev.nameEn, shortEn: ev.shortEn, href: ROOT + '#ev-' + ev.id,
next: now => nextOcc(ev.id, now), current: now => currentOcc(ev.id, now),
note: o => o.ev.entry ? `${o.ev.entryLabel} ${o.ev.entry} min` : o.ev.notes?.split('.')[0],
});
registerPalette('nav', { group: 'Sección', items: NAV.map((n, i) => ({ id: 'nav-' + n.id, title: n.label, sub: n.desc, icon: n.icon, href: ROOT + n.href, pin: true, kw: String(i + 1) })) });
registerPalette('poi', {
group: 'Ir a', items: () => NAV.flatMap(n => (n.poi || []).map(x => ({ id: `poi-${n.id}-${x.id}`, title: x.label, sub: n.label, icon: n.icon, pin: true, kw: x.kw, w: 0.9,
href: ROOT + n.href + (x.fac ? x.fac[profile().faccion === 'asmodian' ? 'asmodian' : 'elyos'] : x.href) }))),
});
registerPalette('cmd', {
group: 'Acción', items: () => [
{ id: 'cmd-ajustes', title: 'Ajustes', sub: 'Región, server, facción, idioma del juego, horas y avisos', icon: 'i-gear', run: () => openSettings(), pin: true, kw: 'configuracion server region faccion idioma ingles english nombres' },
{ id: 'cmd-mute', title: isMuted() ? 'Activar avisos' : 'Silenciar avisos 1 hora', sub: 'Tecla M', icon: 'i-bell-off', run: () => toggleMute(), pin: true, kw: 'mute silencio' },
{ id: 'cmd-pip', title: 'Sacar ventana', sub: 'Próximos en una ventana chica, siempre encima', icon: 'i-pip', run: () => popOut(), pin: true, kw: 'mini flotante picture overlay' },
{ id: 'cmd-creditos', title: 'Fuentes y créditos', sub: 'De dónde salen los horarios, los jefes y las imágenes', icon: 'i-ext', run: () => openCredits(), kw: 'fuentes creditos datos questlog plaync shugo' },
{ id: 'cmd-test', title: 'Probar aviso', sub: 'Toast, sonido y notificación', icon: 'i-bell-on', run: () => { audio(); testAlert(); }, kw: 'alerta sonido notificacion' },
{ id: 'cmd-help', title: 'Teclado', sub: 'Tecla ?', icon: 'i-help', run: () => openHelp(), kw: 'ayuda atajos teclas' },
],
});
registerPalette('eventos', {
group: 'Evento', items: () => {
const now = Date.now();
return EVS.map(ev => {
const o = currentOcc(ev.id, now) || nextOcc(ev.id, now);
const sub = !o ? '' : isLive(o, now) ? `En curso · ${statusText(o, now)[0]}` : `Próxima ${fmtClock(o.start, { now })} · en ${fmtLeft(o.start - now)}`;
return { id: 'ev-' + ev.id, title: gname(ev), sub, icon: catIcon(ev), href: ROOT + '#ev-' + ev.id, kw: [gboth(ev), gboth(ev, 'short'), ev.notes].filter(Boolean).join(' ') };
});
},
});
registerPalette('tareas', {
group: 'Tarea', items: () => taskList().map(t => ({ id: 't-' + t.id, title: gname(t), sub: `${t.period === 'weekly' ? 'Semanal' : 'Diaria'}${t.detail ? ' · ' + gname(t, 'detail') : ''}`, kw: gboth(t), icon: 'i-tareas', href: ROOT + 'tareas/#t-' + t.id })),
});
if (DATA.pets) registerPalette('pets', {
group: 'Pet', items: () => {
const f = profile().faccion === 'asmodian' ? 'a' : 'e';
return DATA.pets.filter(p => p[3].includes(f)).map(([id, name, en, , sub]) => ({ id: 'pet-' + id, title: gname({ name, nameEn: en }), sub, kw: `${name} ${en || ''} pet mascota`, icon: 'i-pets', href: ROOT + 'pets/#pet-' + id, w: 0.9 }));
},
});
registerPalette('personajes', {
group: 'Personaje', items: () => {
const mine = myChars().map(c => c.pj), seen = new Set();
return [...mine, ...store.get('hub-pj-favoritos', []), ...store.get('hub-pj-recientes', [])].filter(c => c?.k && !seen.has(c.k.toLowerCase()) && seen.add(c.k.toLowerCase()))
.map((c, i) => ({ id: 'pj-' + c.k, title: c.n, sub: [mine.includes(c) && 'Mi personaje', c.l && 'Nivel ' + c.l, gclass(c.c), serverName(c.s)].filter(Boolean).join(' · '), icon: 'i-personaje', href: ROOT + 'personaje/#' + c.k.split('/').map(encodeURIComponent).join('/'), pin: i < 6, kw: 'personaje pj ficha' }));
},
});
}
function paintFac() {
const box = $('.rail .fac'), p = profile(), f = viewFaccion(), n = facNote(p);
html.dataset.pf = f;
if (!box) return;
for (const b of $$('[data-gfac]', box)) b.setAttribute('aria-pressed', String(b.dataset.gfac === f));
box.classList.toggle('off', !!n);
box.title = n || '';
$('.fac-n', box).innerHTML = !p.server ? `Mostrando <b>${esc(REG[p.region]?.name || '')}</b>` : n ? `Tu server es <b>${esc(serverName(p.server))}</b> (${FACCION[serverFaccion(p.server)]})` : `Tu server: <b>${esc(serverName(p.server))}</b>`;
}
const hasData = () => PJ.get().list.length > 0 || Object.keys(TK.get().done || {}).length > 0 || Object.keys(A.bells || {}).length > 0 || (store.get('pets-owned', []) || []).length > 0;
function boot() {
setMini();
registerBuiltins();
renderStrip();
on('structure', renderStrip); on('prefs', renderStrip); on('profile', renderStrip); on('bells', renderStrip); on('mute', renderStrip); on('tasks', renderStrip);
onStore('hub-tareas', renderStrip); onStore('hub-personajes', renderStrip);
onTick(now => { checkAlerts(now); titleAndFavicon(now); }, { hidden: true });
onStore('hub-alertas', () => { A = AKEY.get(); rebuildQueue(Date.now()); emit('bells', A); for (const b of $$('.bell')) paintBell(b); });
onStore('hub-prefs', () => { P = PREFS.get(); emit('prefs', P); });
onStore('hub-idioma-juego', () => setGameLang(store.get('hub-idioma-juego', 'es'), { remote: true }));
html.dataset.gl = GL;
on('gamelang', () => { renderStrip(); titleAndFavicon(Date.now()); });
syncTimers();
onStore('hub-timers', syncTimers);
for (const k of ['hub-region', 'hub-server', 'hub-faccion']) onStore(k, () => { CACHE = null; emit('profile', profile()); });
paintFac();
on('profile', paintFac);
document.addEventListener('click', e => {
const gf = e.target.closest('[data-gfac]');
if (gf) {   // en la barra de abajo se ve un solo botón (la facción actual): tocarlo alterna
const o = gf.parentNode.querySelector(`[data-gfac]:not([data-gfac="${gf.dataset.gfac}"])`);
setFaccion(gf.dataset.gfac === viewFaccion() && !o.checkVisibility() ? o.dataset.gfac : gf.dataset.gfac);
return;
}
const b = e.target.closest('.bell[data-bell]');
if (b) { e.preventDefault(); openBellMenu(b); return; }
const cf = e.target.closest('[data-conf]');
if (cf) { e.preventDefault(); openConf(cf); return; }
if (e.target.closest('[data-hub=settings]')) openSettings();
else if (e.target.closest('[data-hub=search]')) openPalette();
else if (e.target.closest('[data-hub=help]')) openHelp();
else if (e.target.closest('[data-hub=credits]')) openCredits();
else if (e.target.closest('[data-hub=pip]')) popOut();
else if (e.target.closest('[data-hub=cuenta]')) loadCuenta().then(m => m.open(), () => toast(CUENTA_OFF));
else if (e.target.closest('#hub-warn [data-x]')) $('#hub-warn').hidden = true;
});
startClock();
tick();
if (!store.get('hub-onboarded', 0) && !html.classList.contains('mini') && !store.get('hub-server', null)) openSettings({ welcome: true });
else if (!store.get('hub-cuenta', null) && !store.get('hub-cuenta-ofrecida', 0) && !html.classList.contains('mini') && hasData()) {
store.set('hub-cuenta-ofrecida', 1);
const oc = () => { if (!$('dialog[open]')) loadCuenta().then(m => m.open('crear', true), () => {}); };
document.readyState === 'complete' ? oc() : addEventListener('load', oc, { once: true });
}
if (store.get('hub-cuenta', null)) { const lc = () => loadCuenta().catch(() => {}); document.readyState === 'complete' ? lc() : addEventListener('load', lc, { once: true }); } // con sesión: sync
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !DATA.noSW)
addEventListener('load', () => setTimeout(() => navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => {}), 3000), { once: true });
}
if (RM) html.classList.add('rm');
addEventListener('pageswap', e => { const v = e.viewTransition; if (v) for (const p of ['ready', 'finished', 'updateCallbackDone']) v[p]?.catch(() => {}); });
boot();
