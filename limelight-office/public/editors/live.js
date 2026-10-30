// live.js - editing a file together. Everyone with the same Document / Grid / Deck open sees the others' changes as
// they make them, who is here (faces in the title bar) and where each one is (a coloured cursor, cell or slide).
// The file's room lives on the live stream (/api/co/*, engine/live.mjs). Each editor hands over an adapter:
//   file()          the saved file's path (a new file gets a room once it is saved)
//   units()         the content as { key: string } pieces - a paragraph, a cell, a slide - so only changed pieces travel
//   apply(u, full)  put the others' pieces in ({ key: string | null }); full = a whole copy (drop what is not in it)
//   cursor()        where I am (small JSON);  drawPeers(peers) shows where the others are
//   busy()          true while others' changes must wait (typing in a slide's text box)
//   saved(file)     someone else saved the file
// Two people typing in the same paragraph (cell, slide) at the same moment: the later change wins for that piece.
import { $, $$, esc, ic, toast, fail, POST, setDirty } from './shell.js';
const L = window.LLO;

const COLORS = ['#ff6b6b', '#4f8cff', '#3ddc84', '#b48cff', '#ff9f43', '#22c3c3', '#ff7ab3', '#ffc21a'];
export const colorOf = (p) => p.color || COLORS[[...(p.userId || p.name || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];
const initials = (n = '') => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

// a see-through layer over an editor's scrolling area, for the others' cursors; box(rect) turns a screen rect into
// the layer's own coordinates
export function layer(host) {
  let el = host.querySelector(':scope > .co-layer');
  if (!el) { if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; el = document.createElement('div'); el.className = 'co-layer'; host.append(el); }
  el.innerHTML = '';
  const o = host.getBoundingClientRect();
  const box = (r) => ({ left: r.left - o.left + host.scrollLeft - host.clientLeft, top: r.top - o.top + host.scrollTop - host.clientTop, width: r.width, height: r.height });
  const add = (cls, r, p, label) => {
    const b = box(r), d = document.createElement('div'); d.className = cls;
    Object.assign(d.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` }); d.style.setProperty('--co', colorOf(p));
    if (label) d.innerHTML = `<span class="co-tag">${esc(p.name.split(' ')[0])}</span>`;
    el.append(d); return d;
  };
  return { el, box, add };
}

export function live(parts, ad) {
  const cid = L.cid;
  let room = null, joining = false, retryAt = 0, last = {}, peers = new Map(), inbox = [], timer = 0, sentCur = '', applying = false, stopped = false;

  // ---------- the title bar: who is here, and Share ----------
  const bar = document.createElement('span'); bar.className = 'co-bar';
  bar.innerHTML = `<span class="co-faces" id="co-faces"></span><button class="btn sm" id="co-share" title="Share this file with teammates to edit it together">${ic('people')}Share</button>`;
  parts.extra.before(bar);
  function drawFaces() {
    const me = L.me() || {}, list = [{ cid, name: me.name || 'You', color: me.color, userId: me.id, you: true }, ...peers.values()];
    $('#co-faces').innerHTML = list.length > 1 ? list.map((p) => `<i style="--co:${colorOf(p)}" title="${esc(p.you ? `${p.name} (you)` : `${p.name} is editing`)}">${esc(initials(p.name))}</i>`).join('')
      + `<small>${list.length} editing</small>` : '';
  }
  $('#co-share').onclick = share;

  // ---------- sending ----------
  const post = (data, to) => POST('/api/co/send', { cid, room, to, data }).catch(() => { room = null; }); // room lost (server restarted): join again
  function diff() {
    const u = ad.units(), ch = {}; let n = 0;
    for (const k in u) if (last[k] !== u[k]) { ch[k] = u[k]; n++; }
    for (const k in last) if (!(k in u)) { ch[k] = null; n++; }
    last = u;
    return n ? ch : null;
  }
  function flush() { clearTimeout(timer); if (!room) return; const ch = diff(); if (ch) post({ t: 'ch', u: ch }); }
  parts.onEdit = () => { if (applying || !room) return; clearTimeout(timer); timer = setTimeout(flush, 120); };
  parts.onClean = () => { if (!applying && room && ad.file()) post({ t: 'saved', file: ad.file(), name: (L.me() || {}).name }); };
  function sendCur(force, to) {
    const c = JSON.stringify(ad.cursor() ?? null);
    if (!force && c === sentCur) return;
    sentCur = c; if (room) post({ t: 'cur', cur: JSON.parse(c) }, to);
  }

  // ---------- receiving ----------
  function onCo(e) {
    const m = e.detail;
    if (stopped || !room || m.room !== room) return;
    if (m.t === 'join') { peers.set(m.from, { cid: m.from, userId: m.userId, name: m.name, color: m.color }); drawFaces(); toast(`${m.name} opened this file`); return sendCur(true, m.from); }
    if (m.t === 'leave') { peers.delete(m.from); drawFaces(); return draw(); }
    if (m.t === 'cur') { const p = peers.get(m.from); if (p) { p.cur = m.cur; draw(); } return; }
    if (m.t === 'want') { flush(); return post({ t: 'full', u: ad.units(), dirty: !!window.__lloDirty }, m.from); }
    if (m.t === 'saved') { applying = true; ad.saved?.(m.file); setDirty(parts, false); applying = false; return toast(`${m.name || 'Someone'} saved the file`); }
    if (m.t === 'ch' || m.t === 'full') { inbox.push(m); drain(); }
  }
  function drain() {
    if (!inbox.length || ad.busy?.()) return;
    flush(); // my own unsent change goes first, so it is not lost under theirs
    applying = true;
    try { for (const m of inbox.splice(0)) { ad.apply(m.u, m.t === 'full'); if (m.t === 'ch' || m.dirty) setDirty(parts, true); } }
    catch (e) { console.error(e); }
    applying = false;
    last = ad.units();
    draw();
  }
  function draw(again = true) { try { ad.drawPeers([...peers.values()].filter((p) => p.cur)); } catch (e) { console.error(e); } if (again) setTimeout(() => draw(false), 150); } // (again: after the editor redraws its thumbnails)

  // ---------- joining the file's room (again after a server restart) ----------
  async function join() {
    const f = ad.file();
    if (!f || joining || Date.now() < retryAt) return;
    joining = true;
    try {
      const r = await POST('/api/co/join', { cid, path: f });
      room = r.room; peers = new Map(r.peers.map((p) => [p.cid, p])); last = ad.units(); sentCur = '';
      drawFaces(); sendCur(true);
    } catch { retryAt = Date.now() + 4000; } // live connection not up yet: try again shortly
    joining = false;
  }
  function stop() {
    stopped = true; clearInterval(tick); window.removeEventListener('llo-co', onCo);
    if (room) fetch('/api/co/leave', { method: 'POST', headers: { 'x-llo': '1', 'content-type': 'application/json' }, body: JSON.stringify({ cid, room }), keepalive: true }).catch(() => {});
  }
  window.addEventListener('llo-co', onCo);
  let n = 0;
  const tick = setInterval(() => {
    if (!parts.root.isConnected) return stop(); // left the editor
    if (!room) return join();
    drain(); sendCur();
    if (++n % 4 === 0 && peers.size) draw(); // keep the others' cursors in place after scrolling / zooming
  }, 250);
  window.addEventListener('pagehide', stop, { once: true });
  join();

  // ---------- Share: the file opens for the chosen teammates, signed in as themselves ----------
  async function share() {
    const f = ad.file(); if (!f) return toast('Save the file once, then share it', true);
    let users = [];
    try { users = (await L.GET('/api/team')).users.filter((u) => u.id !== (L.me() || {}).id && u.active !== 0); } catch (e) { return fail(e); }
    const m = L.modal(`<h2>${ic('people')} Edit together</h2><p class="muted" style="margin-top:-8px">The people you pick get a notification with a link. Everyone who has the file open sees each other's changes live.</p>
      <input class="input" id="co-q" placeholder="Search people" style="margin-bottom:10px"><div class="list co-people">${users.map((u) => `<label class="item"><input type="checkbox" value="${esc(u.id)}">${L.avatar(u)}<div class="main"><div class="t">${esc(u.name)}</div><div class="s">${esc(u.title || u.login || '')}</div></div></label>`).join('') || '<div class="empty">No teammates yet</div>'}</div>
      <div class="foot"><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="co-go">${ic('send')}Share</button></div>`);
    $('#co-q', m).oninput = (e) => { const q = e.target.value.toLowerCase(); $$('.co-people .item', m).forEach((it) => { it.hidden = !it.textContent.toLowerCase().includes(q); }); };
    $('#co-go', m).onclick = async () => {
      const ids = $$('.co-people input:checked', m).map((i) => i.value); if (!ids.length) return toast('Pick someone first', true);
      try { await POST('/api/share', { path: f, users: ids }); L.closeModal(); toast(`Shared with ${ids.length} ${ids.length > 1 ? 'people' : 'person'}`); } catch (e) { fail(e); }
    };
  }
  return { stop };
}
