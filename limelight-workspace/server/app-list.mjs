// The apps that open inside the workspace (Edit, Design, Office, Lighthouse HR pages, Limelight AI): their list,
// which PC answers for each (checked every 20 s) and whether they are up. Served by apps-proxy.mjs and areas/apps.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT } from './config.mjs';

// Apps that open inside the workspace. Each `target` is served again on its own localhost `port` (see appProxy), so it
// is same-site with the workspace: the login cookie reaches it and X-Frame-Options no longer blocks the frame.
// `auth` = how the workspace signs the person in there; `start` = launcher for the Start button when the app is off.
// `embed` = a stylesheet in embed/ put into the app's pages when they are shown inside a workspace frame: it hides the
// app's own sidebar (the workspace draws one menu) and turns its solid black into the workspace's glass look - pages
// see-through over the aurora, frosted cards, Limelight yellow; pop-ups stay solid to be readable. Read on every page,
// so a change shows on the next reload.
// `part` = not an app of its own: its pages are part of another app's menu (Lighthouse pages live in Office).
export const embedFile = (f) => { try { return fs.readFileSync(path.join(ROOT, 'embed', f), 'utf8'); } catch { return ''; } };
// (`embedJs` = a script in embed/ that tags the app's own elements for that stylesheet - see embed/office-hr.js)
const DEFAULT_APPS = [
  { id: 'editor', name: 'Edit', target: ['editorUrl', 'editorStandbyUrl'], port: 3341 },
  { id: 'design', name: 'Design', target: 'studioUrl', port: 3345,
    start: 'E:\\Limelight Ai\\limelight-studio\\Limelight Studio (no window).vbs' },
  { id: 'office', name: 'Office', target: 'http://127.0.0.1:3300', port: 3342,
    start: 'E:\\Limelight Ai\\limelight-office\\Limelight Office (no window).vbs',
    embed: 'office.css' },
  { id: 'lighthouse', name: 'Office', target: 'lighthouseUrl', port: 3343, auth: 'lighthouse', part: 'office',
    embed: 'office-hr.css', embedJs: 'office-hr.js' },
  { id: 'ai', name: 'Limelight AI', target: ['aiUrl', 'aiLocalUrl'], port: 3344, auth: 'ai' },
];
export const apps = () => config.apps || DEFAULT_APPS;
// `target` may be a list (first that answers wins, checked every 20 s): the editor's line of PCs, AI on B or here
const urlOf = (t) => (config[t] || t || '').replace(/\/$/, '');
const live = new Map(); // app id -> url that answered last
export const targetOf = (a) => (Array.isArray(a.target) ? live.get(a.id) || urlOf(a.target[0]) : urlOf(a.target));
async function resolveTargets() {
  for (const a of apps()) {
    if (!Array.isArray(a.target)) continue;
    for (const t of a.target) {
      const u = urlOf(t);
      try { const r = await fetch(u + '/', { signal: AbortSignal.timeout(2500), redirect: 'manual' }); if (r.status < 500) { live.set(a.id, u); break; } } catch { /* next */ }
    }
  }
}
resolveTargets(); setInterval(resolveTargets, 20000);

// ---------- workspace bits ----------
export async function appStatus(a) {
  try {
    const r = await fetch(targetOf(a) + '/', { signal: AbortSignal.timeout(2500), redirect: 'manual' });
    return { id: a.id, up: r.status < 500 };
  } catch { return { id: a.id, up: false }; }
}
