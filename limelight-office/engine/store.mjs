// store.mjs - things Limelight Office keeps on this PC: saved chats (Chatbot / Agent) and the attendance register.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA } from './config.mjs';

const CHATS = path.join(DATA, 'chats');
const ATT = path.join(DATA, 'attendance.json');
fs.mkdirSync(CHATS, { recursive: true });

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
// write to a temp file first so a crash never leaves half a file
const writeJson = (f, v) => { fs.writeFileSync(`${f}.tmp`, JSON.stringify(v, null, 1)); fs.renameSync(`${f}.tmp`, f); };
const safeId = (id) => (/^[a-z0-9]{6,32}$/.test(id) ? id : null);

// ---------- chats ----------
// chats belong to the person who had them (old chats without an owner belong to the admin)
const mine = (c, u) => !u || c.owner === u.id || (!c.owner && u.role === 'admin');
export function listChats(u) {
  return fs.readdirSync(CHATS).filter((f) => f.endsWith('.json')).map((f) => {
    const c = readJson(path.join(CHATS, f), null);
    if (!c || !mine(c, u)) return null;
    const last = [...c.messages].reverse().find((m) => m.content);
    return { id: c.id, kind: c.kind, title: c.title, updated: c.updated, count: c.messages.length, preview: (last?.content || '').slice(0, 140) };
  }).filter(Boolean).sort((a, b) => b.updated - a.updated);
}
export function getChat(id, u) {
  if (!safeId(id)) throw new Error('bad chat id');
  const c = readJson(path.join(CHATS, `${id}.json`), null);
  if (!c || !mine(c, u)) throw new Error('Chat not found');
  return c;
}
export function saveChat({ id, kind = 'chatbot', title, messages = [], owner }, u) {
  id = safeId(id || '') || crypto.randomBytes(8).toString('hex');
  const old = readJson(path.join(CHATS, `${id}.json`), null);
  if (old && !mine(old, u)) throw new Error('Chat not found');
  const first = messages.find((m) => m.role === 'user')?.content || 'New chat';
  const c = { id, kind, owner: old?.owner || owner, title: title || first.replace(/\s+/g, ' ').slice(0, 60), updated: Date.now(), messages: messages.slice(-200) };
  writeJson(path.join(CHATS, `${id}.json`), c);
  return { id, title: c.title };
}
export function deleteChat(id, u) {
  if (!safeId(id)) throw new Error('bad chat id');
  getChat(id, u);
  try { fs.unlinkSync(path.join(CHATS, `${id}.json`)); } catch {}
}

// ---------- attendance ----------
// { people: [{ id, name, role, active }], days: { "YYYY-MM-DD": { personId: { status, in, out, note } } } }
export const STATUSES = { P: 'Present', A: 'Absent', H: 'Half day', L: 'Leave', W: 'Work from home', O: 'Off / holiday' };
const att = () => readJson(ATT, { people: [], days: {} });

export function attendanceMonth(month) { // "YYYY-MM"
  const a = att();
  const days = Object.fromEntries(Object.entries(a.days).filter(([d]) => d.startsWith(month)));
  return { people: a.people, days, statuses: STATUSES };
}
export function addPerson({ name, role = '' }) {
  if (!name?.trim()) throw new Error('Name is needed');
  const a = att();
  const p = { id: crypto.randomBytes(5).toString('hex'), name: name.trim(), role: role.trim(), active: true };
  a.people.push(p); writeJson(ATT, a);
  return p;
}
export function updatePerson({ id, ...patch }) {
  const a = att(); const p = a.people.find((x) => x.id === id);
  if (!p) throw new Error('Person not found');
  for (const k of ['name', 'role', 'active']) if (patch[k] !== undefined) p[k] = patch[k];
  writeJson(ATT, a);
  return p;
}
export function mark({ date, id, status, in: tin, out, note }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('bad date');
  const a = att();
  if (!a.people.some((p) => p.id === id)) throw new Error('Person not found');
  const day = (a.days[date] ||= {});
  if (!status) delete day[id];
  else day[id] = { ...(day[id] || {}), status, ...(tin !== undefined && { in: tin }), ...(out !== undefined && { out }), ...(note !== undefined && { note }) };
  writeJson(ATT, a);
  return day[id] || null;
}
// one tap for the whole team: everyone not yet marked that day gets the status
export function markAll({ date, status }) {
  const a = att(); const day = (a.days[date] ||= {});
  for (const p of a.people.filter((x) => x.active)) if (!day[p.id]) day[p.id] = { status };
  writeJson(ATT, a);
  return day;
}
// rows for an Excel sheet: header + one row per person (each day's letter) + totals
export function monthRows(month) {
  const { people, days } = attendanceMonth(month);
  const [y, m] = month.split('-').map(Number);
  const n = new Date(y, m, 0).getDate();
  const dates = Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const rows = [['Name', 'Role', ...dates.map((d) => d.slice(8)), 'Present', 'Half', 'Leave', 'WFH', 'Absent']];
  for (const p of people.filter((x) => x.active)) {
    const marks = dates.map((d) => days[d]?.[p.id]?.status || '');
    const c = (s) => marks.filter((x) => x === s).length;
    rows.push([p.name, p.role, ...marks, c('P'), c('H'), c('L'), c('W'), c('A')]);
  }
  return rows;
}
