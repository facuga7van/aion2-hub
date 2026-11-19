import {
esc, ico, on, onStore, emit, bind, fmtLeft, leftNext, nextReset, nextOcc, currentOcc, isLive, characters, taskList, taskDone,
setTaskDone, taskProgress, PJ, gname, clockLeft, schedule, maintEnd, HOUR, OD, odyle,
} from './core.js';
const kept = new Set();
on('reset', () => kept.clear());
export function renderTodo(box) {
const paint = () => {
const now = Date.now(), { list, activo: ch } = characters(), pr = taskProgress(ch, now);
const done = { daily: taskDone(ch, 'daily', now), weekly: taskDone(ch, 'weekly', now) };
const L = taskList().filter(t => !t.optional), rd = nextReset('daily', now), occ = {};
const okOf = t => (done[t.period][t.id] || 0) >= (t.count || 1), show = t => !okOf(t) || kept.has(`${ch}:${t.period}:${t.id}`);
const daily = L.filter(t => t.period === 'daily'), listo = daily.every(okOf);
const today = t => { if (!t.event) return t.count > 1; const o = currentOcc(t.event, now) || nextOcc(t.event, now); return o && o.start < rd && (occ[t.id] = o); };
const also = L.filter(t => t.period === 'weekly' && today(t) && show(t));
const row = t => {
const per = t.period, v = done[per][t.id] || 0, max = t.count || 1, ok = v >= max, id = 'ah-t-' + t.id, nm = esc(gname(t));
const cs = per === 'weekly' ? `<small>${t.detail ? esc(gname(t, 'detail')) : 'Semanal'}</small>` : '';   // el detalle ya dice "por semana"
if (max > 1) return `<li class="tk-i tk-cnt${ok ? ' ok' : ''}" data-tk="${esc(t.id)}" data-per="${per}"><span class="tk-cn"><span class="tk-nm">${nm}</span>${cs}</span><span class="tk-step" role="group" aria-label="${nm}: ${v} de ${max}"><button type="button" class="iconbtn" data-dec aria-label="Una menos"${v ? '' : ' disabled'}>${ico('i-minus')}</button><output id="${id}" tabindex="-1">${v}/${max}</output><button type="button" class="iconbtn" data-inc aria-label="Una más"${ok ? ' disabled' : ''}>${ico('i-plus')}</button></span></li>`;
const sub = per === 'weekly' ? `Semanal · <span class="cd" id="ah-ev-${esc(t.id)}"></span>` : t.detail ? esc(gname(t, 'detail')) : '';
return `<li class="tk-i${ok ? ' ok' : ''}"><input type="checkbox" id="${id}" data-tk="${esc(t.id)}" data-per="${per}"${ok ? ' checked' : ''}><label for="${id}"><span class="tk-nm">${nm}</span>${sub ? `<small>${sub}</small>` : ''}</label></li>`;
};
const who = list.length > 1 ? `<span class="seg tk-pj" role="group" aria-label="Personaje">${list.map(c => `<button type="button" data-pj="${esc(c.id)}" aria-pressed="${c.id === ch}">${esc(c.name)}</button>`).join('')}</span>`
: `<span class="tk-c">${esc(list[0].name)}</span>`;
const od = taskList().find(t => t.meter), ods = od && OD.get().c[ch];
const odRow = ods ? `<li class="tk-i tk-odl"><span class="tk-nm">${esc(gname(od))}</span><small class="cd" id="ah-od"></small></li>` : '';
const pct = pr.daily.total ? Math.round(pr.daily.done / pr.daily.total * 100) : 0, rows = (listo ? [] : daily.filter(show)).map(row).join('');
box.classList.toggle('tk-listo', listo);
box.innerHTML = `<div class="tk-p">${who}<span><b>${pr.daily.done}</b>/${pr.daily.total} diarias</span><span><b>${pr.weekly.done}</b>/${pr.weekly.total} semanales</span><span class="tk-r"><span class="tk-rs"></span><span class="tk-rw"></span></span></div>
<div class="bar" role="img" aria-label="${pct}% de las diarias"><i style="--w:${pct}%"></i></div>${listo ? '<p class="tk-ok">Diarias listas ✓</p>' : ''}
<div class="tk-cols">${rows ? `<ul class="tk-l">${rows}</ul>` : ''}${also.length || odRow ? `<ul class="tk-l"><li class="tk-sep">Hoy también</li>${also.map(row).join('')}${odRow}</ul>` : ''}</div>`;
if (ods) bind(box.querySelector('#ah-od'), n => { const o = odyle(od.meter, ods, n); return o.full ? [`~${o.v}/${o.cap} · llena en ${fmtLeft(o.full - n)}`, Math.min(n + leftNext(o.full - n), o.next)] : [`llena (tope ${o.cap})`, 0]; });
bind(box.querySelector('.tk-rs'), n => {
const left = rd - n, soon = !listo && left < 2 * HOUR;
box.classList.toggle('tk-soon', soon);
return [soon ? `Te quedan ${fmtLeft(left)} para el reset` : `reset en ${fmtLeft(left)}`, n + leftNext(left)];
});
const rw = nextReset('weekly', now);
bind(box.querySelector('.tk-rw'), n => {
const mw = schedule(n).mw.find(w => w.maxEnd > n), ml = mw ? mw.start - n : Infinity, soon = ml < 48 * HOUR;
const m = ml <= 0 ? ` · mantenimiento hasta ${maintEnd(mw, n)}` : soon ? ` · mantenimiento en ${mw.announced ? '' : '~'}${fmtLeft(ml)}` : '';
const due = Math.min(leftNext(rw - n), ml <= 0 ? mw.maxEnd - n : soon ? leftNext(ml) : ml - 48 * HOUR);
return [(rw === rd ? ' · también el semanal' : ` · semanal en ${fmtLeft(rw - n)}`) + m, n + due];
});
for (const t of also) if (occ[t.id]) { const o = occ[t.id], cl = clockLeft(o.start); bind(box.querySelector('#' + CSS.escape('ah-ev-' + t.id)), n => isLive(o, n) ? ['en curso ahora', o.end] : cl(n)); }
};
const doc = box.ownerDocument, refocus = id => doc.getElementById(id)?.focus();   // en la ventana flotante el DOM es de otra ventana
box.addEventListener('change', e => {
const c = e.target.closest('input[data-tk]');
if (!c) return;
const ch = characters().activo;
if (c.checked) kept.add(`${ch}:${c.dataset.per}:${c.dataset.tk}`);
setTaskDone(ch, c.dataset.per, c.dataset.tk, c.checked ? 1 : 0);   // emite 'tasks': repinta acá y la tira
refocus(c.id);
});
box.addEventListener('click', e => {
const b = e.target.closest('[data-pj],[data-inc],[data-dec]');
if (!b) return;
if (b.dataset.pj) {
const s = PJ.get();
if (!s.list.length || s.activo === b.dataset.pj) return;
s.activo = b.dataset.pj;
PJ.set(s);
emit('tasks');
box.querySelector(`[data-pj="${CSS.escape(b.dataset.pj)}"]`)?.focus();
return;
}
const li = b.closest('[data-tk]'), ch = characters().activo, t = taskList().find(x => x.id === li.dataset.tk), per = li.dataset.per;
if (!t) return;
const v = Math.max(0, Math.min(t.count || 1, (taskDone(ch, per)[t.id] || 0) + (b.dataset.inc !== undefined ? 1 : -1)));
if (v >= (t.count || 1)) kept.add(`${ch}:${per}:${t.id}`);
setTaskDone(ch, per, t.id, v);
refocus('ah-t-' + t.id);
});
const vis = () => { if (!document.hidden) paint(); };
const offs = [...['tasks', 'structure', 'gamelang', 'reset'].map(ev => on(ev, paint)), onStore('hub-tareas', paint), onStore('hub-personajes', paint), onStore('hub-odyle', paint)];
document.addEventListener('visibilitychange', vis);
paint();
return () => { offs.forEach(f => f()); document.removeEventListener('visibilitychange', vis); };
}
