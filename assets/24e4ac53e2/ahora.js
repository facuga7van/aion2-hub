import {
$, $$, esc, ico, on, onTick, onStore, bind, fmtClock, fmtLeft, leftNext, schedule, upcoming, renderUpcoming,
nextBelled, bellButton, getBell, evPic, EVENTS, isLive, isVisible, catIcon, tzSentence, versioned,
toast, prefs, setPrefs, partsIn, displayTz, store, confTag, clockLeft, gname, galt, alertName, nextOcc, currentOcc, miniTabs, HOUR, MIN,
storedTimers, bossPic, maintNow, maintEnd, GRUPO_TXT, myChars,
} from './core.js';
import { renderTodo } from './hoy.js';
const vivo = () => setTimeout(() => import('./vivo.js' + new URL(import.meta.url).search), 3000);   // ?v=<hash>: el mismo módulo que importa Jefes
if (document.readyState === 'complete') vivo(); else addEventListener('load', vivo, { once: true });
const html = document.documentElement;
/* ---------- lo próximo: siempre lo más cercano (o lo que tiene el portal abierto); lo de la campana va abajo ---------- */
function paintHero() {
const now = Date.now(), nb = nextBelled(now), box = $('#hero');
const occ = upcoming(now, { count: 20, minor: false }).find(o => o.start > now || o.entry > now);
const tm = storedTimers(now).filter(t => t.up && t.start > now).sort((a, b) => a.start - b.start)[0];
const first = tm && (!occ || tm.start < occ.start);
paintNow(now, first ? '' : occ?.id);
if (first) return heroTimer(tm, now, nb, box);
if (!occ) { box.innerHTML = '<p class="hero-hint">No hay eventos visibles. Activalos en Ajustes.</p>'; return; }
const ev = occ.ev, name = gname(ev), live = isLive(occ, now), portal = live && occ.entry > now;
const lbl = !live ? 'empieza en' : portal ? `${ev.entryLabel || 'entrada abierta'} · cierra en` : ev.durTxt ? '≈ termina en' : 'termina en';
const target = !live ? occ.start : portal ? occ.entry : occ.end;
const bits = [ev.entry ? `${ev.entryLabel} ${ev.entry} min` : '', ev.durTxt || (ev.duration ? `dura ${ev.duration >= 60 ? ev.duration / 60 + ' h' : ev.duration + ' min'}` : ''), occ.maint === 'quizas' ? 'puede caer en el mantenimiento' : '',
occ.approx === 'grupo' ? GRUPO_TXT : occ.approx ? 'hora estimada según tu grupo' : ''].filter(Boolean);
const hint = bellHint(ev.id, nb);
box.innerHTML = `${evPic(ev, 80, 'hero-p', 44) || ico(catIcon(ev), 'hero-p hero-i')}
<div class="hero-id"><p class="hero-n" title="${esc(ev.what ? gname(ev, 'what') : galt(ev) || '')}">${esc(name)}</p>
<p class="hero-s"><span class="hero-k2">${CAT[ev.category] || 'Evento'}</span><time>${occ.approx && !live || live && ev.durTxt ? '≈ ' : ''}${fmtClock(live ? occ.end : occ.start, { now })}${live ? ' fin' : ''}</time>${bits.map(b => `<span>${esc(b)}</span>`).join('')}${confTag(ev)}${confTag(ev, { dot: true })}</p></div>
<p class="hero-cw"><span class="hero-l">${lbl}</span><span class="hero-c cd" id="hero-c"></span></p>
${hint ? `<p class="hero-hint">${hint}</p>` : ''}`;
box.append(bellButton(ev.id, name));
bind($('#hero-c'), n => [fmtLeft(target - n), n + leftNext(target - n)]);
bindNb(nb);
}
function heroTimer(t, now, nb, box) {
const name = gname(t, 'label'), hint = bellHint(t.id, nb), bits = [gname(t, 'note'), t.src].filter(Boolean);
box.innerHTML = `${bossPic(t.pic, 80, 'hero-p', 44) || ico('i-boss', 'hero-p hero-i')}
<div class="hero-id"><p class="hero-n">${t.approx ? '≈ ' : ''}${esc(name)}</p>
<p class="hero-s"><span class="hero-k2">Jefe de mundo</span><time>${fmtClock(t.start, { now })}</time>${bits.map(b => `<span>${esc(b)}</span>`).join('')}</p></div>
<p class="hero-cw"><span class="hero-l">sale en</span><span class="hero-c cd" id="hero-c"></span></p>
${hint ? `<p class="hero-hint">${hint}</p>` : ''}`;
box.append(bellButton(t.id, name));
bind($('#hero-c'), n => n < t.start ? [fmtLeft(t.start - n), n + leftNext(t.start - n)] : [t.liveText || 'ya puede estar', 0]);
bindNb(nb);
}
function bellHint(id, nb) {
const same = nb && nb.item.id === id, mine = getBell(id);
const nbName = nb && (nb.occ.ev ? gname(nb.occ.ev, 'short') || gname(nb.occ.ev) : alertName(nb.item));
return mine ? `${ico('i-bell-on')} <span>Te aviso ${leadsTxt(mine)}.${nb && !same ? ` Con campana: <b>${esc(nbName)}</b> <span class="cd" id="hero-nb"></span>` : ''}</span>`
: nb ? `${ico('i-bell-on')} <span>Con campana: <b>${esc(nbName)}</b> <span class="cd" id="hero-nb"></span></span>` : '';
}
const bindNb = nb => { const hn = $('#hero-nb'); if (hn) bind(hn, nb.live ? () => 'ya empezó' : clockLeft(nb.occ.start)); };
function paintNow(now, id) {
const el = $('#hero-now'), mw = maintNow(now);
const cur = !mw && upcoming(now, { count: 20, minor: false }).find(o => isLive(o, now) && o.id !== id);
el.hidden = !mw && !cur;
el.innerHTML = mw ? `<i class="st-dot" aria-hidden="true"></i><span>Mantenimiento en curso · hasta <b>${maintEnd(mw, now)}</b></span>`
: cur ? `<i class="st-dot" aria-hidden="true"></i><span>En curso: <b>${esc(gname(cur.ev, 'short') || gname(cur.ev))}</b> hasta ${fmtClock(cur.end, { now, day: false })}</span>` : '';
}
const CAT = { pvp: 'PvP', boss: 'Jefe', evento: 'Evento' };
const leadsTxt = L => { const t = L.map(l => l ? `${l} min` : 'al inicio'); return (t.length > 1 ? t.slice(0, -1).join(', ') + ' y ' + t.at(-1) : t[0]) + (L.some(l => l) ? (L.includes(0) && L.length > 1 ? '' : ' antes') : ''); };
/* ---------- te falta hoy: las diarias sin hacer y lo de hoy de las semanales (hoy.js) ---------- */
renderTodo($('#tk'));
$('#widgets').before(miniTabs(document, { viene: $('#up'), tareas: $('#tk') }));
/* ---------- tu próximo paso: el paso 1 de la ficha de tu principal y dónde está parado ---------- */
const nf = n => new Intl.NumberFormat('es-AR').format(n);
const agoTxt = t => { const m = Math.max(0, Math.floor((Date.now() - t) / 60e3)); return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : m < 2880 ? 'ayer' : `hace ${Math.floor(m / 1440)} días`; };
function paintPaso() {
const mine = myChars(), c = mine.find(x => x.main) || mine[0], s = c && store.get('hub-pj-paso', {})[c.pj.k.toLowerCase()], box = $('#paso');
html.dataset.paso = s?.t ? '1' : '0';
if (!c) { box.innerHTML = '<p class="ps-0"><a href="personaje/">Cargá tu personaje</a> y te digo qué mejorar primero.</p>'; return; }
const href = `personaje/#${c.pj.k.split('/').map(encodeURIComponent).join('/')}`, fi = `<a class="w-sub" href="${href}">Ficha de ${esc(c.pj.n)}</a>`;
if (!s) { box.innerHTML = `<p class="ps-0"><a href="${href}">Abrí la ficha de ${esc(c.pj.n)}</a> para ver tu próximo paso.</p>`; return; }
const where = s.low ? `Nivel <b>${s.lv}</b> de 45` : `Nivel de objeto <b>${nf(s.il)}</b>${s.nx ? ` · para ${esc(s.nx)} te falta${s.need > 1 ? 'n' : ''} <b>${nf(s.need)}</b>` : ''}`;
const ago = s.at ? `<small class="ps-ago"> · según tu ficha de ${agoTxt(s.at)}</small>` : '';
box.innerHTML = s.t ? `<div class="w-h"><h2>Tu próximo paso</h2>${fi}</div><p class="ps-t">${esc(s.t)}</p><p class="ps-w">${where}${ago}</p>`
: `<p class="ps-0">${where} · ${fi}${ago}</p>`;
}
paintPaso();
onStore('hub-pj-paso', paintPaso);
onStore('hub-personajes', paintPaso);
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
let n = 0;
const rows = evs.map(ev => {
const bl = c.list.filter(o => o.id === ev.id && Math.max(o.end, o.start + 1) > t0 && o.start < t1).map(o => {
const w = Math.max(o.end - o.start, 0), cls = ['tl-b', isLive(o, now) && 'live', o.maint === 'si' && 'skip', o.maint === 'quizas' && 'quizas', !w && 'pt'].filter(Boolean).join(' ');
const tip = `${gname(ev)} · ${fmtClock(o.start, { now, day: false })}${w ? '–' + fmtClock(o.end, { now, day: false }) : ''}${o.maint === 'si' ? ' · no ocurre: mantenimiento' : o.maint === 'quizas' ? ' · puede caer en el mantenimiento' : ''}${o.approx === 'grupo' ? ' · ' + GRUPO_TXT : o.approx ? ' · hora estimada' : ''}`;
const portal = o.entry && w ? `<b style="width:${(o.entry - o.start) / w * 100}%"></b>` : '';
return `<i class="${cls}" style="left:${pct(o.start)};width:${w ? `calc(${pct(o.end)} - ${pct(o.start)})` : '0'}" title="${esc(tip)}">${portal}</i>`;
}).join('');
if (!bl) return '';                                 // una fila vacía en la ventana que ves solo ocupa lugar (Asedio, Nahma…)
n++;
return `<div class="tl-row" id="tl-${ev.id}"><button type="button" class="tl-l" data-what="${esc(ev.id)}">${evPic({ icon: ev.icon }, 80, 'tl-p', 20) || ico(catIcon(ev))}<span class="tl-nm">${esc(gname(ev, 'short') || gname(ev))}</span></button><div class="tl-tr">${bl}</div></div>`;
}).join('');
const resets = c.list.filter((o, i, L) => o.ev.category === 'reset' && o.start > t0 && o.start < t1 && !(o.id === 'reset-diario' && L.some(w => w.id === 'reset-semanal' && w.start === o.start)))
.map(o => `<i class="tl-rs${o.id === 'reset-semanal' ? ' wk' : ''}" style="left:${pct(o.start)}"><span>${o.id === 'reset-semanal' ? 'Reset semanal' : 'Reset'}</span></i>`).join('');
const maint = c.mw.filter(m => m.maxEnd > t0 && m.start < t1).map(m => `<i class="tl-mt" style="left:${pct(m.start)};width:calc(${pct(m.maxEnd)} - ${pct(m.start)})" title="Mantenimiento ${m.announced ? 'anunciado' : 'estimado'}"><span>Mantenimiento</span></i>`).join('');
$('#tl').innerHTML = `<div class="tl" style="--rows:${n}"><div class="tl-axis">${axis.join('')}</div><div class="tl-body">${rows}<div class="tl-ov">${maint}${resets}<i class="tl-now" id="tl-now"><span></span></i></div></div></div>`;
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
wakeBtn.setAttribute('aria-pressed', String(!!lock));
wakeBtn.title = lock ? 'La pantalla no se apaga mientras tengas esto abierto (tocá para soltar)' : 'Que la pantalla no se apague mientras tengas esto abierto';
}
if (!('wakeLock' in navigator)) wakeBtn.hidden = true;
else {
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
$('#tzline').innerHTML = `${esc(tzSentence())} <button type="button" class="linkbtn" data-hub="settings" data-focus="[data-clock][aria-pressed=true]">Cambiar</button>`;
}
function paintAll() { paintHero(); paintTl(); paintTz(); }
const ONE = matchMedia('(max-width: 960px), (orientation: portrait) and (min-height: 1400px)');
let stopUp = () => {};
const mountUp = () => { stopUp(); stopUp = renderUpcoming($('#up'), html.classList.contains('mini') ? { count: 8, within: 6 * HOUR } : { ...(ONE.matches ? { count: 8, within: 6 * HOUR } : { count: 11 }), minorLast: true }); };
ONE.addEventListener?.('change', mountUp);
mountUp();
paintAll();
paintPins();
on('structure', () => { paintHero(); paintTl(); });
on('prefs', paintAll);
on('profile', paintAll);
on('bells', paintHero);
on('gamelang', () => { paintHero(); paintTl(); });
onStore('hub-ahora', paintPins);
onTick(moveNow);
$('#tl').addEventListener('click', e => {
const b = e.target.closest('[data-what]'), ev = b && EVENTS.get(b.dataset.what);
if (!ev) return;
const now = Date.now(), o = currentOcc(ev.id, now) || nextOcc(ev.id, now);
const when = !o ? '' : isLive(o, now) ? ` En curso, hasta ${fmtClock(o.end, { now, day: false })}.` : ` Próximo: ${fmtClock(o.start, { now })}, en ${fmtLeft(o.start - now)}.`;
const cat = CAT[ev.category] || 'Evento', what = gname(ev, 'what') || '';
toast(`<b>${esc(gname(ev))}</b> · ${what.toLowerCase().startsWith(cat.toLowerCase()) ? '' : esc(cat) + '. '}${esc(what)}${when}`, { ms: 6000 });
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
