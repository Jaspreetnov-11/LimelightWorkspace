// Gets (and renews) the https certificate for MeshLink's public name, mesh.limelightcorp.net -> the office's
// public internet address. Run by the owner: "Get MeshLink certificate.bat". Safe to run again: it renews only when
// due, and moves the name if the office's public address changed.
//   1. Cloudflare DNS: meshHost -> this office's public IP, "DNS only" (grey cloud: MeshLink must reach the office directly)
//   2. Let's Encrypt certificate through a Cloudflare DNS check
//   3. Saves data/tls/fullchain.pem + privkey.pem; the running MeshLink server picks a renewed one up by itself
// Reuses the workspace's Cloudflare token (limelight-workspace/Data/tls/cloudflare.token, never in chat or git)
// and its lego copy (limelight-workspace/tls/bin; run "Get office certificate.bat" once first).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(HERE, '..', '..', 'limelight-workspace');
const cfgFile = path.join(WS, 'config.json');
const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : {};
const HOST = cfg.meshHost || 'mesh.limelightcorp.net';
const ZONE = cfg.publicDomain || 'limelightcorp.net';
const TOKEN_FILE = path.join(WS, 'Data', 'tls', 'cloudflare.token');
const LEGO = path.join(WS, 'tls', 'bin', process.platform === 'win32' ? 'lego.exe' : 'lego');
const TLS = path.join(HERE, 'data', 'tls');
fs.mkdirSync(TLS, { recursive: true });

const say = (s) => console.log(`\n> ${s}`);
const stop = (s) => { console.error(`\nStopped: ${s}`); process.exit(1); };

if (!fs.existsSync(TOKEN_FILE)) stop(`The Cloudflare token is missing: ${TOKEN_FILE} (see "Get office certificate.bat")`);
if (!fs.existsSync(LEGO)) stop('lego is missing: run limelight-workspace\\tls\\"Get office certificate.bat" once first.');
const TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

async function cf(method, p, body) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${p}`, { method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const j = await r.json();
  if (!j.success) stop(`Cloudflare said: ${JSON.stringify(j.errors)}`);
  return j.result;
}

// ---- the office's public address, as the internet sees it ----
const trace = await (await fetch('https://1.1.1.1/cdn-cgi/trace')).text();
const publicIp = /^ip=(\d+\.\d+\.\d+\.\d+)$/m.exec(trace)?.[1];
if (!publicIp) stop('Could not find the office\'s public IPv4 address.');
// (behind the provider's CGNAT the internet still sees a public address, the provider's: only the router's own WAN
// address shows it, so the owner compares the two once - see docs/servers.md, MeshLink)
console.log(`  The internet sees this office as ${publicIp}. The router's WAN address must be the same,`);
console.log('  otherwise the provider shares the address (CGNAT) and port forwarding cannot work.');

// ---- 1. DNS record ----
say(`DNS: ${HOST} -> ${publicIp} (DNS only)`);
const [zone] = await cf('GET', `/zones?name=${ZONE}`);
if (!zone) stop(`Zone ${ZONE} not found for this token.`);
const [rec] = await cf('GET', `/zones/${zone.id}/dns_records?type=A&name=${HOST}`);
const want = { type: 'A', name: HOST, content: publicIp, proxied: false, ttl: 300, comment: 'MeshLink server on JASPREET (office router forwards 8443/tcp, 3478/udp)' };
if (!rec) await cf('POST', `/zones/${zone.id}/dns_records`, want);
else if (rec.content !== publicIp || rec.proxied) await cf('PUT', `/zones/${zone.id}/dns_records/${rec.id}`, want);
console.log('  ok');

// ---- 2. certificate ----
const certDir = path.join(TLS, 'lego');
const have = fs.existsSync(path.join(certDir, 'certificates', `${HOST}.crt`));
const legoArgs = ['--accept-tos', ...(cfg.certEmail ? ['--email', cfg.certEmail] : []), '--dns', 'cloudflare', '--domains', HOST,
  '--path', certDir, ...(have ? ['renew', '--days', '30'] : ['run'])];
say(have ? 'Renewing the certificate if it ends within 30 days' : `Getting a certificate for ${HOST}`);
try {
  execFileSync(LEGO, legoArgs, { stdio: 'inherit', env: { ...process.env, CF_DNS_API_TOKEN: TOKEN } });
} catch { stop('lego could not get the certificate (see the lines above).'); }
fs.copyFileSync(path.join(certDir, 'certificates', `${HOST}.crt`), path.join(TLS, 'fullchain.pem'));
fs.copyFileSync(path.join(certDir, 'certificates', `${HOST}.key`), path.join(TLS, 'privkey.pem'));
say(`Done. Certificate saved in tools\\meshlink\\data\\tls. Devices join with https://${HOST}:8443`);
