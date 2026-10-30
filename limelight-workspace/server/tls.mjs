// HTTPS on the office network. Each workspace port (3350 and the app proxies 3341-3345) answers both plain http and
// https: the first byte of a connection says which (a TLS hello starts with 0x16). So the Cloudflare tunnel and older
// Lighthouse.exe copies keep using http, while office PCs and phones use https://<lanHost>:<port> with a real
// certificate (tls/Get office certificate.bat). No certificate files yet: http only, exactly as before.
import fs from 'node:fs';
import net from 'node:net';
import https from 'node:https';
import path from 'node:path';
import { config, ROOT } from './config.mjs';

const file = (f) => (path.isAbsolute(f) ? f : path.join(ROOT, f));
const CERT = file(config.tlsCert), KEY = file(config.tlsKey);
let stamp = '';
const readTls = () => {
  try {
    const s = `${fs.statSync(CERT).mtimeMs}|${fs.statSync(KEY).mtimeMs}`;
    return { cert: fs.readFileSync(CERT), key: fs.readFileSync(KEY), stamp: s };
  } catch { return null; }
};
const first = readTls();
if (first) stamp = first.stamp;
export const tlsOn = !!first;

const secureServers = [];
// a renewed certificate (every ~60 days) is picked up without a restart
if (tlsOn) setInterval(() => {
  const t = readTls();
  if (!t || t.stamp === stamp) return;
  stamp = t.stamp;
  for (const s of secureServers) s.setSecureContext({ cert: t.cert, key: t.key });
  console.log(new Date().toISOString(), 'https certificate reloaded');
}, 6 * 3600 * 1000).unref();

// came in over https on this PC (not via the tunnel, which uses http to 127.0.0.1)
export const isSecure = (req) => !!req.socket?.encrypted;

// srv: an http.Server with its 'request' / 'upgrade' handlers attached. Listens on port for both http and https.
export function listenBoth(srv, port, host, cb) {
  if (!tlsOn) return srv.listen(port, host, cb);
  const sec = https.createServer({ cert: first.cert, key: first.key, minVersion: 'TLSv1.2' });
  for (const ev of ['request', 'upgrade']) for (const l of srv.listeners(ev)) sec.on(ev, l);
  secureServers.push(sec);
  const front = net.createServer((sock) => {
    sock.on('error', () => sock.destroy());
    sock.once('data', (buf) => {
      sock.pause();
      sock.unshift(buf);
      (buf[0] === 0x16 ? sec : srv).emit('connection', sock);
      process.nextTick(() => sock.resume());
    });
  });
  front.on('error', (e) => srv.emit('error', e));
  return front.listen(port, host, cb);
}
