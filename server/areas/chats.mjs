// Chats: the live stream, people, chat list, 1-to-1 and group chats, messages (send / delete / read / typing)
// and the files sent in chats (/chatfiles/). The store itself is chat.mjs.
import fs from 'node:fs';
import { NEXT, send, readBody, readJson } from '../core.mjs';
import { chat } from '../state.mjs';
import { people, nameMap } from '../hr.mjs';

export async function route(req, res, { u, p, user }) {
  let m;
  // ---------- chats ----------
  const me = user?.email;
  if (p === '/api/chat/stream') return chat.stream(req, res, me);
  if (p === '/api/chat/people') return send(res, 200, await people(user));
  if (p === '/api/chat/list') return send(res, 200, chat.list(me));
  if (p === '/api/chat/direct' && req.method === 'POST') return send(res, 200, await chat.direct(me, (await readJson(req)).email));
  if (p === '/api/chat/group' && req.method === 'POST') return send(res, 200, await chat.group(me, { ...(await readJson(req)), myName: user.name }));
  if ((m = /^\/api\/chat\/([a-z0-9]+)$/.exec(p)) && req.method === 'PATCH')
    return send(res, 200, await chat.update(me, m[1], await readJson(req), await nameMap(user)));
  if ((m = /^\/api\/chat\/([a-z0-9]+)\/messages$/.exec(p))) {
    if (req.method === 'GET') return send(res, 200, chat.history(me, m[1], u.searchParams.get('before')));
    if (req.method === 'POST') return send(res, 200, await chat.send(me, m[1], JSON.parse((await readBody(req, 40 * 1024 * 1024)).toString('utf8'))));
  }
  if ((m = /^\/api\/chat\/([a-z0-9]+)\/messages\/([a-z0-9]+)$/.exec(p)) && req.method === 'DELETE') return send(res, 200, await chat.remove(me, m[1], m[2]));
  if ((m = /^\/api\/chat\/([a-z0-9]+)\/read$/.exec(p)) && req.method === 'POST') return send(res, 200, await chat.read(me, m[1]));
  if ((m = /^\/api\/chat\/([a-z0-9]+)\/typing$/.exec(p)) && req.method === 'POST') return send(res, 200, chat.typing(me, m[1]));
  if (p.startsWith('/chatfiles/')) {
    const f = chat.fileOf(p.slice(11)); if (!f) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, max-age=86400',
      ...(/\.(png|jpe?g|gif|webp|mp4|pdf)$/i.test(f) ? { 'Content-Type': ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4', pdf: 'application/pdf' })[f.split('.').pop().toLowerCase()] } : {}) });
    return fs.createReadStream(f).pipe(res);
  }
  return NEXT;
}
