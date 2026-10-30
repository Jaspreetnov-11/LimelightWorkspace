// Create > AI Video (/api/ai/video): video requests are recorded until a text-to-video engine is installed.
// (AI images go to Studio - see design.mjs.)
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { DATA } from '../config.mjs';
import { NEXT, send, readJson } from '../core.mjs';

// Text-to-video is not installed yet: jobs are only recorded so the UI flow can be tried end to end.
const VIDEO_JOBS = path.join(DATA, 'video-requests.json');
async function videoRequest(b, user) {
  const list = fs.existsSync(VIDEO_JOBS) ? JSON.parse(await fsp.readFile(VIDEO_JOBS, 'utf8')) : [];
  const job = { id: Date.now().toString(36), prompt: String(b.prompt || '').slice(0, 2000), ratio: b.ratio, seconds: b.seconds,
    style: b.style, by: user.email, status: 'waiting-engine', created: Date.now() };
  list.unshift(job);
  await fsp.writeFile(VIDEO_JOBS, JSON.stringify(list.slice(0, 50), null, 2));
  return job;
}

export async function route(req, res, { u, p, user }) {
  if (p === '/api/ai/video' && req.method === 'GET')
    return send(res, 200, fs.existsSync(VIDEO_JOBS) ? JSON.parse(await fsp.readFile(VIDEO_JOBS, 'utf8')) : []);
  if (p === '/api/ai/video' && req.method === 'POST') return send(res, 200, await videoRequest(await readJson(req), user));
  return NEXT;
}
