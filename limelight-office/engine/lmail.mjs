// lmail.mjs - Limelight Mail: team mail inside the office (stored here) and each person's company-domain mailbox
// (IMAP to read, SMTP to send), shown together in one inbox. Mail to a team member stays internal; anyone else goes out by SMTP.
import fs from 'node:fs';
import path from 'node:path';
import { all, one, run, uid } from './db.mjs';
import { DATA } from './config.mjs';
import { byId, getMailCfg } from './auth.mjs';
import { notify } from './live.mjs';

// the mail libraries are big: loaded the first time a company mailbox is used, so the app starts fast
let libs = null;
const mailLibs = async () => (libs ||= { ImapFlow: (await import('imapflow')).ImapFlow, simpleParser: (await import('mailparser')).simpleParser, nodemailer: (await import('nodemailer')).default });
const FILES = path.join(DATA, 'mailfiles');
fs.mkdirSync(FILES, { recursive: true });
const teamAddr = (u) => u.email || `${u.login}@limelight`;
const snippet = (t = '') => t.replace(/\s+/g, ' ').trim().slice(0, 160);
const htmlToText = (h = '') => h.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// "Ravi", "ravi", "ravi@limelight", "ravi@limelightcorp.in" -> a team member
function teamMember(token) {
  const t = token.replace(/^.*<([^>]+)>.*$/, '$1').trim().toLowerCase();
  if (!t) return null;
  return all('SELECT * FROM users WHERE active = 1').find((u) => [u.login, `${u.login}@limelight`, (u.email || '').toLowerCase(), u.name.toLowerCase()].includes(t)) || null;
}
const splitAddrs = (s) => String(s || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean);

// ---------- domain mailbox (IMAP), one connection per person, closed after 5 idle minutes ----------
const conns = new Map();
// (a company mailbox server that is slow or unreachable must never hold up the team mail: 8 s at most, then without it)
const inTime = (p, ms = 8000) => Promise.race([p, new Promise((_, bad) => setTimeout(() => bad(new Error('The company mailbox is not answering - showing team mail')), ms))]);
async function imap(me) {
  const cfg = getMailCfg(me); if (!cfg) return null;
  const c = conns.get(me);
  if (c?.client.usable) { clearTimeout(c.timer); c.timer = setTimeout(() => close(me), 5 * 60e3); return c.client; }
  const { ImapFlow } = await mailLibs();
  const client = new ImapFlow({ host: cfg.imapHost, port: cfg.imapPort, secure: cfg.imapPort !== 143, auth: { user: cfg.user, pass: cfg.pass }, logger: false, tls: { rejectUnauthorized: false }, socketTimeout: 60e3 });
  client.on('error', () => close(me));
  await client.connect();
  conns.set(me, { client, timer: setTimeout(() => close(me), 5 * 60e3), boxes: null });
  return client;
}
function close(me) { const c = conns.get(me); conns.delete(me); c?.client.logout().catch(() => {}); }
async function special(me, client, use) {
  const c = conns.get(me);
  if (!c.boxes) c.boxes = await client.list();
  return c.boxes.find((b) => b.specialUse === use)?.path || { '\\Sent': 'Sent', '\\Trash': 'Trash', '\\Archive': 'Archive' }[use];
}
// one mailbox at a time per connection
const locks = new Map();
async function withBox(me, box, fn) {
  const prev = locks.get(me) || Promise.resolve();
  const next = prev.then(async () => {
    const client = await imap(me); if (!client) return null;
    const lock = await client.getMailboxLock(box);
    try { return await fn(client); } finally { lock.release(); }
  });
  locks.set(me, next.catch(() => {}));
  return next;
}
const boxFor = async (me, folder) => { const client = await imap(me); if (!client) return null; return folder === 'sent' ? special(me, client, '\\Sent') : folder === 'trash' ? special(me, client, '\\Trash') : 'INBOX'; };

