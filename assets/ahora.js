import {
$, $$, esc, ico, on, onTick, onStore, bind, countdown, fmtClock, fmtLeft, leftNext, schedule, upcoming, nextReset, renderUpcoming,
nextBelled, bellButton, getBell, EVENTS, isLive, isVisible, catIcon, tzSentence, versioned, characters, taskList, taskDone, taskProgress,
setTaskDone, toast, prefs, setPrefs, partsIn, displayTz, store, confTag, clockLeft, gname, galt, alertName, nextOcc, currentOcc, HOUR, MIN,
} from './core.js?v=40258e9f3e';
const html = document.documentElement;
/* ---------- resets y mantenimiento ---------- */
function paintResets() {
const now = Date.now();
for (const [sel, per] of [['#rs-d', 'daily'], ['#rs-w', 'weekly']]) {
const t = nextReset(per, now), el = $(sel);
countdown($('.rs-c', el), t);
$('.rs-t', el).textContent = fmtClock(t, { now });
}
const el = $('#rs-m'), mw = schedule(now).mw.find(x => x.maxEnd > now);
el.hidden = !mw;
if (!mw) return;
const range = mw.announced ? `${fmtClock(mw.start, { now })} – ${fmtClock(mw.maxEnd, { now, day: false })}` : `${fmtClock(mw.start, { now })} – ~${fmtClock(mw.maxEnd, { now, day: false })}`;
bind($('.rs-c', el), n => n < mw.start ? [fmtLeft(mw.start - n), n + leftNext(mw.start - n)] : ['en curso', 0]);
$('.rs-t', el).innerHTML = `${esc(range)} ${mw.announced ? confTag({ source: mw.source }, { lv: 'oficial' })
: confTag({ source: 'Visto los miércoles 4 y 11 de noviembre. Sin aviso oficial cargado para esta semana.' }, { lv: 'sin', note: 'la hora de vuelta: dura entre 3 h y 4 h 30' })}`;
}
/* ---------- lo próximo: siempre lo más cercano (o lo que tiene el portal abierto); lo de la campana va abajo ---------- */
function paintHero() {
const now = Date.now(), nb = nextBelled(now), box = $('#hero');
const occ = upcoming(now, { count: 20, minor: false }).find(o => o.start > now || o.entry > now);
if (!occ) { box.innerHTML = '<p class="hero-hint">No hay eventos visibles. Activalos en Ajustes.</p>'; return; }
const ev = occ.ev, name = gname(ev), live = isLive(occ, now), portal = live && occ.entry > now;
const cur = upcoming(now, { count: 20, minor: false }).find(o => isLive(o, now) && o !== occ && o.id !== ev.id);
const lbl = !live ? 'empieza en' : portal ? `${ev.entryLabel || 'entrada abierta'} · cierra en` : 'termina en';
const target = !live ? occ.start : portal ? occ.entry : occ.end;
const bits = [ev.entry ? `${ev.entryLabel} ${ev.entry} min` : '', ev.duration ? `dura ${ev.duration >= 60 ? ev.duration / 60 + ' h' : ev.duration + ' min'}` : '', occ.maint === 'quizas' ? 'puede caer en el mantenimiento' : ''].filter(Boolean);
const same = nb && nb.item.id === ev.id, mine = getBell(ev.id);
const nbName = nb && (nb.occ.ev ? gname(nb.occ.ev, 'short') || gname(nb.occ.ev) : alertName(nb.item));
const hint = mine ? `${ico('i-bell-on')} <span>Te aviso ${leadsTxt(mine)}.${nb && !same ? ` Con campana: <b>${esc(nbName)}</b> <span class="cd" id="hero-nb"></span>` : ''}</span>`
: nb ? `${ico('i-bell-on')} <span>Con campana: <b>${esc(nbName)}</b> <span class="cd" id="hero-nb"></span></span>`
: `${ico('i-bell')} <span>Tocá la campana y te aviso antes. El permiso se pide recién ahí.</span>`;
box.innerHTML = `${cur ? `<p class="hero-now"><i class="st-dot" aria-hidden="true"></i>En curso: <b>${esc(gname(cur.ev, 'short') || gname(cur.ev))}</b> <span>hasta ${fmtClock(cur.end, { now, day: false })}</span></p>` : ''}
<div class="hero-main"><p class="hero-k2">${ico(catIcon(ev))}${CAT[ev.category] || 'Evento'}</p><p class="hero-n"${galt(ev) ? ` title="${esc(galt(ev))}"` : ''}>${esc(name)}</p>${ev.what ? `<p class="hero-q">${esc(gname(ev, 'what'))}</p>` : ''}<p class="hero-l">${lbl}</p><p class="hero-c cd" id="hero-c"></p>
<p class="hero-s"><time>${fmtClock(live ? occ.end : occ.start, { now })}${live ? ' fin' : ''}</time>${bits.map(b => `<span>${esc(b)}</span>`).join('')}${confTag(ev)}</p></div>
<div class="hero-side"></div>
<p class="hero-hint">${hint}</p>`;
$('.hero-side', box).prepend(bellButton(ev.id, name));
bind($('#hero-c'), n => [fmtLeft(target - n), n + leftNext(target - n)]);
const hn = $('#hero-nb');
if (hn) bind(hn, nb.live ? () => 'ya empezó' : clockLeft(nb.occ.start));
}
const CAT = { pvp: 'PvP', boss: 'Jefe', evento: 'Evento' };
const leadsTxt = L => { const t = L.map(l => l ? `${l} min` : 'al inicio'); return (t.length > 1 ? t.slice(0, -1).join(', ') + ' y ' + t.at(-1) : t[0]) + (L.some(l => l) ? (L.includes(0) && L.length > 1 ? '' : ' antes') : ''); };
/* ---------- tu día: las diarias y, si hoy toca, las semanales con horario (Asedio, Nahma…); se marcan acá mismo ---------- */
function paintTk() {
const now = Date.now(), { list, activo } = characters(), ch = list.find(c => c.id === activo);
const pr = taskProgress(activo, now), done = { daily: taskDone(activo, 'daily', now), weekly: taskDone(activo, 'weekly', now) };
const daily = taskList().filter(t => t.period === 'daily' && !t.optional);
const rd = nextReset('daily', now), occ = {};
const today = taskList().filter(t => t.period === 'weekly' && t.event && !t.optional)
.filter(t => { const o = currentOcc(t.event, now) || nextOcc(t.event, now); return o && o.start < rd && (occ[t.id] = o); });
const pct = pr.daily.total ? Math.round(pr.daily.done / pr.daily.total * 100) : 0;
const row = t => { const per = t.period, v = done[per][t.id] || 0, max = t.count || 1, ok = v >= max, id = 'ah-t-' + t.id;
const sub = per === 'weekly' ? `Semanal · <span class="cd" id="ah-ev-${esc(t.id)}"></span>` : t.detail ? esc(gname(t, 'detail')) : '';
return max > 1 ? `<li class="tk-i${ok ? ' ok' : ''}"><a href="tareas/#t-${esc(t.id)}"><span class="tk-nm">${esc(gname(t))} <b>${v}/${max}</b></span>${sub ? `<small>${sub}</small>` : ''}</a></li>`
: `<li class="tk-i${ok ? ' ok' : ''}"><input type="checkbox" id="${id}" data-tk="${esc(t.id)}" data-per="${per}"${ok ? ' checked' : ''}><label for="${id}"><span class="tk-nm">${esc(gname(t))}</span>${sub ? `<small>${sub}</small>` : ''}</label></li>`; };
$('#tk').innerHTML = `<div class="tk-p"><span class="tk-c">${esc(ch.name)}</span><span><b>${pr.daily.done}</b>/${pr.daily.total} diarias</span><span><b>${pr.weekly.done}</b>/${pr.weekly.total} semanales</span></div>
<div class="bar" role="img" aria-label="${pct}% de las diarias"><i style="--w:${pct}%"></i></div>
<ul class="tk-l">${daily.slice(0, 6).map(row).join('')}${today.length ? `<li class="tk-sep">Hoy también</li>${today.map(row).join('')}` : ''}</ul>${pr.daily.total && pr.daily.done >= pr.daily.total ? '<p class="tk-ok">Diarias listas hasta el reset.</p>' : ''}`;
for (const t of today) { const o = occ[t.id], el = $('#ah-ev-' + CSS.escape(t.id)), cl = clockLeft(o.start); bind(el, n => isLive(o, n) ? ['en curso ahora', o.end] : cl(n)); }
}
$('#tk').addEventListener('change', e => {
const c = e.target.closest('[data-tk]');
if (!c) return;
setTaskDone(characters().activo, c.dataset.per, c.dataset.tk, c.checked ? 1 : 0);
paintTk();
document.getElementById(c.id)?.focus();
});
/* ---------- línea de tiempo (12/24 h, estilo shugo) ---------- */
const PH = matchMedia('(max-width: 640px)');
PH.addEventListener?.('change', () => paintTl());
let span = store.get('hub-ahora-tl', null) || (PH.matches ? 12 : 24);
let tlNow = null, tlT0 = 0, tlMin = -1;
function paintTl() {
const now = Date.now(), H = span * HOUR, t0 = Math.floor(now / HOUR) * HOUR - (span === 24 ? 2 : 1) * HOUR, t1 = t0 + H, tz = displayTz();
tlT0 = t0;
const pct = t => ((Math.min(Math.max(t, t0), t1) - t0) / H * 100).toFixed(3) + '%';
const c = schedule(now), evs = [...EVENTS.values()].filter(e => e.category !== 'reset' && isVisible(e));
const step = PH.matches ? (span === 24 ? 6 : 3) : (span === 24 ? 3 : 1), axis = [];   // celu: una marca cada 3 h (12 h) o cada 6 h (24 h)
for (let t = t0; t <= t1; t += HOUR) {
const p = partsIn(t, tz);
if (p.h % step === 0 && t > t0 && t < t1) axis.push(`<span style="left:${pct(t)}"${p.h === 0 ? ' class="d0"' : ''}>${p.h === 0 ? ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][p.wd] : fmtClock(t, { now, day: false })}</span>`);
}
const rows = evs.map(ev => {
const bl = c.list.filter(o => o.id === ev.id && Math.max(o.end, o.start + 1) > t0 && o.start < t1).map(o => {
const w = Math.max(o.end - o.start, 0), cls = ['tl-b', isLive(o, now) && 'live', o.maint === 'si' && 'skip', o.maint === 'quizas' && 'quizas', !w && 'pt'].filter(Boolean).join(' ');
const tip = `${gname(ev)} · ${fmtClock(o.start, { now, day: false })}${w ? '–' + fmtClock(o.end, { now, day: false }) : ''}${o.maint === 'si' ? ' · no ocurre: mantenimiento' : o.maint === 'quizas' ? ' · puede caer en el mantenimiento' : ''}`;
const portal = o.entry && w ? `<b style="width:${(o.entry - o.start) / w * 100}%"></b>` : '';
return `<i class="${cls}" style="left:${pct(o.start)};width:${w ? `calc(${pct(o.end)} - ${pct(o.start)})` : '0'}" title="${esc(tip)}">${portal}</i>`;
}).join('');
return `<div class="tl-row" id="tl-${ev.id}"><button type="button" class="tl-l" data-what="${esc(ev.id)}">${ico(catIcon(ev))}<span class="tl-nm">${esc((PH.matches && gname(ev, 'tiny')) || gname(ev, 'short') || gname(ev))}</span>${ev.what ? `<small>${esc(gname(ev, 'what'))}</small>` : ''}</button><div class="tl-tr">${bl}</div></div>`;
}).join('');
const resets = c.list.filter((o, i, L) => o.ev.category === 'reset' && o.start > t0 && o.start < t1 && !(o.id === 'reset-diario' && L.some(w => w.id === 'reset-semanal' && w.start === o.start)))
.map(o => `<i class="tl-rs${o.id === 'reset-semanal' ? ' wk' : ''}" style="left:${pct(o.start)}"><span>${o.id === 'reset-semanal' ? 'Reset semanal' : 'Reset'}</span></i>`).join('');
const maint = c.mw.filter(m => m.maxEnd > t0 && m.start < t1).map(m => `<i class="tl-mt" style="left:${pct(m.start)};width:calc(${pct(m.maxEnd)} - ${pct(m.start)})" title="Mantenimiento ${m.announced ? 'anunciado' : 'estimado'}"><span>Mantenimiento</span></i>`).join('');
$('#tl').innerHTML = `<div class="tl" style="--rows:${evs.length}"><div class="tl-axis">${axis.join('')}</div><div class="tl-body">${rows}<div class="tl-ov">${maint}${resets}<i class="tl-now" id="tl-now"><span></span></i></div></div></div>`;
tlNow = $('#tl-now');
tlMin = -1;
moveNow(now);
$$('.tl-seg button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.span === span)));
}
function moveNow(now) {
const m = Math.floor(now / MIN);
if (!tlNow || m === tlMin) return;
tlMin = m;
if (now >= tlT0 + (span === 24 ? 3 : 2) * HOUR) { paintTl(); return; }
const x = (now - tlT0) / (span * HOUR) * 100;
tlNow.style.left = x.toFixed(3) + '%';
const w = tlNow.parentElement.clientWidth / 100;   // px por 1 %: la etiqueta "ahora" tapa ~46 px
for (const s of $$('.tl-axis span')) s.classList.toggle('near', Math.abs(parseFloat(s.style.left) - x) * w < 46);
tlNow.firstChild.textContent = fmtClock(now, { now, day: false });
}
/* ---------- widgets fijables (estrella) ---------- */
const W = versioned('hub-ahora', 1, { pinned: [] });
function paintPins() {
const pins = W.get().pinned;
for (const w of $$('.w')) {
const i = pins.indexOf(w.dataset.w), st = $('.star', w);
w.style.order = i < 0 ? '' : String(i - 20);
w.classList.toggle('pinned', i >= 0);
if (st) { st.setAttribute('aria-pressed', String(i >= 0)); st.innerHTML = ico(i >= 0 ? 'i-star-on' : 'i-star'); }
}
}
for (const w of $$('.w')) {
const name = $('h2', w).textContent, b = document.createElement('button');
b.type = 'button';
b.className = 'star iconbtn';
b.setAttribute('aria-label', `Fijar arriba: ${name}`);
b.title = 'Fijar arriba';
b.onclick = () => {
const s = W.get(), id = w.dataset.w;
s.pinned = s.pinned.includes(id) ? s.pinned.filter(x => x !== id) : [...s.pinned, id];
W.set(s);
paintPins();
toast(s.pinned.includes(id) ? `<b>${esc(name)}</b> queda arriba.` : `<b>${esc(name)}</b> vuelve a su lugar.`);
};
$('.w-h', w).append(b);
}
/* ---------- pantalla encendida (celu) ---------- */
let lock = null, wantLock = false;
const wakeBtn = $('#wake');
async function getLock() {
try {
lock = await navigator.wakeLock.request('screen');
lock.addEventListener('release', () => { lock = null; paintWake(); });
} catch { lock = null; wantLock = false; toast('El navegador no dejó mantener la pantalla encendida (¿ahorro de batería?).'); }
paintWake();
}
function paintWake() {
const t = lock ? 'Pantalla encendida (tocá para soltar)' : 'Mantener la pantalla encendida';
wakeBtn.setAttribute('aria-pressed', String(!!lock));
wakeBtn.setAttribute('aria-label', t);
wakeBtn.title = t;
$('span', wakeBtn).textContent = lock ? 'Pantalla encendida' : 'Pantalla siempre encendida';
}
if ('wakeLock' in navigator) {
wakeBtn.hidden = false;
paintWake();
wakeBtn.onclick = () => { if (lock) { wantLock = false; lock.release(); } else { wantLock = true; getLock(); } };
document.addEventListener('visibilitychange', () => { if (!document.hidden && wantLock && !lock) getLock(); });
}
/* ---------- ir a un evento (#ev-id desde la tira o la paleta) ---------- */
function focusHash() {
const m = location.hash.match(/^#ev-(.+)$/);
if (!m) return;
const id = decodeURIComponent(m[1]), ev = EVENTS.get(id);
if (!ev) return;
if (!isVisible(ev)) toast(`<b>${esc(gname(ev))}</b> está oculto.`, { action: { label: 'Mostrarlo', run: () => setPrefs({ vis: { ...prefs().vis, [id]: true } }) } });
const el = $(`#up [data-ev="${CSS.escape(id)}"]`) || $(`#tl-${CSS.escape(id)}`) || (ev.category === 'reset' ? $('#resets') : null);
if (!el) return;
el.scrollIntoView({ block: 'center', behavior: html.classList.contains('rm') ? 'auto' : 'smooth' });
el.classList.remove('flash');
void el.offsetWidth;
el.classList.add('flash');
}
/* ---------- arranque ---------- */
function paintTz() {
$('#tzline').innerHTML = `${esc(tzSentence())} <button type="button" class="linkbtn" data-hub="settings">Cambiar</button>`;
$('#up-sub').textContent = prefs().clock === 'server' ? 'hora del server' : 'en tu reloj';
}
function paintAll() { paintResets(); paintHero(); paintTl(); paintTz(); }
renderUpcoming($('#up'), { count: 10 });
paintAll();
paintTk();
paintPins();
on('structure', () => { paintResets(); paintHero(); paintTl(); paintTk(); });
on('prefs', paintAll);
on('profile', paintAll);
on('bells', paintHero);
on('gamelang', () => { paintHero(); paintTl(); paintTk(); });
on('reset', paintTk);
onStore('hub-tareas', paintTk);
onStore('hub-personajes', paintTk);
onStore('hub-ahora', paintPins);
document.addEventListener('visibilitychange', () => { if (!document.hidden) paintTk(); });
onTick(moveNow);
$('#tl').addEventListener('click', e => {
const b = e.target.closest('[data-what]'), ev = b && EVENTS.get(b.dataset.what);
if (!ev) return;
const now = Date.now(), o = currentOcc(ev.id, now) || nextOcc(ev.id, now);
const when = !o ? '' : isLive(o, now) ? ` En curso, hasta ${fmtClock(o.end, { now, day: false })}.` : ` Próximo: ${fmtClock(o.start, { now })}, en ${fmtLeft(o.start - now)}.`;
toast(`<b>${esc(gname(ev))}</b> · ${CAT[ev.category] || 'Evento'}. ${esc(gname(ev, 'what'))}${when}`, { ms: 6000 });
});
$('.tl-seg').addEventListener('click', e => {
const b = e.target.closest('[data-span]');
if (!b) return;
span = +b.dataset.span;
store.set('hub-ahora-tl', span);
paintTl();
});
addEventListener('hashchange', focusHash);
if (location.hash) setTimeout(focusHash, 60);
