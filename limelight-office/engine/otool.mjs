#!/usr/bin/env node
// otool.mjs - command line for Limelight Office, so Claude (or a script) can work Gmail / Calendar / Drive / Office
// through the running app (http://127.0.0.1:3300). Prints JSON.
//   node engine/otool.mjs status
//   node engine/otool.mjs team | mail [--box inbox|unread|sent] [--q words] | read <id> | send --to "Ravi, x@y.in" --subject S --body B [--attach f1,f2]
//   node engine/otool.mjs events [--from ISO] [--to ISO] | event --title T --start ISO [--end ISO] [--guests userId,userId] [--video] [--repeat weekly]
//   node engine/otool.mjs tasks [--scope mine|created|all] | task --title T [--for userId] [--due YYYY-MM-DD] [--priority high]
//   node engine/otool.mjs files [--q text] | word --name N [--title T] --md file.md [--pdf] | excel --name N --csv file.csv
//   node engine/otool.mjs ppt --name N --title T --slides slides.json [--pdf] | pdf <file> | readfile <file> | open <file>
//   node engine/otool.mjs ask "message"      (the local AI assistant; actions needing approval are listed, not run)
import fs from 'node:fs';

const BASE = process.env.LLO_URL || 'http://127.0.0.1:3300';
const [cmd, ...rest] = process.argv.slice(2);
const pos = [], opt = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) { const k = rest[i].slice(2); opt[k] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true; }
  else pos.push(rest[i]);
}
const list = (s) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : []);

async function call(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { 'x-llo': '1', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    .catch(() => { throw new Error(`Limelight Office is not running at ${BASE}. Start "Start Limelight Office.bat".`); });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.status);
  return j;
}
const q = (o) => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== true))).toString();

const run = {
  status: () => call('GET', '/api/status'),
  mail: () => call('GET', `/api/lmail?${q({ q: opt.q, box: opt.box })}`),
  read: () => call('GET', `/api/lmail/${encodeURIComponent(pos[0])}`),
  send: () => call('POST', '/api/lmail/send', { to: opt.to, cc: opt.cc, subject: opt.subject, body: opt.body ?? (opt['body-file'] ? fs.readFileSync(opt['body-file'], 'utf8') : ''), files: list(opt.attach) }),
  team: () => call('GET', '/api/team'),
  events: () => call('GET', `/api/cal?${q({ from: opt.from, to: opt.to })}`),
  event: () => call('POST', '/api/cal', { title: opt.title, start: opt.start, end: opt.end, allDay: !!opt['all-day'], location: opt.location, notes: opt.notes, guests: list(opt.guests), video: !!opt.video, recur: opt.repeat }),
  tasks: () => call('GET', `/api/ltasks?${q({ scope: opt.scope })}`),
  task: () => call('POST', '/api/ltasks', { title: opt.title, notes: opt.notes, assignee: opt.for, due: opt.due, priority: opt.priority }),
  files: () => call('GET', `/api/files?${q({ q: opt.q })}`),
  word: () => call('POST', '/api/office/word', { name: opt.name, title: opt.title, content: fs.readFileSync(opt.md, 'utf8'), pdf: !!opt.pdf }),
  excel: () => call('POST', '/api/office/excel', { name: opt.name, sheets: opt.json ? JSON.parse(fs.readFileSync(opt.json, 'utf8')) : undefined,
    rows: opt.csv ? fs.readFileSync(opt.csv, 'utf8').replace(/\r/g, '').split('\n').filter(Boolean).map((l) => l.split(',')) : undefined, pdf: !!opt.pdf }),
  ppt: () => call('POST', '/api/office/ppt', { name: opt.name || opt.title, title: opt.title, subtitle: opt.subtitle, slides: JSON.parse(fs.readFileSync(opt.slides, 'utf8')), theme: opt.plain ? 'plain' : 'limelight', pdf: !!opt.pdf }),
  pdf: () => call('POST', '/api/files/pdf', { path: pos[0] }),
  readfile: () => call('POST', '/api/files/read', { path: pos[0] }),
  open: () => call('POST', '/api/files/open', { path: pos[0] }),
  ask: () => call('POST', '/api/agent', { messages: [{ role: 'user', content: pos.join(' ') }] }),
};

if (!run[cmd]) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).join('\n'));
  process.exit(cmd ? 1 : 0);
}
run[cmd]().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(`otool: ${e.message}`); process.exit(1); });
