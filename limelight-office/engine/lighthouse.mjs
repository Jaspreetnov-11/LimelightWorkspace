// lighthouse.mjs - the Lighthouse web app (staff, tasks, attendance, leaves, payroll …). Limelight Office signs people in
// with their Lighthouse account, keeps the staff list in sync, and shows Lighthouse's pages inside its own menu
// (same set-up as the Lighthouse workspace, but without needing the workspace).
import { load } from './config.mjs';

export const lhUrl = () => (load().lighthouseUrl || 'https://lighthouse.limelightcorp.in').replace(/\/$/, '');

// email + password -> { token, name, role } (Lighthouse checks them)
export async function lhLogin(email, password) {
  let r, j = {};
  try {
    r = await fetch(`${lhUrl()}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10000) });
    j = await r.json().catch(() => ({}));
  } catch { throw Object.assign(new Error('offline'), { offline: true }); }
  if (!r.ok || !j.data?.token) throw Object.assign(new Error(j.error?.message || j.message || 'Wrong email or password'), { status: 401 });
  return { token: j.data.token, name: j.data.employee?.name || j.data.user?.name || email.split('@')[0], role: j.data.user?.role || 'staff' };
}

export async function lhApi(token, p) {
  const r = await fetch(lhUrl() + p, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Limelight HR ${r.status}`);
  return (await r.json()).data;
}
// everyone in Lighthouse's staff list: [{ email, name, title }]
export async function lhStaff(token) {
  const d = await lhApi(token, '/api/employees?limit=500');
  return (Array.isArray(d) ? d : d?.items || []).filter((e) => e.email)
    .map((e) => ({ email: String(e.email).toLowerCase(), name: e.name || e.email.split('@')[0], title: e.designation || e.dept || e.department || '' }));
}
export const isAdminRole = (r) => /admin|owner|super/i.test(String(r || ''));
