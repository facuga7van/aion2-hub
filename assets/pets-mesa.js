const INKS = ['#9E2A1E', '#1E4F8F', '#2F6B33', '#6E3A8E', '#8C5A12', '#1F6E6A'];
const BAND = ['#A6D9A0', '#EBC57A', '#F0878D'];
const TILT = 40, KY = 1 / Math.cos(TILT * Math.PI / 180);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cssP = new Promise(r => document.head.append(Object.assign(document.createElement('link'),
{ rel: 'stylesheet', href: new URL('./pets-mesa.css' + new URL(import.meta.url).search, import.meta.url).href, onload: r, onerror: r })));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ico = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const nv = l => l[0] === l[1] ? `${l[0]}` : `${l[0]}-${l[1]}`;
const compass = (u, v) => {
const ns = v < .36 ? 'norte' : v > .64 ? 'sur' : '', eo = u < .36 ? 'oeste' : u > .64 ? 'este' : '';
return ns && eo ? (ns === 'norte' ? 'nor' : 'sud') + eo : ns || eo || 'centro';
};
class Mesa {
constructor(host, { regionId, label, mode, saveData }) {
Object.assign(this, { mode, saveData, region: regionId, z: 1, tx: 0, ty: 0, big: false, home: [.5, .5, 1] });
const el = this.el = document.createElement('div');
el.className = 'mesa'; el.tabIndex = 0; el.setAttribute('role', 'group');
this.label(label);
el.innerHTML = `<div class="mesa-tilt"><div class="mesa-plane"><img alt="" width="1024" height="1024" decoding="async" src="assets/maps/${regionId}-1024.webp"><svg viewBox="0 0 1000 1000" aria-hidden="true"></svg></div></div>` +
`<div class="mesa-modo" role="group" aria-label="Vista del mapa"><button type="button" data-m="mesa">${ico('i-mesa')}Mesa</button><button type="button" data-m="plano">${ico('i-plano')}Plano</button></div>` +
'<p class="mesa-hint" aria-hidden="true">Usá dos dedos para mover el mapa</p>' +
`<div class="mesa-ctl"><button type="button" data-z="1.5" aria-label="Acercar">${ico('i-plus')}</button><button type="button" data-z="0.6667" aria-label="Alejar">${ico('i-minus')}</button>` +
`<button type="button" data-z="0" aria-label="Volver a la zona más densa">${ico('i-target')}</button></div>`;
host.replaceChildren(el);
this.plane = el.querySelector('.mesa-plane'); this.svg = this.plane.querySelector('svg'); this.img = this.plane.querySelector('img');
this.setMode(mode.get());
this.bind();
this.layout();
this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(el);
}
label(t) { this.el.setAttribute('aria-label', t + '. Con el mapa enfocado: + y − para zoom, flechas para moverte, 0 para volver.'); }
get uv() { return this.P ? [(this.W / 2 - this.tx) / (this.P * this.z), (this.H / 2 - this.ty) / (this.P * this.z)] : null; }
layout() {
const c = this.uv;
this.W = this.el.clientWidth; this.H = this.el.clientHeight; this.P = this.W;
this.look(...(c || this.home.slice(0, 2)), this.z, false);
}
look(u, v, z = this.z, anim = true) {
this.z = clamp(z, 1, 4);
this.tx = this.W / 2 - u * this.P * this.z; this.ty = this.H / 2 - v * this.P * this.z;
this.apply(anim);
}
goHome(anim = true) { this.look(...this.home, anim); }
apply(anim) {
const s = this.P * this.z;
this.tx = clamp(this.tx, this.W / 2 - s, this.W / 2); this.ty = clamp(this.ty, this.H / 2 - s, this.H / 2);
this.plane.classList.toggle('anim', !!anim && !RM);
this.plane.style.width = this.plane.style.height = s.toFixed(1) + 'px';
this.plane.style.transform = `translate3d(${this.tx.toFixed(1)}px,${this.ty.toFixed(1)}px,0)`;
const k = 1000 / s;
if (this.circles && Math.abs(k - (this.k || 0)) / k > .02) {
this.k = k; this.svg.style.setProperty('--sw', k.toFixed(3));
const r = (3.5 * k).toFixed(2);
for (const c of this.circles) c.setAttribute('r', r);
}
if (!this.big && !this.saveData && this.z > 1.6) {
this.big = true;
const im = new Image(); im.onload = () => { this.img.src = im.src; }; im.src = `assets/maps/${this.region}-2048.webp`;
}
}
pan(dx, dy, anim) { this.tx += dx; this.ty += dy * (this.m === 'mesa' ? KY : 1); this.apply(anim); }
zoomAt(f, sx, sy, anim) {
if (sx === undefined || this.m === 'mesa') { sx = this.W / 2; sy = this.H / 2; }
const z = clamp(this.z * f, 1, 4), r = z / this.z;
this.tx = sx - (sx - this.tx) * r; this.ty = sy - (sy - this.ty) * r; this.z = z;
this.apply(anim);
}
setMode(m) {
this.m = m;
this.el.style.setProperty('--tilt', m === 'mesa' ? TILT + 'deg' : '0deg');
for (const b of this.el.querySelectorAll('[data-m]')) b.setAttribute('aria-pressed', b.dataset.m === m);
}
setPoints(groups) {
this.svg.innerHTML = groups.map(g => `<g data-k="${g.key}" style="--ink:${g.ink}">` +
g.pts.map(p => `<circle cx="${(p[0] * 1000).toFixed(1)}" cy="${(p[1] * 1000).toFixed(1)}" r="3"/>`).join('') + '</g>').join('');
this.circles = [...this.svg.querySelectorAll('circle')]; this.k = 0; this.apply(false);
}
setFlags(list) {
for (const f of this.plane.querySelectorAll('.fl')) f.remove();
const frag = document.createDocumentFragment();
for (const f of list) {
const d = document.createElement('div');
d.className = 'fl ' + (f.cls || '');
d.style.cssText = `left:${(f.u * 100).toFixed(2)}%;top:${(f.v * 100).toFixed(2)}%;${f.style || ''}`;
Object.assign(d.dataset, f.data || {});
d.innerHTML = `<div class="fl-s"><span class="fl-b">${f.html}</span></div>`;
frag.append(d);
}
this.plane.append(frag);
}
bind() {
const el = this.el, pts = new Map();
let last = null, moved = 0, downT = null;
el.addEventListener('dragstart', e => e.preventDefault());
el.addEventListener('pointerdown', e => {
if (e.target.closest('button') || (e.pointerType === 'mouse' && e.button)) return;
el.focus({ preventScroll: true });
el.setPointerCapture(e.pointerId);
pts.set(e.pointerId, [e.clientX, e.clientY]);
if (pts.size === 1) { moved = 0; downT = e.target; }
last = null; el.classList.add('drag'); this.plane.classList.remove('anim');
});
el.addEventListener('pointermove', e => {
const p0 = pts.get(e.pointerId); if (!p0) return;
const dx = e.clientX - p0[0], dy = e.clientY - p0[1];
pts.set(e.pointerId, [e.clientX, e.clientY]);
if (pts.size === 1) {
moved += Math.abs(dx) + Math.abs(dy);
if (e.pointerType === 'touch') { if (moved > 12) this.hint(); return; }
this.pan(dx, dy); return;
}
const [a, b] = pts.values(), r = el.getBoundingClientRect();
const d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2 - r.left, my = (a[1] + b[1]) / 2 - r.top;
if (last) { this.zoomAt(d / last.d, mx, my); this.pan(mx - last.mx, my - last.my); }
last = { d, mx, my }; moved = 99;
});
const up = e => {
if (!pts.delete(e.pointerId)) return;
last = null;
if (pts.size) return;
el.classList.remove('drag');
const f = moved < 6 && downT?.closest?.('.fl-b');
if (f) this.onFlag?.(f.closest('.fl'));
downT = null;
};
el.addEventListener('pointerup', up);
el.addEventListener('pointercancel', e => { if (e.pointerType === 'touch' && pts.size === 1) this.hint(); up(e); });
el.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
el.addEventListener('wheel', e => {
if (!e.ctrlKey && document.activeElement !== el) return;
e.preventDefault();
const r = el.getBoundingClientRect();
this.zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
el.addEventListener('keydown', e => {
const k = e.key;
if (k === '+' || k === '=') this.zoomAt(1.4, undefined, undefined, true);
else if (k === '-' || k === '_') this.zoomAt(1 / 1.4, undefined, undefined, true);
else if (k === '0') this.goHome();
else if (k.startsWith('Arrow')) this.pan(k === 'ArrowLeft' ? 70 : k === 'ArrowRight' ? -70 : 0, k === 'ArrowUp' ? 70 : k === 'ArrowDown' ? -70 : 0, true);
else return;
e.preventDefault(); e.stopPropagation();
});
el.addEventListener('click', e => {
const b = e.target.closest('button'); if (!b) return;
if (b.dataset.m) { this.setMode(b.dataset.m); this.mode.set(b.dataset.m); }
else if (b.dataset.z === '0') this.goHome();
else if (b.dataset.z) this.zoomAt(+b.dataset.z, undefined, undefined, true);
});
}
hint() {
const h = this.el.querySelector('.mesa-hint');
h.classList.add('on'); clearTimeout(this.ht); this.ht = setTimeout(() => h.classList.remove('on'), 1400);
}
destroy() { this.ro.disconnect(); this.el.remove(); }
}
function merge(flags, d = .02) {
const out = [];
for (const f of [...flags].sort((a, b) => b.count - a.count)) {
const near = out.find(o => Math.hypot(o.u - f.u, o.v - f.v) < d);
near ? near.count += f.count : out.push({ ...f });
}
return out.sort((a, b) => b.count - a.count);
}
/* ---------- mapa de una pet (ficha) ---------- */
const FN = { elyos: 'Elyos', asmodian: 'Asmodian' };
export function petMap(host, pet, { mode, saveData, fac, rift, pn, gn }) {
let dead = false, m = null;
Promise.all([fetch(`assets/spawns/${pet.id}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }), cssP]).then(([data]) => {
if (dead) return;
const own = data.regions.findIndex(r => r.zone === fac()), ab = data.regions.findIndex(r => r.zone === 'abismo');
let reg = own >= 0 ? own : ab >= 0 ? ab : 0, mob = -1;
host.innerHTML = `<div class="mapa-ui"><div class="mapa-tabs"></div><div class="mapa-chips" role="group" aria-label="Mob"></div><p class="mapa-grieta" hidden>${ico('c-grieta')}Grieta · nv 45+ · abre cada 3 h · portal ~10 min · 60 min adentro</p><div class="mapa-host"></div><p class="mesa-sum"></p></div>`;
const tabs = host.querySelector('.mapa-tabs'), chips = host.querySelector('.mapa-chips'), mh = host.querySelector('.mapa-host'), sum = host.querySelector('.mesa-sum');
const region = () => {
const R = data.regions[reg];
tabs.className = data.regions.length > 1 ? 'mapa-chips' : '';
tabs.innerHTML = data.regions.length > 1 ? data.regions.map((r, i) => `<button type="button" data-reg="${i}" aria-pressed="${i === reg}">${esc(gn(r, 'region'))}${r.regionId === rift() ? ' · Grieta' : ''}</button>`).join('') : '';
m?.destroy();
host.querySelector('.mapa-grieta').hidden = R.regionId !== rift();  // solo el mapa al que lleva tu Grieta
m = new Mesa(mh, { regionId: R.regionId, label: `Mapa de spawns de ${pn(pet)} en ${gn(R, 'region')}`, mode, saveData });
m.setPoints(R.mobs.map((x, i) => ({ key: i, ink: INKS[i % INKS.length], pts: x.points })));
m.onFlag = fl => {
const d = fl.dataset;
m.look(+d.u, +d.v, Math.max(m.z * 1.5, 2.4));
sum.innerHTML = `<b>${esc(d.mob)}</b>${d.sub === 'boss' ? ' (boss de campo)' : d.sub === 'elite' ? ' (élite)' : ''} · nv ${d.lvl} · <b>×${d.n}</b> en esta zona del mapa.`;
};
pick(mob);
};
const pick = i => {
mob = i;
const R = data.regions[reg], ms = i < 0 ? R.mobs : [R.mobs[i]];
const total = R.mobs.reduce((a, x) => a + x.spawns, 0);
chips.innerHTML = (R.mobs.length > 1 ? `<button type="button" data-mob="-1" aria-pressed="${i < 0}">Todos · ${total}</button>` : '') +
R.mobs.map((x, k) => `<button type="button" data-mob="${k}" aria-pressed="${i === k || R.mobs.length === 1}"><i style="--ink:${INKS[k % INKS.length]}"></i>${esc(gn(x, 'mob'))} · nv ${nv(x.lvl)} · ${x.spawns}</button>`).join('');
for (const g of m.svg.querySelectorAll('g')) g.classList.toggle('off', i >= 0 && +g.dataset.k !== i);
const fl = merge(ms.flatMap(x => x.flags.map(f => ({ ...f, m: x }))));  // cada banderín sabe de qué mob es (el más denso si se juntan)
const top = fl[0];
const lab = [];
for (const f of fl) if (!lab.some(o => Math.hypot(o.u - f.u, o.v - f.v) < .05)) lab.push(f);
const boss = ms.length === 1 && ms[0].sub === 'boss' && ms[0].spawns === 1;
const fx = (f, cls) => ({ u: f.u, v: f.v, cls, html: boss ? ico('c-worldboss') + esc(gn(ms[0], 'mob').split(',')[0]) : '×' + f.count, data: { u: f.u, v: f.v, mob: gn(f.m, 'mob'), lvl: nv(f.m.lvl), sub: f.m.sub, n: f.count } });
m.setFlags([...fl.filter(f => !lab.includes(f)).map(f => fx(f, 'mini')), ...lab.reverse().map(f => fx(f, f === fl[0] ? 'top' : ''))]);
const P = ms.flatMap(x => x.points), us = P.map(p => p[0]), vs = P.map(p => p[1]);
const span = Math.max(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), .02);
m.home = [top.u, top.v, clamp(.42 / span, 1.3, 1.6)];
m.goHome(!!sum.textContent);
const n = ms.reduce((a, x) => a + x.spawns, 0), where = `${esc(gn(R, 'region'))}${FN[R.zone] && R.zone !== fac() ? ` (zona ${FN[R.zone]})` : ''}`;
const txt = n === 1 ? `<b>1 spawn</b> en ${where}, al <b>${compass(top.u, top.v)}</b> del mapa.` :
`<b>${n} spawns</b> en ${where}. Zona más densa: <b>${compass(top.u, top.v)}</b> (×${top.count}).`;
sum.innerHTML = txt;
m.label(`Mapa de spawns de ${pn(pet)}: ${sum.textContent}`);
};
host.addEventListener('click', e => {
const b = e.target.closest('[data-mob],[data-reg]'); if (!b) return;
if (b.dataset.reg) { reg = +b.dataset.reg; mob = -1; region(); } else if (data.regions[reg].mobs.length > 1) pick(+b.dataset.mob);
});
region();
}).catch(() => { if (!dead) host.innerHTML = '<p class="mesa-sum">No pude cargar el mapa de spawns.</p>'; });
return { destroy() { dead = true; m?.destroy(); } };
}
/* ---------- Mapa de farmeo: una región por pestaña, un pin por pet (su zona más densa); tocar un pin dice pet, mob y nivel ---------- */
export function plan(mapEl, listEl, { BY, owned, isMax, mode, saveData, ver, tabs, cap, regions, rl, pn, gn, start, count, onRegion, ex, onlyIn, solo }) {
let data = null, m = null, sel = null, rid = start, dead = false, only = solo.get();
let filt = [...ver.children].find(b => b.getAttribute('aria-pressed') === 'true')?.dataset.v || 'faltan';
const files = {}, R = () => regions.find(r => r.id === rid), full = () => esc(gn(R(), 'full'));
const want0 = id => filt === 'todas' || (filt === 'faltan' ? !owned.has(id) : owned.has(id) && !isMax(id));
const want = id => want0(id) && (!only || onlyIn(id, rid));
const SUB = { boss: ' (boss de campo)', elite: ' (élite)' };
const entryTxt = (e, n) => `<b>${esc(pn(BY.get(e.petId)))}</b>: ${esc(gn(e, 'mob'))}${SUB[e.sub] || ''} · nv ${e.lvl}` +
(n ? ` · <b>×${n}</b> en esta zona` : '') + ` · ${e.spawns} spawn${e.spawns > 1 ? 's' : ''} en ${full()}. <a href="#pet-${e.petId}">Ver la ficha</a>`;
const tabsUI = () => {
tabs.innerHTML = regions.map(r => { const n = count(r.id), l = esc(rl(r)); return `<button type="button" data-reg="${r.id}" aria-pressed="${r.id === rid}"${n ? ` aria-label="${l}: te faltan ${n}"` : ''}>${l}${n ? ` <b>${n}</b>` : ''}</button>`; }).join('');
};
const pin = (e, f, cls) => ({ u: f.u, v: f.v, cls: 'pin' + cls, style: `--bc:${BAND[e.band]}`, data: { pet: e.petId, e: e.i, n: f.count },
html: `<img src="assets/p/${e.petId}-128.webp" alt="" loading="lazy" decoding="async"><span>${f.count}</span>` });
function render() {
tabsUI();
ex.setAttribute('aria-pressed', only);
if (!data) return;
const es = data.entries.filter(e => want(e.petId)), name = full();
const ids0 = new Set(data.entries.filter(e => want0(e.petId)).map(e => e.petId)), nEx = [...ids0].filter(id => onlyIn(id, rid)).length;
ex.querySelector('span').innerHTML = `Solo de este mapa <b>${nEx}</b>`;
ex.setAttribute('aria-label', `Solo de este mapa: ${nEx} de ${ids0.size}`);
if (sel && !es.some(e => e.petId === sel)) { sel = null; cap.textContent = ''; }
if (!es.length && only && ids0.size) {
listEl.innerHTML = `<div class="gr-empty"><b>Ninguna sale solo en ${name}.</b>Las ${ids0.size} que mirás también salen en otro lado: farmealas donde te quede más cómodo. Sacá "Solo de este mapa" para verlas.</div>`;
} else if (!es.length) {
listEl.innerHTML = filt === 'faltan' ? `<div class="gr-empty"><b>Ya tenés todas las de ${name}.</b>Tocá "Subir a 3" para ver dónde farmear almas, o elegí otro mapa.</div>`
: filt === 'subir' ? `<div class="gr-empty"><b>Nada para subir.</b>Las de ${name} que tenés ya están al máximo.</div>` : `<div class="gr-empty"><b>Sin pets en ${name}.</b></div>`;
} else {
listEl.innerHTML = data.bands.map(b => {
const rows = new Map();
for (const e of es.filter(e => e.band === b.band)) {
const r = rows.get(e.petId) || rows.set(e.petId, { mobs: new Set(), lo: 99, hi: 0, n: 0 }).get(e.petId);
r.mobs.add(gn(e, 'mob')); r.lo = Math.min(r.lo, e.lvl); r.hi = Math.max(r.hi, e.lvl); r.n += e.spawns;
}
if (!rows.size) return '';
return `<div class="gr-band" style="--bc:${BAND[b.band]}"><h3><i></i>Nivel ${b.label}<span>${rows.size} pet${rows.size > 1 ? 's' : ''}</span></h3>` +
[...rows].sort((a, b) => b[1].n - a[1].n).map(([id, r]) => {
const p = BY.get(id);
return `<button type="button" class="gr-row${owned.has(id) ? ' own' : ''}" data-pet="${id}" aria-pressed="${sel === id}">` +
`<span class="pl" data-g="${p.genusKey}"><img src="assets/p/${id}-128.webp" width="40" height="40" alt="" loading="lazy" decoding="async"></span>` +
`<span><b>${esc(pn(p))}</b><small>${[...r.mobs].map(esc).join(', ')} · nv ${nv([r.lo, r.hi])}</small></span><em>${r.n}<small>spawns</small></em></button>` +
(sel === id ? `<p class="souls" style="margin:6px 0 0 50px"><a href="#pet-${id}">Abrir la ficha de ${esc(pn(p))}</a></p>` : '');
}).join('') + '</div>';
}).join('');
}
const byPet = new Map();
for (const e of es) (byPet.get(e.petId) || byPet.set(e.petId, []).get(e.petId)).push(e);
const pins = [];
for (const [id, list] of byPet) {
if (sel === id) { for (const e of list) for (const f of e.flags) pins.push(pin(e, f, ' hi')); continue; }
const e = list.reduce((a, x) => x.flags[0].count > a.flags[0].count ? x : a);
pins.push(pin(e, e.flags[0], sel ? ' off' : ''));
}
m.setFlags(pins);
m.el.classList.toggle('many', byPet.size > 40);
}
function select(id, look = true) {
sel = sel === id ? null : id;
render();
if (!sel) { cap.textContent = ''; m.goHome(); return; }
const es = data.entries.filter(x => x.petId === sel);
cap.innerHTML = es.length === 1 ? entryTxt(es[0]) : `<b>${esc(pn(BY.get(sel)))}</b>: ${es.map(e => `${esc(gn(e, 'mob'))}${SUB[e.sub] || ''} nv ${e.lvl} (${e.spawns})`).join(', ')} en ${full()}. <a href="#pet-${sel}">Ver la ficha</a>`;
if (!look) return;
const f = es.flatMap(x => x.flags).sort((a, b) => b.count - a.count)[0];
m.look(f.u, f.v, Math.max(m.z, 2.2));
if (matchMedia('(max-width:1080px)').matches && mapEl.getBoundingClientRect().top < 0) mapEl.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' });
}
function load() {
sel = null; data = null; cap.textContent = '';
onRegion?.(rid);
m?.destroy(); m = null;
mapEl.innerHTML = '<div class="mesa-skel"><span>Desplegando el mapa…</span></div>'; listEl.innerHTML = '';
tabsUI();
const asked = rid;
files[rid] ||= fetch(`assets/spawns/region-${rid}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
Promise.all([files[rid], cssP]).then(([d]) => {
if (dead || asked !== rid) return;
data = d; d.entries.forEach((e, i) => { e.i = i; });
m = new Mesa(mapEl, { regionId: rid, label: `Mapa de ${gn(R(), 'full')} con las pets que te faltan`, mode, saveData });
const fl = d.entries.flatMap(e => e.flags), us = fl.map(f => f.u), vs = fl.map(f => f.v);
const span = Math.max(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), .02);
m.home = [(Math.max(...us) + Math.min(...us)) / 2, (Math.max(...vs) + Math.min(...vs)) / 2, clamp(.8 / span, 1, 1.6)];
m.goHome(false);
m.onFlag = el => {
const e = data.entries[+el.dataset.e];
if (sel !== e.petId) select(e.petId, false);
m.look(+el.style.left.slice(0, -1) / 100, +el.style.top.slice(0, -1) / 100, Math.max(m.z, 2.2));
cap.innerHTML = entryTxt(e, +el.dataset.n);
};
render();
}).catch(() => { if (!dead && asked === rid) { delete files[rid]; mapEl.innerHTML = '<p class="gr-empty">No pude cargar el mapa.</p>'; } });
}
const onList = e => { const b = e.target.closest('.gr-row'); if (b) select(b.dataset.pet); };
const onVer = e => {
const b = e.target.closest('button'); if (!b) return;
filt = b.dataset.v; for (const x of ver.children) x.setAttribute('aria-pressed', x === b);
render();
};
const onTab = e => { const b = e.target.closest('[data-reg]'); if (b && b.dataset.reg !== rid) { rid = b.dataset.reg; load(); } };
const onEx = () => { only = !only; solo.set(only); render(); };
listEl.addEventListener('click', onList); ver.addEventListener('click', onVer); tabs.addEventListener('click', onTab); ex.addEventListener('click', onEx);
load();
return {
refresh: render,
destroy() { dead = true; m?.destroy(); tabs.innerHTML = ''; listEl.removeEventListener('click', onList); ver.removeEventListener('click', onVer); tabs.removeEventListener('click', onTab); ex.removeEventListener('click', onEx); },
};
}
