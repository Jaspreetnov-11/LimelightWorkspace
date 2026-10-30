// Share (/api/share): send something open in the workspace, or forward a chat message, to people and groups as a
// chat card; an Edit project is also shared in Edit itself (editShare in edit.mjs).
import { NEXT, send, readJson } from '../core.mjs';
import { chat } from '../state.mjs';
import { editShare } from './edit.mjs';

// Share: one card per person (a 1-to-1 chat) or group, that opens the thing inside the workspace. An Edit project is
// also shared in Edit itself with the people who have an Edit account (only its maker or the owner may do that).
const SHARE_APPS = ['editor', 'design', 'office', 'lighthouse', 'ai'];
async function share(user, b) {
  const me = user.email;
  let body = { text: String(b.note || '').slice(0, 2000) };
  if (b.fromChat && b.fromMsg) { // forward a message from a chat the sender is in
    const m = chat.history(me, b.fromChat).find((x) => x.id === b.fromMsg);
    if (!m || m.deleted || m.system) throw Object.assign(new Error('That message is gone'), { code: 404 });
    body = { text: [b.note, m.text].filter((x) => String(x || '').trim()).join('\n\n').slice(0, 8000), fileRef: m.file, share: m.share, forwarded: true };
  } else {
    if (!SHARE_APPS.includes(b.app)) throw Object.assign(new Error('Nothing to share'), { code: 400 });
    body.share = { app: b.app, path: String(b.path || '/').slice(0, 600), title: String(b.title || '').slice(0, 140) };
  }
  const to = [...new Set((b.to || []).map((e) => String(e).toLowerCase()).filter((e) => e && e !== me))];
  const rooms = [];
  for (const e of to) rooms.push((await chat.direct(me, e)).id);
  for (const g of b.groups || []) rooms.push(chat.get(String(g), me).id);
  if (!rooms.length) throw Object.assign(new Error('Pick someone to share with'), { code: 400 });
  for (const r of new Set(rooms)) await chat.send(me, r, body);
  const proj = body.share?.app === 'editor' && /#\/p\/([^/?#]+)/.exec(body.share.path || '');
  let edit = null;
  if (proj) {
    const groupPeople = (b.groups || []).flatMap((g) => chat.get(String(g), me).members);
    edit = await editShare(user, decodeURIComponent(proj[1]), [...new Set([...to, ...groupPeople])].filter((e) => e !== me));
  }
  return { ok: true, sent: new Set(rooms).size, edit };
}

export async function route(req, res, { u, p, user }) {
  if (p === '/api/share' && req.method === 'POST') return send(res, 200, await share(user, await readJson(req)));
  return NEXT;
}
