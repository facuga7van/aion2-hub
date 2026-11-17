import { $, esc, ico, modal, announce, gname, gboth, on } from './core.js?v=678c516c58';
import { useful, skillParts, CSLOT } from './personaje-calc.js?v=678c516c58';
let X;                                         // {api, MSG, img, gcls, GRADE, nf, curated, CLS_KEY, gl} que pasa personaje.js
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
const godFam = icon => String(icon || '').match(/Godstone\w*_(\d{3})(?:\.png)?$/)?.[1] || null;
const GOD = {
'001': ['Ceguera', 'Blind'], '003': ['Sellado', 'Seal'], '004': ['Atadura', 'Root'], '005': ['Aturdimiento', 'Stun'], '006': ['Parálisis', 'Paralyze'],
'007': ['−50 % vel. de movimiento', '−50% Move Speed'], '008': ['−50 % vel. de combate', '−50% Combat Speed'], '009': ['Envenenamiento', 'Poison'], '010': ['Sangrado', 'Bleed'],
'011': ['Fuego a un objetivo', 'Fire, single target'], '012': [null, 'Water, single target'], '013': ['Tierra a un objetivo', 'Earth, single target'], '014': ['Viento a un objetivo', 'Wind, single target'],
'015': ['Fuego de área', 'Fire AoE'], '016': [null, 'Water AoE'], '017': ['Tierra de área', 'Earth AoE'], '018': ['Viento de área', 'Wind AoE'],
};
const godName = (f, en) => gname({ name: GOD[f]?.[0], nameEn: GOD[f]?.[1] }) || String(en || `Piedra ${f}`).replace(/^Theostone:\s*/, '');
const cslot = s => CSLOT[s] || ARC[s - 41]?.[0];
const SK_MIN = 0.2;
export const often = s => s >= 0.9 ? 'casi todos' : s >= 0.65 ? 'la mayoría' : s >= 0.4 ? 'la mitad' : s >= 0.2 ? 'algunos' : 'pocos';
const share = (s, what = 'la usan') => `<span class="sh" role="img" aria-label="${what} ${often(s)} (${pct(s)} %)"><i style="--q:${pct(s)}%"></i></span>`;
const skIcon = (id, sz) => SK[id]?.[1] ? X.img(`https://assets.playnccdn.com/static-aion2-gamedata/resources/${SK[id][1]}.png`, sz) : '';
const isPvp = id => /^pvp/i.test(String(id));
const unit = id => ST[String(id).toLowerCase()]?.[1] === 'p' ? ' %' : '';
const n1 = v => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(v);
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const setOf = ic => /PveSet/.test(ic || '') ? 'V' : /DefenceSet/.test(ic || '') ? 'M' : '-';
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
const mine = {}, myV = {}, myMs = {};
for (const [slot, it] of Object.entries(cur?.x?.items || {})) {
const cs = cslot(+slot), m = mine[cs] ||= new Set();
for (const l of it?.subStats || []) {
const id = String(l.id).toLowerCase(), v = parseFloat(String(l.value).replace(',', '.'));
m.add(id);
if (isFinite(v)) ((myV[cs] ||= {})[id] ||= []).push(v);
}
for (const l of it?.subSkills || []) m.add('sk:' + l.id);
for (const s of it?.magicStoneStat || []) (myMs[cs] ||= []).push(String(s.id).toLowerCase());
}
const myEq = s => (cur?.d.equipment || []).filter(e => e.slot < 41 && CSLOT[e.slot] === s);
const parts = cur?.x ? skillParts(cur.d, cur.x.items || {}, cur.x.boards || {}) : null;
const mySk = new Map((cur?.d.skills || []).map(x => [String(x.id), x]));
const uses = id => parts ? useful(mySk.get(String(id)), parts.get(String(id))) : null;
const myLv = new Map((cur?.d.skills || []).map(x => [String(x.id), x.level || 0]));
const myStig = new Set((cur?.d.skills || []).filter(x => x.category === 'Dp' && x.level > 0).map(x => String(x.id)));
const have = cur?.x ? (s, id) => !!mine[s]?.has(id) : () => false;
const myGod = cur?.x ? [1, 2].map(s => cur.x.items?.[s]).map(it => it && { fam: (it.godStoneStat || []).map(g => godFam(g.icon)).filter(Boolean), empty: (it.godStoneSlotCount || 0) > (it.godStoneStat || []).length }) : [];
const myFam = new Set(myGod.flatMap(g => g?.fam || []));
if (!T?.slots) return `<h3 class="pj-h">Lo que usan los mejores <small>${KIND_ES[k]}</small></h3>${whyP(`Sin datos de los top ${KIND_ES[k]}: ${C.reasons?.top?.[k] || `muestra chica (${T?.n || 0} de ${all})`}. No rellenamos con otras builds.`)}`;
const sk = s => ({ name: s.name, nameEn: SK[s.id]?.[0] });
const ok = (s, l) => have(s, l.id) ? ico('i-check') + '<span class="sr">La tenés: </span>' : '';
const vsAvg = (s, l) => { const v = myV[s]?.[l.id]; return v && l.avg != null ? { me: mean(v), top: l.avg } : null; };
const avgTxt = (l, a) => a ? `Tu ${l.name}: ${n1(a.me)}${unit(l.id)}; los top que la llevan sacaron ${n1(a.top)}${unit(l.id)} de media` : '';
const D = k === 'pve' || k === 'pvp' ? (C.diffs?.pveVsPvp?.list || []).filter(d => d.what === 'line' || d.what === 'stigma') : [];
const dif = new Map(D.filter(d => d.what === 'line').map(d => [d.slot + '|' + d.id, d]));
const chip = (s, l) => {
const h = have(s, l.id), d = dif.get(s + '|' + l.id), cl = [h && 'have', d && 'dif'].filter(Boolean).join(' ');
return `<li data-id="${esc(l.id)}"${cl ? ` class="${cl}"` : ''} title="La usan ${often(l.share)} los top (${pct(l.share)} % de las piezas)${l.avg != null ? `, con ${n1(l.avg)}${unit(l.id)} de media` : ''}${d ? `. Estándar ${pct(d.PvE)} %, PvP ${pct(d.PvP)} %` : ''}${h ? '. Vos la tenés' : ''}">${ok(s, l)}${esc(l.name)}${l.avg != null ? `<small class="cu-cav">${n1(l.avg)}${unit(l.id)}</small>` : ''}${share(l.share)}</li>`;
};
const pill = (s, l) => {
const a = vsAvg(s, l);
return `<li data-id="${esc(l.id)}"${have(s, l.id) ? ' class="have"' : ''}${a ? ` title="${esc(avgTxt(l, a))}"` : ''}>${ok(s, l)}${esc(l.name)}${a ? `<small class="cu-av">${n1(a.me)}${unit(l.id)} · top ${n1(a.top)}${unit(l.id)}</small>` : ''}</li>`;
};
const skName = l => gname({ name: l.name, nameEn: SK[l.id]?.[0] });
const skHave = (s, l) => have(s, 'sk:' + l.id);
const okI = '<span class="sr">La tenés: </span>';
const skPill = (s, l) => `<li class="sk${skHave(s, l) ? ' have' : ''}" data-sk="${esc(l.id)}" title="+ nivel de ${esc(skName(l))}: la llevan ${often(l.share)} los top (${pct(l.share)} %)${skHave(s, l) ? '. Vos la tenés' : ''}">${skHave(s, l) ? ico('i-check') + okI : skIcon(l.id, 16)}${esc(skName(l))}</li>`;
const skWant = s => (T.slots[s]?.skillLines || []).filter(l => l.share >= SK_MIN && uses(l.id) !== false);
const slots = [...TSLOTS, ...ARC.map(([c]) => c)].filter(s => T.slots[s]?.lines?.length || T.slots[s]?.skillLines?.length);
const ampP = s => {
const t = T.slots[s]?.exceed;
if (!(t >= 0.5)) return '';
const E = myEq(s), me = cur && E.length ? Math.min(...E.map(e => e.exceed || 0)) : null, tr = Math.round(t);
const lab = `Amplificación: los top la llevan a +${n1(t)} de media${me != null ? `; vos, +${me}` : ''}`;
return `<span class="cu-pa" role="img" aria-label="${lab}" title="${lab}"><span class="eq-amp">${[1, 2, 3, 4, 5].map(i => `<i class="${[(me ?? tr) >= i && 'on', tr >= i && 'tg'].filter(Boolean).join(' ')}"></i>`).join('')}</span><small${me != null ? ` class="${me < tr ? 'low' : 'ok'}"` : ''}>${me != null ? `vos +${me} · top +${tr}` : `top +${tr}`}</small></span>`;
};
const pvpMs = s => (myMs[s] || []).filter(isPvp).length;
const piece = s => {
const x = T.slots[s], it = x.items?.[0], best = x.lines.filter(l => l.tier === 'Best'), en = Math.round(x.enchant || 0), a = T.arcana?.[s]?.[0];
const sk = skWant(s).slice(0, 3), skAll = (x.skillLines || []).filter(l => l.share >= SK_MIN).length, pv = k === 'pvp' ? 0 : pvpMs(s);
const pic = a ? gi(arcIco(s, a.set), 44) : gi(IT[it?.id], 44);
const name = a ? `${esc(x.name)} <small>${esc(gname({ name: SET_ES[a.set] || a.set, nameEn: a.set }))}</small>` : esc(x.name);
const none = !sk.length && skAll && parts ? '<li class="sk-no">Las que llevan los top son de skills que no usás</li>' : '';
return `<li class="cu-p" data-slot="${s}"><span class="eq-i cu-pi"${it ? ` title="${esc(it.name)}${en ? ` · los top la llevan a +${en}` : ''}"` : ''}>${pic}${en ? `<b class="eq-en">+${en}</b>` : ''}</span>
<b class="cu-pn">${name}${ampP(s)}</b><ul class="cu-pl">${(best.length ? best : x.lines.filter(l => l.tier === 'Good').slice(0, 3)).map(l => pill(s, l)).join('')}${sk.map(l => skPill(s, l)).join('')}${none}${pv ? `<li class="ms-pvp" title="Piedras de maná JcJ en tu ${esc(x.name.toLowerCase())}: solo suman contra jugadores">${pv} piedra${pv > 1 ? 's' : ''} JcJ</li>` : ''}</ul></li>`;
};
const skChip = (s, l) => {
const off = uses(l.id) === false, h = skHave(s, l);
return `<li data-sk="${esc(l.id)}" class="${[h && 'have', off && 'off'].filter(Boolean).join(' ')}" title="La llevan ${often(l.share)} los top (${pct(l.share)} %)${off ? '. No usás esa skill: para vos vale 0' : h ? '. Vos la tenés' : ''}">${h ? ico('i-check') + okI : ''}${esc(skName(l))}${off ? '<span class="sr"> (no la usás)</span>' : ''}${share(l.share)}</li>`;
};
const msChip = (s, st) => {
const h = !!myMs[s]?.includes(st.id), cl = [h && 'have', isPvp(st.id) && 'pvp'].filter(Boolean).join(' ');
return `<li data-ms="${esc(st.id)}"${cl ? ` class="${cl}"` : ''} title="${esc(st.name)}: ${pct(st.share)} de cada 100 ranuras de piedra de maná de los top en esta pieza${h ? '. Vos la tenés' : ''}">${h ? ico('i-check') + okI : ''}${esc(st.name)}<small class="cu-cav">${pct(st.share)} %</small></li>`;
};
const rows = slots.map(s => {
const x = T.slots[s], K = (x.skillLines || []).filter(l => l.share >= 0.1), M = x.stones || [];
return `<li class="cu-row" data-slot="${s}"><b class="cu-sn">${esc(x.name)}</b>${TIERS.map(([t, lb]) => { const L = x.lines.filter(l => l.tier === t); return L.length ? `<div class="cu-t" data-t="${t}"><small>${lb}</small><ul class="cu-c">${L.map(l => chip(s, l)).join('')}</ul></div>` : ''; }).join('')}${K.length ? `<div class="cu-t" data-t="skill"><small>Línea de skill</small><ul class="cu-c">${K.map(l => skChip(s, l)).join('')}</ul></div>` : ''}${M.length ? `<div class="cu-t" data-t="ms"><small>Piedras de maná · de cada 100 ranuras</small><ul class="cu-c">${M.map(st => msChip(s, st)).join('')}</ul></div>` : ''}</li>`;
}).join('');
const stM = T.stigmaAlt ? T.stigmas : T.stigmas.slice(0, 4), stA = (T.stigmaAlt || T.stigmas.slice(4)).filter(s => s.share >= 0.1);
const stT = (s, alt) => tile({ id: s.id, pic: skIcon(s.id, 48), name: gname(sk(s)), lv: s.lvl ? Math.round(s.lvl) : 0, have: myStig.has(String(s.id)), dim: alt || s.share < 0.5, s: s.share, title: `${gboth(sk(s))}: la usan ${often(s.share)}${s.lvl ? `, nivel ${Math.round(s.lvl)}` : ''}${alt ? ' (alternativa)' : ''}` });
const stMiss = cur ? stM.filter(s => s.share >= 0.5 && !myStig.has(String(s.id))) : [], stInst = cur ? stA.filter(s => myStig.has(String(s.id))) : [];
const stList = L => L.map(s => `<b>${esc(gname(sk(s)))}</b> (${often(s.share)})`).join(', ');
const stigBody = `<div class="cu-stw"><ul class="cu-is cu-stig">${stM.map(s => stT(s)).join('')}</ul>${stA.length ? `<div class="cu-alt"><small>Alternativas</small><ul class="cu-is cu-stig cu-sta">${stA.map(s => stT(s, 1)).join('')}</ul></div>` : ''}</div>
${!stMiss.length ? '' : stInst[0]?.share >= stMiss[0].share - 0.25 ? `<p class="cu-stn par" role="note">Los top se reparten entre ${stList(stMiss)} y ${stList(stInst)}: vos llevás la segunda.</p>`
: `<p class="cu-stn" role="note">Te falta ${stList(stMiss)}.${stInst.length ? ` En su lugar tenés ${stList(stInst)}, una alternativa.` : ''}</p>`}`;
const skills = (T.skills || []).filter(s => s.cat === 'Passive' || s.onBar >= 0.5).sort((a, b) => b.lvl - a.lvl).slice(0, 8).map(s => {
const lv = Math.round(s.lvl), m = myLv.get(String(s.id));
return tile({ id: s.id, pic: skIcon(s.id, 48), name: gname(sk(s)), lv, sub: cur && m != null ? `<span class="${m < lv - 2 ? 'low' : m >= lv ? 'ok' : ''}">vos ${m}</span>` : '', title: `${gboth(sk(s))}${s.cat === 'Passive' ? ' (pasiva)' : ''}: los top la tienen en ${lv}` });
}).join('');
const myArc = cur ? Object.fromEntries(ARC.map(([c], i) => [c, setOf((cur.d.equipment || []).find(e => e.slot === 41 + i)?.icon)])) : null;
const arc = ARC.filter(([c]) => T.arcana?.[c]?.length).map(([c, lb]) => {
const a = T.arcana[c][0], set = { name: SET_ES[a.set] || a.set, nameEn: a.set }, e = Math.round(T.slots[c]?.enchant || 0), m = myArc?.[c];
return tile({ id: c, pic: gi(arcIco(c, a.set), 48), name: gname({ name: lb, nameEn: ARC_EN[c][0] }), lv: e ? '+' + e : 0, have: m === a.set[0], sub: esc(gname(set)), s: a.share, title: `${lb} de ${set.name.toLowerCase()}: la usan ${often(a.share)}${m && m !== '-' ? `. La tuya es de ${m === 'M' ? 'magia' : 'vitalidad'}` : ''}` });
}).join('');
const CB = T.arcana?.combos || [], myCb = myArc && !Object.values(myArc).includes('-') ? ARC.map(([c]) => myArc[c]).join('') : null;
const cbL = [...CB.slice(0, 2), ...(myCb && !CB.slice(0, 2).some(c => c.cards === myCb) ? [CB.find(c => c.cards === myCb) || { cards: myCb }] : [])];
const cbSet = (x, i) => gname({ name: `${ARC[i][1]} de ${x === 'M' ? 'magia' : 'vitalidad'}`, nameEn: `${ARC_EN[ARC[i][0]][0]}: ${x === 'M' ? 'Magic' : 'Vigor'}` });
const cbTxt = cards => { const M = [...cards].map((x, i) => x === 'M' && ARC[i][1]).filter(Boolean), V = [...cards].map((x, i) => x === 'V' && ARC[i][1]).filter(Boolean);
const [base, rest, of] = M.length > V.length ? ['magia', V, 'vitalidad'] : ['vitalidad', M, 'magia'];
return (rest.length ? `${base}, ${rest.join(' y ')} de ${of}` : `todas de ${base}`).replace(/^./, c => c.toUpperCase()); };
const cbRow = c => `<li data-cb="${esc(c.cards)}"${c.cards === myCb ? ' class="have"' : ''}><span class="cu-cbi" role="img" aria-label="${esc([...c.cards].map(cbSet).join(', '))}">${[...c.cards].map((x, i) => x === 'V' || x === 'M' ? gi(arcIco(ARC[i][0], x === 'M' ? 'Magic' : 'Vigor'), 24) : '<span class="noimg"></span>').join('')}</span><small>${c.cards === myCb ? '<b>la tuya</b> · ' : ''}${esc(cbTxt(c.cards))} · ${c.share != null ? `la usan ${often(c.share)}` : 'no está entre las más usadas'}</small></li>`;
const arcBody = `<ul class="cu-is cu-arc">${arc}</ul>${cbL.length ? `<p class="cu-sub">Las 5 juntas</p><ul class="cu-cb">${cbL.map(cbRow).join('')}</ul>` : ''}`;
const G = T.theostones, gL = G?.list || [], pair = G?.pairs?.[0], gr = g => X.GRADE[g] || g;
const gn = f => godName(f, gL.find(x => x.f === f)?.stoneEn);
const gs = gL.map(x => tile({ id: x.f, pic: gi('Icon_Item_Usable_Godstone_WP_r_' + x.f, 48), name: gn(x.f), have: myFam.has(x.f), dim: x.share < 0.5, sub: `<span class="${X.gcls(x.grade)}">${esc(gr(x.grade))}</span>`, s: x.share, title: `${gn(x.f)}: la usan ${often(x.share)} (${pct(x.share)} %), la más común en ${gr(x.grade).toLowerCase()}` })).join('');
const gsMiss = gL.find(x => !myFam.has(x.f));
const gsWarn = [...myGod.map((g, i) => g?.empty && `${i ? 'Tu secundaria' : 'Tu arma'} tiene la ranura de piedra sagrada vacía`), myGod[0]?.fam[0] && myGod[0].fam[0] === myGod[1]?.fam[0] && `Tenés ${gn(myGod[0].fam[0])} en las dos manos: aplica una sola`].filter(Boolean);
const gsBody = `<ul class="cu-is cu-gs">${gs}</ul><div class="cu-gst"><p class="cu-gsn">Poné una en el arma y otra distinta en la secundaria: dos con el mismo efecto aplican uno solo.${pair ? ` El par más usado: <b>${esc(gn(pair.f[0]))} + ${esc(gn(pair.f[1]))}</b> (${often(pair.share)}).` : ''}</p>
${gsWarn.length ? `<p class="cu-gsw" role="note">${esc(gsWarn.join('. '))}.${gsMiss ? ` Los top llevan <b>${esc(gn(gsMiss.f))}</b>.` : ''}</p>` : ''}</div>`;
const msAgg = {};
let msW = 0;
for (const x of Object.values(T.slots)) if (x.stones?.length) { msW += x.pieces; for (const st of x.stones) (msAgg[st.id] ||= { ...st, w: 0 }).w += st.share * x.pieces; }
const msTop = Object.values(msAgg).sort((a, b) => b.w - a.w).slice(0, 5);
const myPv = Object.keys(myMs).map(s => [s, pvpMs(s)]).filter(x => x[1]), pvN = myPv.reduce((t, x) => t + x[1], 0);
const pvMax = Math.max(0, ...Object.values(C.top?.pvp?.slots || {}).map(x => Math.max(0, ...(x.stones || []).filter(st => isPvp(st.id)).map(st => st.share), x.stones?.length >= 6 ? x.stones[5].share : 0)));
const msBody = `<ul class="cu-ms">${msTop.map(st => `<li data-ms="${esc(st.id)}" title="${esc(st.name)}: ${pct(st.w / msW)} de cada 100 ranuras de los top">${esc(st.name)}<b>${pct(st.w / msW)} %</b></li>`).join('')}</ul>
<div class="cu-gst"><p class="cu-gsn">De cada 100 ranuras de los top, en todo el equipo. Solo se sabe qué piedra ponen, no su grado ni cuánto suma. Pieza por pieza, en la tabla completa de abajo.</p>
${pvN ? `<p class="cu-msw${k === 'pvp' ? ' par' : ''}" role="note">Tenés <b>${pvN} piedra${pvN > 1 ? 's' : ''} de maná JcJ</b> (${esc(myPv.map(([s, n]) => `${(T.slots[s]?.name || s).toLowerCase()}${n > 1 ? ` ×${n}` : ''}`).join(', '))}): solo suman contra jugadores${k === 'pvp' ? '' : `, no en ${KIND_ES[k]}`}.${C.top?.pvp?.slots ? ` Los top PvP casi no las ponen: ningún tipo de piedra JcJ pasa de ${pct(pvMax)} de cada 100 ranuras en una pieza.` : ''}</p>` : ''}</div>`;
const P = cur?.d.profile || {};
const ampS = cur ? (cur.d.equipment || []).filter(e => e.slot < 41 && T.slots[CSLOT[e.slot]]?.exceed >= 2).map(e => [e.exceed || 0, T.slots[CSLOT[e.slot]].exceed])
: Object.values(CSLOT).filter(s => T.slots[s]?.exceed >= 2).map(s => [0, T.slots[s].exceed]);
const vsT = [T.cpMedian && ['cp', 'Poder de combate', P.combatPower, T.cpMedian, X.nf, 'top típico'], T.ilvlMedian && ['il', 'Nivel de objeto', P.itemLevel, T.ilvlMedian, X.nf, 'top típico'],
ampS.length && ['amp', 'Amplificación por pieza', mean(ampS.map(x => x[0])), mean(ampS.map(x => x[1])), v => '+' + n1(v), 'los top']].filter(Boolean);
const vsLi = ([id, lb, me, top, f, who]) => {
const q = cur && me != null ? Math.min(1, me / top) : null;
return `<li data-vs="${id}"><small>${lb}</small><b>${f(q != null ? me : top)}</b>${q != null ? `<span class="cu-vb" role="img" aria-label="${pct(q)} % de ${who}"><i style="--q:${pct(q)}%"></i></span><small>${who} ${f(top)}</small>` : `<small>${who}</small>`}</li>`;
};
const vs = vsT.length ? `<ul class="cu-vs" aria-label="${cur ? 'Vos contra los top' : 'Los top'}" title="Top típico = la mediana: la mitad de los top tiene más y la mitad menos">${vsT.map(vsLi).join('')}</ul>` : '';
const thin = T.confidence === 'baja' || T.n < 8;
const dWhere = d => d.what === 'stigma' ? 'Estigma' : T.slots[d.slot]?.name || d.slot;
const dLi = d => `<li><span>${esc(dWhere(d))}</span> <b>${esc(d.what === 'stigma' ? gname(sk(d)) : d.name)}</b> <small>${pct(d.PvE)} % → ${pct(d.PvP)} %</small></li>`;
const dCols = [['pvp', 'En PvP sube', D.filter(d => d.PvP > d.PvE)], ['pve', 'En Estándar manda', D.filter(d => d.PvE > d.PvP)]].sort((a, b) => (b[0] === k) - (a[0] === k)).filter(x => x[2].length);
const dSame = [C.diffs?.pveVsPvp?.sameArcana?.length === 5 && 'Arcanas', !D.some(d => d.what === 'stigma') && 'estigmas'].filter(Boolean);
const difHtml = D.length ? `<section class="cu-dif" aria-labelledby="cu-dh"><h4 class="pj-h4" id="cu-dh">Estándar contra PvP <small>solo lo que cambia de verdad · % de las piezas, Estándar → PvP</small></h4>
<div class="cu-dg">${dCols.map(([d, h, L]) => `<div class="cu-dc" data-d="${d}"><small>${h}</small><ul>${L.map(dLi).join('')}</ul></div>`).join('')}</div>
${dSame.length ? `<p class="cu-gsn">${dSame.join(' y ').replace(/^./, c => c.toUpperCase())}: sin diferencias claras con esta muestra.</p>` : ''}</section>` : '';
return `<h3 class="pj-h">Lo que usan los mejores ${esc(CLS_ES[cls] || '')} <small>${KIND_ES[k]} · ${T.n} de los ${all} con más poder de combate de Global · semana del ${C.v.slice(8, 10)}/${C.v.slice(5, 7)}</small></h3>
<div class="cu-top">
${thin ? `<p class="cu-warn" role="note"><b>Muestra chica:</b> son solo ${T.n} personajes. Tomalo como una pista, no como la regla.</p>` : ''}
${vs}
<div class="cu-g">
${card('cu-stc', `Estigmas${X.gl('stig')} <small>${cur ? 'tilde = ya la tenés subida' : 'las 4 de la build y, atenuadas, las alternativas'}</small>`, stigBody)}
${arc ? card('cu-arcc', `Arcanas${X.gl('arc')} <small>${cur ? 'tilde = tu carta es del mismo set' : 'el set de cada carta'}</small>`, arcBody) : ''}
${gs ? card('cu-gsc', `Theostones (Piedra sagrada)${X.gl('gs')} <small>${cur?.x ? 'tilde = ya la tenés' : 'el efecto y el grado más común'}</small>`, gsBody) : ''}
${msTop.length ? card('cu-msc', `${gi('Icon_Usable_MagicStone_a_001', 24)}Piedras de maná <small>las que más ponen los top</small>`, msBody) : ''}
${skills ? card('cu-skc', `Skills que más suben${X.gl('skills')} <small>nivel de los top${cur ? ' y el tuyo' : ''}</small>`, `<ul class="cu-is cu-sk">${skills}</ul>`) : ''}
</div>
<h4 class="pj-h4 cu-eh">Qué buscar en cada pieza${X.gl('lineas')} <small>${cur?.x ? 'tilde = la tenés (tu valor · el de los top) · ' : ''}marcas = amplificación · ${parts ? 'líneas de skill: solo las de skills que usás' : 'una línea de skill sirve solo si usás esa skill'}</small></h4>
<ul class="cu-eq">${slots.map(piece).join('')}</ul>
${difHtml}
<details class="cu-more"><summary>Todas las líneas, pieza por pieza <small>también las que usan algunos, con el promedio de los top y sus piedras de maná</small></summary><p class="cu-leg">Número = promedio de los top que la llevan · borde punteado = cambia entre Estándar y PvP · tachada = línea de skill que no usás (vale 0) · rojo = JcJ</p><ul class="cu-st">${rows}</ul></details>
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
outEl.innerHTML = list.length ? `<p class="bl-n">${X.nf(r.total)} build${r.total === 1 ? '' : 's'} de ${CLS_ES[cls]}${tag ? ` con «${TAG_ES[tag]}»` : ''}; acá van las ${list.length} más votadas.${r.stale ? ' <em class="tag bad">la fuente no responde: es la última lista que tengo</em>' : ''}</p>
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
return `${d.stale ? '<p class="tag bad">La fuente no responde: es la última versión que tengo</p>' : ''}
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
const C = X.curated(cur), T = C?.top?.[kind]?.slots?.[cslot(e.slot)];
let pool = null;
if (it.subStatRandom && (it.subStats || []).length) try { pool = (await getLines(it.id)).items?.[it.id]?.lines; } catch { /* sin rango */ }
const top = new Map((T?.lines || []).map(l => [l.id, l]));
const li = (n, v, extra = '') => `<li><span>${esc(n)}</span><b>${v}</b>${extra}</li>`;
const main = (it.mainStats || []).map(s => li(s.name, `${esc(s.value)}${+s.extra ? ` <em>+${esc(s.extra)}</em>` : ''}`)).join('');
const maxed = [];
const lines = (it.subStats || []).map(s => {
const id = String(s.id).toLowerCase(), r = pool && rollOf({ id, value: s.value }, pool), t = top.get(id);
if (r && !r.out && r.q >= 0.95 && t?.avg != null && parseFloat(String(s.value).replace(',', '.')) < t.avg) maxed.push(s.name);
return `<li class="ln2" data-line="${esc(id)}"><span class="ln-n">${esc(s.name)}${t ? ` <em class="tag gold" title="La usan ${often(t.share)} los top ${KIND_ES[kind]} en esta pieza${t.avg != null ? `; los que la llevan sacaron ${n1(t.avg)}${unit(id)} de media` : ''}">top${t.avg != null ? ` ${n1(t.avg)}${unit(id)}` : ''}</em>` : ''}</span><b>${esc(s.value)}</b>
${r && !r.out ? `<span class="qb" role="img" aria-label="Salió al ${pct(r.q)} % del rango (${rng(r)})" title="Rango en Global: ${rng(r)}"><i style="--q:${pct(r.q)}%"></i></span><small class="q-p">${pct(r.q)} %</small>` : '<small class="q-na">—</small>'}</li>`;
}).join('');
const topSk = new Map((T?.skillLines || []).map(l => [String(l.id), l]));
const topTag = t => t && t.share >= SK_MIN ? ` <em class="tag gold" title="La llevan ${often(t.share)} los top ${KIND_ES[kind]} en esta pieza">top</em>` : '';
const sk = (it.subSkills || []).map(s => li(`${s.name} +${s.level}`, use(s.id) ? 'la usás' : '<span class="bad">no la usás</span>', topTag(topSk.get(String(s.id))))).join('');
const skWant = [...topSk.values()].filter(l => l.share >= SK_MIN && use(l.id) && !(it.subSkills || []).some(s => String(s.id) === String(l.id))).slice(0, 3);
const GT = C?.top?.[kind]?.theostones?.list || [], gTop = new Map(GT.map(x => [x.f, x])), gMine = new Set((it.godStoneStat || []).map(g => godFam(g.icon)));
const gEmpty = (it.godStoneSlotCount || 0) > (it.godStoneStat || []).length, gWant = it.godStoneSlotCount ? GT.filter(x => !gMine.has(x.f)).slice(0, 3) : [];
const msTop = new Map((T?.stones || []).map(x => [x.id, x]));
const msTag = s => { const id = String(s.id).toLowerCase(); return isPvp(id) && kind !== 'pvp' ? '<em class="tag bad" title="Piedra JcJ: solo suma contra jugadores">JcJ</em>' : msTop.has(id) ? `<em class="tag gold" title="${pct(msTop.get(id).share)} de cada 100 ranuras de los top ${KIND_ES[kind]} en esta pieza">top</em>` : ''; };
const want = T ? T.lines.filter(l => (l.tier === 'Best' || l.tier === 'Good') && !(it.subStats || []).some(s => String(s.id).toLowerCase() === l.id)).slice(0, 3) : [];
return `<p class="tip-m">${[it.categoryName, it.level && `nivel ${it.level}`, it.maxEnchantLevel && `encantamiento +${it.enchantLevel ?? e.enchant ?? 0} de ${it.maxEnchantLevel}`, it.maxExceedEnchantLevel && `amplificación +${e.exceed || 0} de ${it.maxExceedEnchantLevel}${T?.exceed >= 0.5 ? ` (los top +${n1(T.exceed)})` : ''}`].filter(Boolean).map(esc).join(' · ')}</p>
${main ? `<h4>Stats</h4><ul>${main}</ul>` : ''}
${lines ? `<h4>Líneas <small>barra = qué tan alto salió</small></h4><ul class="tip-ln">${lines}</ul>` : ''}
${maxed.length ? `<p class="tip-want tip-max">${esc(maxed.join(' y '))}: ya ${maxed.length > 1 ? 'salieron' : 'salió'} al tope de esta pieza. El promedio de los top es más alto porque llevan piezas de más nivel.</p>` : ''}
${want.length ? `<p class="tip-want">Los top ${KIND_ES[kind]} buscan acá: ${want.map(l => `<b>${esc(l.name)}</b> (${often(l.share)})`).join(', ')}.</p>` : ''}
${sk ? `<h4>Líneas de skill</h4><ul>${sk}</ul>` : ''}
${skWant.length ? `<p class="tip-want">Líneas de skill que llevan los top ${KIND_ES[kind]} acá, de skills que usás: ${skWant.map(l => `<b>${esc(gname({ name: l.name, nameEn: SK[l.id]?.[0] }))}</b> (${often(l.share)})`).join(', ')}.</p>` : ''}
${(it.magicStoneStat || []).length ? `<h4>Piedras de maná</h4><ul class="tip-ms">${it.magicStoneStat.map(s => li(s.name, esc(s.value), msTag(s))).join('')}</ul>` : ''}
${it.magicStoneSlotCount && msTop.size ? `<p class="tip-want">Piedras que más ponen los top ${KIND_ES[kind]} acá, de cada 100 ranuras: ${[...msTop.values()].slice(0, 3).map(x => `<b>${esc(x.name)}</b> (${pct(x.share)})`).join(', ')}.</p>` : ''}
${(it.godStoneStat || []).map(g => `<h4>Piedra sagrada${gTop.has(godFam(g.icon)) ? ` <em class="tag gold" title="La llevan ${often(gTop.get(godFam(g.icon)).share)} los top ${KIND_ES[kind]}">top</em>` : ''}</h4><p class="tip-gs ${X.gcls(g.grade)}"><b>${esc(g.name)}</b>${esc(g.desc || '')}</p>`).join('')}
${gWant.length || gEmpty ? `<p class="tip-want">${gEmpty ? 'La ranura de piedra sagrada está vacía. ' : ''}${gWant.length ? `Piedra sagrada que llevan los top ${KIND_ES[kind]}: ${gWant.map(x => `<b>${esc(godName(x.f, x.stoneEn))}</b> (${often(x.share)})`).join(', ')}.` : ''}</p>` : ''}
${(it.sources || []).length ? `<p class="tip-from">Sale de: ${esc(it.sources.join(', '))}</p>` : ''}`;
}
function how() {
modal({ title: 'Cómo elegimos', cls: 'pj-how', html: `
<p><b>Lo que usan los mejores.</b> Una vez por semana miramos la ficha pública oficial de los 30 personajes con más poder de combate de cada clase en Global y los separamos en Estándar, Healer y PvP por lo que llevan puesto (amuleto feroz, piedras y líneas de JcJ, estigmas de curación). Si un tipo tiene menos de 3, no lo mostramos: decimos por qué en vez de rellenar; con menos de 8 avisamos que la muestra es chica.</p>
<p><b>"Los mejores" = los de más poder de combate</b> del ranking público de Global. No es un ranking de daño ni de mazmorras terminadas: en Global no hay uno público. Los "PvP" son top que invierten en PvP, no especialistas. "Top típico" es la mediana: la mitad tiene más y la mitad menos.</p>
<p><b>Lo que comparamos con lo tuyo.</b> El valor de cada línea contra el promedio de los top que la llevan (con mejor equipo, sus rangos son más altos); la amplificación de cada pieza contra la de ellos; Estándar contra PvP, solo lo que pasa una prueba estadística (lo demás puede ser casualidad).</p>
<p><b>Piedras de maná.</b> De cada 100 ranuras de una pieza en los top, cuántas llevan cada piedra; guardamos las 6 más puestas, sin grado ni valor. Las JcJ solo suman contra jugadores.</p>
<p><b>Imprescindible</b> = la lleva al menos la mitad de las piezas de los top; <b>Muy usada</b>, una de cada cuatro; <b>A veces</b>, una de cada diez. La barrita dice cuántos: "casi todos", "la mayoría", "la mitad", "algunos".</p>
<p><b>Piedras sagradas.</b> Contamos por efecto (Sellado, Parálisis…) cuántos top lo llevan en el arma o la secundaria, sin importar el grado; dos con el mismo efecto en un personaje cuentan una vez, porque el juego aplica uno solo.</p>
<p><b>Recomendadas.</b> Builds públicas de jugadores con un puntaje de 0 a 100: 45 % cuánto se parecen a los top de su tipo, 20 % votos, 20 % si son posteriores al último parche y 15 % si coinciden con las guías. Menos de 50 no entra.</p>
<p><b>Calidad de una línea</b> (en el detalle de cada pieza): dónde cayó tu valor dentro del rango posible de ese ítem. 100 % = salió al tope. Los porcentajes de la ficha vienen redondeados a un decimal: puede haber ±3 puntos.</p>
<p>La ficha oficial muestra solo el preset activo. Las fuentes, en "Fuentes y créditos".</p>` });
}
