// Office: the new Office pages' HR data (/api/hr/...), Overtime (/api/ot...) and Salary (/api/salary...), and the
// Office key that signs each person in to Limelight Office as themselves (officeAs, used by apps-proxy.mjs and Home).
import fs from 'node:fs';
import { NEXT, send, readJson } from '../core.mjs';
import { auth, salary, overtime, isOwner, isAdmin } from '../state.mjs';
import { lighthouse, lighthouseSend, jwtId } from '../hr.mjs';

const dayAttendance = new Map(); // day -> { at, rows }: everyone's clock for a day, for the Overtime check (a minute)

// Limelight Office (this PC) signs each person in as themselves when Lighthouse vouches for them with Office's key
const OFFICE_KEY = 'E:/Limelight Ai/limelight-office/data/workspace.key';
export function officeAs(user) {
  let key = ''; try { key = fs.readFileSync(OFFICE_KEY, 'utf8').trim(); } catch {}
  // no key: null, and the Office proxy refuses rather than letting the person in as the PC owner
  if (!key) return null;
  return { 'x-lh-key': key, 'x-lh-as': Buffer.from(JSON.stringify({ email: user.email, name: user.name, role: isAdmin(user) ? 'admin' : user.role, owner: isOwner(user) })).toString('base64url') };
}

export async function route(req, res, { u, p, user }) {
  // ---------- Salary (admins and owners): Lighthouse's payroll figures + typed OT / adjustments -> the month's pay ----------
  // ---------- Overtime (Office › Overtime): everyone writes their own OT a day; admins see everyone's and approve ----------
  // Each entry is checked against that day's clock-in / clock-out in the HR attendance.
  if (p.startsWith('/api/ot')) {
    const month = u.searchParams.get('month') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return send(res, 400, { error: 'Bad month' });
    const emp = jwtId(auth.lighthouseToken(user) || '');
    if (!emp) return send(res, 400, { error: 'Your HR account is not linked yet' });
    const me = { emp, email: user.email, name: user.name }, admin = isAdmin(user);
    try {
      if (p === '/api/ot' && req.method === 'GET') {
        const all = admin && u.searchParams.get('all') === '1', entries = overtime.list(month, all ? {} : { emp });
        const st = await lighthouse(user, '/api/settings').catch(() => ({})), hpd = +st?.hoursPerDay || 8;
        const recs = new Map(), key = (e, d) => `${e}|${d}`;
        if (all) {
          for (const d of [...new Set(entries.map((e) => e.date))]) {
            let c = dayAttendance.get(d);
            if (!c || Date.now() - c.at > 60e3) { c = { at: Date.now(), rows: await lighthouse(user, `/api/attendance?date=${d}`).catch(() => []) }; dayAttendance.set(d, c); }
            for (const r of c.rows || []) recs.set(key(r.emp, r.date || d), r);
          }
        } else for (const r of await lighthouse(user, `/api/attendance?empId=${emp}&month=${month}`).catch(() => []) || []) recs.set(key(emp, r.date), r);
        const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
        return send(res, 200, { month, admin, hoursPerDay: hpd, me: emp, today: overtime.clockOf(recs.get(key(emp, today)), hpd),
          entries: entries.map((e) => { const c = overtime.clockOf(recs.get(key(e.emp, e.date)), hpd); return { ...e, clock: c, check: overtime.check(e, c) }; }) });
      }
      if (p === '/api/ot' && req.method === 'POST') return send(res, 200, overtime.save(me, await readJson(req)));
      if (p === '/api/ot/remove' && req.method === 'POST') { const b = await readJson(req); return send(res, 200, overtime.remove(me, b.month || month, b.id, admin)); }
      if (p === '/api/ot/review' && req.method === 'POST') {
        if (!admin) return send(res, 403, { error: 'Admins only' });
        const b = await readJson(req); return send(res, 200, overtime.review(user.name || user.email, b.month || month, b.id, b));
      }
    } catch (err) { return send(res, err.status || 500, { error: err.message }); }
  }
  if (p.startsWith('/api/salary')) {
    if (!isAdmin(user)) return send(res, 403, { error: 'Admins only' });
    const month = u.searchParams.get('month') || new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return send(res, 400, { error: 'Bad month' });
    if (p === '/api/salary/input' && req.method === 'POST') return send(res, 200, salary.setInput(month, await readJson(req)));
    if (p === '/api/salary/rules' && req.method === 'POST') return send(res, 200, salary.setRules(await readJson(req)));
    if (p === '/api/salary') {
      const [pay, st] = await Promise.all([lighthouse(user, `/api/payroll?month=${month}`), lighthouse(user, '/api/settings').catch(() => ({}))]);
      return send(res, 200, salary.compute(pay, st, month, (e) => isOwner(e), overtime.approvedByEmp(month)));
    }
    // Payroll › Attendance: everyone's month, day by day (the HR app's team summary + holidays; owners left out)
    if (p === '/api/salary/attendance') {
      const [sum, hol] = await Promise.all([lighthouse(user, `/api/attendance/team-summary?month=${month}`), lighthouse(user, '/api/holidays').catch(() => [])]);
      const holidays = (hol || []).map((h) => ({ date: String(h.date || '').slice(0, 10), name: h.name || h.title || '' })).filter((h) => h.date.startsWith(month));
      const staff = (sum?.staff || []).filter((s) => !isOwner(s)).map((s) => ({ id: s.id, name: s.name, dept: s.dept, empId: s.emp_id, weekOff: s.weekOff,
        present: s.present, half: s.half, absent: s.absent, leave: s.leave, late: s.late, otHours: s.otHours, avgMins: s.avgWorkingMinutes,
        days: (s.days || []).map((d) => ({ date: String(d.date).slice(0, 10), status: d.status, late: d.late, mode: d.mode, mins: d.mins, open: d.open })),
        missed: (s.missedDays || []).map((d) => String(d).slice(0, 10)) }));
      return send(res, 200, { month, workdaysSoFar: sum?.workdaysSoFar, workdaysTotal: sum?.workdaysTotal, holidays, staff });
    }
  }
  // ---------- Office's new Home, Tasks and Projects pages (public/js/office-pages.js): the HR data, as this person ----------
  // Reads from a short list; writes only to tasks, to-dos and projects (the HR server checks who may do what).
  if (p.startsWith('/api/hr/')) {
    const sub = p.slice(7) + u.search, top = p.split('/')[3];
    const READ = ['tasks', 'projects', 'todos', 'activity', 'employees', 'departments', 'productivity', 'performance', 'attendance', 'holidays', 'clients'];
    const WRITE = ['tasks', 'todos', 'projects'];
    if (req.method === 'GET') { if (!READ.includes(top)) return send(res, 403, { error: 'Not available' }); return send(res, 200, { data: await lighthouse(user, `/api${sub}`) }); }
    if (!WRITE.includes(top)) return send(res, 403, { error: 'Not available' });
    try { return send(res, 200, { data: await lighthouseSend(user, req.method, `/api${sub}`, await readJson(req).catch(() => ({}))) }); }
    catch (err) { return send(res, err.status || 500, { error: err.message }); }
  }
  return NEXT;
}
