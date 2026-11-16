import { $, esc, ico, modal, announce, gname, gboth, on } from './core.js?v=8f51688881';
import { useful, skillParts } from './personaje-calc.js?v=8f51688881';
let X;                                         // {api, MSG, img, gcls, GRADE, nf, curated, CLS_KEY} que pasa personaje.js
export const init = ctx => { X = ctx; };
const VQ = new URL(import.meta.url).search;   // ?v=<hash>: assets/pj-items.json con la misma versión
const SK = (() => { try { return JSON.parse(document.getElementById('page-data')?.textContent || '{}'); } catch { return {}; } })();
/* ---------- tablas ---------- */
const CLASSES = [['gladiator', 'Gladiador'], ['templar', 'Templario'], ['ranger', 'Arquero'], ['assassin', 'Asesino'], ['sorcerer', 'Hechicero'], ['elementalist', 'Espiritualista'], ['cleric', 'Clérigo'], ['chanter', 'Cantor']];
const CLS_ES = Object.fromEntries(CLASSES);
const TAGS = [['', 'Todas'], ['pve', 'PvE'], ['pvp', 'PvP'], ['dps', 'DPS'], ['healer', 'Healer'], ['support', 'Support'], ['dungeon', 'Dungeon'], ['budget-build', 'Económica'], ['endgame-build', 'Endgame']];
const TAG_ES = { ...Object.fromEntries(TAGS.slice(1)), 'beginner-friendly': 'Para empezar' };
const SLOT = [
['weapon', 'Arma'], ['guarder', 'Secundaria'], ['helmet', 'Casco'], ['shoulder', 'Hombreras'], ['torso', 'Pechera'], ['pants', 'Piernas'], ['gloves', 'Guantes'],
['boots', 'Botas'], ['cape', 'Capa'], ['necklace', 'Collar'], ['leftEarring', 'Aro izq.'], ['rightEarring', 'Aro der.'], ['leftRing', 'Anillo izq.'], ['rightRing', 'Anillo der.'],
['leftBracelet', 'Brazalete izq.'], ['rightBracelet', 'Brazalete der.'], ['belt', 'Cinturón'], ['amulet', 'Amuleto'], ['leftRune', 'Runa izq.'], ['rightRune', 'Runa der.'],
];
const DAE = ['Nezekan', 'Zikel', 'Vaizel', 'Triniel', 'Ariel', 'Azphel'];
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
const BUILD_OK = /^https:\/\/questlog\.gg\//;
function ago(iso) {
const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
return !isFinite(d) ? '' : d < 1 ? 'hoy' : d === 1 ? 'ayer' : d < 60 ? `hace ${d} días` : `hace ${Math.floor(d / 30)} meses`;
}
const pct = q => Math.round(q * 100);
const loading = t => `<p class="pj-load"><span class="pj-spin" aria-hidden="true"></span>${t}</p>`;
const KINDS = [['pve', 'Estándar'], ['support', 'Healer'], ['pvp', 'PvP']];
const KIND_ES = Object.fromEntries(KINDS);
const TIERS = [['Best', 'Imprescindible'], ['Good', 'Muy usada'], ['Fine', 'A veces']];
const TSLOTS = ['weapon', 'offhand', 'helmet', 'shoulder', 'torso', 'pants', 'gloves', 'boots', 'cape', 'necklace', 'earring', 'ring', 'bracelet'];
const ARC = [['chalice', 'Cáliz'], ['parchment', 'Pergamino'], ['compass', 'Brújula'], ['bell', 'Campana'], ['mirror', 'Espejo']];
const SET_ES = { Vigor: 'Vitalidad', Magic: 'Magia' };
export const CSLOT = { 1: 'weapon', 2: 'offhand', 3: 'helmet', 4: 'shoulder', 5: 'torso', 6: 'pants', 7: 'gloves', 8: 'boots', 19: 'cape', 10: 'necklace', 11: 'earring', 12: 'earring', 13: 'ring', 14: 'ring', 15: 'bracelet', 16: 'bracelet', 17: 'belt', 22: 'amulet', 23: 'rune', 24: 'rune' };
export const often = s => s >= 0.9 ? 'casi todos' : s >= 0.65 ? 'la mayoría' : s >= 0.4 ? 'la mitad' : s >= 0.2 ? 'algunos' : 'pocos';
const share = (s, what = 'la usan') => `<span class="sh" role="img" aria-label="${what} ${often(s)} (${pct(s)} %)"><i style="--q:${pct(s)}%"></i></span>`;
const skIcon = (id, sz) => SK[id]?.[1] ? X.img(`https://assets.playnccdn.com/static-aion2-gamedata/resources/${SK[id][1]}.png`, sz) : '';
/* ---------- red (con caché de la sesión) ---------- */
const memo = new Map();
const once = (k, fn) => { if (!memo.has(k)) memo.set(k, fn().catch(e => { memo.delete(k); throw e; })); return memo.get(k); };
const getList = (cls, tag) => once(`l|${cls}|${tag}`, () => X.api('/api/builds', { class: cls, ...(tag && { tags: tag }) }));
const getBuild = (slug, id) => once(`b|${slug}|${id}`, () => X.api('/api/build', { slug, id }));
const getCur = cls => once(`c|${cls}`, () => X.api('/api/curated', { class: cls }));
const getLines = id => once(`il|${id}`, () => X.api('/api/itemlines', { ids: id }));
function errHtml(e, what) {
const [t, d] = e.kind === 'notfound' ? [`No encontré ${what}`, e.message || 'Puede que la hayan borrado.']
: e.kind === 'server' || !X.MSG[e.kind] ? [`No pude traer ${what}`, e.message || 'Probá de nuevo en un rato.'] : X.MSG[e.kind](e);
return `<div class="pj-msg bad" role="alert" data-kind="${esc(e.kind || 'server')}"><h3>${esc(t)}</h3><p>${esc(d)}</p><button type="button" class="btn" data-retry>${ico('i-reset')}Reintentar</button></div>`;
}
/* ---------- vista: lo que usan los top ---------- */
const HEAL = new Set(['cleric', 'chanter']);   // Healer solo para las clases que curan
const CDN = 'https://assets.playnccdn.com/static-aion2-gamedata/resources/';
const gi = (n, sz) => X.img(n ? CDN + n + '.png' : '', sz);
let IT = {};
const getItems = () => once('items', () => fetch(new URL('./pj-items.json' + VQ, import.meta.url)).then(r => r.ok ? r.json() : {}, () => ({})));
const ARC_EN = { chalice: ['Chalice', 'Grail'], parchment: ['Parchment', 'Parchment'], compass: ['Compass', 'Compass'], bell: ['Bell', 'Bell'], mirror: ['Mirror', 'Mirror'] };
const arcIco = (c, set) => `Icon_Arcana_Card_${ARC_EN[c][1]}_u_${set === 'Magic' ? 'DefenceSet2' : 'PveSet2'}`;
const NOBRAND = /\s*\b(en|de|desde)\s+(questlog|plaync|kisk|aion2data)\b/gi;   // los motivos del curado a veces nombran la fuente
const kindSeg = (C, k, cls) => `<div class="seg cu-k" role="group" aria-label="Tipo de build" id="cu-kd">${KINDS.filter(([v]) => v !== 'support' || HEAL.has(cls)).map(([v, l]) => `<button type="button" data-ck="${v}" aria-pressed="${v === k}">${l} <small>${C.kinds?.[v] ?? 0}</small></button>`).join('')}</div>`;
const whyP = t => `<p class="pj-empty cu-why" role="status">${esc(String(t).replace(NOBRAND, ''))}</p>`;
const tile = ({ id, pic, name, lv, have, dim, sub, s, title }) => `<li class="cu-i${have ? ' have' : ''}${dim ? ' dim' : ''}"${id ? ` data-id="${esc(id)}"` : ''}${title ? ` title="${esc(title)}"` : ''}>
<span class="cu-iw">${pic}${lv ? `<b class="cu-lv">${lv}</b>` : ''}${have ? `<i class="cu-ok">${ico('i-check')}</i><span class="sr">La tenés. </span>` : ''}</span>
<span class="cu-in">${esc(name)}</span>${sub ? `<small>${sub}</small>` : ''}${s != null ? share(s) : ''}</li>`;
const card = (cls, h, body) => `<section class="cu-card ${cls}"><h4 class="cu-ch">${h}</h4>${body}</section>`;
function topHtml(C, k, cls, cur) {
const T = C.top?.[k], all = C.top?.all?.n;
const mine = {};
for (const [slot, it] of Object.entries(cur?.x?.items || {})) for (const l of it?.subStats || []) (mine[CSLOT[slot]] ||= new Set()).add(String(l.id).toLowerCase());
const myLv = new Map((cur?.d.skills || []).map(x => [String(x.id), x.level || 0]));
const myStig = new Set((cur?.d.skills || []).filter(x => x.category === 'Dp' && x.level > 0).map(x => String(x.id)));
const have = cur?.x ? (s, id) => !!mine[s]?.has(id) : () => false;
if (!T?.slots) return `<h3 class="pj-h">Lo que usan los mejores <small>${KIND_ES[k]}</small></h3>${whyP(`Sin datos de los top ${KIND_ES[k]}: ${C.reasons?.top?.[k] || `muestra chica (${T?.n || 0} de ${all})`}. No rellenamos con otras builds.`)}`;
const sk = s => ({ name: s.name, nameEn: SK[s.id]?.[0] });
const ok = (s, l) => have(s, l.id) ? ico('i-check') + '<span class="sr">La tenés: </span>' : '';
const chip = (s, l) => `<li data-id="${esc(l.id)}"${have(s, l.id) ? ' class="have"' : ''} title="La usan ${often(l.share)} los top (${pct(l.share)} % de las piezas)${have(s, l.id) ? '. Vos la tenés' : ''}">${ok(s, l)}${esc(l.name)}${share(l.share)}</li>`;
const pill = (s, l) => `<li data-id="${esc(l.id)}"${have(s, l.id) ? ' class="have"' : ''}>${ok(s, l)}${esc(l.name)}</li>`;
const slots = TSLOTS.filter(s => T.slots[s]?.lines?.length);
const piece = s => {
const x = T.slots[s], it = x.items?.[0], best = x.lines.filter(l => l.tier === 'Best'), en = Math.round(x.enchant || 0);
return `<li class="cu-p" data-slot="${s}"><span class="eq-i cu-pi"${it ? ` title="${esc(it.name)}${en ? ` · los top la llevan a +${en}` : ''}"` : ''}>${gi(IT[it?.id], 44)}${en ? `<b class="eq-en">+${en}</b>` : ''}</span>
<b class="cu-pn">${esc(x.name)}</b><ul class="cu-pl">${(best.length ? best : x.lines.filter(l => l.tier === 'Good').slice(0, 3)).map(l => pill(s, l)).join('')}</ul></li>`;
};
const rows = slots.map(s => {
const x = T.slots[s];
return `<li class="cu-row" data-slot="${s}"><b class="cu-sn">${esc(x.name)}</b>${TIERS.map(([t, lb]) => { const L = x.lines.filter(l => l.tier === t); return L.length ? `<div class="cu-t" data-t="${t}"><small>${lb}</small><ul class="cu-c">${L.map(l => chip(s, l)).join('')}</ul></div>` : ''; }).join('')}</li>`;
}).join('');
const stig = T.stigmas.filter(s => s.share >= 0.2).map(s => tile({ id: s.id, pic: skIcon(s.id, 48), name: gname(sk(s)), lv: s.lvl ? Math.round(s.lvl) : 0, have: myStig.has(String(s.id)), dim: s.share < 0.5, s: s.share, title: `${gboth(sk(s))}: la usan ${often(s.share)}${s.lvl ? `, nivel ${Math.round(s.lvl)}` : ''}` })).join('');
const skills = (T.skills || []).filter(s => s.cat === 'Passive' || s.onBar >= 0.5).sort((a, b) => b.lvl - a.lvl).slice(0, 8).map(s => {
const lv = Math.round(s.lvl), m = myLv.get(String(s.id));
return tile({ id: s.id, pic: skIcon(s.id, 48), name: gname(sk(s)), lv, sub: cur && m != null ? `<span class="${m < lv - 2 ? 'low' : m >= lv ? 'ok' : ''}">vos ${m}</span>` : '', title: `${gboth(sk(s))}${s.cat === 'Passive' ? ' (pasiva)' : ''}: los top la tienen en ${lv}` });
}).join('');
const arc = ARC.filter(([c]) => T.arcana?.[c]?.length).map(([c, lb]) => {
const a = T.arcana[c][0], set = { name: SET_ES[a.set] || a.set, nameEn: a.set }, e = Math.round(T.slots[c]?.enchant || 0);
return tile({ pic: gi(arcIco(c, a.set), 48), name: gname({ name: lb, nameEn: ARC_EN[c][0] }), lv: e ? '+' + e : 0, sub: esc(gname(set)), s: a.share, title: `${lb} de ${set.name.toLowerCase()}: la usan ${often(a.share)}` });
}).join('');
return `<h3 class="pj-h">Lo que usan los mejores ${esc(CLS_ES[cls] || '')} <small>${KIND_ES[k]} · ${T.n} de los ${all} con más poder de combate de Global · semana del ${C.v.slice(8, 10)}/${C.v.slice(5, 7)}</small></h3>
<div class="cu-top">
<div class="cu-g">
${card('cu-stc', `Estigmas <small>${cur ? 'tilde = ya la tenés subida' : 'atenuadas = solo algunos'}</small>`, `<ul class="cu-is cu-stig">${stig}</ul>`)}
${arc ? card('cu-arcc', 'Arcanas <small>el set de cada carta</small>', `<ul class="cu-is cu-arc">${arc}</ul>`) : ''}
${skills ? card('cu-skc', `Skills que más suben <small>nivel de los top${cur ? ' y el tuyo' : ''}</small>`, `<ul class="cu-is cu-sk">${skills}</ul>`) : ''}
</div>
<h4 class="pj-h4 cu-eh">Qué buscar en cada pieza <small>las líneas que llevan casi todos${cur?.x ? ' · tilde = ya la tenés' : ''}</small></h4>
<ul class="cu-eq">${slots.map(piece).join('')}</ul>
<details class="cu-more"><summary>Todas las líneas, pieza por pieza <small>también las que usan algunos</small></summary><ul class="cu-st">${rows}</ul></details>
</div>`;
}
function recB(r) {
if (!BUILD_OK.test(r.url || '')) return null;
const u = new URL(r.url), id = +u.searchParams.get('build-id'), slug = decodeURIComponent(u.pathname.split('/').pop());
return id && /^[A-Za-z0-9_-]+$/.test(slug) ? { id, slug, name: r.name, char: r.char, author: r.author, likes: r.likes, tags: r.tags || [], url: r.url } : null;
}
function recHtml(C, k) {
const row = (r, i) => {
const m = r.parts?.match != null ? pct(r.parts.match) : null;
return `<li class="cu-r"><b class="cu-sc" style="--q:${+r.score || 0}%" title="Puntaje de 0 a 100: cuánto se parece a los top, votos, si es reciente y si coincide con las guías"><span>${esc(r.score)}</span></b>
<span class="cu-rm"><b class="bl-nm">${esc(r.name || r.char || 'Sin nombre')}</b><small>${esc(r.author || '—')} · ${X.nf(r.likes)} votos${r.updatedAt ? ` · ${ago(r.updatedAt)}` : ''}</small>
${m != null ? `<span class="cu-mt" title="${esc(r.why || '')}"><span class="sh" role="img" aria-label="Se parece ${m} % a los top"><i style="--q:${m}%"></i></span><small>${m} % como los top</small>${(r.tags || []).includes('beginner-friendly') ? '<em class="tag gold">Para empezar</em>' : ''}</span>` : `<small class="cu-rw">${esc(r.why || '')}</small>`}</span>
${recB(r) ? `<button type="button" class="btn" data-rver="${i}">Ver build</button>` : ''}</li>`;
};
const main = C.recommended?.[k] || [], prog = C.recommended?.progresion || [];
return `<h3 class="pj-h">Builds recomendadas <small>${KIND_ES[k]} · las más parecidas a los top</small></h3>
${main.length ? `<ol class="cu-rec">${main.map((r, i) => row(r, i)).join('')}</ol>` : whyP(C.reasons?.recommended?.[k] || `No hay builds ${KIND_ES[k]} con respaldo.`)}
${prog.length ? `<details class="cu-prog"><summary>Para el que recién llega a 45 <small>${prog.length}</small></summary><ol class="cu-rec">${prog.map((r, i) => row(r, main.length + i)).join('')}</ol></details>` : ''}`;
}
let repaint = null;                            // nombres ES/EN: sin ficha, nadie repinta la pestaña
on('gamelang', () => repaint?.());
export function view(el, cur, { cls = cur ? X.CLS_KEY[cur.d.profile.class] : null, kind = 'pve', tag = '' } = {}) {
if (!CLS_ES[cls]) cls = 'chanter';
let K = kind;
el.innerHTML = `<section class="pj-sec bl" aria-labelledby="bl-h">
<div class="bl-top"><h2 id="bl-h" class="pj-h">Builds</h2>${cur ? '' : `<span class="sel"><select id="bl-cls" aria-label="Clase">${CLASSES.map(([k, l]) => `<option value="${k}"${k === cls ? ' selected' : ''}>${l}</option>`).join('')}</select></span>`}<button type="button" class="linkbtn" data-how>Cómo elegimos</button></div>
<div class="cu"></div>
<details class="bl-more" id="bl-more" hidden><summary>Más builds de jugadores <small>las más votadas, sin puntuar</small></summary>
<div class="seg bl-tags" role="group" aria-label="Etiqueta" id="bl-tg">${TAGS.map(([t, l]) => `<button type="button" data-tag="${t}" aria-pressed="${t === tag}">${l}</button>`).join('')}</div>
<p class="pj-note bl-src"><em class="tag gold">De jugadores</em> Armadas y votadas por la comunidad. No son datos oficiales.</p>
<div class="bl-out"></div></details></section>`;
const cuEl = $('.cu', el), more = $('#bl-more', el), outEl = $('.bl-out', el);
let seq = 0, cseq = 0, list = [], listFor = null, C = null, R = [];
const paintCur = () => {
if (K === 'support' && !HEAL.has(cls)) K = 'pve';
R = [...(C.recommended?.[K] || []), ...(C.recommended?.progresion || [])];
repaint = cur ? null : paintCur;
cuEl.innerHTML = `${cur ? '' : kindSeg(C, K, cls)}${topHtml(C, K, cls, cur)}${recHtml(C, K)}<p class="pj-note">Se recalcula cada semana. No son datos oficiales. <button type="button" class="linkbtn" data-hub="credits">Fuentes y créditos</button></p>`;
};
async function loadCur() {
const s = ++cseq;
C = null; more.hidden = true;
cuEl.setAttribute('aria-busy', 'true');
cuEl.innerHTML = loading(`Buscando lo que usan los mejores de ${CLS_ES[cls]}…`);
try {
[C, IT] = await Promise.all([getCur(cls), getItems()]);
if (s !== cseq) return;
paintCur();
announce(`Builds de ${CLS_ES[cls]}`);
} catch (e) {
if (s !== cseq) return;
cuEl.innerHTML = e.kind === 'notfound' ? `<div class="pj-msg cu-none" role="status"><h3>${CLS_ES[cls]}: sin builds curadas por ahora</h3><p>${esc(e.message || '')}</p><p>Mientras tanto, abajo están las más votadas por los jugadores.</p></div>` : errHtml(e, 'las builds curadas');
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
outEl.innerHTML = list.length ? `<p class="bl-n">${X.nf(r.total)} build${r.total === 1 ? '' : 's'} de ${CLS_ES[cls]}${tag ? ` con «${TAG_ES[tag]}»` : ''}; acá van las ${list.length} más votadas.${r.stale ? ' <em class="tag warn">la fuente no responde: es la última lista que tengo</em>' : ''}</p>
<ol class="bl-l">${list.map((b, i) => `<li class="bl-c"><b class="bl-v" title="Votos">${ico('i-star-on')}${X.nf(b.likes)}</b>
<span class="bl-m"><b class="bl-nm">${esc(b.name || b.char || 'Sin nombre')}</b><small>de ${esc(b.author || '—')}${b.updatedAt ? ` · actualizada ${ago(b.updatedAt)}` : ''}</small>
${b.tags.length ? `<span class="bl-t">${b.tags.map(t => `<em class="tag">${esc(TAG_ES[t] || t)}</em>`).join('')}</span>` : ''}</span>
<span class="bl-a"><button type="button" class="btn" data-ver="${i}">Ver build</button></span></li>`).join('')}</ol>`
: `<p class="pj-empty">No hay builds de ${CLS_ES[cls]}${tag ? ` con «${TAG_ES[tag]}»` : ''} publicadas.</p>`;
announce(`${list.length} builds`);
} catch (e) { if (s === seq) { outEl.innerHTML = errHtml(e, 'builds'); listFor = null; } }
outEl.setAttribute('aria-busy', 'false');
}
more.addEventListener('toggle', () => { if (more.open) load(); });
el.onchange = e => { if (e.target.id === 'bl-cls') { cls = e.target.value; loadCur(); } };
el.onclick = e => {
const k = e.target.closest('[data-ck]');
if (k && C) { K = k.dataset.ck; paintCur(); $(`#cu-kd [data-ck=${K}]`, el).focus(); announce(`Tipo ${KIND_ES[K]}`); return; }
const t = e.target.closest('[data-tag]');
if (t) { tag = t.dataset.tag; for (const b of el.querySelectorAll('#bl-tg button')) b.setAttribute('aria-pressed', String(b === t)); load(true); return; }
if (e.target.closest('[data-how]')) return how();
if (e.target.closest('[data-retry]')) return e.target.closest('.cu') ? loadCur() : load(true);
const v = e.target.closest('[data-ver]'), rv = e.target.closest('[data-rver]');
if (v) showBuild(list[+v.dataset.ver]);
else if (rv) showBuild(recB(R[+rv.dataset.rver]));
};
loadCur();
}
/* ---------- detalle de una build (modal) ---------- */
const attrib = b => `<p class="bd-src"><em class="tag gold">De jugadores</em> Build de <b>${esc(b.author || '—')}</b>${b.likes != null ? ` · ${X.nf(b.likes)} votos` : ''} · <a href="${esc(BUILD_OK.test(b.url || '') ? b.url : '#')}" target="_blank" rel="noopener noreferrer">Ver la original${ico('i-ext')}</a></p>`;
function showBuild(b) {
const box = document.createElement('div');
box.className = 'bd';
box.innerHTML = `${attrib(b)}<div class="bd-b">${loading('Cargando la build…')}</div>`;
modal({ title: b.name || b.char || 'Build', node: box, cls: 'pj-bd' });
const fill = async () => {
try { $('.bd-b', box).innerHTML = buildBody(await getBuild(b.slug, b.id)); } catch (e) { $('.bd-b', box).innerHTML = errHtml(e, 'esa build'); }
};
box.addEventListener('click', e => { if (e.target.closest('[data-retry]')) { e.preventDefault(); fill(); } });
fill();
}
const lineLi = l => l.skill ? `<li class="ln-s"><span>${esc(l.name || `Skill ${l.id}`)}</span><b>skill</b></li>` : `<li><span>${esc(stLabel(l.id))}</span><b>${esc(fmt(l.id, l.v))}</b></li>`;
const SKCAT = [['active', 'Activas'], ['passive', 'Pasivas'], ['stigma', 'Estigmas']];
function buildBody(d) {
const eq = SLOT.map(s => [s, d.equipment.find(e => e.slot === s[0])]).filter(x => x[1]);
const sk = d.skills?.list || [];
return `${d.stale ? '<p class="tag warn">La fuente no responde: es la última versión que tengo</p>' : ''}
<h3 class="pj-h">Equipo</h3><ul class="bd-eq">${eq.map(([s, e]) => `<li class="${X.gcls(e.grade)}"><span class="eq-i">${X.img(e.icon, 40)}${e.lvl ? `<b class="eq-en">+${e.lvl}</b>` : ''}</span>
<span class="bd-t"><small>${s[1]} · <span class="eq-gr">${esc(X.GRADE[e.grade] || e.grade)}</span></small><b>${esc(e.name)}</b>
${e.lines.length ? `<ul class="ln">${e.lines.map(lineLi).join('')}</ul>` : ''}
${e.stones.length ? `<small class="bd-ms">Piedras de maná: ${e.stones.map(x => `${esc(stLabel(x.id))} +${esc(fmt(x.id, x.v))}`).join(' · ')}</small>` : ''}</span></li>`).join('') || '<li class="pj-empty">Sin equipo cargado.</li>'}</ul>
${d.arcana.length ? `<h3 class="pj-h">Arcanas</h3><ul class="bd-ar bd-arc">${d.arcana.map(a => `<li>${X.img(a.icon, 36)}<b class="${X.gcls(a.grade)}">${esc(a.name)}${a.lvl ? ` +${a.lvl}` : ''}</b><small>${a.skills.map(s => `${esc(s.name || `Skill ${s.id}`)} +${s.lvl}`).join(' · ') || 'sin skills'}</small></li>`).join('')}</ul>` : ''}
<h3 class="pj-h">Skills y estigmas ${d.skills ? `<small>${esc(d.skills.name || '')}</small>` : ''}</h3>
${sk.length ? SKCAT.map(([c, t]) => { const l = sk.filter(s => s.cat === c).sort((a, b) => (b.slot != null) - (a.slot != null)); return l.length ? `<h4 class="pj-h4">${t}</h4><ul class="sk-g">${l.map(s => `<li class="sk2${c !== 'passive' && s.slot == null ? ' off' : ''}">${skIcon(s.id, 28)}<span>${esc(s.name || `Skill ${s.id}`)}</span><b>Nv ${s.lvl}</b></li>`).join('')}</ul>` : ''; }).join('')
+ '<p class="pj-note">Atenuadas: subidas pero sin poner en la barra. Las especializaciones no se muestran: la ficha oficial no las tiene.</p>' : '<p class="pj-empty">Esta build no trae skills.</p>'}
<h3 class="pj-h">Daevanion</h3>
${d.daevanion ? `<ul class="bd-ar">${Object.entries(d.daevanion.boards).map(([id, l]) => `<li><b>${DAE[(+id % 10) - 1] || `Tablero ${esc(id)}`}</b><small>${l.length} nodos</small></li>`).join('')}</ul>` : '<p class="pj-empty">Esta build no trae Daevanion.</p>'}`;
}
/* ---------- detalle de una pieza: calidad de cada línea y si la usan los top de tu build ---------- */
export function rollOf(line, pool) {
const r = (pool || []).find(p => p[0] === line.id);
const v = parseFloat(String(line.value ?? '').replace(',', '.'));
if (!r || !isFinite(v)) return null;
const [, min, max] = r, dist = x => x < min ? min - x : x > max ? x - max : 0;
const s = dist(v * 100) < dist(v) ? 100 : 1, x = v * s;
const out = dist(x) > Math.max(6, 0.15 * (max - min));
return { q: max > min ? Math.max(0, Math.min(1, (x - min) / (max - min))) : 1, min, max, s, out, pctv: /%/.test(String(line.value)) };
}
const rng = r => { const f = v => r.s === 100 ? num(r.pctv ? v / 100 : Math.round(v / 100)) : num(v); return `${f(r.min)}–${f(r.max)}${r.pctv ? ' %' : ''}`; };
export async function itemBody(it, e, cur, kind) {
const skills = new Map((cur.d.skills || []).map(s => [String(s.id), s])), parts = skillParts(cur.d, cur.x?.items || {}, cur.x?.boards || {}), use = id => useful(skills.get(String(id)), parts.get(String(id)));
const C = X.curated(cur), T = C?.top?.[kind]?.slots?.[CSLOT[e.slot]];
let pool = null;
if (it.subStatRandom && (it.subStats || []).length) try { pool = (await getLines(it.id)).items?.[it.id]?.lines; } catch { /* sin rango */ }
const top = new Map((T?.lines || []).map(l => [l.id, l]));
const li = (n, v, extra = '') => `<li><span>${esc(n)}</span><b>${v}</b>${extra}</li>`;
const main = (it.mainStats || []).map(s => li(s.name, `${esc(s.value)}${+s.extra ? ` <em>+${esc(s.extra)}</em>` : ''}`)).join('');
const lines = (it.subStats || []).map(s => {
const id = String(s.id).toLowerCase(), r = pool && rollOf({ id, value: s.value }, pool), t = top.get(id);
return `<li class="ln2" data-line="${esc(id)}"><span class="ln-n">${esc(s.name)}${t ? ` <em class="tag gold" title="La usan ${often(t.share)} los top ${KIND_ES[kind]} en esta pieza">top</em>` : ''}</span><b>${esc(s.value)}</b>
${r && !r.out ? `<span class="qb" role="img" aria-label="Salió al ${pct(r.q)} % del rango (${rng(r)})" title="Rango en Global: ${rng(r)}"><i style="--q:${pct(r.q)}%"></i></span><small class="q-p">${pct(r.q)} %</small>` : '<small class="q-na">—</small>'}</li>`;
}).join('');
const sk = (it.subSkills || []).map(s => li(`${s.name} +${s.level}`, use(s.id) ? 'la usás' : '<span class="warn">no la usás</span>')).join('');
const want = T ? T.lines.filter(l => (l.tier === 'Best' || l.tier === 'Good') && !(it.subStats || []).some(s => String(s.id).toLowerCase() === l.id)).slice(0, 3) : [];
return `<p class="tip-m">${[it.categoryName, it.level && `nivel ${it.level}`, it.maxEnchantLevel && `encantamiento +${it.enchantLevel ?? e.enchant ?? 0} de ${it.maxEnchantLevel}`, it.maxExceedEnchantLevel && `amplificación +${e.exceed || 0} de ${it.maxExceedEnchantLevel}`].filter(Boolean).map(esc).join(' · ')}</p>
${main ? `<h4>Stats</h4><ul>${main}</ul>` : ''}
${lines ? `<h4>Líneas <small>barra = qué tan alto salió</small></h4><ul class="tip-ln">${lines}</ul>` : ''}
${want.length ? `<p class="tip-want">Los top ${KIND_ES[kind]} buscan acá: ${want.map(l => `<b>${esc(l.name)}</b> (${often(l.share)})`).join(', ')}.</p>` : ''}
${sk ? `<h4>Líneas de skill</h4><ul>${sk}</ul>` : ''}
${(it.magicStoneStat || []).length ? `<h4>Piedras de maná</h4><ul>${it.magicStoneStat.map(s => li(s.name, esc(s.value))).join('')}</ul>` : ''}
${(it.godStoneStat || []).map(g => `<h4>Piedra divina</h4><p class="tip-gs ${X.gcls(g.grade)}"><b>${esc(g.name)}</b>${esc(g.desc || '')}</p>`).join('')}
${(it.sources || []).length ? `<p class="tip-from">Sale de: ${esc(it.sources.join(', '))}</p>` : ''}`;
}
function how() {
modal({ title: 'Cómo elegimos', cls: 'pj-how', html: `
<p><b>Lo que usan los mejores.</b> Una vez por semana miramos la ficha pública oficial de los 30 personajes con más poder de combate de cada clase en Global y los separamos en Estándar, Healer y PvP por lo que llevan puesto (amuleto feroz, piedras y líneas de JcJ, estigmas de curación). Si un tipo tiene menos de 3, no lo mostramos: decimos por qué en vez de rellenar.</p>
<p><b>Imprescindible</b> = la lleva al menos la mitad de las piezas de los top; <b>Muy usada</b>, una de cada cuatro; <b>A veces</b>, una de cada diez. La barrita dice cuántos: "casi todos", "la mayoría", "la mitad", "algunos".</p>
<p><b>Recomendadas.</b> Builds públicas de jugadores con un puntaje de 0 a 100: 45 % cuánto se parecen a los top de su tipo, 20 % votos, 20 % si son posteriores al último parche y 15 % si coinciden con las guías. Menos de 50 no entra.</p>
<p><b>Calidad de una línea</b> (en el detalle de cada pieza): dónde cayó tu valor dentro del rango posible de ese ítem. 100 % = salió al tope. Los porcentajes de la ficha vienen redondeados a un decimal: puede haber ±3 puntos.</p>
<p>La ficha oficial muestra solo el preset activo. Las fuentes, en "Fuentes y créditos".</p>` });
}
