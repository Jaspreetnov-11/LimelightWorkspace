// Lighthouse - work time. Every page (the workspace and each app inside it) says when the mouse or keyboard was last
// used; the workspace sends that every 30 s. A session runs while someone keeps working in one app (or page) and ends
// 5 minutes after their last touch - so a day's sessions show how long went into Edit, Design, Office, Chats…
// Stored per day in Data/activity/<YYYY-MM-DD>.json: { email: [{ app, start, end }] } (times in ms).
import fs from 'node:fs';
import path from 'node:path';

export const IDLE_MS = 5 * 60e3;
const day = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function createActivity({ root }) {
  const DIR = path.join(root, 'activity');
  fs.mkdirSync(DIR, { recursive: true });
  const days = new Map(); // YYYY-MM-DD -> { email: [sessions] }
  const file = (d) => path.join(DIR, `${d}.json`);
  const load = (d) => {
    if (!days.has(d)) { let o = {}; try { o = JSON.parse(fs.readFileSync(file(d), 'utf8')); } catch {} days.set(d, o); }
    if (days.size > 8) days.delete(days.keys().next().value);
    return days.get(d);
  };
  const dirty = new Set();
  setInterval(() => { for (const d of dirty) { try { fs.writeFileSync(file(d), JSON.stringify(days.get(d) || {})); } catch {} } dirty.clear(); }, 15e3).unref();

  // a beat: { app, last } - last = when this person last used the mouse / keyboard (their clock is not trusted beyond now)
  function beat(email, b) {
    const now = Date.now(), app = String(b.app || 'home').replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'home';
    const last = Math.min(now, Math.max(now - IDLE_MS, +b.last || 0));
    if (now - last >= IDLE_MS) return { idle: true };
    const d = day(last), all = load(d), mine = (all[email] ||= []);
    const open = [...mine].reverse().find((s) => s.app === app);
    if (open && last - open.end < IDLE_MS) open.end = Math.max(open.end, last);
    else mine.push({ app, start: last, end: last });
    dirty.add(d);
    return { idle: false };
  }

  // one person's day: their sessions and the total per app (ms)
  function report(email, d = day(Date.now())) {
    const sessions = (load(d)[email] || []).map((s) => ({ ...s, ms: s.end - s.start })).filter((s) => s.ms >= 30e3);
    const total = {}; for (const s of sessions) total[s.app] = (total[s.app] || 0) + s.ms;
    return { day: d, sessions, total, all: Object.values(total).reduce((a, b) => a + b, 0) };
  }
  // everyone's day (admins): the totals only
  function team(d = day(Date.now())) {
    return Object.keys(load(d)).map((email) => { const r = report(email, d); return { email, total: r.total, all: r.all, first: r.sessions[0]?.start, last: r.sessions.at(-1)?.end }; })
      .filter((x) => x.all > 0).sort((a, b) => b.all - a.all);
  }
  return { beat, report, team };
}
