import {
$, $$, esc, ico, norm, bind, fmtLeft, leftNext, store, profile, setProfile, serverList, serverName, SERVERS, SCHEDULE, FACCION,
PJ, TK, ROOT, toast, modal, announce, registerKey, lnaBlocked, LNA_MSG, setTitle, myChars, gname, galt, gclass, gameLang, on,
} from './core.js?v=db50fa3fb7';
import { gateOf, ilvlOf, skillParts, skillHint, kindGuess, plan, stations, useful, topLevels, NODE_COST, NORMAL_CAP, BASE_CAP, STIG_CAP, isArcana } from './personaje-calc.js?v=db50fa3fb7';
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
/* ---------- «¿Qué es?»: una línea por término del juego, en un popover (top layer: no mueve nada) ---------- */
const GL = {
il: ['Nivel de objeto', 'La suma de todo lo que llevás: el nivel de cada pieza y sus mejoras, las Arcanas y los nodos de Daevanion. Es lo que mira el juego para dejarte entrar a cada mazmorra.'],
cp: ['Poder de combate', 'Un número general de fuerza que calcula el juego con tus stats. Sirve para compararte con otros; para entrar a una mazmorra manda el nivel de objeto.'],
build: ['Build', 'Cómo armás el personaje según lo que hacés: Estándar para pegar en mazmorras, Healer para curar al grupo o PvP para pelear contra jugadores. Cambia los pasos, los nodos marcados y lo que te mostramos de los mejores.'],
equipo: ['Equipo', 'Qué tan buenas son tus piezas, por su nivel base. El mejor equipo de hoy llega a 102. Para subirlo hay que conseguir piezas mejores.'],
enc: ['Encantamiento', 'El «+» de cada pieza (+10, +15). Cada nivel suma nivel de objeto y stats a la pieza. Cada pieza tiene su tope.'],
amp: ['Amplificación', 'Una mejora extra de cada pieza, de +1 a +5, con piedras de amplificación. Cada nivel suma 5 de nivel de objeto; en el arma y los accesorios también suma daño, en la armadura solo defensa.'],
arc: ['Arcanas', 'Cinco cartas (Cáliz, Pergamino, Brújula, Campana y Espejo) que suben niveles de tus skills. Se encantan hasta +5 y cada nivel suma +1 a una de sus skills.'],
dae: ['Daevanion', 'Tableros de nodos que abrís con cristales de Daevanion: salen de subir de nivel y de las mazmorras selladas. Cada nodo da stats o +1 a una skill. Los 4 primeros son los tableros base.'],
spec: ['Especialización', 'Cuando una skill activa llega a 8, 12 y 16, se abre una mejora nueva que elegís en la ventana de skills. Es el salto más grande que da subir una skill.'],
pts: ['Puntos de skill', 'Cada skill sube hasta 10 con puntos de skill. La ficha oficial no muestra cuántos te quedan sin usar.'],
skills: ['Nivel de skill', 'Se arma con puntos (hasta 10), nodos de Daevanion (hasta +4) y líneas de skill del equipo y de las Arcanas. 14 es el tope normal; de ahí para arriba, solo con líneas.'],
gs: ['Piedra sagrada', 'Theostone: va una en el arma y otra en la secundaria. Al atacar tiene chance de aplicar su efecto (sellado, parálisis, daño extra). Dos con el mismo efecto aplican uno solo.'],
stig: ['Estigmas', 'Skills especiales que van en 4 espacios aparte. Suben solo con Fragmentos de Estigma, hasta 20.'],
ariel: ['Ariel', 'El quinto tablero de Daevanion: da daño contra jefes. Sus nodos se abren con Fragmentos de Ariel de Expedición difícil (100 fragmentos = 1 cristal, hasta 30 por personaje).'],
lineas: ['Líneas', 'Los stats extra de cada pieza, que salen al azar. Los mejores buscan ciertas líneas en cada pieza. En Equipo, tocá una pieza para ver qué tan alto te salió cada una.'],
};
const STEP_GL = { 'amp-arma': 'amp', 'amp-acc': 'amp', 'amp-arm': 'amp', enc: 'enc', arc: 'arc', dae: 'dae', pts: 'pts', ariel: 'ariel' };
const gl = k => GL[k] ? `<button type="button" class="gl" data-que="${k}" aria-label="¿Qué es ${esc(GL[k][0].toLowerCase())}?" aria-expanded="false" aria-controls="pj-gl"></button>` : '';
const glTip = Object.assign(document.createElement('div'), { id: 'pj-gl', className: 'pj-gl' });
glTip.setAttribute('popover', 'auto');
document.body.append(glTip);
let glFrom = null, glClosed = 0;
glTip.addEventListener('toggle', e => { if (e.newState === 'closed') { glClosed = Date.now(); glFrom?.setAttribute('aria-expanded', 'false'); } });
function showGl(btn) {
if (glFrom === btn && Date.now() - glClosed < 300) return;          // el toque que lo cerró (light dismiss) no lo reabre
const [t, d] = GL[btn.dataset.que];
glFrom = btn;
glTip.innerHTML = `<b>${esc(t)}</b><p>${esc(d)}</p>`;
if (!glTip.matches(':popover-open')) glTip.showPopover();
const r = btn.getBoundingClientRect(), W = Math.min(320, innerWidth - 16), H = glTip.offsetHeight;
glTip.style.width = W + 'px';
glTip.style.left = Math.max(8, Math.min(r.left + r.width / 2 - W / 2, innerWidth - W - 8)) + 'px';
glTip.style.top = (r.bottom + 4 + H > innerHeight - 8 ? Math.max(8, r.top - H - 4) : r.bottom + 4) + 'px';
btn.setAttribute('aria-expanded', 'true');
announce(`${t}: ${d}`);
}
addEventListener('click', e => { const b = e.target.closest?.('[data-que]'); if (b) showGl(b); });
addEventListener('scroll', () => { if (glTip.matches(':popover-open')) glTip.hidePopover(); }, { passive: true });
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
const quick = (path, params) => fetch(API + path + '?' + new URLSearchParams(params), { cache: 'force-cache', signal: AbortSignal.timeout(300) })
.then(r => r.ok ? r.json() : null).catch(() => null);
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
document.documentElement.classList.remove('pj-char');
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
const HOW = [['title_icon_attack', 'Cómo está', 'Tu nivel de objeto y a qué mazmorras te deja entrar'], ['Icon_Item_Enchant_Amplify_A_001', 'Qué hacer ahora', 'Las mejoras que más rinden, en orden'], ['board_icon_legend_open', 'Qué usan los mejores', 'Estigmas, Arcanas y equipo de los top de tu clase']];
function paintHome() {
out.setAttribute('aria-busy', 'false');
const mine = myChars(), favs = refs(FAV).filter(x => !mine.some(m => same(m.pj, x))), rec = refs(REC).filter(x => !mine.some(m => same(m.pj, x)));
out.innerHTML = `<div class="pj-home">
${mine.length ? '' : `<ol class="pj-how" aria-label="Qué vas a ver">${HOW.map(([ic, t, d]) => `<li>${icoGame(ic, 44)}<span><b>${t}</b><small>${d}</small></span></li>`).join('')}</ol>`}
<section aria-labelledby="pj-h-mio"><div class="pj-sh"><h2 id="pj-h-mio">Mis personajes</h2></div>
${mine.length ? `<ul class="pj-list pj-mios">${mine.map(c => card(c.pj, c.main ? '<em class="tag gold">principal</em>' : '')).join('')}</ul>`
: '<p class="pj-empty">Buscá tu personaje arriba y tocá <b>Es mi personaje</b>: queda acá y en Tareas. Podés sumar todos los que juegues.</p>'}</section>
${favs.length ? `<section aria-labelledby="pj-h-fav"><div class="pj-sh"><h2 id="pj-h-fav">Favoritos</h2></div><ul class="pj-list">${favs.map(x => card(x)).join('')}</ul></section>` : ''}
${rec.length ? `<section aria-labelledby="pj-h-rec"><div class="pj-sh"><h2 id="pj-h-rec">Recientes</h2><button type="button" class="linkbtn" id="pj-clear">Borrar recientes</button></div>
<ul class="pj-list">${rec.map(x => card(x)).join('')}</ul></section>` : ''}
<section class="pj-tobl" aria-labelledby="pj-h-top"><div class="pj-sh"><h2 id="pj-h-top">Qué usan los mejores</h2><span>equipo, estigmas y builds de cada clase</span></div>
<ul class="pj-cls">${Object.entries(CLS_FILE).map(([es, en]) => `<li><a href="#builds/${en.toLowerCase()}">${icoGame('UT_Class_' + en + '_Large', 32)}<span>${esc(gclass(es))}</span></a></li>`).join('')}</ul></section>
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
if (glTip.matches(':popover-open')) glTip.hidePopover();
document.documentElement.classList.toggle('pj-char', !!parseHash());   // en una ficha: sin título ni buscador (vuelve con «Personajes» o F)
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
const seq = ++req, k = keyOf(p.r, p.s, p.n), where = `${serverName(p.s)} (${regName(p.r)})`, known = ids.get(k.toLowerCase());
retry = () => openChar(p, fresh);
if (!fresh) busy(true, `Abriendo a <b>${esc(p.n)}</b> en ${esc(where)}…`);
else { const rb = $('#pj-ref'); rb.disabled = true; rb.textContent = 'Refrescando…'; }
const early = !fresh && known ? quick('/api/character', { id: known, server: p.s, region: p.r }) : null;
const net = (async () => {
let id = known, d;
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
return [d, id];
})();
net.catch(() => {});
const prev = cur;
let shown = null;
const show = (d, id) => {
const pr = d.profile, ref = { k: keyOf(p.r, p.s, pr.name), r: p.r, s: p.s, n: pr.name, id, c: pr.class, l: pr.level, f: fac(pr.raceId), i: pr.image };
ids.set(ref.k.toLowerCase(), id);
const was = cur;
cur = { ref, d, x: was && same(was.ref, ref) && was.d.cachedAt === d.cachedAt ? was.x : null };
if (hashOf(ref.k) !== location.hash) history.replaceState(null, '', hashOf(ref.k));
remember(ref);
paintChar();
loadDetail(cur);
loadCurated(cur);
if (!shown && !fresh) { scrollTo({ top: 0 }); announce(`Ficha de ${pr.name}`); }
shown = d;
};
try {
const hit = early && await early;
if (hit?.profile && seq === req) show(hit, known);
const [d, id] = await net;
if (seq !== req) return;
if (!shown || d.cachedAt !== shown.cachedAt) show(d, id);
if (fresh) toast(prev && prev.d.cachedAt === d.cachedAt ? 'La ficha oficial todavía no deja refrescar este personaje. Probá en unos minutos.' : `Ficha de <b>${esc(d.profile.name)}</b> actualizada.`);
} catch (e) {
if (seq !== req) return;
if ((fresh || shown) && cur) { toast(esc((MSG[e.kind] || MSG.server)(e)[0]) + '. La ficha que ves es la de antes.'); return; }
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
const hit = await quick('/api/sheet', q);                // guardado y del mismo momento que la ficha: sirve tal cual
if (hit?.cachedAt === c.d.cachedAt) x = hit;
else try { x = await api('/api/sheet', q, 60000); } catch (e) {
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
if (cur === c) { paintBuild(); markIl(); paintPanel(); }
}
let CUR = new Map();
async function loadCurated(c) {
const cls = CLS_KEY[c.d.profile.class];
if (!cls || CUR.has(cls)) return;
CUR.set(cls, null);
const paint = () => { if (cur === c) { paintBuild(); if (TAB === 'daevanion') paintPanel(); } };
const hit = quick('/api/curated', { class: cls }), net = api('/api/curated', { class: cls });   // lo guardado ya; la de ahora (ETag) si cambió
net.catch(() => {});
const h = await hit;
if (h) { CUR.set(cls, h); paint(); }
let v; try { v = await net; } catch { if (!h) CUR.delete(cls); return; }
if (h && JSON.stringify(v) === JSON.stringify(h)) return;
CUR.set(cls, v); paint();
}
const curated = c => CUR.get(CLS_KEY[c.d.profile.class]) || null;
const topSkills = (c, k) => topLevels(curated(c)?.top, k);
/* ---------- build que sigue (Estándar / Healer / PvP), guardada por personaje ---------- */
const kindStored = ref => store.get(BLD, {})[ref.k.toLowerCase()] || null;
const okKind = (c, k) => kindsOf(c).some(([v]) => v === k) ? k : null;
const kindOf = c => okKind(c, kindStored(c.ref)) || guess(c).kind;
const guess = c => { const g = kindGuess(c.d, c.x?.items, curated(c)?.method?.kindSets); return okKind(c, g.kind) ? g : { kind: 'pve', sig: [] }; };
function paintBuild() {
const box = $('#pj-bld');
if (!box || !cur) return;
const g = guess(cur), k = kindOf(cur), st = okKind(cur, kindStored(cur.ref));
box.innerHTML = `<span class="pj-bl-l"><span id="pj-bl-l">Build</span>${gl('build')}</span>
<div class="seg" role="group" aria-labelledby="pj-bl-l">${kindsOf(cur).map(([v, l]) => `<button type="button" data-kind="${v}" aria-pressed="${v === k}">${l}${v === g.kind ? ' <small>sugerida</small>' : ''}</button>`).join('')}</div>
<small class="pj-bl-why"${g.sig.length && !st ? ` title="${esc(g.sig.join(', '))}"` : ''}>${st ? 'La elegiste vos.' : 'Sugerida por lo que tenés puesto.'}</small>`;
}
/* ---------- ficha ---------- */
function paintChar() {
const { ref, d } = cur, p = d.profile, fav = isFav(ref), mine = mineOf(ref), all = myChars();
out.setAttribute('aria-busy', 'false');
setTitle(`${p.name} · Personaje · Bitácora Daeva`);
out.innerHTML = `<article class="pj-f" aria-labelledby="pj-nm">
<div class="pj-top"><a class="pj-back" href="#" title="Volver al buscador (F)">${ico('i-r')}Personajes</a>
${all.length ? `<nav class="pj-mine" aria-label="Mis personajes"><span>Mis personajes</span><ul>${all.map(c => `<li><a href="${esc(hashOf(c.pj.k))}"${same(c.pj, ref) ? ' aria-current="page"' : ''}>${clsIco(c.pj.c, 18)}${esc(c.pj.n)}${c.main ? `<span class="sr"> (principal)</span>${ico('i-star-on', 'pj-mst')}` : ''}</a></li>`).join('')}</ul></nav>` : ''}</div>
<header class="pj-hd">
${img(p.image, 72, 'pj-pt pj-pt-l', '')}
<div class="pj-hm">
<h2 id="pj-nm" class="pj-nm">${esc(p.name)}</h2>
<p class="pj-meta">${clsIco(p.class)}<span>${esc(gclass(p.class))} · Nv ${p.level}</span><span>${esc(p.server || serverName(ref.s))}</span><span class="fac-${ref.f}">${FACCION[ref.f]}</span>${p.legion ? `<span>Legión ${esc(p.legion)}</span>` : ''}</p>
</div>
<dl class="pj-big"><div><dt>Poder de combate${gl('cp')}</dt><dd>${nf(p.combatPower)}</dd></div><div><dt>Nivel de objeto${gl('il')}</dt><dd id="pj-il">${nf(p.itemLevel)}</dd></div></dl>
<div class="pj-acts">
<button type="button" class="iconbtn" id="pj-fav" aria-pressed="${fav}" aria-label="Favorito" title="Favorito (G)">${ico(fav ? 'i-star-on' : 'i-star')}</button>
<span id="pj-mio-slot">${mioBtn(ref)}</span>
</div>
<p class="pj-upd"><span id="pj-ago" class="cd"></span> · <button type="button" class="linkbtn" id="pj-ref"></button>${mine && !mine.main ? ' · <button type="button" class="linkbtn" id="pj-main">Usar como principal</button>' : ''}</p>
</header>
<div class="pj-bld" id="pj-bld"></div>
<nav class="seg pj-tabs" aria-label="Vistas de la ficha">${[['pasos', 'Próximos pasos'], ['equipo', 'Equipo'], ['skills', 'Skills'], ['daevanion', 'Daevanion'], ['logros', 'Logros'], ['builds', 'Builds']].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${k === TAB}">${l}</button>`).join('')}</nav>
<div class="pj-x" id="pj-x"></div>
<p class="pj-src">Datos públicos de la ficha oficial del juego, a través del servidor de la Bitácora (guarda cada ficha 30 min). Sitio de fans, no afiliado. <button type="button" class="linkbtn" data-hub="credits">Fuentes y créditos</button></p>
</article>`;
paintBuild();
markIl();
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
function markIl() {
const n = $('#pj-il');
if (!n || !cur?.x) return;
const t = ilvlOf(cur.d, cur.x.items, cur.x.boards).total, il = cur.d.profile.itemLevel || 0;
n.dataset.ilCalc = t;
n.title = t === il ? '' : `La cuenta pieza por pieza da ${nf(t)}: puede faltar una pieza o un tablero. Los pasos usan el oficial.`;
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
return `<div class="pj-wait" role="status"><span class="pj-spin" aria-hidden="true"></span>${t}</div>${TAB === 'pasos' ? '<div class="st-w st-sk"><div class="wh"></div><ol class="st-l st-m">' + '<li class="st"></li>'.repeat(5) + '</ol></div>' : ''}`;
}
/* ---------- próximos pasos: dónde estás, qué hacer y cómo vas ---------- */
const gameIcon = (u, sz) => img(u, sz, 'st-ic');
const WAY = { Amplificación: 'amp', Encantamiento: 'enc', Arcanas: 'arc' };
const ST_TXT = { equipo: 'Qué tan buenas son tus piezas', enc: 'El «+» de cada pieza', amp: 'La mejora extra, con piedras', arc: 'Las 5 cartas que suben skills', dae: 'Los 4 tableros base' };
function whereHtml(P) {
const il = P.path.il, roof = P.path.roof, W = P.path.ways, g = gateOf(il), nx = g.next;
const lo = g.cur?.il ?? Math.max(0, il - 200), hi = Math.max(roof, nx?.il ?? roof, il + 1), at = x => ((x - lo) / (hi - lo) * 100).toFixed(2) + '%';
const name = x => esc(x.short || x.name);
const txt = !nx ? 'Ya entrás a todo el contenido que pide nivel de objeto.'
: `Para <b>${name(nx)}</b> te faltan <b>${nf(g.need)}</b>. ${roof >= nx.il ? `Mejorando lo que ya tenés llegás a <b>${nf(roof)}</b>: te alcanza.` : `Mejorando lo que tenés llegás a ${nf(roof)}: para eso vas a necesitar mejor equipo.`}`;
return `<section class="wh" aria-labelledby="wh-h"><h3 class="wh-h" id="wh-h">Dónde estás${gl('il')}</h3>
<p class="wh-n"><b>${nf(il)}</b><span>de nivel de objeto</span></p>
<div class="wh-bar" role="img" aria-label="${esc(`Nivel de objeto ${nf(il)}${nx ? `; ${nx.short || nx.name} pide ${nf(nx.il)}` : ''}; mejorando lo que tenés llegás a ${nf(roof)}`)}">
<i class="wh-now" style="--w:${at(il)}"></i>${W.map(w => `<i class="w-${WAY[w[0]] || 'dae'}" style="--w:${(w[1] / (hi - lo) * 100).toFixed(2)}%"></i>`).join('')}
${nx ? `<b class="wh-g" style="--x:${at(nx.il)}"><span>${nf(nx.il)}</span></b>` : ''}</div>
<p class="wh-t">${txt}</p>
${W.length ? `<ul class="rt-k" aria-label="Lo que suma cada mejora al nivel de objeto">${W.map(w => `<li class="w-${WAY[w[0]] || 'dae'}"><i></i>${esc(w[0])} <b>+${nf(w[1])}</b></li>`).join('')}</ul>` : ''}</section>`;
}
function stepsHtml() {
const k = kindOf(cur), P = plan(cur.d, cur.x.items, cur.x.boards, k, topSkills(cur, k)), st = stations(cur.d, cur.x.items, cur.x.boards);
const by = new Map((cur.d.equipment || []).map(e => [e.slot, e]));
const steps = P.steps.map((s, i) => `<li class="st" data-step="${s.id}">
<span class="st-n">${i + 1}</span>
${s.icon ? gameIcon(s.icon, 48) : s.board ? icoGame('board_icon_unique_open', 48, 'st-ic') : ''}
<div class="st-b"><p class="st-th"><b class="st-t">${esc(s.title)}</b>${gl(s.T ? 'spec' : STEP_GL[s.id])}</p>
<ul class="st-g">${s.gain.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
${s.skills ? `<ul class="st-sk2">${s.skills.map(x => `<li>${img(x.icon, 24)}<span>${esc(x.name)} <b>+${x.n}</b>${x.T ? ` <em>llega a ${x.T}</em>` : ''}</span></li>`).join('')}</ul>` : ''}
<small class="st-c">${esc(s.cost)}${s.sure === 'seguro' ? '' : ' <em class="st-s" title="Depende de cosas que la ficha no muestra o de promedios">aprox.</em>'}</small></div></li>`).join('');
const pic = { equipo: by.get(5)?.icon || by.get(1)?.icon, enc: by.get(1)?.icon, arc: by.get(41)?.icon };
const sIco = s => s.k === 'amp' ? icoGame('Icon_Item_Enchant_Amplify_A_001', 36, 'rt-i') : s.k === 'dae' ? icoGame('board_icon_legend_open', 36, 'rt-i') : img(pic[s.k], 36, 'rt-i');
const route = st.map(s => { const q = s.of ? Math.min(1, s.v / s.of) : 0; return `<li class="rt rt-${s.k}"${s.tip ? ` title="${esc(s.tip)}"` : ''}>${sIco(s)}
<span class="rt-t"><b>${s.t}</b>${gl(s.k)}<small>${ST_TXT[s.k] || ''}</small></span>
<span class="rt-v"><b>${Math.round(q * 100)} %</b><small>${s.k === 'equipo' ? `nivel ${nf(s.v)} de ${nf(s.of)}` : s.k === 'dae' ? `${nf(s.v)} de ${nf(s.of)} puntos` : `${nf(s.v)} de ${nf(s.of)}`}</small></span>
<span class="rt-r" style="--q:${Math.round(q * 100)}%"><i></i></span></li>`; }).join('');
return `<div class="st-w">
${whereHtml(P)}
<section class="pj-sec st-m" aria-labelledby="st-h"><h3 id="st-h" class="pj-h">Qué hacer ahora <small>para tu build ${esc(KIND_ES[k])}, de lo que más rinde a lo que menos</small></h3>
${P.steps.length ? `<ol class="st-l">${steps}</ol>` : '<p class="pj-empty">No veo pasos con lo que muestra la ficha: equipo, amplificación, Arcanas y Daevanion están al tope. Lo que sigue es cambiar de equipo.</p>'}</section>
<section class="rt-w" aria-labelledby="rt-h"><h3 class="wh-h" id="rt-h">Cómo vas <small>lo que se sube sin cambiar de equipo</small></h3><ol class="rt-l">${route}</ol></section>
</div>`;
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
return `<section class="pj-sec" aria-labelledby="eq-h"><h3 id="eq-h" class="pj-h">Equipo <small>tocá una pieza para ver sus líneas y qué buscan los mejores</small></h3>
<ul class="eq-k" aria-label="Cómo leer cada pieza"><li><span class="eq-kn">+15</span>encantamiento${gl('enc')}</li><li><span class="eq-amp" aria-hidden="true"><i class="on"></i><i class="on"></i><i></i></span>amplificación${gl('amp')}</li><li><span class="eq-kl">nivel 86</span>calidad de la pieza${gl('equipo')}</li><li>líneas${gl('lineas')}</li></ul>
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
const top = topSkills(cur, kindOf(cur)), use = s => useful(s, parts.get(String(s.id)));
const row = s => {
const x = parts.get(String(s.id)) || { base: s.level, dae: 0, gear: 0, arc: 0 }, nm = skName(s);
const stig = s.category === 'Dp', max = stig ? STIG_CAP : Math.max(25, s.level), w = v => (v / max * 100).toFixed(2) + '%';
const seg = stig ? `<i class="s-st" style="--w:${w(s.level)}"></i>` : `<i class="s-ba" style="--w:${w(x.base)}"></i><i class="s-da" style="--w:${w(x.dae)}"></i><i class="s-eq" style="--w:${w(x.gear)}"></i><i class="s-ar" style="--w:${w(x.arc)}"></i>`;
const desc = stig ? `Nivel ${s.level}` : `Nivel ${s.level}: base ${x.base}, Daevanion ${x.dae}, equipo ${x.gear}, Arcanas ${x.arc}`;
const tl = top.get(String(s.id));
return `<li class="sk${use(s) || stig ? '' : ' off'}" data-sk="${s.id}">
${img(s.icon, 40, 'sk-ic')}<span class="sk-n"><b>${esc(gname(nm))}</b>${galt(nm) ? `<small lang="${gameLang() === 'en' ? 'es' : 'en'}">${esc(galt(nm))}</small>` : ''}</span>
<span class="sk-bar" role="img" aria-label="${esc(desc)}" data-parts="${stig ? s.level : [x.base, x.dae, x.gear, x.arc].join(',')}">${seg}<b class="sk-cap" style="--x:${w(stig ? STIG_CAP : NORMAL_CAP)}" title="${stig ? 'Tope de las estigmas' : 'Tope normal: 10 con puntos + 4 de Daevanion'}"></b>${tl && !stig ? `<b class="sk-tl" style="--x:${w(Math.min(tl, max))}" title="Los mejores la tienen en ${Math.round(tl)}"></b>` : ''}</span>
<b class="sk-lv">${s.level || '—'}</b>
<small class="sk-h">${[hint(s, x), tl && `los top: ${Math.round(tl)}`, !use(s) && !stig && 'no la usás'].filter(Boolean).map(esc).join(' · ')}</small></li>`;
};
const act = sk.filter(s => s.category === 'Active'), pas = sk.filter(s => s.category === 'Passive'), sti = sk.filter(s => s.category === 'Dp' && s.level > 0);
const sorted = l => [...l.filter(use), ...l.filter(s => !use(s))];
return `<section class="pj-sec" aria-labelledby="sk-h"><h3 id="sk-h" class="pj-h">Skills${gl('skills')} <small>de dónde sale el nivel de cada una y hasta dónde la suben los mejores</small></h3>
<ul class="sk-k"><li class="s-ba"><i></i>Base, con puntos (hasta ${BASE_CAP})</li><li class="s-da"><i></i>Daevanion (hasta 4)</li><li class="s-eq"><i></i>Equipo</li><li class="s-ar"><i></i>Arcanas</li><li class="s-cap"><i></i>Tope normal ${NORMAL_CAP}</li>${top.size ? '<li class="s-tl"><i></i>Los mejores</li>' : ''}</ul>
<h4 class="pj-h4">Activas</h4><ul class="sk-l">${sorted(act).map(row).join('')}</ul>
<h4 class="pj-h4">Pasivas</h4><ul class="sk-l">${pas.map(row).join('')}</ul>
${sti.length ? `<h4 class="pj-h4">Estigmas${gl('stig')} <small>solo con Fragmentos de Estigma, tope ${STIG_CAP}</small></h4><ul class="sk-l sk-sti">${sti.sort((a, b) => b.level - a.level).map(row).join('')}</ul>` : ''}
<p class="pj-note">Arriba de ${NORMAL_CAP} se sube con líneas de skill de Arcanas (hasta +4 por línea) y del equipo (+1 por línea). Atenuadas: activas que no están en tu barra o que no subiste con puntos.</p></section>`;
}
/* ---------- Daevanion: los tableros dibujados con los nodos del juego ---------- */
let BOARD = 0;
function daeHtml() {
const bd = cur.d.daevanion || [];
return `<section class="pj-sec" aria-labelledby="dae-h"><h3 id="dae-h" class="pj-h">Daevanion${gl('dae')} <small>tocá un nodo para ver qué da</small></h3>
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
const mod = () => modP ||= import('./personaje-builds.js' + VQ).then(m => { m.init({ api, MSG, img, gcls, GRADE, nf, curated: c => c && curated(c), CLS_KEY, gl }); return m; }, e => { modP = null; throw e; });
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
addEventListener('keydown', e => {
if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey && document.documentElement.classList.contains('pj-char') && !e.target.closest?.('input, textarea, select, [contenteditable]')) {
e.preventDefault(); e.stopImmediatePropagation(); document.documentElement.classList.remove('pj-char'); location.hash = ''; inp.focus();
}
}, true);
registerKey({ key: 'g', label: 'Favorito: la ficha abierta (en Personaje)', run: toggleFav });
on('gamelang', () => { if (cur) { paintChar(); return; } if (last && parseSearch()) paintResults(); else if (!location.hash) paintHome(); });
route();   // sin autofoco: las teclas globales (1-5, /, M) tienen que andar al entrar; F lleva al buscador
