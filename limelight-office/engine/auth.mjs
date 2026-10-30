// auth.mjs - Limelight team accounts: the owner (admin) and the people they add. Passwords are scrypt hashes;
// a login gives a session cookie (30 days). On this PC (127.0.0.1) the owner is signed in without a password.
import crypto from 'node:crypto';
import os from 'node:os';
import { db, all, one, run, uid, seal, unseal } from './db.mjs';
import { lhLogin, lhStaff, isAdminRole } from './lighthouse.mjs';
import { load as loadCfg } from './config.mjs';

const COLORS = ['#ffc21a', '#4f8cff', '#2fbf71', '#ff7a45', '#b49cff', '#ff5a8a', '#26b5a6', '#e0b13a', '#6aa5ff', '#f472b6'];
const SESSION_DAYS = 30;

const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(String(pw), salt, 32).toString('hex')}`;
function check(pw, stored) {
  if (!stored) return false;
  const [salt, h] = stored.split(':');
  const a = Buffer.from(hash(pw, salt).split(':')[1], 'hex'), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, login: u.login, email: u.email, role: u.role, title: u.title, color: u.color, hasPassword: !!u.pass, hasMail: !!u.mailcfg };
}

// the first person is the owner of this install (admin, signed in automatically on this PC)
export function owner() {
  let u = one("SELECT * FROM users WHERE role = 'admin' ORDER BY created LIMIT 1");
  if (!u) {
    const name = (os.userInfo().username || 'Admin').replace(/^\w/, (c) => c.toUpperCase());
    run('INSERT INTO users (id, name, login, role, color, created) VALUES (?, ?, ?, ?, ?, ?)', uid(), name, 'admin', 'admin', COLORS[0], Date.now());
    u = one("SELECT * FROM users WHERE role = 'admin' ORDER BY created LIMIT 1");
  }
  return u;
}

export const byId = (id) => one('SELECT * FROM users WHERE id = ?', id);
export const team = () => all('SELECT * FROM users WHERE active = 1 ORDER BY name').map(publicUser);

export function createUser({ name, login, password, email = '', role = 'member', title = '' }) {
  name = String(name || '').trim(); login = String(login || '').trim().toLowerCase();
  if (!name || !/^[a-z0-9._-]{2,32}$/.test(login)) throw new Error('Give a name and a login (letters, numbers, . _ -)');
  if (one('SELECT 1 FROM users WHERE login = ?', login)) throw new Error('That login is taken');
  if (!password || String(password).length < 6) throw new Error('Password needs at least 6 characters');
  const n = one('SELECT COUNT(*) n FROM users').n;
  const id = uid();
  run('INSERT INTO users (id, name, login, email, role, title, pass, color, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, name, login, String(email).trim(), role === 'admin' ? 'admin' : 'member', String(title).trim(), hash(password), COLORS[n % COLORS.length], Date.now());
  return publicUser(byId(id));
}
export function updateUser(id, patch) {
  const u = byId(id); if (!u) throw new Error('No such user');
  for (const k of ['name', 'email', 'title', 'role', 'active']) if (patch[k] !== undefined) run(`UPDATE users SET ${k} = ? WHERE id = ?`, k === 'active' ? (patch[k] ? 1 : 0) : String(patch[k]), id);
  if (patch.login !== undefined) {
    const login = String(patch.login).trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,32}$/.test(login)) throw new Error('Login: letters, numbers, . _ -');
    if (one('SELECT 1 FROM users WHERE login = ? AND id <> ?', login, id)) throw new Error('That login is taken');
    run('UPDATE users SET login = ? WHERE id = ?', login, id);
  }
  if (patch.password) {
    if (String(patch.password).length < 6) throw new Error('Password needs at least 6 characters');
    run('UPDATE users SET pass = ? WHERE id = ?', hash(patch.password), id);
    run('DELETE FROM sessions WHERE user_id = ?', id);
  }
  return publicUser(byId(id));
}

// One login: the Lighthouse account (email + password, checked by Lighthouse) — same as the Lighthouse workspace.
// When Lighthouse can't be reached, the last password Lighthouse accepted on this PC still works.
export async function login(email, password) {
  email = String(email || '').trim().toLowerCase(); password = String(password || '');
  if (!email || !password) throw Object.assign(new Error('Enter both email and password'), { status: 400 });
  let u = one('SELECT * FROM users WHERE (lower(email) = ? OR login = ?) AND active = 1', email, email);
  try {
    const lh = await lhLogin(email, password);
    const n = one('SELECT COUNT(*) n FROM users').n;
    if (!u) {
      const id = uid();
      run('INSERT INTO users (id, name, login, email, role, color, created) VALUES (?, ?, ?, ?, ?, ?, ?)', id, lh.name, email, email, isAdminRole(lh.role) ? 'admin' : 'member', COLORS[n % COLORS.length], Date.now());
      u = byId(id);
    }
    run('UPDATE users SET name = ?, email = ?, pass = ?, lhtoken = ?, role = CASE WHEN role = \'admin\' THEN role ELSE ? END WHERE id = ?',
      lh.name, email, hash(password), seal(lh.token), isAdminRole(lh.role) ? 'admin' : 'member', u.id);
    u = byId(u.id);
    syncStaff(lh.token).catch(() => {});
  } catch (e) {
    if (!e.offline) throw e;
    if (!u || !check(password, u.pass)) throw Object.assign(new Error('Couldn’t connect to Limelight (check your internet). The first sign-in needs an internet connection.'), { status: 503 });
  }
  const token = crypto.randomBytes(32).toString('base64url');
  run('INSERT INTO sessions (token, user_id, created, expires) VALUES (?, ?, ?, ?)', token, u.id, Date.now(), Date.now() + SESSION_DAYS * 864e5);
  return { token, user: publicUser(u) };
}
export function fromToken(token) {
  if (!token) return null;
  const s = one('SELECT * FROM sessions WHERE token = ?', token);
  if (!s || s.expires < Date.now()) return null;
  const u = byId(s.user_id);
  return u?.active ? u : null;
}
export async function linkOwner(id, email, password) {
  email = String(email || '').trim().toLowerCase();
  const lh = await lhLogin(email, String(password || ''));
  const other = one('SELECT id FROM users WHERE (lower(email) = ? OR login = ?) AND id <> ?', email, email, id);
  if (other) { run('UPDATE guests SET user_id = ? WHERE user_id = ?', id, other.id); run('UPDATE mail SET owner = ? WHERE owner = ?', id, other.id); run('DELETE FROM users WHERE id = ?', other.id); }
  run('UPDATE users SET name = ?, email = ?, pass = ?, lhtoken = ? WHERE id = ?', lh.name, email, hash(password), seal(lh.token), id);
  const people = await syncStaff(lh.token).catch(() => 0);
  return { user: publicUser(byId(id)), people };
}
export const lhToken = (u) => { try { return unseal(u?.lhtoken || ''); } catch { return ''; } };
// Lighthouse staff become Office people (for mail, invites and calls); they sign in with their own Lighthouse password
export async function syncStaff(token) {
  const staff = await lhStaff(token);
  let n = one('SELECT COUNT(*) n FROM users').n;
  for (const s of staff) {
    const u = one('SELECT id, name FROM users WHERE lower(email) = ? OR login = ?', s.email, s.email);
    if (u) { if (!u.name || u.name === s.email.split('@')[0]) run('UPDATE users SET name = ? WHERE id = ?', s.name, u.id); if (s.title) run("UPDATE users SET title = CASE WHEN title = '' THEN ? ELSE title END WHERE id = ?", s.title, u.id); continue; }
    run('INSERT INTO users (id, name, login, email, title, role, color, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', uid(), s.name, s.email, s.email, s.title, 'member', COLORS[n++ % COLORS.length], Date.now());
  }
  return staff.length;
}
// a person the Lighthouse workspace on this PC vouches for (it already checked their Lighthouse login): their own Office
// account, made on first visit. The owner keeps the main account when their email matches it - and an owner of Limelight
// whose email this install's owner account does not have yet takes that account (one profile, never a second one).
export function asPerson({ email, name, role, owner: isOwner }) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return null;
  let u = one('SELECT * FROM users WHERE lower(email) = ? OR login = ?', email, email);
  if (!u && isOwner && !owner().email) { run('UPDATE users SET email = ?, name = ? WHERE id = ?', email, String(name || owner().name), owner().id); u = owner(); }
  if (!u) {
    const n = one('SELECT COUNT(*) n FROM users').n, id = uid();
    run('INSERT INTO users (id, name, login, email, role, color, created) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, String(name || email.split('@')[0]), email, email, isAdminRole(role) ? 'admin' : 'member', COLORS[n % COLORS.length], Date.now());
    u = byId(id);
  }
  return u.active ? u : null;
}
export const logout = (token) => run('DELETE FROM sessions WHERE token = ?', token);

// company-domain mailbox (IMAP + SMTP) of one person; the password is kept sealed
export function setMailCfg(id, cfg) {
  if (!cfg) { run("UPDATE users SET mailcfg = '' WHERE id = ?", id); return; }
  const old = getMailCfg(id) || {};
  const c = { address: String(cfg.address || '').trim(), name: String(cfg.name || '').trim(), user: String(cfg.user || cfg.address || '').trim(),
    imapHost: String(cfg.imapHost || '').trim(), imapPort: +cfg.imapPort || 993, smtpHost: String(cfg.smtpHost || '').trim(), smtpPort: +cfg.smtpPort || 465,
    // Google app passwords are shown in groups of four; the spaces are not part of them
    pass: cfg.pass ? seal(/gmail\.com$/.test(String(cfg.imapHost)) ? String(cfg.pass).replace(/\s+/g, '') : cfg.pass) : old.passSealed || '' };
  if (!c.address || !c.imapHost || !c.smtpHost || !c.pass) throw new Error('Fill the address, servers and password');
  run('UPDATE users SET mailcfg = ?, email = CASE WHEN email = \'\' THEN ? ELSE email END WHERE id = ?', JSON.stringify(c), c.address, id);
}
export function getMailCfg(id) {
  if (loadCfg().teamMailOnly !== false) return null; // (team mail only: no outside mailbox, ever)
  const u = byId(id); if (!u?.mailcfg) return null;
  const c = JSON.parse(u.mailcfg);
  return { ...c, passSealed: c.pass, pass: unseal(c.pass) };
}
export { db };
