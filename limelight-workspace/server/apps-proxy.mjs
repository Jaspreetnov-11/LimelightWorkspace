// The app proxies: each app served again on its own localhost port (3341-3345), same-site with the workspace.
// Signs the person in (vouching for Edit / Office / AI), puts the workspace look (embed/) and HOME_JS / WHERE_JS
// into framed pages, rewrites redirects and cookies, and passes SSE / WebSocket through.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import path from 'node:path';
import { PUBLIC, HOST } from './config.mjs';
import { send, serveFile, toHttps, proto, homeUrl } from './core.mjs';
import { listenBoth } from './tls.mjs';
import { embedFile, targetOf } from './app-list.mjs';
import { auth } from './state.mjs';
import { editAs, editMembers, noEditPage } from './areas/edit.mjs';
import { officeAs } from './areas/office.mjs';
import { aiAs } from './areas/ai.mjs';

// ---------- app proxies ----------
const loginNeededPage = (req) => `<!doctype html><body style="margin:0;height:100vh;display:grid;place-content:center;text-align:center;
  background:#0b0c0f;color:#8b93a3;font:15px Segoe UI,sans-serif"><h2 style="color:#eceef2;margin:0 0 6px">Please sign in to Limelight first</h2>
  <p><a href="${homeUrl(req)}/login" target="_top" style="color:#ffc21a">Open the login page</a></p></body>`;
const offlinePage = (a) => `<!doctype html><body style="margin:0;height:100vh;display:grid;place-content:center;text-align:center;
  background:#0b0c0f;color:#8b93a3;font:15px Segoe UI,sans-serif"><h2 style="color:#eceef2;margin:0 0 6px">${a.name} is offline</h2>
  <p>${targetOf(a)} did not answer. Start the app, then press Reload.</p></body>`;

// put in every app page opened in a workspace frame: tells the workspace (the parent page) the page's path and title
const WHERE_JS = `<script>(function(){var last='';function t(){var w=location.pathname+location.search+location.hash,k=w+'|'+document.title;
if(k===last)return;last=k;try{parent.postMessage({lhWhere:w,title:document.title},'*');
if(parent!==top&&document.visibilityState==='visible')top.postMessage({lhWhere:w,title:document.title,inner:1},'*')}catch(e){}}
addEventListener('hashchange',t);addEventListener('popstate',t);addEventListener('load',t);setInterval(t,1500);
document.addEventListener('visibilitychange',function(){last='';t()});
var ao=location.ancestorOrigins,inLH=ao&&[].some.call(ao,function(o){return o!==location.origin});if(!inLH)return;
var la=0,act=function(){var n=Date.now();if(n-la>10000){la=n;try{top.postMessage({lhActive:1},'*')}catch(e){}}};
['mousemove','mousedown','keydown','wheel','touchstart'].forEach(function(k){addEventListener(k,act,{passive:true,capture:true})});
var go=function(h){top.postMessage({lhLaunch:h},'*')},ck=HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click=function(){if(/^limelight:/i.test(this.href))return go(this.href);return ck.apply(this,arguments)};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="limelight:"]');if(a){e.preventDefault();go(a.href)}},true)})()</script>`;
// "← Workspace" in the corner of Edit, Office and AI (Design has its own), in the app's own frame only (not in frames
// inside it, like Edit's project tabs): back to the workspace's Home
const HOME_JS = `<script>(function(){if(parent!==top)return;function add(){if(document.getElementById('lh-home'))return;
var b=document.createElement('button');b.id='lh-home';b.type='button';b.textContent='\\u2190 Workspace';b.title='Back to the Limelight workspace';
b.style.cssText='position:fixed;left:'+(window.__lhHomeLeft||10)+'px;bottom:'+(window.__lhHomeBottom||10)+'px;z-index:2147483000;font:600 12px Segoe UI,system-ui,sans-serif;color:#fff;background:rgba(18,16,28,.72);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:6px 12px;cursor:pointer;backdrop-filter:blur(10px);opacity:.55;transition:opacity .15s';
b.onmouseenter=function(){b.style.opacity='1'};b.onmouseleave=function(){b.style.opacity='.55'};
b.onclick=function(){top.postMessage({lhHome:1},'*')};document.body.appendChild(b)}
if(document.body)add();else addEventListener('DOMContentLoaded',add)})()</script>`;
// (limelight:// links - Open in Premiere / DaVinci - go up to the workspace page: a frame may not start an app itself)

