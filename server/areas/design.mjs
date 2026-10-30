// Design (Limelight Studio): designs (/api/projects, /projects/), the picture Library (/api/library, /library/)
// and AI images (/api/ai/...) are passed straight through to Studio.
import http from 'node:http';
import https from 'node:https';
import { config } from '../config.mjs';
import { NEXT, send } from '../core.mjs';

// plain pass-through to another server (used for Studio's projects / library / AI image APIs)
function forward(req, res, base, extraHeaders = {}) {
  const t = new URL(base);
  const up = (t.protocol === 'https:' ? https : http).request({ hostname: t.hostname, port: t.port, method: req.method,
    path: req.url, headers: { ...req.headers, host: t.host, ...extraHeaders } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  up.on('error', () => { if (!res.headersSent) send(res, 502, { error: 'Limelight Studio is off - start the Design app' }); else res.end(); });
  req.pipe(up);
}

export async function route(req, res, { u, p, user }) {
  // Studio owns designs, the picture library and AI images
  if (/^\/api\/(projects|library|ai\/)/.test(p) || /^\/(projects|library)\//.test(p)) return forward(req, res, config.studioUrl);
  return NEXT;
}