async function listExternal(me, folder, q, limit = 40) {
  const box = await boxFor(me, folder); if (!box) return [];
  return withBox(me, box, async (client) => {
    let uids;
    if (q) uids = await client.search({ or: [{ subject: q }, { from: q }, { to: q }, { body: q }] }, { uid: true });
    else if (folder === 'unread') uids = await client.search({ seen: false }, { uid: true });
    else if (folder === 'starred') uids = await client.search({ flagged: true }, { uid: true });
    else { const st = client.mailbox; if (!st.exists) return []; uids = null; }
    const range = uids ? uids.slice(-limit) : `${Math.max(1, client.mailbox.exists - limit + 1)}:*`;
    if (uids && !uids.length) return [];
    const out = [];
    for await (const m of client.fetch(range, { uid: true, envelope: true, flags: true, internalDate: true, bodyStructure: true }, { uid: !!uids })) {
      const f = m.envelope.from?.[0] || {};
      out.push({ id: `x:${box}:${m.uid}`, source: 'domain', from: f.name || f.address || '', fromAddr: f.address || '', to: (m.envelope.to || []).map((t) => t.address).join(', '),
        subject: m.envelope.subject || '', snippet: '', date: +new Date(m.internalDate || m.envelope.date), unread: !m.flags.has('\\Seen'), starred: m.flags.has('\\Flagged'),
        hasAtt: JSON.stringify(m.bodyStructure || {}).includes('"disposition":"attachment"') });
    }
    return out;
  });
}
const parsedCache = new Map(); // id -> parsed mail (for attachment downloads)
async function getExternal(me, box, u) {
  return withBox(me, box, async (client) => {
    const m = await client.fetchOne(String(u), { source: true, flags: true }, { uid: true });
    if (!m) throw new Error('Mail not found');
    const p = await (await mailLibs()).simpleParser(m.source);
    const id = `x:${box}:${u}`;
    parsedCache.set(id, p); if (parsedCache.size > 30) parsedCache.delete(parsedCache.keys().next().value);
    if (!m.flags.has('\\Seen')) await client.messageFlagsAdd(String(u), ['\\Seen'], { uid: true }).catch(() => {});
    return { id, source: 'domain', from: p.from?.value?.[0]?.name || p.from?.value?.[0]?.address || '', fromAddr: p.from?.value?.[0]?.address || '', to: p.to?.text || '', cc: p.cc?.text || '',
      subject: p.subject || '', date: +p.date || Date.now(), html: p.html || '', text: p.text || htmlToText(p.html || ''), messageId: p.messageId || '', references: [p.references].flat().filter(Boolean).join(' '),
      starred: m.flags.has('\\Flagged'), atts: (p.attachments || []).filter((a) => !a.related).map((a, i) => ({ n: i, name: a.filename || `attachment-${i + 1}`, size: a.size, type: a.contentType })) };
  });
}

