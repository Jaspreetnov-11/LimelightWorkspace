// lcal.mjs - Limelight Calendar and Task: shared by the team, invites and assignments notify people live.
import { all, one, run, uid } from './db.mjs';
import { byId } from './auth.mjs';
import { notify } from './live.mjs';

const when = (t) => new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const room = () => `ll-${uid().slice(0, 4)}-${uid().slice(0, 4)}`.toLowerCase().replace(/[^a-z0-9-]/g, 'x');

// ---------- Calendar ----------
function shape(e, me) {
  const guests = all('SELECT g.user_id id, g.rsvp, u.name, u.color FROM guests g JOIN users u ON u.id = g.user_id WHERE g.event_id = ?', e.id);
  const o = byId(e.owner);
  return { id: e.id, title: e.title, start: e.start, end: e.end, allDay: !!e.all_day, location: e.location, notes: e.notes, room: e.room, color: e.color || o?.color || '',
    recur: e.recur, owner: { id: e.owner, name: o?.name || '' }, mine: e.owner === me, guests, rsvp: guests.find((g) => g.id === me)?.rsvp ?? null };
}
// repeat daily / weekly / monthly events into the asked window
function expand(e, from, to) {
  if (!e.recur) return e.start < to && e.end > from ? [e] : [];
  const out = [], len = e.end - e.start;
  const d = new Date(e.start);
  for (let i = 0; i < 800 && d.getTime() < to; i++) {
    const s = d.getTime();
    if (s + len > from) out.push({ ...e, start: s, end: s + len, occurrence: i });
    if (e.recur === 'daily') d.setDate(d.getDate() + 1);
    else if (e.recur === 'weekdays') { do d.setDate(d.getDate() + 1); while ([0, 6].includes(d.getDay())); }
    else if (e.recur === 'weekly') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
  }
  return out;
}
export function listEvents(me, from = Date.now(), to = Date.now() + 14 * 864e5) {
  const rows = all(`SELECT DISTINCT e.* FROM events e LEFT JOIN guests g ON g.event_id = e.id
    WHERE (e.owner = ? OR g.user_id = ?) AND (e.recur <> '' OR (e.start < ? AND e.end > ?))`, me, me, to, from);
  return rows.flatMap((e) => expand(e, from, to)).map((e) => ({ ...shape(e, me), occurrence: e.occurrence })).sort((a, b) => a.start - b.start);
}
export function getEvent(me, id) {
  const e = one('SELECT * FROM events WHERE id = ?', id);
  if (!e || (e.owner !== me && !one('SELECT 1 FROM guests WHERE event_id = ? AND user_id = ?', id, me))) throw new Error('Event not found');
  return shape(e, me);
}
export function createEvent(me, { title, start, end, allDay = false, location = '', notes = '', guests = [], video = false, color = '', recur = '' }) {
  title = String(title || '').trim(); if (!title) throw new Error('Give the event a title');
  const s = +new Date(start); if (!s) throw new Error('Pick a start time');
  const e = +new Date(end) || s + 60 * 60e3;
  const id = uid();
  run('INSERT INTO events (id, owner, title, start, end, all_day, location, notes, room, color, recur, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, me, title, s, Math.max(e, s + 5 * 60e3), allDay ? 1 : 0, location, notes, video ? room() : '', color, ['daily', 'weekdays', 'weekly', 'monthly'].includes(recur) ? recur : '', Date.now());
  const host = byId(me);
  for (const g of new Set(guests)) {
    if (g === me || !byId(g)) continue;
    run('INSERT OR IGNORE INTO guests (event_id, user_id) VALUES (?, ?)', id, g);
    notify(g, 'invite', `${host.name} invited you: ${title} · ${when(s)}`, `#calendar/${id}`);
  }
  return getEvent(me, id);
}
export function updateEvent(me, id, patch) {
  const e = one('SELECT * FROM events WHERE id = ?', id);
  if (!e) throw new Error('Event not found');
  if (e.owner !== me) throw new Error('Only the organiser can change this event');
  const f = { title: patch.title, start: patch.start && +new Date(patch.start), end: patch.end && +new Date(patch.end), location: patch.location, notes: patch.notes, color: patch.color, recur: patch.recur };
  for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== null && v !== '') run(`UPDATE events SET ${k} = ? WHERE id = ?`, v, id);
  if (patch.allDay !== undefined) run('UPDATE events SET all_day = ? WHERE id = ?', patch.allDay ? 1 : 0, id);
  if (patch.video !== undefined) run('UPDATE events SET room = ? WHERE id = ?', patch.video ? (e.room || room()) : '', id);
  if (Array.isArray(patch.guests)) {
    const old = new Set(all('SELECT user_id FROM guests WHERE event_id = ?', id).map((g) => g.user_id));
    for (const g of patch.guests) if (!old.has(g) && g !== me && byId(g)) { run('INSERT OR IGNORE INTO guests (event_id, user_id) VALUES (?, ?)', id, g); notify(g, 'invite', `${byId(me).name} invited you: ${e.title}`, `#calendar/${id}`); }
    for (const g of old) if (!patch.guests.includes(g)) run('DELETE FROM guests WHERE event_id = ? AND user_id = ?', id, g);
  }
  const n = getEvent(me, id);
  for (const g of n.guests) notify(g.id, 'update', `Updated: ${n.title} · ${when(n.start)}`, `#calendar/${id}`);
  return n;
}
export function deleteEvent(me, id) {
  const e = one('SELECT * FROM events WHERE id = ?', id);
  if (!e) return;
  if (e.owner !== me) { run('DELETE FROM guests WHERE event_id = ? AND user_id = ?', id, me); return; } // a guest removes it from their own calendar
  for (const g of all('SELECT user_id FROM guests WHERE event_id = ?', id)) notify(g.user_id, 'cancel', `Cancelled: ${e.title} · ${when(e.start)}`, '#calendar');
  run('DELETE FROM events WHERE id = ?', id);
}
export function rsvp(me, id, answer) {
  if (!['yes', 'no', 'maybe'].includes(answer)) throw new Error('bad answer');
  const e = one('SELECT * FROM events WHERE id = ?', id);
  if (!e || !one('SELECT 1 FROM guests WHERE event_id = ? AND user_id = ?', id, me)) throw new Error('You are not invited to this event');
  run('UPDATE guests SET rsvp = ? WHERE event_id = ? AND user_id = ?', answer, id, me);
  notify(e.owner, 'rsvp', `${byId(me).name}: ${{ yes: 'Going', no: 'Not going', maybe: 'Maybe' }[answer]} — ${e.title}`, `#calendar/${id}`);
  return getEvent(me, id);
}
export const eventByRoom = (r) => one('SELECT id, title, owner FROM events WHERE room = ?', r);

