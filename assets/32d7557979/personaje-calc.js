export const GATES = [
{ il: 700, name: 'Expedición 1★', ok: 0 },
{ il: 1400, name: 'Expedición 2★', ok: 0 },
{ il: 1600, name: 'Trascendencia 1', ok: 0 },
{ il: 1900, name: 'Trascendencia 2', ok: 0 },
{ il: 2100, name: 'Expedición 3★', ok: 0 },
{ il: 2200, name: 'Trascendencia 3', ok: 0 },
{ il: 2500, name: 'Trascendencia 4', ok: 0 },
{ il: 2600, name: 'Cueva de Krao y Draupnir difícil', short: 'Krao y Draupnir difícil', ok: 1 },
{ il: 2700, name: 'Cañón de Urugugu e Isla Aérea de Vakron difícil', short: 'Urugugu y Vakron difícil', ok: 1 },
{ il: 2800, name: 'Templo de Fuego y Caverna del Cuerno Feroz difícil · Forja Abismal: Ludra (fácil y normal)', short: 'Templo de Fuego difícil y Ludra fácil', in: 'Ludra fácil', ok: 1 },
{ il: 3000, name: 'Forja Abismal: Ludra difícil', short: 'Ludra difícil', ok: 1 },
];
export function gateOf(il) {
const met = GATES.filter(g => il >= g.il), next = GATES.find(g => il < g.il) || null;
return { cur: met.at(-1) || null, next, need: next ? next.il - il : 0, prev: met.at(-1)?.il ?? 0 };
}
const MS = { Common: 1, Rare: 2, Epic: 2, Legend: 3, Mythic: 3, Unique: 4, Special: 6 };
const GS = { Common: 1, Rare: 3, Epic: 5, Legend: 5, Mythic: 9, Unique: 10, Special: 13 };
export const NODE_COST = { Common: 1, Rare: 2, Legend: 3, Unique: 4 };
export const isArcana = slot => slot >= 41 && slot <= 45;
export const LEVEL_CAP = 45;
export const godFam = icon => String(icon || '').match(/Godstone\w*_(\d{3})(?:\.png)?$/)?.[1] || null;
export const GOD = {
'001': ['Ceguera', 'Blind'], '003': ['Sellado', 'Seal'], '004': ['Atadura', 'Root'], '005': ['Aturdimiento', 'Stun'], '006': ['Parálisis', 'Paralyze'],
'007': ['−50 % vel. de movimiento', '−50% Move Speed'], '008': ['−50 % vel. de combate', '−50% Combat Speed'], '009': ['Envenenamiento', 'Poison'], '010': ['Sangrado', 'Bleed'],
'011': ['Fuego a un objetivo', 'Fire, single target'], '012': ['Agua a un objetivo', 'Water, single target'], '013': ['Tierra a un objetivo', 'Earth, single target'], '014': ['Viento a un objetivo', 'Wind, single target'],
'015': ['Fuego de área', 'Fire AoE'], '016': ['Agua de área', 'Water AoE'], '017': ['Tierra de área', 'Earth AoE'], '018': ['Viento de área', 'Wind AoE'],
};
export const GR_F = { Common: 'Común', Rare: 'Rara', Epic: 'Épica', Legend: 'Legendaria', Unique: 'Única', Mythic: 'Mítica', Special: 'Especial' };
export const GR_N = { Common: 1, Rare: 2, Legend: 3, Unique: 4, Epic: 5, Mythic: 6, Special: 7 };
const nodesOf = b => (b?.nodeList || []).filter(n => n.type !== 'None');
export function ilvlOf(d, items, boards) {
const eq = d.equipment || [], p = { equipo: 0, amplif: 0, piedras: 0, arcana: 0, daevanion: 0 };
for (const e of eq) {
const it = items[e.slot];
if (!it) return null;
p[isArcana(e.slot) ? 'arcana' : 'equipo'] += (it.level || 0) + (it.enchantLevel ?? e.enchant ?? 0);
p.amplif += 5 * (e.exceed || 0);
p.piedras += (it.magicStoneStat || []).reduce((a, m) => a + (MS[m.grade] || 0), 0) + (it.godStoneStat || []).reduce((a, g) => a + (GS[g.grade] || 0), 0);
}
for (const b of d.daevanion || []) {
if (!boards[b.id]) return null;
for (const n of nodesOf(boards[b.id])) if (n.open) p.daevanion += NODE_COST[n.grade] || 0;
}
return { total: Object.values(p).reduce((a, b) => a + b, 0), parts: p };
}
export const OFFBAR = new Set(['11260000', '12260000', '13260000', '14260000', '15240000', '16200000', '17240000', '18200000']);
const inBar = s => !!s?.acquired && (s.category === 'Passive' || !!s.equipped || OFFBAR.has(String(s.id)));
export const useful = (s, x) => inBar(s) && (s.category === 'Passive' ? s.level : x?.base ?? s.level) > 1;
export const NORMAL_CAP = 14, BASE_CAP = 10, DAE_CAP = 4, STIG_CAP = 20;
export const SPEC = { Active: [8, 12, 16], Dp: [5, 10, 15, 20] };
export function skillParts(d, items, boards) {
const byName = new Map((d.skills || []).map(s => [s.name, s])), out = new Map();
const get = id => { let x = out.get(String(id)); if (!x) out.set(String(id), x = { dae: 0, daeMax: 0, daeMiss: [], gear: 0, arc: 0, src: [] }); return x; };
for (const b of d.daevanion || []) for (const n of nodesOf(boards[b.id])) {
if (n.type !== 'SkillLevel') continue;
for (const e of n.effectList || []) {
const m = String(e.desc || '').match(/^(.+) \+(\d+)$/), s = m && byName.get(m[1]);
if (!s) continue;
const x = get(s.id);
x.daeMax += +m[2];
if (n.open) x.dae += +m[2]; else x.daeMiss.push(b.name);
}
}
for (const [slot, it] of Object.entries(items)) for (const k of it?.subSkills || []) {
const x = get(k.id), a = isArcana(+slot);
x[a ? 'arc' : 'gear'] += k.level || 0;
x.src.push({ name: it.name, n: k.level || 0, arc: a });
}
for (const s of d.skills || []) { const x = get(s.id); x.base = Math.max(0, (s.level || 0) - x.dae - x.gear - x.arc); }
return out;
}
export function skillHint(s, x) {
if (s.category === 'Dp') return !s.equipped ? '' : s.level >= STIG_CAP ? 'Al tope: 20' : `Con Fragmentos de Estigma hasta 20 (${STIG_CAP - (s.level || 0) > 1 ? 'te faltan' : 'te falta'} ${STIG_CAP - (s.level || 0)})`;
if (!x) return '';
if (x.base < BASE_CAP) return `Base ${x.base} de ${BASE_CAP} con puntos de skill: se puede hasta +${BASE_CAP - x.base}`;
if (x.dae < x.daeMax) return `${x.daeMax - x.dae} con Daevanion: ${[...new Set(x.daeMiss)].join(', ')}`;
return 'Lo que sigue sale de líneas de Arcana y de equipo';
}
export const topLevels = (T, k) => {
const own = T?.[k]?.skills?.length, src = own ? T[k] : T?.all;
const m = new Map((src?.skills || []).map(s => [String(s.id), s.lvl]));
m.amp = Object.fromEntries(Object.entries(CSLOT).map(([p, s]) => [p, src?.slots?.[s]?.exceed]).filter(x => x[1] != null));
const st = own || k !== 'support' ? src?.stigmas || [] : [];
m.stig = src?.stigmaAlt ? st : st.slice(0, 4); m.stigAlt = src?.stigmaAlt || st.slice(4);
m.items = Object.fromEntries(Object.entries(CSLOT).map(([p, s]) => [p, src?.slots?.[s]?.items]).filter(x => x[1]?.length));
m.il = src?.ilvlMedian || 0;
m.cls = !own;   // sin muestra de este tipo: lo de arriba es de toda la clase (Healer: pegan, no curan)
m.gods = src?.theostones?.list || []; m.godPair = src?.theostones?.pairs?.[0] || null;
m.ms = Object.fromEntries(Object.entries(CSLOT).map(([p, s]) => [p, src?.slots?.[s]?.stones]).filter(x => x[1]?.length));
m.dae = src?.daevanion || null;
m.arc = src?.arcana || null;   // el set de cada carta en los top (estilo: tu carta del otro set)
return m;
};
export const CSLOT = { 1: 'weapon', 2: 'offhand', 3: 'helmet', 4: 'shoulder', 5: 'torso', 6: 'pants', 7: 'gloves', 8: 'boots', 19: 'cape', 10: 'necklace', 11: 'earring', 12: 'earring', 13: 'ring', 14: 'ring', 15: 'bracelet', 16: 'bracelet', 17: 'belt', 22: 'amulet', 23: 'rune', 24: 'rune' };
export const SK_MIN = 0.2;
export function rollOf(line, pool) {
const r = (pool || []).find(p => p[0] === line.id);
const v = parseFloat(String(line.value ?? '').replace(',', '.'));
if (!r || !isFinite(v)) return null;
const [, min, max] = r, dist = x => x < min ? min - x : x > max ? x - max : 0;
const s = dist(v * 100) < dist(v) ? 100 : 1, x = v * s;
const out = dist(x) > Math.max(6, 0.15 * (max - min));
return { q: max > min ? Math.max(0, Math.min(1, (x - min) / (max - min))) : 1, min, max, s, out, pctv: /%/.test(String(line.value)) };
}
export const GV_MIN = 0.9;
export const gvWant = (x, thin) => (x?.lines || []).filter(l => (l.tier === 'Best' || (l.tier === 'Good' && l.share >= 0.5)) && l.share >= (thin ? GV_MIN : 0)).sort((a, b) => b.share - a.share);
export function gearView(d, items = {}, boards = {}, T = null, pools = {}, mine = new Set()) {
const S = T?.slots || null, thin = !!S && (T.confidence === 'baja' || T.n < 8), min = thin ? GV_MIN : 0;
const parts = skillParts(d, items, boards), sks = new Map((d.skills || []).map(s => [String(s.id), s])), uses = id => useful(sks.get(String(id)), parts.get(String(id)));
const out = [];
let ok = 0, of = 0;
for (const e of d.equipment || []) {
const it = items[e.slot], cs = CSLOT[e.slot] || ARC_C[e.slot - 41];
if (!it || !cs) continue;
const x = S?.[cs], want = (x?.lines || []).filter(l => (l.tier === 'Best' || l.tier === 'Good') && l.share >= min);
const fixed = it.subStatRandom === false && !!(it.subStats || []).length, counted = !!S && !fixed && e.slot < 41 && !!x?.lines?.length;
const lines = (it.subStats || []).map(s => {
const id = String(s.id).toLowerCase(), t = (x?.lines || []).find(l => l.id === id), r0 = rollOf({ id, value: s.value }, pools[it.id]?.lines), r = r0 && !r0.out ? r0 : null;
const few = thin && t && (t.tier === 'Best' || t.tier === 'Good') && !want.includes(t);
return { id, value: s.value, st: !counted ? 'own' : mine.has(`ln:${cs}:${id}`) ? 'mine' : want.includes(t) ? 'ok' : few ? 'few' : 'own', share: t?.share ?? null, k: t?.k ?? null, n: t?.of ?? null, q: r ? r.q : null, r };
});
const sk = (it.subSkills || []).map(s => ({ id: String(s.id), name: s.name, level: s.level, st: uses(s.id) ? 'use' : 'dead' }));
const has = new Set(lines.map(l => l.id)), hasSk = new Set(sk.map(l => l.id));
const aGusto = lines.some(l => l.st === 'mine') && !lines.some(l => l.st === 'own') && !sk.some(l => l.st === 'dead');
const room = aGusto ? 0 : Math.min(3, lines.filter(l => l.st === 'own').length + sk.filter(l => l.st === 'dead').length + Math.max(0, (it.subStatCount || 0) - lines.length - sk.length));
const miss = counted ? gvWant(x, thin).filter(l => !has.has(l.id)).slice(0, room) : [];
const skMiss = S && !fixed ? (x?.skillLines || []).filter(l => l.share >= Math.max(SK_MIN, min) && !hasSk.has(String(l.id)) && uses(l.id)).sort((a, b) => b.share - a.share).slice(0, room - miss.length) : [];
const n = lines.filter(l => l.st === 'ok').length, m = lines.filter(l => l.st !== 'mine' && l.st !== 'few').length;
if (counted) { ok += n; of += m; }
out.push({ slot: e.slot, cs, lines, sk, miss, skMiss, fixed, counted, aGusto, ok: counted ? n : null, of: counted ? m : null });
}
return { pieces: out, ok: S ? ok : null, of: S ? of : null, thin, none: !S };
}
const FIERCE = new Set(['311030002', '311040002', '311050002']);
export function kindGuess(d, items, sets = {}) {
const sup = new Set((sets.support || []).map(x => String(x.id))), pvpS = new Set((sets.pvp || []).map(x => String(x.id)));
const core = (d.skills || []).filter(s => s.category === 'Dp' && s.equipped && s.level > 0).map(s => String(s.id)); // como coreOf del server: subidas y puestas
const its = Object.values(items || {});
const stones = pvpStones(items);
const lines = its.flatMap(it => [...(it.subStats || []), ...(it.surpassStats || [])].map(m => String(m.id))).filter(id => /^pvp/i.test(id)).length;
const az = (d.daevanion || [])[5]?.open ?? 0;
const sig = [];
let pvp = 0;
if ((d.equipment || []).some(e => FIERCE.has(String(e.id)))) { pvp += 2; sig.push('Amuleto de batalla feroz'); }
if (stones >= 8) { pvp++; sig.push(`${stones} piedras de maná de PvP`); }
if (lines >= 2) { pvp += lines >= 10 ? 2 : 1; sig.push(`${lines} líneas de PvP en el equipo`); }
if (az >= 90) { pvp++; sig.push(`Azphel con ${az} nodos`); }
const ps = core.filter(id => pvpS.has(id)).length, ss = core.filter(id => sup.has(id)).length;
if (ps) { pvp++; sig.push('una estigma de PvP subida'); }
if (pvp >= 2) return { kind: 'pvp', sig };
if (sup.size && ss >= Math.min(2, sup.size)) return { kind: 'support', sig: [`${ss} estigmas de curación subidas`] };
return { kind: 'pve', sig: sig.length ? [...sig, 'no alcanzan para PvP'] : [] };
}
export const pvpStones = items => Object.values(items || {}).flatMap(it => (it?.magicStoneStat || []).map(m => String(m.id))).filter(id => /^pvp/i.test(id)).length;
export const hybrid = (d, items) => { const g = kindGuess(d, items); return g.kind === 'pve' && (g.sig.length > 0 || pvpStones(items) >= 3); };
const ARC_C = ['chalice', 'parchment', 'compass', 'bell', 'mirror'];
export function estilo(d, items = {}, top = new Map()) {
const out = new Set(), st = top.stig || [], tieK = st.length === 4 ? st[3].k : undefined;
const main = new Set([...st, ...(top.stigAlt || []).filter(x => tieK != null && x.k === tieK)].map(x => String(x.id)));
if (main.size || top.size) for (const s of d.skills || []) if (s.category === 'Dp' && s.equipped && s.level >= 10 && !main.has(String(s.id))) out.add('stig:' + s.id);
const G = top.gods || [];
if (G.length) for (const sl of [1, 2]) for (const g of items[sl]?.godStoneStat || []) { const f = godFam(g.icon); if (f && !G.some(x => x.f === f)) out.add('gs:' + f); }
ARC_C.forEach((c, i) => {
const e = (d.equipment || []).find(x => x.slot === 41 + i), t = top.arc?.[c]?.[0]?.set?.[0], my = /PveSet/.test(e?.icon || '') ? 'V' : /DefenceSet/.test(e?.icon || '') ? 'M' : null;
if (t && my && my !== t && (e.enchant || 0) >= 3) out.add('arc:' + c);
});
const g = pvpStones(items) && kindGuess(d, items);
if (g && g.kind === 'pve' && g.sig.length) out.add('ms');
return out;
}
const isPaso = x => String(x).startsWith('paso:'), EK = ['pve', 'pvp', 'support'];
export const estOf = (e, k) => e[k] || { si: e.si.filter(x => !isPaso(x)), no: e.no.filter(x => !isPaso(x)) };
const split = e => { for (const x of EK) e[x] = estOf(e, x); for (const l of ['si', 'no']) e[l] = e[l].filter(isPaso); };
const tidy = e => { for (const x of EK) if (e[x] && !e[x].si.length && !e[x].no.length && !e[x].pin) delete e[x]; return e; };
export function estSet(e, key, v, k) {
if (!isPaso(key)) split(e);
const b = isPaso(key) ? e : e[k];
for (const l of ['si', 'no']) b[l] = b[l].filter(x => x !== key);
if (v) b[v].push(key);
if (isPaso(key) && v === 'no') for (const x of EK) if (e[x]?.pin === key.slice(5)) delete e[x].pin;
return tidy(e);
}
export function estPin(e, id, k) {
split(e);
if (id) e[k].pin = id; else delete e[k].pin;
return tidy(e);
}
export const pinFirst = (steps, id) => { const i = id ? steps.findIndex(s => s.id === id) : -1; return i < 0 ? steps : [steps[i], ...steps.filter((_, j) => j !== i)]; };
export const estEmpty = e => !e.si.length && !e.no.length && !EK.some(x => e[x]);
const AMP = [[8.8, 0.88], [16.9, 1.69], [32.1, 3.75], [51.4, 6.86], [87.1, 13.07]];
const WPN = [1, 2], ACC = [10, 11, 12, 13, 14], BRAC = [15, 16], ARMOR = [3, 4, 5, 6, 7, 8, 19];
const LBL = { 1: 'arma', 2: 'secundaria', 3: 'casco', 4: 'hombreras', 5: 'pechera', 6: 'piernas', 7: 'guantes', 8: 'botas', 19: 'capa', 10: 'collar', 11: 'aro', 12: 'aro', 13: 'anillo', 14: 'anillo', 15: 'brazalete', 16: 'brazalete', 17: 'cinturón', 22: 'amuleto', 23: 'runa', 24: 'runa' };
const fmt = n => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n);
const pl = (n, w, p = w + 's') => `${n} ${n === 1 ? w : p}`;   // "1 nivel", "2 niveles"
const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a.at(-1) : a[0] || '';
const PL = { aro: 'aros', anillo: 'anillos', brazalete: 'brazaletes', runa: 'runas' };
const names = slots => { const c = {}; for (const s of slots) c[LBL[s]] = (c[LBL[s]] || 0) + 1; return list(Object.entries(c).map(([k, n]) => n > 1 ? PL[k] || k : k)); };
const pvpId = id => /^pvp/i.test(String(id));
const STIG_SLOTS = 4;   // espacios de estigma en Global
const tails = n => { const t = []; for (let i = n.indexOf(' de '); i >= 0; i = n.indexOf(' de ', i + 1)) t.push(n.slice(i + 4)); return t; };
export function bySet(L) {
const cnt = {}, left = [...L], out = [];
for (const x of L) if (!x.or) for (const t of new Set(tails(x.name))) cnt[t] = (cnt[t] || 0) + 1;
for (const [t] of Object.entries(cnt).filter(e => e[1] >= 2).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)) {
const g = left.filter(x => !x.or && tails(x.name).includes(t));
if (g.length < 2) continue;
const p = g.map(x => Math.round(x.share * 100)), lo = Math.min(...p), hi = Math.max(...p);
out.push(`Set de ${t} (${lo === hi ? lo : `${lo}–${hi}`} %)`);
for (const x of g) left.splice(left.indexOf(x), 1);
}
return list([...out, ...left.map(x => `${x.name} (${Math.round(x.share * 100)} %)`)]);
}
export function plan(d, items, boards, kind = 'pve', top = new Map(), mine = new Set()) {
const eq = d.equipment || [], by = new Map(eq.map(e => [e.slot, e])), il = d.profile.itemLevel || 0, cand = [];
const lv = d.profile.level;
if (lv && lv < LEVEL_CAP) return { low: 1, path: { il, ways: [], roof: il }, steps: [{ id: 'lvl', icon: null, title: `Subí a nivel ${LEVEL_CAP}: seguí la historia`,
gain: ['la historia da equipo y experiencia', 'cada nivel suma puntos de Daevanion'], cost: `Amplificar, encantar y compararte con los top sirve recién en nivel ${LEVEL_CAP}`, il: 0, dmg: 0, sure: 'seguro' }] };
const amp = (slots, what) => {
const L = slots.map(s => by.get(s)).filter(e => e && items[e.slot]?.maxExceedEnchantLevel && (e.exceed || 0) < items[e.slot].maxExceedEnchantLevel);
if (!L.length) return;
const lv = Math.min(...L.map(e => e.exceed || 0)), at = L.filter(e => (e.exceed || 0) === lv), n = at.length, [st, kn] = AMP[lv] || AMP.at(-1);
const tv = at.map(e => top.amp?.[e.slot]).filter(v => v != null), tl = tv.length ? tv.reduce((x, y) => x + y, 0) / tv.length : null;
return { at, lv, n, st: st * n, kn: kn * n, tl, past: tl != null && lv >= Math.round(tl), tg: tl == null ? [] : [lv >= Math.round(tl) ? `ya estás donde los top (+${fmt(tl)})` : `los top: +${fmt(tl)}`] };
};
const ampCost = x => `~${Math.round(x.st)} piedras de amplificación y ~${fmt(x.kn)} M de kinah`;
const w = amp(WPN), a = amp(ACC), br = amp(BRAC), r = amp(ARMOR);
if (w) cand.push({ id: 'amp-arma', icon: w.at[0].icon, title: `Amplificá ${w.n > 1 ? 'el arma y la secundaria' : w.at[0].slot === 1 ? 'el arma' : 'la secundaria'} a +${w.lv + 1}`, gain: [`+${w.n} % de daño`, `+${12 * w.n} de Ataque`, `+${5 * w.n} de nivel de objeto`, ...w.tg],
cost: ampCost(w), il: 5 * w.n, dmg: w.n / w.st, sure: 'seguro', past: w.past });
if (a) cand.push({ id: 'amp-acc', icon: a.at[0].icon, title: `Amplificá ${names(a.at.map(e => e.slot))} a +${a.lv + 1}`, gain: [`+${fmt(0.5 * a.n)} % de daño`, `+${6 * a.n} de Ataque`, `+${5 * a.n} de nivel de objeto`, ...a.tg],
cost: ampCost(a), il: 5 * a.n, dmg: (0.5 * a.n) / a.st, sure: 'seguro', past: a.past });
if (br) cand.push({ id: 'amp-brac', icon: br.at[0].icon, title: `Amplificá ${names(br.at.map(e => e.slot))} a +${br.lv + 1}`,
gain: [`+${br.at.reduce((t, e) => t + ((items[e.slot]?.level || 0) >= 86 ? 6 : 5), 0)} de Ataque`, `+${fmt(0.5 * br.n)} % de tolerancia a daño`, `+${5 * br.n} de nivel de objeto`, ...br.tg],
cost: ampCost(br), il: 5 * br.n, dmg: 0, sure: 'seguro', past: br.past });
if (r) cand.push({ id: 'amp-arm', icon: r.at[0].icon, title: `Amplificá ${r.n > 4 ? 'la armadura' : names(r.at.map(e => e.slot))} a +${r.lv + 1}`, gain: [`+${fmt(0.5 * r.n)} % de tolerancia a daño y de vida`, `+${5 * r.n} de nivel de objeto`, ...r.tg],
cost: ampCost(r), il: 5 * r.n, dmg: 0, sure: 'seguro', past: r.past });
const enc = eq.filter(e => !isArcana(e.slot) && items[e.slot]?.maxEnchantLevel > (e.enchant || 0));
const encIl = enc.reduce((s, e) => s + items[e.slot].maxEnchantLevel - (e.enchant || 0), 0);
const encTo = new Set(enc.map(e => items[e.slot].maxEnchantLevel)), encLong = new Set(enc.map(e => LBL[e.slot])).size > 3, encD = enc.map(e => `${LBL[e.slot]} +${e.enchant || 0} → +${items[e.slot].maxEnchantLevel}`).join(' · ');
if (enc.length) cand.push({ id: 'enc', icon: enc[0].icon, title: encLong ? `Terminá de encantar ${enc.length} piezas${encTo.size === 1 ? ` a +${[...encTo][0]}` : ''}` : `Terminá de encantar ${names(enc.map(e => e.slot))}`, gain: [`+${encIl} de nivel de objeto`, 'más stats de la pieza'],
...(encLong ? { detail: encD } : { cost: encD }), il: encIl, dmg: 0.2 / Math.max(1, encIl), sure: 'seguro', cheap: 1 });
const arc = eq.filter(e => isArcana(e.slot) && items[e.slot]?.maxEnchantLevel > (e.enchant || 0));
const arcIl = arc.reduce((s, e) => s + items[e.slot].maxEnchantLevel - (e.enchant || 0), 0);
if (arc.length) cand.push({ id: 'arc', icon: arc[0].icon, title: `Subí ${arc.length > 1 ? `tus ${arc.length} Arcanas` : 'la Arcana'} a +${items[arc[0].slot].maxEnchantLevel}`, gain: [`+${arcIl} de nivel de objeto`, `+${pl(arcIl, 'nivel', 'niveles')} de skill`],
cost: 'Cada nivel suma +1 a una de sus líneas de skill', il: arcIl, dmg: 0.1, sure: 'seguro', cheap: 1 });
const hands = [1, 2].map(s => ({ s, e: by.get(s), it: items[s] })).filter(x => x.e && x.it?.godStoneSlotCount);
const gEmpty = hands.filter(x => x.it.godStoneSlotCount > (x.it.godStoneStat || []).length), myF = hands.flatMap(x => (x.it.godStoneStat || []).map(g => godFam(g.icon)).filter(Boolean));
if (gEmpty.length || myF.length > new Set(myF).size) {
const G = top.gods || [], g0 = G.find(x => !myF.includes(x.f)), gr = G[0]?.grade || 'Legend', gil = gEmpty.length * (GS[gr] || 0), two = gEmpty.length > 1;
cand.push({ id: 'gs', icon: (gEmpty[0] || hands.at(-1)).e.icon, title: gEmpty.length ? `Poné una piedra sagrada en ${two ? 'el arma y la secundaria' : gEmpty[0].s === 1 ? 'el arma' : 'la secundaria'}` : 'Dos piedras sagradas iguales: cambiá una',
gain: [gEmpty.length ? `+${gil} de nivel de objeto con ${two ? 'dos' : 'una'} ${(GR_F[gr] || gr).toLowerCase()}${two ? 's' : ''}` : 'dos iguales aplican un solo efecto', ...(g0 ? [`los top: ${GOD[g0.f]?.[0] || g0.stoneEn} (${g0.k} de ${g0.of})`] : [])],
cost: 'Una piedra sagrada', il: gil, dmg: 0.3, sure: 'seguro', cheap: 1 });
}
const GSV = ['Rare', 'Legend', 'Unique'], TG = top.gods || [];
const gUp = hands.flatMap(x => (x.it.godStoneStat || []).map(g => ({ g, f: godFam(g.icon) }))).map(o => ({ ...o, to: (TG.find(t => t.f === o.f) || TG[0])?.grade }))
.filter(o => o.f && GSV.includes(o.g.grade) && GSV.includes(o.to) && GR_N[o.g.grade] < GR_N[o.to]);
if (gUp.length) {
const upIl = gUp.reduce((t, o) => t + GS[o.to] - GS[o.g.grade], 0), toS = new Set(gUp.map(o => o.to)), toF = gr => (GR_F[gr] || gr).toLowerCase();
cand.push({ id: 'gs-up', icon: hands[0].e.icon, title: gUp.length > 1 ? `Subí tus ${gUp.length} piedras sagradas${toS.size === 1 ? ` a ${toF(gUp[0].to)}` : ' de grado'}` : `Subí tu piedra sagrada (${GOD[gUp[0].f]?.[0] || 'la tuya'}) a ${toF(gUp[0].to)}`,
gain: [`+${upIl} de nivel de objeto`, 'el mismo efecto, más fuerte'], cost: 'Una piedra sagrada del mismo efecto en ese grado', il: upIl, dmg: 0.2, sure: 'seguro', cheap: 1 });
}
const pvMs = kind === 'pvp' ? [] : eq.map(e => [e, (items[e.slot]?.magicStoneStat || []).filter(m => pvpId(m.id)).length]).filter(x => x[1]);
const msN = pvMs.reduce((t, x) => t + x[1], 0);
if (msN && !mine.has('ms')) {
const c = {}, hyb = hybrid(d, items);
if (!(kind === 'support' && top.cls)) for (const [e, n] of pvMs) { const st = (top.ms?.[e.slot] || []).find(x => !pvpId(x.id)); if (st) c[st.name] = (c[st.name] || 0) + n; }
const best = Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0];
cand.push({ id: 'ms', icon: pvMs[0][0].icon, title: hyb ? (msN > 1 ? `Tenés ${msN} piedras de maná PvP` : 'Tenés una piedra de maná PvP') : msN > 1 ? `Cambiá tus ${msN} piedras de maná PvP` : 'Cambiá tu piedra de maná PvP', gain: ['solo suman contra jugadores', ...(hyb ? ['Si también hacés PvP, dejalas'] : []), ...(best ? [`los top ponen ${best}`] : [])],
cost: `${names(pvMs.map(x => x[0].slot)).replace(/^./, ch => ch.toUpperCase())}: piedras de maná, de lo más barato para mejorar`, il: 0, dmg: 0.3, sure: 'seguro', cheap: 1, past: hyb, ch: 'ms' });
}
const parts = skillParts(d, items, boards), daeN = [], tD = top.dae && Object.values(top.dae).some(x => x?.nodes?.length) ? top.dae : null;
for (const b of tD ? (d.daevanion || []).slice(0, 4) : d.daevanion || []) {
const W = tD ? new Set((tD[b.name]?.nodes || []).map(String)) : null;
for (const n of nodesOf(boards[b.id])) {
if (n.open || n.type === 'Start' || (W ? !W.has(String(n.nodeId)) : n.type !== 'SkillLevel')) continue;
const m = n.type === 'SkillLevel' && String(n.effectList?.[0]?.desc || '').match(/^(.+) \+(\d+)$/), s = m ? (d.skills || []).find(x => x.name === m[1]) : null;
if (n.type === 'SkillLevel' ? s && useful(s, parts.get(String(s.id))) : W) daeN.push({ s, board: b.name, cost: NODE_COST[n.grade] || 0 });
}
}
if (daeN.length && !(kind === 'support' && top.cls)) {
const per = new Map(), skN = daeN.filter(x => x.s).length;
for (const x of daeN.filter(x => x.s)) { const k = String(x.s.id); per.set(k, [...(per.get(k) || []), x]); }
const spec = [...per.values()].map(l => { const s = l[0].s, tl = top.get(String(s.id)) ?? 0, core = !top.size || tl >= s.level;
return { s, l, tl, core, T: core ? (SPEC[s.category] || []).find(t => s.level < t && s.level + l.length >= t && (!top.size || tl >= t)) : undefined }; })
.sort((x, y) => (!!y.T - !!x.T) || (OFFBAR.has(String(x.s.id)) - OFFBAR.has(String(y.s.id))) || (y.core - x.core) || (y.tl - x.tl) || y.l.length - x.l.length);
const pts = daeN.reduce((t, x) => t + x.cost, 0), hd = spec[0], key = spec.filter(x => x.core).slice(0, 4);
const kN = key.reduce((t, x) => t + x.l.length, 0), restN = skN - kN, nv = n => `+${n} nivel${n > 1 ? 'es' : ''} de skill`;
cand.push({ id: 'dae', icon: (key[0] || hd)?.s.icon || null, board: 1, T: hd?.T, title: hd?.T ? `${hd.s.name} a ${hd.T}: nueva especialización` : tD ? (daeN.length > 1 ? `Abrí los ${daeN.length} nodos que abren los top` : 'Abrí el nodo que abren los top') : daeN.length > 1 ? `Abrí los ${daeN.length} nodos de skill que te faltan` : 'Abrí el nodo de skill que te falta',
gain: [...(skN ? [kN ? nv(kN) + (restN ? ` (y ${restN} en otras skills)` : '') : nv(skN)] : []), `+${pts} de nivel de objeto`], skills: key.length ? key.map(x => ({ icon: x.s.icon, name: x.s.name, n: x.l.length, T: x.T })) : undefined,
cost: `${pts} puntos de Daevanion (cristales: subir de nivel y mazmorras selladas)`, il: pts, dmg: hd?.T ? 0.9 : 0.05, sure: 'seguro', heal: 1 });
}
const goal = s => {
const x = parts.get(String(s.id));
if (!top.size) return useful(s, x) ? BASE_CAP : 0;
const t = top.get(String(s.id));
return t == null ? 0 : Math.max(1, Math.min(BASE_CAP, Math.round(t - Math.max(x?.dae || 0, x?.daeMax || 0) - (x?.gear || 0) - (x?.arc || 0))));
};
const low = kind === 'support' && top.cls ? [] : (d.skills || []).filter(s => s.category !== 'Dp' && inBar(s) && (parts.get(String(s.id))?.base ?? BASE_CAP) < goal(s)).map(s => ({ s, n: goal(s) - parts.get(String(s.id)).base }));
if (low.length) cand.push({ id: 'pts', icon: low[0].s.icon, title: `Subí ${low.length > 1 ? `${low.length} skills` : low[0].s.name} con puntos de skill`, gain: [`+${pl(low.reduce((t, x) => t + x.n, 0), 'nivel', 'niveles')} de skill`, ...(top.size ? ['hasta el nivel de los top'] : [])],
skills: low.slice(0, 4).map(({ s, n }) => ({ icon: s.icon, name: s.name, n })), cost: 'Solo si te quedan puntos: la ficha oficial no muestra cuántos tenés', il: 0, dmg: 0.3, sure: 'estimado', heal: 1 });
const ar = (d.daevanion || [])[4];
if (ar && ar.open < ar.total && il >= 2600 && kind !== 'pvp') cand.push({ id: 'ariel', icon: null, board: 1, title: 'Juntá Fragmentos de Ariel en Expedición difícil', gain: ['daño a jefes y amplificación PvE', `${pl(ar.total - ar.open, 'nodo')} por abrir`],
cost: '100 fragmentos = 1 cristal de Ariel, hasta 30 por personaje', il: 0, dmg: 0.02, sure: 'estimado' });
const sMain = new Map((top.stig || []).map(x => [String(x.id), x])), myOwn = s => mine.has('stig:' + s.id);
const myStg = (d.skills || []).filter(s => s.category === 'Dp' && s.equipped && s.level > 0), myIds = new Set(myStg.map(s => String(s.id)));
const main = top.stig || [], tieK = main[3]?.k, tie = main.length === 4 ? (top.stigAlt || []).filter(x => x.k === tieK) : [];
const miss = main.find((x, i) => x.share >= 0.5 && !myIds.has(String(x.id)) && !(i === 3 && tie.some(t => myIds.has(String(t.id)))));
const altOf = new Map((top.stigAlt || []).map(x => [String(x.id), x])), sh = s => altOf.get(String(s?.id))?.share || 0;
const others = myStg.filter(s => !sMain.has(String(s.id))).sort((a, b) => sh(a) - sh(b)), out = others.find(s => !myOwn(s)), kept = others.find(myOwn);
const outA = out ? altOf.get(String(out.id)) : null, outS = outA?.share || 0, missS = (d.skills || []).find(s => String(s.id) === String(miss?.id)), free = myStg.length < STIG_SLOTS;
const of = miss?.of ? ` de ${miss.of} top` : ' % de los top', cnt = x => miss.of ? x?.k ?? 0 : Math.round((x?.share || 0) * 100), swap = !free && out;
const keep = miss && missS && !free && !out && kept && !(sh(kept) >= miss.share - 0.25) ? `Tu elección: ${kept.name}. Los top usan ${missS.name} (${cnt(miss)}${miss.of ? ` de ${miss.of}` : ' %'})` : '';
const stg = (d.skills || []).filter(s => s.category === 'Dp' && s.equipped && s.level > 0 && (sMain.has(String(s.id)) || myOwn(s))).map(s => {
const own = !sMain.has(String(s.id)), tl = own ? STIG_CAP : Math.min(STIG_CAP, Math.round(sMain.get(String(s.id)).lvl || 0)), T = SPEC.Dp.find(t => t > s.level && t <= tl);
return { s, tl, T, to: T || tl, own };
}).filter(x => x.s.level < x.tl).sort((a, b) => a.own - b.own);
if (stg.length) {
const allT = stg.every(x => x.T), oneT = allT && new Set(stg.map(x => x.T)).size === 1, tls = new Set(stg.filter(x => !x.own).map(x => x.tl)), [s0] = stg;
cand.push({ id: 'stig', icon: s0.s.icon, T: s0.T, title: stg.length > 1 ? `Subí ${stg.length} estigmas ${oneT ? `a ${s0.T}` : allT ? 'a su próxima especialización' : 'al nivel de los top'}` : s0.T ? `${s0.s.name} a ${s0.T}: nueva especialización` : `Subí ${s0.s.name} a ${s0.tl}`,
gain: [`+${pl(stg.reduce((t, x) => t + x.to - x.s.level, 0), 'nivel', 'niveles')} de estigma`, ...(tls.size === 1 ? [`los top: ${[...tls][0]}`] : [])], skills: stg.slice(0, 4).map(x => ({ icon: x.s.icon, name: x.s.name, n: x.to - x.s.level, T: x.T })),
cost: 'Fragmentos de Estigma', il: 0, dmg: 0.5, sure: 'seguro', heal: 1, ...(keep ? { detail: keep, own: 'stig:' + kept.id } : {}) });
}
if (miss && missS && (free || (out && !(outS >= miss.share - 0.25)))) cand.push({ id: 'stig-swap', icon: missS.icon, ...(swap ? { ch: 'stig:' + out.id } : {}),
title: swap ? `Probá ${missS.name} en vez de ${out.name}` : free && missS.equipped ? `Subí ${missS.name} (la tenés en ${missS.level || 0})` : `Poné ${missS.name} en tus estigmas`,
gain: [`${missS.name}: la suben ${cnt(miss)}${of}`, ...(swap ? [`${out.name} (la tenés en ${out.level}): ${cnt(outA)}${miss.of ? ` de ${miss.of}` : ' %'}`] : [])],
cost: `Fragmentos de Estigma para subirla (los top la llevan a ${Math.round(miss.lvl || STIG_CAP)}; la tenés en ${missS.level || 0})`, il: 0, dmg: 0.4, sure: 'seguro', heal: 1 });
const ampAll = eq.reduce((s, e) => s + 5 * Math.max(0, (items[e.slot]?.maxExceedEnchantLevel || 0) - (e.exceed || 0)), 0);
const daeAll = (d.daevanion || []).slice(0, 4).reduce((s, b) => s + nodesOf(boards[b.id]).filter(n => !n.open).reduce((t, n) => t + (NODE_COST[n.grade] || 0), 0), 0);
const ways = [['Amplificación', ampAll], ['Encantamiento', encIl], ['Arcanas', arcIl], ['Daevanion (tableros base)', daeAll]].filter(x => x[1] > 0);
const roof = il + ways.reduce((s, x) => s + x[1], 0);
const swapG = [], swapCs = new Set(), has = (e, i) => !!e && [i.id, ...(i.ids || [])].map(String).includes(String(e.id)), isTop = (e, L) => L.some(i => i.share >= 0.25 && has(e, i));
const swapN = eq.filter(e => top.items?.[e.slot] && !isTop(e, top.items[e.slot])).length;
const myT = new Set(eq.flatMap(x => tails(String(x.name || '')))), topT = {};
for (const L of new Set(Object.values(top.items || {}))) if (!(L[1]?.share === L[0].share)) for (const t of new Set(tails(L[0].name))) topT[t] = (topT[t] || 0) + 1;
const pick = L => {
const T = L.filter(i => i.share === L[0].share), sc = T.map(i => Math.max(0, ...tails(i.name).map(t => (myT.has(t) ? 100 : 0) + (topT[t] || 0)))), mx = Math.max(...sc);
return T.length < 2 ? L[0] : mx > 0 && sc.filter(x => x === mx).length === 1 ? T[sc.indexOf(mx)] : { ...T[0], name: T.map(i => i.name).join(' o '), or: 1 };
};
for (const e of eq) {
const L = top.items?.[e.slot], cs = CSLOT[e.slot];
if (!L || swapCs.has(cs) || isTop(e, L)) continue;
const twin = eq.find(x => x !== e && CSLOT[x.slot] === cs);
const it = pick(L);
swapCs.add(cs); swapG.push({ e, it: has(twin, it) ? { ...it, name: 'un segundo ' + it.name } : it });
}
if (swapG.length && top.il) cand.push({ id: 'gear', icon: swapG[0].e.icon, title: `Tu techo con este equipo: ${fmt(roof)} de nivel de objeto`,
gain: [`los top: ${fmt(top.il)}`, swapG.length > 4 ? `los top usan otro set en ${swapN} piezas` : `${list(swapG.map(x => PL[LBL[x.e.slot]] || LBL[x.e.slot])).replace(/^./, c => c.toUpperCase())}: los top usan otras piezas`],
cost: 'Es lo que sigue cuando ya mejoraste lo que tenés', detail: `Los top usan ${bySet(swapG.map(x => x.it))}`, il: 0, dmg: 0, sure: 'seguro' });
const P = kind === 'support'
? { dae: 100, pts: 90, gs: 88, 'gs-up': 87, ms: 86, stig: 85, arc: 80, 'stig-swap': 75, enc: 70, 'amp-acc': 60, 'amp-arma': 55, ariel: 40, 'amp-brac': 25, 'amp-arm': 20 }
: { 'amp-acc': 100, 'amp-arma': 100, gs: 92, 'gs-up': 91, ms: 90, stig: 85, dae: 80, 'stig-swap': 75, enc: 70, arc: 60, pts: 50, ariel: 40, 'amp-brac': kind === 'pvp' ? 45 : 30, 'amp-arm': kind === 'pvp' ? 35 : 10 };
const score = c => P[c.id] + (c.id.startsWith('amp') ? c.dmg * 100 : 0) - (c.id === 'dae' && !c.T ? 40 : 0) - (c.past ? 70 : 0);
const ord = cand.filter(c => c.id !== 'gear').sort((x, y) => score(y) - score(x)), gear = cand.find(c => c.id === 'gear');
return { steps: gear ? [...ord, gear] : ord, path: { il, ways, roof } };
}
export function stations(d, items, boards) {
const eq = (d.equipment || []).filter(e => items[e.slot]), sum = f => eq.reduce((s, e) => s + f(e), 0);
const nonArc = eq.filter(e => !isArcana(e.slot)), arc = eq.filter(e => isArcana(e.slot));
const base = (d.daevanion || []).slice(0, 4).flatMap(b => nodesOf(boards[b.id]).filter(n => n.type !== 'Start'));
const lv = nonArc.filter(e => e.slot <= 19 && items[e.slot].maxExceedEnchantLevel);
const avg = lv.length ? Math.round(lv.reduce((s, e) => s + items[e.slot].level, 0) / lv.length) : 0;
return [
{ k: 'equipo', t: 'Equipo', v: avg, of: 102, txt: `nivel base promedio ${avg}`, tip: 'El mejor equipo de hoy llega a 102 (Forja Abismal: Ludra y crafteo brillante)' },
{ k: 'enc', t: 'Encantamiento', v: nonArc.reduce((s, e) => s + (e.enchant || 0), 0), of: nonArc.reduce((s, e) => s + (items[e.slot].maxEnchantLevel || 0), 0) },
{ k: 'amp', t: 'Amplificación', v: sum(e => items[e.slot].maxExceedEnchantLevel ? e.exceed || 0 : 0), of: sum(e => items[e.slot].maxExceedEnchantLevel || 0) },
{ k: 'arc', t: 'Arcanas', v: arc.reduce((s, e) => s + (e.enchant || 0), 0), of: arc.reduce((s, e) => s + (items[e.slot].maxEnchantLevel || 0), 0) },
{ k: 'dae', t: 'Daevanion', v: base.filter(n => n.open).reduce((s, n) => s + (NODE_COST[n.grade] || 0), 0), of: base.reduce((s, n) => s + (NODE_COST[n.grade] || 0), 0), txt: 'tableros base, en puntos' },
];
}
