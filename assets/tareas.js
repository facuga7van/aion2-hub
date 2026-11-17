import {
$, esc, ico, on, onStore, bind, fmtClock, fmtLeft, leftNext, nextReset, nextOcc, currentOcc, isLive, statusText, toast, modal,
characters, taskList, taskDone, setTaskDone, taskProgress, PJ, TK, profile, serverName, registerKey, confOf, confTag, clockLeft, gname, gclass, HOUR,
} from './core.js?v=df769d92c6';
const PER = { daily: { t: 'Diarias', when: 'reset diario' }, weekly: { t: 'Semanales', when: 'reset del miércoles' } };
let editing = false;
const uid = () => Math.random().toString(36).slice(2, 9);
function paint() {
const now = Date.now(), { list, activo } = characters(), focusId = document.activeElement?.id;
$('#pj-tabs').innerHTML = list.map(c => { const d = taskProgress(c.id, now).daily, all = d.total && d.done >= d.total;
return `<button type="button" data-pj="${esc(c.id)}" aria-pressed="${c.id === activo}"><span class="pj-nm">${esc(c.name)}</span>${c.clase ? `<small>${esc(gclass(c.clase))}</small>` : ''}<span class="pj-p${all ? ' all' : ''}" title="Diarias hechas">${all ? ico('i-check') : ''}${d.done}/${d.total}</span>${editing && c.id !== 'main' ? `<span class="pj-x" data-pjdel="${esc(c.id)}" role="button" tabindex="0" aria-label="Quitar ${esc(c.name)}">${ico('i-x')}</span>` : ''}</button>`; }).join('');
for (const per of ['daily', 'weekly']) paintGroup(per, activo, now);
$('#tk-edit').setAttribute('aria-pressed', String(editing));
document.body.classList.toggle('tk-editing', editing);
if (focusId) document.getElementById(focusId)?.focus();
}
function paintGroup(per, ch, now) {
const g = $('#g-' + per), items = taskList().filter(t => t.period === per), done = taskDone(ch, per, now);
const req = items.filter(t => !t.optional), n = req.filter(t => (done[t.id] || 0) >= (t.count || 1)).length;
const pct = req.length ? Math.round(n / req.length * 100) : 0, rs = nextReset(per, now);
g.innerHTML = `<div class="tk-h"><h2 id="h-${per}">${PER[per].t}</h2><span class="tk-n"><b>${n}</b>/${req.length}</span>
<span class="tk-r">se limpian en <span class="cd" id="rs-${per}"></span> <small>${fmtClock(rs, { now })}</small></span></div>
<div class="bar" role="progressbar" aria-label="${PER[per].t} hechas" aria-valuemin="0" aria-valuemax="${req.length}" aria-valuenow="${n}"><i style="--w:${pct}%"></i></div>
<ul class="tk-list">${items.filter(t => !t.optional).map(t => row(t, per, done)).join('')}${items.some(t => t.optional) ? `<li class="tk-sep">Si te sobra tiempo</li>${items.filter(t => t.optional).map(t => row(t, per, done)).join('')}` : ''}${items.length ? '' : '<li class="tk-empty">Sin tareas. Sumá una con el lápiz.</li>'}</ul>
<form class="tk-add" data-per="${per}"><input type="text" name="n" maxlength="60" placeholder="Nueva tarea ${per === 'daily' ? 'diaria' : 'semanal'}" aria-label="Nueva tarea ${per === 'daily' ? 'diaria' : 'semanal'}" required><button class="btn">${ico('i-plus')}Agregar</button></form>`;
bind($('#rs-' + per), n2 => [fmtLeft(rs - n2), n2 + leftNext(rs - n2)]);
for (const t of items) if (t.event) {
const el = $(`#ev-${per}-${CSS.escape(t.id)}`), o = currentOcc(t.event, now) || nextOcc(t.event, now);
if (el && o) { const cl = clockLeft(o.start); el.classList.toggle('pronto', o.start - now < 2 * HOUR); bind(el, n2 => isLive(o, n2) ? statusText(o, n2) : cl(n2)); }
}
}
function row(t, per, done) {
const v = done[t.id] || 0, max = t.count || 1, ok = v >= max, id = `t-${t.id}`;
const tags = [t.custom && '<em class="tag gold">tuya</em>'].filter(Boolean).join('');
const lv = t.custom ? 'oficial' : t.unverified?.length ? 'sin' : confOf(t);
const conf = lv === 'oficial' ? '' : ' ' + confTag(t, { lv, note: (t.unverified || []).join(' · ') });
const ctrl = max > 1
? `<span class="tk-step" role="group" aria-label="${esc(gname(t))}: ${v} de ${max}"><button type="button" class="iconbtn" data-dec="${esc(t.id)}" aria-label="Una menos"${v ? '' : ' disabled'}>${ico('i-minus')}</button><output id="${id}" tabindex="-1">${v}/${max}</output><button type="button" class="iconbtn" data-inc="${esc(t.id)}" aria-label="Una más"${ok ? ' disabled' : ''}>${ico('i-plus')}</button></span>`
: `<input type="checkbox" id="${id}" data-chk="${esc(t.id)}"${ok ? ' checked' : ''}>`;
return `<li class="tk-row${ok ? ' ok' : ''}${t.optional ? ' opt' : ''}" data-t="${esc(t.id)}" data-per="${per}">
${max > 1 ? '' : ctrl}<label class="tk-txt" ${max > 1 ? '' : `for="${id}"`}><span class="tk-name">${esc(gname(t))}${tags}</span>${t.detail || conf ? `<small>${esc(gname(t, 'detail'))}${conf}</small>` : ''}</label>
${t.event ? `<span class="tk-ev cd" id="ev-${per}-${esc(t.id)}"></span>` : ''}${max > 1 ? ctrl : ''}
<button type="button" class="iconbtn tk-del" data-del="${esc(t.id)}" aria-label="Quitar ${esc(gname(t))}" title="${t.custom ? 'Borrar' : 'Ocultar'}">${ico('i-trash')}</button></li>`;
}
/* ---------- acciones ---------- */
const active = () => characters().activo;
function set(per, id, val) {
if (!setTaskDone(active(), per, id, val)) return;
paint();
}
document.addEventListener('change', e => {
const c = e.target.closest('[data-chk]');
if (!c) return;
set(c.closest('[data-per]').dataset.per, c.dataset.chk, c.checked ? 1 : 0);
});
$('#tk-cols').addEventListener('click', e => {
const b = e.target.closest('[data-inc],[data-dec],[data-del]');
if (!b) return;
const li = b.closest('[data-t]'), per = li.dataset.per, id = li.dataset.t;
if (b.dataset.del) { removeTask(id); return; }
const t = taskList().find(x => x.id === id), v = taskDone(active(), per)[id] || 0;
set(per, id, Math.max(0, Math.min(t.count || 1, v + (b.dataset.inc ? 1 : -1))));
document.getElementById('t-' + id)?.focus();
});
$('#tk-cols').addEventListener('submit', e => {
e.preventDefault();
const f = e.target, name = f.n.value.trim();
if (!name) return;
const t = TK.get();
t.custom = [...t.custom, { id: 'u-' + uid(), name, period: f.dataset.per }];
TK.set(t);
paint();
toast(`Sumé <b>${esc(name)}</b> a las ${f.dataset.per === 'daily' ? 'diarias' : 'semanales'}.`);
$(`#g-${f.dataset.per} .tk-add input`)?.focus();
});
function removeTask(id) {
const t = TK.get(), item = taskList().find(x => x.id === id);
const before = structuredClone(t);
if (item.custom) t.custom = t.custom.filter(x => x.id !== id); else t.hidden = [...t.hidden, id];
TK.set(t);
paint();
toast(`${item.custom ? 'Borré' : 'Oculté'} <b>${esc(gname(item))}</b>.`, { action: { label: 'Deshacer', run: () => { TK.set(before); paint(); } } });
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
if (t.done.main) { t.done = { ...t.done, [added[0].id]: t.done.main }; delete t.done.main; TK.set(t); }
}
p.activo = added[0].id;
PJ.set(p);
return added;
}
$('#pj-add').onclick = async () => {
const pr = profile(), box = document.createElement('div');
box.innerHTML = `<label>Nombre<input type="text" id="pj-n" maxlength="24" autocomplete="off" required></label><p class="hint" style="margin-top:10px">Solo para separar las marcas de cada personaje. ${pr.server ? `Queda en ${esc(serverName(pr.server))}.` : ''}</p>
<p class="hint pj-ql-l">¿Usás la app de escritorio que guarda tus combates? <button type="button" class="linkbtn" id="pj-ql">Traé tus personajes de ahí</button></p>`;
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
TK.set(t);
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
box.innerHTML = `<p class="lead">Si en esta PC usás la app de escritorio que registra tus combates de Aion 2, tus personajes ya están en un archivo, <b>characters.json</b>. Se lee en tu navegador, no se sube nada.</p>
${win ? `<details class="ql-help"><summary>¿No lo encontrás?</summary><ol class="pasos">${QL_FIGS.map(([a, svg, cap], i) => `<li><figure><svg viewBox="0 0 160 96" role="img" aria-label="${a}">${svg}</svg><figcaption><b>${i + 1}</b><span>${cap}</span></figcaption></figure></li>`).join('')}</ol>
<div class="ql-path"><code id="ql-dir">${esc(QL_DIR)}</code><button type="button" class="btn ghost" data-qlcopy>Copiar carpeta</button></div></details>`
: '<p class="hint">Esa app es solo para Windows. Si tenés el archivo igual, elegilo.</p>'}
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
$('input,output', li)?.focus();
}
$('#tk-lead').textContent = `Lo que conviene hacer cada día y cada semana. Marcalo; en cada reset se limpia solo.`;
paint();
on('reset', e => { paint(); toast(e.period === 'weekly' ? 'Reset semanal: tareas semanales y diarias limpias.' : 'Reset diario: las diarias quedaron limpias.'); });
on('profile', paint);
on('prefs', paint);
on('gamelang', paint);
on('structure', paint);
onStore('hub-tareas', paint);
onStore('hub-personajes', paint);
addEventListener('hashchange', focusHash);
if (location.hash) setTimeout(focusHash, 60);
