// Limelight Workspace - office chat: 1-to-1 chats and groups, files/photos, replies, read ticks, typing and online
// status. Everyone is a Workspace (Lighthouse) login, keyed by email. Stored in Data/chat (JSON), live over SSE.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function createChat({ root }) {
  const DIR = path.join(root, 'chat'), MSGS = path.join(DIR, 'msgs'), FILES = path.join(DIR, 'files');
  for (const d of [DIR, MSGS, FILES]) fs.mkdirSync(d, { recursive: true });
  const CHATS = path.join(DIR, 'chats.json');
  let chats = fs.existsSync(CHATS) ? JSON.parse(fs.readFileSync(CHATS, 'utf8')) : [];
  const msgCache = new Map();
  const id = () => Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const err = (code, m) => Object.assign(new Error(m), { code });
  const saveChats = () => fsp.writeFile(CHATS, JSON.stringify(chats, null, 1));

  function msgs(cid) {
    if (!msgCache.has(cid)) {
      const f = path.join(MSGS, cid + '.json');
      msgCache.set(cid, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []);
    }
    return msgCache.get(cid);
  }
  const saveMsgs = (cid) => fsp.writeFile(path.join(MSGS, cid + '.json'), JSON.stringify(msgs(cid)));

  // ---- live: SSE clients per email ----
  const clients = new Map(); // email -> Set(res)
  const online = () => [...clients.keys()];
  function emit(emails, ev) {
    const line = `data: ${JSON.stringify(ev)}\n\n`;
    for (const e of new Set(emails)) for (const res of clients.get(e) || []) res.write(line);
  }
  const everyone = () => [...new Set(chats.flatMap((c) => c.members).concat(online()))];
  function stream(req, res, me) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify({ type: 'hello', online: online() })}\n\n`);
    const first = !clients.has(me);
    if (first) clients.set(me, new Set());
    clients.get(me).add(res);
    if (first) emit(everyone(), { type: 'presence', email: me, online: true });
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(ping);
      const set = clients.get(me); set?.delete(res);
      if (set && !set.size) { clients.delete(me); emit(everyone(), { type: 'presence', email: me, online: false, at: Date.now() }); }
    });
  }

  // ---- chats ----
  const mine = (me) => chats.filter((c) => c.members.includes(me));
  function get(cid, me) {
    const c = chats.find((x) => x.id === cid);
    if (!c || !c.members.includes(me)) throw err(404, 'Chat not found');
    return c;
  }
  function summary(c, me) {
    const list = msgs(c.id), last = list[list.length - 1];
    return { ...c, last: last ? { from: last.from, text: last.deleted ? '' : last.text || (last.share ? '🔗 ' + (last.share.title || 'Shared') : ''), file: last.file?.name, deleted: !!last.deleted, at: last.at } : null,
      unread: list.filter((m) => m.from !== me && !m.readBy.includes(me) && !m.deleted).length };
  }
  const list = (me) => mine(me).map((c) => summary(c, me)).sort((a, b) => (b.last?.at || b.created) - (a.last?.at || a.created));

  async function direct(me, other) {
    other = String(other || '').toLowerCase();
    if (!other || other === me) throw err(400, 'Who do you want to talk to?');
    let c = chats.find((x) => x.type === 'direct' && x.members.length === 2 && x.members.includes(me) && x.members.includes(other));
    if (!c) { c = { id: id(), type: 'direct', members: [me, other], created: Date.now() }; chats.push(c); await saveChats(); }
    return summary(c, me);
  }
  async function group(me, b) {
    const name = String(b.name || '').trim().slice(0, 80);
    if (!name) throw err(400, 'Enter a group name');
    const members = [...new Set([me, ...(b.members || []).map((e) => String(e).toLowerCase())])];
    const c = { id: id(), type: 'group', name, about: String(b.about || '').slice(0, 300), members, admins: [me], by: me, created: Date.now() };
    chats.push(c); await saveChats();
    await system(c, `${b.myName || me} created the group "${name}"`);
    emit(c.members, { type: 'chat', chat: c.id });
    return summary(c, me);
  }
  async function update(me, cid, b, names = {}) {
    const c = get(cid, me);
    if (c.type !== 'group') throw err(400, 'Only groups can be changed');
    const admin = c.admins.includes(me), who = names[me] || me;
    const before = [...c.members];
    if (b.leave) {
      c.members = c.members.filter((e) => e !== me); c.admins = c.admins.filter((e) => e !== me);
      if (!c.admins.length && c.members.length) c.admins.push(c.members[0]);
      await system(c, `${who} left the group`);
    } else {
      if (!admin) throw err(403, 'Only a group admin can change this');
      if (b.name && b.name.trim() !== c.name) { c.name = b.name.trim().slice(0, 80); await system(c, `${who} ne naam badla: "${c.name}"`); }
      if (typeof b.about === 'string') c.about = b.about.slice(0, 300);
      for (const e of (b.add || []).map((x) => String(x).toLowerCase())) if (!c.members.includes(e)) { c.members.push(e); await system(c, `${who} added ${names[e] || e}`); }
      for (const e of (b.remove || []).map((x) => String(x).toLowerCase())) if (e !== me && c.members.includes(e)) {
        c.members = c.members.filter((x) => x !== e); c.admins = c.admins.filter((x) => x !== e); await system(c, `${who} removed ${names[e] || e}`); }
      for (const e of (b.makeAdmin || []).map((x) => String(x).toLowerCase())) if (c.members.includes(e) && !c.admins.includes(e)) c.admins.push(e);
    }
    await saveChats();
    emit([...before, ...c.members], { type: 'chat', chat: c.id });
    return c.members.includes(me) ? summary(c, me) : { left: true };
  }

  // ---- messages ----
  async function system(c, text) {
    const m = { id: id(), chat: c.id, system: true, text, at: Date.now(), readBy: [] };
    msgs(c.id).push(m); await saveMsgs(c.id);
    emit(c.members, { type: 'message', chat: c.id, msg: m });
  }
  function history(me, cid, before) {
    get(cid, me);
    const all = msgs(cid), end = before ? all.findIndex((m) => m.id === before) : all.length;
    return all.slice(Math.max(0, (end < 0 ? all.length : end) - 200), end < 0 ? all.length : end);
  }
  async function send(me, cid, b) {
    const c = get(cid, me);
    const text = String(b.text || '').slice(0, 8000);
    let file = null;
    if (b.file?.data) {
      const m = /^data:([^;]+);base64,(.*)$/s.exec(b.file.data);
      if (!m) throw err(400, 'File not valid');
      const safe = String(b.file.name || 'file').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').slice(-80) || 'file';
      const stored = `${id()}_${safe}`;
      const buf = Buffer.from(m[2], 'base64');
      await fsp.writeFile(path.join(FILES, stored), buf);
      file = { name: safe, type: m[1], size: buf.length, url: `/chatfiles/${encodeURIComponent(stored)}` };
    }
    // (a forwarded file: the same stored file, only if it really is one of ours)
    if (!file && b.fileRef?.url && fileOf(decodeURIComponent(String(b.fileRef.url).replace(/^\/chatfiles\//, '')))) {
      const f = b.fileRef; file = { name: String(f.name).slice(0, 80), type: String(f.type || ''), size: +f.size || 0, url: String(f.url) };
    }
    // a Share card: something open in one of the workspace's apps (Edit project, design, Office file…)
    const share = b.share && typeof b.share === 'object' && /^[a-z]+$/.test(b.share.app || '')
      ? { app: b.share.app, path: String(b.share.path || '/').slice(0, 600), title: String(b.share.title || '').slice(0, 140) } : null;
    if (!text.trim() && !file && !share) throw err(400, 'Khaali message');
    const reply = b.reply ? msgs(cid).find((m) => m.id === b.reply) : null;
    const msg = { id: id(), chat: cid, from: me, text, file, share, forwarded: !!b.forwarded, at: Date.now(), readBy: [me],
      reply: reply ? { id: reply.id, from: reply.from, text: reply.deleted ? '' : (reply.text || reply.file?.name || '').slice(0, 140) } : null };
    msgs(cid).push(msg); await saveMsgs(cid);
    emit(c.members, { type: 'message', chat: cid, msg });
    return msg;
  }
  async function read(me, cid) {
    const c = get(cid, me); let n = 0;
    for (const m of msgs(cid)) if (!m.readBy.includes(me)) { m.readBy.push(me); n++; }
    if (n) { await saveMsgs(cid); emit(c.members, { type: 'read', chat: cid, email: me }); }
    return { ok: true };
  }
  async function remove(me, cid, mid) {
    const c = get(cid, me), m = msgs(cid).find((x) => x.id === mid);
    if (!m || m.from !== me) throw err(403, 'You can only delete your own messages');
    m.deleted = true; m.text = ''; m.file = null; m.share = null; await saveMsgs(cid);
    emit(c.members, { type: 'deleted', chat: cid, id: mid });
    return { ok: true };
  }
  function typing(me, cid) { const c = get(cid, me); emit(c.members.filter((e) => e !== me), { type: 'typing', chat: cid, email: me }); return { ok: true }; }
  const fileOf = (name) => { const f = path.resolve(FILES, name); return f.startsWith(path.resolve(FILES)) && fs.existsSync(f) ? f : null; };

  return { stream, online, list, direct, group, update, history, send, read, remove, typing, fileOf, get };
}
