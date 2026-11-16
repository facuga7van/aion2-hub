import {
$, esc, on, onTick, onStore, bind, fmtClock, fmtLeft, leftNext, toast, announce, store, versioned, norm, profile, serverName,
FACCION, serverFaccion, setFaccion, ROOT, SCHEDULE, maintWindows, bellButton, getBell, setTimers, registerPalette, registerKey, partsIn, wallToUtc, displayTz,
HUB_API, LNA_MSG, lnaBlocked, gname, galt, gboth, gameLang, modal, DATA, MIN, HOUR, DAY,
} from './core.js?v=42acf93068';
const D = JSON.parse($('#page-data').textContent), WIN = D.windowMin * MIN, KEEP = 30 * MIN, TOL = 3 * MIN;
const DR = D.drops, IT = DR.items;
const BOSSES = D.bosses.map(b => ({ ...b, fac: b.faction === 'Elyos' ? 'elyos' : 'asmodian', cyc: b.respawnMin * MIN, world: b.respawnSource === 'oficial', tier: DR.bosses[b.id]?.t || 3, top: DR.bosses[b.id]?.t === 1, hay: norm(`${gboth(b)} ${gboth(b, 'teleport')}`) }));
const BY = new Map(BOSSES.map(b => [b.id, b]));
const KILLS = versioned('hub-kills', 1, { k: {} });          // {"<server>|<jefe>": epoch ms del kill}
const CFG = versioned('hub-jefes', 1, { com: 'off' });       // com: off | ver | compartir · orden: spawn | importancia | nombre | nivel · fav: ids fijados arriba
const OCU = versioned('hub-jefes-ocultos', 1, { ids: [] });
const ord = () => ['importancia', 'nombre', 'nivel'].includes(CFG.get().orden) ? CFG.get().orden : 'spawn';
const favs = () => new Set(CFG.get().fav || []), ocultos = () => new Set(OCU.get().ids || []);
const MAINT = SCHEDULE.maintenance?.fieldBossesAfterMaintenance !== 'keep';
const POLL = 30e3, RETRY = 60e3, LIVE_POLL = 60e3, LIVE_VALID = 15 * MIN;
const pad = n => String(n).padStart(2, '0');
const srv = () => profile().server || 0;
const myFac = () => profile().faccion === 'asmodian' ? 'asmodian' : 'elyos';   // la facción que ves (selector global del riel)
const kkey = b => `${srv()}|${b.id}`;
const bellId = b => `jefe:${srv()}:${b.id}`;
const span = (a, b, now) => `${fmtClock(a, { now })}–${fmtClock(b, { now, day: false })}`;
const cycTxt = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + m % 60 : ''}`;
const CONF = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const tpTxt = t => { const m = /^(\d+)\.\s*(.*)$/.exec(t || ''); return !t ? '' : m ? `Teleport ${m[1]} · ${m[2]}` : `Teleport · ${t}`; };
const jLeft = (ms, n) => [fmtLeft(ms), n + leftNext(ms)];
const SRC_TXT = { ql: 'En vivo', vos: 'Vos', com: 'Estimado' };
const ago = ts => n => { const m = Math.max(0, Math.floor((n - ts) / MIN)); return [m < 1 ? 'recién' : `hace ${m < 60 ? m + ' min' : `${Math.floor(m / 60)}h ${pad(m % 60)}m`}`, ts + (m + 1) * MIN]; };
let mwAt = -Infinity, mwL = [];
const mws = now => { if (Math.abs(now - mwAt) > MIN) { mwAt = now; mwL = maintWindows(now - 3 * DAY, now + DAY); } return mwL; };
async function api(path, body) {
try {
const r = await fetch(HUB_API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(3000) }
: { cache: 'no-cache', signal: AbortSignal.timeout(3000) });        // no-cache: el navegador revalida con If-None-Match (ETag) y el 304 no baja nada
return { r, txt: await r.text() };
} catch (e) { return { fail: e.name }; }                               // TimeoutError (3 s) o TypeError (red, CORS, permiso de red local)
}
/* ---------- en vivo: Questlog vía /api/timers ---------- */
let live = null, liveMap = new Map(), liveTxt = '', liveErr = null, liveBusy = false, nextLive = 0, liveTry = 0;
function setLive(j) { live = j; liveMap = new Map((j?.bosses || []).map(e => [e.id, e])); }
function loadLive() {
const l = store.get('hub-live', null);
setLive(l?.server === srv() && Date.now() - l.fetchedAt < DAY ? l : null);
liveTxt = ''; liveErr = null; nextLive = 0;
}
async function pullLive() {
const s = srv();
if (!s || liveBusy) return;
liveBusy = true;
liveTry = Date.now();
nextLive = liveTry + LIVE_POLL;
const res = await api(`/api/timers?server=${s}`);
let j = null;
if (res.r?.ok) try { j = JSON.parse(res.txt); } catch { /* abajo: como caído */ }
const err = j?.bosses ? (j.stale ? 'stale' : null) : res.fail === 'TypeError' && await lnaBlocked() ? 'lna' : 'down';
liveBusy = false;
if (s !== srv()) return;                                // cambió el server mientras esperaba
const first = held, was = liveErr;
held = false;
liveErr = err;
const changed = !!j?.bosses && res.txt !== liveTxt;
if (changed) { liveTxt = res.txt; setLive(j); store.set('hub-live', j); }
if (changed || first || was !== err) paint();
paintSt();
}
/* ---------- comunidad (opt-in, en "Corregir o completar") ---------- */
let feed = null, feedTxt = '', feedAt = 0, comDown = false, nextPoll = 0, inflight = false;
const com = () => srv() ? CFG.get().com : 'off';
function cid() {
let c = store.get('hub-cid', null);
if (!c) { c = crypto.randomUUID(); store.set('hub-cid', c); }
return c;
}
async function poll() {
const s = srv();
if (com() === 'off' || inflight) return;
inflight = true;
nextPoll = Date.now() + POLL;
const res = await api(`/api/kills?server=${s}`);
inflight = false;
if (s !== srv() || com() === 'off') return;
const ok = res.r?.ok, was = comDown;
comDown = !ok;
if (!ok) { nextPoll = Date.now() + RETRY; feed = null; feedTxt = ''; paint(); paintCom(); return; }
feedAt = Date.now();
const changed = res.txt !== feedTxt;
if (changed) { feedTxt = res.txt; feed = new Map(JSON.parse(res.txt).bosses.map(c => [c.boss, c])); }
if (changed || was) paint();
paintCom();
}
async function send(path, b, extra) {
const res = await api(path, { server: srv(), boss: b.id, cid: cid(), ...extra });
if (!res.r) { comDown = true; feed = null; feedTxt = ''; nextPoll = Date.now() + RETRY; paint(); paintCom(); return null; }
let j = {};
try { j = JSON.parse(res.txt); } catch { /* sin cuerpo */ }
if (!res.r.ok) return { err: j.error || `error ${res.r.status}` };
nextPoll = 0;                                          // traer el consenso nuevo en el próximo tick
return j;
}
async function share(b, t) {
const j = await send('/api/kills', b, { t });
if (!j) toast(`Comunidad sin conexión: el kill de <b>${esc(gname(b))}</b> quedó solo en tu navegador.`, { ms: 7000 });
else if (j.err) toast(`La comunidad no tomó el kill de <b>${esc(gname(b))}</b>: ${esc(j.err)}. Tu timer sigue igual.`, { ms: 7000 });
else toast(`Compartí el kill de <b>${esc(gname(b))}</b> con ${esc(serverName(srv()))}.`);
}
async function deny(b) {
const j = await send('/api/kills/deny', b);
if (!j) toast('Comunidad sin conexión: no pude mandar el "No estaba".');
else if (j.err) toast(`No se anotó: ${esc(j.err)}.`, { ms: 7000 });
else toast(`Anotado: <b>${esc(gname(b))}</b> no estaba. Le resta confianza a ese reporte.`);
}
/* ---------- timers ---------- */
function timer(b, now, K = KILLS.get().k) {
const e = liveMap.get(b.id), t = K[kkey(b)], c = feed?.get(b.id);
const ql = e && Number.isFinite(e.time) ? { src: 'ql', alive: e.alive, E: e.alive ? e.time : e.time - b.cyc, start: e.time, end: e.time + WIN } : null;
const mine = t && now < t + b.cyc + WIN + KEEP ? { src: 'vos', E: t, start: t + b.cyc, end: t + b.cyc + WIN } : null;
const cm = c && now < c.windowEnd + KEEP ? { src: 'com', E: c.killedAt, start: c.windowStart, end: c.windowEnd, c } : null;
let tm = ql;
for (const x of [mine, cm]) if (x && (!tm || x.E > tm.E + TOL)) tm = x;
if (!tm) return null;
tm.maint = MAINT ? mws(now).find(w => w.start > tm.E)?.start || 0 : 0;   // primer mantenimiento después del dato
tm.stale = MAINT && ((tm.maint && tm.maint <= now) || !!tm.c?.stale);
return tm;
}
const state = (tm, now) => tm.stale ? 'stale' : tm.alive ? 'alive' : now < tm.start ? 'spawns' : tm.src !== 'ql' && now < tm.end ? 'window' : 'due';
const RANK = { alive: 0, window: 1, due: 1, spawns: 2, stale: 3, none: 4 };
/* ---------- pintar ---------- */
const viewFac = myFac;
let nextChange = Infinity, roveId = 0, noneOpen = false, hidOpen = false;
let held = false;
const SOON = 15 * MIN;                                   // "sale pronto": la cuenta regresiva se enciende
const GROUPS = [['now', 'Para ir ahora'], ['soon', 'Próximos'], ['stale', 'Sin confirmar', 'hubo mantenimiento'], ['none', 'Sin datos']];
const TIER_TXT = { 1: () => `Set ${gradeTxt('Unique')}`, 2: () => `Set ${gradeTxt('Legend')} o alma de pet`, 3: () => `Set ${gradeTxt('Rare')}` };
const grpOf = s => s === 'alive' || s === 'window' || s === 'due' ? 'now' : s === 'spawns' ? 'soon' : s;
const pic = (b, sz, px) => `<img class="jf-p" src="${ROOT}assets/jefes/${b.retrato}-${sz}.webp" width="${px}" height="${px}" alt="" loading="lazy">`;
const cyc = (tm, b, now) => !tm || tm.stale ? 0 : tm.alive || now >= tm.start ? 1 : Math.max(0, Math.min(1, 1 - (tm.start - now) / b.cyc));
/* ---------- drops: qué suelta cada jefe (boss-drops.json; criterio en decisions.md, "Drops de jefes") ---------- */
const GRADE_ES = { Common: 'Común', Rare: 'Raro', Legend: 'Legendario', Unique: 'Único', Epic: 'Épico', Special: 'Especial' };
const GEAR = { arma: 0, accesorio: 1, armadura: 2 };   // orden de la tira: armas, accesorios, armadura
const IC = ROOT + 'assets/ic/';
const gradeTxt = g => (gameLang() === 'en' ? DR.gradeEn[g] : GRADE_ES[g]) || g;
const qcls = g => 'q-' + String(g || 'common').toLowerCase();
const pct = n => n < 0.01 ? '<0,01 %' : `${n.toLocaleString('es-AR', { maximumFractionDigits: n >= 10 ? 0 : n >= 1 ? 1 : 2 })} %`;
const icImg = (it, px) => `<img src="${IC}${esc(it.icon)}.webp" width="${px}" height="${px}" alt="" loading="lazy" decoding="async">`;
const dropsOf = b => DR.bosses[b.id] || { t: 3, d: [], p: [] };
const teSirve = () => false;
function pieces(b) {
const by = new Map();
for (const [id, ch, via] of dropsOf(b).d) {
const it = IT[id];
if (!(it.kind in GEAR)) continue;
const k = it.nameEn + it.icon, x = by.get(k);
if (!x || (x.via && !via)) by.set(k, { id, ch, via: !!via });
}
return [...by.values()].sort((a, c) => GEAR[IT[a.id].kind] - GEAR[IT[c.id].kind] || a.ch - c.ch);
}
function souls(b) {
const own = store.get('pets-owned', []), have = new Set(Array.isArray(own) ? own.map(String) : []);
return dropsOf(b).d.filter(([id]) => IT[id].pet).map(([id]) => ({ id, pet: IT[id].pet, falta: !have.has(String(IT[id].pet)) }));
}
const petName = s => { const p = DATA.pets?.find(x => String(x[0]) === String(s.pet)); return p ? gname({ name: p[1], nameEn: p[2] }) : gname(IT[s.id]); };
const tipTxt = (id, ch) => `${gname(IT[id])} · ${gradeTxt(IT[id].grade)} · ${pct(ch)}`;
const icon = (id, ch, px, btn) => {
const c = `jf-ic ${qcls(IT[id].grade)}${teSirve(id) ? ' is-want' : ''}`;
return btn ? `<button type="button" class="${c}" data-it="${id}" data-ch="${ch}" aria-label="${esc(tipTxt(id, ch))}">${icImg(IT[id], px)}</button>`
: `<span class="${c}" data-it="${id}" data-ch="${ch}">${icImg(IT[id], px)}</span>`;
};
function rowDrops(b) {
const S = souls(b), P = pieces(b).slice(0, S.length ? 2 : 3);
return `<span class="jf-d">${S.map(s => s.falta
? `<span class="jf-pet" data-it="${s.id}" data-ch="100">${icImg(IT[s.id], 26)}<b class="l">Pet que te falta</b><b class="s">Te falta</b></span>`
: icon(s.id, 100, 26)).join('')}${P.map(x => icon(x.id, x.ch, 26)).join('')}</span>`;
}
const cardDrops = b => `<span class="jf-d" role="group" aria-label="Equipo que suelta">${pieces(b).map(x => icon(x.id, x.ch, 30, true)).join('')}<button type="button" class="linkbtn jf-vd" data-drops>Ver drops</button></span>`;
const TIP = document.createElement('div');
TIP.id = 'jf-tip';
TIP.className = 'jf-tip';
TIP.popover = 'manual';
TIP.setAttribute('role', 'tooltip');
document.body.append(TIP);
let tipFor = null;
function showTip(el) {
const it = IT[el.dataset.it];
if (!it) return;
tipFor = el;
TIP.className = 'jf-tip ' + qcls(it.grade);
TIP.innerHTML = `${icImg(it, 40)}<span><b>${esc(gname(it))}</b><small>${esc(gradeTxt(it.grade))} · ${pct(+el.dataset.ch)}</small></span>`;
if (!TIP.matches(':popover-open')) TIP.showPopover();
const r = el.getBoundingClientRect(), w = TIP.offsetWidth, h = TIP.offsetHeight;
TIP.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
TIP.style.top = (r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8) + 'px';
}
function hideTip() { if (tipFor) { tipFor = null; TIP.hidePopover(); } }
let dpB = null, dpBox = null, zona = null;
const dli = (it, id, ch, px) => `<li class="${qcls(it.grade)}${teSirve(id) ? ' is-want' : ''}" data-id="${id}">${icImg(it, px)}<span class="jf-dn"><b>${esc(gname(it))}</b><small>${esc(gradeTxt(it.grade))}</small></span><span class="jf-dc">${ch == null ? '' : pct(ch)}</span></li>`;
function dropsHtml(b) {
const x = dropsOf(b), own = x.d.filter(d => !d[2]);
const sec = (h, L, cls = '') => L.length ? `<section class="jf-ds${cls}"><h3>${h}</h3><ul class="jf-dl">${L.map(([id, ch]) => dli(IT[id], id, ch, 36)).join('')}</ul></section>` : '';
return `<div class="jf-dh">${pic(b, b.top ? 192 : 80, 56)}<span>${galt(b) ? `<b>${esc(galt(b))}</b>` : ''}<small>Nivel ${b.level}</small></span></div>`
+ souls(b).filter(s => s.falta).map(s => `<p class="jf-dpet">${icImg(IT[s.id], 40)}<span><b>Pet que te falta</b><small>${esc(petName(s))} · 100 %</small></span></p>`).join('')
+ sec('Equipo exclusivo', own.filter(([id]) => IT[id].kind in GEAR))
+ own.filter(([id]) => IT[id].kind === 'cofre').map(([cid, cch]) => sec(`${icImg(IT[cid], 28)} ${esc(gname(IT[cid]))} <small>${pct(cch)}</small>`, x.d.filter(d => d[2] === cid), ' jf-dcof')).join('')
+ sec('Otros', own.filter(([id]) => !(IT[id].kind in GEAR) && IT[id].kind !== 'cofre'))
+ (x.z ? '<details class="jf-zona"><summary>Tabla de zona compartida <small>lo que suelta cualquier jefe de la zona</small></summary><div class="jf-zl" aria-live="polite"></div></details>' : '');
}
const loadZona = () => zona ||= fetch(ROOT + DR.zona).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { zona = null; throw e; });
async function paintZona(det) {
const box = $('.jf-zl', det), b = dpB;
if (!det.open || box.dataset.done) return;
box.innerHTML = '<p class="jf-zw">Cargando…</p>';
try {
const z = await loadZona();
if (dpB !== b) return;
box.dataset.done = '1';
box.innerHTML = `<ul class="jf-dl">${(z.tables[dropsOf(b).z] || []).map(([id, ch]) => dli(z.items[id], id, ch, 28)).join('')}</ul>`;
} catch { box.innerHTML = '<p class="jf-zw">No se pudo cargar. Probá de nuevo con conexión.</p>'; }
}
function paintDrops() {
dpBox.innerHTML = dropsHtml(dpB);
const h = dpBox.closest('dialog')?.querySelector('h2');
if (h) h.textContent = gname(dpB);
$('.jf-zona', dpBox)?.addEventListener('toggle', e => paintZona(e.currentTarget));
}
async function openDrops(b) {
hideTip();
if (dpB) return;
dpB = b;
dpBox = document.createElement('div');
dpBox.className = 'jf-dp';
const done = modal({ title: gname(b), node: dpBox, cls: 'jf-dm' });
paintDrops();
await done;
dpB = dpBox = null;
}
function row(b, tm, now, { lv = false } = {}) {
const s = tm ? state(tm, now) : 'none', ap = tm?.src === 'com' ? '≈ ' : '';
const at = tm && ap + fmtClock(tm.start, { now }), win = tm && ap + span(tm.start, tm.end, now);   // Questlog da la hora; tu kill, la ventana
const src = tm?.src === 'vos' ? ' <em class="src vos" title="Tu “Lo maté” es más nuevo que el dato en vivo">Vos</em>'
: tm?.src === 'com' ? ` <em class="src com" title="Lo reportan otros jugadores de ${esc(serverName(srv()))} (confianza ${(CONF[tm.c.confidence] || tm.c.confidence).toLowerCase()}). No es un horario oficial.">≈ Estimado</em>` : '';
const [st, when, tip] = {
alive: ['<b class="jf-big">Vivo</b>', `<span data-ago="${tm?.start}"></span>`, `Vivo desde ${at}`],
due: ['<b class="jf-big">Debería estar</b>', `<span data-ago="${tm?.start}"></span>`, `Debería estar desde ${at} (nadie lo confirmó)`],
window: ['<b class="jf-big">Puede estar</b>', `cierra en <span class="cd" data-left="${tm?.end}"></span>`, `Puede salir entre ${win}`],
spawns: [`<span class="jf-l">Sale en</span> <b class="jf-big cd" data-left="${tm?.start}"></b>`, `<i class="jf-sep">· </i>${at}`, tm?.src === 'ql' ? `Sale ${at}` : `Sale entre ${win}`],
stale: [`<s class="jf-big">${at}</s>`, 'Sin confirmar', 'Hubo mantenimiento después de este dato: puede no valer'],
none: ['<b class="jf-big">Sin datos</b>', '', 'Sin dato en vivo de este jefe en tu server'],
}[s];
const denyBtn = tm?.src === 'com' && s !== 'stale' && com() === 'compartir'
? '<button type="button" class="btn ghost jf-deny" data-deny title="Fuiste y no estaba muerto, o el reporte no cierra: le resta confianza">No estaba</button>' : '';
const fix = tm?.src === 'vos';                         // con tu timer, el botón corrige (nunca lo pisa sin preguntar)
const soon = s === 'spawns' && tm.start - now <= SOON ? ' is-soon' : '';
const meta = [lv && `Nv ${b.level}`, tpTxt(gname(b, 'teleport')), b.top && `cada ${cycTxt(b.respawnMin)}`].filter(Boolean).map(esc).join(' · ');
const info = `${galt(b) ? esc(galt(b)) + ' · ' : ''}Nivel ${b.level} · sale cada ${cycTxt(b.respawnMin)} (${b.respawnSource === 'oficial' ? 'oficial, parche Global' : 'medido por la comunidad'})`;
return `<li class="jf-r s-${s}${tm ? ' src-' + tm.src : ''}${soon}${b.top ? ' jf-wc' : ''}" id="b-${b.id}" data-boss="${b.id}" data-lv="${b.level}" data-tier="${b.tier}" tabindex="-1">
${b.top ? pic(b, 192, 96) : pic(b, 80, 40)}
<span class="jf-n" title="${info}"><b>${esc(gname(b))}</b><small>${meta}</small></span>${b.top ? cardDrops(b) : rowDrops(b)}
<span class="jf-w" title="${esc(tip)}"><span class="jf-s">${st}</span><span class="jf-t">${when}${src}</span></span>
<span class="jf-a">${denyBtn}<button type="button" class="btn ghost jf-kill" data-kill="${fix ? 'fix' : 'new'}" title="${fix ? 'Corregir la hora de tu kill, anotar uno nuevo o quitar tu timer' : 'Lo mataste y no figura: anotá tu kill'}">${fix ? 'Corregir' : 'Lo maté'}</button></span><span class="jf-b"></span>${b.top ? `
<span class="jf-cy"><i style="--p:${cyc(tm, b, now).toFixed(4)}"></i></span>` : `<button type="button" class="jf-mb" data-menu aria-haspopup="dialog" aria-label="Más: ver drops, fijar u ocultar ${esc(gname(b))}" title="Ver drops, fijar arriba u ocultar"><svg aria-hidden="true"><use href="#i-more"/></svg></button>`}</li>`;
}
function paint() {
if (held) return;
const now = Date.now(), f = viewFac(), q = norm($('#jf-q').value).trim(), hit = b => !q || b.hay.includes(q), K = KILLS.get().k;
const fe = document.activeElement, fb = fe?.closest?.('[data-boss]')?.dataset.boss, fgt = fe?.matches?.('[data-gt]') ? '[data-gt]' : fe?.matches?.('[data-hid]') ? '[data-hid]' : null;
const fsel = !fb ? null : fe.matches('[data-kill]') ? '[data-kill]' : fe.matches('.bell') ? '.bell' : fe.matches('[data-deny]') ? '[data-deny]' : fe.matches('[data-menu]') ? '[data-menu]'
: fe.matches('[data-drops]') ? '[data-drops]' : fe.matches('[data-it]') ? `[data-it="${fe.dataset.it}"]` : null;
hideTip();
const world = [], rest = [];
nextChange = Infinity;
for (const b of BOSSES) {
const tm = timer(b, now, K);
if (tm) for (const x of [tm.start - SOON, tm.start, tm.end, tm.end + KEEP, tm.maint]) if (x > now && x < nextChange) nextChange = x;
if (b.fac === f) (b.top ? world : rest).push([b, tm]);
}
const rk = ([, tm]) => tm ? RANK[state(tm, now)] : RANK.none;
rest.sort((a, c) => rk(a) - rk(c) || ((a[1]?.start || 0) - (c[1]?.start || 0)) * (rk(a) === RANK.alive ? -1 : 1));
publish(now, K);
const o = ord(), fv = favs(), oc = ocultos(), all = rest.filter(([b]) => hit(b));
const hid = all.filter(([b]) => oc.has(b.id)), shown = all.filter(([b]) => !oc.has(b.id));
if (o !== 'spawn' && o !== 'importancia') shown.sort(([a], [c]) => (o === 'nivel' && a.level - c.level) || gname(a).localeCompare(gname(c), 'es'));
const pins = shown.filter(([b]) => fv.has(b.id)), loose = shown.filter(([b]) => !fv.has(b.id)), by = { now: [], soon: [], stale: [], none: [] };
if (o === 'spawn') for (const x of loose) by[grpOf(x[1] ? state(x[1], now) : 'none')].push(x);
const fold = by.none.length < loose.length, open = noneOpen || !!q, lv = o === 'nivel';
const grp = (g, label, L, { tog = false, sub = '' } = {}) => {
const h = tog ? `<button type="button" class="jf-gt" data-gt aria-expanded="${open}" aria-controls="jf-g-${g}">${label} <small>${L.length}</small><svg aria-hidden="true"><use href="#i-r"/></svg></button>`
: `${label} <small>${L.length}</small>${sub ? ` <span class="jf-gs">· ${sub}</span>` : ''}`;
return `<section class="jf-grp g-${g}" aria-label="${label}"><h3 class="jf-gh">${h}</h3><ul class="jf-list" id="jf-g-${g}"${tog && !open ? ' hidden' : ''}>${L.map(([b, tm]) => row(b, tm, now, { lv })).join('')}</ul></section>`;
};
const html = [pins.length && grp('fav', 'Fijados', pins),
...(o === 'spawn' ? GROUPS.filter(([g]) => by[g].length).map(([g, label, sub]) => grp(g, label, by[g], { tog: g === 'none' && fold, sub }))
: o === 'importancia' ? [1, 2, 3].map(t => [t, loose.filter(([b]) => b.tier === t)]).filter(([, L]) => L.length).map(([t, L]) => grp('t' + t, TIER_TXT[t](), L))
: [loose.length && grp('all', o === 'nivel' ? 'Por nivel' : 'Por nombre', loose)]),
hidOpen && hid.length && grp('hid', 'Ocultos', hid)].filter(Boolean).join('');
$('#jf-world').hidden = $('#jf-all').hidden = false;   // ocultas hasta el primer pintado: así nada visible se corre (CLS 0)
$('#jf-world-l').innerHTML = world.map(([b, tm]) => row(b, tm, now)).join('');
$('#jf-all-h').innerHTML = `De campo <small>${shown.length}</small>`;
$('#jf-ord').value = o;
$('#jf-all-l').innerHTML = (html || (q ? `<p class="jf-empty">Ningún jefe ${FACCION[f]} con “${esc($('#jf-q').value)}”.</p>` : ''))
+ (hid.length ? `<p class="jf-hidf"><button type="button" class="linkbtn" data-hid aria-expanded="${hidOpen}">${hid.length} ${hid.length > 1 ? 'ocultos' : 'oculto'} · ${hidOpen ? 'Esconder' : 'Mostrar'}</button></p>` : '');
for (const li of $('#jf-main').querySelectorAll('[data-boss]')) {
const b = BY.get(+li.dataset.boss), l = $('[data-left]', li), a = $('[data-ago]', li);
if (l) { const t = +l.dataset.left; bind(l, n => jLeft(t - n, n)); }
if (a) bind(a, ago(+a.dataset.ago));
$('.jf-b', li).append(bellButton(bellId(b), gname(b), /s-(none|stale)/.test(li.className) ? { hint: 'Suena cuando haya timer.' } : {}));
}
nextCyc = now + MIN;
const rv = $(`#b-${roveId}`);
(rv?.checkVisibility() ? rv : visRows()[0])?.setAttribute('tabindex', '0');   // una fila alcanzable con Tab; ↑↓ recorre
if (fb) ($(`#b-${fb} ${fsel || ''}`.trim()) || null)?.focus();
else if (fgt) $(fgt)?.focus();
if (km && KM.matches(':popover-open')) placeKm();
}
const visRows = () => [...$('#jf-main').querySelectorAll('[data-boss]')].filter(li => li.checkVisibility());
let nextCyc = 0;
function paintCyc(now) {
nextCyc = now + MIN;
for (const li of $('#jf-world-l').querySelectorAll('[data-boss]')) {
const b = BY.get(+li.dataset.boss), i = $('.jf-cy i', li);
if (i) i.style.setProperty('--p', cyc(timer(b, now), b, now).toFixed(4));
}
}
let lastPub = null;
function publish(now, K) {
const pf = myFac(), list = [];
for (const b of BOSSES) {
const tm = timer(b, now, K);
if (!tm || tm.stale) continue;
const s = state(tm, now), w = b.top && b.fac === pf;   // los 4 importantes (equipo Unique) van a la tira y a Próximos
if (!w && tm.src !== 'vos' && !getBell(bellId(b))) continue;
const end = tm.src === 'ql' && s !== 'spawns' ? (w && live ? Math.max(tm.end, live.fetchedAt + LIVE_VALID) : tm.end) : tm.end;
if (end <= now) continue;
list.push({
id: bellId(b), label: b.name, labelEn: b.nameEn, ...(w ? { short: /Gartua|Lagta|Dartan|Kashapa/.exec(b.name)?.[0], shortEn: /Gartua|Lagta|Dartan|Kashapa/.exec(b.nameEn)?.[0] } : {}), start: tm.start, end, ...(tm.maint ? { until: tm.maint } : {}), href: ROOT + 'jefes/#b-' + b.id,
note: tpTxt(b.teleport), noteEn: tpTxt(b.teleportEn), nowText: 'Ya debería estar', src: SRC_TXT[tm.src], ...(tm.src === 'com' ? { approx: true } : {}),
...(w ? { up: true } : {}), ...(s === 'alive' ? { liveText: 'vivo' } : tm.src === 'ql' ? { liveText: 'debería estar' } : {}),
});
}
const s = JSON.stringify(list);
if (s === lastPub) return;
lastPub = s;
if (s !== JSON.stringify(store.get('hub-timers', []))) setTimers(list);
}
function paintSt() {
const el = $('#jf-st'), s = srv();
if (!s) { el.innerHTML = 'Para ver los timers en vivo, elegí tu server en <button type="button" class="linkbtn" data-hub="settings">Ajustes</button>. Mientras, anotá tus kills con <b>Lo maté</b>.'; return; }
const warn = liveErr === 'lna' ? LNA_MSG : liveErr === 'down' ? 'Sin conexión con el servidor de la Bitácora: sigo con lo último que tenía y con tus kills. Reintento en 1 min.'
: liveErr === 'stale' ? 'La fuente en vivo no responde: es lo último que hubo.' : '';
el.classList.toggle('on', !!live && !liveErr);          // punto encendido: dato fresco
el.innerHTML = (live ? 'En vivo · actualizado <span id="jf-age"></span>'
: held ? `Buscando los timers de ${esc(serverName(s))}…` : 'Todavía no hay datos en vivo para tu server.') + (warn ? ` <span class="jf-warn">${esc(warn)}</span>` : '');
if (live) bind($('#jf-age'), ago(live.fetchedAt));
}
function paintCom() {
const el = $('#jf-com-st'), c = com(), name = esc(serverName(srv()) || '');
for (const b of document.querySelectorAll('#jf-com button')) { b.setAttribute('aria-pressed', String(b.dataset.com === c)); b.disabled = !srv(); }
if (!srv()) el.innerHTML = 'Para ver y compartir reportes, elegí tu server en Ajustes.';
else if (c === 'off') el.innerHTML = 'Apagada: nada sale de tu navegador.';
else if (comDown) el.innerHTML = '<b class="jf-down">Comunidad sin conexión</b>: sigo sin sus reportes. Reintento en 1 min.';
else if (!feedAt) el.innerHTML = `Conectando con los reportes de ${name}…`;
else if (!feed?.size) el.innerHTML = `Nadie reportó todavía en ${name}.`;
else {
el.innerHTML = `Reportes de ${name} · actualizado <span id="jf-com-age"></span>${c === 'compartir' ? ' · tus "Lo maté" se comparten (anónimo)' : ''}`;
bind($('#jf-com-age'), ago(feedAt));
}
}
function paintBar() {
const f = viewFac(), pr = profile(), sf = serverFaccion(pr.server), q = $('#jf-q').value.trim();
$('#jf-fbtn-t').textContent = q ? `“${q}”` : 'Filtrar';
$('#jf-lead').innerHTML = `${pr.server ? `<b>${esc(serverName(pr.server))}</b> · ` : ''}${FACCION[f]}`
+ (sf && sf !== f ? ` <em class="tag jf-enemy" title="Tu server es ${FACCION[sf]}: estos jefes quedan en territorio enemigo (por la Grieta). La facción se cambia en el menú lateral.">zona enemiga · tu server es ${FACCION[sf]}</em>` : '');
}
/* ---------- "Lo maté": un toque guarda; el menú corrige la hora o deshace ---------- */
let km = null;                                           // {b, base, prev}
const KM = document.createElement('div');
KM.id = 'jf-km';
KM.className = 'bellmenu jf-km';
KM.popover = 'auto';
KM.setAttribute('role', 'dialog');
KM.setAttribute('aria-label', 'Corregir la hora del kill');
document.body.append(KM);
function setKill(b, t) {
const s = KILLS.get(), now = Date.now();
for (const [k, v] of Object.entries(s.k)) { const x = BY.get(+k.split('|')[1]); if (!x || now > v + x.cyc + WIN + KEEP) delete s.k[k]; }   // limpieza
if (t == null) delete s.k[kkey(b)]; else s.k[kkey(b)] = t;
KILLS.set(s);
}
function kill(b) { openKm(b, timer(b, Date.now())?.src !== 'vos'); }
function openKm(b, fresh) {
if (km && KM.matches(':popover-open')) KM.hidePopover();   // comparte el anterior antes de abrir este
const now = Date.now();
km = { b, base: now, prev: KILLS.get().k[kkey(b)] };
if (fresh) { setKill(b, now); paint(); }
KM.innerHTML = `<p class="bm-t"><b>${esc(gname(b))}</b> · ${fresh ? '¿hace cuánto cayó?' : 'tu kill'}</p>
${fresh ? `<div class="bm-leads jf-offs" role="group" aria-label="Hace cuánto lo mataste">${[0, 1, 5, 10, 15].map(m => `<button type="button" data-off="${m}">${m ? m + ' min' : 'Recién'}</button>`).join('')}</div>`
: '<div class="jf-fix"><button type="button" class="btn" data-again>Murió de nuevo ahora</button><button type="button" class="btn ghost jf-clear" data-clear>Quitar timer</button></div>'}
<label class="jf-ex">Hora exacta <input type="time" id="jf-ex"></label>
<p class="jf-kw" id="jf-kw"></p>
<div class="bm-f"><span class="hint">${com() === 'compartir' ? `Se comparte con ${esc(serverName(srv()))} al cerrar.` : 'Queda solo en este navegador.'}</span>${fresh ? '<button type="button" class="linkbtn danger" data-undo>Deshacer</button>' : ''}</div>`;
updKm(true);
KM.showPopover();
placeKm();
$(fresh ? '[data-off="0"]' : '[data-again]', KM).focus();
if (fresh) announce(`${gname(b)}: sale ${span(now + b.cyc, now + b.cyc + WIN, now)}`);
}
function updKm(input) {
const { b, base } = km, t = KILLS.get().k[kkey(b)], now = Date.now();
for (const o of KM.querySelectorAll('[data-off]')) o.setAttribute('aria-pressed', String(t === base - o.dataset.off * MIN));
if (input && t) { const p = partsIn(t, displayTz()); $('#jf-ex').value = `${pad(p.h)}:${pad(p.mi)}`; }
const h = Math.floor((now - t) / HOUR);                 // una hora "futura" se toma como de ayer: avisarlo
$('#jf-kw').innerHTML = t ? `Lo mataste ${fmtClock(t, { now })}${h >= 1 ? ` <span class="jf-warn">(eso fue hace ${h} h)</span>` : ''} · sale <b>${span(t + b.cyc, t + b.cyc + WIN, now)}</b>` : '';
}
const placeKm = () => placeAt(KM, $(`#b-${km.b.id} [data-kill]`));
function placeAt(pop, a) {
if (!a) return;
a.scrollIntoView({ block: 'nearest' });
const r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
pop.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
}
/* ---------- ⋯ de cada jefe de campo: fijar arriba u ocultar (lo que no te interesa no compite con lo que sí) ---------- */
const MM = document.createElement('div');
MM.id = 'jf-mm';
MM.className = 'bellmenu jf-mm';
MM.popover = 'auto';
MM.setAttribute('role', 'dialog');
document.body.append(MM);
let mmB = null;
function openMm(b) {
mmB = b;
const fav = favs().has(b.id), oc = ocultos().has(b.id);
MM.setAttribute('aria-label', gname(b));
MM.innerHTML = `<p class="bm-t"><b>${esc(gname(b))}</b></p><p class="jf-mi">Nivel ${b.level} · sale cada ${cycTxt(b.respawnMin)} (${b.respawnSource === 'oficial' ? 'oficial' : 'medido por la comunidad'})</p>
<div class="jf-mm-b"><button type="button" class="btn ghost" data-dv>Ver drops</button>${oc ? '' : `<button type="button" class="btn ghost" data-fav>${fav ? 'Quitar de fijados' : 'Fijar arriba'}</button>`}<button type="button" class="btn ghost" data-ocu>${oc ? 'Mostrar en la lista' : 'Ocultar'}</button></div>`;
MM.showPopover();
placeAt(MM, $(`#b-${b.id} [data-menu]`));
$('button', MM).focus();
}
function setFav(b, on) {
const f = favs();
if (on) f.add(b.id); else f.delete(b.id);
CFG.set({ ...CFG.get(), fav: [...f] });
}
function setOcu(b, on) {
const o = ocultos();
if (on) o.add(b.id); else o.delete(b.id);
OCU.set({ ids: [...o] });
}
MM.addEventListener('click', e => {
const b = mmB;
if (!b) return;
if (e.target.closest('[data-dv]')) { MM.hidePopover(); openDrops(b); return; }
if (e.target.closest('[data-fav]')) {
const on = !favs().has(b.id);
setFav(b, on);
MM.hidePopover();
paint();
toast(on ? `<b>${esc(gname(b))}</b> queda fijado arriba.` : `<b>${esc(gname(b))}</b> vuelve a su lugar.`);
$(`#b-${b.id} [data-menu]`)?.focus();
} else if (e.target.closest('[data-ocu]')) {
const on = !ocultos().has(b.id), L = visRows(), i = L.findIndex(li => +li.dataset.boss === b.id);
setOcu(b, on);
if (on) setFav(b, false);
MM.hidePopover();
paint();
if (on) {
toast(`Ocultaste <b>${esc(gname(b))}</b>. Vuelve desde "ocultos", al final de la lista.`, { ms: 6000, action: { label: 'Deshacer', run: () => { setOcu(b, false); paint(); } } });
(visRows()[Math.min(i, visRows().length - 1)] || $('[data-hid]'))?.focus();
} else {
toast(`<b>${esc(gname(b))}</b> vuelve a la lista.`);
$(`#b-${b.id} [data-menu]`)?.focus();
}
}
});
MM.addEventListener('toggle', e => {
if (e.newState !== 'closed' || !mmB) return;
const back = MM.contains(document.activeElement) || document.activeElement === document.body, id = mmB.id;
mmB = null;
if (back) $(`#b-${id} [data-menu]`)?.focus();
});
function fromHHMM(v, now) {
const [h, mi] = v.split(':').map(Number), tz = displayTz(), p = partsIn(now, tz);
const t = wallToUtc(p.y, p.mo, p.d, h, mi, tz);
if (t <= now + MIN) return t;
const y = new Date(Date.UTC(p.y, p.mo - 1, p.d - 1));
return wallToUtc(y.getUTCFullYear(), y.getUTCMonth() + 1, y.getUTCDate(), h, mi, tz);
}
KM.addEventListener('click', e => {
if (!km) return;
const o = e.target.closest('[data-off]');
if (o) { setKill(km.b, km.base - o.dataset.off * MIN); paint(); updKm(true); return; }
if (e.target.closest('[data-again]')) { const { b, prev } = km; openKm(b, true); km.prev = prev; return; }
if (e.target.closest('[data-clear]')) {
const { b } = km;
setKill(b, null);
if (!timer(b, Date.now())) noneOpen = true;           // sin tu timer y sin Questlog cae en "Sin datos": que no desaparezca
KM.hidePopover();
paint();
toast(`Quitaste tu timer de <b>${esc(gname(b))}</b>${liveMap.has(b.id) ? ': vuelve el dato en vivo' : ''}.`);
$(`#b-${b.id} [data-kill]`)?.focus();
return;
}
if (e.target.closest('[data-undo]')) {
const { b, prev } = km;
setKill(b, prev ?? null);
if (!timer(b, Date.now())) noneOpen = true;
KM.hidePopover();
paint();
toast(prev ? `Deshice: <b>${esc(gname(b))}</b> vuelve a tu kill anterior.` : `Deshice: <b>${esc(gname(b))}</b> vuelve al dato en vivo.`);
$(`#b-${b.id} [data-kill]`)?.focus();
}
});
KM.addEventListener('change', e => {
if (!km || e.target.id !== 'jf-ex' || !e.target.value) return;
setKill(km.b, fromHHMM(e.target.value, Date.now()));
paint();
updKm(false);
});
KM.addEventListener('toggle', e => {
if (e.newState !== 'closed' || !km) return;
const { b, prev } = km, t = KILLS.get().k[kkey(b)], back = KM.contains(document.activeElement) || document.activeElement === document.body;
km = null;
if (t && t !== prev && com() === 'compartir') share(b, t);
if (back) $(`#b-${b.id} [data-kill]`)?.focus();
});
/* ---------- eventos ---------- */
$('#jf-main').addEventListener('click', e => {
if (e.target.closest('[data-gt]')) { noneOpen = !noneOpen; paint(); return; }   // "Sin datos": desplegar o plegar
if (e.target.closest('[data-hid]')) { hidOpen = !hidOpen; paint(); return; }     // ocultos: mostrar o esconder
const li = e.target.closest('[data-boss]'), b = li && BY.get(+li.dataset.boss);
if (!b) return;
const it = e.target.closest('button[data-it]');
if (e.target.closest('[data-kill]')) kill(b);
else if (e.target.closest('[data-menu]')) openMm(b);
else if (e.target.closest('[data-deny]')) deny(b);
else if (it) { if (tipFor === it && e.pointerType !== 'mouse') hideTip(); else showTip(it); }   // tira de los importantes: el toque muestra nombre, grado y chance (otro toque lo saca)
else if (e.target.closest('[data-drops]') || !e.target.closest('button, a, input, select, .bell, .bellmenu')) openDrops(b);   // tocar la fila: sus drops
});
$('#jf-main').addEventListener('pointerover', e => { const el = e.target.closest('[data-it]'); if (e.pointerType === 'mouse' && el && el !== tipFor) showTip(el); });
$('#jf-main').addEventListener('pointerout', e => { if (e.pointerType === 'mouse' && tipFor && !tipFor.contains(e.relatedTarget)) hideTip(); });
$('#jf-main').addEventListener('focusin', e => { if (e.target.matches('[data-it]:focus-visible')) showTip(e.target); });   // foco por toque o clic: lo maneja el click
$('#jf-main').addEventListener('focusout', e => { if (e.target === tipFor) hideTip(); });
addEventListener('scroll', hideTip, { passive: true });
const IP = document.createElement('div');
IP.id = 'jf-ipop';
IP.className = 'bellmenu jf-ipop';
IP.popover = 'auto';
IP.setAttribute('role', 'dialog');
IP.setAttribute('aria-label', 'De dónde salen los horarios');
IP.innerHTML = '<p>Datos de telemetría de jugadores y reportes; no son horarios oficiales.</p><button type="button" class="linkbtn" data-hub="credits">Fuentes y créditos</button>';
document.body.append(IP);
$('#jf-i').addEventListener('click', () => { IP.showPopover(); placeAt(IP, $('#jf-i')); $('#jf-i').setAttribute('aria-expanded', 'true'); });
IP.addEventListener('toggle', e => { if (e.newState === 'closed') $('#jf-i').setAttribute('aria-expanded', 'false'); });
$('#jf-fbtn').addEventListener('click', () => {
const o = $('#jf-bar').classList.toggle('open');
$('#jf-fbtn').setAttribute('aria-expanded', String(o));
if (o) $('#jf-q').focus();
});
$('#jf-main').addEventListener('keydown', e => {
if (e.key === 'Escape' && tipFor) { hideTip(); return; }
if (e.key === 'Enter' && e.target.matches('[data-boss]')) { e.preventDefault(); openDrops(BY.get(+e.target.dataset.boss)); return; }   // Enter en la fila: sus drops
if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || e.altKey || e.ctrlKey || e.metaKey) return;
const L = visRows(), i = L.indexOf(document.activeElement?.closest?.('[data-boss]'));
if (i < 0) return;
e.preventDefault();
L[Math.max(0, Math.min(L.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
});
$('#jf-main').addEventListener('focusin', e => {
const li = e.target.closest('[data-boss]');
if (!li) return;
for (const x of $('#jf-main').querySelectorAll('[data-boss][tabindex="0"]')) if (x !== li) x.tabIndex = -1;
li.tabIndex = 0;
roveId = li.dataset.boss;
});
$('#jf-q').addEventListener('input', () => { paintBar(); paint(); });
$('#jf-ord').addEventListener('change', e => { CFG.set({ ...CFG.get(), orden: e.target.value }); paint(); });
$('#jf-q').addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.value) { e.target.value = ''; paintBar(); paint(); } });
$('#jf-com').addEventListener('click', e => {
const x = e.target.closest('[data-com]')?.dataset.com;
if (!x || !srv()) return;
CFG.set({ ...CFG.get(), com: x });
onCom();
});
function onCom() {
feed = null; feedTxt = ''; feedAt = 0; comDown = false;
nextPoll = com() === 'off' ? Infinity : 0;
paint();
paintCom();
if (com() !== 'off') poll();
}
let lastSrv = srv();
function onProfile() {
if (srv() === lastSrv) { paintBar(); paint(); return; }
lastSrv = srv();
loadLive();
held = !!srv() && !live;
paintBar();
paint();
paintSt();
pullLive();
onCom();
}
function focusBoss(b) {
if (b.fac !== viewFac()) setFaccion(b.fac);           // global: emite 'profile' (repinta) y avisa si no es la de tu server
if (!timer(b, Date.now())) noneOpen = true;           // que su fila se vea aunque esté en un grupo plegado
if (ocultos().has(b.id)) hidOpen = true;
if (!$(`#b-${b.id}`) || !b.hay.includes(norm($('#jf-q').value).trim())) $('#jf-q').value = '';
paint();
const li = $(`#b-${b.id}`);
if (!li) return;
li.scrollIntoView({ block: 'center' });
li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash');
li.focus();
}
registerPalette('jefes', {
group: 'Jefe', items: () => {
const now = Date.now();
return BOSSES.map(b => {
const tm = timer(b, now), s = tm && state(tm, now);
const when = !tm ? 'sin datos' : s === 'stale' ? 'sin confirmar (mantenimiento)' : s === 'spawns' ? `sale ${fmtClock(tm.start, { now })} · en ${fmtLeft(tm.start - now)}`
: s === 'alive' ? `vivo desde ${fmtClock(tm.start, { now })}` : s === 'window' ? 'puede estar' : 'debería estar';
return { id: 'jefe-' + b.id, title: gname(b), sub: `${FACCION[b.fac]} · ${tm && tm.src !== 'ql' ? SRC_TXT[tm.src].toLowerCase() + ', ' : ''}${when}`, kw: `${gboth(b)} ${gboth(b, 'teleport')} jefe`, icon: 'i-boss', run: () => focusBoss(b) };
});
},
});
registerKey({
key: 'k', label: 'Lo maté: el jefe enfocado (en Jefes)', run: () => {
const id = document.activeElement?.closest?.('[data-boss]')?.dataset.boss;
if (id) kill(BY.get(+id));
else toast('Primero enfocá un jefe (con Tab, o buscalo con <kbd>/</kbd>) y después apretá <b>K</b>.');
},
});
function fromHash() {
const m = location.hash.match(/^#b-(\d+)$/), b = m && BY.get(+m[1]);
if (b) focusBoss(b);
}
loadLive();
held = !!srv() && !live;
if (com() !== 'off') $('#jf-more').open = true;          // si la comunidad está prendida, que se vea
paintBar();
paint();
paintSt();
paintCom();
pullLive();
nextPoll = com() === 'off' ? Infinity : 0;
onTick(now => {
if (now >= nextChange) paint();
else if (now >= nextCyc) paintCyc(now);
if (document.hidden) return;                           // con la ventana flotante el tick corre oculto: acá no se consulta
if (now >= nextLive) pullLive();
if (now >= nextPoll) poll();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - liveTry > 10e3) pullLive(); });
on('structure', paint);
on('prefs', paint);
on('gamelang', () => { paint(); if (dpB) paintDrops(); });
on('bells', () => publish(Date.now(), KILLS.get().k));
on('profile', onProfile);
onStore('hub-kills', paint);
onStore('hub-jefes', onCom);
onStore('hub-jefes-ocultos', paint);
onStore('pets-owned', () => { paint(); if (dpB) paintDrops(); });   // la colección del Bestiario (Pets, otra pestaña o el sync)
addEventListener('hashchange', fromHash);
if (location.hash) setTimeout(fromHash, 60);
