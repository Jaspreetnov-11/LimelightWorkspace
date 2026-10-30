// Edit (the video editor PCs): who a person is in Edit when the workspace vouches for them with Edit's key, the
// page shown when they have no Edit account, and sharing an Edit project in Edit itself. No routes of its own:
// used by apps-proxy.mjs, library.mjs (/api/renders) and share.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { config, DATA } from '../config.mjs';
import { apps, targetOf } from '../app-list.mjs';
import { auth, firstName } from '../state.mjs';
import { staff } from '../hr.mjs';

// Edit (the editor PCs) signs a person in as their Edit team member when Lighthouse vouches with Edit's key. Who they are
// in Edit, the first of these that Edit has: config.json "editNames" (email -> an older Edit name), their office ID (the
// start of their email), their first name when no one else on the staff list shares it. Nobody gets Edit's own sign-in:
// no match means no Edit (noEditPage).
const EDIT_KEY = path.join(DATA, 'edit.key');
export async function editAs(user) {
  let key = ''; try { key = fs.readFileSync(EDIT_KEY, 'utf8').trim(); } catch {}
  if (!key) return null;
  const list = await staff(user).catch(() => []);
  const count = (n) => list.filter((e) => firstName(e.name) === n || firstName(e.email) === n).length;
  const email = String(user.email || '').toLowerCase(), first = firstName(user.name);
  const names = [(config.editNames || {})[email], email.split('@')[0], first.length >= 3 && count(first) === 1 && first]
    .filter((n, i, all) => n && all.indexOf(n) === i);
  for (const name of names) {
    const vouch = { 'x-lh-key': key, 'x-lh-edit': name };
    if (await editMember(vouch)) return vouch;
  }
  return null;
}
// does Edit let this name in? (asked once a minute a name; an Edit that does not answer is given the benefit of the doubt)
export const editMembers = new Map();
async function editMember(vouch) {
  const hit = editMembers.get(vouch['x-lh-edit']);
  if (hit && Date.now() - hit.at < 60e3) return hit.ok;
  let ok = true;
  try {
    const t = new URL(targetOf(apps().find((x) => x.id === 'editor')));
    const r = await fetch(t.origin + '/api/chat', { headers: vouch, signal: AbortSignal.timeout(5000) });
    r.body?.cancel?.();
    ok = r.status !== 401;
  } catch {}
  editMembers.set(vouch['x-lh-edit'], { at: Date.now(), ok });
  return ok;
}
export const noEditPage = (user) => `<!doctype html><body style="margin:0;height:100vh;display:grid;place-content:center;text-align:center;
  background:#0b0c0f;color:#8b93a3;font:15px Segoe UI,sans-serif"><h2 style="color:#eceef2;margin:0 0 6px">Edit is not on for you yet</h2>
  <p>${String(user.name || user.email).replace(/[<>&"]/g, '')}, your Limelight login is used in Edit too - no second sign-in.<br>
  Ask the owner to add <b style="color:#ffc21a">${firstName(user.name) || firstName(user.email)}</b> to Edit's team, then press Reload.</p></body>`;

export async function editShare(user, project, emails) {
  const as = await editAs(user); if (!as) return 'Edit is not on for your login - the link was sent, but the project was not shared in Edit';
  const list = await staff(user).catch(() => []);
  const names = [];
  for (const e of emails) {
    const u = auth.users().find((x) => x.email === e), s = list.find((x) => x.email === e);
    const n = await editAs(u || { email: e, name: s?.name || '' }).catch(() => null);
    if (n) names.push(n['x-lh-edit']);
  }
  if (!names.length) return 'None of them has an Edit account';
  const t = new URL(targetOf(apps().find((x) => x.id === 'editor')));
  const call = async (method, body) => {
    const r = await fetch(`${t.origin}/api/projects/share?p=${encodeURIComponent(project)}`, { method,
      headers: { ...as, 'content-type': 'application/json' }, body: body && JSON.stringify(body), signal: AbortSignal.timeout(8000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Edit said ${r.status}`);
    return j;
  };
  try {
    const now = await call('GET');
    const want = names.filter((n) => (now.people || []).some((p) => p.toLowerCase() === n.toLowerCase()))
      .map((n) => now.people.find((p) => p.toLowerCase() === n.toLowerCase()));
    if (!want.length) return 'None of them has an Edit account';
    await call('POST', { shared: [...new Set([...(now.shared || []), ...want])] });
    return `Shared in Edit with ${want.join(', ')}`;
  } catch (e) { return `Link sent, but Edit did not share the project: ${e.message}`; }
}
