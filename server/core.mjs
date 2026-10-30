// Shared HTTP helpers: send a reply, read a body, serve pages and files from public/ (with their cache rules),
// the public-domain checks (cookie domain, https redirect) and OPEN - the paths that need no login.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { config, PUBLIC, PORT } from './config.mjs';

// an area's route() gives this back when none of its paths matched: the router then asks the next area
export const NEXT = Symbol('next area');

export const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};
export function send(res, code, body, type = 'application/json', extra = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(data);
}
export function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
export const readJson = async (req) => JSON.parse((await readBody(req)).toString('utf8') || '{}');
// a page with each css/js link's ?v= set to that file's last change: an edited file gets a new link by itself, so the
// year-long cache below can never keep an old copy
export async function servePage(res, name) {
  let html = await fsp.readFile(path.join(PUBLIC, name), 'utf8');
  const links = [...new Set([...html.matchAll(/(?:href|src)="((?:css|js)\/[\w.-]+)\?v=[^"]*"/g)].map((m) => m[1]))];
  const ver = await Promise.all(links.map((f) => fsp.stat(path.join(PUBLIC, f)).then((s) => Math.round(s.mtimeMs).toString(36), () => '0')));
  links.forEach((f, i) => { html = html.replace(new RegExp(`(["])${f.replace(/[.]/g, '\\.')}\\?v=[^"]*"`, 'g'), `$1${f}?v=${ver[i]}"`); });
  send(res, 200, html, MIME['.html'], { 'Cache-Control': 'no-cache' });
}
// cache: 'no-cache' (ask every time - the pages), or how long a phone / Cloudflare may keep the file without asking
export async function serveFile(res, file, cache = 'no-cache', req = null) {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(PUBLIC)) return send(res, 403, { error: 'forbidden' });
  try {
    const st = await fsp.stat(resolved), modified = st.mtime.toUTCString();
    // (the phone's copy is still current: "not changed", nothing sent again)
    if (req?.headers['if-modified-since'] === modified) { res.writeHead(304, { 'Cache-Control': cache, 'Last-Modified': modified }); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': cache, 'Last-Modified': modified });
    fs.createReadStream(resolved).pipe(res);
  } catch { send(res, 404, { error: 'not found' }); }
}

// a request that came in through the public domain (the tunnel sets the host and https)
export const isPublic = (req) => { const h = String(req.headers.host || '').toLowerCase().split(':')[0];
  return h === config.publicDomain || h.endsWith('.' + config.publicDomain); };
export const cookieDomain = (req) => (isPublic(req) ? config.publicDomain : '');
export const proto = (req) => (isPublic(req) ? 'https' : 'http');
export const homeUrl = (req) => (isPublic(req) ? `https://${config.publicHost}` : `http://localhost:${PORT}`);

// Visitors who typed http://limelightcorp.net come through Cloudflare as plain http: send them to https first.
export function toHttps(req, res) {
  const host = String(req.headers.host || '');
  const plain = req.headers['x-forwarded-proto'] === 'http' || /"scheme":"http"/.test(req.headers['cf-visitor'] || '');
  if (!plain ||!/(^|\.)limelightcorp\.net$/.test(host)) return false;
  res.writeHead(301, { location: 'https://' + host + req.url });
  res.end();
  return true;
}

export const OPEN = /^\/(login|login\.html|api\/login|api\/health|css\/|fonts\/|img\/|js\/theme-boot\.js$|js\/frame\.js$|manifest\.webmanifest$|sw\.js$|offline\.html$)/;
// a file with ?v= in its link changes name when it changes (index.html), so a phone keeps it a year without asking;
// fonts and pictures for 30 days. (Behind the login only the phone keeps it - "private" - not Cloudflare.)
export const fileCache = (u, p) => (u.searchParams.has('v') ? `${OPEN.test(p) ? 'public' : 'private'}, max-age=31536000, immutable`
  : /^\/(fonts|img)\//.test(p) ? 'public, max-age=2592000' : 'no-cache');
