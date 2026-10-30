// Profile: clock in / out (/api/punch), my profile, the team list, profile photos, and work time - activity
// beats, my day, the Time board (/api/timeboard) and the admins' team view (/api/activity/team).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { NEXT, send, readBody, readJson } from '../core.mjs';
import { chat, activity, isOwner, isAdmin } from '../state.mjs';
import { lighthouse, lighthouseSend, people, SAFE, staff, PHOTOS, photoFile } from '../hr.mjs';

// ---------- clock in / out (Lighthouse attendance) ----------
async function punch(user) {
  const [t, st] = await Promise.all([lighthouse(user, '/api/attendance/today'), lighthouse(user, '/api/settings').catch(() => ({}))]);
  const mp = t?.myPunch || null;
  return { in: mp?.clock_in || null, out: mp?.clock_out || null, mode: mp?.mode || null, sessions: mp?.session_count || (mp ? 1 : 0),
    selfieIn: st?.selfieOnClockIn !== false, selfieOut: !!st?.selfieOnClockOut };
}

async function myProfile(user) {
  const me = await lighthouse(user, '/api/auth/me');
  const emp = SAFE(me?.employee) || { name: user.name, email: user.email, title: '', dept: '' };
  const month = new Date().toISOString().slice(0, 7);
  const [stats, leaves] = await Promise.allSettled([lighthouse(user, `/api/attendance/stats/${emp.id}?month=${month}`), lighthouse(user, '/api/leaves')]);
  const s = stats.status === 'fulfilled' ? stats.value : null;
  const mine = leaves.status === 'fulfilled' && Array.isArray(leaves.value) ? leaves.value.filter((l) => l.emp === emp.id) : [];
  return { ...emp, photo: fs.existsSync(photoFile(emp.email)),
    month: s && { month, present: s.present, half: s.half, absent: s.absent, late: s.late, leave: s.leave, workdays: s.workdaysSoFar, avgMin: s.avgWorkingMinutes, workedMin: s.totalWorkedMinutes },
    leaves: mine.slice(0, 20).map((l) => ({ kind: l.kind, from: String(l.from_date).slice(0, 10), to: String(l.to_date).slice(0, 10), status: l.status || 'pending', reason: l.reason || '' })) };
}

