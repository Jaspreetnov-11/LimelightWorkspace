// Home: today's tasks (/api/today) and the dashboard (/api/dashboard) - a little from every app in one call
// (tasks, clock-in, projects, HR activity, unread mail, today's meetings, which apps are up).
import { NEXT, send } from '../core.mjs';
import { auth } from '../state.mjs';
import { apps, appStatus } from '../app-list.mjs';
import { lighthouse, jwtId } from '../hr.mjs';
import { officeAs } from './office.mjs';

async function today(user) {
  const emp = jwtId(auth.lighthouseToken(user));
  const tasks = await lighthouse(user, `/api/tasks?assignee=${encodeURIComponent(emp || '')}&limit=50`);
  return (Array.isArray(tasks) ? tasks : []).filter((t) => !/done|complete|closed/i.test(t.status || ''))
    .slice(0, 6).map((t) => ({ title: t.title || t.name || 'Task', status: t.status || '', due: t.due_date || t.deadline || t.due || null }));
}

// Home dashboard: a little from every app in one call. Each part is null when its app does not answer.
// Home's numbers. Each source gets 3 s at most (a slow one shows "–", it never holds Home up), and the result is kept
// a minute per person: Home opens at once with it, and it is fetched again in the background after 15 s
const dashCache = new Map(); // email -> { at, data, busy }
async function dashboard(user) {
  const c = dashCache.get(user.email);
  if (c?.data && Date.now() - c.at < 60e3) {
    if (Date.now() - c.at > 15e3 && !c.busy) { c.busy = true; fetchDashboard(user).then((data) => dashCache.set(user.email, { at: Date.now(), data }), () => { c.busy = false; }); }
    return c.data;
  }
  const data = await fetchDashboard(user);
  dashCache.set(user.email, { at: Date.now(), data });
  return data;
}
async function fetchDashboard(user) {
  const within = (p, ms = 3000) => Promise.race([p, new Promise((_, bad) => setTimeout(() => bad(new Error('slow')), ms))]);
  const office = (p) => (officeAs(user) ? fetch('http://127.0.0.1:3300' + p, { headers: officeAs(user), signal: AbortSignal.timeout(3000) }).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null));
  const dayEnd = new Date().setHours(23, 59, 59, 999);
  const [tasks, punch, projects, activity, unread, meetings, status] = await Promise.allSettled([
    within(today(user)),
    within(lighthouse(user, '/api/attendance/today')),
    within(lighthouse(user, '/api/projects?limit=50')),
    within(lighthouse(user, '/api/activity?limit=8')),
    office('/api/lmail/unread'),
    office(`/api/cal?from=${new Date().toISOString()}&to=${new Date(dayEnd).toISOString()}`),
    Promise.all(apps().map(appStatus)),
  ]);
  const ok = (r) => (r.status === 'fulfilled' ? r.value : null);
  const mp = ok(punch)?.myPunch || ok(punch)?.punch || null;
  const plist = Array.isArray(ok(projects)) ? ok(projects) : ok(projects)?.items || null;
  return {
    tasks: ok(tasks),
    punch: ok(punch) ? { in: mp?.clock_in || null, out: mp?.clock_out || null } : null,
    projects: plist && plist.filter((x) => !/done|complete|closed|cancel/i.test(x.status || ''))
      .map((x) => ({ name: x.name, client: x.client || '', status: x.status || '' })),
    activity: Array.isArray(ok(activity)) ? ok(activity).slice(0, 8).map((a) => ({ text: a.text, at: a.created_at || a.at })) : null,
    mail: ok(unread) ? ok(unread).unread : null,
    meetings: Array.isArray(ok(meetings)) ? ok(meetings).map((e) => ({ title: e.title, start: e.start })) : null,
    status: Object.fromEntries((ok(status) || []).map((s) => [s.id, s.up])),
  };
}

export async function route(req, res, { u, p, user }) {
  if (p === '/api/today') return send(res, 200, { tasks: await today(user) });
  if (p === '/api/dashboard') return send(res, 200, await dashboard(user));
  return NEXT;
}
