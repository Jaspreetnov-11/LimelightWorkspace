// office.mjs - Word / Excel / PowerPoint on this PC through the installed Microsoft Office (engine/ps/office.ps1),
// plus the local files folder (list, open in the desktop app, convert to PDF, read text).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { ROOT, load, filesDir, storageDir, isLocal, ctx } from './config.mjs';
import { one, run as dbRun } from './db.mjs';

const PS1 = path.join(ROOT, 'engine', 'ps', 'office.ps1');
const KINDS = { '.docx': 'word', '.doc': 'word', '.rtf': 'word', '.xlsx': 'excel', '.xls': 'excel', '.xlsm': 'excel', '.csv': 'excel',
  '.pptx': 'ppt', '.ppt': 'ppt', '.pdf': 'pdf' };
export const kindOf = (f) => KINDS[path.extname(f).toLowerCase()] || 'file';

const APPS = {
  word: 'WINWORD.EXE', excel: 'EXCEL.EXE', ppt: 'POWERPNT.EXE',
};
export function installed() {
  const dirs = ['C:/Program Files/Microsoft Office/root/Office16', 'C:/Program Files (x86)/Microsoft Office/root/Office16'];
  return Object.fromEntries(Object.entries(APPS).map(([k, exe]) => [k, dirs.some((d) => fs.existsSync(path.join(d, exe)))]));
}

// one Office job at a time: parallel COM sessions fight over the same Word / PowerPoint instance
let queue = Promise.resolve();
function run(job) {
  const next = queue.then(() => runNow(job));
  queue = next.catch(() => {});
  return next;
}
function runNow(job) {
  const id = crypto.randomBytes(6).toString('hex');
  const jf = path.join(os.tmpdir(), `llo_${id}_job.json`), rf = path.join(os.tmpdir(), `llo_${id}_res.json`);
  fs.writeFileSync(jf, JSON.stringify(job), 'utf8');
  return new Promise((ok, fail) => {
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', PS1, jf, rf], { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => p.kill(), 180e3);
    p.on('close', () => {
      clearTimeout(timer);
      let res = null;
      try { res = JSON.parse(fs.readFileSync(rf, 'utf8').replace(/^\uFEFF/, '')); } catch {}
      for (const f of [jf, rf]) try { fs.unlinkSync(f); } catch {}
      if (!res) return fail(new Error(`Office did not answer. ${err.slice(-400)}`));
      if (!res.ok) return fail(new Error(res.error || 'Office job failed'));
      ok(res);
    });
  });
}

const clean = (s) => String(s || 'Untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Untitled';
// a free name in the files folder: "Name.docx", "Name (2).docx", ...
function outPath(name, ext) {
  const dir = filesDir();
  const base = clean(name).replace(new RegExp(`\\${ext}$`, 'i'), '');
  let f = path.join(dir, base + ext), n = 2;
  while (fs.existsSync(f)) f = path.join(dir, `${base} (${n++})${ext}`);
  return f;
}

// "# Heading", "## Sub", "- bullet", "1. item", "> quote", "| a | b |" tables, blank-line paragraphs
export function markdownToBlocks(md = '') {
  const blocks = [];
  let table = null;
  for (const raw of String(md).replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (/^\|.*\|$/.test(line)) {
      if (/^\|[\s:|-]+\|$/.test(line)) continue; // separator row
      (table ||= { type: 'table', rows: [] }).rows.push(line.slice(1, -1).split('|').map((c) => c.trim()));
      continue;
    }
    if (table) { blocks.push(table); table = null; }
    if (!line) continue;
    const strip = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/`(.+?)`/g, '$1');
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)/))) blocks.push({ type: `h${m[1].length}`, text: strip(m[2]) });
    else if ((m = line.match(/^[-*•]\s+(.*)/))) blocks.push({ type: 'bullet', text: strip(m[1]) });
    else if ((m = line.match(/^\d+[.)]\s+(.*)/))) blocks.push({ type: 'number', text: strip(m[1]) });
    else if ((m = line.match(/^>\s?(.*)/))) blocks.push({ type: 'quote', text: strip(m[1]) });
    else blocks.push({ type: 'p', text: strip(line) });
  }
  if (table) blocks.push(table);
  return blocks;
}

