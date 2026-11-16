import {
$, esc, ico, on, onStore, bind, fmtClock, fmtLeft, leftNext, nextReset, nextOcc, currentOcc, isLive, statusText, toast, modal,
characters, taskList, taskDone, setTaskDone, PJ, TK, profile, serverName, registerKey, prefs,
} from './core.js?v=3417f65631';
const PER = { daily: { t: 'Diarias', when: 'reset diario' }, weekly: { t: 'Semanales', when: 'reset del miércoles' } };
let editing = false;
const uid = () => Math.random().toString(36).slice(2, 9);
function paint() {
const now = Date.now(), { list, activo } = characters(), focusId = document.activeElement?.id;
$('#pj-tabs').innerHTML = list.map(c => `<button type="button" data-pj="${esc(c.id)}" aria-pressed="${c.id === activo}">${esc(c.name)}${c.clase ? `<small>${esc(c.clase)}</small>` : ''}${editing && c.id !== 'main' ? `<span class="pj-x" data-pjdel="${esc(c.id)}" role="button" tabindex="0" aria-label="Quitar ${esc(c.name)}">${ico('i-x')}</span>` : ''}</button>`).join('');
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
<ul class="tk-list">${items.map(t => row(t, per, done)).join('') || '<li class="tk-empty">Sin tareas. Sumá una con el lápiz.</li>'}</ul>
<form class="tk-add" data-per="${per}"><input type="text" name="n" maxlength="60" placeholder="Nueva tarea ${per === 'daily' ? 'diaria' : 'semanal'}" aria-label="Nueva tarea ${per === 'daily' ? 'diaria' : 'semanal'}" required><button class="btn">${ico('i-plus')}Agregar</button></form>`;
bind($('#rs-' + per), n2 => [fmtLeft(rs - n2), n2 + leftNext(rs - n2)]);
for (const t of items) if (t.event) {
const el = $(`#ev-${per}-${CSS.escape(t.id)}`), o = currentOcc(t.event, now) || nextOcc(t.event, now);
if (el && o) bind(el, n2 => isLive(o, n2) ? statusText(o, n2) : [`${fmtClock(o.start, { now: n2 })} · ${fmtLeft(o.start - n2)}`, n2 + leftNext(o.start - n2)]);
}
}
function row(t, per, done) {
const v = done[t.id] || 0, max = t.count || 1, ok = v >= max, id = `t-${t.id}`;
const tags = [t.optional && '<em class="tag">opcional</em>', t.unverified?.length && `<em class="tag" title="Sin verificar: ${esc(t.unverified.join(' · '))}">sin verificar</em>`, t.custom && '<em class="tag gold">tuya</em>'].filter(Boolean).join('');
const ctrl = max > 1
? `<span class="tk-step" role="group" aria-label="${esc(t.name)}: ${v} de ${max}"><button type="button" class="iconbtn" data-dec="${esc(t.id)}" aria-label="Una menos"${v ? '' : ' disabled'}>${ico('i-minus')}</button><output id="${id}" tabindex="-1">${v}/${max}</output><button type="button" class="iconbtn" data-inc="${esc(t.id)}" aria-label="Una más"${ok ? ' disabled' : ''}>${ico('i-plus')}</button></span>`
: `<input type="checkbox" id="${id}" data-chk="${esc(t.id)}"${ok ? ' checked' : ''}>`;
return `<li class="tk-row${ok ? ' ok' : ''}${t.optional ? ' opt' : ''}" data-t="${esc(t.id)}" data-per="${per}">
${max > 1 ? '' : ctrl}<label class="tk-txt" ${max > 1 ? '' : `for="${id}"`}><span class="tk-name">${esc(t.name)}${tags}</span>${t.detail ? `<small>${esc(t.detail)}</small>` : ''}</label>
${t.event ? `<span class="tk-ev cd" id="ev-${per}-${esc(t.id)}"></span>` : ''}${max > 1 ? ctrl : ''}
<button type="button" class="iconbtn tk-del" data-del="${esc(t.id)}" aria-label="Quitar ${esc(t.name)}" title="${t.custom ? 'Borrar' : 'Ocultar'}">${ico('i-trash')}</button></li>`;
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
toast(`${item.custom ? 'Borré' : 'Oculté'} <b>${esc(item.name)}</b>.`, { action: { label: 'Deshacer', run: () => { TK.set(before); paint(); } } });
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
box.innerHTML = `<label>Nombre<input type="text" id="pj-n" maxlength="24" autocomplete="off" required></label><p class="hint" style="margin-top:10px">Solo para separar las marcas de cada personaje. ${pr.server ? `Queda en ${esc(serverName(pr.server))}.` : ''}</p>`;
setTimeout(() => $('#pj-n', box)?.focus(), 30);
box.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); box.closest('form').querySelector('.btn.gold').click(); } });
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
$('#pj-ql').onclick = () => {
if (/Win/.test(navigator.platform)) navigator.clipboard?.writeText(QL_DIR).then(() => toast(`Copié la carpeta: pegala con Ctrl+V en la barra de arriba del diálogo y elegí <b>characters.json</b>.`, { ms: 12000 }), () => {});
$('#ql-file').click();
};
$('#ql-file').addEventListener('change', async e => {
const f = e.target.files[0];
e.target.value = '';
if (!f) return;
let chars = [];
try {
const j = JSON.parse(await f.text());
chars = Object.values(j.characters || {}).filter(c => c && c.self && c.name && !c.name.startsWith('$') && c.class)
.map(c => ({ name: c.name, server: +c.server || null, clase: CLASE[c.class] || null }));
} catch { /* abajo */ }
if (!chars.length) { toast(`Ese archivo no tiene personajes de Questlog. Es <b>characters.json</b>, en ${esc(QL_DIR)}.`, { ms: 9000 }); return; }
const added = addChars(chars);
paint();
toast(added.length ? `Sumé ${added.length} personaje${added.length > 1 ? 's' : ''} de Questlog: <b>${added.map(c => esc(c.name)).join(', ')}</b>.` : 'Esos personajes ya estaban.');
});
$('#tk-edit').onclick = () => { editing = !editing; paint(); };
registerKey({ key: 'e', label: 'Editar tareas y personajes (en Tareas)', run: () => { editing = !editing; paint(); } });
function focusHash() {
const m = location.hash.match(/^#t-(.+)$/), li = m && $(`[data-t="${CSS.escape(decodeURIComponent(m[1]))}"]`);
if (!li) return;
li.scrollIntoView({ block: 'center' });
li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash');
$('input,output', li)?.focus();
}
$('#tk-lead').textContent = `Diarias y semanales por personaje. Se limpian solas: las diarias a las ${fmtClock(nextReset('daily'), { day: false })} y las semanales el miércoles (${prefs().clock === 'server' ? 'hora del server' : 'tu reloj'}).`;
paint();
on('reset', e => { paint(); toast(e.period === 'weekly' ? 'Reset semanal: tareas semanales y diarias limpias.' : 'Reset diario: las diarias quedaron limpias.'); });
on('profile', paint);
on('prefs', paint);
onStore('hub-tareas', paint);
onStore('hub-personajes', paint);
addEventListener('hashchange', focusHash);
if (location.hash) setTimeout(focusHash, 60);
