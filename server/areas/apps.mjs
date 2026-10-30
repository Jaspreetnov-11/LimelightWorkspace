// Apps: the list of apps for the workspace's menu and dock (/api/apps), whether each is up (/api/apps/status) and
// the Start button for an app that is off (/api/apps/<id>/start).
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { config } from '../config.mjs';
import { NEXT, send } from '../core.mjs';
import { apps, appStatus } from '../app-list.mjs';

export async function route(req, res, { u, p, user }) {
  if (p === '/api/apps') return send(res, 200, apps().map(({ id, name, port, start, part }) => ({ id, name, port, part, canStart: !!start, host: config.appHosts?.[id] })));
  if (p === '/api/apps/status') return send(res, 200, await Promise.all(apps().map(appStatus)));
  if (/^\/api\/apps\/[a-z0-9_-]+\/start$/i.test(p) && req.method === 'POST') {
    const a = apps().find((x) => x.id === p.split('/')[3]);
    if (!a?.start || !fs.existsSync(a.start)) return send(res, 404, { error: 'no launcher' });
    exec(/\.vbs$/i.test(a.start) ? `wscript "${a.start}"` : `start "" /min "${a.start}"`, { cwd: path.dirname(a.start) });
    return send(res, 200, { ok: true });
  }
  return NEXT;
}