export async function route(req, res, { u, p, user }) {
  let m;
  if (p === '/api/punch' && isOwner(user)) return send(res, 200, { owner: true }); // (owners do not clock in)
  if (p === '/api/punch' && req.method === 'GET') return send(res, 200, await punch(user));
  if (p === '/api/punch' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req, 3 * 1024 * 1024)).toString('utf8') || '{}');
    const body = { addr: String(b.addr || '').slice(0, 200) };
    if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) Object.assign(body, { lat: b.lat, lng: b.lng, acc: b.acc });
    if (typeof b.selfie === 'string' && b.selfie.startsWith('data:image/')) body.selfie = b.selfie;
    try {
      if (b.action === 'out') await lighthouseSend(user, 'POST', '/api/attendance/clock-out', body);
      else await lighthouseSend(user, 'POST', '/api/attendance/clock-in', { ...body, mode: ['office', 'wfh', 'field'].includes(b.mode) ? b.mode : 'office' });
    } catch (e) { return send(res, e.status && e.status < 500 ? 400 : 502, { error: e.message }); }
    return send(res, 200, await punch(user));
  }
  if (p === '/api/profile') return send(res, 200, await myProfile(user));
  if (p === '/api/team') {
    const list = await staff(user).catch(async () => (await people(user)).map((x) => ({ name: x.name, email: x.email, dept: x.dept, title: '' })));
    const online = new Set(chat.online());
    return send(res, 200, list.map(({ leave, ...e }) => ({ ...e, photo: fs.existsSync(photoFile(e.email)), online: online.has(e.email) })));
  }
  if ((m = /^\/api\/photo\/([^/]+)$/.exec(p)) && req.method === 'GET') {
    const f = photoFile(decodeURIComponent(m[1]));
    if (!fs.existsSync(f)) return send(res, 404, { error: 'no photo' });
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=60' });
    return fs.createReadStream(f).pipe(res);
  }
  // own photo; an admin may set anyone's
  if (p === '/api/photo' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req, 3 * 1024 * 1024)).toString('utf8') || '{}');
    const who = String(b.email || user.email).toLowerCase();
    if (who !== user.email && !isAdmin(user)) return send(res, 403, { error: 'Only your own photo' });
    const mm = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
    if (!mm) return send(res, 400, { error: 'Send a JPEG picture' });
    fs.mkdirSync(PHOTOS, { recursive: true });
    await fsp.writeFile(photoFile(who), Buffer.from(mm[1], 'base64'));
    return send(res, 200, { ok: true });
  }
  // ---------- work time (5 minutes without mouse / keyboard ends a session) ----------
  if (p === '/api/activity/beat' && req.method === 'POST') return send(res, 200, isOwner(user) ? { owner: true } : activity.beat(user.email, await readJson(req)));
  if (p === '/api/activity') {
    const who = String(u.searchParams.get('who') || user.email).toLowerCase(), d = u.searchParams.get('day') || undefined;
    if (who !== user.email && !isAdmin(user)) return send(res, 403, { error: 'Only your own time' });
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return send(res, 400, { error: 'Bad day' });
    return send(res, 200, activity.report(who, d));
  }
  // Profile > Time. Staff: their own clock in / clock out for the day. Admins: everyone's day - clock in / out, active
  // work in Lighthouse's apps (sessions), and their tasks' time (planned vs taken). The owners are left out.
  if (p === '/api/timeboard') {
    const d = u.searchParams.get('day') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return send(res, 400, { error: 'Bad day' });
    const list = await staff(user).catch(() => []);
    const att = await lighthouse(user, `/api/attendance?date=${d}&limit=1000`).catch(() => []);
    const punchOf = (id) => { const a = (att || []).find((x) => x.emp === id); return a ? { in: a.clock_in || '', out: a.clock_out || '', status: a.status || '', late: !!a.late, mode: a.mode || '', breakMins: a.break_mins || 0 } : null; };
    if (!isAdmin(user)) {
      const me = list.find((e) => e.email === user.email);
      return send(res, 200, { day: d, me: { name: user.name, punch: me ? punchOf(me.id) : null } });
    }
    const tasks = await lighthouse(user, '/api/tasks?limit=1000').catch(() => []);
    const onDay = (t) => [t.assigned, t.started_at, t.completed_at, t.updated_at].some((x) => String(x || '').slice(0, 10) === d);
    const rows = list.filter((e) => !isOwner(e)).map((e) => {
      const a = activity.report(e.email, d), mine = (tasks || []).filter((t) => t.assignee === e.id && onDay(t));
      return { email: e.email, name: e.name, dept: e.dept, punch: punchOf(e.id), active: a.all, total: a.total, sessions: a.sessions,
        tasks: mine.map((t) => ({ title: t.title, type: t.type || '', status: t.status, planned: +t.mins || 0, taken: +t.taken_mins || 0 })),
        taskMins: mine.reduce((n, t) => n + (+t.taken_mins || 0), 0) };
    }).filter((r) => r.punch || r.active || r.tasks.length)
      .sort((x, y) => (y.active - x.active) || (y.taskMins - x.taskMins) || x.name.localeCompare(y.name));
    return send(res, 200, { day: d, rows });
  }
  if (p === '/api/activity/team') {
    if (!isAdmin(user)) return send(res, 403, { error: 'Admins only' });
    const d = u.searchParams.get('day') || undefined;
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return send(res, 400, { error: 'Bad day' });
    return send(res, 200, { items: activity.team(d) });
  }
  return NEXT;
}
