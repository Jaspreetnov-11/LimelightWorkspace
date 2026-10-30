// config.mjs - settings and secrets of Limelight Office, kept in data/config.json (never leaves this PC).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(ROOT, 'data');
const FILE = path.join(DATA, 'config.json');

const DEFAULTS = {
  port: 3300,
  // where Word / Excel / PowerPoint files made here are saved
  filesDir: path.join(os.homedir(), 'Documents', 'Limelight Office'),
  // each person's own data on the office NAS (Z:\Limelight Storage): <storageDir>\<email>\Office
  storageDir: '\\\\192.168.0.99\\Team Editing\\Limelight Storage',
  timeZone: 'Asia/Kolkata',
  lighthouseUrl: 'https://lighthouse.limelightcorp.in',
  // Ollama-compatible servers, tried in order (NAYA B first, then this PC)
  llm: { urls: ['http://192.168.0.205:11434', 'http://127.0.0.1:11434'], model: 'qwen3:8b' },
  // mail stays on Limelight's own server: team mail only - no outside (Google / company) mailbox is used or can be added
  teamMailOnly: true,
};

fs.mkdirSync(DATA, { recursive: true });

function merge(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {}))
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] ? merge(base[k], v) : v;
  return out;
}

export function load() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
  const cfg = merge(DEFAULTS, saved);
  fs.mkdirSync(cfg.filesDir, { recursive: true });
  return cfg;
}

export function save(patch) {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
  const next = merge(saved, patch);
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
  return load();
}

// settings safe to show in the browser (no secret)
export function publicView(cfg = load()) {
  return {
    port: cfg.port, filesDir: cfg.filesDir, timeZone: cfg.timeZone, llm: cfg.llm, lighthouseUrl: cfg.lighthouseUrl,
  };
}

// who the current request is for (set by the server): everyone gets their own files folder, on the NAS
export const ctx = new AsyncLocalStorage();
// the NAS folder, when it answers (looked at once every 30 s - a NAS that is off must not slow every request)
let nas = { at: 0, ok: false };
export function storageDir() {
  const dir = load().storageDir;
  if (!dir) return '';
  if (Date.now() - nas.at > 30e3) nas = { at: Date.now(), ok: fs.existsSync(dir) };
  return nas.ok ? dir : '';
}
export function filesDir() {
  const base = load().filesDir, u = ctx.getStore()?.user;
  const who = String(u?.email || u?.login || '').trim().toLowerCase().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  const nasDir = who && storageDir();
  // (NAS off: the old folders on this PC, so work goes on)
  const d = nasDir ? path.join(nasDir, who, 'Office') : !u || u.role === 'admin' ? base : path.join(base, 'Team', u.login);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
export const isLocal = () => !!ctx.getStore()?.local;
