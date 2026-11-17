import { $, $$, esc, ico, store, toast, modal, announce, gname, galt, gameLang } from './core.js?v=30d10ccdea';
let X;                                         // {nf, IC} que pasa personaje.js
export const init = ctx => { X = ctx; };
const VQ = new URL(import.meta.url).search;
const CDN = 'https://assets.playnccdn.com/static-aion2-gamedata/resources/';
const ARMORY = 'https://assets.playnccdn.com/static-aion2/characters/img/info/';
const QL_DIR = '%APPDATA%\\Questlog\\aion-2';
const GRADE_CLS = { 11: 'common', 21: 'rare', 31: 'epic', 41: 'unique', 51: 'legend', 71: 'special' };
const SLOTS = [['a', 'Attack', 'Ataque', 'title_icon_attack'], ['d', 'Defense', 'Defensa', 'title_icon_defense'], ['u', 'Etc', 'Otros', 'title_icon_etc']];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const PROG = { genus: 'Razas en nivel 10', skins: 'Apariencias', wings: 'Alas', pets: 'Mascotas' };
const gimg = (n, sz, cls = '', base = CDN) => n ? `<img class="${cls}" src="${X.IC}${esc(n)}.webp" data-fb="${esc(base + n)}.png" width="${sz}" height="${sz}" loading="lazy" decoding="async" alt="" referrerpolicy="no-referrer">` : '';
/* ---------- datos ---------- */
let P = null;
const load = () => P ||= Promise.all(['titulos.json', 'logros.json'].map(f => fetch(new URL('./' + f + VQ, import.meta.url)).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })))
.then(([T, L]) => {
const cols = T.cols, titles = T.titles.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
return { T, L, titles, byId: new Map(titles.map(t => [t.id, t])) };
}, e => { P = null; throw e; });
/* ---------- guardado por personaje ---------- */
const keyOf = (s, n) => `hub-logros-${s}:${String(n).toLowerCase().replace(/[^a-z0-9]/g, c => '_' + c.codePointAt(0).toString(36))}`;
const saved = ref => store.get(keyOf(ref.s, ref.n), {}) || {};
const save = (ref, v) => store.set(keyOf(ref.s, ref.n), v);
export function parseFile(j) {
const n = a => Array.isArray(a) ? a.length : null;
return Object.values(j?.characters || {}).filter(c => c && c.self && c.name && !String(c.name).startsWith('$') && Array.isArray(c.ownedTitles))
.map(c => ({ s: +c.server, n: String(c.name), f: {
t: c.ownedTitles.map(Number).filter(Number.isFinite), d: (c.pantheon || []).map(p => +p?.deco).filter(Boolean),
w: n(c.wings), sk: n(c.skins), p: n(c.pets), g: (c.genus || []).map(g => +g?.level || 0), at: +c.savedAt || +c.updatedAt || Date.now(),
} }));
}
/* ---------- estado: qué tenés y de dónde sale ---------- */
function state(c, D) {
const st = saved(c.ref), f = st.f || null, man = st.m || {}, race = c.ref.f === 'asmodian' ? 'd' : 'l';
const eq = c.d.titles?.equipped || [];
const fileT = new Set(f?.t || []), offT = new Set(eq.map(t => +t.id)), deco = new Set(f?.d || []);
const petsLS = (store.get('pets-owned', null) || null)?.length ?? null;       // reutiliza la colección de Pets si no hay archivo
const prog = { genus: f?.g?.length ? f.g.filter(l => l >= 10).length : null, skins: f?.sk ?? null, wings: f?.w ?? null, pets: f?.p ?? petsLS };
const progSrc = { pets: f?.p != null ? 'archivo' : petsLS != null ? 'pets' : null };
const mine = t => t.race === race || t.race === 'a';
const how = e => {
if (e.titles?.some(id => offT.has(id))) return 'oficial';
if (e.titles?.some(id => fileT.has(id))) return 'titulo';
if (e.deco?.some(d => deco.has(d))) return 'estatua';
return man[e.id] ? 'vos' : null;
};
const titleOf = e => (e.title || []).map(id => D.byId.get(id)).find(t => t && mine(t)) || null;
const owned = t => offT.has(t.id) || fileT.has(t.id);
return { f, man, race, eq, prog, progSrc, how, titleOf, owned, mine };
}
/* ---------- formato ---------- */
const lang = () => gameLang() === 'en' ? 'en' : 'es';
const num = v => new Intl.NumberFormat(lang() === 'en' ? 'en-US' : 'es-AR', { maximumFractionDigits: 2 }).format(v);
function stat(D, k, v) {
const s = D.T.stats[k];
if (!s) return `${k} +${v}`;
return `${gname({ name: s[0], nameEn: s[1] })} +${num(s[2] ? v / 100 : v)}${s[2] === 1 ? '%' : ''}`;   // 1: ÷100 con %, 2: ÷100 sin % (vigor)
}
const stats = (D, o) => Object.entries(o || {}).sort((a, b) => (D.T.stats[b[0]]?.[2] === 1) - (D.T.stats[a[0]]?.[2] === 1)).map(([k, v]) => stat(D, k, v));
const achTxt = (e, race) => {
const a = race === 'd' && e.achAsmo ? gname({ name: e.achAsmo, nameEn: e.achAsmoEn }) : gname(e, 'ach');
return a ? `${a}${e.steps > 1 ? ' ' + ROMAN[e.step] : ''}` : '';
};
const bar = (v, of, label) => `<span class="lg-bar" role="img" aria-label="${esc(`${label}: ${v} de ${of}`)}"><i style="--w:${Math.min(100, Math.round(v / of * 100))}%"></i></span>`;
const HOW = { oficial: 'Detectado: lo tenés equipado', titulo: 'Detectado: tenés el título', estatua: 'Detectado: está en tu Panteón', vos: 'Lo marcaste vos' };
const check = (id, h, what = 'Ya lo tengo') => h && h !== 'vos'
? `<span class="lg-det" title="${esc(HOW[h])}">${ico('i-check')}${h === 'estatua' ? 'Puesta' : 'Detectado'}</span>`
: `<button type="button" class="lg-ck" data-lgck="${esc(id)}" aria-pressed="${h === 'vos'}">${ico('i-check')}${h === 'vos' ? 'Hecho' : what}</button>`;
/* ---------- vista ---------- */
let OPEN = { all: false, cat: '', miss: false };
export async function view(box, c) {
box.innerHTML = '<p class="pj-load"><span class="pj-spin" aria-hidden="true"></span>Cargando títulos y logros…</p>';
let D;
try { D = await load(); } catch { box.innerHTML = '<p class="tip-err">No pude cargar los títulos y logros. Revisá la conexión y recargá la página.</p>'; return; }
if (!box.isConnected) return;
paint(box, c, D);
}
function paint(box, c, D) {
const S = state(c, D), { L } = D, ref = c.ref;
const ti = c.d.titles || {}, cats = ti.categories || [];
const ownBy = slot => S.f ? D.titles.filter(t => t.slot === slot && S.mine(t) && S.owned(t)).length : null;
const rings = SLOTS.map(([slot, cat, es, icon]) => {
const off = cats.find(x => x.category === cat), have = off?.owned ?? ownBy(slot), of = off?.total ?? D.T.cats[{ a: 'attack', d: 'defense', u: 'utility' }[slot]];
const eq = S.eq.find(t => t.category === cat), ct = eq && D.byId.get(+eq.id);
const name = ct ? gname(ct) : eq ? gname(eq) : '', q = have != null ? Math.round(have / of * 100) : 0;
const ef = ct ? stats(D, ct.equip) : eq ? gname(eq, 'effects') || [] : [], own = ct ? stats(D, ct.own) : eq ? gname(eq, 'ownedEffects') || [] : [];
return `<li class="lg-r" data-cat="${slot}">
<span class="lg-rr" style="--q:${q}">${gimg(icon, 34, 'lg-ri', ARMORY)}</span>
<span class="lg-rt"><b>${esc(es)}</b><small>${have != null ? `${have} de ${of}` : `${of} en total`}</small></span>
<span class="lg-re${ct ? ' g-' + GRADE_CLS[ct.grade] : ''}">${eq ? `<b class="lg-en">${esc(name)}</b><small>${esc(ef.join(' · '))}</small>${own.length ? `<small class="lg-own">Siempre: ${esc(own.join(' · '))}</small>` : ''}` : '<small>Sin título equipado</small>'}</span></li>`;
}).join('');
const imp = L.important.filter(e => !(e.title && !S.titleOf(e)));
const pend = imp.filter(e => !S.how(e) && !S.man[e.id]);
const top = pend.slice(0, 6), done = imp.length - pend.length;
const card = e => {
const t = S.titleOf(e), nm = t ? gname(t) : gname(e), alt = t ? galt(t) : galt(e);
const gives = e.kind === 'statue' ? stats(D, e.stats) : t ? stats(D, t.equip).slice(0, 3) : [];
const always = t ? stats(D, t.own) : [];
const extra = (e.gives || []).filter(g => !/^Título/.test(g.name));
const pv = e.prog && S.prog[e.prog.src], g = e.prog?.goal;
const claim = pv != null && pv >= g;
const how = achTxt(e, S.race), goal = gname(e, 'goal');
return `<li class="lg-c t${e.tier}" data-lg="${esc(e.id)}">
${gimg(e.kind === 'statue' && S.race === 'd' && e.id === 'kibelisk' ? 'icon_AD_statueS_D_c_TeleportArtifact_D_01' : e.icon, 52, 'lg-ci')}
<div class="lg-cb">
<b class="lg-cn${t ? ' g-' + GRADE_CLS[t.grade] : ''}">${esc(nm)}</b>${alt ? `<small class="lg-alt">${esc(alt)}</small>` : ''}
<ul class="lg-gv">${gives.map(x => `<li>${esc(x)}</li>`).join('')}${always.length ? `<li class="lg-al">Siempre: ${esc(always.join(' · '))}</li>` : ''}${extra.length ? `<li class="lg-x">${extra.map(x => gimg(x.icon, 18, 'lg-xi') + esc(`${x.qty > 1 ? x.qty + ' × ' : ''}${gname(x)}`)).join(' ')}</li>` : ''}</ul>
<p class="lg-how">${how ? `<b>${esc(how)}</b>: ` : ''}${esc(goal)}</p>
${pv != null ? `<div class="lg-pg${claim ? ' ok' : ''}">${bar(pv, g, PROG[e.prog.src])}<small>${claim ? '¡Ya cumplís! Reclamalo en el Diario y usá el ítem de título.' : `${PROG[e.prog.src]}: ${X.nf(pv)} de ${X.nf(g)}`}${e.scope === 'server' ? ' <em class="tag">compartido en el server</em>' : ''}${S.progSrc[e.prog.src] === 'pets' ? ' <em class="tag">de tu colección en Pets</em>' : ''}</small></div>` : ''}
<small class="lg-why">${esc(e.why)}${e.season ? ' <em class="tag">temporada</em>' : ''}</small>
</div>
${check(e.id, S.how(e))}</li>`;
};
const odDone = L.od.filter(o => S.how(o)), odN = odDone.reduce((s, o) => s + o.qty, 0), odOf = L.od.reduce((s, o) => s + o.qty, 0);
const odRows = L.od.map(o => { const h = S.how(o); return `<li class="lg-or${h ? ' on' : ''}" data-od="${esc(o.id)}"><span><b>${esc(achTxt(o, S.race))}</b><small>${esc(gname(o, 'goal'))}</small></span>${check(o.id, h, `+${o.qty}`)}</li>`; }).join('');
const pan = L.pantheon.map(p => { const h = S.how(p); return `<li class="lg-p${h ? ' on' : ''}" data-pan="${esc(p.id)}">${gimg(S.race === 'd' && p.id === 'kibelisk' ? 'icon_AD_statueS_D_c_TeleportArtifact_D_01' : p.icon, 44, 'lg-pi')}
<span class="lg-pb"><b>${esc(gname(p))}</b><small class="lg-ps">${esc(stats(D, p.stats).join(' · '))}</small><small>${esc(achTxt(p, S.race))}: ${esc(gname(p, 'goal'))}</small></span>${check(p.id, h, 'La tengo')}</li>`; }).join('');
const panN = L.pantheon.filter(p => S.how(p)).length;
const nMan = Object.keys(S.man).length, fAt = S.f?.at;
const src = `<ul class="lg-src" aria-label="De dónde sale lo que ves">
<li class="${ti.owned != null ? 'on' : ''}"><em class="tag c-oficial">Oficial</em>${ti.owned != null ? `${X.nf(ti.owned)} de ${X.nf(ti.total)} títulos y los ${S.eq.length} equipados` : 'La ficha oficial no trae títulos'}</li>
<li class="${S.f ? 'on' : ''}"><em class="tag">Tu archivo</em>${S.f ? `cargado ${ago(fAt)} · <button type="button" class="linkbtn" data-lgimp>Actualizar</button>` : `<button type="button" class="linkbtn" data-lgimp>Cargá tu archivo</button> para saber cuáles te faltan`}</li>
<li class="${nMan ? 'on' : ''}"><em class="tag">Vos</em>${nMan ? `${nMan} marcado${nMan > 1 ? 's' : ''} a mano` : 'Marcá lo que ya hiciste'}</li></ul>`;
box.innerHTML = `<section class="pj-sec lg" aria-labelledby="lg-h"><h3 id="lg-h" class="pj-h">Títulos y logros <small>de ${esc(ref.n)}</small></h3>
${src}
<ul class="lg-rs" aria-label="Títulos por categoría">${rings}</ul>
<h4 class="pj-h4 lg-h4">${S.f || nMan ? 'Te faltan estos importantes' : 'Los importantes'} <small>${S.f ? `tenés ${done} de ${imp.length}` : 'sin tu archivo no sé cuáles tenés: marcá los que ya hiciste'}</small></h4>
${top.length ? `<ol class="lg-cs">${top.map(card).join('')}</ol>` : `<p class="pj-empty">${ico('i-check')}Tenés todos los importantes que conocemos. Fantástico.</p>`}
<div class="lg-2">
<section class="lg-od" aria-labelledby="lg-od-h"><h4 id="lg-od-h" class="pj-h4">Od radiante de logros</h4>
<p class="lg-odn">${gimg(L.odIcon, 44, 'lg-odi')}<b id="lg-odc">${odN} de ${odOf}</b><span>${bar(odN, odOf, 'Od radiante')}<small>${odDone.length} de ${L.od.length} pasos · 2 por paso, una vez por personaje</small></span></p>
<details class="lg-odl"><summary>Los ${L.od.length} pasos que lo dan</summary><ul>${odRows}</ul></details></section>
<section class="lg-pan" aria-labelledby="lg-pan-h"><h4 id="lg-pan-h" class="pj-h4">Panteón <small>${panN} de ${L.pantheon.length} · stats divinos permanentes</small></h4><ul>${pan}</ul></section>
</div>
<details class="lg-all" id="lg-all"${OPEN.all ? ' open' : ''}><summary><b>Todos los títulos</b> <small>${S.f ? `${D.titles.filter(t => S.mine(t) && S.owned(t)).length} de ` : ''}${D.titles.filter(S.mine).length} de tu facción</small></summary><div class="lg-allb"></div></details>
</section>`;
if (OPEN.all) paintAll(box, c, D, S);
box.onclick = e => act(e, box, c, D);
$('#lg-all', box).ontoggle = e => { OPEN.all = e.target.open; if (OPEN.all) paintAll(box, c, D, state(c, D)); };
}
function ago(t) {
const m = Math.max(0, Math.round((Date.now() - (t || 0)) / 60e3));
return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`;
}
function paintAll(box, c, D, S) {
const b = $('.lg-allb', box);
if (!b) return;
const L = D.titles.filter(t => S.mine(t) && (!OPEN.cat || t.slot === OPEN.cat) && (!OPEN.miss || !S.owned(t)));
b.innerHTML = `<div class="lg-f"><div class="seg" role="group" aria-label="Categoría">${[['', 'Todos'], ...SLOTS.map(s => [s[0], s[2]])].map(([k, l]) => `<button type="button" data-lgcat="${k}" aria-pressed="${OPEN.cat === k}">${l}</button>`).join('')}</div>
<button type="button" class="btn ghost lg-miss" data-lgmiss aria-pressed="${OPEN.miss}"${S.f ? '' : ' disabled title="Necesita tu archivo"'}>${ico('i-check')}Solo los que me faltan</button>${S.f ? '' : '<small>Para filtrar los que te faltan, cargá tu archivo.</small>'}</div>
<p class="lg-n" aria-live="polite">${L.length} título${L.length === 1 ? '' : 's'}</p>
<ul class="lg-tl">${L.map(t => `<li class="lg-t${S.owned(t) ? ' on' : ''}" data-tid="${t.id}"><span class="lg-tn g-${GRADE_CLS[t.grade]}"><b>${esc(gname(t))}</b>${galt(t) ? `<small>${esc(galt(t))}</small>` : ''}</span>
<span class="lg-te">${esc(stats(D, t.equip).join(' · '))}${Object.keys(t.own).length ? `<small>Siempre: ${esc(stats(D, t.own).join(' · '))}</small>` : ''}</span>
<small class="lg-th">${esc(gname(t, 'how'))}</small>${S.f ? `<span class="lg-ts">${S.owned(t) ? ico('i-check') + '<span class="sr">Lo tenés</span>' : '<span class="sr">Te falta</span>'}</span>` : ''}</li>`).join('')}</ul>`;
}
/* ---------- acciones ---------- */
function act(e, box, c, D) {
const t = e.target;
const ck = t.closest('[data-lgck]');
if (ck) {
const v = saved(c.ref), m = { ...(v.m || {}) }, id = ck.dataset.lgck;
if (m[id]) delete m[id]; else m[id] = 1;
save(c.ref, { ...v, m });
paint(box, c, D);
$(`[data-lgck="${CSS.escape(id)}"]`, box)?.focus();
announce(m[id] ? 'Marcado como hecho' : 'Desmarcado');
return;
}
if (t.closest('[data-lgimp]')) return importModal(box, c, D);
const cat = t.closest('[data-lgcat]');
if (cat) { OPEN.cat = cat.dataset.lgcat; paintAll(box, c, D, state(c, D)); $(`[data-lgcat="${OPEN.cat}"]`, box)?.focus(); return; }
if (t.closest('[data-lgmiss]')) { OPEN.miss = !OPEN.miss; paintAll(box, c, D, state(c, D)); $('[data-lgmiss]', box)?.focus(); }
}
function importModal(box, c, D) {
const win = /win/i.test(navigator.userAgentData?.platform || navigator.platform || '');
const before = store.get('pets-questlog-sync', 0) ? 'Es el mismo archivo que ya cargaste en Pets. ' : '';
const node = document.createElement('div');
node.className = 'ql lg-ql';
node.innerHTML = `<p class="lead">${before}Si usás la app de DPS en esta PC, tus títulos y tu Panteón ya están en un archivo, <b>characters.json</b>. Se lee en tu navegador, no se sube nada.</p>
${win ? `<details class="ql-help"><summary>¿No lo encontrás?</summary><ol class="lg-steps"><li>Copiá la carpeta: <span class="ql-path"><code id="lg-dir">${esc(QL_DIR)}</code><button type="button" class="btn ghost" data-lgcopy>Copiar carpeta</button></span></li>
<li>Tocá <b>Elegir archivo</b> y pegala en la barra de arriba (<kbd>Ctrl</kbd>+<kbd>V</kbd>, Enter).</li><li>Doble clic en <b>characters.json</b>.</li></ol></details>`
: '<p class="hint">La app de DPS es solo para Windows. Si tenés el archivo igual, elegilo.</p>'}
<p class="ql-st" role="status"></p>
<div class="ql-act"><button type="button" class="btn gold" data-lgpick>${ico('i-upload')}Elegir archivo</button></div>
<input type="file" id="lg-file" accept=".json,application/json" hidden>`;
const st = $('.ql-st', node), fi = $('#lg-file', node);
node.addEventListener('click', e => {
if (e.target.closest('[data-lgpick]')) fi.click();
else if (e.target.closest('[data-lgcopy]')) (navigator.clipboard ? navigator.clipboard.writeText(QL_DIR) : Promise.reject()).then(
() => { st.textContent = 'Carpeta copiada. Ahora tocá Elegir archivo y pegala en la barra de arriba.'; },
() => { getSelection().selectAllChildren($('#lg-dir', node)); st.textContent = 'No pude copiar: la ruta quedó seleccionada, copiala con Ctrl+C.'; });
});
fi.addEventListener('change', async () => {
const f = fi.files[0];
fi.value = '';
if (!f) return;
let list = [];
try { list = parseFile(JSON.parse(await f.text())); } catch { /* abajo */ }
if (!list.length) { st.innerHTML = 'Ese archivo no trae títulos de ningún personaje. Es <b>characters.json</b>, en la carpeta de arriba.'; return; }
for (const x of list) { const ref = { s: x.s, n: x.n }; save(ref, { ...saved(ref), f: x.f }); }
node.closest('dialog')?.close();
const me = list.find(x => x.s === c.ref.s && x.n.toLowerCase() === c.ref.n.toLowerCase());
paint(box, c, D);
toast(`Cargué los títulos de ${list.length} personaje${list.length > 1 ? 's' : ''}: <b>${list.map(x => esc(x.n)).join(', ')}</b>.${me ? '' : ` <b>${esc(c.ref.n)}</b> no está en el archivo: abrí la app de DPS con ese personaje y volvé a cargarlo.`}`, { ms: 9000 });
});
modal({ title: 'Tus títulos desde la app de DPS', node, cls: 'ql-modal' });
}
