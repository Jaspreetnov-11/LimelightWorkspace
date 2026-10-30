// Settings: config.json (with the defaults below), the command line (--open, --lan), the port and the folders.
// Read once at startup; /api/settings/ai (areas/ai.mjs) saves config.json again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// (this file sits in server/: the workspace folder is one up)
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC = path.join(ROOT, 'public');
export const DATA = path.join(ROOT, 'Data');
fs.mkdirSync(DATA, { recursive: true });

export const CONFIG_FILE = path.join(ROOT, 'config.json');
const defaults = {
  port: 3350,
  studioUrl: 'http://127.0.0.1:3330',          // Limelight Studio (design) - also serves projects, library and AI images
  lighthouseUrl: 'https://lighthouse.limelightcorp.in',
  editorUrl: 'http://192.168.0.200',
  editorStandbyUrl: 'http://192.168.0.205:3100',  // NAYA B runs the editor while NAYA A is down
  aiUrl: 'http://192.168.0.205:8800',
  aiLocalUrl: 'http://127.0.0.1:8800',             // Limelight AI on this PC: used while NAYA B is busy or off
  aiPassword: '',
  // public address (Cloudflare tunnel on this PC): the workspace and one host per app, all under one cookie domain
  publicDomain: 'limelightcorp.net',
  publicHost: 'limelightcorp.net',             // the workspace itself (www.limelightcorp.net too)
  appHosts: { editor: 'lh-edit.limelightcorp.net', office: 'lh-office.limelightcorp.net', lighthouse: 'lh-team.limelightcorp.net',
    ai: 'lh-ai.limelightcorp.net', design: 'lh-design.limelightcorp.net' },                              // office Limelight AI password: set once by an admin (account menu); everyone is signed in with it
  // https on the office network (server/tls.mjs): this PC's name there (DNS: lanHost -> 192.168.0.210, not proxied)
  // and its certificate (tls/Get office certificate.bat). lanHttpsOnly: office-network http visits are sent to
  // https://lanHost - turn on once every office PC has Lighthouse.exe 1.4, which knows that name.
  lanHost: 'office.limelightcorp.net',
  tlsCert: 'Data/tls/fullchain.pem',
  tlsKey: 'Data/tls/privkey.pem',
  lanHttpsOnly: false,
};
export const config = { ...defaults, ...(fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : {}) };
if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

export const args = process.argv.slice(2);
export const LAN = args.includes('--lan');
export const PORT = Number(process.env.WORKSPACE_PORT || process.env.PORT || config.port);
export const HOST = LAN ? '0.0.0.0' : '127.0.0.1';
