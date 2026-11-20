import { $, esc, ico, modal, announce, gname, gboth, on } from './core.js';
import { useful, skillParts, CSLOT, GOD, godFam, GR_F, GR_N, rollOf, SK_MIN, gearView, gvIdeal, kindGuess } from './personaje-calc.js';
export { rollOf };
await new Promise(r => { const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('./personaje-builds.css', import.meta.url).href, onload: r, onerror: r }), pj = document.querySelector('link[href$="personaje.css"]'); pj ? pj.after(l) : document.head.append(l); });
let X;                                         // {api, MSG, img, gcls, GRADE, nf, curated, CLS_KEY, gl} que pasa personaje.js
export const init = ctx => { X = ctx; };
const SK = (() => { try { return JSON.parse(document.getElementById('page-data')?.textContent || '{}'); } catch { return {}; } })();
/* ---------- tablas ---------- */
const CLASSES = [['gladiator', 'Gladiador'], ['templar', 'Templario'], ['ranger', 'Arquero'], ['assassin', 'Asesino'], ['sorcerer', 'Hechicero'], ['elementalist', 'Espiritualista'], ['cleric', 'Clérigo'], ['chanter', 'Cantor']];
const CLS_ES = Object.fromEntries(CLASSES);
const TAGS = [['', 'Todas'], ['pve', 'PvE'], ['pvp', 'PvP'], ['dps', 'DPS'], ['healer', 'Healer'], ['support', 'Apoyo'], ['dungeon', 'Mazmorras'], ['budget-build', 'Económica'], ['endgame-build', 'Contenido final']];
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
const fv = v => String(v ?? '').replace(/(\d)\.(\d)/g, '$1,$2').replace(/(\d)%/, '$1 %');
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
const godName = (f, en) => gname({ name: GOD[f]?.[0], nameEn: GOD[f]?.[1] }) || String(en || `Piedra ${f}`).replace(/^Theostone:\s*/, '');
const grF = g => GR_F[g] || g || '';
const msGr = st => st.grade ? `<small class="cu-msq ${X.gcls(st.grade)}">${esc(grF(st.grade))}${st.v ? ` +${n1(st.v)}${unit(st.id)}` : ''}</small>` : '';
const cslot = s => CSLOT[s] || ARC[s - 41]?.[0];
const MS_TOP = 0.15;
export const often = s => s >= 0.9 ? 'casi todos' : s >= 0.7 ? 'la mayoría' : s >= 0.55 ? 'más de la mitad' : s >= 0.4 ? 'la mitad' : s >= 0.2 ? 'algunos' : 'pocos';
const share = (s, what = 'la usan') => `<span class="sh" role="img" aria-label="${what} ${often(s)} (${pct(s)} %)"><i style="--q:${pct(s)}%"></i></span>`;
const skIcon = (id, sz) => SK[id]?.[1] ? X.img(`https://assets.playnccdn.com/static-aion2-gamedata/resources/${SK[id][1]}.png`, sz) : '';
const isPvp = id => /^pvp/i.test(String(id));
const HYB = 3, HYB_T = 'si también hacés PvP, dejalas';
const pvpAll = cur => Object.values(cur?.x?.items || {}).reduce((t, it) => t + (it?.magicStoneStat || []).filter(m => isPvp(m.id)).length, 0);
const unit = id => ST[String(id).toLowerCase()]?.[1] === 'p' ? ' %' : '';
const n1 = v => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(v);
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const orL = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' o ' + a.at(-1) : a[0] || '';
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
const getItems = () => once('items', () => fetch(new URL('./pj-items.json', import.meta.url)).then(r => r.ok ? r.json() : {}, () => ({})));
const ARC_EN = { chalice: ['Chalice', 'Grail'], parchment: ['Parchment', 'Parchment'], compass: ['Compass', 'Compass'], bell: ['Bell', 'Bell'], mirror: ['Mirror', 'Mirror'] };
const arcIco = (c, set) => `Icon_Arcana_Card_${ARC_EN[c][1]}_u_${set === 'Magic' ? 'DefenceSet2' : 'PveSet2'}`;
const NOBRAND = /\s*\b(en|de|desde)\s+(questlog|plaync|kisk|aion2data)\b/gi;   // los motivos del curado a veces nombran la fuente
const kindSeg = (C, k, cls) => `<div class="seg cu-k" role="group" aria-label="Tipo de build" id="cu-kd">${KINDS.filter(([v]) => v !== 'support' || HEAL.has(cls)).map(([v, l]) => `<button type="button" data-ck="${v}" aria-pressed="${v === k}">${l} <small>${C.kinds?.[v] ?? 0}</small></button>`).join('')}</div>`;
const whyP = t => `<p class="pj-empty cu-why" role="status">${esc(String(t).replace(NOBRAND, ''))}</p>`;
const tile = ({ id, pic, name, lv, have, dim, sub, s, title }) => `<li class="cu-i${have ? ' have' : ''}${dim ? ' dim' : ''}"${id ? ` data-id="${esc(id)}"` : ''}${title ? ` title="${esc(title)}"` : ''}>
<span class="cu-iw">${pic}${lv ? `<b class="cu-lv">${lv}</b>` : ''}${have ? `<i class="cu-ok">${ico('i-check')}</i><span class="sr">La tenés. </span>` : ''}</span>
<span class="cu-in">${esc(name)}</span>${sub ? `<small>${sub}</small>` : ''}${s != null ? share(s) : ''}</li>`;
const MY = '<em class="cu-my">tu elección</em>';
const card = (cls, h, body) => `<section class="cu-card ${cls}"><h4 class="cu-ch">${h}</h4>${body}</section>`;
function haveOf(cur) {
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
return { mine, myV, myMs };
}
const myEqOf = (cur, s) => (cur?.d.equipment || []).filter(e => e.slot < 41 && CSLOT[e.slot] === s);
function usesOf(cur) {
const parts = cur?.x ? skillParts(cur.d, cur.x.items || {}, cur.x.boards || {}) : null;
const mySk = new Map((cur?.d.skills || []).map(x => [String(x.id), x]));
return { parts, uses: id => parts ? useful(mySk.get(String(id)), parts.get(String(id))) : null };
}
const skWantOf = (x, uses) => (x?.skillLines || []).filter(l => l.share >= SK_MIN && uses(l.id) !== false);
function ampHtml(t, E, cur) {
if (!(t >= 0.5)) return '';
const me = cur && E.length ? Math.min(...E.map(e => e.exceed || 0)) : null, tr = Math.round(t);
const no = me != null && cur?.x && E.every(e => cur.x.items?.[e.slot] && !cur.x.items[e.slot].maxExceedEnchantLevel);
const lab = `Amplificación: los top la llevan a +${n1(t)}${no ? '; la tuya no se amplifica' : me != null ? `; vos, +${me}` : ''}`;
return `<span class="cu-pa" role="img" aria-label="${lab}" title="${lab}"><span class="eq-amp">${[1, 2, 3, 4, 5].map(i => `<i class="${[!no && (me ?? tr) >= i && 'on', tr >= i && 'tg'].filter(Boolean).join(' ')}"></i>`).join('')}</span><small${me != null && !no ? ` class="${me < tr ? 'low' : 'ok'}"` : ''}>${no ? 'la tuya no se amplifica; la de los top sí' : me != null ? `vos +${me} · top +${tr}` : `top +${tr}`}</small></span>`;
}
function topHtml(C, k, cls, cur) {
const T = C.top?.[k], all = C.top?.all?.n;
const myCh = cur && X.mine ? X.mine(cur, k) : new Set(), myIn = s => myCh.has('stig:' + s.id);
const estB = key => cur && X.estBtn ? ' ' + (myCh.has(key) ? X.estBtn(key, 'no', 'Sugerime lo de los top') : X.estBtn(key, 'si', 'Es mi elección')) : '';
const { mine, myV, myMs } = haveOf(cur), myEq = s => myEqOf(cur, s), { parts, uses } = usesOf(cur);
const myLv = new Map((cur?.d.skills || []).map(x => [String(x.id), x.level || 0]));
const myStig = new Set((cur?.d.skills || []).filter(x => x.category === 'Dp' && x.level > 0).map(x => String(x.id)));
const have = cur?.x ? (s, id) => !!mine[s]?.has(id) : () => false;
const myGod = cur?.x ? [1, 2].map(s => cur.x.items?.[s]).map(it => it && { fam: (it.godStoneStat || []).map(g => godFam(g.icon)).filter(Boolean), empty: (it.godStoneSlotCount || 0) > (it.godStoneStat || []).length }) : [];
const myFam = new Set(myGod.flatMap(g => g?.fam || []));
const myGr = {};
for (const it of cur?.x ? [1, 2].map(s => cur.x.items?.[s]) : []) for (const g of it?.godStoneStat || []) { const f = godFam(g.icon); if (f && (GR_N[g.grade] || 0) > (GR_N[myGr[f]] || 0)) myGr[f] = g.grade; }
if (!T?.slots) return `<h3 class="pj-h">Lo que usan los mejores <small>${KIND_ES[k]}</small></h3>${whyP(`Sin datos de los top ${KIND_ES[k]}: ${C.reasons?.top?.[k] || `muestra chica (${T?.n || 0} de ${all})`}. Acá no los reemplazamos con otro tipo; en Próximos pasos ${cur ? 'te comparamos' : 'comparamos'} con los top de toda la clase${k === 'support' ? ', que pegan y no curan' : ''}.`)}`;
const sk = s => ({ name: s.name, nameEn: SK[s.id]?.[0] });
const ok = (s, l) => have(s, l.id) ? ico('i-check') + '<span class="sr">La tenés: </span>' : '';
const vsAvg = (s, l) => { const v = myV[s]?.[l.id]; return v && l.avg != null ? { me: mean(v), top: l.avg } : null; };
const avgTxt = (l, a) => a ? `Tu ${l.name}: ${n1(a.me)}${unit(l.id)}; los top que la llevan sacaron ${n1(a.top)}${unit(l.id)} de media` : '';
const D = k === 'pve' || k === 'pvp' ? (C.diffs?.pveVsPvp?.list || []).filter((d, i, L) => d.what === 'line' || d.what === 'stigma'
|| (d.what === 'arcana' && d.PvP > d.PvE && !L.slice(0, i).some(x => x.what === 'arcana' && x.slot === d.slot && x.PvP > x.PvE))) : [];
const dif = new Map(D.filter(d => d.what === 'line').map(d => [d.slot + '|' + d.id, d]));
const ARMOR = new Set(['helmet', 'shoulder', 'torso', 'pants', 'gloves', 'boots', 'cape']);   // slot 'armor' del curado: alguna pieza
const difOf = (s, id) => dif.get(s + '|' + id) || (ARMOR.has(s) ? dif.get('armor|' + id) : undefined);
const chip = (s, l) => {
const h = have(s, l.id), d = difOf(s, l.id), cl = [h && 'have', d && 'dif'].filter(Boolean).join(' ');
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
const skWant = s => skWantOf(T.slots[s], uses);
const slots = [...TSLOTS, ...ARC.map(([c]) => c)].filter(s => T.slots[s]?.lines?.length || T.slots[s]?.skillLines?.length);
const ampP = s => ampHtml(T.slots[s]?.exceed, myEq(s), cur);
const pvpMs = s => (myMs[s] || []).filter(isPvp).length, hyb = pvpAll(cur) >= HYB;
const piece = s => {
const x = T.slots[s], it = x.items?.[0], best = x.lines.filter(l => l.tier === 'Best'), en = Math.round(x.enchant || 0), a = T.arcana?.[s]?.[0];
const sk = skWant(s).slice(0, 3), skAll = (x.skillLines || []).filter(l => l.share >= SK_MIN).length, pv = k === 'pvp' || myCh.has('ms') ? 0 : pvpMs(s);
const pic = a ? gi(arcIco(s, a.set), 44) : gi(IT[it?.id], 44), E2 = myEq(s), hit = !a && it ? E2.filter(e => [it.id, ...(it.ids || [])].map(String).includes(String(e.id))).length : 0, mineIt = hit > 0;
const half = E2.length === 2 && hit === 1;
const itT = !a && it ? `<small class="cu-pit${mineIt ? ' have' : ''}" title="${esc(x.items.map(i => `${gname(i)} ${pct(i.share)} %`).join(' · '))}">${mineIt ? ico('i-check') + `<span class="sr">${half ? 'Tenés una de las dos: ' : 'La tenés: '}</span>` : ''}<span>${esc(gname(it))}</span> <b>${pct(it.share)} %</b>${half ? ' <em class="cu-half">1 de 2</em>' : ''}</small>` : '';
const name = a ? `${esc(x.name)} <small>${esc(gname({ name: SET_ES[a.set] || a.set, nameEn: a.set }))}</small>` : esc(x.name);
const none = !sk.length && skAll && parts ? '<li class="sk-no">Las que llevan los top son de skills que no usás</li>' : '';
return `<li class="cu-p" data-slot="${s}"><span class="eq-i cu-pi"${en ? ` title="Encantamiento: los top la llevan a +${en}"` : ''}>${pic}${en ? `<b class="eq-en">+${en}</b>` : ''}</span>
<b class="cu-pn">${name}${ampP(s)}</b>${itT}<ul class="cu-pl">${(best.length ? best : x.lines.filter(l => l.tier === 'Good').slice(0, 3)).map(l => pill(s, l)).join('')}${sk.map(l => skPill(s, l)).join('')}${none}${pv ? `<li class="ms-pvp${hyb ? ' hyb' : ''}" title="Piedras de maná PvP en tu ${esc(x.name.toLowerCase())}: solo suman contra jugadores${hyb ? `; ${HYB_T}` : ''}">${pv} piedra${pv > 1 ? 's' : ''} PvP</li>` : ''}</ul></li>`;
};
const skChip = (s, l) => {
const off = uses(l.id) === false, h = skHave(s, l);
return `<li data-sk="${esc(l.id)}" class="${[h && 'have', off && 'off'].filter(Boolean).join(' ')}" title="La llevan ${often(l.share)} los top (${pct(l.share)} %)${off ? '. No usás esa skill: para vos vale 0' : h ? '. Vos la tenés' : ''}">${h ? ico('i-check') + okI : ''}${esc(skName(l))}${off ? '<span class="sr"> (no la usás)</span>' : ''}${share(l.share)}</li>`;
};
const msChip = (s, st) => {
const h = !!myMs[s]?.includes(st.id), cl = [h && 'have', isPvp(st.id) && k !== 'pvp' && 'pvp'].filter(Boolean).join(' ');
return `<li data-ms="${esc(st.id)}"${cl ? ` class="${cl}"` : ''} title="${esc(st.name)}: ${pct(st.share)} de cada 100 ranuras de piedra de maná de los top en esta pieza${st.grade ? `, casi siempre ${grF(st.grade).toLowerCase()}` : ''}${h ? '. Vos la tenés' : ''}">${h ? ico('i-check') + okI : ''}${esc(st.name)}<small class="cu-cav">${pct(st.share)} %</small>${msGr(st)}</li>`;
};
const rows = slots.map(s => {
const x = T.slots[s], K = (x.skillLines || []).filter(l => l.share >= 0.1), M = x.stones || [];
return `<li class="cu-row" data-slot="${s}"><b class="cu-sn">${esc(x.name)}</b>${TIERS.map(([t, lb]) => { const L = x.lines.filter(l => l.tier === t); return L.length ? `<div class="cu-t" data-t="${t}"><small>${lb}</small><ul class="cu-c">${L.map(l => chip(s, l)).join('')}</ul></div>` : ''; }).join('')}${K.length ? `<div class="cu-t" data-t="skill"><small>Línea de skill</small><ul class="cu-c">${K.map(l => skChip(s, l)).join('')}</ul></div>` : ''}${M.length ? `<div class="cu-t" data-t="ms"><small>Piedras de maná · de cada 100 ranuras</small><ul class="cu-c">${M.map(st => msChip(s, st)).join('')}</ul></div>` : ''}</li>`;
}).join('');
const stM = T.stigmaAlt ? T.stigmas : T.stigmas.slice(0, 4), altAll = T.stigmaAlt || T.stigmas.slice(4), stA0 = altAll.filter(s => s.share >= 0.1 || myIn(s));
const kOf = s => s.k ?? Math.round(s.share * 1000), sameId = (L, x) => L.some(s => String(s.id) === String(x.id));
const tie = stM.length === 4 ? stA0.filter(s => kOf(s) === kOf(stM[3])) : [];
const stX = cur ? (cur.d.skills || []).filter(x => x.category === 'Dp' && x.level > 0 && myIn(x) && !sameId([...stM, ...altAll], x)).map(x => ({ id: String(x.id), name: x.name })) : [];
const stA = [...stA0.filter(s => !tie.includes(s)), ...stX];
const tieG = tie.length ? [stM[3], ...tie] : [], tieHave = tieG.some(s => myStig.has(String(s.id)));
const stVos = (s, alt) => { const m = myLv.get(String(s.id)) || 0, t = Math.round(s.lvl || 0); return cur && (m || !alt) ? `<span class="${m >= t ? 'ok' : m && m < t - 4 ? 'low' : ''}">vos ${m}</span>` : ''; };
const myK = s => s.share == null ? '<span class="cu-myk">ningún top la lleva</span>' : s.k != null ? `<span class="cu-myk">${s.k} de ${s.of ?? T.n} top la lleva${s.k > 1 ? 'n' : ''}${s.lvl ? `, a ${Math.round(s.lvl)}` : ''}</span>` : '';
const stT = (s, alt) => { const my = myIn(s); return tile({ id: s.id, pic: skIcon(s.id, 48), name: gname(sk(s)), lv: s.lvl ? Math.round(s.lvl) : 0, have: myStig.has(String(s.id)), dim: !my && (alt || s.share < 0.5), sub: stVos(s, alt) + (my ? MY + myK(s) : ''), s: s.share,
title: `${gboth(sk(s))}: ${s.share != null ? `la usan ${often(s.share)}` : 'ningún top la usa'}${s.lvl ? `, nivel ${Math.round(s.lvl)}` : ''}${alt ? ' (alternativa)' : ''}${my ? '. Tu elección' : ''}${tieG.includes(s) ? `. Empatada: ${orL(tieG.map(x => gname(sk(x))))} las suben los mismos top` : ''}` }); };
const stMiss = cur ? stM.filter(s => s.share >= 0.5 && !myStig.has(String(s.id)) && !(s === stM[3] && tieHave)) : [], stInst = cur ? stA.filter(s => s.share != null && myStig.has(String(s.id))) : [];
const stList = L => L.map(s => `${orL((s === stM[3] && tieG.length ? tieG : [s]).map(x => `<b>${esc(gname(sk(x)))}</b>`))} (${often(s.share)})`).join(', ');
const altSh = x => altAll.find(s => String(s.id) === String(x.id))?.share || 0, myUp = cur ? (cur.d.skills || []).filter(x => x.category === 'Dp' && x.equipped && x.level > 0) : [];
const ownS = myUp.filter(x => !sameId([...stM, ...tie], x)).sort((a, b) => altSh(a) - altSh(b)), ownMine = ownS.filter(myIn), freeSlot = myUp.length < 4;
const lvN = x => `<b>${esc(gname(sk(x)))}</b> (${x.level})`;
const myArc = cur ? Object.fromEntries(ARC.map(([c], i) => [c, setOf((cur.d.equipment || []).find(e => e.slot === 41 + i)?.icon)])) : null;
const cbSet = (x, i) => gname({ name: `${ARC[i][1]} de ${x === 'M' ? 'magia' : 'vitalidad'}`, nameEn: `${ARC_EN[ARC[i][0]][0]}: ${x === 'M' ? 'Magic' : 'Vigor'}` });
const stById = id => [...stM, ...altAll].find(s => String(s.id) === String(id)) || { id, name: SK[id]?.[0] || String(id) };
const coh = (c, who) => {
if (!c || !cur) return '';
const L = [...(freeSlot ? c.stig.filter(x => !myStig.has(String(x.id))) : []).map(x => [gname(sk(stById(x.id))), x.k]),
...c.arc.filter(x => myArc[x.c] !== x.set[0] && !myCh.has('arc:' + x.c)).map(x => [cbSet(x.set[0], ARC.findIndex(a => a[0] === x.c)), x.k])]
.filter(([, n]) => c.n < 5 ? n === c.n : n * 2 >= c.n).sort((a, b) => b[1] - a[1]).slice(0, 4);
return L.length ? `<p class="cu-coh" role="note">Los ${c.n} top ${who} también llevan: ${L.map(([nm, n]) => `<b>${esc(nm)}</b> (${n} de ${c.n})`).join(', ')}.</p>` : '';
};
const stMain = stM.map(s => stT(s)).join('') + tie.map(s => `<li class="cu-or" aria-hidden="true">o</li>${stT(s)}`).join('');
const stigBody = `<div class="cu-stw"><ul class="cu-is cu-stig">${stMain}</ul>${stA.length ? `<div class="cu-alt"><small>Alternativas</small><ul class="cu-is cu-stig cu-sta">${stA.map(s => stT(s, 1)).join('')}</ul></div>` : ''}</div>
${tie.length ? `<p class="cu-stn par" role="note">La cuarta está empatada: ${orL(tieG.map(x => `<b>${esc(gname(sk(x)))}</b>`))}, las suben los mismos top. Cualquiera vale.</p>` : ''}
${!stMiss.length ? '' : stInst[0]?.share >= stMiss[0].share - 0.25 ? `<p class="cu-stn par" role="note">Los top se reparten entre ${stList(stMiss)} y ${stList(stInst)}: vos llevás la segunda.</p>`
: freeSlot || !ownS.length ? `<p class="cu-stn" role="note">Te falta ${stList(stMiss)}.</p>`
: ownMine.length ? `<p class="cu-stn par" role="note">Tu elección: ${ownMine.map(lvN).join(', ')}. Los top usan ${stList(stMiss)}.${estB('stig:' + ownMine[0].id)}</p>`
: `<p class="cu-stn par" role="note">Te falta ${stList(stMiss)}. En su lugar tenés ${ownS.map(lvN).join(', ')}.${estB('stig:' + ownS[0].id)}</p>`}
${ownMine.map(x => coh(T.cohort?.stig?.[x.id], 'con ' + esc(gname(sk(x))))).join('')}`;
const skills = (T.skills || []).filter(s => s.cat === 'Passive' || s.onBar >= 0.5).sort((a, b) => b.lvl - a.lvl).slice(0, 8).map(s => {
const lv = Math.round(s.lvl), m = myLv.get(String(s.id));
return tile({ id: s.id, pic: skIcon(s.id, 48), name: gname(sk(s)), lv, sub: cur && m != null ? `<span class="${m < lv - 2 ? 'low' : m >= lv ? 'ok' : ''}">vos ${m}</span>` : '', title: `${gboth(sk(s))}${s.cat === 'Passive' ? ' (pasiva)' : ''}: los top la tienen en ${lv}` });
}).join('');
const arc = ARC.filter(([c]) => T.arcana?.[c]?.length).map(([c, lb]) => {
const a = T.arcana[c][0], set = { name: SET_ES[a.set] || a.set, nameEn: a.set }, e = Math.round(T.slots[c]?.enchant || 0), m = myArc?.[c];
const me = cur ? (cur.d.equipment || []).find(x => x.slot === 41 + ARC.findIndex(y => y[0] === c)) : null, mv = me ? me.enchant || 0 : null;
return tile({ id: c, pic: gi(arcIco(c, a.set), 48), name: gname({ name: lb, nameEn: ARC_EN[c][0] }), lv: e ? '+' + e : 0, have: m === a.set[0], sub: `${esc(gname(set))}${mv != null && e ? ` <span class="${mv >= e ? 'ok' : 'low'}">vos +${mv}</span>` : ''}${myCh.has('arc:' + c) ? `<em class="cu-my">tu elección: ${m === 'M' ? 'magia' : 'vitalidad'}</em>` : ''}`, s: a.share, title: `${lb} de ${set.name.toLowerCase()}: la usan ${often(a.share)}${e ? `, a +${e}` : ''}${m && m !== '-' ? `. La tuya es de ${m === 'M' ? 'magia' : 'vitalidad'}` : ''}${mv != null ? `, a +${mv}` : ''}` });
}).join('');
const CB = T.arcana?.combos || [], myCb = myArc && !Object.values(myArc).includes('-') ? ARC.map(([c]) => myArc[c]).join('') : null;
const cbL = [...CB.slice(0, 2), ...(myCb && !CB.slice(0, 2).some(c => c.cards === myCb) ? [CB.find(c => c.cards === myCb) || { cards: myCb }] : [])];
const cbTxt = cards => { const M = [...cards].map((x, i) => x === 'M' && ARC[i][1]).filter(Boolean), V = [...cards].map((x, i) => x === 'V' && ARC[i][1]).filter(Boolean);
const [base, rest, of] = M.length > V.length ? ['magia', V, 'vitalidad'] : ['vitalidad', M, 'magia'];
return (rest.length ? `${base}, ${rest.join(' y ')} de ${of}` : `todas de ${base}`).replace(/^./, c => c.toUpperCase()); };
const cbN = k => `${k} de ${T.n} top la juega${k > 1 ? 'n' : ''}`;
const cbK = c => c.k != null ? cbN(c.k) : CB.at(-1)?.k == null ? '' : CB.length < 4 ? 'ningún top la juega' : `a lo sumo ${cbN(CB.at(-1).k)}`;
const cbRow = c => `<li data-cb="${esc(c.cards)}"${c.cards === myCb ? ' class="have"' : ''}><span class="cu-cbi" role="img" aria-label="${esc([...c.cards].map(cbSet).join(', '))}">${[...c.cards].map((x, i) => x === 'V' || x === 'M' ? gi(arcIco(ARC[i][0], x === 'M' ? 'Magic' : 'Vigor'), 24) : '<span class="noimg"></span>').join('')}</span><small>${c.cards === myCb ? '<b>la tuya</b> · ' : ''}${esc(cbTxt(c.cards))}${c.cards === myCb ? (cbK(c) ? ` · ${cbK(c)}` : '') : CB.slice(0, 2).includes(c) ? ` · la usan ${often(c.share)}` : ''}</small></li>`;
const arcDif = cur ? ARC.map(([c], i) => [c, i]).filter(([c]) => T.arcana?.[c]?.length && myArc[c] !== '-' && myArc[c] !== T.arcana[c][0].set[0]) : [];
const arcN = arcDif.map(([c, i]) => { const a = T.arcana[c][0], top = `los top la usan de ${a.set === 'Magic' ? 'magia' : 'vitalidad'} (${often(a.share)})`;
return `<p class="cu-stn par cu-arn" role="note" data-arc="${c}">${myCh.has('arc:' + c) ? `Tu elección: <b>${esc(cbSet(myArc[c], i))}</b>; ${top}.` : `Tu carta es <b>${esc(cbSet(myArc[c], i))}</b>; ${top}.`}${estB('arc:' + c)}</p>${myCh.has('arc:' + c) && T.cohort?.arc?.[c]?.set[0] === myArc[c] ? coh(T.cohort.arc[c], 'con ' + esc(cbSet(myArc[c], i))) : ''}`; }).join('');
const arcBody = `<ul class="cu-is cu-arc">${arc}</ul>${cbL.length ? `<p class="cu-sub">Las 5 juntas</p><ul class="cu-cb">${cbL.map(cbRow).join('')}</ul>` : ''}${arcN}`;
const G = T.theostones, gL = G?.list || [], pair = G?.pairs?.[0];
const gn = f => godName(f, gL.find(x => x.f === f)?.stoneEn);
const gMine = x => myFam.has(x.f) && myGr[x.f] && myGr[x.f] !== x.grade ? myGr[x.f] : null;   // tu grado, solo si difiere del de los top
const gs = gL.map(x => tile({ id: x.f, pic: gi('Icon_Item_Usable_Godstone_WP_r_' + x.f, 48), name: gn(x.f), have: myFam.has(x.f), dim: x.share < 0.5,
sub: `<span class="${X.gcls(x.grade)}">${esc(grF(x.grade))}</span>${gMine(x) ? ` <span class="cu-gmy ${X.gcls(gMine(x))}">la tuya: ${esc(grF(gMine(x)))}</span>` : ''}`, s: x.share,
title: `${gn(x.f)}: la usan ${often(x.share)} (${pct(x.share)} %), la más común en ${grF(x.grade).toLowerCase()}${gMine(x) ? `; la tuya es ${grF(gMine(x)).toLowerCase()}` : ''}` })).join('');
const gsMiss = gL.find(x => !myFam.has(x.f));
const gsOut = [...myFam].filter(f => !gL.some(x => x.f === f)), gTop = gL[0]?.grade;
const gsYours = () => gsOut.map(f => `<b>${esc(gn(f))}</b>${myGr[f] ? ` (${esc(grF(myGr[f]).toLowerCase())})` : ''}`).join(' y '), gsTops = () => `<b>${esc(pair ? `${gn(pair.f[0])} + ${gn(pair.f[1])}` : gn(gL[0].f))}</b>`;
const gsOutTxt = !gsOut.length || !gL.length ? '' : gsOut.every(f => myCh.has('gs:' + f))
? `Tu elección: ${gsYours()}.${gsOut.some(f => (GR_N[myGr[f]] || 0) < (GR_N[gTop] || 0)) ? ` Hay ${esc(grF(gTop).toLowerCase())}: es la mejora de la tuya.` : ''} Los top: ${gsTops()}.`
: `La tuya: ${gsYours()}: la lleva menos de 1 de cada 10 top; los top, ${gsTops()}.`;
const gsWarn = [...myGod.map((g, i) => g?.empty && `${i ? 'Tu secundaria' : 'Tu arma'} tiene la ranura de piedra sagrada vacía`), myGod[0]?.fam[0] && myGod[0].fam[0] === myGod[1]?.fam[0] && `Tenés ${gn(myGod[0].fam[0])} en las dos manos: aplica una sola`].filter(Boolean);
const gsBody = `<ul class="cu-is cu-gs">${gs}</ul><div class="cu-gst"><p class="cu-gsn">Poné una en el arma y otra distinta en la secundaria: dos con el mismo efecto aplican uno solo.${pair ? ` El par más usado: <b>${esc(gn(pair.f[0]))} + ${esc(gn(pair.f[1]))}</b> (${often(pair.share)}).` : ''}</p>
${gsWarn.length ? `<p class="cu-gsw" role="note">${esc(gsWarn.join('. '))}.${gsMiss ? ` Los top llevan <b>${esc(gn(gsMiss.f))}</b>.` : ''}</p>` : ''}${gsOutTxt ? `<p class="cu-gsn cu-gso" role="note">${gsOutTxt}${estB('gs:' + gsOut[0])}</p>` : ''}</div>`;
const msAgg = {};
let msW = 0;
for (const x of Object.values(T.slots)) if (x.stones?.length) { msW += x.pieces; for (const st of x.stones) (msAgg[st.id] ||= { ...st, w: 0 }).w += st.share * x.pieces; }
const msTop = Object.values(msAgg).sort((a, b) => b.w - a.w).slice(0, 5);
const myPv = Object.keys(myMs).map(s => [s, pvpMs(s)]).filter(x => x[1]), pvN = myPv.reduce((t, x) => t + x[1], 0);
const pvS = (C.signals || []).filter(x => x.kind === 'pvp').map(x => x.pvpStones || 0).sort((a, b) => a - b);
const pvH = pvS.filter(x => x >= 8), pvR = pvS.filter(x => x < 8), pvRM = Math.max(0, ...pvR);
const pvTxt = !pvS.length ? '' : !pvH.length ? (pvRM ? ` Ningún top PvP lleva más de ${pvRM}.` : ' Ningún top PvP las pone.')
: ` De los ${pvS.length} top PvP, ${pvH.length} ${pvH.length > 1 ? 'llevan' : 'lleva'} ${pvH[0]} o más${pvR.length ? `; el resto, ${pvRM ? `${pvRM} o menos` : 'ninguna'}` : ''}.`;
const msGrd = Object.values(T.slots).some(x => x.stones?.some(st => st.grade));   // curado con grado y valor de cada piedra
const msBody = `<ul class="cu-ms">${msTop.map(st => `<li data-ms="${esc(st.id)}" title="${esc(st.name)}: ${pct(st.w / msW)} de cada 100 ranuras de los top">${esc(st.name)}<b>${pct(st.w / msW)} %</b></li>`).join('')}</ul>
<div class="cu-gst"><p class="cu-gsn">De cada 100 ranuras de los top, en todo el equipo.${msGrd ? ' Pieza por pieza, con el grado y el valor más comunes, en la tabla completa de abajo.' : ' Solo se sabe qué piedra ponen, no su grado ni cuánto suma. Pieza por pieza, en la tabla completa de abajo.'}</p>
${pvN ? `<p class="cu-msw${k === 'pvp' || myCh.has('ms') || hyb ? ' par' : ''}" role="note">Tenés <b>${pvN} piedra${pvN > 1 ? 's' : ''} de maná PvP</b> (${esc(myPv.map(([s, n]) => `${(T.slots[s]?.name || s).toLowerCase()}${n > 1 ? ` ×${n}` : ''}`).join(', '))}): solo suman contra jugadores${k === 'pvp' ? '' : `, no en ${KIND_ES[k]}`}.${k !== 'pvp' && hyb ? ` ${HYB_T.replace(/^./, c => c.toUpperCase())}.` : ''}${pvTxt}${k === 'pvp' ? '' : estB('ms')}</p>` : ''}</div>`;
const P = cur?.d.profile || {};
const ampMe = e => cur.x ? cur.x.items?.[e.slot]?.maxExceedEnchantLevel > 0 && T.slots[CSLOT[e.slot]]?.exceed != null : T.slots[CSLOT[e.slot]]?.exceed >= 2;
const ampS = cur ? (cur.d.equipment || []).filter(e => e.slot < 41 && ampMe(e)).map(e => [e.exceed || 0, T.slots[CSLOT[e.slot]].exceed])
: Object.values(CSLOT).filter(s => T.slots[s]?.exceed >= 2).map(s => [0, T.slots[s].exceed]);
const vsT = [T.cpMedian && ['cp', 'Poder de combate', P.combatPower, T.cpMedian, X.nf, 'top típico'], T.ilvlMedian && ['il', 'Nivel de objeto', P.itemLevel, T.ilvlMedian, X.nf, 'top típico'],
ampS.length && ['amp', 'Amplificación por pieza', mean(ampS.map(x => x[0])), mean(ampS.map(x => x[1])), v => '+' + n1(v), 'los top']].filter(Boolean);
const vsLi = ([id, lb, me, top, f, who]) => {
const q = cur && me != null ? Math.min(1, me / top) : null;
return `<li data-vs="${id}"><small>${lb}</small><b>${f(q != null ? me : top)}</b>${q != null ? `<span class="cu-vb" role="img" aria-label="${pct(q)} % de ${who}"><i style="--q:${pct(q)}%"></i></span><small>${who} ${f(top)}</small>` : `<small>${who}</small>`}</li>`;
};
const vs = vsT.length ? `<ul class="cu-vs" aria-label="${cur ? 'Vos contra los top' : 'Los top'}" title="Top típico = la mediana: la mitad de los top tiene más y la mitad menos">${vsT.map(vsLi).join('')}</ul>` : '';
const thin = T.confidence === 'baja' || T.n < 8;
const dWhere = d => d.what === 'stigma' ? 'Estigma' : d.slot === 'armor' ? 'Armadura (alguna pieza)' : T.slots[d.slot]?.name || d.slot;
const dLi = d => `<li><span>${esc(dWhere(d))}</span>${d.what === 'arcana' ? ' ·' : ''} <b>${esc(d.what === 'stigma' ? gname(sk(d)) : d.what === 'arcana' ? gname({ name: SET_ES[d.name] || d.name, nameEn: d.name }) : d.name)}</b> <small>${pct(d.PvE)} % → ${pct(d.PvP)} %</small></li>`;
const dCols = [['pvp', 'En PvP sube', D.filter(d => d.PvP > d.PvE)], ['pve', 'En Estándar manda', D.filter(d => d.PvE > d.PvP)]].sort((a, b) => (b[0] === k) - (a[0] === k)).filter(x => x[2].length);
const dSame = [!D.some(d => d.what === 'arcana') && 'Arcanas', !D.some(d => d.what === 'stigma') && 'estigmas'].filter(Boolean);
const difHtml = D.length ? `<section class="cu-dif" aria-labelledby="cu-dh"><h4 class="pj-h4" id="cu-dh">Estándar contra PvP <small>lo que más cambia · % de los top, Estándar → PvP</small></h4>
<div class="cu-dg">${dCols.map(([d, h, L]) => `<div class="cu-dc" data-d="${d}"><small>${h}</small><ul>${L.map(dLi).join('')}</ul></div>`).join('')}</div>
${dSame.length ? `<p class="cu-gsn">${dSame.join(' y ').replace(/^./, c => c.toUpperCase())}: sin diferencias claras con esta muestra.</p>` : ''}</section>`
: (k === 'pve' || k === 'pvp') && C.diffs?.pveVsPvp && C.top?.pve?.slots && C.top?.pvp?.slots ? `<p class="cu-gsn cu-dif0">Estándar contra PvP: con esta muestra ninguna diferencia en líneas, estigmas ni Arcanas es segura (pueden ser casualidad). Cada tipo muestra lo que llevan sus top.</p>` : '';
return `<h3 class="pj-h">Lo que usan los mejores ${esc(CLS_ES[cls] || '')} <small>${KIND_ES[k]} · ${T.n} de los ${all} con más poder de combate de Global · semana del ${C.v.slice(8, 10)}/${C.v.slice(5, 7)}</small></h3>
<div class="cu-top">
${thin ? `<p class="cu-warn" role="note"><b>Muestra chica:</b> son solo ${T.n} personajes. Tomalo como una pista, no como la regla.</p>` : ''}
${vs}
<div class="cu-g">
${card('cu-stc', `Estigmas${X.gl('stig')} <small>${cur ? 'tilde = ya la tenés subida' : 'las 4 de la build y, atenuadas, las alternativas'}</small>`, stigBody)}
${arc ? card('cu-arcc', `Arcanas${X.gl('arc')} <small>${cur ? 'tilde = tu carta es del mismo set' : 'el set de cada carta'}</small>`, arcBody) : ''}
${gs ? card('cu-gsc', `Piedra sagrada${X.gl('gs')} <small>${cur?.x ? 'tilde = ya la tenés' : 'el efecto y el grado más común'}</small>`, gsBody) : ''}
${msTop.length ? card('cu-msc', `${gi('Icon_Usable_MagicStone_a_001', 24)}Piedras de maná <small>las que más ponen los top</small>`, msBody) : ''}
${skills ? card('cu-skc', `Skills que más suben${X.gl('skills')} <small>nivel de los top${cur ? ' y el tuyo' : ''}</small>`, `<ul class="cu-is cu-sk">${skills}</ul>`) : ''}
</div>
${cur ? '<p class="cu-togo">Tus piezas contra los top, línea por línea: <button type="button" class="linkbtn" data-tab="equipo">en Equipo</button></p>'
: `<h4 class="pj-h4 cu-eh">Qué buscar en cada pieza${X.gl('lineas')} <small>marcas = amplificación · una línea de skill sirve solo si usás esa skill</small></h4>
<ul class="cu-eq">${slots.map(piece).join('')}</ul>`}
${difHtml}
<details class="cu-more"><summary>Todas las líneas, pieza por pieza <small>también las que usan algunos, con el promedio de los top y sus piedras de maná</small></summary><p class="cu-leg">Número = promedio de los top que la llevan${dif.size ? ' · borde punteado = cambia entre Estándar y PvP' : ''} · tachada = línea de skill que no usás (vale 0)${k === 'pvp' ? '' : ' · rojo = PvP'}</p><ul class="cu-st">${rows}</ul></details>
</div>`;
}
/* ---------- Equipo: tus piezas, línea por línea: ✓ bien o ✗ no contra los top de tu build (gearView, en personaje-calc.js) ---------- */
const OPEN = new Set();                        // "Ver ideales" abiertos (sobreviven al repintado de "Es mi elección")
let LAST = null;                               // de qué personaje es OPEN: otro personaje empieza de cero
const skNm = l => gname({ name: l.name, nameEn: SK[l.id]?.[0] });
const okMk = `<i class="gv-mk" aria-hidden="true">${ico('i-check')}</i><span class="sr">bien: </span>`;
const gLine = (p, l, sk) => {
const key = `ln:${p.cs}:${l.id}`, c = l.st === 'no' ? 'no' : l.st ? 'ok' : 'nc';
const mk = c === 'ok' ? okMk : c === 'no' ? '<i class="gv-mk" aria-hidden="true">✗</i><span class="sr">no: </span>' : '';
const act = l.st === 'mine' ? X.estBtn(key, 'no', 'tu elección', 'gv-my', 'Quitar tu elección') : l.st === 'no' ? X.estBtn(key, 'si', 'Es mi elección') : '';
const at = ` ${sk ? 'data-sk' : 'data-line'}="${esc(l.id)}"`, body = `${mk}<span class="gv-nm">${sk ? `${esc(skNm(l))} +${+l.level || 0}${l.dead ? ' <small>no la usás</small>' : ''}` : esc(stLabel(l.id))}</span>${sk ? '' : `<b>${esc(fv(l.value))}</b>`}`;
return c === 'no' ? xRow('li', 'gv-ln no', at, body, act) : `<li class="gv-ln ${c}"${at}>${body}${act}</li>`;
};
const xRow = (tag, cls, at, body, act) => `<${tag} class="${cls} gv-x"${at}><button type="button" class="gv-lb" aria-expanded="false">${body}</button>${act}</${tag}>`;
addEventListener('click', e => { for (const x of document.querySelectorAll('.gv-x.open')) if (!x.contains(e.target)) { x.classList.remove('open'); x.querySelector('.gv-lb').setAttribute('aria-expanded', 'false'); } }, true);
const gIdeal = (p, s) => `<button type="button" class="linkbtn gv-ib" aria-expanded="${OPEN.has(s)}" aria-controls="gv-i-${s}">Ver ideales</button>
<div class="gv-i" id="gv-i-${s}"${OPEN.has(s) ? '' : ' hidden'}><small>Lo que llevan los top en esta pieza</small><ol>${p.ideal.slice(0, 5).map(l => {
const h = (l.sk ? p.sk : p.lines).some(x => x.id === l.id);
return `<li class="${h ? 'ok' : 'nc'}" data-id="${esc(l.id)}">${h ? okMk : '<i class="gv-mk" aria-hidden="true"></i>'}<span class="gv-nm">${esc(l.sk ? skNm(l) : ST[l.id]?.[0] || l.name)}</span><small>${often(l.share)}</small></li>`; }).join('')}</ol></div>`;
export function gear(el, cur, kind) {
if (LAST !== cur.ref.k) { OPEN.clear(); LAST = cur.ref.k; }
const C = X.curated(cur), T = C?.top?.[kind], S = T?.slots, its = cur.x.items || {}, eq = cur.d.equipment || [], by = new Map(eq.map(e => [e.slot, e]));
const myCh = X.mine(cur, kind), G = gearView(cur.d, its, cur.x.boards || {}, T, myCh), gp = new Map(G.pieces.map(p => [p.slot, p]));
const hyb = pvpAll(cur) >= HYB, KN = KIND_ES[kind], wk = /^\d{4}-\d\d-\d\d/.test(C?.v || '') ? `semana del ${C.v.slice(8, 10)}/${C.v.slice(5, 7)}` : '';
const fam = s => (its[s]?.godStoneStat || []).map(g => godFam(g.icon)).filter(Boolean), dupG = fam(1)[0] && fam(1)[0] === fam(2)[0];
const warn = (e, it, p) => {
const W = [], pv = kind === 'pvp' || myCh.has('ms') ? 0 : (it.magicStoneStat || []).filter(m => isPvp(m.id)).length, x = S?.[p.cs], tIt = x?.items?.[0];
if ((it.magicStoneSlotCount || 0) > (it.magicStoneStat || []).length) W.push('<p class="gv-w bad">Ranura de piedra de maná vacía</p>');
if ((it.godStoneSlotCount || 0) > (it.godStoneStat || []).length) W.push('<p class="gv-w bad">Ranura de piedra sagrada vacía</p>');
if (e.slot === 2 && dupG) W.push('<p class="gv-w bad">La misma piedra sagrada que el arma: aplica una sola</p>');
if (pv) W.push(xRow('p', `gv-w pvp${hyb ? ' hyb' : ''}`, ` title="Solo suman contra jugadores${hyb ? `; ${HYB_T}` : ''}"`, `${pv} piedra${pv > 1 ? 's' : ''} PvP`, X.estBtn('ms', 'si', 'Es mi elección')));
if (p.fixed) W.push(`<p class="gv-w fx">Líneas fijas: lo que cambia es la pieza.${tIt && ![tIt.id, ...(tIt.ids || [])].map(String).includes(String(it.id ?? e.id)) ? ` Los top ${KN} llevan <b>${esc(gname(tIt))}</b> (${often(tIt.share)}).` : ''}</p>`);
return W.join('');
};
const card = ([s, lb]) => {
const e = by.get(s), it = its[s], p = gp.get(s);
if (!e) { const w = { lines: [], sk: [], ideal: s < 41 ? gvIdeal(S?.[CSLOT[s]], G.thin) : [] };
return `<li class="gv-p empty"><span class="eq-i"></span><span class="eq-t"><small>${esc(lb)}</small><span class="eq-n">Vacío</span></span>${w.ideal.length ? gIdeal(w, s) : ''}</li>`; }
return `<li class="gv-p ${X.gcls(e.grade)}" data-slot="${s}" id="gv-${s}">
<button type="button" class="gv-ph" aria-haspopup="dialog"><span class="eq-i">${X.img(e.icon, 44)}${e.enchant ? `<b class="eq-en">+${e.enchant}</b>` : ''}</span>
<span class="eq-t"><small>${esc(lb)}${it?.level ? ` · nivel ${it.level}` : ''}</small><span class="eq-n">${esc(gname(e))}</span></span></button>
${p ? `<ul class="gv-l">${p.lines.map(l => gLine(p, l)).join('')}${p.sk.map(l => gLine(p, l, true)).join('')}</ul>${warn(e, it, p)}${p.ideal.length ? gIdeal(p, s) : ''}` : ''}</li>`;
};
const why = String(C?.reasons?.top?.[kind] || `muestra chica (${T?.n || 0})`).replace(NOBRAND, '');
const src = !C ? 'No pude traer lo que usan los top: tus líneas, sin comparar.' : G.none ? `Sin muestra para tu build (${why}): tus líneas, sin comparar.`
: `Comparado con los top de tu build (muestra de ${T.n}${wk ? `, ${wk}` : ''})${G.thin ? '. Son pocos: cuenta solo lo que llevan casi todos' : ''}.`;
const g = C && kindGuess(cur.d, its, C.method?.kindSets).kind, pre = g && g !== kind && kind !== 'support' ? `<p class="cu-warn" role="note">Lo que tenés puesto parece ${KIND_ES[g]}: la ficha muestra solo el equipo puesto, así que contra ${KN} puede salir con muchas ✗.</p>` : '';
el.innerHTML = `<section class="pj-sec gv" aria-labelledby="eq-h"><div class="gv-sum"><h3 id="eq-h" class="pj-h">Equipo</h3><p class="gv-src">${esc(src)}</p></div>${pre}
${X.SLOTS.map(([t, l]) => `<h4 class="pj-h4">${t}</h4><ul class="gv-g">${l.map(card).join('')}</ul>`).join('')}${X.petHtml?.() || ''}</section>`;
el.onclick = e => {
const lb = e.target.closest('.gv-lb');
if (lb) { e.stopPropagation(); lb.setAttribute('aria-expanded', String(lb.parentElement.classList.toggle('open'))); return; }
const b = e.target.closest('.gv-ib');
if (b || e.target.closest('.gv-i')) e.stopPropagation();
if (!b) return;
const pn = $('#' + b.getAttribute('aria-controls'), el), o = pn.hidden, s = +pn.id.slice(5);
pn.hidden = !o; b.setAttribute('aria-expanded', String(o));
o ? OPEN.add(s) : OPEN.delete(s);
};
}
function recB(r) {
if (!BUILD_OK.test(r.url || '')) return null;
const u = new URL(r.url), id = +u.searchParams.get('build-id'), slug = decodeURIComponent(u.pathname.split('/').pop());
return id && /^[A-Za-z0-9_-]+$/.test(slug) ? { id, slug, name: r.name, likes: r.likes, tags: r.tags || [], url: r.url } : null;
}
const progOf = (C, k) => (C.recommended?.progresion || []).filter(r => !r.kind || r.kind === k);
function recHtml(C, k) {
const row = (r, i) => {
const m = r.parts?.match != null ? pct(r.parts.match) : null;
return `<li class="cu-r"><b class="cu-sc" style="--q:${+r.score || 0}%" title="Puntaje de 0 a 100: cuánto se parece a los top, votos, si es reciente y si coincide con las guías"><span>${esc(r.score)}</span></b>
<span class="cu-rm"><b class="bl-nm">${esc(r.name || 'Build sin nombre')}</b><small>${X.nf(r.likes)} votos${r.updatedAt ? ` · ${ago(r.updatedAt)}` : ''}</small>
${m != null ? `<span class="cu-mt" title="${esc(r.why || '')}"><span class="sh" role="img" aria-label="Se parece ${m} % a los top${r.comparedWith === 'all' ? ' de la clase' : ''}"><i style="--q:${m}%"></i></span><small>${m} % como los top${r.comparedWith === 'all' ? ' de la clase' : ''}</small>${(r.tags || []).includes('beginner-friendly') ? '<em class="tag gold">Para empezar</em>' : ''}</span>` : `<small class="cu-rw">${esc(r.why || '')}</small>`}</span>
${recB(r) ? `<button type="button" class="btn" data-rver="${i}">Ver build</button>` : ''}</li>`;
};
const main = C.recommended?.[k] || [], prog = progOf(C, k);
return `<h3 class="pj-h">Builds recomendadas <small>${KIND_ES[k]} · de más a menos puntaje</small></h3>
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
R = [...(C.recommended?.[K] || []), ...progOf(C, K)];
repaint = cur ? null : paintCur;
el._paint = paintCur;   // tu estilo (personaje.js): repinta en el lugar, sin volver a cargar
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
<span class="bl-m"><b class="bl-nm">${esc(b.name || 'Build sin nombre')}</b><small>${b.updatedAt ? `actualizada ${ago(b.updatedAt)}` : 'build de jugadores'}</small>
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
const attrib = b => `<p class="bd-src"><em class="tag gold">De jugadores</em> Build pública${b.likes != null ? ` · ${X.nf(b.likes)} votos` : ''} · <a href="${esc(BUILD_OK.test(b.url || '') ? b.url : '#')}" target="_blank" rel="noopener noreferrer">Ver la original${ico('i-ext')}</a></p>`;
function showBuild(b) {
const box = document.createElement('div');
box.className = 'bd';
box.innerHTML = `${attrib(b)}<div class="bd-b">${loading('Cargando la build…')}</div>`;
modal({ title: b.name || 'Build', node: box, cls: 'pj-bd' });
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
<h3 class="pj-h">Equipo</h3><ul class="bd-eq">${eq.map(([s, e]) => `<li class="${X.gcls(e.grade)}"><span class="eq-i">${X.img(e.icon, 40)}${+e.lvl ? `<b class="eq-en">+${+e.lvl}</b>` : ''}</span>
<span class="bd-t"><small>${s[1]} · <span class="eq-gr">${esc(X.GRADE[e.grade] || e.grade)}</span></small><b>${esc(e.name)}</b>
${e.lines.length ? `<ul class="ln">${e.lines.map(lineLi).join('')}</ul>` : ''}
${e.stones.length ? `<small class="bd-ms">Piedras de maná: ${e.stones.map(x => `${esc(stLabel(x.id))} +${esc(fmt(x.id, x.v))}`).join(' · ')}</small>` : ''}</span></li>`).join('') || '<li class="pj-empty">Sin equipo cargado.</li>'}</ul>
${d.arcana.length ? `<h3 class="pj-h">Arcanas</h3><ul class="bd-ar bd-arc">${d.arcana.map(a => `<li>${X.img(a.icon, 36)}<b class="${X.gcls(a.grade)}">${esc(a.name)}${+a.lvl ? ` +${+a.lvl}` : ''}</b><small>${a.skills.map(s => `${esc(s.name || `Skill ${s.id}`)} +${+s.lvl || 0}`).join(' · ') || 'sin skills'}</small></li>`).join('')}</ul>` : ''}
<h3 class="pj-h">Skills y estigmas ${d.skills ? `<small>${esc(d.skills.name || '')}</small>` : ''}</h3>
${sk.length ? SKCAT.map(([c, t]) => { const l = sk.filter(s => s.cat === c).sort((a, b) => (b.slot != null) - (a.slot != null)); return l.length ? `<h4 class="pj-h4">${t}</h4><ul class="sk-g">${l.map(s => `<li class="sk2${c !== 'passive' && s.slot == null ? ' off' : ''}">${skIcon(s.id, 28)}<span>${esc(s.name || `Skill ${s.id}`)}</span><b>Nv ${+s.lvl || 0}</b></li>`).join('')}</ul>` : ''; }).join('')
+ '<p class="pj-note">Atenuadas: subidas pero sin poner en la barra. Las especializaciones no se muestran: la ficha oficial no las tiene.</p>' : '<p class="pj-empty">Esta build no trae skills.</p>'}
<h3 class="pj-h">Daevanion</h3>
${d.daevanion ? `<ul class="bd-ar">${Object.entries(d.daevanion.boards).map(([id, l]) => `<li><b>${DAE[(+id % 10) - 1] || `Tablero ${esc(id)}`}</b><small>${+l.length || 0} nodos</small></li>`).join('')}</ul>` : '<p class="pj-empty">Esta build no trae Daevanion.</p>'}`;
}
/* ---------- detalle de una pieza: calidad de cada línea y si la usan los top de tu build ---------- */
const rng = r => { const f = v => r.s === 100 ? num(r.pctv ? v / 100 : Math.round(v / 100)) : num(v); return `${f(r.min)}–${f(r.max)}${r.pctv ? ' %' : ''}`; };
export async function itemBody(it, e, cur, kind) {
const skills = new Map((cur.d.skills || []).map(s => [String(s.id), s])), parts = skillParts(cur.d, cur.x?.items || {}, cur.x?.boards || {}), use = id => useful(skills.get(String(id)), parts.get(String(id)));
const C = X.curated(cur), T = C?.top?.[kind]?.slots?.[cslot(e.slot)];
let pool = null;
if (it.subStatRandom && (it.subStats || []).length) try { pool = (await getLines(it.id)).items?.[it.id]?.lines; } catch { /* sin rango */ }
const top = new Map((T?.lines || []).map(l => [l.id, l]));
const li = (n, v, extra = '') => `<li><span>${esc(n)}</span><b>${v}</b>${extra}</li>`;
const stN = s => ST[String(s.id || '').toLowerCase()]?.[0] || s.name;
const main = (it.mainStats || []).map(s => li(stN(s), `${esc(s.value)}${+s.extra ? ` <em>+${esc(s.extra)}</em>` : ''}`)).join('');
const maxed = [];
const lines = (it.subStats || []).map(s => {
const id = String(s.id).toLowerCase(), r = pool && rollOf({ id, value: s.value }, pool), t0 = top.get(id), t = t0 && (t0.tier === 'Best' || t0.tier === 'Good') ? t0 : null;
if (r && !r.out && r.q >= 0.95 && t0?.avg != null && parseFloat(String(s.value).replace(',', '.')) < t0.avg) maxed.push(stN(s));
return `<li class="ln2" data-line="${esc(id)}"><span class="ln-n">${esc(stN(s))}${t ? ` <em class="tag gold" title="La usan ${often(t.share)} los top ${KIND_ES[kind]} en esta pieza${t.avg != null ? `; los que la llevan sacaron ${n1(t.avg)}${unit(id)} de media` : ''}">top${t.avg != null ? ` ${n1(t.avg)}${unit(id)}` : ''}</em>` : ''}</span><b>${esc(fv(s.value))}</b>
${r && !r.out ? `<span class="qb" role="img" aria-label="Salió al ${pct(r.q)} % del rango (${rng(r)})" title="Rango en Global: ${rng(r)}"><i style="--q:${pct(r.q)}%"></i></span><small class="q-p">${pct(r.q)} %</small>` : '<small class="q-na">—</small>'}</li>`;
}).join('');
const topSk = new Map((T?.skillLines || []).map(l => [String(l.id), l]));
const topTag = t => t && t.share >= 0.25 ? ` <em class="tag gold" title="La llevan ${often(t.share)} los top ${KIND_ES[kind]} en esta pieza">top</em>` : '';
const sk = (it.subSkills || []).map(s => li(`${s.name} +${s.level}`, use(s.id) ? 'la usás' : '<span class="bad">no la usás</span>', topTag(topSk.get(String(s.id))))).join('');
const GT = C?.top?.[kind]?.theostones?.list || [], gTop = new Map(GT.map(x => [x.f, x])), gMine = new Set((it.godStoneStat || []).map(g => godFam(g.icon)));
const gEmpty = (it.godStoneSlotCount || 0) > (it.godStoneStat || []).length, gWant = it.godStoneSlotCount ? GT.filter(x => !gMine.has(x.f)).slice(0, 3) : [];
const msTop = new Map((T?.stones || []).map(x => [x.id, x]));
const msHyb = pvpAll(cur) >= HYB, msOk = msHyb || !!X.mine?.(cur, kind).has('ms'), msPv = kind !== 'pvp' && (it.magicStoneStat || []).some(s => isPvp(s.id));
const msTag = s => {
const id = String(s.id).toLowerCase(), t = msTop.get(id);
if (isPvp(id) && kind !== 'pvp') return `<em class="tag${msOk ? '' : ' bad'}" title="Piedra PvP: solo suma contra jugadores${msHyb ? `; ${HYB_T}` : ''}">PvP</em>`;
if (!(t?.share >= MS_TOP)) return '';
const tt = `${pct(t.share)} de cada 100 ranuras de los top ${KIND_ES[kind]} en esta pieza${t.grade ? `, casi siempre ${grF(t.grade).toLowerCase()}` : ''}`;
const v = parseFloat(String(s.value ?? '').replace(/[^\d.,-]/g, '').replace(',', '.')), low = t.grade && s.grade && ((GR_N[s.grade] || 0) < (GR_N[t.grade] || 0) || (s.grade === t.grade && t.v && v < t.v));
return `<em class="tag gold" title="${esc(tt)}">${t.grade ? `top: ${esc(grF(t.grade))}${t.v ? ` +${n1(t.v)}${unit(id)}` : ''}` : 'tipo top'}</em>${low ? `<em class="tag ms-low">la tuya: ${esc(grF(s.grade))}</em>` : ''}`;
};
const fixed = it.subStatRandom === false && (it.subStats || []).length, tIt = T?.items?.[0];
return `<p class="tip-m">${[it.categoryName === 'Pulsera' ? 'Brazalete' : it.categoryName, it.level && `nivel ${it.level}`, it.maxEnchantLevel && `encantamiento +${it.enchantLevel ?? e.enchant ?? 0} de ${it.maxEnchantLevel}`, it.maxExceedEnchantLevel && `amplificación +${e.exceed || 0} de ${it.maxExceedEnchantLevel}${T?.exceed >= 0.5 ? ` (los top +${n1(T.exceed)})` : ''}`].filter(Boolean).map(esc).join(' · ')}</p>
${main ? `<h4>Stats</h4><ul>${main}</ul>` : ''}
${lines ? `<h4>Líneas <small>barra = qué tan alto salió</small></h4><ul class="tip-ln">${lines}</ul>` : ''}
${maxed.length ? `<p class="tip-want tip-max">${esc(maxed.length > 1 ? maxed.slice(0, -1).join(', ') + ' y ' + maxed.at(-1) : maxed[0])}: ya ${maxed.length > 1 ? 'salieron' : 'salió'} al tope de esta pieza. El promedio de los top es más alto porque llevan piezas de más nivel.</p>` : ''}
${fixed ? `<p class="tip-want">Líneas fijas: lo que cambia es la pieza.${tIt && ![tIt.id, ...(tIt.ids || [])].map(String).includes(String(it.id ?? e.id)) ? ` Los top ${KIND_ES[kind]} llevan <b>${esc(gname(tIt))}</b> (${often(tIt.share)}).` : ''}</p>` : ''}
${(it.surpassStats || []).length ? `<h4>Breakthrough <small>solo contra jugadores</small></h4><ul class="tip-bt">${it.surpassStats.map(s => li(stN(s), esc(fv(s.value)))).join('')}</ul>` : ''}
${sk ? `<h4>Líneas de skill</h4><ul>${sk}</ul>` : ''}
${(it.magicStoneStat || []).length ? `<h4>Piedras de maná</h4><ul class="tip-ms">${it.magicStoneStat.map(s => li(stN(s), esc(s.value), msTag(s))).join('')}</ul>` : ''}
${msPv && msHyb ? `<p class="tip-want tip-hyb">Piedras PvP: solo suman contra jugadores; ${HYB_T}.</p>` : ''}
${it.magicStoneSlotCount && msTop.size ? `<p class="tip-want">Piedras que más ponen los top ${KIND_ES[kind]} acá, de cada 100 ranuras: ${[...msTop.values()].slice(0, 3).map(x => `<b>${esc(x.name)}</b> (${pct(x.share)})`).join(', ')}.</p>` : ''}
${(it.godStoneStat || []).map(g => `<h4>Piedra sagrada${gTop.has(godFam(g.icon)) ? ` <em class="tag gold" title="La llevan ${often(gTop.get(godFam(g.icon)).share)} los top ${KIND_ES[kind]}">top</em>` : ''}</h4><p class="tip-gs ${X.gcls(g.grade)}"><b>${esc(g.name)}</b>${esc(g.desc || '')}</p>`).join('')}
${gWant.length || gEmpty ? `<p class="tip-want">${gEmpty ? 'La ranura de piedra sagrada está vacía. ' : ''}${gWant.length ? `Piedra sagrada que llevan los top ${KIND_ES[kind]}: ${gWant.map(x => `<b>${esc(godName(x.f, x.stoneEn))}</b> (${x.k != null ? `${x.k} de ${x.of}` : often(x.share)})`).join(', ')}.` : ''}</p>` : ''}
${(it.sources || []).length ? `<p class="tip-from">Sale de: ${esc(it.sources.join(', '))}</p>` : ''}`;
}
function how() {
modal({ title: 'Cómo elegimos', cls: 'pj-how', html: `
<p><b>Lo que usan los mejores.</b> Una vez por semana miramos la ficha pública oficial de los 30 personajes con más poder de combate de cada clase en Global y los separamos en Estándar, Healer y PvP por lo que llevan puesto (amuleto feroz, piedras y líneas de PvP, estigmas de curación). Si un tipo tiene menos de 3, no lo mostramos: decimos por qué en vez de rellenar; con menos de 8 avisamos que la muestra es chica.</p>
<p><b>"Los mejores" = los de más poder de combate</b> del ranking público de Global. No es un ranking de daño ni de mazmorras terminadas: en Global no hay uno público. Los "PvP" son top que invierten en PvP, no especialistas. "Top típico" es la mediana: la mitad tiene más y la mitad menos.</p>
<p><b>Lo que comparamos con lo tuyo.</b> El valor de cada línea contra el promedio de los top que la llevan (con mejor equipo, sus rangos son más altos); la amplificación y el encantamiento de cada pieza contra los de ellos (la mediana); Estándar contra PvP, solo lo que pasa una prueba estadística exacta (lo demás puede ser casualidad: con 10 o 20 personajes por lado, uno solo no alcanza).</p>
<p><b>Tu elección.</b> La deducimos de lo que ya subiste distinto a los top (una estigma a 10 o más, una Arcana de otro set a +3, una piedra sagrada que ellos no usan) y no te la cambiamos; la marcás o la sacás con «Es mi elección» y «Sugerime lo de los top».</p>
<p><b>Piedras de maná.</b> De cada 100 ranuras de una pieza en los top, cuántas llevan cada piedra; guardamos las 6 más puestas con su grado y valor más comunes (las semanas anteriores no los traen). Las PvP solo suman contra jugadores.</p>
<p><b>Imprescindible</b> = la lleva al menos la mitad de las piezas de los top; <b>Muy usada</b>, una de cada cuatro; <b>A veces</b>, una de cada diez. "Top" en el detalle de una pieza: solo las imprescindibles y muy usadas. La barrita dice cuántos: "casi todos" (90 % o más), "la mayoría" (70 %), "más de la mitad" (55 %), "la mitad" (40 %), "algunos" (20 %).</p>
<p><b>Piedras sagradas.</b> Contamos por efecto (Sellado, Parálisis…) cuántos top lo llevan en el arma o la secundaria, sin importar el grado; dos con el mismo efecto en un personaje cuentan una vez, porque el juego aplica uno solo.</p>
<p><b>Recomendadas.</b> Builds públicas de jugadores con un puntaje de 0 a 100: 45 % cuánto se parecen a los top de su tipo, 20 % votos, 20 % si son posteriores al último parche y 15 % si coinciden con las guías. Menos de 50 no entra.</p>
<p><b>Calidad de una línea</b> (en el detalle de cada pieza): dónde cayó tu valor dentro del rango posible de ese ítem. 100 % = salió al tope. Los porcentajes de la ficha vienen redondeados a un decimal: puede haber ±3 puntos.</p>
<p>La ficha oficial muestra solo el preset activo. Las fuentes, en "Fuentes y créditos".</p>` });
}
