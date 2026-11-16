import {
$, esc, on, onTick, onStore, bind, fmtClock, fmtLeft, leftNext, toast, announce, store, versioned, norm, profile, serverName,
FACCION, ROOT, SCHEDULE, maintWindows, bellButton, getBell, setTimers, registerPalette, registerKey, partsIn, wallToUtc, displayTz,
HUB_API, LNA_MSG, lnaBlocked, MIN, HOUR, DAY,
} from './core.js?v=797674b03b';
const D = JSON.parse($('#page-data').textContent), WIN = D.windowMin * MIN, KEEP = 30 * MIN, TOL = 3 * MIN;
const BOSSES = D.bosses.map(b => ({ ...b, fac: b.faction === 'Elyos' ? 'elyos' : 'asmodian', cyc: b.respawnMin * MIN, world: b.respawnSource === 'oficial', hay: norm(`${b.name} ${b.nameEn} ${b.teleport || ''}`) }));
const BY = new Map(BOSSES.map(b => [b.id, b]));
const KILLS = versioned('hub-kills', 1, { k: {} });          // {"<server>|<jefe>": epoch ms del kill}
const CFG = versioned('hub-jefes', 1, { com: 'off' });       // comunidad: off | ver | compartir
const MAINT = SCHEDULE.maintenance?.fieldBossesAfterMaintenance !== 'keep';
const POLL = 30e3, RETRY = 60e3, LIVE_POLL = 60e3, LIVE_VALID = 15 * MIN;
const pad = n => String(n).padStart(2, '0');
const srv = () => profile().server || 0;
const myFac = () => profile().faccion || 'elyos';
const kkey = b => `${srv()}|${b.id}`;
const bellId = b => `jefe:${srv()}:${b.id}`;
const span = (a, b, now) => `${fmtClock(a, { now })}–${fmtClock(b, { now, day: false })}`;
const cycTxt = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + m % 60 : ''}`;
const CONF = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const tpTxt = t => { const m = /^(\d+)\.\s*(.*)$/.exec(t || ''); return !t ? '' : m ? `Teleport ${m[1]} · ${m[2]}` : `Teleport · ${t}`; };
const jLeft = (ms, n) => [fmtLeft(ms), n + leftNext(ms)];
const SRC_TXT = { ql: 'Questlog', vos: 'Vos', com: 'Comunidad' };
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
if (!j) toast(`Comunidad sin conexión: el kill de <b>${esc(b.name)}</b> quedó solo en tu navegador.`, { ms: 7000 });
else if (j.err) toast(`La comunidad no tomó el kill de <b>${esc(b.name)}</b>: ${esc(j.err)}. Tu timer sigue igual.`, { ms: 7000 });
else toast(`Compartí el kill de <b>${esc(b.name)}</b> con ${esc(serverName(srv()))}.`);
}
async function deny(b) {
const j = await send('/api/kills/deny', b);
if (!j) toast('Comunidad sin conexión: no pude mandar el "No estaba".');
else if (j.err) toast(`No se anotó: ${esc(j.err)}.`, { ms: 7000 });
else toast(`Anotado: <b>${esc(b.name)}</b> no estaba. Le resta confianza a ese reporte.`);
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
let fac = new URLSearchParams(location.search).get('f');
const viewFac = () => FACCION[fac] ? fac : myFac();
let nextChange = Infinity, roveId = 0;
let held = false;
function row(b, tm, now) {
const s = tm ? state(tm, now) : 'none', ap = tm?.src === 'com' ? '≈ ' : '';
const at = tm && ap + fmtClock(tm.start, { now }), win = tm && ap + span(tm.start, tm.end, now);   // Questlog da la hora; tu kill, la ventana
const src = tm?.src === 'vos' ? '<em class="src vos" title="Tu “Lo maté” es más nuevo que el dato de Questlog">Vos</em> · '
: tm?.src === 'com' ? `<em class="src com" title="Lo reportan otros jugadores de ${esc(serverName(srv()))}. No es un horario oficial.">≈ Comunidad · ${CONF[tm.c.confidence] || tm.c.confidence}</em> · ` : '';
const w = {
alive: `<b class="jf-big">Vivo</b> <span class="jf-at">desde ${at} · <span data-ago="${tm?.start}"></span></span>`,
due: `<b class="jf-big">Debería estar</b> <span class="jf-at">desde ${at} · <span data-ago="${tm?.start}"></span></span>`,
window: `<b class="jf-big">Puede estar</b> <span class="jf-at">${win} · cierra en <span class="cd" data-left="${tm?.end}"></span></span>`,
spawns: `<span class="jf-l">Sale en</span> <b class="jf-big cd" data-left="${tm?.start}"></b> <span class="jf-at"><i class="jf-sep">· </i>${tm?.src === 'ql' ? at : win}</span>`,
stale: `<s class="jf-big">${at}</s> <span class="jf-at">Sin confirmar (hubo mantenimiento)</span>`,
none: '<b class="jf-big">Sin datos</b>',
}[s];
const denyBtn = tm?.src === 'com' && s !== 'stale' && com() === 'compartir'
? '<button type="button" class="btn ghost jf-deny" data-deny title="Fuiste y no estaba muerto, o el reporte no cierra: le resta confianza">No estaba</button>' : '';
const fix = tm?.src === 'vos';                         // con tu timer, el botón corrige (nunca lo pisa sin preguntar)
return `<li class="jf-r s-${s}${tm ? ' src-' + tm.src : ''}${b.world ? ' jf-wc' : ''}" id="b-${b.id}" data-boss="${b.id}" tabindex="-1">
<span class="jf-n"><b>${esc(b.name)}</b><small>${src}ciclo ${cycTxt(b.respawnMin)} <i title="${b.respawnSource === 'oficial' ? 'Ciclo del parche Global oficial' : 'Ciclo medido por la comunidad en Global (no hay aviso oficial)'}">${b.respawnSource === 'oficial' ? 'oficial' : 'medido'}</i>${b.teleport ? ` · ${esc(tpTxt(b.teleport))}` : ''}</small></span>
<span class="jf-w">${w}</span>
<span class="jf-a">${denyBtn}<button type="button" class="btn ghost jf-kill" data-kill="${fix ? 'fix' : 'new'}" title="${fix ? 'Corregir la hora de tu kill, anotar uno nuevo o quitar tu timer' : 'Lo mataste y Questlog no se enteró: anotá tu kill'}">${fix ? 'Corregir' : 'Lo maté'}</button></span><span class="jf-b"></span></li>`;
}
function paint() {
if (held) return;
const now = Date.now(), f = viewFac(), q = norm($('#jf-q').value).trim(), hit = b => !q || b.hay.includes(q), K = KILLS.get().k;
const fe = document.activeElement, fb = fe?.closest?.('[data-boss]')?.dataset.boss;
const fsel = !fb ? null : fe.matches('[data-kill]') ? '[data-kill]' : fe.matches('.bell') ? '.bell' : fe.matches('[data-deny]') ? '[data-deny]' : null;
const world = [], rest = [];
nextChange = Infinity;
for (const b of BOSSES) {
const tm = timer(b, now, K);
if (tm) for (const x of [tm.start, tm.end, tm.end + KEEP, tm.maint]) if (x > now && x < nextChange) nextChange = x;
if (b.fac === f) (b.world ? world : rest).push([b, tm]);
}
const rk = ([, tm]) => tm ? RANK[state(tm, now)] : RANK.none;
rest.sort((a, c) => rk(a) - rk(c) || ((a[1]?.start || 0) - (c[1]?.start || 0)) * (rk(a) === RANK.alive ? -1 : 1));
publish(now, K);
const shown = rest.filter(([b]) => hit(b));
$('#jf-world').hidden = $('#jf-all').hidden = false;   // ocultas hasta el primer pintado: así nada visible se corre (CLS 0)
$('#jf-world-h').innerHTML = `Jefes de mundo · ${FACCION[f]}`;
$('#jf-world-l').innerHTML = world.map(([b, tm]) => row(b, tm, now)).join('');
$('#jf-all-h').innerHTML = `Jefes de campo · ${FACCION[f]} <small>${shown.length}</small>${f !== myFac() ? ' <em class="tag">zona enemiga (por la Grieta)</em>' : ''}`;
$('#jf-all-l').innerHTML = shown.map(([b, tm]) => row(b, tm, now)).join('')
|| `<li class="jf-empty">Ningún jefe ${FACCION[f]} con “${esc($('#jf-q').value)}”.</li>`;
for (const li of $('#jf-main').querySelectorAll('[data-boss]')) {
const b = BY.get(+li.dataset.boss), l = $('[data-left]', li), a = $('[data-ago]', li);
if (l) { const t = +l.dataset.left; bind(l, n => jLeft(t - n, n)); }
if (a) bind(a, ago(+a.dataset.ago));
$('.jf-b', li).append(bellButton(bellId(b), b.name, /s-(none|stale)/.test(li.className) ? { hint: 'Suena cuando haya timer.' } : {}));
}
($(`#b-${roveId}`) || $('#jf-main [data-boss]'))?.setAttribute('tabindex', '0');   // una fila alcanzable con Tab; ↑↓ recorre
if (fb) ($(`#b-${fb} ${fsel || ''}`.trim()) || null)?.focus();
if (km && KM.matches(':popover-open')) placeKm();
}
let lastPub = null;
function publish(now, K) {
const pf = myFac(), list = [];
for (const b of BOSSES) {
const tm = timer(b, now, K);
if (!tm || tm.stale) continue;
const s = state(tm, now), w = b.world && b.fac === pf;
if (!w && tm.src !== 'vos' && !getBell(bellId(b))) continue;
const end = tm.src === 'ql' && s !== 'spawns' ? (w && live ? Math.max(tm.end, live.fetchedAt + LIVE_VALID) : tm.end) : tm.end;
if (end <= now) continue;
list.push({
id: bellId(b), label: b.name, ...(w ? { short: /Gartua|Lagta/.exec(b.name)?.[0] } : {}), start: tm.start, end, ...(tm.maint ? { until: tm.maint } : {}), href: ROOT + 'jefes/#b-' + b.id,
note: tpTxt(b.teleport), nowText: 'Ya debería estar', src: SRC_TXT[tm.src], ...(tm.src === 'com' ? { approx: true } : {}),
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
: liveErr === 'stale' ? 'Questlog no responde: es lo último que tuvo.' : '';
el.innerHTML = (live ? '<span title="Lo arma Questlog con lo que ve su app de escritorio en las partidas de sus usuarios. Puede fallar o no saber de algún jefe.">Según <b>Questlog</b> (telemetría de jugadores), actualizado <span id="jf-age"></span></span>'
: held ? `Buscando los timers de ${esc(serverName(s))}…` : 'Todavía no hay datos de Questlog para tu server.') + (warn ? ` <span class="jf-warn">${esc(warn)}</span>` : '');
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
const f = viewFac();
for (const b of document.querySelectorAll('#jf-fac button')) b.setAttribute('aria-pressed', String(b.dataset.fac === f));
const pr = profile(), q = $('#jf-q').value.trim();
$('#jf-fbtn').textContent = `Filtros · ${FACCION[f]}${q ? ` · “${q}”` : ''}`;
$('#jf-lead').innerHTML = `${pr.server ? `<b>${esc(serverName(pr.server))}</b> · ` : ''}Cuándo sale cada jefe, en vivo. Tocá la campana y te aviso, también desde otras páginas.`;
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
KM.innerHTML = `<p class="bm-t"><b>${esc(b.name)}</b> · ${fresh ? '¿hace cuánto cayó?' : 'tu kill'}</p>
${fresh ? `<div class="bm-leads jf-offs" role="group" aria-label="Hace cuánto lo mataste">${[0, 1, 5, 10, 15].map(m => `<button type="button" data-off="${m}">${m ? m + ' min' : 'Recién'}</button>`).join('')}</div>`
: '<div class="jf-fix"><button type="button" class="btn" data-again>Murió de nuevo ahora</button><button type="button" class="btn ghost jf-clear" data-clear>Quitar timer</button></div>'}
<label class="jf-ex">Hora exacta <input type="time" id="jf-ex"></label>
<p class="jf-kw" id="jf-kw"></p>
<div class="bm-f"><span class="hint">${com() === 'compartir' ? `Se comparte con ${esc(serverName(srv()))} al cerrar.` : 'Queda solo en este navegador.'}</span>${fresh ? '<button type="button" class="linkbtn danger" data-undo>Deshacer</button>' : ''}</div>`;
updKm(true);
KM.showPopover();
placeKm();
$(fresh ? '[data-off="0"]' : '[data-again]', KM).focus();
if (fresh) announce(`${b.name}: sale ${span(now + b.cyc, now + b.cyc + WIN, now)}`);
}
function updKm(input) {
const { b, base } = km, t = KILLS.get().k[kkey(b)], now = Date.now();
for (const o of KM.querySelectorAll('[data-off]')) o.setAttribute('aria-pressed', String(t === base - o.dataset.off * MIN));
if (input && t) { const p = partsIn(t, displayTz()); $('#jf-ex').value = `${pad(p.h)}:${pad(p.mi)}`; }
const h = Math.floor((now - t) / HOUR);                 // una hora "futura" se toma como de ayer: avisarlo
$('#jf-kw').innerHTML = t ? `Lo mataste ${fmtClock(t, { now })}${h >= 1 ? ` <span class="jf-warn">(eso fue hace ${h} h)</span>` : ''} · sale <b>${span(t + b.cyc, t + b.cyc + WIN, now)}</b>` : '';
}
function placeKm() {
const a = $(`#b-${km.b.id} [data-kill]`);
if (!a) return;
a.scrollIntoView({ block: 'nearest' });
const r = a.getBoundingClientRect(), w = KM.offsetWidth, h = KM.offsetHeight;
KM.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
KM.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
}
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
KM.hidePopover();
paint();
toast(`Quitaste tu timer de <b>${esc(b.name)}</b>${liveMap.has(b.id) ? ': vuelve el dato de Questlog' : ''}.`);
$(`#b-${b.id} [data-kill]`)?.focus();
return;
}
if (e.target.closest('[data-undo]')) {
const { b, prev } = km;
setKill(b, prev ?? null);
KM.hidePopover();
paint();
toast(prev ? `Deshice: <b>${esc(b.name)}</b> vuelve a tu kill anterior.` : `Deshice: <b>${esc(b.name)}</b> vuelve al dato de Questlog.`);
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
const li = e.target.closest('[data-boss]'), b = li && BY.get(+li.dataset.boss);
if (!b) return;
if (e.target.closest('[data-kill]')) kill(b);
else if (e.target.closest('[data-deny]')) deny(b);
});
$('#jf-fac').addEventListener('click', e => {
const x = e.target.closest('[data-fac]')?.dataset.fac;
if (!x) return;
fac = x;
history.replaceState(null, '', (x === myFac() ? location.pathname : `?f=${x}`) + location.hash);
paintBar();
paint();
if (x !== myFac()) toast(`Viendo ${FACCION[x]} · tu perfil sigue ${FACCION[myFac()]}.`);   // filtro de vista: no cambia el perfil
});
$('#jf-fbtn').addEventListener('click', () => {
const o = $('#jf-flt').classList.toggle('open');
$('#jf-fbtn').setAttribute('aria-expanded', String(o));
});
$('#jf-main').addEventListener('keydown', e => {
if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || e.altKey || e.ctrlKey || e.metaKey) return;
const L = [...$('#jf-main').querySelectorAll('[data-boss]')], i = L.indexOf(document.activeElement?.closest?.('[data-boss]'));
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
function onProfile() {
loadLive();
held = !!srv() && !live;
paintBar();
paint();
paintSt();
pullLive();
onCom();
}
function focusBoss(b) {
if (b.fac !== viewFac()) { fac = b.fac; paintBar(); }
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
return { id: 'jefe-' + b.id, title: b.name, sub: `${FACCION[b.fac]} · ${tm && tm.src !== 'ql' ? SRC_TXT[tm.src].toLowerCase() + ', ' : ''}${when}`, kw: `${b.nameEn} ${b.teleport || ''} jefe`, icon: 'i-boss', run: () => focusBoss(b) };
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
if (document.hidden) return;                           // con la ventana flotante el tick corre oculto: acá no se consulta
if (now >= nextLive) pullLive();
if (now >= nextPoll) poll();
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - liveTry > 10e3) pullLive(); });
on('structure', paint);
on('prefs', paint);
on('bells', () => publish(Date.now(), KILLS.get().k));
on('profile', onProfile);
onStore('hub-kills', paint);
onStore('hub-jefes', onCom);
addEventListener('hashchange', fromHash);
if (location.hash) setTimeout(fromHash, 60);
