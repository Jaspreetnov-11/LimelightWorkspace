// db.mjs - the team database (SQLite built into Node): users, sessions, Limelight Mail, Calendar, Task, notifications.
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DATA } from './config.mjs';

export const db = new DatabaseSync(path.join(DATA, 'office.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, login TEXT UNIQUE NOT NULL COLLATE NOCASE, email TEXT DEFAULT '',
  role TEXT DEFAULT 'member', pass TEXT DEFAULT '', color TEXT DEFAULT '', title TEXT DEFAULT '',
  mailcfg TEXT DEFAULT '', active INTEGER DEFAULT 1, created INTEGER
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, created INTEGER, expires INTEGER);
CREATE TABLE IF NOT EXISTS mail (
  id TEXT PRIMARY KEY, owner TEXT REFERENCES users(id) ON DELETE CASCADE, folder TEXT, from_name TEXT, from_addr TEXT,
  to_json TEXT, cc_json TEXT, subject TEXT, text TEXT, html TEXT, atts TEXT DEFAULT '[]', date INTEGER,
  seen INTEGER DEFAULT 0, starred INTEGER DEFAULT 0, thread TEXT, external INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS mail_owner ON mail(owner, folder, date);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, owner TEXT REFERENCES users(id) ON DELETE CASCADE, title TEXT, start INTEGER, end INTEGER, all_day INTEGER DEFAULT 0,
  location TEXT DEFAULT '', notes TEXT DEFAULT '', room TEXT DEFAULT '', color TEXT DEFAULT '', recur TEXT DEFAULT '', created INTEGER
);
CREATE TABLE IF NOT EXISTS guests (event_id TEXT REFERENCES events(id) ON DELETE CASCADE, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, rsvp TEXT DEFAULT '', PRIMARY KEY (event_id, user_id));
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT, notes TEXT DEFAULT '', owner TEXT REFERENCES users(id) ON DELETE SET NULL, assignee TEXT REFERENCES users(id) ON DELETE SET NULL,
  due TEXT DEFAULT '', priority TEXT DEFAULT 'normal', status TEXT DEFAULT 'todo', project TEXT DEFAULT '', created INTEGER, done_at INTEGER, ord REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, kind TEXT, text TEXT, link TEXT, created INTEGER, seen INTEGER DEFAULT 0);
-- Office files someone shared with a teammate (to open and edit together); path is lower case
CREATE TABLE IF NOT EXISTS shares (path TEXT, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, by TEXT, created INTEGER, PRIMARY KEY (path, user_id));
`);

// columns added after the first version
for (const sql of ["ALTER TABLE users ADD COLUMN lhtoken TEXT DEFAULT ''"]) { try { db.exec(sql); } catch {} }

export const uid = () => crypto.randomBytes(9).toString('base64url');
export const all = (sql, ...a) => db.prepare(sql).all(...a);
export const one = (sql, ...a) => db.prepare(sql).get(...a);
export const run = (sql, ...a) => db.prepare(sql).run(...a);

// secrets at rest (domain mail passwords): AES-256-GCM with a key that never leaves data/
const KEY_FILE = path.join(DATA, 'secret.key');
if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32));
const KEY = fs.readFileSync(KEY_FILE);
export function seal(text) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(String(text), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
export function unseal(b64) {
  if (!b64) return '';
  const b = Buffer.from(b64, 'base64'), d = crypto.createDecipheriv('aes-256-gcm', KEY, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}
