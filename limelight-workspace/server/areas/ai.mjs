// Limelight AI: the workspace key that tells the AI which person is chatting (aiAs, used by apps-proxy.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { DATA } from '../config.mjs';
import { NEXT } from '../core.mjs';
import { isAdmin } from '../state.mjs';

// Limelight AI (NAYA B) keeps each person's chats apart when the workspace says who it is, with the key it also has
// (D:\LimelightAI\app\data\workspace.key there); admins and owners also see the chats from before (no owner)
const AI_KEY = path.join(DATA, 'ai.key');
export function aiAs(user) {
  let key = ''; try { key = fs.readFileSync(AI_KEY, 'utf8').trim(); } catch {}
  return key ? { 'x-lh-key': key, 'x-lh-user': user.email, 'x-lh-admin': isAdmin(user) ? '1' : '0' } : null;
}

// (The admin's "Limelight AI password" box and its /api/settings/ai route were removed: the workspace signs people in
// to Limelight AI with the key above. A config.json aiPassword, if one is set, is still used as a fallback by auth.mjs.)
export async function route() {
  return NEXT;
}