export async function createWord({ name, title, content = '', pdf = false }) {
  const out = outPath(name || title, '.docx');
  return run({ action: 'word', out, title, blocks: markdownToBlocks(content), pdf });
}

// sheets: [{ name, rows: [[...], ...] }]  or rows directly
export async function createExcel({ name, sheets, rows, pdf = false }) {
  const out = outPath(name, '.xlsx');
  const list = sheets?.length ? sheets : [{ name: 'Sheet1', rows: rows || [] }];
  // numbers stay numbers so formulas and sums work
  const fix = list.map((s) => ({ name: s.name, rows: (s.rows || []).map((r) => r.map((v) => (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v))) }));
  return run({ action: 'excel', out, sheets: fix, pdf });
}

// slides: [{ title, bullets: [...], notes }]
export async function createPpt({ name, title, subtitle = '', slides = [], theme = 'limelight', pdf = false }) {
  const out = outPath(name || title, '.pptx');
  return run({ action: 'ppt', out, title, subtitle, slides, theme, pdf });
}

// a file is yours when it is in your folder (the owner's covers everyone's), or a teammate shared it with you
const sharedWithMe = (full) => { const u = ctx.getStore()?.user; return !!u && !!one('SELECT 1 FROM shares WHERE path = ? AND user_id = ?', full.toLowerCase(), u.id); };
const under = (full, dir) => !!dir && full.toLowerCase().startsWith(path.resolve(dir).toLowerCase() + path.sep);
const mine = (full) => isLocal() || under(full, filesDir()) || sharedWithMe(full)
  // (an admin may open anyone's: every person's folder on the NAS, and the old folders on this PC)
  || (ctx.getStore()?.user?.role === 'admin' && (under(full, storageDir()) || under(full, load().filesDir)));
const inFiles = (f) => {
  const full = path.resolve(path.isAbsolute(f) ? f : path.join(filesDir(), f));
  if (!mine(full)) throw new Error('That file is not in your folder');
  if (!fs.existsSync(full)) throw new Error(`File not found: ${f}`);
  return full;
};
export const toPdf = (file) => run({ action: 'pdf', in: inFiles(file) });
export async function readText(file, max = 20000) {
  const full = inFiles(file);
  const r = await run({ action: 'read', in: full });
  return { file: full, text: String(r.text || '').slice(0, max) };
}

export function openFile(file) {
  if (!isLocal()) throw new Error('Opening in the Office app works only on the main PC — use Download.');
  const full = inFiles(file);
  spawn('cmd.exe', ['/c', 'start', '""', full], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return { opened: full };
}
export function showInFolder(file) {
  if (!isLocal()) throw new Error('Show in folder works only on the main PC.');
  const full = inFiles(file);
  spawn('explorer.exe', [`/select,${full}`], { detached: true, stdio: 'ignore' }).unref();
  return { shown: full };
}

export function listFiles({ q = '' } = {}) {
  const dir = filesDir();
  const items = [];
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('~$')) continue; // Office lock files
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (!st.isFile()) continue;
    if (q && !name.toLowerCase().includes(q.toLowerCase())) continue;
    items.push({ name, path: full, kind: kindOf(name), size: st.size, modified: st.mtimeMs });
  }
  return { dir, items: items.sort((a, b) => b.modified - a.modified) };
}

// ---------- the in-app editors (Document / Grid / Present) ----------
const tmpDir = () => { const d = path.join(os.tmpdir(), `llo_ed_${crypto.randomBytes(5).toString('hex')}`); fs.mkdirSync(d, { recursive: true }); return d; };
const rmDir = (d) => { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} };
const IMG = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp' };
const toDataUri = (f) => `data:${IMG[path.extname(f).toLowerCase()] || 'image/png'};base64,${fs.readFileSync(f).toString('base64')}`;
let imgN = 0;
function dataUriToFile(uri, dir) {
  const m = String(uri).match(/^data:image\/(png|jpe?g|gif|webp|bmp);base64,(.+)$/);
  if (!m) return null;
  const f = path.join(dir, `img${imgN++}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`);
  fs.writeFileSync(f, Buffer.from(m[2], 'base64'));
  return f;
}
// save over the file that was opened when it is the same kind, else a new file in the files folder
const saveTarget = (file, name, ext) => {
  if (!(file && path.extname(file).toLowerCase() === ext && fs.existsSync(file))) return outPath(name || 'Untitled', ext);
  if (!mine(path.resolve(file))) throw new Error('That file is not in your folder');
  return path.resolve(file);
};

