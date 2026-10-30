// live.mjs - one Server-Sent-Events stream per open tab: notifications (new mail, invites, tasks), who is online,
// and the signalling for Meetings (WebRTC offers / answers / ICE between the people in a room).
import { run, all, uid } from './db.mjs';

const clients = new Map(); // clientId -> { res, user: { id, name, color } }
const rooms = new Map();   // room -> Map(clientId -> { userId, name, color, cam, mic })

function send(res, type, data) { try { res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); } catch {} }

export function connect(req, res, user, clientId) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 3000\n\n');
  clients.set(clientId, { res, user: { id: user.id, name: user.name, color: user.color } });
  const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 25e3);
  broadcastPresence();
  req.on('close', () => {
    clearInterval(ping);
    clients.delete(clientId);
    for (const room of rooms.keys()) leave(room, clientId);
    for (const room of docs.keys()) coLeave(room, clientId);
    broadcastPresence();
  });
}

export const online = () => [...new Set([...clients.values()].map((c) => c.user.id))];
function broadcastPresence() { const ids = online(); for (const c of clients.values()) send(c.res, 'presence', ids); }
export function toUser(userId, type, data) { for (const c of clients.values()) if (c.user.id === userId) send(c.res, type, data); }
const toClient = (id, type, data) => { const c = clients.get(id); if (c) send(c.res, type, data); };

// a notification is kept (bell list) and pushed live
export function notify(userId, kind, text, link = '') {
  const n = { id: uid(), kind, text, link, created: Date.now() };
  run('INSERT INTO notes (id, user_id, kind, text, link, created) VALUES (?, ?, ?, ?, ?, ?)', n.id, userId, kind, text, link, n.created);
  toUser(userId, 'note', n);
}
export const notes = (userId) => all('SELECT id, kind, text, link, created, seen FROM notes WHERE user_id = ? ORDER BY created DESC LIMIT 40', userId);
export const seenNotes = (userId) => run('UPDATE notes SET seen = 1 WHERE user_id = ?', userId);

// ---------- meeting rooms ----------
export function join(room, clientId, user, { cam = true, mic = true } = {}) {
  if (!clients.has(clientId)) throw new Error('Live connection missing — reload the page');
  if (!rooms.has(room)) rooms.set(room, new Map());
  const r = rooms.get(room);
  const peers = [...r.entries()].map(([id, p]) => ({ id, ...p }));
  r.set(clientId, { userId: user.id, name: user.name, color: user.color, cam, mic });
  for (const id of r.keys()) if (id !== clientId) toClient(id, 'rtc', { type: 'join', room, from: clientId, name: user.name, color: user.color, userId: user.id });
  return peers;
}
export function leave(room, clientId) {
  const r = rooms.get(room); if (!r?.has(clientId)) return;
  r.delete(clientId);
  for (const id of r.keys()) toClient(id, 'rtc', { type: 'leave', room, from: clientId });
  if (!r.size) rooms.delete(room);
}
export function signal(room, from, to, data) {
  const r = rooms.get(room); if (!r?.has(from) || !r.has(to)) return;
  toClient(to, 'rtc', { type: 'signal', room, from, data });
}
export function state(room, from, patch) {
  const r = rooms.get(room); const p = r?.get(from); if (!p) return;
  Object.assign(p, patch);
  for (const id of r.keys()) if (id !== from) toClient(id, 'rtc', { type: 'state', room, from, ...patch });
}
export function chat(room, from, text) {
  const r = rooms.get(room); const p = r?.get(from); if (!p) return;
  for (const id of r.keys()) toClient(id, 'rtc', { type: 'chat', room, from, name: p.name, text: String(text).slice(0, 2000), at: Date.now() });
}
export const roomInfo = (room) => [...(rooms.get(room)?.values() || [])].map((p) => ({ name: p.name, color: p.color }));
export const liveRooms = () => [...rooms.entries()].map(([room, r]) => ({ room, people: [...r.values()].map((p) => p.name) }));

// ---------- editing a file together (Document / Grid / Deck): one room per file ----------
// The editors send their changes, cursor and saves here; the room passes them on to the others in it.
const docs = new Map(); // room -> Map(clientId -> { userId, name, color })
const coSend = (id, data) => toClient(id, 'co', data);
export function coJoin(room, clientId, user) {
  if (!clients.has(clientId)) throw new Error('Live connection missing — reload the page');
  if (!docs.has(room)) docs.set(room, new Map());
  const r = docs.get(room);
  const peers = [...r.entries()].filter(([id]) => id !== clientId).map(([id, p]) => ({ cid: id, ...p }));
  const me = { userId: user.id, name: user.name, color: user.color };
  r.set(clientId, me);
  for (const id of r.keys()) if (id !== clientId) coSend(id, { room, t: 'join', from: clientId, ...me });
  // whoever has been here longest sends the newcomer what is on their screen now (unsaved edits too)
  if (peers.length) coSend(peers[0].cid, { room, t: 'want', from: clientId });
  return peers;
}
export function coLeave(room, clientId) {
  const r = docs.get(room); if (!r?.has(clientId)) return;
  r.delete(clientId);
  for (const id of r.keys()) coSend(id, { room, t: 'leave', from: clientId });
  if (!r.size) docs.delete(room);
}
export function coRelay(room, from, data, to) {
  const r = docs.get(room); if (!r?.has(from)) return false;
  const msg = { ...data, room, from };
  if (to) { if (r.has(to)) coSend(to, msg); } else for (const id of r.keys()) if (id !== from) coSend(id, msg);
  return true;
}
