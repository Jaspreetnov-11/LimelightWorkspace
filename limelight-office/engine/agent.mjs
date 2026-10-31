// agent.mjs - the Agent: a local model (Ollama, NAYA B first) that works Limelight Mail, Calendar, Task, Meetings and
// Document / Grid / Present through tools, for the person who asks. Anything that goes out in their name (send a mail,
// add or delete an event, bin a mail) is not done by the model: it comes back as a pending action and runs only after Approve.
import crypto from 'node:crypto';
import { load, filesDir } from './config.mjs';
import * as office from './office.mjs';
import * as lmail from './lmail.mjs';
import * as cal from './lcal.mjs';
import { team } from './auth.mjs';

const CONFIRM = new Set(['send_email', 'create_event', 'delete_event', 'trash_email']);
const fn = (name, description, properties, required = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
const S = (d) => ({ type: 'string', description: d });
const ARR = (d, items = { type: 'string' }) => ({ type: 'array', description: d, items });

const TOOLS = [
  fn('list_team', 'List the Limelight team members (names, logins, emails).', {}),
  fn('search_email', 'Search Limelight Mail (team mail and the company mailbox). Empty query = latest inbox.', { query: S('words to look for'), box: S('inbox | unread | starred | sent | trash') }),
  fn('read_email', 'Read one email in full by its id.', { id: S('mail id') }, ['id']),
  fn('send_email', 'Send an email. Team members can be named by name or login; others need an email address. The user approves it first.', { to: S('names / logins / emails, comma separated'), cc: S(''), subject: S(''), body: S('plain text'), files: ARR('file names from the files folder to attach') }, ['to', 'subject', 'body']),
  fn('trash_email', 'Move an email to Trash (user approves).', { id: S('mail id') }, ['id']),
  fn('list_events', 'List Limelight Calendar events between two times (ISO 8601 with +05:30).', { from: S('ISO start'), to: S('ISO end') }),
  fn('create_event', 'Add a Limelight Calendar event; team guests are invited. video=true adds a Limelight video meeting room. The user approves it first.', { title: S(''), start: S('ISO 8601 with offset, e.g. 2026-10-30T15:00:00+05:30'), end: S('ISO 8601'), all_day: { type: 'boolean' }, location: S(''), notes: S(''), guests: ARR('team member names or logins'), video: { type: 'boolean' }, repeat: S('daily | weekdays | weekly | monthly') }, ['title', 'start']),
  fn('delete_event', 'Delete a calendar event by id (user approves).', { id: S('event id') }, ['id']),
  fn('create_word', 'Make a Document (.docx, Word) in the files folder. content is markdown: # headings, - bullets, 1. lists, | tables |.', { name: S('file name'), title: S('document title'), content: S('markdown body'), pdf: { type: 'boolean', description: 'also save a PDF' } }, ['name', 'content']),
  fn('create_excel', 'Make a Grid (.xlsx, Excel). First row of each sheet is the header. Cells starting with = are formulas.', { name: S('file name'), sheets: ARR('sheets', { type: 'object', properties: { name: S(''), rows: ARR('rows', { type: 'array', items: {} }) } }) }, ['name', 'sheets']),
  fn('create_ppt', 'Make a Deck (.pptx, PowerPoint), 16:9, Limelight dark theme.', { name: S('file name'), title: S('cover title'), subtitle: S(''), slides: ARR('slides', { type: 'object', properties: { title: S(''), bullets: ARR('bullet points'), notes: S('speaker notes') } }) }, ['name', 'slides']),
  fn('list_files', 'List the files in the files folder.', { query: S('name filter') }),
  fn('read_file', 'Read the text of a Document / Grid / Deck / text file.', { file: S('file name or path') }, ['file']),
  fn('convert_to_pdf', 'Convert a file to PDF.', { file: S('file name or path') }, ['file']),
];

// "Ravi" / "ravi" -> the team member's id
function person(nameOrLogin) {
  const t = String(nameOrLogin || '').trim().toLowerCase(); if (!t) return null;
  const all = team();
  return all.find((u) => u.login === t || u.email.toLowerCase() === t) || all.find((u) => u.name.toLowerCase() === t) || all.find((u) => u.name.toLowerCase().split(' ')[0] === t) || null;
}
const iso = (t) => new Date(t).toISOString();

async function exec(name, a, user) {
  const me = user.id;
  switch (name) {
    case 'list_team': return team().map(({ name, login, email, title }) => ({ name, login, email, title }));
    case 'search_email': return (await lmail.list(me, { box: a.box || 'inbox', q: a.query || '' })).items.slice(0, 15).map(({ id, from, fromAddr, subject, date, unread, source }) => ({ id, from, fromAddr, subject, date: iso(date), unread, source }));
    case 'read_email': { const m = await lmail.get(me, a.id); return { id: m.id, from: m.from, fromAddr: m.fromAddr, to: m.to, subject: m.subject, date: iso(m.date), text: (m.text || '').slice(0, 8000), attachments: m.atts.map((x) => x.name) }; }
    case 'send_email': return lmail.send(me, { to: a.to, cc: a.cc, subject: a.subject, body: a.body, files: (a.files || []).map((f) => office.listFiles().items.find((x) => x.name === f || x.path === f)?.path).filter(Boolean) });
    case 'trash_email': await lmail.move(me, a.id, 'trash'); return { trashed: a.id };
    case 'list_events': return cal.listEvents(me, +new Date(a.from || Date.now()), +new Date(a.to || Date.now() + 7 * 864e5)).map(({ id, title, start, end, allDay, location, room, guests, owner }) => ({ id, title, start: iso(start), end: iso(end), allDay, location, video: !!room, organiser: owner.name, guests: guests.map((g) => `${g.name}${g.rsvp ? ` (${g.rsvp})` : ''}`) }));
    case 'create_event': return cal.createEvent(me, { title: a.title, start: a.start, end: a.end, allDay: a.all_day, location: a.location, notes: a.notes, guests: (a.guests || []).map((g) => person(g)?.id).filter(Boolean), video: !!a.video, recur: a.repeat || '' });
    case 'delete_event': cal.deleteEvent(me, a.id); return { deleted: a.id };
    case 'create_word': return office.createWord(a);
    case 'create_excel': return office.createExcel(a);
    case 'create_ppt': return office.createPpt(a);
    case 'list_files': return office.listFiles({ q: a.query }).items.slice(0, 30).map(({ name, kind, modified }) => ({ name, kind, modified: iso(modified) }));
    case 'read_file': return office.readText(a.file, 12000);
    case 'convert_to_pdf': return office.toPdf(a.file);
    default: throw new Error(`unknown tool ${name}`);
  }
}

// a line for the UI and for the approval card
function describe(name, a) {
  const who = (list) => (list || []).map((g) => person(g)?.name || g).join(', ');
  switch (name) {
    case 'send_email': return `Send mail to ${a.to}${a.cc ? ` (cc ${a.cc})` : ''} — "${a.subject}"`;
    case 'trash_email': return 'Move mail to Trash';
    case 'create_event': return `Add to Calendar: "${a.title}" — ${fmtTime(a.start)}${a.guests?.length ? ` with ${who(a.guests)}` : ''}${a.video ? ' + video room' : ''}`;
    case 'delete_event': return 'Delete calendar event';
    case 'list_team': return 'Looked at the team';
    case 'search_email': return `Searched mail${a.query ? `: ${a.query}` : ''}`;
    case 'read_email': return 'Read a mail';
    case 'list_events': return 'Checked calendar';
    case 'create_word': return `Made Document: ${a.name}`;
    case 'create_excel': return `Made Grid: ${a.name}`;
    case 'create_ppt': return `Made Deck: ${a.name}`;
    case 'list_files': return 'Looked at files';
    case 'read_file': return `Read ${a.file}`;
    case 'convert_to_pdf': return `PDF of ${a.file}`;
    default: return name;
  }
}
function fmtTime(t) {
  const d = new Date(t);
  return isNaN(d) ? String(t) : d.toLocaleString('en-IN', { timeZone: load().timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

// ---------- model server: the Limelight AI engine (llama.cpp router, OpenAI-style API) ----------
// engine names have no ":" ("qwen3-8b"); settings saved in Ollama days ("qwen3:8b", ":11434") still mean the same
const engineName = (m) => String(m || '').trim().toLowerCase().replace(':', '-');
const engineUrl = (u) => String(u || '').replace(/:11434\b/, ':8830').replace(/\/$/, '');
let picked = null, pickedAt = 0;
// what is known right now, without waiting (the check runs in the background)
export const llmCached = () => { llmStatus().catch(() => {}); return picked || { online: false, checking: true, url: '', model: '', models: [] }; };
export async function llmStatus(force = false) {
  if (!force && picked && Date.now() - pickedAt < 60e3) return picked;
  const { urls, model } = load().llm;
  for (const url of [...new Set(urls.map(engineUrl))]) {
    try {
      const r = await fetch(`${url}/models`, { signal: AbortSignal.timeout(2500) });
      const names = ((await r.json()).data || []).map((m) => m.id);
      if (!names.length) continue;
      const use = names.find((n) => n === engineName(model)) || names.find((n) => /qwen3|gpt-oss|sarvam|granite|llama3/.test(n) && !/embed|vl|coder/.test(n));
      if (use) { picked = { online: true, url, model: use, models: names }; pickedAt = Date.now(); return picked; }
    } catch {}
  }
  picked = { online: false, url: '', model: '', models: [] }; pickedAt = Date.now();
  return picked;
}

function systemPrompt(user) {
  const { timeZone } = load();
  const now = new Date().toLocaleString('en-IN', { timeZone, dateStyle: 'full', timeStyle: 'short' });
  const iso = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 16); // local wall time, for the model to do date maths
  const people = team().filter((u) => u.id !== user.id).map((u) => `${u.name} (${u.login})`).join(', ') || 'nobody yet';
  return `You are the Limelight Office Agent, working for ${user.name}${user.title ? `, ${user.title}` : ''} at Limelight.
You act for them through tools on Limelight Mail, Limelight Calendar (with video meeting rooms), and Document (Word), Grid (Excel) and Deck (PowerPoint) files.
Team members: ${people}.
Now: ${now} (${iso}+05:30, ${timeZone}). Always give times with +05:30. Files are saved in ${filesDir()}.
Rules:
- Use tools to find facts; never invent mails, events, names or numbers.
- Only fill in what the user gave: no made-up guests, email addresses or locations. Guests must be team members the user named. Meetings are 1 hour unless told.
- Sending mail and adding/deleting events go to the user for approval: just call the tool, then say it is waiting for Approve. Files you make are done at once.
- Write documents fully (real headings and content), not outlines, unless asked.
- Government / brand names, designations and Hindi spellings must be exact.
- Reply in the user's language and script: Hinglish in Roman letters gets Roman Hinglish, Hindi in Devanagari gets Devanagari. Short and clear.`;
}

const pending = new Map(); // id -> { name, args, user, at }

export async function chat(messages, user) {
  const llm = await llmStatus();
  if (!llm.online) throw new Error('AI model is offline. Start the Limelight AI engine on this PC (tools\\llama), or set the address in Setup.');
  const convo = [{ role: 'system', content: systemPrompt(user) }, ...messages.map(({ role, content }) => ({ role, content }))];
  const steps = [], actions = [];
  for (let turn = 0; turn < 8; turn++) {
    const r = await fetch(`${llm.url}/v1/chat/completions`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(240e3),
      body: JSON.stringify({ model: llm.model, messages: convo, tools: TOOLS, stream: false, temperature: 0.3,
        chat_template_kwargs: { enable_thinking: false } }),
    });
    if (!r.ok) throw new Error(`AI server error ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const msg = (await r.json()).choices?.[0]?.message || {};
    convo.push({ role: 'assistant', content: msg.content || '', ...(msg.tool_calls?.length ? { tool_calls: msg.tool_calls } : {}) });
    const calls = msg.tool_calls || [];
    if (!calls.length) {
      let reply = (msg.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      // the model often words a pending action as done; the card below is what counts
      if (actions.length) reply += `\n\n⏳ ${actions.length > 1 ? `${actions.length} actions are` : 'This is'} waiting for your **Approve** below — nothing has been sent or added yet.`;
      return { reply, steps, actions, model: llm.model };
    }
    for (const c of calls) {
      const name = c.function?.name, args = typeof c.function?.arguments === 'string' ? safeJson(c.function.arguments) : c.function?.arguments || {};
      let out;
      if (CONFIRM.has(name)) {
        groundArgs(name, args, convo);
        const id = crypto.randomBytes(8).toString('hex');
        pending.set(id, { name, args, user: user.id, at: Date.now() });
        actions.push({ id, tool: name, args, summary: describe(name, args) });
        out = { status: 'NOT DONE YET - shown to the user with an Approve button. Tell them to press Approve.' };
      } else {
        try { out = await exec(name, args, user); steps.push({ tool: name, summary: describe(name, args), ok: true, file: out?.file, pdf: out?.pdf }); }
        catch (e) { out = { error: e.message }; steps.push({ tool: name, summary: describe(name, args), ok: false, error: e.message }); }
      }
      convo.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(out).slice(0, 7000) });
    }
  }
  return { reply: 'I stopped after several steps. Tell me what to do next.', steps, actions, model: llm.model };
}
const safeJson = (s) => { try { return JSON.parse(s); } catch { return {}; } };

// small models fill empty fields with made-up guests, places and addresses: keep only what the user (or a mail /
// event the tools read) actually mentioned
function groundArgs(name, a, convo) {
  const said = convo.filter((m) => m.role === 'user').map((m) => m.content || '').join('\n').toLowerCase();
  const seen = convo.filter((m) => m.role === 'user' || m.role === 'tool').map((m) => m.content || '').join('\n').toLowerCase();
  const known = (x) => x && seen.includes(String(x).trim().toLowerCase());
  if (name === 'create_event') {
    a.guests = (a.guests || []).filter((g) => person(g) && (known(g) || said.includes(person(g).name.toLowerCase().split(' ')[0])));
    if (a.location && !said.includes(String(a.location).toLowerCase().split(/[ ,]/)[0])) delete a.location;
    if (a.video && !/\bmeet|video|online|call|link|vc\b/.test(said)) a.video = false;
  }
  if (name === 'send_email') {
    for (const k of ['to', 'cc']) if (a[k]) a[k] = String(a[k]).split(',').map((s) => s.trim()).filter((e) => (person(e) && said.includes(e.toLowerCase().split(' ')[0])) || known(e.match(/<([^>]+)>/)?.[1] || e)).join(', ');
  }
}

export async function approve(id, edits, user) {
  const p = pending.get(id);
  if (!p || p.user !== user.id) throw new Error('This action has expired. Ask again.');
  pending.delete(id);
  const args = { ...p.args, ...(edits || {}) };
  if (p.name === 'create_event' && typeof args.guests === 'string') args.guests = args.guests.split(',').map((s) => s.trim()).filter(Boolean);
  const result = await exec(p.name, args, user);
  return { done: describe(p.name, args), result };
}
export const reject = (id) => pending.delete(id);

// ---------- Chatbot and AI Assistance: plain model calls, no tools ----------
async function plain(messages, { temperature = 0.6 } = {}) {
  const llm = await llmStatus();
  if (!llm.online) throw new Error('AI model is offline. Start the Limelight AI engine on this PC (tools\\llama), or set the address in Setup.');
  const r = await fetch(`${llm.url}/v1/chat/completions`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(240e3),
    body: JSON.stringify({ model: llm.model, messages, stream: false, temperature, chat_template_kwargs: { enable_thinking: false } }),
  });
  if (!r.ok) throw new Error(`AI server error ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const msg = (await r.json()).choices?.[0]?.message || {};
  return { reply: (msg.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim(), model: llm.model };
}

export function chatbot(messages) {
  const { timeZone } = load();
  const now = new Date().toLocaleString('en-IN', { timeZone, dateStyle: 'full', timeStyle: 'short' });
  return plain([{ role: 'system', content: `You are Limelight AI, a friendly, sharp assistant for a government-communication and events agency in India (Limelight). Now: ${now}. Answer clearly with markdown when useful. Reply in the user's language and script (Roman Hinglish stays Roman). You cannot see their mail or files here; for that they use the Agent page.` },
    ...messages.map(({ role, content }) => ({ role, content }))]);
}

// one-shot writing helpers for the AI Assistance page
export const ASSIST = {
  summarize: ['Summarise', 'Summarise this in 5-8 crisp bullet points, most important first. Keep names and numbers exact.'],
  rewrite: ['Rewrite (professional)', 'Rewrite this in a clear, professional tone. Keep the meaning, names and numbers exactly.'],
  simplify: ['Make it simple', 'Rewrite this in very simple, short sentences anyone can follow.'],
  grammar: ['Fix grammar', 'Correct the grammar, spelling and punctuation only. Return just the corrected text.'],
  hindi: ['Translate to Hindi', 'Translate this into natural, correct Hindi (Devanagari). Keep proper nouns, scheme names and numbers right. Return only the translation.'],
  english: ['Translate to English', 'Translate this into natural Indian English. Return only the translation.'],
  reply: ['Draft email reply', 'Write a polite, to-the-point email reply to this message. Return only the email body.'],
  email: ['Turn into email', 'Turn these notes into a well-written email (subject line first as "Subject: ..."). Return only the email.'],
  bullets: ['Make bullet points', 'Turn this into a clean, structured bullet list with short headings where useful.'],
  caption: ['Social caption', 'Write 3 short social media captions (Instagram/X) for this, with 3-5 relevant hashtags each. Government-communication tone, no emojis overload.'],
  press: ['Press release', 'Write a crisp press release from this: headline, dateline, 3-4 paragraphs, a quote placeholder, and boilerplate placeholder. Keep facts exactly as given; mark unknowns as [ ].'],
  minutes: ['Meeting minutes', 'Turn these notes into meeting minutes: attendees (if given), key points, decisions, action items with owner and date (use [ ] when unknown).'],
};
export function assist({ tool, text, extra = '' }) {
  const t = ASSIST[tool];
  if (!t) throw new Error('unknown helper');
  if (!text?.trim()) throw new Error('Paste some text first');
  return plain([{ role: 'system', content: `${t[1]} Do not add commentary before or after.${extra ? ` Extra instruction from the user: ${extra}` : ''}` }, { role: 'user', content: text }], { temperature: 0.4 });
}