// share a file with teammates: they can open it from the link and edit it together with you
export function share(file, userIds) {
  const full = inFiles(file), by = ctx.getStore()?.user?.id || '';
  for (const id of userIds) dbRun('INSERT OR IGNORE INTO shares (path, user_id, by, created) VALUES (?, ?, ?, ?)', full.toLowerCase(), id, by, Date.now());
  return full;
}
export const fileFor = (f) => inFiles(f);

export async function docOpen(file) {
  const full = inFiles(file), dir = tmpDir(), html = path.join(dir, 'doc.html');
  try {
    const r = await run({ action: 'docopen', in: full, html });
    const src = fs.readFileSync(html, 'utf8');
    const body = src.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || src;
    // pictures Word wrote next to the HTML come back inline
    const out = body.replace(/src="([^"]+)"/g, (m, rel) => {
      const f = path.join(dir, decodeURIComponent(rel));
      return fs.existsSync(f) ? `src="${toDataUri(f)}"` : m;
    });
    return { path: full, name: path.basename(full), html: out, meta: r.meta || {} };
  } finally { rmDir(dir); }
}
export async function docSave({ path: file, name, html = '', meta = {}, pdf = false }) {
  const dir = tmpDir(), h = path.join(dir, 'doc.html');
  try {
    const body = html.replace(/src="(data:image\/[^"]+)"/g, (m, uri) => { const f = dataUriToFile(uri, dir); return f ? `src="${f}"` : m; });
    fs.writeFileSync(h, `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Calibri,"Nirmala UI",sans-serif;font-size:11pt;line-height:1.4}table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px 8px;vertical-align:top}h1{font-size:20pt}h2{font-size:16pt}h3{font-size:13pt}</style></head><body>${body}</body></html>`, 'utf8');
    return await run({ action: 'docsave', html: h, out: saveTarget(file, name, '.docx'), meta, pdf });
  } finally { rmDir(dir); }
}

export async function gridOpen(file) {
  const full = inFiles(file);
  const r = await run({ action: 'gridopen', in: full });
  return { path: full, name: path.basename(full), sheets: r.sheets || [] };
}
export const gridSave = ({ path: file, name, sheets, pdf = false }) =>
  run({ action: 'gridsave', out: saveTarget(file, name, '.xlsx'), sheets, pdf });

export async function slidesOpen(file) {
  const full = inFiles(file), media = tmpDir();
  try {
    const r = await run({ action: 'slidesopen', in: full, media });
    for (const s of r.slides || []) for (const it of s.items || []) if (it.file) { it.src = toDataUri(it.file); delete it.file; }
    return { path: full, name: path.basename(full), slides: r.slides || [] };
  } finally { rmDir(media); }
}
export async function slidesSave({ path: file, name, slides = [], transition = '', pdf = false }) {
  const dir = tmpDir();
  try {
    const out = slides.map((s) => ({ ...s, bgImg: undefined, bgFile: s.bgImg ? dataUriToFile(s.bgImg, dir) : undefined, items: (s.items || []).map((it) => {
      if (it.type !== 'image') return it;
      const f = dataUriToFile(it.src, dir);
      return f ? { ...it, src: undefined, file: f } : null;
    }).filter(Boolean) }));
    return await run({ action: 'slidessave', out: saveTarget(file, name, '.pptx'), slides: out, transition, pdf });
  } finally { rmDir(dir); }
}

// a file sent from the browser (drag and drop) goes into the files folder
export function saveUpload(name, data) {
  const ext = path.extname(name);
  const out = outPath(path.basename(name, ext), ext || '');
  fs.writeFileSync(out, data);
  return { path: out, name: path.basename(out) };
}
