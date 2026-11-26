import {
$, esc, ico, on, emit, onStore, bind, fmtClock, fmtLeft, leftNext, nextReset, nextOcc, currentOcc, isLive, statusText, toast, modal, evPic,
characters, taskList, taskDone, setTaskDone, taskProgress, PJ, TK, profile, serverName, registerKey, confOf, confTag, clockLeft, gname, gclass, HOUR,
setTimers, bellButton, ROOT, MIN, OD, odyle, DATA, dm, TASKS, taskOn,
} from './core.js';
const odBell = ch => 'odyle:' + ch;
function pubOdyle(now) {
const { list } = characters(), D = OD.get().c, many = list.length > 1, out = [];
for (const c of list) {   // oculta para un personaje (hidePj): ese no avisa
const t = taskList(c.id).find(x => x.meter), s = t && D[c.id], o = s && odyle(t.meter, s, now);
if (!o?.full) continue;                          // sin anotar o ya llena: nada que avisar
const pj = many ? ` · ${c.name}` : '';
out.push({ id: odBell(c.id), label: t.name + pj, labelEn: (t.nameEn || t.name) + pj, start: o.full, end: o.full + 30 * MIN, bell: true,
href: ROOT + 'tareas/#t-' + t.id, icon: t.icon, nowText: 'Llegó al tope', liveText: 'llena' });
}
setTimers(out, 'odyle');
}
const PER = { daily: { t: 'Diarias', when: 'reset diario' }, weekly: { t: 'Semanales', when: 'reset del miércoles' } };
let editing = false;
const uid = () => Math.random().toString(36).slice(2, 9);
const saveTK = o => { const r = TK.set(o); emit('tasks'); return r; };
const setHtml = (el, h) => { if (el._h !== h) { el.innerHTML = h; el._h = h; } };
function paint() {
const now = Date.now(), { list, activo } = characters(), focusId = document.activeElement?.id;
setHtml($('#pj-tabs'), list.map(c => { const d = taskProgress(c.id, now).daily, all = d.total && d.done >= d.total, k = d.total - d.done;
return `<button type="button" data-pj="${esc(c.id)}" aria-pressed="${c.id === activo}"><span class="pj-nm">${esc(c.name)}</span>${c.clase ? `<small>${esc(gclass(c.clase))}</small>` : ''}<span class="pj-p${all ? ' all' : ''}" title="${k > 0 ? `Falta${k > 1 ? 'n' : ''} ${k} diaria${k > 1 ? 's' : ''}` : 'Diarias listas'}">${all ? ico('i-check') : ''}${d.done}/${d.total}</span>${editing && c.id !== 'main' ? `<span class="pj-x" data-pjdel="${esc(c.id)}" role="button" tabindex="0" aria-label="Quitar ${esc(c.name)}">${ico('i-x')}</span>` : ''}</button>`; }).join(''));
for (const per of ['daily', 'weekly']) paintGroup(per, activo, now);
pubOdyle(now);
setHtml($('#tk-pie'), pie());
$('#tk-edit').setAttribute('aria-pressed', String(editing));
document.body.classList.toggle('tk-editing', editing);
if (focusId) document.getElementById(focusId)?.focus();
}
function paintGroup(per, ch, now) {
const g = $('#g-' + per), items = taskList(ch).filter(t => t.period === per), done = taskDone(ch, per, now);
const req = items.filter(t => !t.optional), n = req.filter(t => (done[t.id] || 0) >= (t.count || 1)).length;
const met = items.filter(t => t.meter), opt = items.filter(t => t.optional && !t.meter);
const pct = req.length ? Math.round(n / req.length * 100) : 0, rs = nextReset(per, now);
setHtml(g, `<div class="tk-h"><h2 id="h-${per}">${PER[per].t}</h2><span class="tk-n"><b>${n}</b>/${req.length}</span>
<span class="tk-r">se limpian en <span class="cd" id="rs-${per}"></span> <small>${fmtClock(rs, { now })}</small></span></div>
<div class="bar" role="progressbar" aria-label="${PER[per].t} hechas" aria-valuemin="0" aria-valuemax="${req.length}" aria-valuenow="${n}"><i style="--w:${pct}%"></i></div>
<ul class="tk-list">${req.map(t => row(t, per, done)).join('')}${met.map(t => meterRow(t, ch)).join('')}${opt.length ? `<li class="tk-sep">Si te sobra tiempo</li>${opt.map(t => row(t, per, done)).join('')}` : ''}${items.length ? '' : '<li class="tk-empty">Sin tareas. Sumá una con el lápiz.</li>'}</ul>${hiddenList(per, ch)}${juegoList(per, items)}
<form class="tk-add" data-per="${per}"><input type="text" name="n" maxlength="60" placeholder="Nueva tarea ${per === 'daily' ? 'diaria' : 'semanal'}" aria-label="Nueva tarea ${per === 'daily' ? 'diaria' : 'semanal'}" required><input type="number" name="v" min="1" max="99" step="1" inputmode="numeric" placeholder="veces" aria-label="Veces (opcional)"><button class="btn">${ico('i-plus')}Agregar</button></form>`);
bind($('#rs-' + per), n2 => [fmtLeft(rs - n2), n2 + leftNext(rs - n2)]);
for (const t of met) {   // estimado y "se llena en": cambian solos con el reloj (bind), el HTML no
const s = OD.get().c[ch], v = $(`#od-v-${CSS.escape(t.id)}`), f = $(`#od-f-${CSS.escape(t.id)}`);
const li = g.querySelector(`.tk-meter[data-t="${CSS.escape(t.id)}"]`), old = li?.querySelector('.bell'), want = s && odBell(ch);
if (li && old?.dataset.bell !== want) { old?.remove(); if (want) li.querySelector('.tk-del').before(bellButton(want, `${gname(t)} llena`, { lead: 15 })); }
if (!s || !v || !f) continue;
bind(v, n2 => { const o = odyle(t.meter, s, n2); return [`~${o.v}/${o.cap}`, o.full && o.next]; });
bind(f, n2 => { const o = odyle(t.meter, s, n2); return o.full ? [`se llena en ${fmtLeft(o.full - n2)} · ${fmtClock(o.full, { now: n2 })}`, n2 + Math.min(leftNext(o.full - n2), 60000)] : [`llena (tope ${o.cap})`, 0]; });
}
for (const t of items) if (t.event) {
const el = $(`#ev-${per}-${CSS.escape(t.id)}`), o = currentOcc(t.event, now) || nextOcc(t.event, now);
if (el && o) { const cl = clockLeft(o.start); el.classList.toggle('pronto', o.start - now < 2 * HOUR); bind(el, n2 => isLive(o, n2) ? statusText(o, n2) : cl(n2)); }
}
}
function hiddenList(per, ch) {
const T = TK.get(), mine = T.hidePj[ch] || [], { list } = characters(), many = list.length > 1, who = list.find(c => c.id === ch)?.name || '';
const H = [...TASKS.items, ...T.custom].filter(t => t.period === per && (T.hidden.includes(t.id) || mine.includes(t.id)));
return H.length ? `<div class="tk-hid"><p class="tk-sep">Ocultas (${H.length})</p><ul>${H.map(t => `<li><span>${esc(gname(t))}${many ? ` <small>${T.hidden.includes(t.id) ? 'en todos' : 'solo en ' + esc(who)}</small>` : ''}</span><button type="button" class="btn ghost" data-show="${esc(t.id)}" aria-label="Mostrar ${esc(gname(t))}">Mostrar</button></li>`).join('')}</ul></div>` : '';
}
function juegoList(per, items) {
const X = TASKS.extras.filter(t => t.period === per && taskOn(t) && !items.some(x => x.id === t.id));
return X.length ? `<button type="button" class="linkbtn tk-jgmas" data-jgopen="${per}">+ ${X.length} del juego</button><div class="tk-jg"><p class="tk-sep">Del juego</p><ul>${X.map(t => `<li data-jg="${esc(t.id)}"><span>${esc(gname(t))}<small title="Fuente: ${esc(t.source)}">${esc(gname(t, 'detail'))}</small></span><button type="button" class="btn ghost" data-addx="${esc(t.id)}" aria-label="Sumar ${esc(gname(t))}">Sumar</button></li>`).join('')}</ul></div>` : '';
}
function addExtra(id) {
const t = TK.get(), ch = active();
saveTK({ ...t, addPj: { ...t.addPj, [ch]: [...(t.addPj?.[ch] || []), id] } });
paint();
document.getElementById('t-' + id)?.focus();
}
function showTask(id) {
const t = TK.get(), ch = active(), hp = { ...t.hidePj, [ch]: (t.hidePj[ch] || []).filter(x => x !== id) };
if (!hp[ch].length) delete hp[ch];
saveTK({ ...t, hidden: t.hidden.filter(x => x !== id), hidePj: hp });
paint();
document.getElementById('t-' + id)?.focus();
}
const lvOf = t => t.custom ? 'oficial' : t.unverified?.length ? 'sin' : confOf(t);
const old = DATA.rev?.tareas?.client < DATA.rev?.tareas?.patch && DATA.rev.tareas;
const pie = () => `${taskList().some(t => lvOf(t) === 'sin') ? '<span><i class="cfl c-sin"></i>sin confirmar: tocá el punto</span>' : ''}<span>${old ? `Números al ${dm(old.client)}: el parche del ${dm(old.patch)} puede haber cambiado alguno.` : 'Cantidades y horarios: datos del juego.'}</span>`;
const nowrapEnd = (txt, tail) => { const s = String(txt || ''), i = s.lastIndexOf(' '); return tail ? `${esc(s.slice(0, i + 1))}<span class="nw">${esc(s.slice(i + 1))}${tail}</span>` : esc(s); };
function row(t, per, done) {
const v = done[t.id] || 0, max = t.count || 1, ok = v >= max, id = `t-${esc(t.id)}`;
const tags = [t.custom && '<em class="tag gold">tuya</em>'].filter(Boolean).join('');
const lv = lvOf(t);
const conf = lv === 'sin' ? confTag(t, { lv, note: (t.unverified || []).join(' · '), dot: true }) : '';
const ctrl = max > 1
? `<span class="tk-step" role="group" aria-label="${esc(gname(t))}: ${v} de ${max}"><button type="button" class="iconbtn" data-dec="${esc(t.id)}" aria-label="Una menos"${v ? '' : ' disabled'}>${ico('i-minus')}</button><output id="${id}" tabindex="-1">${v}/${max}</output><button type="button" class="iconbtn" data-inc="${esc(t.id)}" aria-label="Una más"${ok ? ' disabled' : ''}>${ico('i-plus')}</button></span>`
: `<input type="checkbox" id="${id}" data-chk="${esc(t.id)}"${ok ? ' checked' : ''}>`;
return `<li class="tk-row${ok ? ' ok' : ''}${t.optional ? ' opt' : ''}" data-t="${esc(t.id)}" data-per="${per}">
${max > 1 ? '' : ctrl}<label class="tk-txt" ${max > 1 ? '' : `for="${id}"`}>${evPic(t, 80, 'tk-ic', 36) || ico('i-tareas', 'tk-ic')}<span class="tk-name">${esc(gname(t))}${tags}</span>${t.detail || conf ? `<small${t.source ? ` title="Fuente: ${esc(t.source)}"` : ''}>${nowrapEnd(gname(t, 'detail'), conf)}</small>` : ''}</label>
${t.event ? `<span class="tk-ev cd" id="ev-${per}-${esc(t.id)}"></span>` : ''}${max > 1 ? ctrl : ''}
<button type="button" class="iconbtn tk-del" data-del="${esc(t.id)}" aria-label="Quitar ${esc(gname(t))}" title="${t.custom ? 'Borrar' : 'Ocultar'}">${ico('i-trash')}</button></li>`;
}
function meterRow(t, ch) {
const s = OD.get().c[ch], id = esc(t.id), nm = esc(gname(t));
return `<li class="tk-row tk-meter" data-t="${id}" data-per="${t.period}">
<label class="tk-txt" for="t-${id}">${evPic(t, 80, 'tk-ic', 36) || ico('i-tareas', 'tk-ic')}<span class="tk-name">${nm}</span><small title="${esc(gname(t, 'detail'))} · Fuente: ${esc(t.source || '')}">${s ? `<span class="cd" id="od-f-${id}"></span>` : esc(gname(t, 'detail'))}${lvOf(t) === 'sin' ? confTag(t, { lv: 'sin', note: t.unverified.join(' · '), dot: true }) : ''}</small></label>
<span class="tk-step"><button type="button" class="btn ghost tk-od" id="t-${id}" data-od="${id}" title="Anotar cuánta tenés">${s ? `<span id="od-v-${id}"></span>` : 'Anotar'}</button></span>
<button type="button" class="iconbtn tk-del" data-del="${id}" aria-label="Quitar ${nm}" title="Ocultar">${ico('i-trash')}</button></li>`;
}
async function odModal(t) {
const ch = active(), D = OD.get(), s = D.c[ch], m = t.meter, box = document.createElement('div');
const sub = s ? s.sub : Object.values(D.c).some(x => x.sub);   // la suscripción del último que anotaste
box.innerHTML = `<label>¿Cuánta tenés ahora?<input type="number" id="od-n" min="0" max="${m.max}" inputmode="numeric" value="${s ? odyle(m, s, Date.now()).v : ''}"></label>
<label class="chk" style="margin-top:12px"><input type="checkbox" id="od-s"${sub ? ' checked' : ''}> <span>Tengo suscripción (tope ${m.capSub})</span></label>
<p class="hint" style="margin-top:10px">Con eso calculo cuánta vas a tener: ${esc(gname(t, 'detail'))}.</p>`;
setTimeout(() => $('#od-n', box)?.select(), 30);
box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'od-n') { e.preventDefault(); box.closest('form').querySelector('.btn.gold').click(); } });
const ok = await modal({ title: gname(t), node: box, actions: [{ label: 'Cancelar', value: null }, { label: 'Guardar', value: 'ok', primary: true }] });
const e = parseInt($('#od-n', box).value, 10);
if (ok !== 'ok' || !(e >= 0)) return;
D.c = { ...D.c, [ch]: { e: Math.min(m.max, e), at: Date.now(), sub: $('#od-s', box).checked } };
OD.set(D);
paint();
document.getElementById('t-' + t.id)?.focus();
}
/* ---------- acciones ---------- */
const active = () => characters().activo;
const set = (per, id, val) => setTaskDone(active(), per, id, val);
document.addEventListener('change', e => {
const c = e.target.closest('[data-chk]');
if (!c) return;
set(c.closest('[data-per]').dataset.per, c.dataset.chk, c.checked ? 1 : 0);
});
$('#tk-cols').addEventListener('click', e => {
const ax = e.target.closest('[data-addx]');
if (ax) { addExtra(ax.dataset.addx); return; }
const jo = e.target.closest('[data-jgopen]');
if (jo) { editing = true; paint(); $(`#g-${jo.dataset.jgopen} [data-addx]`)?.focus(); return; }
const sh = e.target.closest('[data-show]');
if (sh) { showTask(sh.dataset.show); return; }
const b = e.target.closest('[data-inc],[data-dec],[data-del],[data-od]');
if (!b) return;
const li = b.closest('[data-t]'), per = li.dataset.per, id = li.dataset.t;
if (b.dataset.del) { removeTask(id); return; }
if (b.dataset.od) { odModal(taskList().find(x => x.id === id)); return; }
const t = taskList().find(x => x.id === id), v = taskDone(active(), per)[id] || 0;
set(per, id, Math.max(0, Math.min(t.count || 1, v + (b.dataset.inc ? 1 : -1))));
document.getElementById('t-' + id)?.focus();
});
$('#tk-cols').addEventListener('submit', e => {
e.preventDefault();
const f = e.target, name = f.n.value.trim(), v = +f.v.value;   // veces: 2 o más, contador; vacío o 1, casilla (sin count)
if (!name) return;
const t = TK.get();
t.custom = [...t.custom, { id: 'u-' + uid(), name, period: f.dataset.per, ...(v > 1 && { count: v }) }];
saveTK(t);
paint();
toast(`Sumé <b>${esc(name)}</b> a las ${f.dataset.per === 'daily' ? 'diarias' : 'semanales'}.`);
$(`#g-${f.dataset.per} .tk-add input`)?.focus();
});
function removeTask(id) {
const t = TK.get(), item = taskList().find(x => x.id === id), ch = active(), many = PJ.get().list.length > 1, nm = esc(gname(item));
const before = structuredClone(t), undo = { label: 'Deshacer', run: () => { saveTK(before); paint(); } };
const all = o => { if (item.custom) o.custom = o.custom.filter(x => x.id !== id); else o.hidden = [...o.hidden, id]; return o; };
if (item.extra) {   // "Del juego": sale de addPj de este personaje (vuelve a "Del juego"), sin claves vacías
const ap = { ...t.addPj, [ch]: t.addPj[ch].filter(x => x !== id) }, o = { ...t, addPj: ap };
if (!ap[ch].length) delete ap[ch];
if (!Object.keys(ap).length) delete o.addPj;
saveTK(o);
paint();
toast(`Quité <b>${nm}</b>.`, { action: undo });
return;
}
const allMsg = `${item.custom ? 'Borré' : 'Oculté'} <b>${nm}</b>${many ? ' en todos tus personajes' : ''}.`;
saveTK(many ? { ...t, hidePj: { ...t.hidePj, [ch]: [...(t.hidePj[ch] || []), id] } } : all(t));
paint();
if (!many) { toast(allMsg, { action: undo }); return; }
const who = characters().list.find(c => c.id === ch)?.name || '';
toast(`Oculté <b>${nm}</b> para <b>${esc(who)}</b>.`, { ms: 8000, action: [undo, { label: 'En todos', run: () => { saveTK(all(structuredClone(before))); paint(); toast(allMsg, { action: undo }); } }] });
}
$('#pj-tabs').addEventListener('click', e => {
const del = e.target.closest('[data-pjdel]');
if (del) { e.stopPropagation(); removeChar(del.dataset.pjdel); return; }
const b = e.target.closest('[data-pj]');
if (!b) return;
const p = PJ.get();
if (!p.list.length) return;
p.activo = b.dataset.pj;
PJ.set(p);
paint();
});
$('#pj-tabs').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.pjdel) { e.preventDefault(); removeChar(e.target.dataset.pjdel); } });
function addChars(chars) {
const p = PJ.get(), wasEmpty = !p.list.length, added = [];
for (const c of chars) {
if (p.list.some(x => x.name.toLowerCase() === c.name.toLowerCase() && (x.server ?? null) === (c.server ?? null))) continue;
const n = { id: 'c' + uid(), ...c };
p.list.push(n);
added.push(n);
}
if (!added.length) return added;
if (wasEmpty) {                                   // lo marcado en "Mi personaje" pasa al primero que sumás
const t = TK.get();
if (t.done.main) { t.done = { ...t.done, [added[0].id]: t.done.main }; delete t.done.main; }
if (t.addPj?.main) { t.addPj = { ...t.addPj, [added[0].id]: t.addPj.main }; delete t.addPj.main; }
if (t.done[added[0].id] || t.addPj?.[added[0].id]) TK.set(t);   // sin emit: PJ todavía no tiene al nuevo
const o = OD.get();
if (o.c.main) { o.c = { ...o.c, [added[0].id]: o.c.main }; delete o.c.main; OD.set(o); }
}
p.activo = added[0].id;
PJ.set(p);
return added;
}
$('#pj-add').onclick = async () => {
const pr = profile(), box = document.createElement('div');
box.innerHTML = `<label>Nombre<input type="text" id="pj-n" maxlength="24" autocomplete="off" required></label><p class="hint" style="margin-top:10px">Solo para separar las marcas de cada personaje. ${pr.server ? `Queda en ${esc(serverName(pr.server))}.` : ''}</p>
<p class="hint pj-ql-l">¿Usás la app de DPS? <button type="button" class="linkbtn" id="pj-ql">Traé tus personajes de ahí</button></p>`;
$('#pj-ql', box).onclick = () => { box.closest('dialog')?.close(); qlModal(); };
setTimeout(() => $('#pj-n', box)?.focus(), 30);
box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pj-n') { e.preventDefault(); box.closest('form').querySelector('.btn.gold').click(); } });
const ok = await modal({ title: 'Sumar personaje', node: box, actions: [{ label: 'Cancelar', value: null }, { label: 'Sumar', value: 'ok', primary: true }] });
const name = $('#pj-n', box).value.trim();
if (ok !== 'ok' || !name) return;
addChars([{ name, server: pr.server || null }]);
paint();
};
async function removeChar(id) {
const p = PJ.get(), c = p.list.find(x => x.id === id);
if (!c) return;
const ok = await modal({ title: `¿Quitar a ${c.name}?`, html: '<p class="hint">Se borran sus marcas de tareas.</p>', actions: [{ label: 'Cancelar', value: null }, { label: 'Quitar', value: 'ok', primary: true }] });
if (ok !== 'ok') return;
p.list = p.list.filter(x => x.id !== id);
if (p.activo === id) p.activo = p.list[0]?.id || null;
PJ.set(p);
const t = TK.get();
delete t.done[id];
delete t.hidePj[id];
if (t.addPj) { delete t.addPj[id]; if (!Object.keys(t.addPj).length) delete t.addPj; }
saveTK(t);
const o = OD.get();
if (o.c[id]) { delete o.c[id]; OD.set(o); }
paint();
}
const QL_DIR = '%APPDATA%\\Questlog\\aion-2';
const CLASE = { gladiator: 'Gladiador', templar: 'Templario', assassin: 'Asesino', ranger: 'Arquero', sorcerer: 'Hechicero', elementalist: 'Espiritualista', cleric: 'Clérigo', chanter: 'Cantor' };
const QL_FIGS = [
['Explorador con la carpeta de la app pegada en la barra de arriba', '<rect x="4" y="6" width="152" height="84" rx="7" class="w"/><path d="M4 22h152" class="l"/><circle cx="13" cy="14" r="2.2" class="d"/><circle cx="21" cy="14" r="2.2" class="d"/><circle cx="29" cy="14" r="2.2" class="d"/><rect x="12" y="28" width="136" height="15" rx="4" class="hl"/><text x="18" y="38.5">%APPDATA%\\Questlog\\aion-2</text><path d="M14 54h16l3 3h15v12H14z" class="f"/><path d="M58 54h16l3 3h15v12H58z" class="f"/><path d="M102 54h16l3 3h15v12h-34z" class="f"/>',
'Tocá <b>Elegir archivo</b> y pegá la carpeta en la barra de arriba (<kbd>Ctrl</kbd>+<kbd>V</kbd>, Enter)'],
['Lista de archivos con characters.json resaltado', '<rect x="4" y="6" width="152" height="84" rx="7" class="w"/><path d="M16 17h8l3 3v9H16z" class="fi"/><text x="34" y="27">checklist.json</text><rect x="10" y="36" width="140" height="20" rx="4" class="hl"/><path d="M16 39h8l3 3v9H16z" class="fi on"/><text x="34" y="49.5" class="on">characters.json</text><path d="M16 63h8l3 3v9H16z" class="fi"/><text x="34" y="73">combat-state.json</text>',
'Doble clic en <b>characters.json</b>'],
['Tus personajes como pestañas en Tareas', '<rect x="4" y="6" width="152" height="84" rx="7" class="w"/><rect x="14" y="34" width="56" height="20" rx="10" class="hl"/><text x="24" y="47.5" class="on">Aeris</text><rect x="76" y="34" width="66" height="20" rx="10" class="fi"/><text x="86" y="47.5">Brontes</text>',
'Cada personaje queda con sus tareas'],
];
function qlModal() {
const box = document.createElement('div'), win = /win/i.test(navigator.userAgentData?.platform || navigator.platform || '');
box.className = 'ql';
box.innerHTML = `<p class="lead">Si usás la app de DPS (el medidor de daño de PC), tus personajes ya están en un archivo, <b>characters.json</b>. Se lee en tu navegador, no se sube nada.</p>
${win ? `<details class="ql-help"><summary>¿No lo encontrás?</summary><ol class="pasos">${QL_FIGS.map(([a, svg, cap], i) => `<li><figure><svg viewBox="0 0 160 96" role="img" aria-label="${a}">${svg}</svg><figcaption><b>${i + 1}</b><span>${cap}</span></figcaption></figure></li>`).join('')}</ol>
<div class="ql-path"><code id="ql-dir">${esc(QL_DIR)}</code><button type="button" class="btn ghost" data-qlcopy>Copiar carpeta</button></div></details>`
: '<p class="hint">La app de DPS es solo para Windows. Si tenés el archivo igual, elegilo.</p>'}
<p class="ql-st" role="status"></p>
<div class="ql-act"><button type="button" class="btn gold" data-qlpick>${ico('i-upload')}Elegir archivo</button></div>
<input type="file" id="ql-file" accept=".json,application/json" hidden>`;
const st = $('.ql-st', box), fi = $('#ql-file', box);
box.addEventListener('click', e => {
if (e.target.closest('[data-qlpick]')) fi.click();
else if (e.target.closest('[data-qlcopy]')) {
(navigator.clipboard ? navigator.clipboard.writeText(QL_DIR) : Promise.reject()).then(
() => { st.textContent = 'Carpeta copiada. Ahora tocá Elegir archivo y pegala en la barra de arriba.'; },
() => { getSelection().selectAllChildren($('#ql-dir', box)); st.textContent = 'No pude copiar: la ruta quedó seleccionada, copiala con Ctrl+C.'; });
}
});
fi.addEventListener('change', async () => {
const f = fi.files[0];
fi.value = '';
if (!f) return;
let chars = [];
try {
const j = JSON.parse(await f.text());
chars = Object.values(j.characters || {}).filter(c => c && c.self && c.name && !c.name.startsWith('$') && c.class)
.map(c => ({ name: c.name, server: +c.server || null, clase: CLASE[c.class] || null }));
} catch { /* abajo */ }
if (!chars.length) { st.innerHTML = `Ese archivo no tiene personajes. Es <b>characters.json</b>, en la carpeta de arriba.`; return; }
const added = addChars(chars);
box.closest('dialog')?.close();
paint();
toast(added.length ? `Sumé ${added.length} personaje${added.length > 1 ? 's' : ''}: <b>${added.map(c => esc(c.name)).join(', ')}</b>.` : 'Esos personajes ya estaban.');
});
modal({ title: 'Traer tus personajes', node: box, cls: 'ql-modal' });
}
$('#tk-edit').onclick = () => { editing = !editing; paint(); };
registerKey({ key: 'e', label: 'Editar tareas y personajes (en Tareas)', run: () => { editing = !editing; paint(); } });
function focusHash() {
const m = location.hash.match(/^#t-(.+)$/), li = m && $(`[data-t="${CSS.escape(decodeURIComponent(m[1]))}"]`);
if (!li) return;
li.scrollIntoView({ block: 'center' });
li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash');
$('input,output,[data-od]', li)?.focus();
}
paint();
on('reset', e => { paint(); toast(e.period === 'weekly' ? 'Reset semanal: tareas semanales y diarias limpias.' : 'Reset diario: las diarias quedaron limpias.'); });
on('profile', paint);
on('prefs', paint);
on('gamelang', paint);
on('structure', paint);
on('tasks', paint);
onStore('hub-tareas', paint);
onStore('hub-personajes', paint);
onStore('hub-odyle', paint);
addEventListener('hashchange', focusHash);
if (location.hash) setTimeout(focusHash, 60);