// ---------- the one inbox ----------
const BOXES = { inbox: "folder = 'inbox'", unread: "folder = 'inbox' AND seen = 0", starred: 'starred = 1 AND folder <> \'trash\'', sent: "folder = 'sent'", trash: "folder = 'trash'", archive: "folder = 'archive'" };
export async function list(me, { box = 'inbox', q = '' } = {}) {
  const where = BOXES[box] || BOXES.inbox;
  const params = [me];
  let sql = `SELECT id, from_name, from_addr, to_json, subject, text, date, seen, starred, atts, external FROM mail WHERE owner = ? AND ${where}`;
  if (q) { sql += ' AND (subject LIKE ? OR text LIKE ? OR from_name LIKE ? OR from_addr LIKE ?)'; params.push(...Array(4).fill(`%${q}%`)); }
  const team = all(`${sql} ORDER BY date DESC LIMIT 100`, ...params).map((m) => ({
    id: `i:${m.id}`, source: m.external ? 'sent-out' : 'team', from: box === 'sent' ? JSON.parse(m.to_json).join(', ') : m.from_name, fromAddr: m.from_addr, subject: m.subject,
    snippet: snippet(m.text), date: m.date, unread: !m.seen, starred: !!m.starred, hasAtt: m.atts !== '[]' }));
  let ext = [], extError = '';
  if (getMailCfg(me) && box !== 'archive' && box !== 'sent') {
    try { ext = await inTime(listExternal(me, box, q)); } catch (e) { extError = e.message; close(me); }
  }
  const items = [...team, ...ext].sort((a, b) => b.date - a.date).slice(0, 120);
  return { items, extError, domain: !!getMailCfg(me) };
}
export async function get(me, id) {
  if (id.startsWith('i:')) {
    const m = one('SELECT * FROM mail WHERE id = ? AND owner = ?', id.slice(2), me);
    if (!m) throw new Error('Mail not found');
    if (!m.seen) run('UPDATE mail SET seen = 1 WHERE id = ?', m.id);
    const to = JSON.parse(m.to_json || '[]'), cc = JSON.parse(m.cc_json || '[]');
    return { id, source: m.external ? 'sent-out' : 'team', from: m.from_name, fromAddr: m.from_addr, to: to.join(', '), cc: cc.join(', '), subject: m.subject, date: m.date, html: m.html, text: m.text,
      thread: m.thread, starred: !!m.starred, atts: JSON.parse(m.atts).map((a, n) => ({ n, name: a.name, size: a.size, type: a.type })) };
  }
  const [, box, u] = id.match(/^x:(.+):(\d+)$/) || [];
  if (!box) throw new Error('bad id');
  return getExternal(me, box, u);
}
export async function attachment(me, id, n) {
  if (id.startsWith('i:')) {
    const m = one('SELECT atts FROM mail WHERE id = ? AND owner = ?', id.slice(2), me);
    const a = JSON.parse(m?.atts || '[]')[n]; if (!a) throw new Error('Attachment not found');
    return { name: a.name, type: a.type, data: fs.readFileSync(path.join(FILES, a.file)) };
  }
  let p = parsedCache.get(id);
  if (!p) { await get(me, id); p = parsedCache.get(id); }
  const a = (p.attachments || []).filter((x) => !x.related)[n]; if (!a) throw new Error('Attachment not found');
  return { name: a.filename || 'attachment', type: a.contentType, data: a.content };
}
export async function flag(me, id, { seen, starred }) {
  if (id.startsWith('i:')) {
    if (seen !== undefined) run('UPDATE mail SET seen = ? WHERE id = ? AND owner = ?', seen ? 1 : 0, id.slice(2), me);
    if (starred !== undefined) run('UPDATE mail SET starred = ? WHERE id = ? AND owner = ?', starred ? 1 : 0, id.slice(2), me);
    return;
  }
  const [, box, u] = id.match(/^x:(.+):(\d+)$/);
  await withBox(me, box, async (client) => {
    if (seen !== undefined) await (seen ? client.messageFlagsAdd : client.messageFlagsRemove).call(client, u, ['\\Seen'], { uid: true });
    if (starred !== undefined) await (starred ? client.messageFlagsAdd : client.messageFlagsRemove).call(client, u, ['\\Flagged'], { uid: true });
  });
}
export async function move(me, id, to) { // to: trash | archive | inbox
  if (id.startsWith('i:')) { run('UPDATE mail SET folder = ? WHERE id = ? AND owner = ?', to, id.slice(2), me); return; }
  const [, box, u] = id.match(/^x:(.+):(\d+)$/);
  const client = await imap(me);
  const dest = await special(me, client, to === 'trash' ? '\\Trash' : '\\Archive');
  await withBox(me, box, (c) => c.messageMove(u, dest, { uid: true }));
}
export async function unread(me) {
  let n = one("SELECT COUNT(*) n FROM mail WHERE owner = ? AND folder = 'inbox' AND seen = 0", me).n;
  if (getMailCfg(me)) { try { n += (await inTime((async () => (await (await imap(me)).status('INBOX', { unseen: true })).unseen || 0)(), 3000)); } catch { close(me); } }
  return n;
}

