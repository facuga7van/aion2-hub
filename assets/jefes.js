import {
$, esc, on, onTick, onStore, bind, fmtClock, fmtLeft, leftNext, toast, announce, store, versioned, norm, profile, serverName,
FACCION, ROOT, SCHEDULE, maintWindows, bellButton, getBell, setTimers, registerPalette, registerKey, partsIn, wallToUtc, displayTz, MIN,
} from './core.js?v=d8fdc4f8e6';
const D = JSON.parse($('#page-data').textContent), WIN = D.windowMin * MIN, KEEP = 30 * MIN, TOL = 3 * MIN;
const BOSSES = D.bosses.map(b => ({ ...b, fac: b.faction === 'Elyos' ? 'elyos' : 'asmodian', cyc: b.respawnMin * MIN, hay: norm(`${b.name} ${b.nameEn} ${b.teleport || ''}`) }));
const BY = new Map(BOSSES.map(b => [b.id, b]));
const LOCAL_API = store.get('hub-api', '');
const API = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(LOCAL_API) ? LOCAL_API : 'https://mora-server.tail3b8ec1.ts.net:8443';
const KILLS = versioned('hub-kills', 1, { k: {} });          // {"<server>|<jefe>": epoch ms del kill}
const CFG = versioned('hub-jefes', 1, { com: 'off' });       // comunidad: off | ver | compartir
const MAINT = SCHEDULE.maintenance?.fieldBossesAfterMaintenance !== 'keep';
const POLL = 30e3, RETRY = 60e3;
const pad = n => String(n).padStart(2, '0');
const srv = () => profile().server || 0;
const kkey = b => `${srv()}|${b.id}`;
const bellId = b => `jefe:${srv()}:${b.id}`;
const span = (a, b, now) => `${fmtClock(a, { now })}–${fmtClock(b, { now, day: false })}`;
const cycTxt = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ' ' + m % 60 : ''}`;
const CONF = { alta: 'Alta', media: 'Media', baja: 'Baja' };
const ago = ts => n => { const m = Math.max(0, Math.floor((n - ts) / MIN)); return [m < 1 ? 'recién' : `hace ${m < 60 ? m + ' min' : `${Math.floor(m / 60)}h ${pad(m % 60)}m`}`, ts + (m + 1) * MIN]; };
const firstMaint = (t, to) => MAINT ? (maintWindows(t, to).find(w => w.start > t)?.start || 0) : 0;
/* ---------- comunidad ---------- */
let feed = null, feedTxt = '', feedAt = 0, comDown = false, nextPoll = 0, inflight = false;
const com = () => srv() ? CFG.get().com : 'off';
function cid() {
let c = store.get('hub-cid', null);
if (!c) { c = crypto.randomUUID(); store.set('hub-cid', c); }
return c;
}
async function api(path, body) {
try {
const r = await fetch(API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(3000) }
: { cache: 'no-cache', signal: AbortSignal.timeout(3000) });        // no-cache: el navegador revalida con If-None-Match (ETag) y el 304 no baja nada
return { r, txt: await r.text() };
} catch { return null; }
}
async function poll() {
const s = srv();
if (com() === 'off' || inflight) return;
inflight = true;
nextPoll = Date.now() + POLL;
const res = await api(`/api/kills?server=${s}`);
inflight = false;
const first = held;
held = false;
if (s !== srv() || com() === 'off') { if (first) paint(); return; }   // cambió algo mientras esperaba
const ok = res?.r.ok, was = comDown;
comDown = !ok;
if (!ok) { nextPoll = Date.now() + RETRY; feed = null; feedTxt = ''; paint(); paintSt(); return; }
feedAt = Date.now();
const changed = res.txt !== feedTxt;
if (changed) { feedTxt = res.txt; feed = new Map(JSON.parse(res.txt).bosses.map(c => [c.boss, c])); }
if (changed || first || was) paint();
paintSt();
}
async function send(path, b, extra) {
const res = await api(path, { server: srv(), boss: b.id, cid: cid(), ...extra });
if (!res) { comDown = true; feed = null; feedTxt = ''; nextPoll = Date.now() + RETRY; paint(); paintSt(); return null; }
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
function timer(b, now) {
const t = KILLS.get().k[kkey(b)], c = feed?.get(b.id);
const mine = t ? { src: 'vos', t, start: t + b.cyc, end: t + b.cyc + WIN } : null;
const cm = c ? { src: 'com', t: c.killedAt, start: c.windowStart, end: c.windowEnd, c } : null;
const tm = mine && !(cm && cm.t > mine.t + TOL && now >= mine.end) ? mine : cm;
if (!tm || now >= tm.end + KEEP) return null;
tm.maint = firstMaint(tm.t, tm.end + KEEP);
tm.stale = MAINT && ((tm.maint && tm.maint <= now) || !!tm.c?.stale);
tm.alt = tm === mine && cm && Math.abs(cm.t - mine.t) > TOL ? cm : null;   // la comunidad dice otra cosa
tm.agree = tm === mine && cm && !tm.alt ? cm : null;
return tm;
}
const state = (tm, now) => tm.stale ? 'stale' : now < tm.start ? 'espera' : now < tm.end ? 'ventana' : 'vivo';
const RANK = { ventana: 0, espera: 1, vivo: 2, stale: 3 };
/* ---------- pintar ---------- */
let fac = new URLSearchParams(location.search).get('f');
const viewFac = () => FACCION[fac] ? fac : profile().faccion || 'elyos';
let nextChange = Infinity, lastAct = [];
let held = com() !== 'off';
function row(b, tm, now) {
const s = tm ? state(tm, now) : 'none', approx = tm?.src === 'com' ? '≈ ' : '';
const facTag = b.fac !== viewFac() ? `<em class="jf-of">${FACCION[b.fac]}</em> · ` : '';
const srcTag = !tm ? '<em class="src none">Sin reporte</em>' : tm.src === 'vos' ? '<em class="src vos">Vos</em>'
: `<em class="src com" title="Lo reportan otros jugadores de ${esc(serverName(srv()))}. No es un horario oficial.">≈ Comunidad · ${CONF[tm.c.confidence] || tm.c.confidence}</em>`;
const srcSub = tm?.src === 'com' ? `<small>${tm.c.reporters} reporte${tm.c.reporters > 1 ? 's' : ''}${tm.c.denials ? ` · ${tm.c.denials} "no estaba"` : ''} · <span data-ago="${tm.c.lastReportAt}"></span></small>`
: tm?.alt ? `<small>≈ comunidad ${span(tm.alt.start, tm.alt.end, now)}</small>`
: tm?.agree ? '<small>≈ comunidad coincide</small>' : '';
const w = !tm ? '<span class="jf-wt">¿Lo viste morir?</span>'
: s === 'stale' ? `<s class="jf-wt">${approx}${span(tm.start, tm.end, now)}</s><small>Sin confirmar (hubo mantenimiento)</small>`
: `<time class="jf-wt">${approx}${span(tm.start, tm.end, now)}</time><small>${{ espera: 'revive en', ventana: 'Puede estar', vivo: 'Debería estar vivo' }[s]}</small>`;
const denyBtn = tm?.src === 'com' && s !== 'stale' && com() === 'compartir'
? `<button type="button" class="btn ghost jf-deny" data-deny title="Fuiste y no estaba muerto, o el reporte no cierra: le resta confianza">No estaba</button>` : '';
return `<li class="jf-r s-${s}${tm ? ' src-' + tm.src : ''}" id="b-${b.id}" data-boss="${b.id}" tabindex="-1">
<span class="jf-n"><b>${esc(b.name)}</b><small>${facTag}ciclo ${cycTxt(b.respawnMin)} <i title="${b.respawnSource === 'oficial' ? 'Ciclo del parche Global oficial' : 'Ciclo medido por la comunidad en Global (no hay aviso oficial)'}">${b.respawnSource === 'oficial' ? 'oficial' : 'medido'}</i>${b.teleport ? ` · TP ${esc(b.teleport)}` : ''}</small></span>
<span class="jf-s">${srcTag}${srcSub}</span>
<span class="jf-w">${w}</span>
<span class="jf-c cd"></span>
<span class="jf-a">${denyBtn}<button type="button" class="btn jf-kill" data-kill>Lo maté</button></span><span class="jf-b"></span></li>`;
}
function paint() {
if (held) return;
const now = Date.now(), f = viewFac(), q = norm($('#jf-q').value).trim(), hit = b => !q || b.hay.includes(q);
const fe = document.activeElement, fb = fe?.closest?.('[data-boss]')?.dataset.boss;
const fsel = !fb ? null : fe.matches('[data-kill]') ? '[data-kill]' : fe.matches('.bell') ? '.bell' : fe.matches('[data-deny]') ? '[data-deny]' : null;
const act = [], idle = [];
nextChange = Infinity;
for (const b of BOSSES) {
const tm = timer(b, now);
if (tm) {
act.push([b, tm]);
for (const x of [tm.start, tm.end, tm.end + KEEP, tm.maint]) if (x > now && x < nextChange) nextChange = x;
} else if (b.fac === f) idle.push(b);
}
act.sort(([, a], [, b]) => RANK[state(a, now)] - RANK[state(b, now)] || (state(a, now) === 'vivo' ? b.start - a.start : a.start - b.start));
lastAct = act;
publish(act, now);
const shown = act.filter(([b]) => hit(b)), idleShown = idle.filter(hit);
$('#jf-act').hidden = !shown.length;
$('#jf-idle').hidden = false;                          // oculta hasta el primer pintado: así nada visible se corre (CLS 0)
$('#jf-act-h').innerHTML = `Con timer <small>${shown.length}</small>`;
$('#jf-idle-h').innerHTML = `Sin timer · ${FACCION[f]} <small>${idleShown.length}</small>${f !== (profile().faccion || 'elyos') ? ' <em class="tag">zona enemiga (por la Grieta)</em>' : ''}`;
$('#jf-act-l').innerHTML = shown.map(([b, tm]) => row(b, tm, now)).join('');
$('#jf-idle-l').innerHTML = idleShown.map(b => row(b, null, now)).join('')
|| `<li class="jf-empty">${q ? `Ningún jefe ${FACCION[f]} sin timer con “${esc($('#jf-q').value)}”.` : 'Todos los jefes de esta facción tienen timer.'}</li>`;
for (const [b, tm] of shown) {
const li = $(`#b-${b.id}`), s = state(tm, now), cd = $('.jf-c', li);
if (s === 'espera') bind(cd, n => [fmtLeft(tm.start - n), n + leftNext(tm.start - n)]);
else if (s !== 'stale') bind(cd, ago(tm.start));
const a = $('[data-ago]', li);
if (a) bind(a, ago(+a.dataset.ago));
}
for (const li of $('#jf-main').querySelectorAll('[data-boss]')) {
const b = BY.get(+li.dataset.boss);
$('.jf-b', li).append(bellButton(bellId(b), b.name));
}
if (fb) ($(`#b-${fb} ${fsel || ''}`.trim()) || null)?.focus();
if (km && KM.matches(':popover-open')) placeKm();
}
let lastPub = null;
function publish(act, now) {
const list = act.filter(([b, tm]) => !tm.stale && now < tm.end && (tm.src === 'vos' || getBell(bellId(b)))).map(([b, tm]) => ({
id: bellId(b), label: b.name, start: tm.start, end: tm.end, ...(tm.maint ? { until: tm.maint } : {}), href: ROOT + 'jefes/#b-' + b.id,
note: b.teleport ? 'TP ' + b.teleport : '', nowText: 'Ventana de respawn abierta', ...(tm.src === 'com' ? { approx: true } : {}),
}));
const s = JSON.stringify(list);
if (s === lastPub) return;
lastPub = s;
if (s !== JSON.stringify(store.get('hub-timers', []))) setTimers(list);
}
function paintSt() {
const el = $('#jf-st'), c = com(), name = esc(serverName(srv()) || '');
for (const b of document.querySelectorAll('#jf-com button')) { b.setAttribute('aria-pressed', String(b.dataset.com === c)); b.disabled = !srv(); }
if (!srv()) el.innerHTML = 'Tus timers quedan en este navegador. Para ver y compartir reportes, elegí tu server en <button type="button" class="linkbtn" data-hub="settings">Ajustes</button>.';
else if (c === 'off') el.innerHTML = 'Comunidad apagada: nada sale de tu navegador.';
else if (comDown) el.innerHTML = '<b class="jf-down">Comunidad sin conexión</b>: sigo con tus timers. Reintento en 1 min.';
else if (!feedAt) el.innerHTML = `Conectando con los reportes de ${name}…`;
else {
el.innerHTML = `Reportes de ${name} · actualizado <span id="jf-age"></span>${c === 'compartir' ? ' · tus "Lo maté" se comparten (anónimo)' : ''}`;
bind($('#jf-age'), ago(feedAt));
}
}
function paintBar() {
const f = viewFac();
for (const b of document.querySelectorAll('#jf-fac button')) b.setAttribute('aria-pressed', String(b.dataset.fac === f));
const pr = profile();
$('#jf-lead').innerHTML = `${pr.server ? `<b>${esc(serverName(pr.server))}</b> · ` : ''}Tocá <b>Lo maté</b> cuando cae y te aviso cuándo revive: ciclo del jefe más una ventana de ${D.windowMin} min.`;
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
function kill(b) {
if (km && KM.matches(':popover-open')) KM.hidePopover();   // comparte el anterior antes de abrir este
const now = Date.now();
km = { b, base: now, prev: KILLS.get().k[kkey(b)] };
setKill(b, now);
paint();
KM.innerHTML = `<p class="bm-t"><b>${esc(b.name)}</b> · ¿hace cuánto cayó?</p>
<div class="bm-leads jf-offs" role="group" aria-label="Hace cuánto lo mataste">${[0, 1, 5, 10, 15].map(m => `<button type="button" data-off="${m}">${m ? m + ' min' : 'Recién'}</button>`).join('')}</div>
<label class="jf-ex">Hora exacta <input type="time" id="jf-ex"></label>
<p class="jf-kw" id="jf-kw"></p>
<div class="bm-f"><span class="hint">${com() === 'compartir' ? `Se comparte con ${esc(serverName(srv()))} al cerrar.` : 'Queda solo en este navegador.'}</span><button type="button" class="linkbtn danger" data-undo>Deshacer</button></div>`;
updKm(true);
KM.showPopover();
placeKm();
$('[data-off="0"]', KM).focus();
announce(`${b.name}: revive ${span(now + b.cyc, now + b.cyc + WIN, now)}`);
}
function updKm(input) {
const { b, base } = km, t = KILLS.get().k[kkey(b)], now = Date.now();
for (const o of KM.querySelectorAll('[data-off]')) o.setAttribute('aria-pressed', String(t === base - o.dataset.off * MIN));
if (input && t) { const p = partsIn(t, displayTz()); $('#jf-ex').value = `${pad(p.h)}:${pad(p.mi)}`; }
$('#jf-kw').innerHTML = t ? `Lo mataste ${fmtClock(t, { now })} · revive <b>${span(t + b.cyc, t + b.cyc + WIN, now)}</b>` : '';
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
if (e.target.closest('[data-undo]')) {
const { b, prev } = km;
setKill(b, prev ?? null);
KM.hidePopover();
paint();
toast(prev ? `Deshice: <b>${esc(b.name)}</b> vuelve a su kill anterior.` : `Deshice: <b>${esc(b.name)}</b> queda sin timer.`);
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
document.addEventListener('visibilitychange', () => { if (document.hidden && km) KM.hidePopover(); });
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
history.replaceState(null, '', (x === (profile().faccion || 'elyos') ? location.pathname : `?f=${x}`) + location.hash);
paintBar();
paint();
});
$('#jf-q').addEventListener('input', paint);
$('#jf-q').addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.value) { e.target.value = ''; paint(); } });
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
paintSt();
if (com() !== 'off') poll();
}
function focusBoss(b) {
if (!$(`#b-${b.id}`) && b.fac !== viewFac()) { fac = b.fac; paintBar(); }
if (!$(`#b-${b.id}`)) $('#jf-q').value = '';
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
const when = !tm ? 'sin timer' : s === 'stale' ? 'sin confirmar (mantenimiento)' : s === 'espera' ? `revive ${fmtClock(tm.start, { now })} · en ${fmtLeft(tm.start - now)}` : s === 'ventana' ? 'puede estar' : 'debería estar vivo';
return { id: 'jefe-' + b.id, title: b.name, sub: `${FACCION[b.fac]} · ${tm?.src === 'com' ? '≈ comunidad, ' : ''}${when}`, kw: `${b.nameEn} ${b.teleport || ''} jefe`, icon: 'i-boss', run: () => focusBoss(b) };
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
paintBar();
paint();
paintSt();
nextPoll = com() === 'off' ? Infinity : 0;
onTick(now => {
if (now >= nextChange) paint();
if (now >= nextPoll && !document.hidden) poll();      // con la ventana flotante el tick corre oculto: acá no se consulta
});
on('structure', paint);
on('prefs', paint);
on('bells', () => publish(lastAct, Date.now()));
on('profile', () => { paintBar(); onCom(); });
onStore('hub-kills', paint);
onStore('hub-jefes', onCom);
addEventListener('hashchange', fromHash);
if (location.hash) setTimeout(fromHash, 60);
