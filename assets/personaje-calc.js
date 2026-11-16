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
{ il: 2800, name: 'Templo de Fuego y Caverna del Cuerno Feroz difícil · Forja Abismal: Ludra', short: 'Templo de Fuego difícil y Ludra', ok: 1 },
{ il: 3000, name: 'Forja Abismal: Ludra difícil', short: 'Ludra difícil', ok: 1 },
];
export function gateOf(il) {
const met = GATES.filter(g => il >= g.il), next = GATES.find(g => il < g.il) || null;
return { cur: met.at(-1) || null, next, need: next ? next.il - il : 0, prev: met.at(-1)?.il ?? 0 };
}
const MS = { Common: 1, Rare: 2, Epic: 2, Legend: 3, Mythic: 3, Unique: 4, Special: 6 };
const GS = { Common: 1, Rare: 3, Epic: 5, Legend: 7, Mythic: 9, Unique: 5, Special: 13 };
export const NODE_COST = { Common: 1, Rare: 2, Legend: 3, Unique: 4 };
export const isArcana = slot => slot >= 41 && slot <= 45;
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
if (s.category === 'Dp') return !s.equipped ? '' : s.level >= STIG_CAP ? 'Al tope: 20' : `Con Fragmentos de Estigma hasta 20 (te faltan ${STIG_CAP - (s.level || 0)})`;
if (!x) return '';
if (x.base < BASE_CAP) return `${BASE_CAP - x.base} con puntos de skill (la base llega a ${BASE_CAP})`;
if (x.dae < x.daeMax) return `${x.daeMax - x.dae} con Daevanion: ${[...new Set(x.daeMiss)].join(', ')}`;
return 'Lo que sigue sale de líneas de Arcana y de equipo';
}
export const topLevels = (T, k) => new Map(((T?.[k]?.skills?.length ? T[k] : k !== 'support' && T?.all)?.skills || []).map(s => [String(s.id), s.lvl]));
const FIERCE = new Set(['311030002', '311040002', '311050002']);
export function kindGuess(d, items, sets = {}) {
const sup = new Set((sets.support || []).map(x => String(x.id))), pvpS = new Set((sets.pvp || []).map(x => String(x.id)));
const core = (d.skills || []).filter(s => s.category === 'Dp' && s.equipped && s.level > 0).map(s => String(s.id)); // como coreOf del server: subidas y puestas
const its = Object.values(items || {});
const stones = its.flatMap(it => (it.magicStoneStat || []).map(m => String(m.id))).filter(id => /^pvp/i.test(id)).length;
const lines = its.flatMap(it => (it.subStats || []).map(m => String(m.id))).filter(id => /^pvp/i.test(id)).length;
const az = (d.daevanion || [])[5]?.open ?? 0;
const sig = [];
let pvp = 0;
if ((d.equipment || []).some(e => FIERCE.has(String(e.id)))) { pvp += 2; sig.push('Amuleto de batalla feroz'); }
if (stones >= 8) { pvp++; sig.push(`${stones} piedras de maná de JcJ`); }
if (lines >= 2) { pvp += lines >= 10 ? 2 : 1; sig.push(`${lines} líneas de JcJ en el equipo`); }
if (az >= 90) { pvp++; sig.push(`Azphel con ${az} nodos`); }
const ps = core.filter(id => pvpS.has(id)).length, ss = core.filter(id => sup.has(id)).length;
if (ps) { pvp++; sig.push('una estigma de JcJ subida'); }
if (pvp >= 2) return { kind: 'pvp', sig };
if (sup.size && ss >= Math.min(2, sup.size)) return { kind: 'support', sig: [`${ss} estigmas de curación subidas`] };
return { kind: 'pve', sig: sig.length ? [...sig, 'no alcanzan para JcJ'] : [] };
}
const AMP = [[8.8, 0.88], [16.9, 1.69], [32.1, 3.75], [51.4, 6.86], [87.1, 13.07]];
const ACC = [10, 11, 12, 13, 14], ARMOR = [2, 3, 4, 5, 6, 7, 8, 19];
const LBL = { 1: 'arma', 2: 'secundaria', 3: 'casco', 4: 'hombreras', 5: 'pechera', 6: 'piernas', 7: 'guantes', 8: 'botas', 19: 'capa', 10: 'collar', 11: 'aro', 12: 'aro', 13: 'anillo', 14: 'anillo', 15: 'brazalete', 16: 'brazalete', 17: 'cinturón', 22: 'amuleto', 23: 'runa', 24: 'runa' };
const fmt = n => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n);
const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a.at(-1) : a[0] || '';
const PL = { aro: 'aros', anillo: 'anillos', brazalete: 'brazaletes', runa: 'runas' };
const names = slots => { const c = {}; for (const s of slots) c[LBL[s]] = (c[LBL[s]] || 0) + 1; return list(Object.entries(c).map(([k, n]) => n > 1 ? PL[k] || k : k)); };
export function plan(d, items, boards, kind = 'pve', top = new Map()) {
const eq = d.equipment || [], by = new Map(eq.map(e => [e.slot, e])), il = d.profile.itemLevel || 0, cand = [];
const amp = (slots, what) => {
const L = slots.map(s => by.get(s)).filter(e => e && items[e.slot]?.maxExceedEnchantLevel && (e.exceed || 0) < items[e.slot].maxExceedEnchantLevel);
if (!L.length) return;
const lv = Math.min(...L.map(e => e.exceed || 0)), at = L.filter(e => (e.exceed || 0) === lv), n = at.length, [st, kn] = AMP[lv] || AMP.at(-1);
return { at, lv, n, st: st * n, kn: kn * n };
};
const w = amp([1]), a = amp(ACC), r = amp(ARMOR);
if (w) cand.push({ id: 'amp-arma', icon: by.get(1).icon, title: `Amplificá el arma a +${w.lv + 1}`, gain: ['+1 % de daño', '+12 de Ataque', '+5 de nivel de objeto'],
cost: `~${Math.round(w.st)} piedras de amplificación y ~${fmt(w.kn)} M de kinah`, il: 5, dmg: 1 / w.st, sure: 'seguro' });
if (a) cand.push({ id: 'amp-acc', icon: a.at[0].icon, title: `Amplificá ${names(a.at.map(e => e.slot))} a +${a.lv + 1}`, gain: [`+${fmt(0.5 * a.n)} % de daño`, `+${6 * a.n} de Ataque`, `+${5 * a.n} de nivel de objeto`],
cost: `~${Math.round(a.st)} piedras de amplificación y ~${fmt(a.kn)} M de kinah`, il: 5 * a.n, dmg: (0.5 * a.n) / a.st, sure: 'seguro' });
if (r) cand.push({ id: 'amp-arm', icon: r.at[0].icon, title: `Amplificá ${r.n > 4 ? 'la armadura' : names(r.at.map(e => e.slot))} a +${r.lv + 1}`, gain: ['solo defensa', `+${5 * r.n} de nivel de objeto`],
cost: `~${Math.round(r.st)} piedras de amplificación y ~${fmt(r.kn)} M de kinah`, il: 5 * r.n, dmg: 0, sure: 'seguro' });
const enc = eq.filter(e => !isArcana(e.slot) && items[e.slot]?.maxEnchantLevel > (e.enchant || 0));
const encIl = enc.reduce((s, e) => s + items[e.slot].maxEnchantLevel - (e.enchant || 0), 0);
if (enc.length) cand.push({ id: 'enc', icon: enc[0].icon, title: `Terminá de encantar ${names(enc.map(e => e.slot))}`, gain: [`+${encIl} de nivel de objeto`, 'más stats de la pieza'],
cost: enc.map(e => `${LBL[e.slot]} +${e.enchant || 0} → +${items[e.slot].maxEnchantLevel}`).join(' · '), il: encIl, dmg: 0.2 / Math.max(1, encIl), sure: 'seguro', cheap: 1 });
const arc = eq.filter(e => isArcana(e.slot) && items[e.slot]?.maxEnchantLevel > (e.enchant || 0));
const arcIl = arc.reduce((s, e) => s + items[e.slot].maxEnchantLevel - (e.enchant || 0), 0);
if (arc.length) cand.push({ id: 'arc', icon: arc[0].icon, title: `Subí ${arc.length > 1 ? `tus ${arc.length} Arcanas` : 'la Arcana'} a +${items[arc[0].slot].maxEnchantLevel}`, gain: [`+${arcIl} de nivel de objeto`, `+${arcIl} niveles de skill`],
cost: 'Cada nivel suma +1 a una de sus líneas de skill', il: arcIl, dmg: 0.1, sure: 'seguro', cheap: 1 });
const parts = skillParts(d, items, boards), sk = new Map((d.skills || []).map(s => [String(s.id), s])), daeN = [];
for (const b of d.daevanion || []) for (const n of nodesOf(boards[b.id])) {
if (n.type !== 'SkillLevel' || n.open) continue;
const m = String(n.effectList?.[0]?.desc || '').match(/^(.+) \+(\d+)$/), s = m && (d.skills || []).find(x => x.name === m[1]);
if (s && useful(s, parts.get(String(s.id)))) daeN.push({ s, board: b.name, cost: NODE_COST[n.grade] || 0 });
}
if (daeN.length) {
const per = new Map();
for (const x of daeN) { const k = String(x.s.id); per.set(k, [...(per.get(k) || []), x]); }
const spec = [...per.values()].map(l => { const s = l[0].s, tl = top.get(String(s.id)) ?? 0, core = !top.size || tl >= s.level;
return { s, l, tl, core, T: core ? (SPEC[s.category] || []).find(t => s.level < t && s.level + l.length >= t && (!top.size || tl >= t)) : undefined }; })
.sort((x, y) => (!!y.T - !!x.T) || (OFFBAR.has(String(x.s.id)) - OFFBAR.has(String(y.s.id))) || (y.core - x.core) || (y.tl - x.tl) || y.l.length - x.l.length);
const pts = daeN.reduce((t, x) => t + x.cost, 0), hd = spec[0], key = spec.filter(x => x.core).slice(0, 4);
cand.push({ id: 'dae', icon: (key[0] || hd).s.icon, T: hd.T, title: hd.T ? `${hd.s.name} a ${hd.T}: nueva especialización` : `Abrí los ${daeN.length} nodos de skill que te faltan`,
gain: [`+${daeN.length} niveles de skill`, `+${pts} de nivel de objeto`], skills: key.length ? key.map(x => ({ icon: x.s.icon, name: x.s.name, n: x.l.length, T: x.T })) : undefined,
cost: `${pts} puntos de Daevanion (cristales: subir de nivel y mazmorras selladas)`, il: pts, dmg: hd.T ? 0.9 : 0.05, sure: 'seguro', heal: 1 });
}
const low = (d.skills || []).filter(s => { const x = parts.get(String(s.id)); return s.category !== 'Dp' && inBar(s) && (x?.base ?? 10) < BASE_CAP
&& (top.size ? (top.get(String(s.id)) ?? 0) >= BASE_CAP : useful(s, x)); });
if (low.length) cand.push({ id: 'pts', icon: low[0].icon, title: `Subí ${low.length > 1 ? `${low.length} skills` : low[0].name} con puntos de skill`, gain: [`+${low.reduce((t, s) => t + BASE_CAP - parts.get(String(s.id)).base, 0)} niveles de skill`],
skills: low.slice(0, 4).map(s => ({ icon: s.icon, name: s.name, n: BASE_CAP - parts.get(String(s.id)).base })), cost: 'Solo si te quedan puntos: la ficha oficial no muestra cuántos tenés', il: 0, dmg: 0.3, sure: 'estimado', heal: 1 });
const ar = (d.daevanion || [])[4];
if (ar && ar.open < ar.total && il >= 2600 && kind !== 'pvp') cand.push({ id: 'ariel', icon: null, board: 1, title: 'Juntá Fragmentos de Ariel en Expedición difícil', gain: ['daño a jefes y amplificación JcE', `${ar.total - ar.open} nodos por abrir`],
cost: '100 fragmentos = 1 cristal de Ariel, hasta 30 por personaje', il: 0, dmg: 0.02, sure: 'estimado' });
const P = kind === 'support'
? { dae: 100, pts: 90, arc: 80, enc: 70, 'amp-acc': 60, 'amp-arma': 55, ariel: 40, 'amp-arm': 20 }
: { 'amp-acc': 100, 'amp-arma': 100, dae: 80, enc: 70, arc: 60, pts: 50, ariel: 40, 'amp-arm': 10 };
const score = c => P[c.id] + (c.id.startsWith('amp') ? c.dmg * 100 : 0) - (c.id === 'dae' && !c.T ? 40 : 0);
const steps = cand.sort((x, y) => score(y) - score(x)).slice(0, 5);
const ampAll = eq.reduce((s, e) => s + 5 * Math.max(0, (items[e.slot]?.maxExceedEnchantLevel || 0) - (e.exceed || 0)), 0);
const daeAll = (d.daevanion || []).slice(0, 4).reduce((s, b) => s + nodesOf(boards[b.id]).filter(n => !n.open).reduce((t, n) => t + (NODE_COST[n.grade] || 0), 0), 0);
const ways = [['Amplificación', ampAll], ['Encantamiento', encIl], ['Arcanas', arcIl], ['Daevanion (tableros base)', daeAll]].filter(x => x[1] > 0);
return { steps, path: { il, ways, roof: il + ways.reduce((s, x) => s + x[1], 0) } };
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