// ---------- sending ----------
// attachments: [{ name, data (base64) }] from the browser, or files: [paths] already on this PC
function keepFiles(attachments = [], files = []) {
  const out = [];
  for (const a of attachments) { const f = `${uid()}_${path.basename(a.name)}`; const buf = Buffer.from(a.data, 'base64'); fs.writeFileSync(path.join(FILES, f), buf); out.push({ name: a.name, size: buf.length, type: a.type || 'application/octet-stream', file: f }); }
  for (const p of files) { if (!fs.existsSync(p)) throw new Error(`File not found: ${p}`); const f = `${uid()}_${path.basename(p)}`; fs.copyFileSync(p, path.join(FILES, f)); out.push({ name: path.basename(p), size: fs.statSync(p).size, type: 'application/octet-stream', file: f }); }
  return out;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export async function send(me, { to = '', cc = '', subject = '', body = '', attachments = [], files = [], inReplyTo = '', references = '', thread = '' }) {
  const sender = byId(me);
  const all_ = [...splitAddrs(to), ...splitAddrs(cc)];
  if (!all_.length) throw new Error('Add who the mail goes to');
  const internal = [], external = [];
  for (const a of all_) { const u = teamMember(a); if (u) internal.push(u); else if (/@/.test(a)) external.push(a); else throw new Error(`“${a}” is not a team member or an email address`); }
  const cfg = getMailCfg(me);
  if (external.length && !cfg) throw new Error('To mail people outside the team, add your company mailbox in Setup → My mail.');
  const atts = keepFiles(attachments, files);
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55">${esc(body).replace(/\n/g, '<br>')}</div>`;
  const toList = splitAddrs(to), ccList = splitAddrs(cc), now = Date.now(), th = thread || uid();
  const fromAddr = cfg?.address || teamAddr(sender);
  // team copies
  for (const u of [...new Map(internal.map((x) => [x.id, x])).values()]) {
    run('INSERT INTO mail (id, owner, folder, from_name, from_addr, to_json, cc_json, subject, text, html, atts, date, thread) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      uid(), u.id, 'inbox', sender.name, fromAddr, JSON.stringify(toList), JSON.stringify(ccList), subject, body, html, JSON.stringify(atts), now, th);
    if (u.id !== me) notify(u.id, 'mail', `${sender.name}: ${subject || '(no subject)'}`, '#mail');
  }
  // out over SMTP
  if (external.length) {
    const { nodemailer } = await mailLibs();
    const t = nodemailer.createTransport({ host: cfg.smtpHost, port: cfg.smtpPort, secure: cfg.smtpPort === 465, auth: { user: cfg.user, pass: cfg.pass }, tls: { rejectUnauthorized: false } });
    const extTo = toList.filter((a) => !teamMember(a)), extCc = ccList.filter((a) => !teamMember(a));
    const msg = { from: { name: cfg.name || sender.name, address: cfg.address }, to: extTo.length ? extTo : undefined, cc: extCc.length ? extCc : undefined, subject, text: body, html,
      inReplyTo: inReplyTo || undefined, references: references || undefined, attachments: atts.map((a) => ({ filename: a.name, path: path.join(FILES, a.file) })) };
    const info = await t.sendMail(msg);
    // keep a copy in the mailbox's own Sent folder too
    try {
      const raw = await new Promise((ok, bad) => nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail({ ...msg, messageId: info.messageId }, (e, r) => (e ? bad(e) : ok(r.message))));
      const client = await imap(me); await client.append(await special(me, client, '\\Sent'), raw, ['\\Seen']);
    } catch {}
  }
  run('INSERT INTO mail (id, owner, folder, from_name, from_addr, to_json, cc_json, subject, text, html, atts, date, seen, thread, external) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
    uid(), me, 'sent', sender.name, fromAddr, JSON.stringify(toList), JSON.stringify(ccList), subject, body, html, JSON.stringify(atts), now, th, external.length ? 1 : 0);
  return { sent: true, team: internal.length, outside: external.length };
}

export async function testMailbox(me) {
  const cfg = getMailCfg(me); if (!cfg) throw new Error('No mailbox set');
  close(me);
  const client = await imap(me);
  const st = await client.status('INBOX', { messages: true, unseen: true });
  const { nodemailer } = await mailLibs();
  const t = nodemailer.createTransport({ host: cfg.smtpHost, port: cfg.smtpPort, secure: cfg.smtpPort === 465, auth: { user: cfg.user, pass: cfg.pass }, tls: { rejectUnauthorized: false } });
  await t.verify();
  return { ok: true, messages: st.messages, unseen: st.unseen };
}
