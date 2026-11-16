import {
$, esc, ico, norm, bind, fmtLeft, leftNext, store, profile, setProfile, serverList, serverName, SERVERS, SCHEDULE, FACCION,
PJ, TK, ROOT, toast, modal, announce, registerKey, lnaBlocked, LNA_MSG, $$, setTitle,
} from './core.js?v=6bb26aea23';
const DEF_API = 'https://mora-server.tail3b8ec1.ts.net:8443';
const API = (() => {
const v = String(new URLSearchParams(location.search).get('api') || store.get('hub-pj-api', '') || '').replace(/\/$/, '');
return /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(v) ? v : DEF_API;     // nunca un host ajeno desde un link
})();
const REC = 'hub-pj-recientes', FAV = 'hub-pj-favoritos', MIO = 'hub-pj-mio';
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
const IMG_OK = /^https:\/\/([a-z0-9-]+\.)*(playnccdn|plaync)\.com\//;
const img = (src, sz, cls = '') => IMG_OK.test(src || '')
? `<img class="${cls}" src="${esc(src)}" width="${sz}" height="${sz}" loading="lazy" decoding="async" alt="" referrerpolicy="no-referrer">`
: `<span class="${cls} noimg" aria-hidden="true"></span>`;
/* ---------- red ---------- */
class ApiError extends Error { constructor(kind, msg = '', extra = {}) { super(msg); Object.assign(this, { kind }, extra); } }
async function api(path, params) {
const ctl = new AbortController(), slow = setTimeout(() => ctl.abort(), 15000);
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
/* ---------- guardado: refs {k, r, s, n, id, c, l, f, i} ---------- */
const refs = key => store.get(key, []).filter(x => x && x.k);
const same = (a, b) => a.k.toLowerCase() === b.k.toLowerCase();
const isFav = ref => refs(FAV).some(x => same(x, ref));
const isMine = ref => { const m = store.get(MIO, null); return !!m?.k && same(m, ref); };
function remember(ref) {
store.set(REC, [ref, ...refs(REC).filter(x => !same(x, ref))].slice(0, 8));
if (isFav(ref)) store.set(FAV, refs(FAV).map(x => same(x, ref) ? ref : x));     // nivel y clase al día
if (isMine(ref)) store.set(MIO, ref);
}
const ids = new Map();                                   // k (minúsculas) → characterId, para no buscar de nuevo
for (const x of [...refs(REC), ...refs(FAV)]) if (x.id) ids.set(x.k.toLowerCase(), x.id);
function refOfResult(r, x) {
return { k: keyOf(r, x.serverId, x.name), r, s: x.serverId, n: x.name, id: x.characterId, c: x.class, l: x.level, f: fac(x.raceId), i: x.profileImage };
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
let req = 0, last = null, retry = null, cur = null;
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
let again = false;                                       // Enter en el buscador: buscar de nuevo aunque esté en caché
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
slow: () => ['El servidor tardó demasiado', 'PLAYNC está lento o saturado. Probá de nuevo en un rato.'],
limit: e => ['Muchas consultas seguidas', `El servidor limita las búsquedas para no saturar a PLAYNC. Probá de nuevo en ${e.wait} segundos.`],
server: e => ['PLAYNC no respondió bien', e.message || 'Probá de nuevo en un rato.'],
};
function paintError(e, nfMsg) {
out.setAttribute('aria-busy', 'false');
const [t, d] = e.kind === 'notfound' ? nfMsg : (MSG[e.kind] || MSG.server)(e);
out.innerHTML = `<div class="pj-msg${e.kind === 'notfound' ? '' : ' bad'}" role="alert" data-kind="${esc(e.kind || 'server')}"><h2>${esc(t)}</h2><p>${esc(d)}</p>
${e.kind === 'notfound' ? '' : `<button type="button" class="btn" id="pj-retry">${ico('i-reset')}Reintentar</button>`}</div>`;
announce(t);
}
out.addEventListener('click', e => {
if (e.target.closest('#pj-retry') && retry) retry();
else if (e.target.closest('#pj-clear')) { store.set(REC, []); paintHome(); }
});
/* ---------- búsqueda ---------- */
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
const card = (x, star = false) => `<li><a class="pj-card" href="${esc(hashOf(x.k))}">${img(x.i, 48, 'pj-pt')}
<span class="pj-cn"><b>${esc(x.n)}</b><small>${x.l ? `Nv ${x.l} · ` : ''}${esc(x.c || '')}</small></span>
<span class="pj-cs">${esc(serverName(x.s) || '')}<em class="tag fac-${x.f}">${FACCION[x.f] || ''}</em></span>${star ? ico('i-star-on', 'pj-cstar') : ''}</a></li>`;
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
const mio = store.get(MIO, null), favs = refs(FAV), rec = refs(REC);
out.innerHTML = `<div class="pj-home">
${mio?.k ? `<section aria-labelledby="pj-h-mio"><div class="pj-sh"><h2 id="pj-h-mio">Mi personaje</h2></div><ul class="pj-list">${card(mio)}</ul></section>` : ''}
<section aria-labelledby="pj-h-fav"><div class="pj-sh"><h2 id="pj-h-fav">Favoritos</h2></div>
${favs.length ? `<ul class="pj-list">${favs.map(x => card(x, true)).join('')}</ul>` : `<p class="pj-empty">Tocá ${ico('i-star')} en una ficha y queda acá, y en la búsqueda (<kbd>/</kbd>) desde cualquier sección.</p>`}</section>
<section aria-labelledby="pj-h-rec"><div class="pj-sh"><h2 id="pj-h-rec">Recientes</h2>${rec.length ? '<button type="button" class="linkbtn" id="pj-clear">Borrar recientes</button>' : ''}</div>
${rec.length ? `<ul class="pj-list">${rec.map(x => card(x)).join('')}</ul>` : '<p class="pj-empty">Las últimas 8 fichas que abras quedan acá.</p>'}</section>
<section aria-labelledby="pj-h-bl"><div class="pj-sh"><h2 id="pj-h-bl">Builds</h2></div>
<p class="pj-empty"><a href="#builds">Ver lo que usan los top y las builds recomendadas</a> por clase y tipo (PvE, PvP, Support), más las de la comunidad.</p></section>
${mio?.k ? '' : '<p class="pj-tip0">Escribí el nombre arriba y Enter. Busca en la región elegida; si hay homónimos, elegís por server. Con <b>Es mi personaje</b> la Bitácora queda en tu región, server y facción.</p>'}
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
setTitle();                                            // fuera de una ficha, el título de siempre
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
if (bl) {                                              // builds de la comunidad sin personaje: #builds[/<clase de questlog>]
req++; cur = null;
out.setAttribute('aria-busy', 'false');
out.innerHTML = '<div class="pj-x"></div>';
mod().then(m => { if (location.hash === bl[0]) m.view('builds', $('.pj-x', out), null, { cls: bl[1] || m.clsOf(store.get(MIO, null)?.c) }); });
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
cur = { ref, d };
if (hashOf(ref.k) !== location.hash) history.replaceState(null, '', hashOf(ref.k));
remember(ref);
paintChar();
if (fresh) toast(prev && prev.d.cachedAt === d.cachedAt ? 'PLAYNC todavía no deja refrescar esta ficha. Probá en unos minutos.' : `Ficha de <b>${esc(pr.name)}</b> actualizada.`);
else { scrollTo({ top: 0 }); announce(`Ficha de ${pr.name}`); }
} catch (e) {
if (seq !== req) return;
if (fresh && cur) { toast(esc((MSG[e.kind] || MSG.server)(e)[0]) + '. La ficha que ves es la de antes.'); return; }
paintError(e, [`No encontré a ${p.n} en ${where}`, 'Puede que haya cambiado de nombre o de server, o que el enlace tenga un error. Buscalo arriba.']);
}
}
/* ---------- ficha ---------- */
const SLOTS = [
['Armas y armadura', [[1, 'Arma'], [2, 'Secundaria'], [3, 'Casco'], [4, 'Hombreras'], [5, 'Pecho'], [6, 'Piernas'], [7, 'Guantes'], [8, 'Botas'], [19, 'Capa']]],
['Accesorios', [[10, 'Collar'], [11, 'Pendiente'], [12, 'Pendiente'], [13, 'Anillo'], [14, 'Anillo'], [15, 'Brazalete'], [16, 'Brazalete'], [17, 'Cinturón'], [22, 'Amuleto']]],
['Runas y arcanas', [[23, 'Runa'], [24, 'Runa'], [41, 'Arcana'], [42, 'Arcana'], [43, 'Arcana'], [44, 'Arcana'], [45, 'Arcana']]],
];
function equipHtml(eq) {
const by = new Map(eq.map(e => [e.slot, e])), known = new Set(SLOTS.flatMap(g => g[1].map(s => s[0])));
const groups = SLOTS.map(([t, l]) => [t, l.map(([s, lb]) => [s, lb, by.get(s)])]);
const extra = eq.filter(e => !known.has(e.slot)).map(e => [e.slot, e.slotName, e]);    // un slot nuevo de PLAYNC no se pierde
if (extra.length) groups[2][1].push(...extra);
return groups.map(([t, l]) => `<h3 class="pj-h3">${t}</h3><ul class="eq-g">${l.map(([s, lb, e]) => !e
? `<li class="eq empty"><span class="eq-i"></span><span class="eq-t"><small>${esc(lb)}</small><span class="eq-n">Vacío</span></span></li>`
: `<li><button type="button" class="eq ${gcls(e.grade)}" data-slot="${s}" aria-haspopup="dialog"><span class="eq-i">${img(e.icon, 40)}${e.enchant ? `<b class="eq-en">+${e.enchant}</b>` : ''}</span>
<span class="eq-t"><small>${esc(lb)} · <span class="eq-gr">${esc(GRADE[e.grade] || e.grade || '')}</span>${e.exceed ? ` · <span class="eq-x">exceed ${e.exceed}</span>` : ''}</small><span class="eq-n">${esc(e.name)}</span></span></button></li>`).join('')}</ul>`).join('');
}
const CAT = [['Active', 'Activas', 'en barra'], ['Passive', 'Pasivas', ''], ['Dp', 'Estigmas', 'equipadas']];
function skillsHtml(sk) {
return CAT.map(([c, t, eqt]) => {
const l = sk.filter(s => s.category === c), dimmable = c !== 'Passive';         // las pasivas no se equipan: equipped viene siempre false
if (!l.length) return '';
const on = l.filter(s => s.equipped).length;
const sorted = dimmable ? [...l.filter(s => s.equipped), ...l.filter(s => !s.equipped)] : l;
return `<h3 class="pj-h3">${t} <small>${dimmable ? `${on} ${eqt} de ${l.length}` : l.length}</small></h3><ul class="sk-g">${sorted.map(s => {
const off = dimmable && !s.equipped, lv = c === 'Dp' && !s.level ? (s.acquired ? 'base' : '—') : `Nv ${s.level}`;
return `<li class="sk${off ? ' off' : ''}"${off ? ' title="Sin equipar"' : ''}><span>${esc(s.name)}${s.acquired ? '' : '<em class="tag">no adquirida</em>'}${off ? '<span class="sr"> (sin equipar)</span>' : ''}</span><b>${lv}</b></li>`;
}).join('')}</ul>`;
}).join('') + '<p class="pj-note">Atenuadas: sin equipar. Una estigma <b>base</b> es una que tenés sin subir de nivel: se usa igual.</p>';
}
function statsHtml(st) {
const row = s => {
const [, nm, god] = String(s.name).match(/^(.*?)\s*(?:\[(.+)\])?$/) || [, s.name];
return `<li><span class="st-n">${esc(nm)}${god ? ` <small>${esc(god)}</small>` : ''}</span><b>${nf(s.value)}</b>${s.effects?.length ? `<small class="st-e">${esc(s.effects.join(' · '))}</small>` : ''}</li>`;
};
const main = st.filter(s => !/\[/.test(s.name)), div = st.filter(s => /\[/.test(s.name));
return `<h3 class="pj-h3">Principales</h3><ul class="st-g">${main.map(row).join('')}</ul>${div.length ? `<h3 class="pj-h3">Divinos</h3><ul class="st-g">${div.map(row).join('')}</ul>` : ''}`;
}
function paintChar() {
const { ref, d } = cur, p = d.profile, fav = isFav(ref);
const kisk = `https://kisk.app/c/${ref.r}/${slug(serverName(ref.s))}/${encodeURIComponent(ref.n.toLowerCase())}/gear`;
const t = d.titles || {};
out.setAttribute('aria-busy', 'false');
setTitle(`${p.name} · Personaje · Bitácora Daeva`);
out.innerHTML = `<article class="pj-f" aria-labelledby="pj-nm">
<header class="pj-hd card">
${img(p.image, 96, 'pj-pt pj-pt-l')}
<div class="pj-hm">
<ul class="pj-chips" aria-label="Datos"><li class="fac-${ref.f}">${FACCION[ref.f]}</li><li>Nv ${p.level} ${esc(p.class)}</li><li>${esc(p.server || serverName(ref.s))}</li>${p.legion ? `<li>Legión ${esc(p.legion)}</li>` : ''}</ul>
<h2 id="pj-nm" class="pj-nm">${esc(p.name)}</h2>
${p.title ? `<p class="pj-tt ${gcls(p.title.grade)}" title="Título equipado">«${esc(p.title.name)}»</p>` : '<p class="pj-tt">Sin título</p>'}
</div>
<dl class="pj-big">
<div><dt>CP</dt><dd>${nf(p.combatPower)}</dd></div>
<div><dt>iLvl</dt><dd title="El iLvl de PLAYNC suma bonos pegados al equipo; puede diferir un poco del juego">${nf(p.itemLevel)}</dd></div>
<div><dt>Títulos</dt><dd title="Obtenidos de ${nf(t.total)}">${nf(t.owned)}<small>/${nf(t.total)}</small></dd></div>
</dl>
<div class="pj-acts">
<button type="button" class="iconbtn" id="pj-fav" aria-pressed="${fav}" aria-label="Favorito" title="Favorito (G)">${ico(fav ? 'i-star-on' : 'i-star')}</button>
${mioBtn(ref)}
<span id="pj-tk-slot">${tkBtn(ref)}</span>
</div>
<p class="pj-upd"><span id="pj-ago" class="cd"></span><button type="button" class="linkbtn" id="pj-ref"></button><a href="${esc(kisk)}" target="_blank" rel="noopener noreferrer">Ver puntaje en kisk${ico('i-ext')}</a></p>
</header>
<nav class="seg pj-tabs" aria-label="Vistas de la ficha">${[['ficha', 'Ficha'], ['builds', 'Builds'], ['comparar', 'Comparar con build'], ['calidad', 'Calidad del equipo']].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${k === 'ficha'}">${l}</button>`).join('')}</nav>
<div class="pj-x" id="pj-x" hidden></div>
<div class="pj-grid" id="pj-grid">
<section class="card pj-sec pj-eq" aria-labelledby="pj-h-eq"><h2 id="pj-h-eq">Equipo <small>Tocá una pieza para ver sus stats</small></h2>${equipHtml(d.equipment || [])}</section>
<div class="pj-side">
<section class="card pj-sec" aria-labelledby="pj-h-dae"><h2 id="pj-h-dae">Daevanion <small>Tocá un tablero</small></h2>
<ul class="dae-l">${(d.daevanion || []).map((b, i) => `<li><button type="button" class="dae-b" data-board="${i}"><span class="dae-n">${esc(b.name)}</span><span class="dae-c">${b.open}/${b.total}</span><span class="bar" aria-hidden="true"><i style="--w:${Math.min(100, +b.percent || 0)}%"></i></span><span class="dae-p">${b.percent}%</span></button></li>`).join('') || '<li class="pj-empty">Sin datos de Daevanion.</li>'}</ul></section>
<section class="card pj-sec" aria-labelledby="pj-h-pw"><h2 id="pj-h-pw">Pet y alas</h2><ul class="pw">
${d.pet ? `<li>${img(d.pet.icon, 44)}<span><small>Pet</small><b>${esc(d.pet.name)}</b> <span class="pw-x">Nv ${d.pet.level}</span></span></li>` : '<li class="pj-empty">Sin pet equipada.</li>'}
${d.wings ? `<li>${img(d.wings.icon, 44)}<span><small>Alas</small><b class="${gcls(d.wings.grade)}">${esc(d.wings.name)}</b>${d.wings.enchant ? ` <span class="pw-x">+${d.wings.enchant}</span>` : ''}${d.wingSkin ? `<small>Apariencia: ${esc(d.wingSkin.name)}</small>` : ''}</span></li>` : '<li class="pj-empty">Sin alas.</li>'}
</ul></section>
<section class="card pj-sec" aria-labelledby="pj-h-ti"><h2 id="pj-h-ti">Títulos equipados <small>obtenidos: ${nf(t.owned)} de ${nf(t.total)}</small></h2><ul class="ti">
${(t.equipped || []).map(x => `<li><b class="${gcls(x.grade)}">${esc(x.name)}</b>${x.effects?.length ? `<small>${esc(x.effects.join(' · '))}</small>` : ''}</li>`).join('') || '<li class="pj-empty">Ninguno.</li>'}
</ul></section>
</div>
<section class="card pj-sec pj-sk" aria-labelledby="pj-h-sk"><h2 id="pj-h-sk">Skills y estigmas</h2>${skillsHtml(d.skills || [])}</section>
<section class="card pj-sec pj-st" aria-labelledby="pj-h-st"><h2 id="pj-h-st">Stats</h2>${statsHtml(d.stats || [])}</section>
</div>
<p class="pj-src">Datos públicos de PLAYNC/NCSOFT a través del servidor de la Bitácora (guarda cada ficha 30 min). Sitio de fans, no afiliado.</p>
</article>`;
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
const mioBtn = ref => { const mine = isMine(ref); return `<button type="button" class="btn${mine ? '' : ' gold'}" id="pj-mio" aria-pressed="${mine}" title="Fija región, server y facción de toda la Bitácora">${mine ? ico('i-check') + 'Es tu personaje' : 'Es mi personaje'}</button>`; };
const tkBtn = ref => PJ.get().list.some(x => x.name.toLowerCase() === ref.n.toLowerCase() && (x.server ?? null) === ref.s)
? `<a class="btn ghost" href="${ROOT}tareas/">${ico('i-check')}En Tareas</a>`
: `<button type="button" class="btn ghost" id="pj-tk">${ico('i-plus')}Sumar a Tareas</button>`;
function addToTareas(ref) {
const p = PJ.get(), wasEmpty = !p.list.length, n = { id: 'c' + Math.random().toString(36).slice(2, 9), name: ref.n, server: ref.s, clase: ref.c || null };
p.list.push(n);
if (wasEmpty) {
const t = TK.get();
if (t.done.main) { t.done = { ...t.done, [n.id]: t.done.main }; delete t.done.main; TK.set(t); }
}
p.activo = n.id;
PJ.set(p);
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
out.addEventListener('click', e => {
if (!cur) return;
const { ref, d } = cur;
if (e.target.closest('#pj-fav')) toggleFav();
else if (e.target.closest('#pj-mio')) {
if (isMine(ref)) { store.set(MIO, null); $('#pj-mio').outerHTML = mioBtn(ref); $('#pj-mio').focus(); toast('Ya no está marcado como tu personaje. Región, server y facción quedan como están.'); return; }
const before = profile(), mioBefore = store.get(MIO, null);
setProfile({ region: ref.r, server: ref.s, faccion: ref.f });
store.set(MIO, ref);
$('#pj-mio').outerHTML = mioBtn(ref);
toast(`Listo: la Bitácora quedó en <b>${esc(regName(ref.r))} · ${esc(serverName(ref.s))} · ${FACCION[ref.f]}</b>.`, { ms: 8000, action: { label: 'Deshacer', run: () => {
setProfile(before);
store.set(MIO, mioBefore);
if ($('#pj-mio') && cur) $('#pj-mio').outerHTML = mioBtn(cur.ref);
toast('Volví a tu región, server y facción de antes.');
} } });
$('#pj-mio')?.focus();
} else if (e.target.closest('#pj-tk')) {
addToTareas(ref);
$('#pj-tk-slot').innerHTML = tkBtn(ref);
toast(`Sumé a <b>${esc(ref.n)}</b> a Tareas.`, { action: { label: 'Ir a Tareas', run: () => { location.href = ROOT + 'tareas/'; } } });
} else if (e.target.closest('#pj-ref')) openChar({ r: ref.r, s: ref.s, n: ref.n }, true);
else if (e.target.closest('[data-slot]')) showItem(e.target.closest('[data-slot]'));
else if (e.target.closest('[data-board]')) showBoard(d.daevanion[+e.target.closest('[data-board]').dataset.board]);
else if (e.target.closest('[data-tab]')) tab(e.target.closest('[data-tab]').dataset.tab);
});
/* ---------- builds, comparar y calidad (lazy: personaje-builds.js) ---------- */
const VQ = new URL(import.meta.url).search;              // ?v=<hash>: el módulo lazy va con la misma versión
let modP = null;
const mod = () => modP ||= import('./personaje-builds.js' + VQ).then(m => { m.init({ api, MSG, img, gcls, GRADE, nf, tab }); return m; }, e => { modP = null; throw e; });
async function tab(t, opt) {
if (!cur || !$('#pj-x')) return;
for (const b of $$('.pj-tabs button')) b.setAttribute('aria-pressed', String(b.dataset.tab === t));
const x = $('#pj-x'), c = cur;
$('#pj-grid').hidden = t !== 'ficha';
x.hidden = t === 'ficha';
if (t === 'ficha') return;
x.innerHTML = '<p class="pj-load"><span class="pj-spin" aria-hidden="true"></span>Cargando…</p>';
try { const m = await mod(); if (cur === c && !x.hidden) m.view(t, x, c, opt); }
catch { x.innerHTML = '<p class="tip-err">No pude cargar esta vista. Revisá la conexión y recargá la página.</p>'; }
}
/* ---------- tooltip de ítem (lazy, /api/item) ---------- */
const tip = Object.assign(document.createElement('div'), { id: 'pj-tip', className: 'pj-tip', tabIndex: -1 });
tip.setAttribute('popover', 'auto');
tip.setAttribute('role', 'dialog');
tip.setAttribute('aria-label', 'Detalle de la pieza');
document.body.append(tip);
const itemCache = new Map();
let tipFrom = null, tipClosed = 0;
tip.addEventListener('toggle', e => { if (e.newState === 'closed') tipClosed = Date.now(); });   // el foco vuelve solo a la pieza (lo hace el popover)
async function showItem(btn) {
const { ref, d } = cur, e = d.equipment.find(x => x.slot === +btn.dataset.slot);
if (!e) return;
if (tipFrom === btn && Date.now() - tipClosed < 300) return;          // el clic que lo cerró (light dismiss) no lo reabre
const q = { id: ref.id, server: ref.s, region: ref.r, itemId: e.id, enchantLevel: e.enchant || 0, exceedLevel: e.exceed || 0, slotPos: e.slot };
const key = new URLSearchParams(q).toString();
tipFrom = btn;
tip.dataset.k = key;
tip.className = 'pj-tip ' + gcls(e.grade);
tip.innerHTML = `<div class="tip-h">${img(e.icon, 48)}<div><b class="tip-n">${esc(e.name)}${e.enchant ? ` +${e.enchant}` : ''}</b><small>${esc(GRADE[e.grade] || e.grade || '')}${e.exceed ? ` · exceed ${e.exceed}` : ''}</small></div>
<button type="button" class="iconbtn tip-x" aria-label="Cerrar">${ico('i-x')}</button></div><div class="tip-b"><p class="pj-load"><span class="pj-spin" aria-hidden="true"></span>Cargando stats…</p></div>`;
$('.tip-x', tip).onclick = () => tip.hidePopover();
if (!matchMedia('(max-width:640px)').matches) {
const r = btn.getBoundingClientRect(), W = 340, H = Math.min(innerHeight * 0.7, 520);
tip.style.left = Math.max(8, Math.min(r.left, innerWidth - W - 8)) + 'px';
tip.style.top = Math.max(8, Math.min(r.bottom + 6, innerHeight - H - 8)) + 'px';
} else tip.style.left = tip.style.top = '';
if (!tip.matches(':popover-open')) tip.showPopover();
tip.focus();
try {
const it = itemCache.get(key) || await api('/api/item', q);
itemCache.set(key, it);
if (tip.dataset.k === key) $('.tip-b', tip).innerHTML = itemBody(it);
} catch (err) {
if (tip.dataset.k !== key) return;
$('.tip-b', tip).innerHTML = `<p class="tip-err">${esc(err.kind === 'notfound' ? 'PLAYNC no tiene el detalle de esta pieza.' : (MSG[err.kind] || MSG.server)(err)[0] + '.')}</p>`;
}
}
function itemBody(it) {
const li = (n, v, cls = '') => `<li class="${cls}"><span>${esc(n)}</span><b>${v}</b></li>`;
const sec = (t, l) => l ? `<h4>${t}</h4><ul>${l}</ul>` : '';
const main = (it.mainStats || []).map(s => li(s.name, `${s.minValue ? esc(s.minValue) + '–' : ''}${esc(s.value)}${+s.extra ? ` <em>+${esc(s.extra)}</em>` : ''}`, s.exceed ? 'ex' : '')).join('');
return `<p class="tip-m">${[it.gradeName, it.categoryName, it.level && `Nv ${it.level}`].filter(Boolean).map(esc).join(' · ')}</p>
${sec('Stats', main)}${sec('Atributos', (it.subStats || []).map(s => li(s.name, esc(s.value))).join(''))}
${sec('Piedras de maná', (it.magicStoneStat || []).map(s => li(s.name, esc(s.value), gcls(s.grade))).join(''))}
${(it.godStoneStat || []).map(g => `<h4>Piedra divina</h4><p class="tip-gs ${gcls(g.grade)}"><b>${esc(g.name)}</b>${esc(g.desc || '')}</p>`).join('')}`;
}
/* ---------- tablero Daevanion (lazy, /api/daevanion con el boardId de la clase del personaje) ---------- */
const boardCache = new Map();
async function showBoard(b) {
if (!b) return;
const { ref } = cur, key = `${ref.k}|${b.id}`;
const box = document.createElement('div');
box.className = 'dae';
box.innerHTML = `<p class="dae-s">${b.open} de ${b.total} nodos abiertos (${b.percent}%)</p><div class="dae-g" aria-hidden="true"></div><div class="dae-t"><p class="pj-load"><span class="pj-spin" aria-hidden="true"></span>Cargando nodos…</p></div>`;
modal({ title: `Tablero de ${b.name}`, node: box, cls: 'pj-dae' });
try {
const t = boardCache.get(key) || await api('/api/daevanion', { id: ref.id, server: ref.s, region: ref.r, board: b.id });
boardCache.set(key, t);
const nodes = (t.nodeList || []).filter(n => n.type !== 'None'), rows = nodes.map(n => n.row), cols = nodes.map(n => n.col);
const r0 = Math.min(...rows, 1e3) - 1, c0 = Math.min(...cols, 1e3) - 1, R = Math.max(1, ...rows) - r0, C = Math.max(1, ...cols) - c0;   // sin filas vacías alrededor
const g = $('.dae-g', box);
g.style.setProperty('--c', C);
g.style.setProperty('--r', R);
g.innerHTML = nodes.map(n => `<i class="dn t-${n.type.toLowerCase()} ${gcls(n.grade)}${n.open ? ' o' : ''}" style="grid-area:${n.row - r0}/${n.col - c0}" title="${esc(n.name)}${n.effectList?.[0]?.desc ? ': ' + esc(n.effectList.map(x => x.desc).join(', ')) : ''}"></i>`).join('');
const skill = nodes.filter(n => n.type === 'SkillLevel'), shut = skill.filter(n => !n.open);
const ul = l => `<ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
$('.dae-t', box).innerHTML = `${t.openSkillEffectList?.length ? `<h4>Skills que suma</h4>${ul(t.openSkillEffectList.map(x => x.desc))}` : ''}
${t.openStatEffectList?.length ? `<h4>Stats que suma</h4>${ul(t.openStatEffectList.map(x => x.desc))}` : ''}
${skill.length ? `<h4>Nodos de skill sin abrir <small>${shut.length} de ${skill.length}</small></h4>${shut.length ? ul(shut.map(n => n.effectList?.map(x => x.desc).join(', ') || n.name)) : '<p>Ninguno: están todos abiertos.</p>'}` : ''}
<p class="pj-note">En el dibujo: relleno = abierto (con el color del grado), rombo = nodo de skill, círculo = inicio. Con mouse, pasá por un nodo para ver qué da.</p>`;
} catch (err) {
$('.dae-t', box).innerHTML = `<p class="tip-err">${esc((MSG[err.kind] || MSG.server)(err)[0])}.</p>`;
}
}
/* ---------- teclado y arranque ---------- */
registerKey({ key: 'g', label: 'Favorito: la ficha abierta (en Personaje)', run: toggleFav });
route();   // sin autofoco: las teclas globales (1-5, /, M) tienen que andar al entrar; F lleva al buscador
