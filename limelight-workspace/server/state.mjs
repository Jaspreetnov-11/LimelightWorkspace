// Who is who, and the stores in Data/: the one login (auth.mjs), chats, work time, salary inputs and overtime;
// plus the owner / admin checks every area uses. Created once at startup, in the same order as before the split.
import { config, DATA } from './config.mjs';
import { apps, targetOf } from './app-list.mjs';
import { createAuth } from '../auth.mjs';
import { createChat } from '../chat.mjs';
import { createActivity } from '../activity.mjs';
import { createSalary } from '../salary.mjs';
import { createOvertime } from '../overtime.mjs';

export const auth = createAuth({ root: DATA, lighthouseUrl: () => config.lighthouseUrl, editorUrl: () => config.editorUrl,
  aiUrl: () => targetOf(apps().find((x) => x.id === 'ai') || { target: 'aiUrl' }), aiPassword: () => config.aiPassword,
  // (config.json "keepSignedIn": first names that sign in once per device and are never asked for the password again)
  keepSignedIn: (u) => (config.keepSignedIn || ['gurpreet']).map((n) => String(n).toLowerCase()).some((n) => n === firstName(u.name) || n === firstName(u.email)) });

export const chat = createChat({ root: DATA });
export const activity = createActivity({ root: DATA });
export const salary = createSalary({ root: DATA });
export const overtime = createOvertime({ root: DATA });

export const firstName = (s) => String(s || '').trim().split(/[\s._\-0-9@]+/)[0].toLowerCase();
// the owners (config.json "owners": first names): admins everywhere, and no clock-in, attendance or work-time tracking
export const isOwner = (u) => !!u && (config.owners || ['jaspreet', 'gurpreet']).map((n) => String(n).toLowerCase()).some((n) => n === firstName(u.name) || n === firstName(u.email));
export const isAdmin = (u) => !!u && (u.role === 'admin' || isOwner(u));
