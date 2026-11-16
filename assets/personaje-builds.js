import { $, esc, ico, modal, announce } from './core.js?v=6bb26aea23';
let X;                                         // {api, MSG, img, gcls, GRADE, nf, tab} que pasa personaje.js
export const init = ctx => { X = ctx; };
/* ---------- tablas ---------- */
const CLASSES = [['gladiator', 'Gladiador'], ['templar', 'Templario'], ['ranger', 'Arquero'], ['assassin', 'Asesino'], ['sorcerer', 'Hechicero'], ['elementalist', 'Espiritualista'], ['cleric', 'Clérigo'], ['chanter', 'Cantor']];
const CLS_ES = Object.fromEntries(CLASSES);
export const clsOf = es => CLASSES.find(c => c[1] === es)?.[0] || null;
const TAGS = [['', 'Todas'], ['pve', 'PvE'], ['pvp', 'PvP'], ['dps', 'DPS'], ['healer', 'Healer'], ['support', 'Support'], ['dungeon', 'Dungeon'], ['budget-build', 'Económica'], ['endgame-build', 'Endgame']];
const TAG_ES = { ...Object.fromEntries(TAGS.slice(1)), 'beginner-friendly': 'Para empezar' };
const SLOT = [
['weapon', 'Arma', 1, 1], ['guarder', 'Secundaria', 2, 1], ['helmet', 'Casco', 3, 1], ['shoulder', 'Hombreras', 4, 1], ['torso', 'Pecho', 5, 1],
['pants', 'Piernas', 6, 1], ['gloves', 'Guantes', 7, 1], ['boots', 'Botas', 8, 1], ['cape', 'Capa', 19, 1], ['necklace', 'Collar', 10, 1],
['leftEarring', 'Pendiente izq.', 11, 1], ['rightEarring', 'Pendiente der.', 12, 1], ['leftRing', 'Anillo izq.', 13, 1], ['rightRing', 'Anillo der.', 14, 1],
['leftBracelet', 'Brazalete izq.', 15, 0], ['rightBracelet', 'Brazalete der.', 16, 0], ['belt', 'Cinturón', 17, 0], ['amulet', 'Amuleto', 22, 0],
['leftRune', 'Runa izq.', 23, 0], ['rightRune', 'Runa der.', 24, 0],
['grail', 'Cáliz', 41, 1], ['parchment', 'Pergamino', 42, 1], ['compass', 'Brújula', 43, 1], ['bell', 'Campana', 44, 1], ['mirror', 'Espejo', 45, 1],
];
const ARCANA = new Set(['grail', 'parchment', 'compass', 'bell', 'mirror']);
const slotOf = k => SLOT.find(s => s[0] === k);
const aggKey = k => k.replace(/^(left|right)/, '').toLowerCase();       // izq. y der. juntos, como lo agrega el server
const DAE = ['Nezekan', 'Zikel', 'Vaizel', 'Triniel', 'Ariel', 'Azphel'];   // orden de los tableros de cada clase (x1..x6)
const ST = {
str: ['Fuerza'], dex: ['Destreza'], agi: ['Exactitud'], con: ['Vitalidad'], int: ['Inteligencia'], wis: ['Voluntad'],
weaponfixingdamage: ['Ataque'], weaponaccuracy: ['Precisión'], critical: ['Crítico'], criticalresist: ['Resistencia crítica'], armordefense: ['Defensa'],
armorevasion: ['Evasión'], block: ['Bloqueo'], hpmax: ['Puntos de vida'], mpmax: ['Puntos de maná'], hpregen: ['Recup. natural de PV'], mpregen: ['Recup. natural de PM'],
fpmax: ['Energía de vuelo', 'f'], accuracy: ['Precisión adicional'], evasion: ['Evasión adicional'],
combatspeed: ['Velocidad de combate', 'p'], movespeed: ['Velocidad de movimiento', 'p'], amplifyalldamage: ['Amplificación de daño', 'p'],
amplifyweapondamage: ['Amplif. de daño de arma', 'p'], amplifycriticaldamage: ['Amplif. de daño crítico', 'p'], amplifyhphealget: ['Amplif. de curación recibida', 'p'],
additionalhitrate: ['Acierto de multigolpe', 'p'], additionalhitresistrate: ['Resist. a multigolpe', 'p'], decreasedamage: ['Tolerancia a daño', 'p'],
decreaseweapondamage: ['Tolerancia a daño de arma', 'p'], decreasecriticaldamage: ['Tolerancia a daño crítico', 'p'], damageratio: ['Aumento de ataque', 'p'],
defenseratio: ['Aumento de defensa', 'p'], perfect: ['Perforación', 'p'], perfectresist: ['Resist. a perforación', 'p'], hardhit: ['Golpe', 'p'],
hardhitresist: ['Resist. a golpe', 'p'], ironwall: ['Tenacidad', 'p'], ignoreironwall: ['Penetración de tenacidad', 'p'], restoration: ['Recuperación', 'p'],
abnormalaccuracy: ['Precisión de estados', 'p'], abnormalresistance: ['Resist. a estados', 'p'], backattackdamage: ['Daño por la espalda'],
frontattackdamage: ['Daño frontal'], criticaladddamage: ['Daño crítico adicional'], backattackdefense: ['Defensa por la espalda'],
frontattackdefense: ['Defensa frontal'], criticaldamagedefense: ['Defensa contra críticos'], life: ['Vida'], death: ['Muerte'], time: ['Tiempo'],
space: ['Espacio'], wisdom: ['Sabiduría'], destiny: ['Destino'], freedom: ['Libertad'], justice: ['Justicia'], illusion: ['Fantasía'], destruction: ['Destrucción'],
};
const stLabel = id => ST[id]?.[0] || id;
const num = v => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(v);
const fmt = (id, v) => v == null ? '' : ST[id]?.[1] === 'p' ? num(v / 100) + ' %' : ST[id]?.[1] === 'f' ? num(Math.round(v / 100)) : num(v);
const QL_OK = /^https:\/\/questlog\.gg\//;
const qlUrl = u => QL_OK.test(u || '') ? u : 'https://questlog.gg/aion-2/character-builder';
function ago(iso) {
const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
return !isFinite(d) ? '' : d < 1 ? 'hoy' : d === 1 ? 'ayer' : d < 60 ? `hace ${d} días` : `hace ${Math.floor(d / 30)} meses`;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pct = q => Math.round(q * 100);
const bar = (q, label) => `<span class="qb" role="img" aria-label="${esc(label)}"><i style="--q:${pct(q)}%"></i></span>`;
const loading = t => `<p class="pj-load"><span class="pj-spin" aria-hidden="true"></span>${t}</p>`;
const COMMUNITY = 'Builds de la comunidad, armadas por jugadores en questlog.gg y ordenadas por votos. No son datos oficiales ni de PLAYNC.';
const KINDS = [['pve', 'PvE'], ['pvp', 'PvP'], ['support', 'Support']];
const KIND_ES = Object.fromEntries(KINDS);
let KIND = 'pve';
const TIERS = [['Best', 'Mejor', '≥ 50 %'], ['Good', 'Buena', '≥ 25 %'], ['Fine', 'Sirve', '≥ 10 %']];
const TSLOTS = ['weapon', 'offhand', 'helmet', 'shoulder', 'torso', 'pants', 'gloves', 'boots', 'cape', 'necklace', 'earring', 'ring', 'bracelet'];
const ARC = [['chalice', 'Cáliz'], ['parchment', 'Pergamino'], ['compass', 'Brújula'], ['bell', 'Campana'], ['mirror', 'Espejo']];
const SLC = [...ARC, ['weaponAccessories', 'Arma y accesorios'], ['armor', 'Armadura']];
const GEN = { weaponAccessories: 'ring', armor: 'boots' };
const CSLOT = k => k === 'guarder' ? 'offhand' : aggKey(k);                // slot de SLOT → slot del JSON curado
const A2D = /^https:\/\/aion2data\.com\//;
const day = v => /^\d{4}-\d\d-\d\d/.test(v || '') ? `${v.slice(8, 10)}/${v.slice(5, 7)}` : '—';
const ext = (href, t) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${t}${ico('i-ext')}</a>`;
/* ---------- líneas de skill según TUS skills ---------- */
function skillUse(skills) {
const by = new Map((skills || []).map(s => [String(s.id), s]));
const ok = id => { const s = by.get(String(id)); return !!s && !!s.acquired && (s.category === 'Passive' || !!s.equipped); };
return { by, ok, why: id => ok(id) ? null : by.get(String(id))?.acquired ? 'no la tenés en la barra' : 'no la tenés' };
}
export function personalLines(skills, pools, generic = {}) {
const u = skillUse(skills), lv = id => u.by.get(String(id)).level || 0, out = {};
for (const [card, pool] of Object.entries(pools || {})) out[card] = {
forYou: pool.filter(p => u.ok(p.id)).sort((a, b) => lv(b.id) - lv(a.id)).slice(0, 4).map(p => ({ ...p, lvl: lv(p.id), bar: u.by.get(String(p.id)).category !== 'Passive' })),
generic: (generic[card] || []).map(x => ({ ...x, useless: !u.ok(x.id), why: u.why(x.id) })),
};
return out;
}
/* ---------- red (con caché de la sesión) ---------- */
const memo = new Map();
const once = (k, fn) => { if (!memo.has(k)) memo.set(k, fn().catch(e => { memo.delete(k); throw e; })); return memo.get(k); };
const getList = (cls, tag) => once(`l|${cls}|${tag}`, () => X.api('/api/builds', { class: cls, ...(tag && { tags: tag }) }));
const getBuild = (slug, id) => once(`b|${slug}|${id}`, () => X.api('/api/build', { slug, id }));
const getCur = cls => once(`c|${cls}`, () => X.api('/api/curated', { class: cls }));
function errHtml(e, what) {
const [t, d] = e.kind === 'notfound' ? [`No encontré ${what}`, e.message || 'Puede que la hayan borrado en questlog.']
: e.kind === 'server' || !X.MSG[e.kind] ? [`No pude traer ${what}`, e.message || 'Probá de nuevo en un rato.'] : X.MSG[e.kind](e);
return `<div class="pj-msg bad" role="alert" data-kind="${esc(e.kind || 'server')}"><h3>${esc(t)}</h3><p>${esc(d)}</p><button type="button" class="btn" data-retry>${ico('i-reset')}Reintentar</button></div>`;
}
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
const charQ = ref => ({ id: ref.id, server: ref.s, region: ref.r });
function myItems(cur, slots, onProg) {
const by = new Map((cur.d.equipment || []).map(e => [e.slot, e]));
const list = slots.map(s => by.get(s)).filter(Boolean);
return pool(list.map(e => () => once(`i|${cur.ref.k}|${e.slot}|${e.id}|${e.enchant}|${e.exceed}`,
() => X.api('/api/item', { ...charQ(cur.ref), itemId: e.id, enchantLevel: e.enchant || 0, exceedLevel: e.exceed || 0, slotPos: e.slot }).then(it => ({ e, it })))), onProg)
.then(r => r.map((x, i) => x.error ? { e: list[i], error: x.error } : x));
}
const prog = (el, what) => (n, of, wait) => { if (el.isConnected) el.innerHTML = loading(wait ? `PLAYNC limita las consultas seguidas: sigo en ${wait} s (${n} de ${of} ${what})…` : `Cargando ${what}: ${n} de ${of}…`); };
const myLines = it => [...(it.subStats || []).map(s => ({ id: String(s.id).toLowerCase(), name: s.name, value: s.value, added: s.added })), ...(it.subSkills || []).map(s => ({ id: String(s.id), name: s.name, lvl: s.level, skill: true }))];
/* ---------- vista: builds de la comunidad ---------- */
export async function view(kind, el, cur, opt = {}) {
if (kind === 'builds') return buildsView(el, cur, opt);
if (kind === 'comparar') return compareView(el, cur, opt);
if (kind === 'calidad') return qualityView(el, cur);
}
const tagsSeg = (sel, id) => `<div class="seg bl-tags" role="group" aria-label="Tipo de build" id="${id}">${TAGS.map(([t, l]) => `<button type="button" data-tag="${t}" aria-pressed="${t === sel}">${l}</button>`).join('')}</div>`;
const kindSeg = (C, id) => `<div class="seg cu-k" role="group" aria-label="Tipo de build" id="${id}">${KINDS.map(([k, l]) => `<button type="button" data-ck="${k}" aria-pressed="${k === KIND}">${l} <small>${C.kinds?.[k] ?? 0}</small></button>`).join('')}</div>`;
const whyP = t => `<p class="pj-empty cu-why" role="status">${esc(t)}</p>`;
function topHtml(C) {
const T = C.top?.[KIND], all = C.top?.all?.n;
if (!T?.slots) return `<h3 class="pj-h3">Lo que usan los top <small>${KIND_ES[KIND]}</small></h3>${whyP(`Sin datos de los top ${KIND_ES[KIND]}: ${C.reasons?.top?.[KIND] || `muestra chica (${T?.n || 0} de ${all})`}. No rellenamos con otras builds.`)}`;
const D = KIND === 'support' ? [] : C.diffs?.pveVsPvp?.list || [];
const chip = (slot, l) => {
const d = D.find(x => x.what === 'line' && x.slot === slot && x.id === l.id);
return `<li${d ? ` class="df" title="${esc(d.text)}"` : ''}>${esc(l.name)} <b>${l.k}/${l.of}</b>${d ? ` <em>en PvP ${d.PvP > d.PvE ? 'sube' : 'baja'}</em>` : ''}</li>`;
};
const rows = TSLOTS.filter(s => T.slots[s]?.lines?.length).map(s => {
const x = T.slots[s];
return `<tr data-slot="${s}"><th scope="row">${esc(x.name)}</th>${TIERS.map(([t, lb]) => { const L = x.lines.filter(l => l.tier === t); return `<td data-t="${lb}">${L.length ? `<ul class="cu-c">${L.map(l => chip(s, l)).join('')}</ul>` : '<span class="cu-0">—</span>'}</td>`; }).join('')}
<td data-t="Manastones" class="cu-ms">${(x.stones || []).slice(0, 2).map(st => `${esc(st.name)} ${pct(st.share)} %`).join(' · ') || '—'}</td></tr>`;
}).join('');
const arc = ARC.filter(([c]) => T.arcana?.[c]?.length).map(([c, lb]) => `<li><span>${lb}</span> <b>${T.arcana[c].map(a => `${esc(a.set)} ${a.k}`).join(' · ')}<small>/${T.slots[c]?.pieces ?? T.n}</small></b></li>`).join('');
const same = C.diffs?.pveVsPvp?.sameArcana || [];
const dl = d => `<li>${esc(d.text)}</li>`;
return `<h3 class="pj-h3">Lo que usan los top <small>${KIND_ES[KIND]} · ${T.n} de los ${all} de mayor CP en Global · confianza ${esc(T.confidence || '—')} · semana del ${day(C.v)}</small></h3>
<div class="cu-top">
<p class="cu-l"><b>Estigmas</b></p><ul class="cu-c cu-stig">${T.stigmas.filter(s => s.share >= 0.1).map(s => `<li>${esc(s.name)} <b>${s.k}/${s.of}</b></li>`).join('')}</ul>
<p class="cu-l"><b>Set de Arcana</b>${KIND !== 'support' && same.length === ARC.length ? ' <small>igual en PvE y PvP</small>' : ''}</p><ul class="cu-c cu-arc">${arc}</ul>
<p class="cu-l"><b>Stats a buscar por slot</b> <small>piezas de los top que llevan la línea</small></p>
<table class="cu-st"><thead><tr><th scope="col">Slot</th>${TIERS.map(([, lb, th]) => `<th scope="col">${lb} <small>${th}</small></th>`).join('')}<th scope="col">Manastones</th></tr></thead><tbody>${rows}</tbody></table>
${KIND === 'support' ? '' : `<p class="cu-l"><b>PvE vs PvP</b> <small>diferencias que sostiene la muestra (test de dos proporciones)</small></p>${D.length ? `<ul class="cu-df">${D.slice(0, 4).map(dl).join('')}</ul>${D.length > 4 ? `<details class="cu-dfm"><summary>Ver las otras ${D.length - 4}</summary><ul class="cu-df">${D.slice(4).map(dl).join('')}</ul></details>` : ''}` : '<p class="cm-ok">Ninguna: PvE y PvP llevan lo mismo.</p>'}`}
</div>`;
}
function linesHtml(C, cur, cls) {
const head = '<h3 class="pj-h3">Tus líneas de skill <small>Arcanas y soul binding</small></h3>';
if (!cur) return `${head}<p class="pj-empty sl-none">Abrí tu personaje para ver qué líneas de skill te sirven: una línea «+skill» vale 0 si no usás esa skill.</p>`;
if (clsOf(cur.d.profile.class) !== cls) return `${head}<p class="pj-empty sl-none">Tu personaje es ${esc(cur.d.profile.class)}: elegí esa clase para ver sus líneas de skill.</p>`;
const G = C.top?.all?.slots || {};
const P = personalLines(cur.d.skills, C.pools, Object.fromEntries(SLC.map(([c]) => [c, G[GEN[c] || c]?.skillLines || []])));
const rows = SLC.filter(([c]) => C.pools?.[c]?.length).map(([c, lb]) => {
const p = P[c], warn = p.generic.filter(g => g.useless && g.share >= 0.25);
return `<tr data-card="${c}"><th scope="row">${lb}</th>
<td data-t="Para vos">${p.forYou.length ? `<ul class="cu-c sl-you">${p.forYou.map(s => `<li>${esc(s.name)} <b>Nv ${s.lvl}</b> <em>${s.bar ? 'en tu barra' : 'pasiva'}</em></li>`).join('')}</ul>` : '<span class="sl-0">Ninguna de las que puede sortear está en tu barra</span>'}</td>
<td data-t="Lo que llevan los top"><ul class="cu-c sl-gen">${p.generic.map(g => `<li class="${g.useless ? 'miss' : 'ok'}"${g.why ? ` title="${g.why}"` : ''}>${esc(g.name)} <b>${g.k}/${g.of}</b></li>`).join('') || '<li>—</li>'}</ul>
${warn.map(g => `<p class="sl-w"><b>${esc(g.name)}</b> la llevan ${g.k}/${g.of} top pero ${g.why}.</p>`).join('')}</td></tr>`;
}).join('');
return `${head}<table class="cu-st sl"><thead><tr><th scope="col">Pieza</th><th scope="col">Para vos <small>tus skills, por el nivel que les subiste</small></th><th scope="col">Lo que llevan los top <small>las más repetidas</small></th></tr></thead><tbody>${rows}</tbody></table>
<p class="pj-note">Una línea «+skill» suma nivel a esa skill: si no la tenés en la barra (o no la aprendiste) vale 0 para vos. Las pasivas cuentan siempre. Lo que llevan los top es lo más repetido entre los ${C.top?.all?.n ?? '—'} de mayor CP: mucho es suerte del sorteo, no una elección. PLAYNC muestra solo tu preset activo.</p>`;
}
function recB(r) {
if (!QL_OK.test(r.url || '')) return null;
const u = new URL(r.url), id = +u.searchParams.get('build-id'), slug = decodeURIComponent(u.pathname.split('/').pop());
return id && /^[A-Za-z0-9_-]+$/.test(slug) ? { id, slug, name: r.name, char: r.char, author: r.author, likes: r.likes, tags: r.tags || [], url: r.url } : null;
}
function recHtml(C, cur) {
const row = (r, i) => `<li class="bl-c cu-r"><b class="bl-v cu-sc" title="Puntaje de 0 a 100">${r.score}</b>
<span class="bl-m"><b class="bl-nm">${esc(r.name || r.char || 'Sin nombre')}</b><small>de ${esc(r.author || '—')} · ${X.nf(r.likes)} votos${r.updatedAt ? ` · actualizada ${ago(r.updatedAt)}` : ''}</small><small class="cu-rw"><b>Por qué está acá:</b> ${esc(r.why || '')}</small></span>
<span class="bl-a">${recB(r) ? `<button type="button" class="btn" data-rver="${i}">Ver build</button>${cur ? `<button type="button" class="btn ghost" data-rcmp="${i}">Comparar</button>` : ''}` : ''}</span></li>`;
const main = C.recommended?.[KIND] || [], prog = C.recommended?.progresion || [];
return `<h3 class="pj-h3">Recomendadas <small>${KIND_ES[KIND]} · builds de questlog puntuadas contra los top</small></h3>
${main.length ? `<ol class="bl-l cu-rec">${main.map((r, i) => row(r, i)).join('')}</ol>` : whyP(C.reasons?.recommended?.[KIND] || `No hay builds ${KIND_ES[KIND]} con respaldo.`)}
${prog.length ? `<details class="cu-prog"><summary>Progresión <small>${prog.length} para el que recién llega a 45</small></summary><ol class="bl-l">${prog.map((r, i) => row(r, main.length + i)).join('')}</ol></details>` : ''}`;
}
function srcHtml(C) {
const g = (C.guides || []).find(x => x.kind === KIND && A2D.test(x.url)) || (C.guides || []).find(x => A2D.test(x.url));
return `<p class="pj-note cu-src">Datos: top por CP de Global (${ext('https://aion2.plaync.com/', 'PLAYNC')} + ${ext('https://questlog.gg/aion-2', 'questlog')}), guías de ${ext(g?.url || 'https://aion2data.com/', 'aion2data.com')} y builds de ${ext('https://questlog.gg/aion-2/character-builder', 'questlog.gg')}. Se recalcula cada semana (esta: ${day(C.v)}). No son datos oficiales.</p>`;
}
function buildsView(el, cur, { cls = cur ? clsOf(cur.d.profile.class) : null, tag = '' } = {}) {
if (!CLS_ES[cls]) cls = 'chanter';                     // por defecto, la del personaje (o la de "mi personaje" sin ficha abierta)
el.innerHTML = `<section class="card pj-sec bl" aria-labelledby="bl-h">
<div class="bl-top"><h2 id="bl-h">Builds</h2><span class="sel"><select id="bl-cls" aria-label="Clase">${CLASSES.map(([k, l]) => `<option value="${k}"${k === cls ? ' selected' : ''}>${l}</option>`).join('')}</select></span><button type="button" class="linkbtn" id="bl-how" data-how>Cómo elegimos</button></div>
<div class="cu"></div>
<details class="bl-more" id="bl-more" hidden><summary>Más builds de la comunidad <small>las más votadas en questlog, sin puntuar</small></summary>
${tagsSeg(tag, 'bl-tg')}
<p class="pj-note bl-src"><em class="tag gold">Comunidad</em> ${COMMUNITY}${cur ? '' : ' Para compararla con tu personaje, abrí su ficha y tocá <b>Comparar</b>.'}</p>
<div class="bl-out"></div></details></section>`;
const cuEl = $('.cu', el), more = $('#bl-more', el), outEl = $('.bl-out', el);
let seq = 0, cseq = 0, list = [], listFor = null, C = null, R = [];
const paintCur = () => {
R = [...(C.recommended?.[KIND] || []), ...(C.recommended?.progresion || [])];
cuEl.innerHTML = `${kindSeg(C, 'cu-kd')}${topHtml(C)}${linesHtml(C, cur, cls)}${recHtml(C, cur)}${srcHtml(C)}`;
};
async function loadCur() {
const s = ++cseq;
C = null; more.hidden = true;
cuEl.setAttribute('aria-busy', 'true');
cuEl.innerHTML = loading(`Buscando lo que usan los top de ${CLS_ES[cls]}…`);
try {
C = await getCur(cls);
if (s !== cseq) return;
paintCur();
announce(`Builds de ${CLS_ES[cls]}`);
} catch (e) {
if (s !== cseq) return;
cuEl.innerHTML = e.kind === 'notfound' ? `<div class="pj-msg cu-none" role="status"><h3>${CLS_ES[cls]}: sin builds curadas por ahora</h3><p>${esc(e.message || '')}</p><p>Mientras tanto, abajo están las más votadas de la comunidad.</p></div>` : errHtml(e, 'las builds curadas');
if (e.kind === 'notfound') more.open = true;
}
cuEl.setAttribute('aria-busy', 'false');
more.hidden = false;
if (more.open) load();
}
async function load(force) {
if (!force && listFor === `${cls}|${tag}`) return;
const s = ++seq;
listFor = `${cls}|${tag}`;
outEl.setAttribute('aria-busy', 'true');
outEl.innerHTML = loading(`Buscando builds de ${CLS_ES[cls]}…`);
try {
const r = await getList(cls, tag);
if (s !== seq) return;
list = r.builds;
outEl.innerHTML = list.length ? `<p class="bl-n">${X.nf(r.total)} build${r.total === 1 ? '' : 's'} de ${CLS_ES[cls]}${tag ? ` con «${TAG_ES[tag]}»` : ''}; acá van las ${list.length} más votadas.${r.stale ? ' <em class="tag warn">questlog no responde: es la última lista que tengo</em>' : ''}</p>
<ol class="bl-l">${list.map((b, i) => `<li class="bl-c"><b class="bl-v" title="Votos en questlog">${ico('i-star-on')}${X.nf(b.likes)}</b>
<span class="bl-m"><b class="bl-nm">${esc(b.name || b.char || 'Sin nombre')}</b><small>de ${esc(b.author || '—')}${b.updatedAt ? ` · actualizada ${ago(b.updatedAt)}` : ''}</small>
${b.tags.length ? `<span class="bl-t">${b.tags.map(t => `<em class="tag">${esc(TAG_ES[t] || t)}</em>`).join('')}</span>` : ''}</span>
<span class="bl-a"><button type="button" class="btn" data-ver="${i}">Ver build</button>${cur ? `<button type="button" class="btn ghost" data-cmp="${i}">Comparar</button>` : ''}</span></li>`).join('')}</ol>`
: `<p class="pj-empty">No hay builds de ${CLS_ES[cls]}${tag ? ` con «${TAG_ES[tag]}»` : ''} en questlog.</p>`;
announce(`${list.length} builds`);
} catch (e) { if (s === seq) { outEl.innerHTML = errHtml(e, 'builds'); listFor = null; } }
outEl.setAttribute('aria-busy', 'false');
}
more.addEventListener('toggle', () => { if (more.open) load(); });
el.onchange = e => { if (e.target.id === 'bl-cls') { cls = e.target.value; loadCur(); } };
el.onclick = e => {
const k = e.target.closest('[data-ck]');
if (k && C) { KIND = k.dataset.ck; paintCur(); $(`#cu-kd [data-ck=${KIND}]`, el).focus(); announce(`Tipo ${KIND_ES[KIND]}`); return; }
const t = e.target.closest('[data-tag]');
if (t) { tag = t.dataset.tag; for (const b of el.querySelectorAll('#bl-tg button')) b.setAttribute('aria-pressed', String(b === t)); load(true); return; }
if (e.target.closest('[data-how]')) return how();
if (e.target.closest('[data-retry]')) return e.target.closest('.cu') ? loadCur() : load(true);
const v = e.target.closest('[data-ver]'), c = e.target.closest('[data-cmp]'), rv = e.target.closest('[data-rver]'), rc = e.target.closest('[data-rcmp]');
if (v) showBuild(list[+v.dataset.ver], cur);
else if (c) X.tab('comparar', { pick: list[+c.dataset.cmp], tag });
else if (rv) showBuild(recB(R[+rv.dataset.rver]), cur);
else if (rc) X.tab('comparar', { pick: recB(R[+rc.dataset.rcmp]) });
};
loadCur();
}
/* ---------- detalle de una build (modal) ---------- */
const attrib = b => `<p class="bd-src"><em class="tag gold">Build de la comunidad</em> Build de <b>${esc(b.author || '—')}</b> en <a href="${esc(qlUrl(b.url))}" target="_blank" rel="noopener noreferrer">questlog.gg${ico('i-ext')}</a>${b.likes != null ? ` · ${X.nf(b.likes)} votos` : ''}</p>`;
function showBuild(b, cur) {
const box = document.createElement('div');
box.className = 'bd';
box.innerHTML = `${attrib(b)}<div class="bd-b">${loading('Cargando la build…')}</div>`;
const acts = cur ? [{ label: 'Comparar con mi personaje', value: 'cmp', primary: true }, { label: 'Cerrar', value: null }] : [{ label: 'Cerrar', value: null }];
modal({ title: b.name || b.char || 'Build', node: box, cls: 'pj-bd', actions: acts }).then(v => { if (v === 'cmp') X.tab('comparar', { pick: b }); });
const fill = async () => {
try { $('.bd-b', box).innerHTML = buildBody(await getBuild(b.slug, b.id)); } catch (e) { $('.bd-b', box).innerHTML = errHtml(e, 'esa build'); }
};
box.addEventListener('click', e => { if (e.target.closest('[data-retry]')) { e.preventDefault(); fill(); } });
fill();
}
const lineLi = l => l.skill ? `<li class="ln-s"><span>${esc(l.name || `Skill ${l.id}`)}</span><b>skill</b></li>` : `<li><span>${esc(stLabel(l.id))}</span><b>${esc(fmt(l.id, l.v))}</b></li>`;
const SKCAT = [['active', 'Activas'], ['passive', 'Pasivas'], ['stigma', 'Estigmas']];
function buildBody(d) {
const eq = SLOT.filter(s => !ARCANA.has(s[0])).map(s => [s, d.equipment.find(e => e.slot === s[0])]).filter(x => x[1]);
const sk = d.skills?.list || [];
return `${d.stale ? '<p class="tag warn">questlog no responde: es la última versión que tengo</p>' : ''}
<h3 class="pj-h3">Equipo</h3><ul class="bd-eq">${eq.map(([s, e]) => `<li class="${X.gcls(e.grade)}"><span class="eq-i">${X.img(e.icon, 40)}${e.lvl ? `<b class="eq-en">+${e.lvl}</b>` : ''}</span>
<span class="bd-t"><small>${s[1]} · <span class="eq-gr">${esc(X.GRADE[e.grade] || e.grade)}</span></small><b>${esc(e.name)}</b>
${e.lines.length ? `<ul class="ln">${e.lines.map(lineLi).join('')}</ul>` : ''}
${e.stones.length ? `<small class="bd-ms">Piedras de maná: ${e.stones.map(x => `${esc(stLabel(x.id))} +${esc(fmt(x.id, x.v))}`).join(' · ')}</small>` : ''}
${e.add ? `<small class="bd-ms">Línea agregada: ${esc(stLabel(e.add.id))} ${esc(fmt(e.add.id, e.add.v))}</small>` : ''}</span></li>`).join('') || '<li class="pj-empty">Sin equipo cargado.</li>'}</ul>
${d.arcana.length ? `<h3 class="pj-h3">Arcana</h3><ul class="bd-ar">${d.arcana.map(a => `<li><b class="${X.gcls(a.grade)}">${esc(a.name)}${a.lvl ? ` +${a.lvl}` : ''}</b><small>${a.skills.map(s => `${esc(s.name || `Skill ${s.id}`)} Nv ${s.lvl}`).join(' · ') || 'sin skills'}</small></li>`).join('')}</ul>` : ''}
${d.titles.length ? `<h3 class="pj-h3">Títulos</h3><ul class="bd-ar">${d.titles.map(t => `<li><small>${{ attack: 'Ataque', defense: 'Defensa', utility: 'Utilidad' }[t.cat] || esc(t.cat)}</small><b>${esc(t.name || t.id)}</b></li>`).join('')}</ul>` : ''}
<h3 class="pj-h3">Skills y estigmas ${d.skills ? `<small>${esc(d.skills.name || '')}</small>` : ''}</h3>
${sk.length ? SKCAT.map(([c, t]) => { const l = sk.filter(s => s.cat === c).sort((a, b) => (b.slot != null) - (a.slot != null)); return l.length ? `<p class="bd-k">${t}</p><ul class="sk-g">${l.map(s => `<li class="sk${c !== 'passive' && s.slot == null ? ' off' : ''}"><span>${esc(s.name || `Skill ${s.id}`)}</span><b>Nv ${s.lvl}</b></li>`).join('')}</ul>` : ''; }).join('')
+ '<p class="pj-note">Atenuadas: subidas pero sin poner en la barra. Las especializaciones están en questlog y no se comparan: PLAYNC no las muestra.</p>' : '<p class="pj-empty">Esta build no trae skills.</p>'}
<h3 class="pj-h3">Daevanion ${d.daevanion ? `<small>${esc(d.daevanion.name || '')}</small>` : ''}</h3>
${d.daevanion ? `<ul class="bd-ar">${Object.entries(d.daevanion.boards).map(([id, l]) => `<li><b>${DAE[(+id % 10) - 1] || `Tablero ${esc(id)}`}</b><small>${l.length} nodos</small></li>`).join('')}</ul>` : '<p class="pj-empty">Esta build no trae Daevanion.</p>'}`;
}
/* ---------- vista: comparar mi personaje con una build ---------- */
const WARN = '<p class="pj-note cm-warn"><b>Ojo:</b> PLAYNC muestra solo el preset <b>activo</b> (equipo, skills y estigmas). Si tenés otro preset puesto, por ejemplo uno de PvP o de healer, la comparación es contra ese. Las especializaciones de skills no salen en PLAYNC y no se comparan. La build es de la comunidad, no un dato oficial.</p>';
function compareView(el, cur, { pick = null, tag = '' } = {}) {
const cls = clsOf(cur.d.profile.class);
if (!cls) { el.innerHTML = `<section class="card pj-sec"><p class="pj-empty">No tengo builds para la clase «${esc(cur.d.profile.class)}».</p></section>`; return; }
el.innerHTML = `<section class="card pj-sec cm" aria-labelledby="cm-h"><h2 id="cm-h">Comparar con una build</h2>
${tagsSeg(tag, 'cm-tg')}
<div class="cm-pick"><span class="sel"><select id="cm-b" aria-label="Build para comparar" disabled><option>Cargando builds…</option></select></span><button type="button" class="btn ghost" id="cm-ver" disabled>Ver build</button></div>
${WARN}<div class="cm-out" aria-live="polite"></div></section>`;
const sel = $('#cm-b', el), outEl = $('.cm-out', el);
let list = [], seq = 0;
async function loadList() {
const s = ++seq;
sel.disabled = $('#cm-ver', el).disabled = true;
outEl.innerHTML = loading(`Buscando builds de ${CLS_ES[cls]}…`);
try {
list = (await getList(cls, tag)).builds;
if (s !== seq) return;
if (pick && !list.some(b => b.id === pick.id)) list = [pick, ...list];
if (!list.length) { sel.innerHTML = '<option>Sin builds</option>'; outEl.innerHTML = `<p class="pj-empty">No hay builds de ${CLS_ES[cls]}${tag ? ` con «${TAG_ES[tag]}»` : ''} en questlog.</p>`; return; }
sel.innerHTML = list.map((b, i) => `<option value="${i}">${X.nf(b.likes)} votos · ${esc(b.name || b.char || 'Sin nombre')} (${esc(b.author || '—')})</option>`).join('');
sel.value = String(pick ? list.findIndex(b => b.id === pick.id) : 0);    // por defecto: la más votada del tipo elegido
sel.disabled = $('#cm-ver', el).disabled = false;
run();
} catch (e) { if (s === seq) outEl.innerHTML = errHtml(e, 'builds'); }
}
async function run() {
const s = ++seq, b = list[+sel.value];
outEl.setAttribute('aria-busy', 'true');
outEl.innerHTML = loading('Cargando la build…');
try {
const d = await getBuild(b.slug, b.id);
if (s !== seq) return;
const slots = SLOT.filter(x => x[3]).map(x => x[2]);
const boardIds = Object.keys(d.daevanion?.boards || {}).map(Number).filter(id => (cur.d.daevanion || []).some(x => x.id === id));
let n = 0;
const total = slots.filter(x => cur.d.equipment.some(e => e.slot === x)).length + boardIds.length;
const step = (k, of, wait) => { if (!wait) n++; prog(outEl, 'piezas y tableros')(n, total, wait); };
const [items, boards] = await Promise.all([
myItems(cur, slots, (k, of, w) => step(k, of, w)),
pool(boardIds.map(id => () => once(`d|${cur.ref.k}|${id}`, () => X.api('/api/daevanion', { ...charQ(cur.ref), board: id }))), (k, of, w) => step(k, of, w)),
]);
if (s !== seq || !outEl.isConnected) return;
outEl.innerHTML = compareHtml(cur, b, d, items, boardIds.map((id, i) => [id, boards[i]]));
announce('Comparación lista');
} catch (e) { if (s === seq) outEl.innerHTML = errHtml(e, 'esa build'); }
outEl.setAttribute('aria-busy', 'false');
}
el.onchange = e => { if (e.target === sel) { pick = null; run(); } };
el.onclick = e => {
const t = e.target.closest('[data-tag]');
if (t) { tag = t.dataset.tag; pick = null; for (const x of el.querySelectorAll('#cm-tg button')) x.setAttribute('aria-pressed', String(x === t)); loadList(); return; }
if (e.target.closest('[data-retry]')) return list.length ? run() : loadList();
if (e.target.closest('#cm-ver')) showBuild(list[+sel.value], null);
};
loadList();
}
const chip = (cls, t) => `<li class="${cls}">${esc(t)}</li>`;
function compareHtml(cur, b, d, items, boards) {
const mine = new Map(items.filter(x => x.it).map(x => [x.e.slot, x]));
const skN = new Map((cur.d.skills || []).map(s => [String(s.id), s.name]));
const nameOf = (l, extra) => l.skill ? (l.name || skN.get(l.id) || `Skill ${l.id}`) : stLabel(l.id) + (extra && l.v != null ? ` ${fmt(l.id, l.v)}` : '');
let same = 0, slotsN = 0, common = 0, wanted = 0, failed = 0;
const rows = SLOT.map(([k, lb, pos, rnd]) => {
const e = cur.d.equipment.find(x => x.slot === pos), bp = ARCANA.has(k) ? d.arcana.find(a => a.slot === k) : d.equipment.find(x => x.slot === k);
if (!e && !bp) return '';
slotsN++;
const eqItem = e && bp && String(e.id) === String(bp.id);
if (eqItem) same++;
const head = `<span class="cm-s"><small>${lb}</small><b>${esc(e?.name || 'Vacío')}</b>${eqItem ? '<em class="tag gold">mismo ítem</em>' : bp ? `<small>Build: ${esc(bp.name)}</small>` : '<small>La build no usa este slot</small>'}</span>`;
if (!rnd || !bp) return `<li class="cm-r">${head}<span class="cm-d">${rnd ? '' : '<small class="cm-fx">Líneas fijas del ítem</small>'}</span></li>`;
const m = mine.get(pos);
if (e && !m) { failed++; return `<li class="cm-r">${head}<span class="cm-d"><small class="tip-err">No pude leer tus líneas de esta pieza.</small></span></li>`; }
const theirs = ARCANA.has(k) ? bp.skills.map(s => ({ ...s, skill: true })) : bp.lines;
const ml = m ? myLines(m.it) : [], mIds = new Set(ml.map(l => l.id)), tIds = new Set(theirs.map(l => l.id));
const miss = theirs.filter(l => !mIds.has(l.id)), extra = ml.filter(l => !tIds.has(l.id)), both = theirs.filter(l => mIds.has(l.id));
common += both.length; wanted += theirs.length;
return `<li class="cm-r">${head}<span class="cm-d">
${miss.length ? `<ul class="cm-c" aria-label="Te faltan">${miss.map(l => chip('miss', '− ' + nameOf(l, true))).join('')}</ul>` : ''}
${extra.length ? `<ul class="cm-c" aria-label="Te sobran">${extra.map(l => chip('extra', '+ ' + (l.name || nameOf(l)))).join('')}</ul>` : ''}
<small class="cm-k">${both.length} de ${theirs.length} líneas en común${!miss.length && theirs.length ? ' ✓' : ''}</small></span></li>`;
}).join('');
const myS = new Map((cur.d.skills || []).map(s => [String(s.id), s]));
const sk = d.skills?.list || [], used = s => s.slot != null;
const lv = m => m ? (m.level || (m.acquired || m.equipped ? 1 : 0)) : 0;     // estigma "base" (nivel 0 equipada) = nivel 1
const stigMiss = sk.filter(s => s.cat === 'stigma' && used(s) && !myS.get(s.id)?.equipped);
const stigExtra = (cur.d.skills || []).filter(s => s.category === 'Dp' && s.equipped && !sk.some(x => x.id === String(s.id) && used(x)));
const actMiss = sk.filter(s => s.cat === 'active' && used(s) && !myS.get(s.id)?.equipped);
const lvl = sk.filter(s => s.lvl > 0 && myS.has(s.id)).map(s => ({ s, m: myS.get(s.id), d: lv(myS.get(s.id)) - s.lvl }));
const low = lvl.filter(x => x.d < 0).sort((a, b) => a.d - b.d), high = lvl.filter(x => x.d > 0).length;
const skName = s => s.name || myS.get(s.id)?.name || `Skill ${s.id}`;
const skills = !d.skills ? '<p class="pj-empty">Esta build no trae skills: no hay con qué comparar.</p>' : `
<div class="cm-g">
<div><h4>Estigmas que usa la build y vos no</h4>${stigMiss.length ? `<ul class="cm-c">${stigMiss.map(s => chip('miss', `${skName(s)} · Nv ${s.lvl}`)).join('')}</ul>` : '<p class="cm-ok">Ninguna ✓</p>'}</div>
<div><h4>Estigmas tuyas que la build no usa</h4>${stigExtra.length ? `<ul class="cm-c">${stigExtra.map(s => chip('extra', s.name)).join('')}</ul>` : '<p class="cm-ok">Ninguna</p>'}</div>
${actMiss.length ? `<div><h4>Activas que la build pone en la barra y vos no</h4><ul class="cm-c">${actMiss.map(s => chip('miss', skName(s))).join('')}</ul></div>` : ''}
</div>
<h4>Niveles por debajo de la build <small>${low.length}${high ? ` · en ${high} tenés más nivel que la build` : ''}</small></h4>
${low.length ? `<ul class="cm-lv">${low.map(x => `<li><span>${esc(skName(x.s))}</span><span class="cm-n">vos ${x.m.category === 'Dp' && !x.m.level ? 'base' : `Nv ${x.m.level}`} · build Nv ${x.s.lvl}</span><b>${x.d}</b></li>`).join('')}</ul>` : '<p class="cm-ok">Estás igual o arriba en todas ✓</p>'}`;
const dae = !d.daevanion ? '<p class="pj-empty">Esta build no trae Daevanion.</p>' : `<ul class="cm-dae">${boards.map(([id, t]) => {
const pb = (cur.d.daevanion || []).find(x => x.id === id), name = esc(pb?.name || DAE[(id % 10) - 1] || `Tablero ${id}`);
if (!t || t.error) return `<li><b>${name}</b><small class="tip-err">No pude leer tu tablero.</small></li>`;
const nodes = (t.nodeList || []).filter(n => n.type !== 'None'), open = new Set(nodes.filter(n => n.open).map(n => String(n.nodeId)));
const want = new Set(d.daevanion.boards[id]), byId = new Map(nodes.map(n => [String(n.nodeId), n]));
const both = [...want].filter(x => open.has(x)).length, miss = [...want].filter(x => !open.has(x)), extra = [...open].filter(x => !want.has(x));
const group = ids => { const c = new Map(); for (const i of ids) { const n = byId.get(i); const k = n ? (n.effectList?.map(x => x.desc).join(', ') || n.name) : `Nodo ${i}`; c.set(k, (c.get(k) || 0) + 1); } return [...c].sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li>${esc(k)}${v > 1 ? ` <b>×${v}</b>` : ''}</li>`).join(''); };
return `<li><b>${name}</b><span class="cm-dn"><span>${both} en común</span><span class="miss">${miss.length} te faltan</span><span class="extra">${extra.length} de más</span></span>
${miss.length || extra.length ? `<details><summary>Ver nodos</summary>${miss.length ? `<p class="bd-k">Te faltan</p><ul class="cm-nl">${group(miss)}</ul>` : ''}${extra.length ? `<p class="bd-k">Tenés de más</p><ul class="cm-nl">${group(extra)}</ul>` : ''}</details>` : ''}</li>`;
}).join('') || '<li class="pj-empty">La build no usa tableros que tengas.</li>'}</ul>`;
return `${attrib(b)}${d.stale ? '<p class="tag warn">questlog no responde: es la última versión que tengo</p>' : ''}
<dl class="cm-sum"><div><dt>Mismo ítem</dt><dd>${same}<small>/${slotsN}</small></dd></div><div><dt>Líneas en común</dt><dd>${common}<small>/${wanted}</small></dd></div>
<div><dt>Estigmas que faltan</dt><dd>${d.skills ? stigMiss.length : '—'}</dd></div><div><dt>Nodos que faltan</dt><dd>${d.daevanion ? boards.reduce((a, [id, t]) => a + (t && !t.error ? [...new Set(d.daevanion.boards[id])].filter(x => !(t.nodeList || []).some(n => n.open && String(n.nodeId) === x)).length : 0), 0) : '—'}</dd></div></dl>
${failed ? `<p class="tip-err">No pude leer ${failed} pieza${failed > 1 ? 's' : ''}; tocá Reintentar para probar de nuevo.</p><button type="button" class="btn" data-retry>${ico('i-reset')}Reintentar</button>` : ''}
<h3 class="pj-h3">Equipo <small>− te falta · + te sobra (frente a la build)</small></h3><ul class="cm-l">${rows}</ul>
<h3 class="pj-h3">Skills y estigmas</h3>${skills}
<h3 class="pj-h3">Daevanion por tablero</h3>${dae}`;
}
/* ---------- vista: calidad del equipo ---------- */
export function rollOf(line, pool) {
const r = (pool || []).find(p => p[0] === line.id);
const v = parseFloat(String(line.value ?? '').replace(',', '.'));
if (!r || !isFinite(v)) return null;
const [, min, max] = r, dist = x => x < min ? min - x : x > max ? x - max : 0;
const s = dist(v * 100) < dist(v) ? 100 : 1, x = v * s;
const out = dist(x) > Math.max(6, 0.15 * (max - min));                    // no es de este pool (otra versión del ítem, línea agregada)
return { q: max > min ? Math.max(0, Math.min(1, (x - min) / (max - min))) : 1, min, max, s, out, pctv: /%/.test(String(line.value)) };
}
const rng = (r) => { const f = v => r.s === 100 ? num(r.pctv ? v / 100 : Math.round(v / 100)) : num(v); return `${f(r.min)}–${f(r.max)}${r.pctv ? ' %' : ''}`; };
async function qualityView(el, cur) {
const cls = clsOf(cur.d.profile.class);
el.innerHTML = `<section class="card pj-sec q" aria-labelledby="q-h"><div class="bl-top"><h2 id="q-h">Calidad del equipo</h2><button type="button" class="linkbtn" id="q-how" data-how>Cómo calculamos</button></div>
<p class="pj-note">Por cada línea de soul binding: dónde cayó tu valor dentro del rango posible de ese ítem en Global (100 % = salió al tope). La <b>afinidad</b>: cuántas de tus líneas son de las que usan los top de ${esc(cur.d.profile.class)} del tipo que elijas. Las líneas de skill se miden con tus skills: si no usás esa skill, valen 0. Tocá una línea para ver el detalle.</p>
<div class="q-out" aria-live="polite"></div></section>`;
const outEl = $('.q-out', el);
let got = null;
const paint = () => { outEl.innerHTML = (got.C.error ? '' : kindSeg(got.C, 'q-kd')) + qualityHtml(cur, got.items, got.tbl, got.C); };
el.onclick = e => {
const k = e.target.closest('[data-ck]');
if (k && got) { KIND = k.dataset.ck; paint(); $(`#q-kd [data-ck=${KIND}]`, el).focus(); announce(`Afinidad contra los top ${KIND_ES[KIND]}`); }
else if (e.target.closest('[data-how]')) how();
else if (e.target.closest('[data-retry]')) load();
};
async function load() {
outEl.setAttribute('aria-busy', 'true');
outEl.innerHTML = loading('Cargando tus piezas…');
try {
const slots = SLOT.filter(x => x[3] && !ARCANA.has(x[0])).map(x => x[2]);
const [items, C] = await Promise.all([myItems(cur, slots, prog(outEl, 'piezas')), cls ? getCur(cls).catch(error => ({ error })) : { error: { kind: 'notfound' } }]);
const ok = items.filter(x => x.it), ids = [...new Set(ok.map(x => x.e.id))];
if (!ok.length) throw items[0]?.error || Object.assign(new Error(''), { kind: 'notfound', message: 'Este personaje no tiene piezas con soul binding.' });
const tbl = await X.api('/api/itemlines', { ids: ids.join(',') });
if (!outEl.isConnected) return;
got = { items, tbl: tbl.items, C };
paint();
} catch (e) { outEl.innerHTML = errHtml(e, 'tus piezas'); }
outEl.setAttribute('aria-busy', 'false');
}
load();
}
function qualityHtml(cur, items, tbl, C) {
const T = C.error ? null : C.top?.[KIND], TS = T?.slots, U = skillUse(cur.d.skills), KS = KIND_ES[KIND];
const dead = l => !!l.skill && !U.ok(l.id);              // línea "+skill" de una skill que no usás: vale 0
let qs = [], hits = 0, pop = 0, zero = 0;
const cards = SLOT.filter(x => x[3] && !ARCANA.has(x[0])).map(([k, lb, pos]) => {
const x = items.find(y => y.e.slot === pos);
if (!x) return '';
if (!x.it) return `<li class="q-c"><div class="q-h"><small>${lb}</small><b>${esc(x.e.name)}</b></div><p class="tip-err">No pude leer esta pieza.</p></li>`;
const lines = myLines(x.it), poolL = tbl[x.e.id]?.lines;
const rolls = lines.map(l => ({ l, r: l.skill ? null : rollOf(l, poolL) }));
const good = rolls.filter(y => y.r && !y.r.out), avg = good.length ? good.reduce((a, y) => a + y.r.q, 0) / good.length : null;
if (avg != null) qs.push(...good.map(y => y.r.q));
zero += lines.filter(dead).length;
const sl = TS?.[CSLOT(k)], K = Math.max(lines.length, x.it.subStatCount || 0) || 4;
const popular = sl ? sl.lines.filter(l => l.tier === 'Best' || l.tier === 'Good').slice(0, K) : [];
const mine = new Set(lines.map(l => l.id)), have = popular.filter(p => mine.has(p.id));
hits += have.length; pop += popular.length;
const popIds = new Set(popular.map(p => p.id)), qv = y => dead(y.l) ? -1 : y.r?.q ?? 0.5;
const cand = rolls.filter(y => !popIds.has(y.l.id) && !y.l.added && (!y.l.skill || dead(y.l))).sort((a, b) => qv(a) - qv(b));
const weak = cand[0] && (dead(cand[0].l) || popular.length) ? cand[0] : null;
const low = !weak && good.length ? good.slice().sort((a, b) => a.r.q - b.r.q)[0] : null;
const targets = popular.filter(p => !mine.has(p.id)).slice(0, 2);
const sug = weak ? `Línea más floja para rerollear: <b>${esc(weak.l.name)}</b> (${dead(weak.l) ? 'suma nivel a una skill que no usás: para vos vale 0' : `${weak.r ? `${pct(weak.r.q)} % del rango y ` : ''}no está entre las que usan los top ${KS}`}).`
: low && low.r.q < 0.5 ? `Tus líneas son de las que usan los top; la más baja es <b>${esc(low.l.name)}</b> (${pct(low.r.q)} % del rango).` : popular.length ? `Nada urgente: tus líneas son de las que usan los top ${KS}.` : '';
const rate = parseFloat(x.it.soulBindRate);       // contexto, NO calidad (ver "Cómo calculamos")
const skTag = l => dead(l) ? ' <em class="tag warn">no la usás: vale 0</em>' : ' <em class="tag">la usás</em>';
const skTxt = l => { const s = U.by.get(l.id); return dead(l) ? `Línea de skill: suma nivel a ${esc(l.name)}, que ${U.why(l.id)}. Para vos vale 0: es la primera candidata a rerollear.` : `Línea de skill: suma nivel a ${esc(l.name)}, que usás (${s.category === 'Passive' ? 'pasiva, ' : ''}Nv ${s.level}). No tiene rango de valores.`; };
return `<li class="q-c"><div class="q-h"><span class="q-hn"><small>${lb}${isFinite(rate) ? ` · atadura ${num(rate)} %` : ''}</small><b class="${X.gcls(x.e.grade)}">${esc(x.e.name)}</b></span>
<span class="q-k"><span>Calidad</span><b>${avg == null ? '—' : pct(avg) + ' %'}</b>${avg == null ? '' : bar(avg, `Calidad promedio ${pct(avg)} %`)}</span>
<span class="q-k"><span>Afinidad</span><b>${popular.length ? `${have.length} de ${popular.length}` : '—'}</b>${popular.length ? bar(have.length / popular.length, `Afinidad ${have.length} de ${popular.length}`) : ''}</span></div>
<ul class="q-ls">${rolls.map(({ l, r }) => `<li><details><summary><span class="q-ln">${esc(l.name)}${popIds.has(l.id) ? ' <em class="tag gold">top</em>' : ''}${l.skill ? skTag(l) : ''}${l.added ? ' <em class="tag">agregada</em>' : ''}</span><b>${l.skill ? `Nv ${l.lvl}` : esc(l.value)}</b>
${r && !r.out ? `${bar(r.q, `${pct(r.q)} % del rango`)}<span class="q-p">${pct(r.q)} %</span>` : `<span class="q-na">${l.skill ? 'skill' : 's/ rango'}</span>`}</summary>
<p>${l.skill ? skTxt(l) : r ? (r.out ? `Tu valor no cae en el rango conocido de este ítem (${rng(r)}): puede ser otra versión del ítem o una línea agregada. No entra en el promedio.` : `Rango en Global para este ítem: ${rng(r)}. Tu ${esc(l.value)} está al <b>${pct(r.q)} %</b> del rango (0 % = mínimo, 100 % = máximo).${r.pctv ? ' PLAYNC redondea a un decimal: puede haber ±3 puntos.' : ''}`) : 'No tengo el rango de esta línea para este ítem.'}
${popIds.has(l.id) ? ` La llevan ${popular.find(p => p.id === l.id).k} de ${popular.find(p => p.id === l.id).of} piezas de los top ${KS} en este slot.` : ''}</p></details></li>`).join('')}</ul>
${sug || targets.length ? `<p class="q-sug"><em class="tag">Estimación</em> ${sug}${targets.length ? ` Apuntá a: ${targets.map(p => `<b>${esc(p.name)}</b> (${p.k} de ${p.of} piezas top)`).join(', ')}.` : ''}</p>` : ''}</li>`;
}).join('');
const avgAll = qs.length ? qs.reduce((a, b) => a + b, 0) / qs.length : null;
const note = TS ? `<p class="pj-note">Afinidad contra lo que usan los ${T.n} top ${KS} de ${esc(CLS_ES[C.class] || cur.d.profile.class)} por CP en Global (semana del ${day(C.v)}). Cambiá el tipo arriba.</p>`
: C.error ? `<p class="tip-err">${C.error.kind === 'notfound' ? `${esc(C.error.message || 'Todavía no hay builds curadas para esta clase')}. La afinidad queda sin calcular; la calidad sí.` : 'No pude traer lo que usan los top: la afinidad queda sin calcular. La calidad sí.'}</p>`
: `<p class="tip-err q-why">Sin top ${KS} para comparar: ${esc(C.reasons?.top?.[KIND] || 'muestra chica')}. La afinidad queda sin calcular; la calidad sí.</p>`;
return `<dl class="cm-sum"><div><dt>Calidad promedio</dt><dd>${avgAll == null ? '—' : pct(avgAll) + ' %'}</dd></div><div><dt>Afinidad ${TS ? KS : ''}</dt><dd>${pop ? `${hits}<small>/${pop}</small>` : '—'}</dd></div><div><dt>Skills que no usás</dt><dd>${zero}<small> líneas</small></dd></div></dl>
${note}
<ul class="q-l">${cards}</ul>
<p class="pj-note"><b>Las sugerencias son estimaciones.</b> No está verificada la mecánica exacta del reroll (si se bloquean líneas, si sale una o todas, cómo se reparte el valor): no hay probabilidades acá. Las Arcanas no entran acá (sus líneas son skills, sin rango): miralas en Builds → Tus líneas de skill.</p>`;
}
function how() {
modal({ title: 'Cómo calculamos', cls: 'pj-how', html: `
<p><b>Lo que usan los top.</b> Una vez por semana leemos en el armory público de PLAYNC a los 30 personajes de mayor CP de cada clase en Global (lista de questlog, las 5 regiones) y los separamos en PvE, PvP y Support por lo que llevan puesto (amuleto feroz, piedras y líneas PvP, estigmas de support). Un tipo con menos de 3 no se muestra: decimos por qué en vez de rellenar. Por slot: <b>Mejor</b> = la lleva al menos el 50 % de las piezas, <b>Buena</b> el 25 %, <b>Sirve</b> el 10 %. "En PvP sube" solo cuando la diferencia es de 20 puntos o más y pasa un test estadístico.</p>
<p><b>Recomendadas.</b> Builds públicas de questlog puntuadas de 0 a 100: 45 % cuánto se parecen a los top de su tipo (ítems, líneas y estigmas), 20 % votos, 20 % si son posteriores al último parche y 15 % si coinciden con las guías de aion2data.com. Menos de 50 no entra. Las de progresión van aparte.</p>
<p><b>Calidad de una línea.</b> Cada línea de soul binding de un ítem tiene un rango posible en Global (por ejemplo Velocidad de combate del arma: 10,63–12,29 %). La calidad es dónde cayó la tuya: (tu valor − mínimo) / (máximo − mínimo). 100 % = salió al tope. Es un hecho del ítem: no depende de ninguna build.</p>
<p>Los rangos salen de las tablas de questlog.gg (coinciden con Global). Tus valores salen del armory de PLAYNC, que redondea los porcentajes a un decimal: puede haber ±3 puntos. Una línea que no cae en el rango conocido no entra en el promedio.</p>
<p>El porcentaje de <b>atadura</b> que muestra el juego por pieza no es la calidad del roll y no entra en la cuenta: lo mostramos al lado del slot como contexto. Ojo: en las piezas que miramos, las de atadura baja tenían casi todas las líneas en el mínimo y las de 100 % en el máximo. Puede que los valores suban al atar la pieza; no lo verificamos en el juego. Si es así, una calidad baja con atadura baja es una pieza sin terminar de atar, no mala suerte.</p>
<p><b>Afinidad.</b> Contra los top del tipo que elegís (PvE, PvP o Support): las líneas de ese slot que llevan al menos el 25 % de sus piezas (Mejor o Buena), las más llevadas primero, tantas como líneas tiene tu pieza. Afinidad = cuántas de esas tenés. Cambiar el tipo cambia la cuenta.</p>
<p><b>Líneas de skill.</b> Una línea «+skill» suma nivel a una skill. Solo te sirve si la usás: activa en tu barra o pasiva aprendida (las pasivas cuentan siempre). Si no, vale 0 para vos: la marcamos y es la primera candidata al reroll. En Builds, "Tus líneas de skill" hace lo mismo con las Arcanas, ordenadas por el nivel que les subiste. PLAYNC muestra solo tu preset activo.</p>
<p><b>Sugerencia de reroll.</b> Estimación simple: primero una línea de skill que no usás; si no hay, la que no está entre las de los top (la más baja), y las de los top que te faltan. La mecánica exacta del reroll no está verificada, así que no damos probabilidades.</p>
<p>No es el puntaje de kisk ni una nota única: son ejes separados y se explican solos.</p>` });
}
