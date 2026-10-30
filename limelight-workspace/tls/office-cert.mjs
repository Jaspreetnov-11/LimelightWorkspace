// Gets (and renews) the https certificate for the office network name, e.g. office.limelightcorp.net -> 192.168.0.210.
// Run by the owner: double-click "Get office certificate.bat". Safe to run again: it renews only when due.
//   1. Cloudflare DNS: lanHost -> this PC's office IP, "DNS only" (grey cloud: office traffic never goes through Cloudflare)
//   2. Let's Encrypt certificate through a Cloudflare DNS check (works although the address is private)
//   3. Saves Data/tls/fullchain.pem + privkey.pem; the running workspace picks a renewed one up within 6 hours
// Needs a Cloudflare API token with Zone -> DNS -> Edit for limelightcorp.net, saved by the owner in
// Data/tls/cloudflare.token (never in chat, never in git). Uses lego (github.com/go-acme/lego), fetched once into tls/bin.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const cfgFile = path.join(ROOT, 'config.json');
const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : {};
const HOST = cfg.lanHost || 'office.limelightcorp.net';
const ZONE = cfg.publicDomain || 'limelightcorp.net';
const TLS = path.join(ROOT, 'Data', 'tls');
const TOKEN_FILE = path.join(TLS, 'cloudflare.token');
const BIN = path.join(HERE, 'bin');
const LEGO = path.join(BIN, process.platform === 'win32' ? 'lego.exe' : 'lego');
const LEGO_VERSION = 'v4.35.2';
fs.mkdirSync(TLS, { recursive: true });

const say = (s) => console.log(`\n> ${s}`);
const stop = (s) => { console.error(`\nStopped: ${s}`); process.exit(1); };

// ---- the office IP of this PC (192.168.x.x) ----
const officeIp = cfg.lanIp || Object.values(os.networkInterfaces()).flat()
  .find((n) => n.family === 'IPv4' && !n.internal && /^192\.168\.0\./.test(n.address))?.address;
if (!officeIp) stop('Could not find this PC\'s 192.168.0.x address. Add "lanIp" to config.json.');

if (!fs.existsSync(TOKEN_FILE)) stop(`Save the Cloudflare API token (Zone > DNS > Edit, zone ${ZONE}) in:\n  ${TOKEN_FILE}`);
const TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

async function cf(method, p, body) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${p}`, { method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const j = await r.json();
  if (!j.success) stop(`Cloudflare said: ${JSON.stringify(j.errors)}`);
  return j.result;
}

// ---- 1. DNS record ----
say(`DNS: ${HOST} -> ${officeIp} (DNS only)`);
const [zone] = await cf('GET', `/zones?name=${ZONE}`);
if (!zone) stop(`Zone ${ZONE} not found for this token.`);
const [rec] = await cf('GET', `/zones/${zone.id}/dns_records?type=A&name=${HOST}`);
const want = { type: 'A', name: HOST, content: officeIp, proxied: false, ttl: 300, comment: 'Limelight workspace on the office network' };
if (!rec) await cf('POST', `/zones/${zone.id}/dns_records`, want);
else if (rec.content !== officeIp || rec.proxied) await cf('PUT', `/zones/${zone.id}/dns_records/${rec.id}`, want);
console.log('  ok');

// ---- 2. lego (ACME client), once ----
if (!fs.existsSync(LEGO)) {
  say('Fetching lego (Let\'s Encrypt client) from GitHub');
  // pinned to v4: v5 (May 2026) changed the command line this script uses
  const rel = await (await fetch(`https://api.github.com/repos/go-acme/lego/releases/tags/${LEGO_VERSION}`,
    { headers: { 'User-Agent': 'limelight-workspace' } })).json();
  const plat = process.platform === 'win32' ? 'windows_amd64.zip' : 'linux_amd64.tar.gz';
  const asset = rel.assets?.find((a) => a.name.endsWith(plat));
  if (!asset) stop('No lego download found on GitHub.');
  fs.mkdirSync(BIN, { recursive: true });
  const arch = path.join(BIN, asset.name);
  fs.writeFileSync(arch, Buffer.from(await (await fetch(asset.browser_download_url)).arrayBuffer()));
  // Windows' own tar.exe opens .zip too (a Git Bash tar on PATH would read "E:" as a network host)
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(tar, ['-xf', arch, '-C', BIN]);
  fs.rmSync(arch);
  console.log(`  ${rel.tag_name} ok`);
}

// ---- 3. certificate ----
const certDir = path.join(TLS, 'lego');
const have = fs.existsSync(path.join(certDir, 'certificates', `${HOST}.crt`));
// (optional: Let's Encrypt no longer sends expiry emails; renewal is automatic. Set "certEmail" in config.json to add one.)
const email = cfg.certEmail;
say(have ? 'Renewing the certificate if it ends within 30 days' : `Getting a certificate for ${HOST}`);
const legoArgs = ['--accept-tos', ...(email ? ['--email', email] : []), '--dns', 'cloudflare', '--domains', HOST, '--path', certDir,
  ...(have ? ['renew', '--days', '30'] : ['run'])];
try {
  execFileSync(LEGO, legoArgs, { stdio: 'inherit', env: { ...process.env, CF_DNS_API_TOKEN: TOKEN } });
} catch { stop('lego could not get the certificate (see the lines above).'); }

fs.copyFileSync(path.join(certDir, 'certificates', `${HOST}.crt`), path.join(TLS, 'fullchain.pem'));
fs.copyFileSync(path.join(certDir, 'certificates', `${HOST}.key`), path.join(TLS, 'privkey.pem'));
say(`Done. Certificate saved in Data\\tls. Open https://${HOST}:3350 on an office PC.`);
console.log('  First time only: restart the workspace (stop port 3350, run the .vbs) so it starts answering https.');