// the request's own cookies minus the workspace login, plus the app session the workspace holds for this person
// jar: saved app cookies (Edit) added only where the browser has none of its own
function cookieHeader(req, inject, jar = {}) {
  const keep = (req.headers.cookie || '').split(/;\s*/).filter((c) => c && !c.startsWith('lw_sess=') && !(inject && c.startsWith(inject[0] + '=')));
  if (inject) keep.push(`${inject[0]}=${inject[1]}`);
  for (const [k, v] of Object.entries(jar)) if (!keep.some((c) => c.startsWith(k + '='))) keep.push(`${k}=${v}`);
  return keep.join('; ');
}

// Reverse proxy: localhost:<a.port> -> target. Strips the headers that forbid framing, rewrites redirects and cookie
// domains, passes SSE / WebSocket through, and signs the person in (cookie for AI, saved token for Lighthouse).
export function appProxy(a) {
  const strip = ['x-frame-options', 'content-security-policy', 'strict-transport-security'];
  const srv = http.createServer(async (req, res) => {
    if (toHttps(req, res)) return;
    const user = auth.userOf(req);
    if (!user) return send(res, 401, loginNeededPage(req), 'text/html; charset=utf-8');
    // the workspace's font, for the look put into the HR pages (embed/office-hr.css)
    if (req.url === '/__ll/inter.woff2') return serveFile(res, path.join(PUBLIC, 'fonts', 'inter-latin-wght-normal.woff2'));
    const t = new URL(targetOf(a));
    let inject = null;
    if (a.auth === 'ai') inject = await auth.appCookie(user, a.auth).catch(() => null);
    const vouch = a.id === 'editor' ? await editAs(user) : a.id === 'ai' ? aiAs(user) : null;
    // (no Edit team member for this person: say so - never Edit's own sign-in, never someone else's account)
    if (a.id === 'editor' && !vouch) return /text\/html/.test(req.headers.accept || '')
      ? send(res, 403, noEditPage(user), 'text/html; charset=utf-8') : send(res, 403, { error: 'No Edit access for this login' });
    const framed = req.headers['sec-fetch-dest'] === 'iframe';
    const isPage = (a.auth === 'lighthouse' || framed) && req.method === 'GET' && /text\/html/.test(req.headers.accept || '');
    const go = (retry) => {
      const headers = { ...req.headers, host: t.host, cookie: cookieHeader(req, inject) };
      // (Edit: the vouch alone - an Edit cookie left in this browser from an old sign-in is not passed on)
      if (a.id === 'editor') headers.cookie = String(headers.cookie || '').split(/;\s*/).filter((c) => c && !c.startsWith('ve_sess=')).join('; ');
      delete headers['x-lh-as']; delete headers['x-lh-key']; delete headers['x-lh-edit']; delete headers['x-lh-user']; delete headers['x-lh-admin'];
      if (vouch) Object.assign(headers, vouch);
      // Design (Studio, this PC only) shows who is editing a design live: the person signed in here
      if (a.id === 'design') headers['x-lh-as'] = Buffer.from(JSON.stringify({ email: user.email, name: user.name })).toString('base64url');
      if (a.id === 'office') { const as = officeAs(user); if (!as) return send(res, 503, offlinePage(a), 'text/html; charset=utf-8'); Object.assign(headers, as); }
      if (!headers.cookie) delete headers.cookie;
      for (const h of ['origin', 'referer']) if (headers[h]) headers[h] = headers[h].replace(/^https?:\/\/[^/]+/, t.origin);
      if (isPage) headers['accept-encoding'] = 'identity';
      // (a page we add to must come back in full - a "not modified" answer would skip what is added)
      if (isPage) { delete headers['if-none-match']; delete headers['if-modified-since']; }
      const up = (t.protocol === 'https:' ? https : http).request({ protocol: t.protocol, hostname: t.hostname, port: t.port,
        method: req.method, path: req.url, headers }, async (r) => {
        // our app session expired: sign in again once (only safe to repeat bodiless requests)
        if (r.statusCode === 401 && inject && retry && ['GET', 'HEAD'].includes(req.method)) {
          r.resume(); auth.forgetApp(user, a.auth);
          inject = await auth.appCookie(user, a.auth).catch(() => null);
          return go(false);
        }
        if (r.statusCode === 401 && inject) auth.forgetApp(user, a.auth);
        if (r.statusCode === 401 && a.id === 'editor') editMembers.delete(vouch['x-lh-edit']);
        const out = { ...r.headers };
        for (const h of strip) delete out[h];
        const here = `${proto(req)}://${req.headers.host}`;
        if (out.location) out.location = out.location.replace(t.origin, here);
        if (out['set-cookie']) out['set-cookie'] = out['set-cookie'].map((c) => c.replace(/;\s*domain=[^;]+/i, ''));
        if (isPage && /text\/html/.test(out['content-type'] || '')) {
          // Lighthouse keeps its login token in localStorage: put the person's token there before the app starts.
          // Inside a workspace frame the app's own sidebar is hidden and it takes the workspace's look (embed).
          const chunks = []; for await (const c of r) chunks.push(c);
          let inject = framed && a.embed ? `<style>${embedFile(a.embed)}</style>` : '';
          if (framed && a.embedJs) inject += `<script>${embedFile(a.embedJs).replace(/<\/script/gi, '<\\/script')}</script>`;
          // (inside the workspace every app says what is open in it, for the workspace's Share button)
          // (Edit's own logo is in its bottom-left corner: the button goes just right of it)
          if (framed) inject += WHERE_JS + (a.id === 'design' ? '' : (a.id === 'editor' ? '<script>window.__lhHomeLeft=128;window.__lhHomeBottom=8</script>' : '') + HOME_JS);
          if (a.auth === 'lighthouse') {
            const tok = JSON.stringify(auth.lighthouseToken(user));
            inject += `<script>try{if(localStorage.getItem('lh-token')!==${tok}){localStorage.setItem('lh-token',${tok});localStorage.removeItem('lh-auth-user')}}catch(e){}</script>`;
            // (in the workspace, no full-screen "Slide to clock in": the workspace's Home has the clock-in card)
            if (framed) inject += `<script>try{sessionStorage.setItem('lh-splash-seen','1')}catch(e){}</script>`;
          }
          // (Limelight AI shows a name in its corner from localStorage: the person who is signed in, not a fixed one)
          if (a.id === 'ai') inject += `<script>try{localStorage.setItem('ll_name',${JSON.stringify(String(user.name || user.email || '')).replace(/</g, '\\u003c')})}catch(e){}</script>`;
          let html = Buffer.concat(chunks).toString('utf8').replace(/<head[^>]*>/i, (m) => m + inject);
          // (an editor not yet redeployed shows its project tabs only when it is the top page: in the workspace frame
          // it counts as top too - its own tab frames sit one level deeper and stay plain editors)
          if (framed && a.id === 'editor') html = html.replace('const tabs = window.top === window &&', 'const tabs = (window.top === window || window.parent === window.top) &&');
          delete out['content-length']; delete out['content-encoding'];
          res.writeHead(r.statusCode, out); return res.end(html);
        }
        res.writeHead(r.statusCode, out);
        r.pipe(res);
      });
      up.on('error', () => { if (!res.headersSent) send(res, 502, offlinePage(a), 'text/html; charset=utf-8'); else res.end(); });
      if (retry) req.pipe(up); else up.end();
    };
    go(true);
  });
  srv.on('upgrade', async (req, sock, head) => {
    const user = auth.userOf(req);
    if (!user) return sock.destroy();
    const inject = a.auth === 'ai' ? await auth.appCookie(user, a.auth).catch(() => null) : null;
    const editVouch = a.id === 'editor' ? await editAs(user) : null;
    if (a.id === 'editor' && !editVouch) return sock.destroy();
    const t = new URL(targetOf(a));
    const conn = t.protocol === 'https:'
      ? tls.connect({ host: t.hostname, port: t.port || 443, servername: t.hostname })
      : net.connect({ host: t.hostname, port: t.port || 80 });
    conn.once(t.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const k = req.rawHeaders[i];
        if (/^(cookie|x-lh-as|x-lh-key|x-lh-edit|x-lh-user|x-lh-admin)$/i.test(k)) continue;
        lines.push(`${k}: ${/^host$/i.test(k) ? t.host : req.rawHeaders[i + 1]}`);
      }
      const ck = cookieHeader(req, inject).split(/;\s*/).filter((c) => c && !(editVouch && c.startsWith('ve_sess='))).join('; ');
      if (ck) lines.push(`Cookie: ${ck}`);
      if (editVouch) for (const [k, v] of Object.entries(editVouch)) lines.push(`${k}: ${v}`);
      if (a.id === 'office') { const as = officeAs(user); if (!as) return sock.destroy(); for (const [k, v] of Object.entries(as)) lines.push(`${k}: ${v}`); }
      conn.write(lines.join('\r\n') + '\r\n\r\n'); if (head?.length) conn.write(head);
      conn.pipe(sock); sock.pipe(conn);
    });
    conn.on('error', () => sock.destroy()); sock.on('error', () => conn.destroy());
  });
  srv.on('error', (e) => console.error(`${a.name} proxy on ${a.port}:`, e.message));
  listenBoth(srv, a.port, HOST);
}
