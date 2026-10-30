// The HR server (Lighthouse) asked as the signed-in person, with their own token: reads and writes, the staff list
// (safe fields only), everyone who can be chatted with, and where profile photos are kept.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { config, DATA } from './config.mjs';
import { auth, chat } from './state.mjs';

// ---------- Lighthouse data for the signed-in person (their own token) ----------
export async function lighthouse(user, p) {
  const r = await fetch(config.lighthouseUrl.replace(/\/$/, '') + p, { headers: { Authorization: `Bearer ${auth.lighthouseToken(user)}` },
    signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Office server ${r.status}`);
  return (await r.json()).data;
}
export const jwtId = (tok) => { try { return JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()).id; } catch { return null; } };
let peopleCache = { at: 0, list: [] };
// everyone who can be chatted with: Lighthouse staff, plus anyone who has signed in to the Workspace
export async function people(user) {
  if (Date.now() - peopleCache.at > 5 * 60000) {
    try {
      const staff = await lighthouse(user, '/api/employees?limit=500');
      peopleCache = { at: Date.now(), list: (Array.isArray(staff) ? staff : staff?.items || []).filter((e) => e.email)
        .map((e) => ({ email: String(e.email).toLowerCase(), name: e.name || e.email.split('@')[0], dept: e.dept || e.department || '' })) };
    } catch { /* offline: workspace users only */ }
  }
  const byEmail = new Map(peopleCache.list.map((p) => [p.email, p]));
  for (const u of auth.users()) if (!byEmail.has(u.email)) byEmail.set(u.email, { email: u.email, name: u.name, dept: '' });
  const online = new Set(chat.online());
  return [...byEmail.values()].map((p) => ({ ...p, online: online.has(p.email), photo: fs.existsSync(photoFile(p.email)) })).sort((a, b) => a.name.localeCompare(b.name));
}
export const nameMap = async (user) => Object.fromEntries((await people(user)).map((p) => [p.email, p.name]));

export async function lighthouseSend(user, method, p, body) {
  const r = await fetch(config.lighthouseUrl.replace(/\/$/, '') + p, { method, body: JSON.stringify(body || {}),
    headers: { Authorization: `Bearer ${auth.lighthouseToken(user)}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || j?.message || `Office server ${r.status}`), { status: r.status });
  return j.data;
}

// ---------- profiles: only the safe fields (no salary, bank, IDs, phone) ----------
export const SAFE = (e) => e && { id: e.id, name: e.name, title: e.role || '', dept: e.dept || '', email: String(e.email || '').toLowerCase(),
  empId: e.emp_id || '', joined: e.joined || '', shift: e.shift || '', ini: e.ini || '', active: e.active !== 0,
  leave: { casual: +(e.general_info?.casual_leave ?? 0) || null, sick: +(e.general_info?.sick_leave ?? 0) || null } };
let staffCache = { at: 0, list: [] };
export async function staff(user) {
  if (Date.now() - staffCache.at > 5 * 60000 || !staffCache.list.length) {
    const r = await lighthouse(user, '/api/employees?limit=500');
    staffCache = { at: Date.now(), list: (Array.isArray(r) ? r : r?.items || []).map(SAFE).filter((e) => e.email && e.active) };
  }
  return staffCache.list;
}
export const PHOTOS = path.join(DATA, 'photos');
export const photoFile = (email) => path.join(PHOTOS, crypto.createHash('sha1').update(String(email).toLowerCase()).digest('hex') + '.jpg');
