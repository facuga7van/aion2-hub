import {
$, $$, esc, ico, norm, bind, fmtLeft, leftNext, store, profile, setProfile, serverList, serverName, SERVERS, SCHEDULE, FACCION,
PJ, TK, ROOT, toast, modal, announce, registerKey, lnaBlocked, LNA_MSG, setTitle, myChars, gname, galt, gclass, gameLang, on,
} from './core.js?v=42655a9e86';
import { GATES, gateOf, ilvlOf, skillParts, skillHint, kindGuess, plan, stations, useful, NODE_COST, NORMAL_CAP, BASE_CAP, STIG_CAP, isArcana } from './personaje-calc.js?v=42655a9e86';
const DEF_API = 'https://mora-server.tail3b8ec1.ts.net:8443';
const API = (() => {
const v = String(new URLSearchParams(location.search).get('api') || store.get('hub-pj-api', '') || '').replace(/\/$/, '');
return /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(v) ? v : DEF_API;     // nunca un host ajeno desde un link
})();
const REC = 'hub-pj-recientes', FAV = 'hub-pj-favoritos', BLD = 'hub-pj-build';
const SK = (() => { try { return JSON.parse($('#page-data')?.textContent || '{}'); } catch { return {}; } })();   // {skillId: [nombre EN, ícono]}
const NAME = /^[\p{L}\p{N}]{2,16}$/u;
const REGS = Object.keys(SERVERS.regions);
const regName = r => SCHEDULE.regions[r]?.name || r.toUpperCase();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-');
const fac = raceId => raceId === 1 ? 'elyos' : 'asmodian';
const keyOf = (r, s, n) => `${r}/${slug(serverName(s) || String(s))}/${n}`;
const hashOf = k => '#' + k.split('/').map(encodeURIComponent).join('/');
const nf = n => n == null ? '—' : new Intl.NumberFormat('es-AR').format(n);
const GRADE = { Common: 'Común', Rare: 'Raro', Legend: 'Legendario', Unique: 'Único', Epic: 'Épico', Special: 'Especial', Mythic: 'Mítico' };
const gcls = g => 'g-' + String(g || 'common').toLowerCase().replace(/[^a-z]/g, '');
const KINDS = [['pve', 'Estándar'], ['support', 'Healer'], ['pvp', 'PvP']];
const KIND_ES = Object.fromEntries(KINDS);
const HEALS = new Set(['Clérigo', 'Cantor']);
const kindsOf = c => HEALS.has(c.d.profile.class) ? KINDS : KINDS.filter(([v]) => v !== 'support');
const CLS_FILE = { Gladiador: 'Gladiator', Templario: 'Templar', Arquero: 'Ranger', Asesino: 'Assassin', Hechicero: 'Sorcerer', Espiritualista: 'Elementalist', Clérigo: 'Cleric', Cantor: 'Chanter' };
const CLS_KEY = Object.fromEntries(Object.entries(CLS_FILE).map(([es, en]) => [es, en.toLowerCase()]));
const IMG_OK = /^https:\/\/([a-z0-9-]+\.)*(playnccdn|plaync)\.com\//;
const IC = ROOT + 'assets/ic/';
const base = u => (String(u).split('/').pop() || '').replace(/\.png$/i, '');
function img(src, sz, cls = '', alt = '') {
if (!IMG_OK.test(src || '')) return `<span class="${cls} noimg" style="--sz:${sz}px" aria-hidden="true"></span>`;
const b = base(src), local = /^(ICON_|Icon_|UT_Class_)/.test(b) && !/^Icon_Wing/.test(b);
return `<img class="${cls}" src="${esc(local ? IC + b + '.webp' : src)}"${local ? ` data-fb="${esc(src)}"` : ''} width="${sz}" height="${sz}" loading="lazy" decoding="async" alt="${esc(alt)}" referrerpolicy="no-referrer">`;
}
const icoGame = (name, sz, cls = '') => `<img class="${cls}" src="${IC}${name}.webp" width="${sz}" height="${sz}" loading="lazy" decoding="async" alt="">`;
addEventListener('error', e => { const i = e.target; if (i?.tagName === 'IMG' && i.dataset.fb) { const u = i.dataset.fb; delete i.dataset.fb; i.src = u; } }, true);
/* ---------- red ---------- */
class ApiError extends Error { constructor(kind, msg = '', extra = {}) { super(msg); Object.assign(this, { kind }, extra); } }
async function api(path, params, ms = 25000) {
const ctl = new AbortController(), slow = setTimeout(() => ctl.abort(), ms);
const main = fetch(API + path + '?' + new URLSearchParams(params), { signal: ctl.signal });
main.catch(() => {});
let net = false;                                       // TypeError = no hubo conexión (red, o Chrome bloqueó la red local)
const down = e => { net ||= e?.name === 'TypeError'; return false; };
try {
const up = await Promise.race([
main.then(() => true, down),
fetch(API + '/health', { signal: AbortSignal.timeout(3000), cache: 'no-store' }).then(r => r.ok, down),
]);
if (!up) { ctl.abort(); throw new ApiError('offline', '', { lna: net && await lnaBlocked() }); }
let r;
try { r = await main; } catch { throw new ApiError(ctl.signal.aborted ? 'slow' : 'offline'); }
if (r.ok) return await r.json();
const body = await r.json().catch(() => ({}));
if (r.status === 429) throw new ApiError('limit', body.error, { wait: +r.headers.get('Retry-After') || 60 });
if (r.status === 404) throw new ApiError('notfound', body.error);
throw new ApiError('server', body.error || `El servidor respondió ${r.status}.`);
} finally { clearTimeout(slow); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function pool(tasks, onProg) {
const res = new Array(tasks.length);
let i = 0, done = 0;
const worker = async () => {
while (i < tasks.length) {
const k = i++;
for (;;) {
try { res[k] = await tasks[k](); break; } catch (e) {
if (e.kind !== 'limit') { res[k] = { error: e }; break; }
onProg?.(done, tasks.length, e.wait);
await sleep(e.wait * 1000);
}
}
onProg?.(++done, tasks.length);
}
};
await Promise.all([worker(), worker(), worker()]);
return res;
}
/* ---------- guardado: refs {k, r, s, n, id, c, l, f, i}; mis personajes = hub-personajes con `pj` (core: myChars) ---------- */
const refs = key => store.get(key, []).filter(x => x && x.k);
const same = (a, b) => a.k.toLowerCase() === b.k.toLowerCase();
const isFav = ref => refs(FAV).some(x => same(x, ref));
const mineOf = ref => myChars().find(c => same(c.pj, ref));
function remember(ref) {
store.set(REC, [ref, ...refs(REC).filter(x => !same(x, ref))].slice(0, 8));
if (isFav(ref)) store.set(FAV, refs(FAV).map(x => same(x, ref) ? ref : x));     // nivel y clase al día
const m = mineOf(ref);
if (m) { const p = PJ.get(); const c = p.list.find(x => x.id === m.id); c.pj = ref; c.clase = ref.c || c.clase; PJ.set(p); }
}
const ids = new Map();                                   // k (minúsculas) → characterId, para no buscar de nuevo
for (const x of [...refs(REC), ...refs(FAV), ...myChars().map(c => c.pj)]) if (x.id) ids.set(x.k.toLowerCase(), x.id);
function refOfResult(r, x) {
return { k: keyOf(r, x.serverId, x.name), r, s: x.serverId, n: x.name, id: x.characterId, c: x.class, l: x.level, f: fac(x.raceId), i: x.profileImage };
}
function addMine(ref) {
const p = PJ.get(), wasEmpty = !p.list.length;
let c = p.list.find(x => x.name.toLowerCase() === ref.n.toLowerCase() && (x.server ?? null) === ref.s);
if (!c) {
p.list.push(c = { id: 'c' + Math.random().toString(36).slice(2, 9), name: ref.n, server: ref.s, clase: ref.c || null });
if (wasEmpty) { const t = TK.get(); if (t.done.main) { t.done = { ...t.done, [c.id]: t.done.main }; delete t.done.main; TK.set(t); } }
}
c.pj = ref;
if (!p.list.some(x => x.id === p.principal && x.pj)) p.principal = c.id;
if (!p.activo || wasEmpty) p.activo = c.id;
PJ.set(p);
return p.principal === c.id;
}
function setMain(ref) {
const before = { prof: profile(), pj: PJ.get() };
const p = PJ.get(), c = p.list.find(x => x.pj && same(x.pj, ref));
if (c) { p.principal = c.id; PJ.set(p); }
setProfile({ region: ref.r, server: ref.s, faccion: ref.f });
return () => { setProfile(before.prof); PJ.set(before.pj); };
}
/* ---------- formulario ---------- */
const out = $('#pj-out'), form = $('#pj-q'), inp = $('#pj-n'), selR = $('#pj-reg'), selS = $('#pj-srv');
selR.innerHTML = REGS.map(r => `<option value="${r}">${esc(regName(r))}</option>`).join('');
function fillServers(r, s = '') {
const L = serverList(r);
selS.innerHTML = '<option value="">Todos los servers</option>' + ['elyos', 'asmodian'].map(f =>
`<optgroup label="${FACCION[f]}">${L.filter(x => x.faccion === f).map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</optgroup>`).join('');
selS.value = String(s);
}
selR.value = profile().region;
fillServers(selR.value);
selR.addEventListener('change', () => fillServers(selR.value));
let req = 0, last = null, retry = null, cur = null, again = false, TAB = 'pasos';
form.addEventListener('submit', e => {
e.preventDefault();
const q = inp.value.trim();
if (!NAME.test(q)) {
inp.setAttribute('aria-invalid', 'true');
$('#pj-hint').innerHTML = '<b>El nombre va de 2 a 16 letras o números, sin espacios ni símbolos.</b>';
inp.focus();
return;
}
inp.removeAttribute('aria-invalid');
$('#pj-hint').innerHTML = 'De 2 a 16 letras o números.<span class="pj-k"> <kbd>F</kbd> para volver acá.</span>';
const s = +selS.value || null, h = qHash(q, selR.value, s);
if (location.hash === h) search(q, selR.value, s); else { again = true; location.hash = h; }
});
const qHash = (q, r, s) => `#buscar/${r}/${encodeURIComponent(q)}${s ? '/' + slug(serverName(s)) : ''}`;
function parseSearch() {
const m = location.hash.match(/^#buscar\/([a-z]+)\/([^/]+)(?:\/([^/]+))?$/);
if (!m || !REGS.includes(m[1])) return null;
let q;
try { q = decodeURIComponent(m[2]); } catch { return null; }
const s = m[3] ? serverList(m[1]).find(x => slug(x.name) === m[3])?.id : null;
return NAME.test(q) && s !== undefined ? { q, r: m[1], s } : null;
}
/* ---------- estados ---------- */
function busy(on, html = '') {
out.setAttribute('aria-busy', String(on));
if (on) out.innerHTML = `<div class="pj-load" role="status"><span class="pj-spin" aria-hidden="true"></span>${html}</div>`;
}
const MSG = {
offline: e => ['Sin conexión con el servidor', e.lna ? LNA_MSG : 'No pude hablar con el servidor de la Bitácora en 3 segundos. Los horarios, avisos y tareas siguen andando; los personajes necesitan conexión.'],
slow: () => ['El servidor tardó demasiado', 'La ficha oficial está lenta o saturada. Probá de nuevo en un rato.'],
limit: e => ['Muchas consultas seguidas', `El servidor limita las búsquedas para no saturar la ficha oficial. Probá de nuevo en ${e.wait} segundos.`],
server: e => ['La ficha oficial no respondió bien', e.message || 'Probá de nuevo en un rato.'],
};
function paintError(e, nfMsg) {
out.setAttribute('aria-busy', 'false');
const [t, d] = e.kind === 'notfound' ? nfMsg : (MSG[e.kind] || MSG.server)(e);
out.innerHTML = `<div class="pj-msg${e.kind === 'notfound' ? '' : ' bad'}" role="alert" data-kind="${esc(e.kind || 'server')}"><h2>${esc(t)}</h2><p>${esc(d)}</p>
${e.kind === 'notfound' ? '' : `<button type="button" class="btn" id="pj-retry">${ico('i-reset')}Reintentar</button>`}</div>`;
announce(t);
}
/* ---------- búsqueda e inicio ---------- */
async function search(q, r, s) {
const seq = ++req;
retry = () => search(q, r, s);
cur = null;
busy(true, `Buscando «${esc(q)}» en ${esc(s ? serverName(s) : regName(r))}…`);
try {
const res = await api('/api/search', { q, region: r, ...(s && { server: s }) });
if (seq !== req) return;
const list = res.results.map(x => refOfResult(r, x)).sort((a, b) => (b.n.toLowerCase() === q.toLowerCase()) - (a.n.toLowerCase() === q.toLowerCase()));
for (const x of list) ids.set(x.k.toLowerCase(), x.id);
last = { q, r, s, list };
if (list.length === 1) { location.hash = hashOf(list[0].k); return; }
paintResults();
} catch (e) {
if (seq === req) paintError(e, [`No encontré «${q}» en ${s ? serverName(s) : regName(r)}`, 'Revisá cómo se escribe o probá con otra región o server.']);
}
}
const clsIco = (c, sz = 20) => CLS_FILE[c] ? icoGame('UT_Class_' + CLS_FILE[c] + '_Large', sz, 'pj-ci') : '';
const card = (x, tag = '') => `<li><a class="pj-card" href="${esc(hashOf(x.k))}">${img(x.i, 48, 'pj-pt')}
<span class="pj-cn"><b>${esc(x.n)}${tag}</b><small>${clsIco(x.c, 16)}${x.l ? `Nv ${x.l} · ` : ''}${esc(gclass(x.c || ''))}</small></span>
<span class="pj-cs">${esc(serverName(x.s) || '')}<em class="tag fac-${x.f}">${FACCION[x.f] || ''}</em></span></a></li>`;
function paintResults() {
out.setAttribute('aria-busy', 'false');
if (!last.list.length) {
paintError(new ApiError('notfound'), [`No encontré «${last.q}» en ${last.s ? serverName(last.s) : regName(last.r)}`, 'Revisá cómo se escribe o probá con otra región o server.']);
return;
}
const n = last.list.length;
out.innerHTML = `<section class="pj-res" aria-labelledby="pj-res-h"><div class="pj-sh"><h2 id="pj-res-h">${n} personaje${n > 1 ? 's' : ''}</h2>
<span>con «${esc(last.q)}» en ${esc(last.s ? serverName(last.s) : regName(last.r))}${n > 1 ? '. Si hay homónimos, fijate el server.' : ''}</span></div>
<ul class="pj-list">${last.list.map(x => card(x)).join('')}</ul></section>`;
announce(`${n} resultado${n > 1 ? 's' : ''}`);
}
function paintHome() {
out.setAttribute('aria-busy', 'false');
const mine = myChars(), favs = refs(FAV).filter(x => !mine.some(m => same(m.pj, x))), rec = refs(REC).filter(x => !mine.some(m => same(m.pj, x)));
out.innerHTML = `<div class="pj-home">
<section aria-labelledby="pj-h-mio"><div class="pj-sh"><h2 id="pj-h-mio">Mis personajes</h2></div>
${mine.length ? `<ul class="pj-list pj-mios">${mine.map(c => card(c.pj, c.main ? '<em class="tag gold">principal</em>' : '')).join('')}</ul>`
: '<p class="pj-empty">Buscá tu personaje y tocá <b>Es mi personaje</b>: queda acá, en Tareas, y la Bitácora toma su región, server y facción. Podés sumar todos los que juegues.</p>'}</section>
${favs.length ? `<section aria-labelledby="pj-h-fav"><div class="pj-sh"><h2 id="pj-h-fav">Favoritos</h2></div><ul class="pj-list">${favs.map(x => card(x)).join('')}</ul></section>` : ''}
<section aria-labelledby="pj-h-rec"><div class="pj-sh"><h2 id="pj-h-rec">Recientes</h2>${rec.length ? '<button type="button" class="linkbtn" id="pj-clear">Borrar recientes</button>' : ''}</div>
${rec.length ? `<ul class="pj-list">${rec.map(x => card(x)).join('')}</ul>` : '<p class="pj-empty">Las últimas 8 fichas que abras quedan acá.</p>'}</section>
<p class="pj-empty pj-tobl"><a href="#builds">Ver qué usan los mejores de cada clase</a>: equipo, estigmas y builds recomendadas.</p>
</div>`;
}
/* ---------- ruta ---------- */
function parseHash() {
let parts;
try { parts = location.hash.slice(1).split('/').map(decodeURIComponent); } catch { return null; }
if (parts.length !== 3) return null;
const r = parts[0].toLowerCase(), srv = REGS.includes(r) && serverList(r).find(x => slug(x.name) === parts[1].toLowerCase());
return srv && NAME.test(parts[2]) ? { r, s: srv.id, n: parts[2] } : null;
}
function route() {
if (tip.matches(':popover-open')) tip.hidePopover();
setTitle();
if (!location.hash || location.hash === '#') { req++; cur = null; paintHome(); return; }
const sq = parseSearch();
if (sq) {
req++; cur = null;
inp.value = sq.q; selR.value = sq.r; fillServers(sq.r, sq.s || '');
if (!again && last && last.q === sq.q && last.r === sq.r && last.s === sq.s) paintResults(); else search(sq.q, sq.r, sq.s);
again = false;
return;
}
const bl = location.hash.match(/^#builds(?:\/([a-z]+))?$/);
if (bl) {                                              // lo que usan los top sin personaje: #builds[/<clase>]
req++; cur = null;
out.setAttribute('aria-busy', 'false');
out.innerHTML = '<div class="pj-x"></div>';
const main = myChars().find(c => c.main) || myChars()[0];
mod().then(m => { if (location.hash === bl[0]) m.view($('.pj-x', out), null, { cls: bl[1] || CLS_KEY[main?.pj?.c] }); });
return;
}
const p = parseHash();
if (!p) {
req++;
paintError(new ApiError('notfound'), ['Ese enlace no es válido', 'Tiene que ser región/server/nombre, como el que queda en la barra de direcciones al abrir una ficha. Buscá el personaje arriba.']);
return;
}
if (cur && same(cur.ref, { k: keyOf(p.r, p.s, p.n) })) return;      // ya está abierta (p. ej. se corrigió la mayúscula)
openChar(p);
}
addEventListener('hashchange', route);
async function openChar(p, fresh = false) {
const seq = ++req, k = keyOf(p.r, p.s, p.n), where = `${serverName(p.s)} (${regName(p.r)})`;
retry = () => openChar(p, fresh);
if (!fresh) busy(true, `Abriendo a <b>${esc(p.n)}</b> en ${esc(where)}…`);
else { const rb = $('#pj-ref'); rb.disabled = true; rb.textContent = 'Refrescando…'; }
try {
let id = ids.get(k.toLowerCase()), d;
for (let tries = 0; !d; tries++) {
if (!id) {
const res = await api('/api/search', { q: p.n, region: p.r, server: p.s });
const hit = res.results.find(x => x.serverId === p.s && x.name.toLowerCase() === p.n.toLowerCase());
if (!hit) throw new ApiError('notfound');
id = hit.characterId;
}
try { d = await api('/api/character', { id, server: p.s, region: p.r, ...(fresh && { fresh: 1 }) }); }
catch (e) { if (e.kind !== 'notfound' || tries) throw e; ids.delete(k.toLowerCase()); id = null; }   // id guardado viejo: buscar de nuevo
}
if (seq !== req) return;
const pr = d.profile, ref = { k: keyOf(p.r, p.s, pr.name), r: p.r, s: p.s, n: pr.name, id, c: pr.class, l: pr.level, f: fac(pr.raceId), i: pr.image };
ids.set(ref.k.toLowerCase(), id);
const prev = cur;
cur = { ref, d, x: prev && same(prev.ref, ref) && prev.d.cachedAt === d.cachedAt ? prev.x : null };
if (hashOf(ref.k) !== location.hash) history.replaceState(null, '', hashOf(ref.k));
remember(ref);
paintChar();
loadDetail(cur);
loadCurated(cur);
if (fresh) toast(prev && prev.d.cachedAt === d.cachedAt ? 'La ficha oficial todavía no deja refrescar este personaje. Probá en unos minutos.' : `Ficha de <b>${esc(pr.name)}</b> actualizada.`);
else { scrollTo({ top: 0 }); announce(`Ficha de ${pr.name}`); }
} catch (e) {
if (seq !== req) return;
if (fresh && cur) { toast(esc((MSG[e.kind] || MSG.server)(e)[0]) + '. La ficha que ves es la de antes.'); return; }
paintError(e, [`No encontré a ${p.n} en ${where}`, 'Puede que haya cambiado de nombre o de server, o que el enlace tenga un error. Buscalo arriba.']);
}
}
/* ---------- detalle: piezas y tableros (para nivel de objeto, skills por fuente, pasos y Daevanion) ---------- */
const detailCache = new Map();
async function loadDetail(c) {
const key = `${c.ref.k}|${c.d.cachedAt}`, q = { id: c.ref.id, server: c.ref.s, region: c.ref.r };
if (c.x) return;
let x = detailCache.get(key);
if (!x) {
c.prog = [0, 1];
try { x = await api('/api/sheet', q, 60000); } catch (e) {
if (e.kind !== 'notfound') { c.err = e; if (cur === c) paintPanel(); return; }
const eq = c.d.equipment || [], bd = c.d.daevanion || [];
const order = [...bd.slice(0, 4).map(b => ['b', b]), ...eq.filter(e => e.slot <= 14 || isArcana(e.slot)).map(e => ['i', e]),
...bd.slice(4).map(b => ['b', b]), ...eq.filter(e => !(e.slot <= 14 || isArcana(e.slot))).map(e => ['i', e])];
x = { items: {}, boards: {} };
const r = await pool(order.map(([t, o]) => () => t === 'b'
? api('/api/daevanion', { ...q, board: o.id }).then(v => { x.boards[o.id] = v; })
: api('/api/item', { ...q, itemId: o.id, enchantLevel: o.enchant || 0, exceedLevel: o.exceed || 0, slotPos: o.slot }).then(v => { x.items[o.slot] = v; })),
(n, of, wait) => { c.prog = [n, of, wait]; if (cur === c && TAB === 'pasos') paintPanel(); });
if (r.every(v => v?.error)) { c.err = r[0].error; if (cur === c) paintPanel(); return; }
}
detailCache.set(key, x);
}
c.x = x;
c.err = null;
if (cur === c) { paintBuild(); paintWhere(); paintPanel(); }
}
let CUR = new Map();
async function loadCurated(c) {
const cls = CLS_KEY[c.d.profile.class];
if (!cls || CUR.has(cls)) return;
CUR.set(cls, null);
try { CUR.set(cls, await api('/api/curated', { class: cls })); } catch { CUR.delete(cls); return; }
if (cur === c) { paintBuild(); if (TAB === 'daevanion') paintPanel(); }
}
const curated = c => CUR.get(CLS_KEY[c.d.profile.class]) || null;
/* ---------- build que sigue (Estándar / Healer / PvP), guardada por personaje ---------- */
const kindStored = ref => store.get(BLD, {})[ref.k.toLowerCase()] || null;
const okKind = (c, k) => kindsOf(c).some(([v]) => v === k) ? k : null;
const kindOf = c => okKind(c, kindStored(c.ref)) || guess(c).kind;
const guess = c => { const g = kindGuess(c.d, c.x?.items, curated(c)?.method?.kindSets); return okKind(c, g.kind) ? g : { kind: 'pve', sig: [] }; };
function paintBuild() {
const box = $('#pj-bld');
if (!box || !cur) return;
const g = guess(cur), k = kindOf(cur), st = okKind(cur, kindStored(cur.ref));
box.innerHTML = `<span class="pj-bl-l" id="pj-bl-l">Build que sigue</span>
<div class="seg" role="group" aria-labelledby="pj-bl-l">${kindsOf(cur).map(([v, l]) => `<button type="button" data-kind="${v}" aria-pressed="${v === k}">${l}${v === g.kind ? ' <small>sugerida</small>' : ''}</button>`).join('')}</div>
<small class="pj-bl-why">${st ? 'La elegiste vos.' : `Sugerida por lo que tiene puesto${g.sig.length ? esc(': ' + g.sig.join(', ')) : ''}.`} Cambia los pasos, los nodos y las builds de abajo.</small>`;
}
/* ---------- ficha ---------- */
function paintChar() {
const { ref, d } = cur, p = d.profile, fav = isFav(ref), mine = mineOf(ref), all = myChars();
out.setAttribute('aria-busy', 'false');
setTitle(`${p.name} · Personaje · Bitácora Daeva`);
out.innerHTML = `<article class="pj-f" aria-labelledby="pj-nm">
${all.length ? `<nav class="pj-mine" aria-label="Mis personajes"><span>Mis personajes</span><ul>${all.map(c => `<li><a href="${esc(hashOf(c.pj.k))}"${same(c.pj, ref) ? ' aria-current="page"' : ''}>${clsIco(c.pj.c, 18)}${esc(c.pj.n)}${c.main ? `<span class="sr"> (principal)</span>${ico('i-star-on', 'pj-mst')}` : ''}</a></li>`).join('')}</ul></nav>` : ''}
<header class="pj-hd">
${img(p.image, 72, 'pj-pt pj-pt-l', '')}
<div class="pj-hm">
<h2 id="pj-nm" class="pj-nm">${esc(p.name)}</h2>
<p class="pj-meta">${clsIco(p.class)}<span>${esc(gclass(p.class))} · Nv ${p.level}</span><span>${esc(p.server || serverName(ref.s))}</span><span class="fac-${ref.f}">${FACCION[ref.f]}</span>${p.legion ? `<span>Legión ${esc(p.legion)}</span>` : ''}</p>
</div>
<dl class="pj-big"><div><dt>Poder de combate</dt><dd>${nf(p.combatPower)}</dd></div><div><dt>Nivel de objeto</dt><dd id="pj-il">${nf(p.itemLevel)}</dd></div></dl>
<div class="pj-acts">
<button type="button" class="iconbtn" id="pj-fav" aria-pressed="${fav}" aria-label="Favorito" title="Favorito (G)">${ico(fav ? 'i-star-on' : 'i-star')}</button>
<span id="pj-mio-slot">${mioBtn(ref)}</span>
</div>
<p class="pj-upd"><span id="pj-ago" class="cd"></span> · <button type="button" class="linkbtn" id="pj-ref"></button>${mine && !mine.main ? ' · <button type="button" class="linkbtn" id="pj-main">Usar como principal</button>' : ''}</p>
</header>
<div class="pj-bld" id="pj-bld"></div>
<section class="pj-where" id="pj-where" aria-label="Dónde estás"></section>
<nav class="seg pj-tabs" aria-label="Vistas de la ficha">${[['pasos', 'Próximos pasos'], ['equipo', 'Equipo'], ['skills', 'Skills'], ['daevanion', 'Daevanion'], ['logros', 'Logros'], ['builds', 'Builds']].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${k === TAB}">${l}</button>`).join('')}</nav>
<div class="pj-x" id="pj-x"></div>
<p class="pj-src">Datos públicos de la ficha oficial del juego, a través del servidor de la Bitácora (guarda cada ficha 30 min). Sitio de fans, no afiliado. <button type="button" class="linkbtn" data-hub="credits">Fuentes y créditos</button></p>
</article>`;
paintBuild();
paintWhere();
paintPanel();
bind($('#pj-ago'), now => {
const m = Math.max(0, Math.floor((now - d.cachedAt) / 60e3));
return [`Actualizado ${m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : `hace ${Math.floor(m / 1440)} d`}`, d.cachedAt + (m + 1) * 60e3];
});
const rb = $('#pj-ref');
bind(rb, now => {
const left = d.refreshAvailableAt - now;
rb.disabled = left > 0;
return left > 0 ? [`Refrescar en ${fmtLeft(left)}`, now + leftNext(left)] : ['Refrescar', Infinity];
});
}
const mioBtn = ref => mineOf(ref)
? `<button type="button" class="btn ghost" id="pj-mio" aria-pressed="true" title="Sacarlo de Mis personajes (y de Tareas)">${ico('i-check')}Tuyo<span class="pj-quit">· Quitar</span></button>`
: `<button type="button" class="btn gold" id="pj-mio" aria-pressed="false" title="Lo suma a Mis personajes y a Tareas">${ico('i-plus')}Es mi personaje</button>`;
/* ---------- dónde estás: nivel de objeto → puerta de contenido ---------- */
function paintWhere() {
const box = $('#pj-where');
if (!box) return;
const il = cur.d.profile.itemLevel || 0, g = gateOf(il), next = g.next;
const lo = g.prev, hi = next ? next.il : il, pct = next ? Math.round((il - lo) / (hi - lo) * 100) : 100;
const head = next
? `${g.cur ? `Tu equipo te deja entrar a <b>${esc(g.cur.short || g.cur.name)}</b>. ` : ''}Te faltan <b class="pj-need">${nf(g.need)}</b> de nivel de objeto para <b>${esc(next.short || next.name)}</b>.`
: `Tu nivel de objeto alcanza para <b>todo el contenido de hoy</b>, incluida ${esc(g.cur.name)}.`;
const calc = cur.x && ilvlOf(cur.d, cur.x.items, cur.x.boards);
box.innerHTML = `<p class="pj-wt">${head}</p>
<div class="gbar" role="img" aria-label="${next ? `${nf(il)} de ${nf(hi)}: ${pct} % del camino a ${esc(next.short || next.name)}` : 'Todo el contenido abierto'}">
<span class="gb-l">${nf(lo)}${g.cur ? ` · ${esc(g.cur.short || g.cur.name)}` : ''}</span><span class="gb-r">${next ? `${nf(hi)} · ${esc(next.short || next.name)}${next.ok ? '' : ' <em class="tag">estimado</em>'}` : ''}</span>
<span class="gb-t"><i style="--w:${pct}%"></i><b style="--x:${pct}%">${nf(il)}</b></span></div>
<p class="pj-wc"${calc ? ` data-il-calc="${calc.total}"` : ''}>${!calc ? '' : calc.total === il ? `${ico('i-check')}Cuenta pieza por pieza: da ${nf(calc.total)}, igual que el oficial.` : `La cuenta pieza por pieza da ${nf(calc.total)} y el oficial ${nf(il)}: puede faltar una pieza o un tablero. Los pasos usan el oficial.`}</p>`;
}
/* ---------- pestañas ---------- */
function paintPanel() {
const x = $('#pj-x');
if (!x || !cur) return;
for (const b of $$('.pj-tabs button')) b.setAttribute('aria-pressed', String(b.dataset.tab === TAB));
if (TAB === 'builds') { x.innerHTML = '<p class="pj-load"><span class="pj-spin" aria-hidden="true"></span>Cargando…</p>'; const c = cur; mod().then(m => { if (cur === c && TAB === 'builds') m.view(x, c, { kind: kindOf(c) }); }, () => { x.innerHTML = '<p class="tip-err">No pude cargar esta vista. Revisá la conexión y recargá la página.</p>'; }); return; }
if (TAB === 'logros') { const c = cur; lgMod().then(m => { if (cur === c && TAB === 'logros') m.view(x, c); }, () => { x.innerHTML = '<p class="tip-err">No pude cargar esta vista. Revisá la conexión y recargá la página.</p>'; }); return; }
if (TAB === 'equipo') { x.innerHTML = equipHtml(); return; }
if (!cur.x) { x.innerHTML = waitHtml(); return; }
x.innerHTML = TAB === 'pasos' ? stepsHtml() : TAB === 'skills' ? skillsHtml() : daeHtml();
if (TAB === 'daevanion') paintBoard();
}
function waitHtml() {
if (cur.err) return `<div class="pj-msg bad" role="alert"><h3>${esc((MSG[cur.err.kind] || MSG.server)(cur.err)[0])}</h3><p>Sin el detalle de las piezas y los tableros no puedo calcular esto. El resto de la ficha sigue andando.</p><button type="button" class="btn" id="pj-xretry">${ico('i-reset')}Reintentar</button></div>`;
const [n, of, wait] = cur.prog || [0, 1];
const t = wait ? `El servidor pide esperar ${wait} s para no saturar la ficha oficial (${n} de ${of})…` : of > 1 ? `Leyendo tus piezas y tableros: ${n} de ${of}…` : 'Leyendo tus piezas y tableros…';
return `<div class="pj-wait" role="status"><span class="pj-spin" aria-hidden="true"></span>${t}</div>${TAB === 'pasos' ? '<ol class="st-l st-sk">' + '<li class="st"></li>'.repeat(5) + '</ol>' : ''}`;
}
/* ---------- próximos pasos + camino ---------- */
const gameIcon = (u, sz) => img(u, sz, 'st-ic');
function stepsHtml() {
const k = kindOf(cur), P = plan(cur.d, cur.x.items, cur.x.boards, k), st = stations(cur.d, cur.x.items, cur.x.boards), g = gateOf(P.path.il);
const steps = P.steps.map((s, i) => `<li class="st" data-step="${s.id}">
<span class="st-n">${i + 1}</span>
${s.icon ? gameIcon(s.icon, 48) : s.board ? icoGame('board_icon_unique_open', 48, 'st-ic') : ''}
<div class="st-b"><b class="st-t">${esc(s.title)}</b>
<ul class="st-g">${s.gain.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
${s.skills ? `<ul class="st-sk2">${s.skills.map(x => `<li>${img(x.icon, 24)}<span>${esc(x.name)} <b>+${x.n}</b>${x.T ? ` <em>llega a ${x.T}</em>` : ''}</span></li>`).join('')}</ul>` : ''}
<small class="st-c">${esc(s.cost)}</small></div>
<em class="st-s ${s.sure === 'seguro' ? 'ok' : ''}" title="${s.sure === 'seguro' ? 'Lo que ganás sale de las tablas del juego' : 'Depende de cosas que la ficha no muestra o de promedios'}">${s.sure}</em></li>`).join('');
const W = P.path.ways, roof = P.path.roof, span = Math.max(1, roof - P.path.il);
const WAY = { Amplificación: 'amp', Encantamiento: 'enc', Arcanas: 'arc' };
const gates = GATES.filter(x => x.il > P.path.il && x.il <= roof);
const route = st.map(s => { const q = s.of ? Math.min(1, s.v / s.of) : 0; return `<li class="rt rt-${s.k}"${s.tip ? ` title="${esc(s.tip)}"` : ''}><span class="rt-r" style="--q:${Math.round(q * 100)}"><b>${Math.round(q * 100)}%</b></span><span class="rt-t"><b>${s.t}</b><small>${s.txt ? esc(s.txt) : `${nf(s.v)} de ${nf(s.of)}`}</small></span></li>`; }).join('');
return `<section class="pj-sec st-w" aria-labelledby="st-h"><h3 id="st-h" class="pj-h">Tus próximos pasos <small>para tu build ${esc(KIND_ES[k])} · sugerencia: el orden es nuestro</small></h3>
${P.steps.length ? `<ol class="st-l">${steps}</ol>` : '<p class="pj-empty">No veo pasos con lo que muestra la ficha: equipo, amplificación, Arcanas y Daevanion están al tope. Lo que sigue es cambiar de equipo.</p>'}
<details class="rt-w" open><summary><b>Camino de prioridad</b> <small>cuánto llevás de cada cosa que se sube sin cambiar de equipo</small></summary>
<ol class="rt-l">${route}</ol>
${W.length ? `<p class="rt-h">Con todo eso tu nivel de objeto llega a <b>${nf(roof)}</b>${g.next ? (roof >= g.next.il ? `: alcanza para <b>${esc(g.next.short || g.next.name)}</b>` : `: no alcanza para ${esc(g.next.short || g.next.name)}; para eso hace falta mejor equipo`) : ''}.</p>
<div class="rt-bar" role="img" aria-label="${esc(W.map(w => `${w[0]} +${w[1]}`).join(', '))}">${W.map(w => `<i class="w-${WAY[w[0]] || 'dae'}" style="--w:${(w[1] / span * 100).toFixed(2)}%"></i>`).join('')}${gates.map(x => `<b class="rt-g" style="--x:${((x.il - P.path.il) / span * 100).toFixed(2)}%" title="${esc(x.name)}">${nf(x.il)}</b>`).join('')}</div>
<ul class="rt-k">${W.map(w => `<li class="w-${WAY[w[0]] || 'dae'}"><i></i>${esc(w[0])} <b>+${nf(w[1])}</b></li>`).join('')}</ul>` : ''}
</details></section>`;
}
/* ---------- equipo ---------- */
const SLOTS = [
['Armas y armadura', [[1, 'Arma'], [2, 'Secundaria'], [3, 'Casco'], [4, 'Hombreras'], [5, 'Pechera'], [6, 'Piernas'], [7, 'Guantes'], [8, 'Botas'], [19, 'Capa']]],
['Accesorios', [[10, 'Collar'], [11, 'Aro'], [12, 'Aro'], [13, 'Anillo'], [14, 'Anillo'], [15, 'Brazalete'], [16, 'Brazalete'], [17, 'Cinturón'], [22, 'Amuleto']]],
['Runas y Arcanas', [[23, 'Runa'], [24, 'Runa'], [41, 'Cáliz'], [42, 'Pergamino'], [43, 'Brújula'], [44, 'Campana'], [45, 'Espejo']]],
];
function equipHtml() {
const eq = cur.d.equipment || [], by = new Map(eq.map(e => [e.slot, e])), known = new Set(SLOTS.flatMap(g => g[1].map(s => s[0]))), it = cur.x?.items || {};
const groups = SLOTS.map(([t, l]) => [t, l.map(([s, lb]) => [s, lb, by.get(s)])]);
const extra = eq.filter(e => !known.has(e.slot)).map(e => [e.slot, e.slotName, e]);    // un slot nuevo de la ficha no se pierde
if (extra.length) groups[2][1].push(...extra);
const pips = (e) => { const m = it[e.slot]?.maxExceedEnchantLevel; return m ? `<span class="eq-amp" aria-label="Amplificación +${e.exceed || 0} de ${m}">${Array.from({ length: m }, (_, i) => `<i${i < (e.exceed || 0) ? ' class="on"' : ''}></i>`).join('')}</span>` : (e.exceed ? `<span class="eq-amp" aria-label="Amplificación +${e.exceed}"><i class="on"></i>+${e.exceed}</span>` : ''); };
return `<section class="pj-sec" aria-labelledby="eq-h"><h3 id="eq-h" class="pj-h">Equipo <small>Tocá una pieza: líneas, calidad y qué usan los top</small></h3>
${groups.map(([t, l]) => `<h4 class="pj-h4">${t}</h4><ul class="eq-g">${l.map(([s, lb, e]) => !e
? `<li class="eq empty"><span class="eq-i"></span><span class="eq-t"><small>${esc(lb)}</small><span class="eq-n">Vacío</span></span></li>`
: `<li><button type="button" class="eq ${gcls(e.grade)}" data-slot="${s}" aria-haspopup="dialog"><span class="eq-i">${img(e.icon, 44)}${e.enchant ? `<b class="eq-en">+${e.enchant}</b>` : ''}</span>
<span class="eq-t"><small>${esc(lb)}${it[e.slot]?.level ? ` · nivel ${it[e.slot].level}` : ''}</small><span class="eq-n">${esc(gname(e))}</span>${pips(e)}</span></button></li>`).join('')}</ul>`).join('')}
<div class="pj-pw">${cur.d.pet ? `<span>${img(cur.d.pet.icon, 36)}<small>Pet</small> ${esc(gname(cur.d.pet))} · Nv ${cur.d.pet.level}</span>` : ''}${cur.d.wings ? `<span>${img(cur.d.wings.icon, 36)}<small>Alas</small> ${esc(gname(cur.d.wings))}${cur.d.wings.enchant ? ` +${cur.d.wings.enchant}` : ''}</span>` : ''}</div></section>`;
}
/* ---------- skills: ícono, ES/EN y barra por fuente ---------- */
const skName = s => ({ name: s.name, nameEn: s.nameEn && s.nameEn !== s.name ? s.nameEn : SK[s.id]?.[0] || s.nameEn });
const hint = (s, x) => s.category === 'Dp' ? (s.level < STIG_CAP ? skillHint(s, x) : '') : x && (x.base < BASE_CAP || x.dae < x.daeMax) ? skillHint(s, x) : '';
function skillsHtml() {
const parts = skillParts(cur.d, cur.x.items, cur.x.boards), sk = cur.d.skills || [];
const top = new Map((curated(cur)?.top?.[kindOf(cur)]?.skills || []).map(s => [String(s.id), s.lvl]));
const row = s => {
const x = parts.get(String(s.id)) || { base: s.level, dae: 0, gear: 0, arc: 0 }, nm = skName(s);
const stig = s.category === 'Dp', max = stig ? STIG_CAP : Math.max(25, s.level), w = v => (v / max * 100).toFixed(2) + '%';
const seg = stig ? `<i class="s-st" style="--w:${w(s.level)}"></i>` : `<i class="s-ba" style="--w:${w(x.base)}"></i><i class="s-da" style="--w:${w(x.dae)}"></i><i class="s-eq" style="--w:${w(x.gear)}"></i><i class="s-ar" style="--w:${w(x.arc)}"></i>`;
const desc = stig ? `Nivel ${s.level}` : `Nivel ${s.level}: base ${x.base}, Daevanion ${x.dae}, equipo ${x.gear}, Arcanas ${x.arc}`;
const tl = top.get(String(s.id));
return `<li class="sk${useful(s) || stig ? '' : ' off'}" data-sk="${s.id}">
${img(s.icon, 40, 'sk-ic')}<span class="sk-n"><b>${esc(gname(nm))}</b>${galt(nm) ? `<small lang="${gameLang() === 'en' ? 'es' : 'en'}">${esc(galt(nm))}</small>` : ''}</span>
<span class="sk-bar" role="img" aria-label="${esc(desc)}" data-parts="${stig ? s.level : [x.base, x.dae, x.gear, x.arc].join(',')}">${seg}<b class="sk-cap" style="--x:${w(stig ? STIG_CAP : NORMAL_CAP)}" title="${stig ? 'Tope de las estigmas' : 'Tope normal: 10 con puntos + 4 de Daevanion'}"></b></span>
<b class="sk-lv">${s.level || '—'}</b>
<small class="sk-h">${[hint(s, x), tl && `los top: ${Math.round(tl)}`, !useful(s) && !stig && 'no la usás'].filter(Boolean).map(esc).join(' · ')}</small></li>`;
};
const act = sk.filter(s => s.category === 'Active'), pas = sk.filter(s => s.category === 'Passive'), sti = sk.filter(s => s.category === 'Dp' && s.level > 0);
const stiRest = sk.filter(s => s.category === 'Dp' && !(s.level > 0) && s.acquired);
const sorted = l => [...l.filter(useful), ...l.filter(s => !useful(s))];
return `<section class="pj-sec" aria-labelledby="sk-h"><h3 id="sk-h" class="pj-h">Skills <small>Nivel por fuente contra el tope normal (${NORMAL_CAP})</small></h3>
<ul class="sk-k"><li class="s-ba"><i></i>Base, con puntos (hasta ${BASE_CAP})</li><li class="s-da"><i></i>Daevanion (hasta 4)</li><li class="s-eq"><i></i>Equipo</li><li class="s-ar"><i></i>Arcanas</li><li class="s-cap"><i></i>Tope normal ${NORMAL_CAP}</li></ul>
<h4 class="pj-h4">Activas</h4><ul class="sk-l">${sorted(act).map(row).join('')}</ul>
<h4 class="pj-h4">Pasivas</h4><ul class="sk-l">${pas.map(row).join('')}</ul>
${sti.length ? `<h4 class="pj-h4">Estigmas <small>solo con Fragmentos de Estigma, tope ${STIG_CAP}</small></h4><ul class="sk-l sk-sti">${sti.sort((a, b) => b.level - a.level).map(row).join('')}</ul>` : ''}
${stiRest.length ? `<p class="pj-note sk-rest">Otras estigmas que tenés sin subir: ${stiRest.map(s => esc(gname(skName(s)))).join(', ')}.</p>` : ''}
<p class="pj-note">Arriba de ${NORMAL_CAP} se sube con líneas de skill de Arcanas (hasta +4 por línea) y del equipo (+1 por línea). Atenuadas: activas que no están en tu barra.</p></section>`;
}
/* ---------- Daevanion: los tableros dibujados con los nodos del juego ---------- */
let BOARD = 0;
function daeHtml() {
const bd = cur.d.daevanion || [];
return `<section class="pj-sec" aria-labelledby="dae-h"><h3 id="dae-h" class="pj-h">Daevanion <small>Tocá un nodo para ver qué da</small></h3>
<div class="dae-tabs" role="group" aria-label="Tableros">${bd.map((b, i) => `<button type="button" data-board="${i}" aria-pressed="${i === BOARD}"><b>${esc(gname(b))}</b><span class="bar" aria-hidden="true"><i style="--w:${Math.min(100, +b.percent || 0)}%"></i></span><small>${b.open} de ${b.total}</small></button>`).join('')}</div>
<div class="dae-w"><div class="dae-g" id="dae-g"></div><aside class="dae-s" id="dae-s"></aside></div></section>`;
}
function paintBoard() {
const b = cur.d.daevanion?.[BOARD], t = b && cur.x.boards[b.id], g = $('#dae-g');
if (!g) return;
if (!t) { g.innerHTML = '<p class="tip-err">No pude leer este tablero.</p>'; return; }
const nodes = (t.nodeList || []).filter(n => n.type !== 'None'), rows = nodes.map(n => n.row), cols = nodes.map(n => n.col);
const r0 = Math.min(...rows) - 1, c0 = Math.min(...cols) - 1, R = Math.max(...rows) - r0, C = Math.max(...cols) - c0;
const icons = new Map((cur.d.skills || []).map(s => [s.name, s.icon]));
const want = new Set((curated(cur)?.top?.[kindOf(cur)]?.daevanion?.[b.name]?.nodes || []).map(String));
const cls = CLS_KEY[cur.d.profile.class] || 'chanter';
g.style.setProperty('--c', C);
g.style.setProperty('--r', R);
g.innerHTML = nodes.map(n => {
const eff = (n.effectList || []).map(x => x.desc).join(', '), sk = n.type === 'SkillLevel' && icons.get(String(n.effectList?.[0]?.desc || '').replace(/ \+\d+$/, ''));
const file = n.type === 'Start' ? `board_icon_start_${cls}` : `board_icon_${String(n.grade).toLowerCase()}${n.open ? '_open' : ''}`, rec = !n.open && want.has(String(n.nodeId));
return `<button type="button" class="dn${n.open ? ' o' : ''}${rec ? ' rec' : ''}${n.type === 'SkillLevel' ? ' s' : ''}" data-node="${n.nodeId}" style="grid-area:${n.row - r0}/${n.col - c0};--bg:url(${IC}${file}.webp)" aria-label="${esc(eff || n.name)}${n.open ? ', abierto' : ', cerrado'}${rec ? ', lo abren los top' : ''}" title="${esc(eff || n.name)}">${sk ? img(sk, 24, 'dn-sk') : ''}</button>`;
}).join('');
const open = nodes.filter(n => n.open && n.type !== 'Start'), shut = nodes.filter(n => !n.open && n.type !== 'Start');
const pts = l => l.reduce((s, n) => s + (NODE_COST[n.grade] || 0), 0), recN = shut.filter(n => want.has(String(n.nodeId))).length;
$('#dae-s').innerHTML = `<p class="dae-c"><b>${open.length}</b> de ${open.length + shut.length} nodos abiertos · faltan <b>${pts(shut)}</b> puntos</p>
<div class="dae-node" id="dae-node" aria-live="polite"><p class="pj-empty">Tocá un nodo.</p></div>
<ul class="dae-k"><li>${icoGame('board_icon_legend_open', 22)}Skill activa (+1 nivel)</li><li>${icoGame('board_icon_rare_open', 22)}Skill pasiva o stat raro</li><li>${icoGame('board_icon_unique_open', 22)}Stat único</li><li>${icoGame('board_icon_common_open', 22)}Stat común</li><li><span class="dae-kc">${icoGame('board_icon_common', 22)}</span>Cerrado</li>${want.size ? `<li><span class="dae-kr"></span>Lo abren los top ${esc(KIND_ES[kindOf(cur)])} y vos no (${recN})</li>` : ''}</ul>
${t.openStatEffectList?.length ? `<details class="dae-sum"><summary>Lo que suma este tablero</summary><ul>${[...(t.openSkillEffectList || []), ...t.openStatEffectList].map(x => `<li>${esc(x.desc)}</li>`).join('')}</ul></details>` : ''}`;
}
function showNode(id) {
const b = cur.d.daevanion[BOARD], n = cur.x.boards[b.id].nodeList.find(x => String(x.nodeId) === String(id)), box = $('#dae-node');
if (!n || !box) return;
for (const el of $$('.dn.sel')) el.classList.remove('sel');
$(`.dn[data-node="${id}"]`)?.classList.add('sel');
box.innerHTML = `<b>${esc((n.effectList || []).map(x => x.desc).join(', ') || n.name)}</b><small>${n.type === 'Start' ? 'Inicio del tablero' : `${n.open ? 'Abierto' : 'Cerrado'} · ${NODE_COST[n.grade] || 0} punto${NODE_COST[n.grade] === 1 ? '' : 's'} · ${GRADE[n.grade] || ''}`}</small>`;
}
/* ---------- acciones ---------- */
out.addEventListener('click', e => {
if (e.target.closest('#pj-retry') && retry) return retry();
if (e.target.closest('#pj-clear')) { store.set(REC, []); paintHome(); return; }
if (!cur) return;
const { ref } = cur, t = e.target;
if (t.closest('#pj-fav')) toggleFav();
else if (t.closest('#pj-mio')) toggleMine();
else if (t.closest('#pj-main')) { const undo = setMain(ref); paintChar(); toast(`<b>${esc(ref.n)}</b> es tu principal: la Bitácora quedó en <b>${esc(serverName(ref.s))} · ${FACCION[ref.f]}</b>.`, { ms: 8000, action: { label: 'Deshacer', run: () => { undo(); if (cur) paintChar(); } } }); }
else if (t.closest('#pj-ref')) openChar({ r: ref.r, s: ref.s, n: ref.n }, true);
else if (t.closest('#pj-xretry')) { cur.err = null; paintPanel(); loadDetail(cur); }
else if (t.closest('[data-kind]')) {
const k = t.closest('[data-kind]').dataset.kind, m = store.get(BLD, {});
m[ref.k.toLowerCase()] = k;
store.set(BLD, Object.fromEntries(Object.entries(m).slice(-60)));
paintBuild(); paintPanel();
$(`#pj-bld [data-kind=${k}]`)?.focus();
announce(`Build ${KIND_ES[k]}`);
} else if (t.closest('[data-tab]')) { TAB = t.closest('[data-tab]').dataset.tab; paintPanel(); }
else if (t.closest('[data-slot]')) showItem(t.closest('[data-slot]'));
else if (t.closest('[data-board]')) { BOARD = +t.closest('[data-board]').dataset.board; paintPanel(); $(`[data-board="${BOARD}"]`)?.focus(); }
else if (t.closest('[data-node]')) showNode(t.closest('[data-node]').dataset.node);
});
function toggleMine() {
const { ref } = cur, m = mineOf(ref);
if (m) {
const before = { pj: PJ.get(), tk: TK.get() }, p = PJ.get();
p.list = p.list.filter(x => x.id !== m.id);
if (p.activo === m.id) p.activo = p.list[0]?.id || null;
if (p.principal === m.id) p.principal = p.list.find(x => x.pj)?.id || null;
PJ.set(p);
const t = TK.get(); delete t.done[m.id]; TK.set(t);
paintChar();
toast(`Saqué a <b>${esc(ref.n)}</b> de tus personajes y de Tareas.`, { ms: 8000, action: { label: 'Deshacer', run: () => { PJ.set(before.pj); TK.set(before.tk); if (cur) paintChar(); } } });
$('#pj-mio')?.focus();
return;
}
const prof = profile(), pjBefore = PJ.get(), tkBefore = TK.get(), main = addMine(ref);
if (main) setProfile({ region: ref.r, server: ref.s, faccion: ref.f });
paintChar();
$('#pj-mio')?.focus();
const undo = () => { setProfile(prof); PJ.set(pjBefore); TK.set(tkBefore); if (cur) paintChar(); toast('Listo, como estaba antes.'); };
toast(main ? `<b>${esc(ref.n)}</b> es tu personaje principal: la Bitácora quedó en <b>${esc(regName(ref.r))} · ${esc(serverName(ref.s))} · ${FACCION[ref.f]}</b>. También está en Tareas.`
: `Sumé a <b>${esc(ref.n)}</b> a tus personajes y a Tareas.`, { ms: 8000, action: { label: 'Deshacer', run: undo } });
}
function toggleFav() {
if (!cur) return;
const { ref } = cur, on = !isFav(ref);
store.set(FAV, on ? [ref, ...refs(FAV)] : refs(FAV).filter(x => !same(x, ref)));
const b = $('#pj-fav');
b.setAttribute('aria-pressed', String(on));
b.innerHTML = ico(on ? 'i-star-on' : 'i-star');
toast(on ? `<b>${esc(ref.n)}</b> quedó en favoritos.` : `Saqué a <b>${esc(ref.n)}</b> de favoritos.`);
}
/* ---------- builds de los top (lazy: personaje-builds.js) ---------- */
const VQ = new URL(import.meta.url).search;              // ?v=<hash>: el módulo lazy va con la misma versión
let modP = null;
const mod = () => modP ||= import('./personaje-builds.js' + VQ).then(m => { m.init({ api, MSG, img, gcls, GRADE, nf, curated: c => c && curated(c), CLS_KEY }); return m; }, e => { modP = null; throw e; });
let lgP = null;
const lgMod = () => lgP ||= import('./personaje-logros.js' + VQ).then(m => { m.init({ nf, IC }); return m; }, e => { lgP = null; throw e; });
addEventListener('storage', e => { if (cur && TAB === 'logros' && String(e.key).startsWith('hub-logros-')) paintPanel(); });
/* ---------- detalle de pieza (popover): líneas con su calidad y si la usan los top de tu build ---------- */
const tip = Object.assign(document.createElement('div'), { id: 'pj-tip', className: 'pj-tip', tabIndex: -1 });
tip.setAttribute('popover', 'auto');
tip.setAttribute('role', 'dialog');
tip.setAttribute('aria-label', 'Detalle de la pieza');
document.body.append(tip);
const itemCache = new Map();
let tipFrom = null, tipClosed = 0;
tip.addEventListener('toggle', e => { if (e.newState === 'closed') tipClosed = Date.now(); });
async function showItem(btn) {
const c = cur, { ref, d } = c, e = d.equipment.find(x => x.slot === +btn.dataset.slot);
if (!e) return;
if (tipFrom === btn && Date.now() - tipClosed < 300) return;          // el clic que lo cerró (light dismiss) no lo reabre
const q = { id: ref.id, server: ref.s, region: ref.r, itemId: e.id, enchantLevel: e.enchant || 0, exceedLevel: e.exceed || 0, slotPos: e.slot };
const key = new URLSearchParams(q).toString();
tipFrom = btn;
tip.dataset.k = key;
tip.className = 'pj-tip ' + gcls(e.grade);
tip.innerHTML = `<div class="tip-h">${img(e.icon, 48)}<div><b class="tip-n">${esc(gname(e))}${e.enchant ? ` +${e.enchant}` : ''}</b><small>${esc(GRADE[e.grade] || e.grade || '')}${e.exceed ? ` · amplificación +${e.exceed}` : ''}</small></div>
<button type="button" class="iconbtn tip-x" aria-label="Cerrar">${ico('i-x')}</button></div><div class="tip-b"><p class="pj-load"><span class="pj-spin" aria-hidden="true"></span>Cargando…</p></div>`;
$('.tip-x', tip).onclick = () => tip.hidePopover();
if (!matchMedia('(max-width:640px)').matches) {
const r = btn.getBoundingClientRect(), W = 360, H = Math.min(innerHeight * 0.75, 560);
tip.style.left = Math.max(8, Math.min(r.left, innerWidth - W - 8)) + 'px';
tip.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - H - 8)) + 'px';
} else tip.style.left = tip.style.top = '';
if (!tip.matches(':popover-open')) tip.showPopover();
tip.focus();
try {
const it = c.x?.items[e.slot] || itemCache.get(key) || await api('/api/item', q);
itemCache.set(key, it);
if (tip.dataset.k !== key) return;
const m = await mod();
$('.tip-b', tip).innerHTML = await m.itemBody(it, e, c, kindOf(c));
} catch (err) {
if (tip.dataset.k !== key) return;
$('.tip-b', tip).innerHTML = `<p class="tip-err">${esc(err.kind === 'notfound' ? 'La ficha oficial no tiene el detalle de esta pieza.' : (MSG[err.kind] || MSG.server)(err)[0] + '.')}</p>`;
}
}
/* ---------- teclado y arranque ---------- */
registerKey({ key: 'g', label: 'Favorito: la ficha abierta (en Personaje)', run: toggleFav });
on('gamelang', () => { if (cur) { paintChar(); return; } if (last && parseSearch()) paintResults(); else if (!location.hash) paintHome(); });
route();   // sin autofoco: las teclas globales (1-5, /, M) tienen que andar al entrar; F lleva al buscador
