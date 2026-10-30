// Limelight Workspace - one login for every app.
// The Workspace login IS the Lighthouse account (email + password, checked by Lighthouse). After that the Workspace
// signs the person in to Lighthouse (saved token) and Limelight AI (office password in config.json) itself, and vouches
// for them to Edit and Office with those apps' keys - no app ever asks for a second sign-in. The Lighthouse token is kept AES-encrypted in Data/ (key in Data/secret.key, never leaves this PC).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function createAuth({ root, lighthouseUrl, editorUrl, aiUrl, aiPassword, keepSignedIn = () => false }) {
  const DATA = root;
  fs.mkdirSync(DATA, { recursive: true });
  const KEY_FILE = path.join(DATA, 'secret.key'), USERS = path.join(DATA, 'users.json'), SESS = path.join(DATA, 'sessions.json');
  if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32).toString('hex'));
  const KEY = Buffer.from(fs.readFileSync(KEY_FILE, 'utf8').trim(), 'hex');
  const load = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
  const users = load(USERS), sessions = load(SESS);
  const saveUsers = () => fs.writeFileSync(USERS, JSON.stringify(users, null, 2));
  const saveSess = () => fs.writeFileSync(SESS, JSON.stringify(sessions));

  const enc = (s) => { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const out = Buffer.concat([c.update(String(s), 'utf8'), c.final()]); return [iv, c.getAuthTag(), out].map((b) => b.toString('base64')).join('.'); };
  const dec = (s) => { if (!s) return ''; const [iv, tag, out] = s.split('.').map((b) => Buffer.from(b, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv); d.setAuthTag(tag); return Buffer.concat([d.update(out), d.final()]).toString('utf8'); };
  const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
  const pwOk = (pw, h) => { if (!h) return false; const [salt, want] = h.split(':');
    return crypto.timingSafeEqual(Buffer.from(want, 'hex'), crypto.scryptSync(pw, salt, 32)); };
  const sessKey = (tok) => crypto.createHash('sha256').update(tok).digest('hex');
  const cookieOf = (req, k) => (new RegExp(`(?:^|;\\s*)${k}=([^;]+)`).exec(req.headers.cookie || '') || [])[1];
  const base = (u) => String(typeof u === 'function' ? u() : u).replace(/\/$/, '');

  // ---- Workspace login (via Lighthouse; offline it accepts the last password that Lighthouse confirmed) ----
  async function login(email, password) {
    email = String(email || '').trim().toLowerCase(); password = String(password || '');
    if (!email || !password) throw Object.assign(new Error('Enter both email and password'), { code: 400 });
    let r, j = {};
    try {
      r = await fetch(base(lighthouseUrl) + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10000) });
      j = await r.json().catch(() => ({}));
    } catch {
      const u = users[email];
      if (u && pwOk(password, u.pw)) return newSession(email, true);
      throw Object.assign(new Error('Could not reach Lighthouse (check your internet). The first sign-in needs an internet connection.'), { code: 503 });
    }
    // (Lighthouse sends its error as text or as { message }; a validation error, e.g. a too-short password, is still "wrong")
    const why = typeof j.error === 'object' ? j.error?.message : j.error || j.message;
    if (!r.ok || !j.data?.token) throw Object.assign(new Error(!why || /validation/i.test(why) ? 'Wrong email or password' : why), { code: 401 });
    const name = j.data.employee?.name || j.data.user?.name || email.split('@')[0];
    users[email] = { ...(users[email] || {}), email, name, role: j.data.user?.role || 'staff', pw: hashPw(password),
      lighthouse: enc(j.data.token) };
    saveUsers();
    return newSession(email, false);
  }
  // sessions last 30 days; for the people in keepSignedIn, 10 years (signed in once per device, never asked again)
  const LONG = 3650 * 864e5;
  function newSession(email, offline) {
    const tok = crypto.randomBytes(24).toString('hex'), keep = !!users[email] && keepSignedIn(users[email]);
    sessions[sessKey(tok)] = { email, at: Date.now(), ...(keep ? { keep: true } : {}) };
    for (const [k, s] of Object.entries(sessions)) if (Date.now() - s.at > (s.keep ? LONG : 30 * 864e5)) delete sessions[k];
    saveSess();
    return { token: tok, offline, keep, user: publicUser(email) };
  }
  function logout(req) { const t = cookieOf(req, 'lw_sess'); if (t) { delete sessions[sessKey(t)]; saveSess(); } }
  // a session lasts 30 days (keepSignedIn: 10 years) from its last use - renew() moves it on
  const expired = (s) => Date.now() - s.at > (s.keep ? LONG : 30 * 864e5);
  function userOf(req) {
    const t = cookieOf(req, 'lw_sess'); const s = t && sessions[sessKey(t)];
    if (s && expired(s)) { delete sessions[sessKey(t)]; saveSess(); return null; }
    return s && users[s.email] ? users[s.email] : null;
  }
  // used today? the 30 days start again (at most once a day, so the file is not written on every click): a new cookie, else ''
  function renew(req, domain) {
    const t = cookieOf(req, 'lw_sess'); const s = t && sessions[sessKey(t)];
    if (!s || expired(s) || Date.now() - s.at < 864e5) return '';
    s.at = Date.now(); saveSess();
    return sessionCookie(t, domain, s.keep);
  }
  // on the public domain the cookie is shared by lighthouse.* and the lh-* app hosts (one login for all of them)
  const scope = (domain) => (domain ? `; Domain=${domain}; Secure` : '');
  const sessionCookie = (tok, domain, keep) => `lw_sess=${tok}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${(keep ? 3650 : 30) * 86400}${scope(domain)}`;
  const clearCookie = (domain) => `lw_sess=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${scope(domain)}`;
  function publicUser(email) {
    const u = users[email]; if (!u) return null;
    return { email: u.email, name: u.name, role: u.role };
  }

  // ---- sign-in to Limelight AI with the office password (config), done by the Workspace server ----
  const appSess = new Map(); // `${email}|${app}` -> [cookie name, value]
  async function aiLogin(password) {
    const r = await fetch(base(aiUrl) + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }), signal: AbortSignal.timeout(8000) });
    const c = (r.headers.getSetCookie?.() || []).map((x) => /^ll_token=([^;]+)/.exec(x)?.[1]).find(Boolean);
    if (!r.ok || !c) throw new Error('The Limelight AI password is wrong (config.json aiPassword)');
    return c;
  }
  async function appCookie(u, app) {
    const k = `${u.email}|${app}`;
    if (appSess.has(k)) return appSess.get(k);
    if (app !== 'ai' || !aiPassword()) return null;
    const v = ['ll_token', await aiLogin(aiPassword())];
    appSess.set(k, v);
    return v;
  }
  const forgetApp = (u, app) => appSess.delete(`${u.email}|${app}`);
  const forgetAll = (app) => { for (const k of appSess.keys()) if (k.endsWith('|' + app)) appSess.delete(k); };
  const lighthouseToken = (u) => dec(u.lighthouse);

  // One login only: Edit is never signed in to separately any more. Sign-ins kept from before (they could be someone
  // else's Edit account) are dropped.
  if (Object.values(users).some((u) => u.edit || u.editName)) {
    for (const u of Object.values(users)) { delete u.edit; delete u.editName; }
    saveUsers();
  }

  return { login, logout, userOf, renew, publicUser, sessionCookie, clearCookie, appCookie, forgetApp, forgetAll, lighthouseToken,
    users: () => Object.values(users) };
}
