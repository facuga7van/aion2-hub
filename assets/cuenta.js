import { $, $$, esc, store, on, emit, modal, toast, bind, myChars, HUB_API, lnaBlocked, LNA_MSG, PAGE } from './core.js?v=d8efdfc19c';
const VQ = new URL(import.meta.url).search;
const NO_SYNC = new Set(['hub-cuenta', 'hub-sync', 'hub-live', 'hub-api', 'hub-pj-api', 'hub-alertas-log', 'hub-cid', 'hub-ahora-tl',
'pets-backup', 'pets-bak-t', 'pets-dirty', 'pets-fx', 'pets-questlog-char', 'pets-questlog-sync']);
const syncable = k => /^(hub|pets)-[A-Za-z0-9_.:-]{1,60}$/.test(k) && !NO_SYNC.has(k);
const QUESTIONS = ['Nombre de tu primera mascota', 'Ciudad donde naciste', 'Tu primer personaje de Aion', 'Tu comida favorita de chico'];
const CODE_RE = /^\s*[2-9a-z]{4}[- ]?[2-9a-z]{4}[- ]?[2-9a-z]{4}[- ]?[2-9a-z]{4}\s*$/i;
const USER_RE = /^[a-zA-Z0-9_.-]{3,20}$/;
const S = 'hub-cuenta', M = 'hub-sync';   // {user, id, token} · {id, rev, h: {clave: hash}, t}
const RELOAD = { pets: /^(pets-|hub-pets-)/, personaje: /^hub-(pj-|personajes$)/ };
const session = () => store.get(S, null);
let cssP;
const css = () => cssP ||= new Promise(r => document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: new URL('cuenta.css' + VQ, import.meta.url).href, onload: r, onerror: r })));
async function api(path, { method = 'GET', body, headers = {} } = {}) {
const s = session();
try {
const r = await fetch(HUB_API + path, {
method, cache: 'no-store', signal: AbortSignal.timeout(12000), body: body ? JSON.stringify(body) : undefined,
headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(s ? { Authorization: 'Bearer ' + s.token } : {}), ...headers },
});
let j = null;
if (r.status !== 304) try { j = await r.json(); } catch { /* sin cuerpo */ }
return { status: r.status, j };
} catch (e) {
return { off: e?.name === 'TypeError' && await lnaBlocked() ? 'lna' : 'down' };
}
}
/* ---------- sync ---------- */
const st = { busy: false, off: null, err: null };
const setSt = p => { Object.assign(st, p); paintAll(); };
const hv = v => { if (v == null) return undefined; let x = 0x811c9dc5; for (let i = 0; i < v.length; i++) x = Math.imul(x ^ v.charCodeAt(i), 16777619); return (x >>> 0).toString(36) + '.' + v.length; };
const setH = (m, k, h) => { if (h === undefined) delete m.h[k]; else m.h[k] = h; };
function meta() { const s = session(), m = store.get(M, null); return m && s && m.id === s.id ? m : { id: s?.id, rev: 0, h: {}, t: 0, first: true }; }
const touched = {};   // clave → cuándo cambió en esta pestaña (o en otra, por `storage`): la hora del last-write-wins
function localDiff(m) {
const out = {}, now = Date.now(), seen = new Set();
for (let i = 0; i < localStorage.length; i++) {
const k = localStorage.key(i);
if (!syncable(k)) continue;
seen.add(k);
const v = localStorage.getItem(k);
if (hv(v) !== m.h[k]) out[k] = { value: v, updatedAt: touched[k] || now };
}
for (const k in m.h) if (!seen.has(k) && syncable(k)) out[k] = { value: null, updatedAt: touched[k] || now };   // borrada acá
return out;
}
function unionPets(k, a, b) {
try {
const x = JSON.parse(a), y = JSON.parse(b);
if (k === 'pets-owned' && Array.isArray(x) && Array.isArray(y)) return JSON.stringify([...new Set([...y, ...x].map(String))]);
if (k === 'pets-level' && x && y && typeof x === 'object' && typeof y === 'object') {
const o = { ...y };
for (const [id, n] of Object.entries(x)) o[id] = Math.max(+o[id] || 0, +n || 0);
return JSON.stringify(o);
}
} catch { /* abajo: manda el server */ }
return null;
}
function apply(keys, m, sent, first, changed) {
for (const [k, e] of Object.entries(keys || {})) {
if (!syncable(k)) continue;
const cur = localStorage.getItem(k), hc = hv(cur), hr = hv(e.value);
if (hc !== hr) {
const known = k in sent ? hv(sent[k].value) : m.h[k];
if (!first && hc !== known && (touched[k] || 0) > e.updatedAt) { setH(m, k, hr); continue; }
const v = first && cur != null && e.value != null ? unionPets(k, cur, e.value) ?? e.value : e.value;
try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { continue; }   // lleno: queda para otra vez
changed.push(k);
}
setH(m, k, hr);
}
}
function good(r) {
if (r.off) { setSt({ off: r.off }); schedule(60000); return false; }
if (r.status === 401) { end(true); return false; }
if (r.status >= 400) { setSt({ err: r.j?.error || `El servidor respondió ${r.status}` }); return false; }
return true;
}
async function run() {
const s = session();
if (!s) return;
const m = meta(), changed = [];
setSt({ busy: true });
const save = () => { if (session()?.id === s.id) store.set(M, m); };
try {
if (m.first) {   // baja todo: lo del server manda (salvo pets, que se suman); lo que solo está acá se sube abajo
const r = await api('/api/sync');
if (!good(r)) return;
apply(r.j.keys, m, {}, true, changed);
m.rev = r.j.rev;
delete m.first;
save();
}
const diff = localDiff(m);
const r = Object.keys(diff).length ? await api('/api/sync', { method: 'PUT', body: { since: m.rev, keys: diff } })
: await api('/api/sync?since=' + m.rev, { headers: { 'If-None-Match': `"r${m.rev}"` } });
if (!good(r)) return;
if (r.status !== 304) {
for (const k in diff) setH(m, k, hv(diff[k].value));
apply(r.j.keys, m, diff, false, changed);
m.rev = r.j.rev;
}
m.t = Date.now();
save();
setSt({ off: null, err: null });
} finally {
setSt({ busy: false });
announce(changed);
}
}
function announce(keys) {
if (!keys.length) return;
for (const key of keys) dispatchEvent(new StorageEvent('storage', { key, newValue: localStorage.getItem(key), storageArea: localStorage, url: location.href }));
emit('synced', { keys });
const re = RELOAD[PAGE];
if (re && keys.some(k => re.test(k))) afterDialogs(() => location.reload());
}
function afterDialogs(fn) {
const d = document.querySelector('dialog[open]');
if (d) d.addEventListener('close', () => setTimeout(() => afterDialogs(fn)), { once: true }); else fn();
}
let timer = 0, running = null, again = false, lastRun = 0;
function schedule(ms = 2000) { clearTimeout(timer); if (session()) timer = setTimeout(sync, ms); }
export function sync() {
clearTimeout(timer);
if (!session()) return Promise.resolve();
if (running) { again = true; return running; }
lastRun = Date.now();
running = (navigator.locks ? navigator.locks.request('hub-sync', run) : run()).catch(() => {}).finally(() => { running = null; if (again) { again = false; schedule(300); } });
return running;
}
on('store', k => { if (syncable(k)) { touched[k] = Date.now(); schedule(); } if (k === 'hub-personajes' || k === AV) avSoon(); });
addEventListener('storage', e => {
if (e.key === 'hub-personajes' || e.key === AV || e.key === null) avSoon();
if (!e.isTrusted) return;                          // los que manda announce() no cuentan como cambios
if (e.key === S || e.key === null) { for (const p of panels) p.view = session() ? 'home' : 'entrar'; paintAll(true); }
else if (e.key === M) paintAll();
else if (syncable(e.key)) { touched[e.key] = Date.now(); schedule(); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastRun > 15000) sync(); });
addEventListener('online', () => sync());
function end(expired, msg = '') {
clearTimeout(timer);
store.set(S, null);
store.set(M, null);
Object.assign(st, { busy: false, off: null, err: null });
for (const p of panels) { p.view = 'entrar'; p.msg = msg; }
paintAll(true);
refreshAvatar();
if (expired) toast('Tu sesión se cerró (cambiaste la contraseña en otro dispositivo o venció). Entrá de nuevo para seguir sincronizando.', { ms: 10000, action: { label: 'Entrar', run: open } });
}
function start(j, p, msg) {
store.set(S, { user: j.user, id: j.id, token: j.token, ...(j.greet ? { greet: j.greet } : {}) });
Object.assign(st, { off: null, err: null });
for (const x of panels) x.view = 'home';
p.msg = msg;
paintAll(true);
return sync().then(refreshAvatar).then(() => { if (j.greet) showGreet(j.greet); });
}
function showGreet(text) {
css().then(() => {
const el = document.createElement('div');
el.className = 'cu-greet';
el.setAttribute('popover', 'manual');
el.setAttribute('role', 'status');
el.innerHTML = `${avatar ? avHtml(36) : '<span class="cu-greet-i" aria-hidden="true">✦</span>'}<b>${esc(text)}</b>`;
el.addEventListener('click', () => el.remove());
document.body.append(el);
el.showPopover?.();
setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 7000);
});
}
/* ---------- avatar: retrato del personaje con más CP de "Mis personajes" (o el elegido en hub-avatar) ---------- */
const AV = 'hub-avatar';   // k de la ficha elegida a mano; null = automático. Viaja con la cuenta (prefijo hub-).
const CPK = 'cu-cp', CP_TTL = 30 * 60e3;
let avatar = null, avList = [], avSeq = 0, avT = 0;
const memoCp = () => { try { return JSON.parse(sessionStorage.getItem(CPK) || '{}'); } catch { return {}; } };
async function charInfo(pj) {
const memo = memoCp(), m = memo[pj.k];
if (m && Date.now() - m.at < CP_TTL) return m;
try {
const r = await fetch(`${HUB_API}/api/character?id=${encodeURIComponent(pj.id)}&server=${pj.s}&region=${pj.r}`, { signal: AbortSignal.timeout(10000) });
if (!r.ok) return m || null;
const pr = (await r.json()).profile || {};
const v = { cp: Number.isFinite(pr.combatPower) ? pr.combatPower : null, c: pr.class || null, i: pr.image || null, at: Date.now() };
try { sessionStorage.setItem(CPK, JSON.stringify({ ...memoCp(), [pj.k]: v })); } catch { /* sin sessionStorage: se vuelve a pedir */ }
return v;
} catch { return m || null; }   // sin conexión: lo último que se supo
}
function pickAvatar(list) {
const pick = store.get(AV, null);
const x = list.find(y => y.pj.k === pick) || [...list].filter(y => y.cp != null).sort((a, b) => b.cp - a.cp)[0] || list[0];
return x ? { k: x.pj.k, name: x.pj.n, cls: x.c || x.pj.c, cp: x.cp, img: x.i || x.pj.i } : null;
}
async function refreshAvatar() {
const seq = ++avSeq;
const chars = session() ? myChars().map(c => c.pj).filter(pj => pj?.k && pj.id) : [];
const memo = memoCp();
avList = chars.map(pj => ({ pj, ...memo[pj.k] }));
avatar = pickAvatar(avList);       // primero con lo que ya se sabe (sin esperar la red)
paintAvatar();
for (const pj of chars) {          // de a uno: no gasta el cupo del proxy de golpe
const v = await charInfo(pj);
if (seq !== avSeq) return;
if (v) Object.assign(avList.find(x => x.pj === pj), v);
}
avatar = pickAvatar(avList);
paintAvatar();
}
const avSoon = () => { clearTimeout(avT); avT = setTimeout(refreshAvatar, 300); };
const avLabel = a => [a.name, a.cls, a.cp != null && `${a.cp.toLocaleString('es-AR')} CP`].filter(Boolean).join(' · ');
const avHtml = sz => avatar?.img
? `<img class="cu-avi" src="${esc(avatar.img)}" width="${sz}" height="${sz}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="">`
: `<span class="cu-avi cu-ini" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz * 0.48)}px" aria-hidden="true">${esc((session()?.user || '?')[0].toUpperCase())}</span>`;
document.addEventListener('error', e => { if (e.target?.matches?.('img.cu-avi')) { const sz = +e.target.getAttribute('width'); avatar && (avatar.img = null); e.target.outerHTML = avHtml(sz); } }, true);
let railIco = null;
function paintAvatar() {
const b = $('.rail [data-hub=cuenta]'), s = session(), lab = avatar ? avLabel(avatar) : '';
if (b) {
const ico = b.firstElementChild;
railIco ||= ico.outerHTML;   // la nube del shell, para cuando no hay sesión
const want = s ? avHtml(24) : railIco;
if (ico.outerHTML !== want) ico.outerHTML = want;
b.title = s ? (lab ? `Cuenta: ${lab}` : `Cuenta: ${s.user}`) : 'Cuenta: tus datos en todos tus dispositivos';
b.setAttribute('aria-label', s ? `Cuenta, ${lab || s.user}` : 'Cuenta');
}
for (const slot of $$('.cuenta .cu-avslot')) slot.innerHTML = avHtml(44);
for (const l of $$('.cuenta .cu-avl')) l.textContent = lab || (avList.length ? '' : 'Tu avatar es tu personaje con más CP: marcalo como tuyo en Personaje.');
for (const box of $$('.cuenta .cu-avpick')) {
const pick = store.get(AV, null), opts = avList.map(x => `<option value="${esc(x.pj.k)}"${x.pj.k === pick ? ' selected' : ''}>${esc(avLabel({ name: x.pj.n, cls: x.c || x.pj.c, cp: x.cp }))}</option>`).join('');
const html = avList.length > 1 ? `<label>Avatar<span class="sel"><select name="avatar"><option value="">Automático: el de más CP</option>${opts}</select></span></label>` : '';
if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
}
}
document.addEventListener('change', e => { if (e.target.matches?.('.cuenta [name=avatar]')) { store.set(AV, e.target.value || null); refreshAvatar(); } });
/* ---------- panel (Ajustes y el modal "Cuenta") ---------- */
const panels = new Set();
const inp = (name, label, type = 'text', ac = 'off', extra = '') => `<label>${label}<input name="${name}" type="${type}" autocomplete="${ac}" autocapitalize="none" spellcheck="false"${extra}></label>`;
const USER = inp('user', 'Usuario', 'text', 'username', ' maxlength="20"');
const passIn = (label = 'Contraseña', ac = 'current-password', name = 'pass') => inp(name, label, 'password', ac, ' maxlength="200"');
const qFields = () => `<label>Pregunta de seguridad<span class="sel"><select name="qsel">${QUESTIONS.map(q => `<option>${esc(q)}</option>`).join('')}<option value="">Otra: la escribo yo</option></select></span></label>
<label class="cu-otra" hidden>Tu pregunta<input name="qtxt" type="text" maxlength="120" autocomplete="off"></label>${inp('ans', 'Respuesta', 'text', 'off', ' maxlength="100"')}`;
const act = (go, label, back = 'home', cls = 'gold') => `<p class="cu-err" role="alert"></p><div class="cu-act"><button type="button" class="btn ${cls}" data-go="${go}">${label}</button>${back ? `<button type="button" class="btn ghost" data-v="${back}">Volver</button>` : ''}</div>`;
const tabs = v => `<p class="hint">Opcional: con una cuenta tenés tus personajes, tareas, timers, ajustes y pets en el celu y en la PC. Solo usuario y contraseña, sin email.</p>
<div class="seg" role="group" aria-label="Entrar o crear cuenta"><button type="button" data-v="entrar" aria-pressed="${v === 'entrar'}">Entrar</button><button type="button" data-v="crear" aria-pressed="${v === 'crear'}">Crear cuenta</button></div>`;
const VIEWS = {
entrar: () => `${tabs('entrar')}<div class="f2">${USER}${passIn()}</div>${act('login', 'Entrar', '')}<p><button type="button" class="linkbtn" data-v="olvide">¿Olvidaste tu contraseña?</button></p>`,
crear: () => `${tabs('crear')}<div class="f2">${USER}${passIn('Contraseña (8 o más)', 'new-password')}</div>${qFields()}
<p class="cu-warn">Sin email no hay forma de recuperar la contraseña por correo. <b>Anotala.</b> Si te la olvidás, la recuperás solo con la respuesta a tu pregunta.</p>${act('register', 'Crear cuenta', '')}`,
olvide: p => p.q == null
? `<p class="cu-h">Recuperar la contraseña</p><p class="hint">Sin email, se recupera con la respuesta a tu pregunta de seguridad (o con tu código de recuperación, si generaste uno).</p>${USER}${act('question', 'Seguir', 'entrar')}`
: `<p class="cu-h">Recuperar la contraseña</p><p class="cu-q">Pregunta de seguridad de <b>${esc(p.u)}</b>: <b>${esc(p.q)}</b></p>${inp('ans', 'Respuesta o código de recuperación', 'text', 'off', ' maxlength="100"')}${passIn('Contraseña nueva (8 o más)', 'new-password')}
<p class="hint">Se cierra la sesión en todos tus dispositivos.</p>${act('recover', 'Cambiar contraseña', 'entrar')}`,
home: () => `<div class="cu-me"><span class="cu-avslot"></span><div><p class="cu-who">Entraste como <b>${esc(session()?.user)}</b>.${session()?.greet ? ` <span class="cu-greet-s">${esc(session().greet)}</span>` : ''}</p><p class="cu-avl"></p></div></div><p class="cu-st" aria-live="polite"></p><div class="cu-avpick"></div>
<div class="cu-act"><button type="button" class="btn" data-go="logout">Cerrar sesión</button></div>
<p class="hint">Personajes, tareas, timers, ajustes y pets quedan en el servidor y en cada dispositivo donde entres.</p>
<div class="cu-more"><button type="button" class="linkbtn" data-v="pass">Cambiar contraseña</button><button type="button" class="linkbtn" data-v="preg">Cambiar pregunta de seguridad</button><button type="button" class="linkbtn" data-v="code">Generar código de recuperación</button><button type="button" class="linkbtn danger" data-v="borrar">Borrar cuenta</button></div>`,
pass: () => `<p class="cu-h">Cambiar contraseña</p>${passIn('Contraseña actual')}${passIn('Contraseña nueva (8 o más)', 'new-password', 'np')}<p class="hint">Se cierra la sesión en tus otros dispositivos.</p>${act('password', 'Guardar')}`,
preg: () => `<p class="cu-h">Cambiar pregunta de seguridad</p>${passIn('Contraseña actual')}${qFields()}${act('setq', 'Guardar')}`,
code: p => p.code
? `<p class="cu-h">Tu código de recuperación</p><p class="cu-code"><code>${esc(p.code)}</code><button type="button" class="btn" data-go="copy">Copiar</button></p>
<p class="cu-warn"><b>Guardalo:</b> sirve para recuperar la cuenta si te olvidás la contraseña. No se vuelve a mostrar y sirve una sola vez.</p><div class="cu-act"><button type="button" class="btn gold" data-v="home">Listo, lo guardé</button></div>`
: `<p class="cu-h">Código de recuperación (opcional)</p><p class="hint">Un código para recuperar la cuenta sin la respuesta a tu pregunta. Se muestra una sola vez; si generás otro, el anterior deja de servir.</p>${passIn('Contraseña actual')}${act('code', 'Generar código')}`,
borrar: () => `<p class="cu-h">Borrar cuenta</p><p class="cu-warn">Se borran tu cuenta y todo lo guardado en el servidor. Lo de este navegador queda como está. No se puede deshacer.</p>${passIn('Contraseña actual')}${act('delete', 'Borrar cuenta', 'home', 'danger')}`,
};
const OUT = ['entrar', 'crear', 'olvide'];
function stText(now) {
if (st.err) return st.err;
if (st.off) return st.off === 'lna' ? LNA_MSG + ' Se sincroniza cuando vuelva.' : 'Sin conexión con el servidor: se sincroniza cuando vuelva.';
const t = meta().t, s = Math.max(0, now - t) / 1000;
if (!t) return st.busy ? 'Sincronizando…' : 'Todavía no se sincronizó.';
return [s < 50 ? 'Sincronizado recién' : s < 3600 ? `Sincronizado hace ${Math.round(s / 60)} min` : s < 86400 ? `Sincronizado hace ${Math.round(s / 3600)} h` : `Sincronizado hace ${Math.round(s / 86400)} d`, now + 30000];
}
function paint(p) {
if (!session() !== OUT.includes(p.view)) p.view = session() ? 'home' : 'entrar';
p.unbind?.();
p.el.innerHTML = (p.msg ? `<p class="cu-ok" role="status">${esc(p.msg)}</p>` : '') + VIEWS[p.view](p);
p.msg = '';
const n = $('.cu-st', p.el);
p.unbind = n ? bind(n, stText) : null;
paintAvatar();
}
function paintAll(full) {
for (const p of panels) {
if (!p.el.isConnected) { p.unbind?.(); panels.delete(p); continue; }
if (full) paint(p);
else { const n = $('.cu-st', p.el); if (n) p.unbind = bind(n, stText); }
}
}
async function post(path, body, method = 'POST') {
const r = await api(path, { method, body });
if (r.off) return { e: r.off === 'lna' ? LNA_MSG : 'Sin conexión con el servidor. Probá en un rato.' };
if (r.status === 401 && session() && path !== '/api/auth/login') { end(true); return { e: 'Tu sesión se cerró.' }; }
if (r.status >= 400) return { e: r.j?.error || `El servidor respondió ${r.status}` };
return { j: r.j };
}
const ACTIONS = {
async login(p, val) {
const user = val('user').trim(), pass = val('pass');
if (!user || !pass) return 'Escribí tu usuario y tu contraseña.';
const { j, e } = await post('/api/auth/login', { user, pass });
return e || start(j, p, '');
},
async register(p, val) {
const user = val('user').trim(), pass = val('pass'), question = val('qsel') || val('qtxt').trim(), answer = val('ans');
if (!USER_RE.test(user)) return 'Usuario: de 3 a 20 letras, números, punto, guion o guion bajo (sin espacios).';
if (pass.length < 8) return 'La contraseña tiene que tener 8 caracteres o más.';
if (question.length < 3) return 'Escribí tu pregunta de seguridad.';
if (answer.trim().length < 2) return 'Escribí la respuesta a tu pregunta.';
const { j, e } = await post('/api/auth/register', { user, pass, question, answer });
return e || start(j, p, 'Cuenta creada. Lo de este navegador ya se está subiendo.');
},
async question(p, val) {
const user = val('user').trim();
if (!USER_RE.test(user)) return 'Escribí tu usuario.';
const r = await api('/api/auth/question?user=' + encodeURIComponent(user));
if (r.off || r.status >= 400) return r.j?.error || 'Sin conexión con el servidor. Probá en un rato.';
p.u = user; p.q = r.j.question;
paint(p);
$('[name=ans]', p.el)?.focus();
},
async recover(p, val) {
const answer = val('ans'), newPass = val('pass');
if (!answer.trim()) return 'Escribí la respuesta (o tu código de recuperación).';
if (newPass.length < 8) return 'La contraseña nueva tiene que tener 8 caracteres o más.';
const { j, e } = await post('/api/auth/recover', { user: p.u, answer, newPass, ...(CODE_RE.test(answer) ? { code: answer } : {}) });
if (e) return e;
p.q = null;
return start(j, p, 'Listo: entraste con la contraseña nueva. Se cerró la sesión en tus otros dispositivos.');
},
async password(p, val) {
const pass = val('pass'), newPass = val('np');
if (newPass.length < 8) return 'La contraseña nueva tiene que tener 8 caracteres o más.';
const { e } = await post('/api/auth/password', { pass, newPass });
if (e) return e;
p.view = 'home'; p.msg = 'Contraseña cambiada. Se cerró la sesión en tus otros dispositivos.'; paint(p);
},
async setq(p, val) {
const question = val('qsel') || val('qtxt').trim(), answer = val('ans');
if (question.length < 3) return 'Escribí tu pregunta de seguridad.';
if (answer.trim().length < 2) return 'Escribí la respuesta.';
const { e } = await post('/api/auth/question', { pass: val('pass'), question, answer });
if (e) return e;
p.view = 'home'; p.msg = 'Pregunta de seguridad cambiada.'; paint(p);
},
async code(p, val) {
const { j, e } = await post('/api/auth/code', { pass: val('pass') });
if (e) return e;
p.code = j.code; paint(p);
},
async delete(p, val) {
const { e } = await post('/api/auth/account', { pass: val('pass') }, 'DELETE');
if (e) return e;
end(false, 'Cuenta borrada. Lo de este navegador quedó como estaba.');
},
async logout() {
await post('/api/auth/logout', {});   // sin conexión igual se cierra acá; el token vence solo
end(false, 'Cerraste la sesión. Lo que guardaste sigue en este navegador.');
},
copy(p) {
navigator.clipboard?.writeText(p.code).then(() => toast('Código copiado. Guardalo en un lugar seguro.'), () => toast('No pude copiar: seleccionalo y copialo a mano.'));
},
};
async function onClick(p, e) {
const v = e.target.closest('[data-v]'), g = e.target.closest('[data-go]');
if (v) { p.view = v.dataset.v; p.q = null; p.code = null; paint(p); $('input', p.el)?.focus(); return; }
if (!g || g.disabled) return;
const err = $('.cu-err', p.el);
if (err) err.textContent = '';
g.disabled = true;
try {
const msg = await ACTIONS[g.dataset.go](p, n => $(`[name=${n}]`, p.el)?.value ?? '');
if (typeof msg === 'string' && err?.isConnected) err.textContent = msg;
} finally { g.disabled = false; }
}
document.addEventListener('click', e => {
const b = e.target.closest?.('dialog .modal-act button');
if (!b) return;
for (const p of panels) {
if (!p.el.isConnected || !b.closest('dialog').contains(p.el) || !OUT.includes(p.view) || !$$('input', p.el).some(i => i.value.trim())) continue;
e.preventDefault();
$('[data-go]', p.el)?.click();
return;
}
}, true);
export function mount(host) {
css();
const el = document.createElement('div');
el.className = 'cuenta';
host.append(el);
const p = { el, view: session() ? 'home' : 'entrar', msg: '' };
panels.add(p);
el.addEventListener('click', e => onClick(p, e));
el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); $('[data-go]', el)?.click(); } });
el.addEventListener('change', e => { if (e.target.name === 'qsel') { const o = $('.cu-otra', el); o.hidden = !!e.target.value; if (!o.hidden) $('input', o).focus(); } });
paint(p);
}
export function open() {
const box = document.createElement('div');
const done = modal({ title: 'Cuenta', node: box, cls: 'cuenta-m', actions: [{ label: 'Cerrar', value: 'ok' }] });
mount(box);
$('input', box)?.focus();
return done;
}
if (session()) { refreshAvatar(); sync(); }
