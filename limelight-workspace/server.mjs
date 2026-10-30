// Lighthouse (Limelight's workspace) - every Limelight app in one window, behind one login (no npm dependencies).
// node server.mjs [--open] [--lan]   ->  http://localhost:3350
// Startup only: settings, the login check and the router that hands each request to its area (server/areas/), the
// app proxies (server/apps-proxy.mjs). Shared helpers are in server/core.mjs.
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { exec } from 'node:child_process';
import { PUBLIC, args, LAN, PORT, HOST, config } from './server/config.mjs';
import { listenBoth, tlsOn } from './server/tls.mjs';
import { send, readJson, servePage, serveFile, toHttps, cookieDomain, OPEN, NEXT, fileCache } from './server/core.mjs';
import { apps } from './server/app-list.mjs';
import { auth } from './server/state.mjs';
import { appProxy } from './server/apps-proxy.mjs';
import { route as accountArea } from './server/areas/account.mjs';
import { route as aiArea } from './server/areas/ai.mjs';
import { route as profileArea } from './server/areas/profile.mjs';
import { route as homeArea } from './server/areas/home.mjs';
import { route as chatsArea } from './server/areas/chats.mjs';
import { route as officeArea } from './server/areas/office.mjs';
import { route as libraryArea } from './server/areas/library.mjs';
import { route as shareArea } from './server/areas/share.mjs';
import { route as appsArea } from './server/areas/apps.mjs';
import { route as createArea } from './server/areas/create.mjs';
import { route as designArea } from './server/areas/design.mjs';

// Each area answers its own paths and gives back NEXT for any other. The areas' paths do not overlap, so the order
// below only follows the order they were checked in before the split.
const AREAS = [accountArea, aiArea, profileArea, homeArea, chatsArea, officeArea, libraryArea, shareArea, appsArea, createArea, designArea];

// ---------- router ----------
const server = http.createServer(async (req, res) => {
  if (toHttps(req, res)) return;
  const u = new URL(req.url, 'http://x');
  const p = decodeURIComponent(u.pathname);
  try {
    if (p === '/api/health') return send(res, 200, { ok: true, app: 'Lighthouse', version: '1.2.0' });
    if (p === '/api/login' && req.method === 'POST') {
      const b = await readJson(req);
      const s = await auth.login(b.email, b.password).catch((e) => { console.log(new Date().toISOString(), 'login failed', b.email, '-', e.message); throw e; });
      console.log(new Date().toISOString(), 'login ok', b.email, req.headers.host, String(req.headers['user-agent'] || '').slice(0, 60));
      return send(res, 200, { ok: true, offline: s.offline, user: s.user }, 'application/json', { 'Set-Cookie': auth.sessionCookie(s.token, cookieDomain(req), s.keep) });
    }
    if (p === '/api/logout' && req.method === 'POST') { auth.logout(req); return send(res, 200, { ok: true }, 'application/json', { 'Set-Cookie': auth.clearCookie(cookieDomain(req)) }); }

    const user = auth.userOf(req);
    // (signed in and used today: the 30 days start again, on this device's cookie too)
    if (user) { const c = auth.renew(req, cookieDomain(req)); if (c) res.setHeader('Set-Cookie', c); }
    if (!user && !OPEN.test(p)) {
      // (sign-in trouble: who gets sent back to the login page, and whether their browser sent the sign-in cookie at all)
      if (p === '/' || p === '/api/me') console.log(new Date().toISOString(), 'not signed in', p, req.headers.host, /lw_sess=/.test(req.headers.cookie || '') ? 'cookie sent (unknown/expired)' : 'no cookie', String(req.headers['user-agent'] || '').slice(0, 60));
      if (p.startsWith('/api/')) return send(res, 401, { error: 'login needed' });
      res.writeHead(302, { Location: '/login' }); return res.end();
    }
    if (p === '/login') return user ? (res.writeHead(302, { Location: '/' }), res.end()) : servePage(res, 'login.html');

    for (const area of AREAS) if (await area(req, res, { u, p, user }) !== NEXT) return;

    if (p.startsWith('/api/')) return send(res, 404, { error: 'unknown api' });
    // a file with ?v= in its link changes name when it changes (index.html), so a phone keeps it a year without asking;
    // fonts and pictures for 30 days. (Behind the login only the phone keeps it - "private" - not Cloudflare.)
    const cache = fileCache(u, p);
    if (p === '/' || p === '/index.html') return servePage(res, 'index.html');
    if (p === '/login.html') return servePage(res, 'login.html');
    return serveFile(res, path.join(PUBLIC, p), cache, req);
  } catch (e) {
    if (!e.code || e.code >= 500 || typeof e.code !== 'number') console.error(new Date().toISOString(), p, e);
    send(res, typeof e.code === 'number' && e.code >= 400 && e.code < 600 ? e.code : 500, { error: e.message });
  }
});

for (const a of apps()) if (a.port) appProxy(a);
listenBoth(server, PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Lighthouse running at ${url}`);
  if (LAN) for (const n of Object.values(os.networkInterfaces()).flat())
    if (n.family === 'IPv4' && !n.internal) console.log(`  LAN: http://${n.address}:${PORT}`);
  if (LAN && tlsOn) console.log(`  LAN (https): https://${config.lanHost}:${PORT}`);
  if (args.includes('--open') && process.platform === 'win32') exec(`start "" "${url}"`);
});
