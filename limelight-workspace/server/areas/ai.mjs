// Limelight AI: the office AI password an admin sets once (/api/settings/ai, also given to Studio), and the
// workspace key that tells the AI which person is chatting (aiAs, used by apps-proxy.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { config, CONFIG_FILE, DATA } from '../config.mjs';
import { NEXT, send, readJson } from '../core.mjs';
import { auth, isAdmin } from '../state.mjs';

// Limelight AI (NAYA B) keeps each person's chats apart when the workspace says who it is, with the key it also has
// (D:\LimelightAI\app\data\workspace.key there); admins and owners also see the chats from before (no owner)
const AI_KEY = path.join(DATA, 'ai.key');
export function aiAs(user) {
  let key = ''; try { key = fs.readFileSync(AI_KEY, 'utf8').trim(); } catch {}
  return key ? { 'x-lh-key': key, 'x-lh-user': user.email, 'x-lh-admin': isAdmin(user) ? '1' : '0' } : null;
}

export async function route(req, res, { u, p, user }) {
  // one-time office setup by an admin: the Limelight AI password, so nobody ever sees the AI's own login.
  // Studio gets it too (it makes the AI pictures).
  if (p === '/api/settings/ai' && req.method === 'POST') {
    if (!isAdmin(user)) return send(res, 403, { error: 'Only an admin can set this' });
    const pw = String((await readJson(req)).password || '');
    if (!pw) return send(res, 400, { error: 'Enter the password' });
    config.aiPassword = pw; fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); auth.forgetAll('ai');
    let studio = true;
    try { await fetch(config.studioUrl + '/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aiPassword: pw }), signal: AbortSignal.timeout(4000) }); }
    catch { studio = false; }
    let check = 'The AI server is off right now — it will sign in by itself once it is on';
    try { await auth.appCookie(user, 'ai'); check = 'Connected to Limelight AI'; } catch (e) { if (!/fetch failed|timeout|aborted/i.test(e.message)) check = e.message; }
    return send(res, 200, { ok: true, check, studio });
  }
  return NEXT;
}
