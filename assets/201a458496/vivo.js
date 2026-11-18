import {
store, versioned, profile, on, onStore, emit, getBell, bells, setRuled, setTimers, maintWindows, pipOpen, SCHEDULE, HUB_API, lnaBlocked, ROOT, MIN, DAY,
} from './core.js';
const [WIN_MIN, RAW] = [10,[[101001,"Neikel del este","Neikel of the East","e",30,"UT_256_MOB_Keneir_01_V03","6. Punta del Árbol Hongo del Valle de Kantas","6. Cantas Valley Mushroom Tree Peak",0,[]],[101002,"Kutar podrido","Rotten Kutar","e",30,"UT_256_MOB_BigMan_01","9. Puesto de Vigilancia de la Ciénaga","9. Marsh Outpost",0,[]],[101003,"Kernon del oeste","Kernon of the West","e",30,"UT_256_MOB_Keneir_01_V02","4. Cuartel Costero","4. Coastal Camp",0,[]],[101004,"Gladiador frenético Kusan","Kusan the Mad Gladiator","e",120,"UT_256_MOB_KrallElite_01","19. Columna Derrumbada","19. Collapsed Pillar",0,[]],[101005,"Ritualista Garshim","Ritualist Garshim","e",120,"UT_256_MOB_KrallElite_02","20. Entrada del Oratorio de la Ilusión","20. Illusion Oratory Entrance",0,[]],[101006,"Guardia Teegant","Bodyguard Teegant","e",90,"UT_Vehicle_Portrait_Neuth_03","21. Desfiladero de la Fortaleza de Verteron","21. Verteron Fortress Valley",0,["1156"]],[101007,"Korin en flor","Blooming Korin","e",60,"UT_256_MOB_Coradon_01","13. Campamento de la Orden de la Ilusión","13. Illusion Cavaliers' Campsite",0,[]],[101008,"Saursus iracundo","Furious Saursus","e",180,"UT_256_MOB_UrsussElite_01_V01","27. Base del Grupo de Mercenarios de Astin","27. Astin Mercenaries Base",0,[]],[101009,"Pnyn de colmillo sangriento","Bloodfang Pnyn","e",180,"UT_256_MOB_KalnifElite_01_V01","26. Parada de Shugo Sur","26. Southern Shugo Station",0,[]],[101010,"Apóstata Layla","Heretic Layla","e",180,"UT_256_MOB_SuraPriest_01_V04","23. Camino de Peregrinación del Templo Divino de Zumion","23. Zumion Temple Pilgrimage Path",0,[]],[101011,"Lawa del tentáculo negro","Black Tentacle Lawa","e",240,"UT_256_MOB_NagaElite_05","44. Terreno del Antiguo Templo Divino de Zumion","44. Ancient Zumion Temple Site",0,[]],[101012,"Kasia de ensoñación","Phantasm Kasia","e",360,"UT_256_MOB_Kasia_01_B","59. Mirador del Oeste del Jardín del Dios Ilusorio","59. Garden of the Illusion God West Observatory",0,[]],[101013,"Centurión Demiros","Centurion Demiros","e",240,"UT_256_MOB_Undead_01","43. Terreno de las Ruinas de la Meseta de Altamia","43. Altamia Highland Ruins",0,[]],[101014,"Ansas divina","Divine Ansas","e",360,"UT_256_MOB_Guardit_03","43. Terreno de las Ruinas de la Meseta de Altamia","43. Altamia Highland Ruins",0,["1206"]],[101015,"Administrador de cosecha Moshav","Harvest Manager Moshav","e",180,"UT_256_MOB_DrakanElite_03_V01","54. Puesto de Guardia de Transporte de Drana","54. Drana Transport Hub",0,[]],[101016,"Celador K'nash","Sentinel K'nash","e",240,"UT_256_MOB_BeritraD_04_V01","54. Puesto de Guardia de Transporte de Drana","54. Drana Transport Hub",0,[]],[101017,"Erudito Aulla","Scholar Aulla","e",120,"UT_256_MOB_OwlMagic_01_V01","32. Delegación de la Brisa Abandonada","32. Abandoned Wind Breeze Office",0,[]],[101018,"Guerrero del bosque Aullamu","Forest Warrior Aullamu","e",240,"UT_256_MOB_OwlElite_01_V01","33. Desfiladero de la Aldea Aullaeu","33. Aullaeu Village Valley",0,[]],[101019,"Perseguidor Taulo","Chaser Taulo","e",120,"UT_256_MOB_OwlElite_01_CV01_B","32. Delegación de la Brisa Abandonada","32. Abandoned Wind Breeze Office",0,[]],[101020,"Investigador Setram","Researcher Setram","e",360,"UT_256_MOB_BeritraD_03","57. Planta de Desechos de Nahid","57. Nahid Disposal Plant",0,[]],[101021,"Gartua de eternidad","Eternal Gartua","e",660,"UT_256_MOB_Gartua_01_V02",null,"",1,[]],[101022,"Dartan del silencio","Silent Dartan","e",360,"UT_256_MOB_BeritraD_01","33. Desfiladero de la Aldea Aullaeu","33. Aullaeu Village Valley",1,[]],[101023,"Gobernante de almas Kashapa","Soul Ruler Kashapa","e",360,"UT_256_MOB_Kashapa_01","44. Terreno del Antiguo Templo Divino de Zumion","44. Ancient Zumion Temple Site",1,[]],[101024,"Comandante de Lagta","High Commander Lagta","e",660,"UT_256_MOB_Lagta_01","53. Albergue de Obreros","53. Laborer's Rest Stop",1,[]],[111001,"Danar fundido","Melted Danar","a",30,"UT_256_MOB_DranaVar_02_V01","5. Campamento de Creion","5. Creion Campsite",0,[]],[111002,"Guerrero negro Aed","Black Warrior Aed","a",30,"UT_256_MOB_SuraWar_05_V02","8. Crematorio Descuidado","8. Neglected Crematorium",0,[]],[111003,"Rajit leal","Faithful Rajit","a",30,"UT_256_MOB_DracoWar_01_V03","13. Retiro Temporal","13. Temporary Retreat",0,[]],[111004,"Berserker Vargor","Berserker Vargor","a",60,"UT_256_MOB_Varg_03_V01","13. Retiro Temporal","13. Temporary Retreat",0,[]],[111005,"Garsan depredador","Predator Garsan","a",120,"UT_256_MOB_UrsussElite_01_CV01","21. Escondite del Bosque","21. Forest Hideout",0,[]],[111006,"Guerrero sangriento Lannar","Blood Warrior Lannar","a",90,"UT_256_MOB_AltKnife_04","22. Sombra Árida del Bosque Moslan","22. Moslan Forest Dry Shade",0,[]],[111007,"Impostora Trid","Deceiver Trid","a",120,"UT_256_MOB_NornirVar_02_V02","27. Estatua del Daeva Victorioso","27. Victorious Daeva's Statue",0,[]],[111008,"Kelpina de onda azul","Blue Wave Kelpina","a",120,"UT_256_MOB_Keneir_01_V02","32. Manantial de la Recuperación","32. Healing Spring",0,[]],[111009,"Nutah supervisor jefe","High Overseer Nutah","a",120,"UT_256_MOB_SkurvWar_04_V03","35. Refugio del Viento Frío","35. Briskwind Shelter",0,[]],[111010,"Consejero Resana","Advisor Resana","a",180,"UT_256_MOB_DrakanElite_03_V01","36. Cueva Oculta","36. Hidden Cave",0,[]],[111011,"Líder de operaciones especiales Linx","Special Operations Leader Linx","a",180,"UT_256_MOB_FighterM_01_V03","40. Campamento de los Saqueadores de Tumbas","40. Graverobber Campsite",0,[]],[111012,"Profanador Newbold","Desecrator Newbold","a",240,"UT_256_MOB_AltKnife_06","41. Cueva de la Fisura","41. Fissure Cave",0,[]],[111013,"Akan de ánimas perdidas Axios","Specter Archon Axios","a",240,"UT_256_MOB_DstrArchonE_01","44. Acantilado de las Ruinas de Basfelt","44. Basfelt Ruins Cliff",0,[]],[111014,"Hardirun envenenado","Addicted Hardirun","a",180,"UT_256_MOB_AddShulack_05","48. Taller del Martillo de Acero","48. Steel Hammer Workcamp",0,[]],[111015,"Verdugo Barthien","Executioner Barthien","a",240,"UT_256_MOB_AltKnife_07","54. Lago de Idun","54. Idun's Lake",0,[]],[111016,"Drakan artillería de destacamento Guruta","Drakan Battalion Weapon Guruta","a",360,"UT_256_MOB_BeritraD_04_V01","51. Puesto Comercial Temporal de Martillo de Acero","51. Steel Hammer Temporary Trading Post",0,[]],[111017,"Veterano Shujakan","Veteran Shujakan","a",180,"UT_256_MOB_Lycan_05","59. Puesto Callejero del Confín","59. Outskirts Stall",0,[]],[111018,"Karuka visionario","Visionary Karuka","a",240,"UT_256_MOB_Lycan_04","57. Sótano de Kumrica","57. Kumrica's Cellar",0,[]],[111019,"Vishwada de oscuridad","Dark Shadow Vishwada","a",360,"UT_256_MOB_BeritraD_03",null,"",0,[]],[111020,"Shylak agudo","Sharp Shylak","a",360,"UT_256_MOB_DracoElite_01","58. Salón del Honor Derrumbado","58. Collapsed Hall of Fame",0,[]],[111021,"Gartua inmortal","Immortal Gartua","a",660,"UT_256_MOB_Gartua_01_V02",null,"",1,[]],[111022,"Comandante de Lagta","High Commander Lagta","a",660,"UT_256_MOB_Lagta_01",null,"",1,[]],[111023,"Gobernante de almas Kashapa","Soul Ruler Kashapa","a",360,"UT_256_MOB_Kashapa_01","54. Lago de Idun","54. Idun's Lake",1,[]],[111024,"Dartan del silencio","Silent Dartan","a",360,"UT_256_MOB_BeritraD_01","40. Campamento de los Saqueadores de Tumbas","40. Graverobber Campsite",1,[]]]];
export const WIN = WIN_MIN * MIN, KEEP = 30 * MIN, LIVE_VALID = 15 * MIN;
const TOL = 3 * MIN, POLL = 60e3, CUT = 7000, BACKOFF = [5e3, 15e3];
export const BOSSES = RAW.map(([id, name, nameEn, f, rm, retrato, teleport, teleportEn, top, pets]) => ({ id, name, nameEn, fac: f === 'e' ? 'elyos' : 'asmodian', cyc: rm * MIN, retrato, teleport, teleportEn, top: !!top, pets }));
export const BOSS = new Map(BOSSES.map(b => [b.id, b]));
export const KILLS = versioned('hub-kills', 1, { k: {} });          // {"<server>|<jefe>": epoch ms del kill}
export const srv = () => profile().server || 0;
export const kkey = b => `${srv()}|${b.id}`;
export const bellId = b => `jefe:${srv()}:${b.id}`;
export const tpTxt = t => { const m = /^(\d+)\.\s*(.*)$/.exec(t || ''); return !t ? '' : m ? `Teleport ${m[1]} · ${m[2]}` : `Teleport · ${t}`; };
export const SRC_TXT = { ql: 'En vivo', vos: 'Vos', com: 'Estimado' };
const MAINT = SCHEDULE.maintenance?.fieldBossesAfterMaintenance !== 'keep';
let mwAt = -Infinity, mwL = [];
const mws = now => { if (Math.abs(now - mwAt) > MIN) { mwAt = now; mwL = maintWindows(now - 3 * DAY, now + DAY); } return mwL; };
export async function api(path, body) {
try {
const r = await fetch(HUB_API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(CUT) }
: { cache: 'no-cache', signal: AbortSignal.timeout(CUT) });        // no-cache: el navegador revalida con If-None-Match (ETag) y el 304 no baja nada
return { r, txt: await r.text() };
} catch (e) { return { fail: e.name }; }                               // TimeoutError (7 s) o TypeError (red, CORS, permiso de red local)
}
let feedKey = null, feedMap = null;
function feed() {
let raw = null;
try { raw = localStorage.getItem('hub-com-feed'); } catch { /* sin almacenamiento */ }
const k = srv() + '|' + raw;
if (k !== feedKey) {
feedKey = k;
let j = null;
try { j = JSON.parse(raw); } catch { /* */ }
feedMap = j?.server === srv() && Array.isArray(j.bosses) ? new Map(j.bosses.map(c => [c.boss, c])) : null;
}
return feedMap;
}
export function timer(b, now, K = KILLS.get().k) {
const e = V.map.get(b.id), t = K[kkey(b)], c = feed()?.get(b.id);
const ql = e && Number.isFinite(e.time) ? { src: 'ql', alive: e.alive, E: e.alive ? e.time : e.time - b.cyc, start: e.time, end: e.time + WIN } : null;
const mine = t && now < t + b.cyc + WIN + KEEP ? { src: 'vos', E: t, start: t + b.cyc, end: t + b.cyc + WIN } : null;
const cm = c && now < c.windowEnd + KEEP ? { src: 'com', E: c.killedAt, start: c.windowStart, end: c.windowEnd, c } : null;
let tm = ql;
for (const x of [mine, cm]) if (x && (!tm || x.E > tm.E + TOL)) tm = x;
if (!tm) return null;
tm.maint = MAINT ? mws(now).find(w => w.start > tm.E)?.start || 0 : 0;   // primer mantenimiento después del dato
tm.stale = MAINT && ((tm.maint && tm.maint <= now) || !!tm.c?.stale);
return tm;
}
export const state = (tm, now) => tm.stale ? 'stale' : tm.alive ? 'alive' : now < tm.start ? 'spawns' : tm.src !== 'ql' && now < tm.end ? 'window' : 'due';
export function setKill(b, t) {
const s = KILLS.get(), now = Date.now();
for (const [k, v] of Object.entries(s.k)) { const x = BOSS.get(+k.split('|')[1]); if (!x || now > v + x.cyc + WIN + KEEP) delete s.k[k]; }
if (t == null) delete s.k[kkey(b)]; else s.k[kkey(b)] = t;
KILLS.set(s);
}
/* ---------- la consulta ---------- */
export const V = { live: null, map: new Map(), sig: '', err: null, busy: false, next: 0, fails: 0 };
const sigOf = j => JSON.stringify((j?.bosses || []).map(e => [e.id, e.alive, e.time]));
function setLive(j) {
V.live = j; V.map = new Map((j?.bosses || []).map(e => [e.id, e]));
const s = sigOf(j), ch = s !== V.sig;
V.sig = s;
return ch;
}
function loadLive() {
const l = store.get('hub-live', null);
setLive(l?.server === srv() && Date.now() - l.fetchedAt < DAY ? l : null);
V.err = null; V.fails = 0;
V.next = (V.live?.got || 0) + POLL;                     // otra pestaña recién consultó (o esta, antes de recargar): no se repite
}
export async function pull() {
const s = srv();
if (!s || V.busy) return;
V.busy = true;
V.next = Date.now() + POLL;
const res = await api(`/api/timers?server=${s}`);
let j = null;
if (res.r?.ok) try { j = JSON.parse(res.txt); } catch { /* abajo: como caído */ }
const err = j?.bosses ? (j.stale ? 'stale' : null) : res.fail === 'TypeError' && await lnaBlocked() ? 'lna' : 'down';
V.busy = false;
if (s !== srv()) return;                                // cambió el server mientras esperaba
V.fails = err === 'down' || err === 'lna' ? V.fails + 1 : 0;
if (V.fails) V.next = Date.now() + (BACKOFF[V.fails - 1] || POLL);
const was = V.err;
V.err = err;
let changed = false;
if (j?.bosses) {
changed = setLive({ ...j, got: Date.now() });
store.set('hub-live', V.live);                        // siempre también (no se sincroniza): las otras pestañas toman la edad y got
if (changed) publish(Date.now());
}
emit('vivo', { changed, errChanged: was !== err });
plan();
}
/* ---------- quién consulta: una pestaña (lock), y solo si alguien lo ve o hay campanas de jefe ---------- */
const bossBells = () => Object.keys(bells()).some(k => k.startsWith('jefe:'));   // también las de una regla
const want = () => !!srv() && (!document.hidden || pipOpen() || bossBells());
let lead = !navigator.locks, pend = false, free = null, T = 0;
function plan() {
clearTimeout(T);
if (lead && want()) T = setTimeout(pull, Math.max(0, V.next - Date.now()));
}
function seat() {
if (navigator.locks) {
if (want() && !lead && !pend) {
pend = true;
navigator.locks.request('hub-vivo', () => {
pend = false;
if (!want()) return;                              // se ocultó mientras esperaba: lo suelta enseguida
lead = true;
plan();
return new Promise(r => { free = r; });
}).catch(() => { pend = false; lead = true; plan(); });
} else if (!want() && free) { free(); free = null; lead = false; }
}
plan();
}
/* ---------- a hub-timers ---------- */
let lastPub = null;
export function publish(now = Date.now(), K = KILLS.get().k) {
const pf = profile().faccion === 'asmodian' ? 'asmodian' : 'elyos', list = [];
const own = store.get('pets-owned', []), have = new Set(Array.isArray(own) ? own.map(String) : []), R = {};
for (const b of BOSSES) if (b.fac === pf) {
const r = [b.top && 'world', b.pets.some(p => !have.has(String(p))) && 'pets'].filter(Boolean);
if (r.length) R[bellId(b)] = r;
}
setRuled(R);
for (const b of BOSSES) {
const tm = timer(b, now, K);
if (!tm || tm.stale) continue;
const s = state(tm, now), w = b.top && b.fac === pf;   // los 4 importantes (equipo Unique) van a la tira y a Viene
if (!w && tm.src !== 'vos' && !getBell(bellId(b))) continue;
const end = tm.src === 'ql' && s !== 'spawns' ? (w && V.live ? Math.max(tm.end, V.live.fetchedAt + LIVE_VALID) : tm.end) : tm.end;
if (end <= now) continue;
const short = w ? /Gartua|Lagta|Dartan|Kashapa/ : null;
list.push({
id: bellId(b), label: b.name, labelEn: b.nameEn, ...(w ? { short: short.exec(b.name)?.[0], shortEn: short.exec(b.nameEn)?.[0] } : {}), start: tm.start, end, ...(tm.maint ? { until: tm.maint } : {}), href: ROOT + 'jefes/#b-' + b.id,
note: tpTxt(b.teleport), noteEn: tpTxt(b.teleportEn), pic: b.retrato, nowText: 'Ya debería estar', src: SRC_TXT[tm.src], ...(tm.src === 'com' ? { approx: true } : {}),
...(w ? { up: true } : {}), ...(s === 'alive' ? { liveText: 'vivo', alive: true } : tm.src === 'ql' ? { liveText: 'debería estar' } : {}),
...(R[bellId(b)] ? { rules: R[bellId(b)] } : {}),
});
}
const s = JSON.stringify(list);
if (s === lastPub) return;
lastPub = s;
if (s !== JSON.stringify(store.get('hub-timers', []))) setTimers(list);
}
/* ---------- arranque ---------- */
loadLive();
let lastSrv = srv();
on('profile', () => {                                     // el server cambia los datos; la facción, qué se publica
if (srv() !== lastSrv) { lastSrv = srv(); loadLive(); V.next = 0; }
publish();
seat();
});
on('bells', () => { publish(); seat(); });
on('structure', () => publish());
on('pip', seat);
on('store', k => { if (k === 'hub-kills' || k === 'hub-com-feed') publish(); });
onStore('hub-kills', () => publish());
onStore('hub-com-feed', () => publish());
onStore('pets-owned', () => publish());                  // regla "pet que me falta"
onStore('hub-live', () => {                               // consultó otra pestaña
const l = store.get('hub-live', null);
if (l?.server !== srv() || l.got === V.live?.got) return;
const changed = setLive(l);
V.next = l.got + POLL;
if (changed) publish();
emit('vivo', { changed });
plan();
});
document.addEventListener('visibilitychange', seat);
publish();
seat();