// ---------- Task ----------
function shapeTask(t) {
  const a = t.assignee ? byId(t.assignee) : null, o = t.owner ? byId(t.owner) : null;
  return { id: t.id, title: t.title, notes: t.notes, due: t.due, priority: t.priority, status: t.status, project: t.project, created: t.created, doneAt: t.done_at, ord: t.ord,
    owner: o ? { id: o.id, name: o.name } : null, assignee: a ? { id: a.id, name: a.name, color: a.color } : null };
}
export function listTasks(me, scope = 'mine') {
  const q = { mine: 'assignee = ? OR (assignee IS NULL AND owner = ?)', created: 'owner = ? AND (assignee IS NULL OR assignee <> ?)', all: '1 = 1 OR ? = ?' }[scope] || 'assignee = ? OR owner = ?';
  return all(`SELECT * FROM tasks WHERE ${q} ORDER BY status = 'done', ord, CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, due = '', due, created DESC`, me, me).map(shapeTask);
}
export function createTask(me, { title, notes = '', assignee = '', due = '', priority = 'normal', project = '', status = 'todo' }) {
  title = String(title || '').trim(); if (!title) throw new Error('Give the task a title');
  const id = uid(), to = assignee && byId(assignee) ? assignee : me;
  run('INSERT INTO tasks (id, title, notes, owner, assignee, due, priority, status, project, created, ord) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, title, notes, me, to, String(due).slice(0, 10), ['high', 'normal', 'low'].includes(priority) ? priority : 'normal', ['todo', 'doing', 'done'].includes(status) ? status : 'todo', project, Date.now(), Date.now());
  if (to !== me) notify(to, 'task', `${byId(me).name} gave you a task: ${title}${due ? ` · due ${due}` : ''}`, '#task');
  return shapeTask(one('SELECT * FROM tasks WHERE id = ?', id));
}
export function updateTask(me, id, patch) {
  const t = one('SELECT * FROM tasks WHERE id = ?', id); if (!t) throw new Error('Task not found');
  for (const k of ['title', 'notes', 'due', 'priority', 'project', 'ord']) if (patch[k] !== undefined) run(`UPDATE tasks SET ${k} = ? WHERE id = ?`, k === 'ord' ? +patch[k] : String(patch[k]), id);
  if (patch.status && patch.status !== t.status) {
    run('UPDATE tasks SET status = ?, done_at = ? WHERE id = ?', patch.status, patch.status === 'done' ? Date.now() : null, id);
    if (patch.status === 'done' && t.owner && t.owner !== me) notify(t.owner, 'done', `${byId(me).name} finished: ${t.title}`, '#task');
  }
  if (patch.assignee !== undefined && patch.assignee !== t.assignee && byId(patch.assignee)) {
    run('UPDATE tasks SET assignee = ? WHERE id = ?', patch.assignee, id);
    if (patch.assignee !== me) notify(patch.assignee, 'task', `${byId(me).name} gave you a task: ${t.title}`, '#task');
  }
  return shapeTask(one('SELECT * FROM tasks WHERE id = ?', id));
}
export function deleteTask(me, id, isAdmin) {
  const t = one('SELECT * FROM tasks WHERE id = ?', id); if (!t) return;
  if (t.owner !== me && t.assignee !== me && !isAdmin) throw new Error('Only the person who made it can delete this task');
  run('DELETE FROM tasks WHERE id = ?', id);
}
