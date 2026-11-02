// Lighthouse (Limelight's workspace) - Chats: 1-to-1 and groups, photos/files, replies, read ticks, typing, online status (live via SSE).
// Uses the helpers from workspace.js ($, $$, api, esc, icon, toast, timeAgo, ME).
let CHATS = [], ACTIVE = null, MSGS = [], REPLY = null;
const PEOPLE = window.PEOPLE = {};
const TYPING = {}; // chatId -> { email: until }
const COLORS = ['#ffc21a', '#ff8a3d', '#5b8cff', '#3ddc84', '#c084fc', '#2dd4bf', '#f472b6', '#facc15'];
const colorOf = (s) => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const nameOf = (email) => PEOPLE[email]?.name || (email || '').split('@')[0];
const initials = (n) => String(n).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const other = (c) => c.members.find((e) => e !== ME?.email) || ME?.email;
const titleOf = (c) => (c.type === 'group' ? c.name : nameOf(other(c)));
const avatar = (c, cls = '') => { const t = titleOf(c), on = c.type === 'direct' && PEOPLE[other(c)]?.online;
  return `<div class="cav ${cls}" style="background:${colorOf(c.type === 'group' ? c.id : other(c))}">${c.type === 'group' ? icon('group') : esc(initials(t)) + pic(other(c))}${on ? '<i class="on-dot"></i>' : ''}</div>`; };
// a person's photo (Profile), over their initials
const pic = (email) => (PEOPLE[email]?.photo ? `<img class="cpic" src="/api/photo/${encodeURIComponent(email)}" alt="">` : '');
const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

// ---------- people + list ----------
async function loadPeople() { for (const p of await api('/api/chat/people')) PEOPLE[p.email] = p; }
async function loadChats() { CHATS = await api('/api/chat/list'); renderList(); }
function renderList() {
  const q = $('#chatSearch').value.trim().toLowerCase(), f = $('#chatTabs .on').dataset.f;
  const list = CHATS.filter((c) => (f === 'unread' ? c.unread : f === 'group' ? c.type === 'group' : true) && (!q || titleOf(c).toLowerCase().includes(q)));
  $('#chatItems').innerHTML = list.length ? list.map((c) => {
    const typing = Object.keys(TYPING[c.id] || {}).filter((e) => TYPING[c.id][e] > Date.now());
    const last = c.last ? (c.last.deleted ? '🚫 Message deleted' : `${c.type === 'group' && c.last.from ? (c.last.from === ME.email ? 'You' : nameOf(c.last.from).split(' ')[0]) + ': ' : ''}${c.last.text || (c.last.file ? '📎 ' + c.last.file : '')}`) : (c.type === 'group' ? 'Group created' : 'New chat');
    return `<div class="citem ${c.id === ACTIVE?.id ? 'on' : ''} ${c.unread ? 'has-unread' : ''}" data-cid="${c.id}">${avatar(c)}
      <div class="cmeta"><div class="r1"><b>${esc(titleOf(c))}</b><time>${c.last ? timeAgo(c.last.at) : ''}</time></div>
      <div class="r2">${typing.length ? `<span class="typing">${c.type === 'group' ? esc(nameOf(typing[0]).split(' ')[0]) + ' ' : ''}typing…</span>` : `<span>${esc(last)}</span>`}${c.unread ? `<span class="unread">${c.unread}</span>` : ''}</div></div></div>`;
  }).join('') : `<div class="none" style="padding:20px;text-align:center">${q || f !== 'all' ? 'Nothing found' : 'No chats yet.<br>Start one with <b>+</b> above.'}</div>`;
  const total = CHATS.reduce((a, c) => a + c.unread, 0);
  $('#chatBadge').textContent = total; $('#chatBadge').classList.toggle('hidden', !total);
  document.title = total ? `(${total}) Limelight` : 'Limelight';
}
$('#chatItems').addEventListener('click', (e) => { const it = e.target.closest('[data-cid]'); if (it) openChat(it.dataset.cid); });
$('#chatSearch').addEventListener('input', renderList);
$('#chatTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#chatTabs button').forEach((x) => x.classList.toggle('on', x === b)); renderList(); });

// ---------- conversation ----------
async function openChat(cid) {
  if (!CHATS.length) await loadChats();
  const c = CHATS.find((x) => x.id === cid); if (!c) return;
  ACTIVE = c; REPLY = null; $('#replyBar').classList.add('hidden'); $('#info').classList.add('hidden');
  ['#convHead', '#msgs', '#composer'].forEach((s) => $(s).classList.remove('hidden')); $('#convEmpty').classList.add('hidden');
  $('#chatwrap').classList.add('open');
  renderHead();
  MSGS = await api(`/api/chat/${cid}/messages`);
  renderMsgs(true);
  markRead();
  renderList();
  $('#msgIn').focus();
}
window.openChat = openChat;
function renderHead() {
  const c = ACTIVE; if (!c) return;
  $('#convAv').outerHTML = avatar(c).replace('class="cav ', 'id="convAv" class="cav ');
  $('#convName').textContent = titleOf(c);
  const typing = Object.keys(TYPING[c.id] || {}).filter((e) => TYPING[c.id][e] > Date.now());
  let sub;
  if (typing.length) sub = (c.type === 'group' ? nameOf(typing[0]).split(' ')[0] + ' ' : '') + 'typing…';
  else if (c.type === 'group') sub = c.members.map((e) => (e === ME.email ? 'You' : nameOf(e).split(' ')[0])).join(', ');
  else { const p = PEOPLE[other(c)]; sub = p?.online ? 'online' : p?.dept || other(c); }
  $('#convSub').textContent = sub;
  $('#convSub').style.color = typing.length || sub === 'online' ? 'var(--acc)' : '';
}
function tick(m) {
  if (m.from !== ME.email) return '';
  const others = ACTIVE.members.filter((e) => e !== ME.email);
  const all = others.length && others.every((e) => m.readBy.includes(e));
  return `<span class="tick ${all ? 'read' : ''}">${all || m.readBy.length > 1 ? '✓✓' : '✓'}</span>`;
}
function msgHtml(m, prev) {
  if (m.system) return `<div class="sys">${esc(m.text)}</div>`;
  const mine = m.from === ME.email, first = !prev || prev.system || prev.from !== m.from || m.at - prev.at > 5 * 60000;
  const time = new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let body = '';
  if (m.deleted) body = `<span class="del">🚫 ${mine ? 'You deleted this message' : 'This message was deleted'}</span>`;
  else {
    if (m.reply) body += `<span class="quote" data-jump="${m.reply.id}"><b>${m.reply.from === ME.email ? 'You' : esc(nameOf(m.reply.from))}</b>${esc(m.reply.text) || '📎'}</span>`;
    if (m.file) body += /^image\//.test(m.file.type) ? `<img class="ph" src="${m.file.url}" data-img="${m.file.url}" alt="">`
      : `<a class="file" href="${m.file.url}" download="${esc(m.file.name)}">${icon('file')}<span><b>${esc(m.file.name)}</b><small>${fmtSize(m.file.size)}</small></span></a>`;
    if (m.share) body += shareCard(m.share);
    if (m.text) body += `<span class="tx">${esc(m.text)}</span>`;
    if (m.forwarded) body = `<span class="fwd">${icon('fwd')}Forwarded</span>` + body;
  }
  return `<div class="m ${mine ? 'me' : ''} ${first ? 'gap ' + (mine ? 'tail-me' : 'tail-them') : ''}" data-mid="${m.id}">${first && !mine && ACTIVE.type === 'group' ? `<span class="who" style="color:${colorOf(m.from)}">${esc(nameOf(m.from))}</span>` : ''}${body}<span class="meta">${time}${m.deleted ? '' : tick(m)}</span>${m.deleted ? '' : `<span class="acts"><button data-act="reply" title="Reply">${icon('reply')}</button><button data-act="fwd" title="Forward">${icon('fwd')}</button>${mine ? `<button data-act="del" title="Delete">${icon('trash')}</button>` : ''}</span>`}</div>`;
}
function dayLabel(t) { const d = new Date(t), n = new Date(), y = new Date(Date.now() - 864e5);
  return d.toDateString() === n.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' }); }
function renderMsgs(toBottom) {
  const box = $('#msgs'), near = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  let html = '', lastDay = '';
  MSGS.forEach((m, i) => { const d = dayLabel(m.at); if (d !== lastDay) { html += `<div class="day">${d}</div>`; lastDay = d; } html += msgHtml(m, MSGS[i - 1]); });
  box.innerHTML = html || '<div class="sys">Send the first message 👋</div>';
  if (toBottom || near) box.scrollTop = box.scrollHeight;
}
function markRead() {
  if (!ACTIVE || CURRENT !== 'chats' || document.hidden) return;
  const c = CHATS.find((x) => x.id === ACTIVE.id);
  if (MSGS.some((m) => !m.readBy?.includes(ME.email))) api(`/api/chat/${ACTIVE.id}/read`, {}).catch(() => {});
  if (c && c.unread) { c.unread = 0; renderList(); }
}
document.addEventListener('visibilitychange', markRead);
window.onViewShown = (v) => { if (v === 'chats') { loadChats(); markRead(); } };

$('#msgs').addEventListener('click', async (e) => {
  const j = e.target.closest('[data-jump]');
  if (j) { const el = $(`[data-mid="${j.dataset.jump}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1300); } return; }
  const sc = e.target.closest('[data-share-app]'); if (sc) return openShared(sc.dataset.shareApp, sc.dataset.sharePath);
  const b = e.target.closest('[data-act]'); if (!b) return;
  const m = MSGS.find((x) => x.id === b.closest('[data-mid]').dataset.mid);
  if (b.dataset.act === 'fwd') return openShare({ forward: { chat: ACTIVE.id, msg: m.id, what: m.share?.title || m.file?.name || (m.text || '').slice(0, 60) } });
  if (b.dataset.act === 'reply') {
    REPLY = m; $('#replyText').innerHTML = `<b>${m.from === ME.email ? 'You' : esc(nameOf(m.from))}</b> · ${esc(m.text || m.file?.name || '')}`;
    $('#replyBar').classList.remove('hidden'); $('#msgIn').focus();
  }
  if (b.dataset.act === 'del' && confirm('Delete this message for everyone?')) await api(`/api/chat/${ACTIVE.id}/messages/${m.id}`, null, 'DELETE').catch((err) => toast(err.message));
});
$('#replyX').onclick = () => { REPLY = null; $('#replyBar').classList.add('hidden'); };
$('#convBack').onclick = (e) => { e.stopPropagation(); $('#chatwrap').classList.remove('open'); ACTIVE = null; renderList(); };

// ---------- sending ----------
async function sendMsg(body) {
  if (!ACTIVE) return;
  if (REPLY) { body.reply = REPLY.id; REPLY = null; $('#replyBar').classList.add('hidden'); }
  try { await api(`/api/chat/${ACTIVE.id}/messages`, body); } catch (err) { toast('Not sent: ' + err.message); }
}
$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('#msgIn').value; if (!text.trim()) return;
  $('#msgIn').value = ''; growInput(); sendMsg({ text });
});
function growInput() { const t = $('#msgIn'); t.style.height = 'auto'; t.style.height = Math.min(140, t.scrollHeight) + 'px'; }
let lastTyping = 0;
$('#msgIn').addEventListener('input', () => {
  growInput();
  if (ACTIVE && Date.now() - lastTyping > 2500) { lastTyping = Date.now(); api(`/api/chat/${ACTIVE.id}/typing`, {}).catch(() => {}); }
});
$('#msgIn').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#composer').requestSubmit(); } });
async function sendFiles(files) {
  for (const f of files) {
    if (f.size > 35 * 1048576) { toast(`${f.name} is too large (35 MB max)`); continue; }
    const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
    const text = $('#msgIn').value.trim(); $('#msgIn').value = ''; growInput();
    toast(`Sending: ${f.name}`);
    await sendMsg({ text, file: { name: f.name || 'photo.png', data } });
  }
}
$('#fileIn').addEventListener('change', (e) => { sendFiles([...e.target.files]); e.target.value = ''; });
$('#msgIn').addEventListener('paste', (e) => { const fs = [...e.clipboardData.files]; if (fs.length) { e.preventDefault(); sendFiles(fs); } });
const conv = $('#conv');
conv.addEventListener('dragover', (e) => { if (ACTIVE && e.dataTransfer.types.includes('Files')) { e.preventDefault(); $('#dropzone').classList.remove('hidden'); } });
$('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.add('hidden'));
$('#dropzone').addEventListener('drop', (e) => { e.preventDefault(); $('#dropzone').classList.add('hidden'); sendFiles([...e.dataTransfer.files]); });

// ---------- live events ----------
function connect() {
  const es = new EventSource('/api/chat/stream');
  es.onmessage = (e) => {
    const ev = JSON.parse(e.data);
    if (ev.type === 'hello') { for (const p of Object.values(PEOPLE)) p.online = ev.online.includes(p.email); renderList(); renderHead(); }
    if (ev.type === 'presence') { (PEOPLE[ev.email] ||= { email: ev.email, name: ev.email.split('@')[0] }).online = ev.online; renderList(); renderHead(); }
    if (ev.type === 'message') {
      const c = CHATS.find((x) => x.id === ev.chat);
      if (!c) return loadChats();
      c.last = { from: ev.msg.from, text: ev.msg.text, file: ev.msg.file?.name, at: ev.msg.at };
      if (TYPING[c.id]) delete TYPING[c.id][ev.msg.from];
      const viewing = ACTIVE?.id === c.id && CURRENT === 'chats' && !document.hidden;
      if (ev.msg.from && ev.msg.from !== ME.email && !viewing) {
        c.unread++;
        if (document.hidden && window.Notification?.permission === 'granted') new Notification(titleOf(c), { body: ev.msg.text || '📎 ' + (ev.msg.file?.name || ''), icon: 'img/favicon.png' });
      }
      CHATS.sort((a, b) => (b.last?.at || b.created) - (a.last?.at || a.created));
      if (ACTIVE?.id === c.id) { MSGS.push(ev.msg); renderMsgs(ev.msg.from === ME.email); markRead(); renderHead(); }
      renderList(); if (CURRENT === 'home') loadHome();
    }
    if (ev.type === 'read' && ACTIVE?.id === ev.chat) { for (const m of MSGS) if (!m.readBy.includes(ev.email)) m.readBy.push(ev.email); renderMsgs(); }
    if (ev.type === 'deleted' && ACTIVE?.id === ev.chat) { const m = MSGS.find((x) => x.id === ev.id); if (m) { m.deleted = true; m.text = ''; m.file = null; renderMsgs(); } }
    if (ev.type === 'typing') {
      (TYPING[ev.chat] ||= {})[ev.email] = Date.now() + 4000; renderList(); if (ACTIVE?.id === ev.chat) renderHead();
      setTimeout(() => { renderList(); if (ACTIVE?.id === ev.chat) renderHead(); }, 4100);
    }
    if (ev.type === 'chat') loadChats().then(() => {
      if (!ACTIVE) return;
      const c = CHATS.find((x) => x.id === ACTIVE.id);
      if (!c) { ACTIVE = null; $('#chatwrap').classList.remove('open'); ['#convHead', '#msgs', '#composer', '#info'].forEach((s) => $(s).classList.add('hidden')); $('#convEmpty').classList.remove('hidden'); return; }
      ACTIVE = c; renderHead(); if (!$('#info').classList.contains('hidden')) renderInfo();
    });
  };
  es.onerror = () => { es.close(); setTimeout(connect, 4000); };
}

// ---------- pick people: new chat / new group / add members ----------
let PICK = { mode: '', sel: new Set() };
function openPicker(mode) {
  PICK = { mode, sel: new Set() };
  $('#pickTitle').textContent = mode === 'chat' ? 'New chat' : mode === 'group' ? 'New group' : 'Add members';
  $('#groupName').classList.toggle('hidden', mode !== 'group'); $('#groupName').value = '';
  $('#pickFoot').classList.toggle('hidden', mode === 'chat');
  $('#pickGo').textContent = mode === 'group' ? 'Create group' : 'Add';
  $('#pickSearch').value = ''; renderPicker();
  $('#pickModal').classList.remove('hidden'); (mode === 'group' ? $('#groupName') : $('#pickSearch')).focus();
}
function renderPicker() {
  const q = $('#pickSearch').value.trim().toLowerCase();
  const skip = PICK.mode === 'add' ? new Set(ACTIVE.members) : new Set([ME.email]);
  const list = Object.values(PEOPLE).filter((p) => !skip.has(p.email) && (!q || p.name.toLowerCase().includes(q) || p.email.includes(q)))
    .sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  $('#plist').innerHTML = list.length ? list.map((p) => `<div class="prow ${PICK.sel.has(p.email) ? 'sel' : ''}" data-email="${esc(p.email)}">
    <div class="cav sm" style="background:${colorOf(p.email)}">${esc(initials(p.name))}${pic(p.email)}${p.online ? '<i class="on-dot"></i>' : ''}</div>
    <div><b>${esc(p.name)}</b><small>${esc(p.dept || p.email)}</small></div>${PICK.mode === 'chat' ? '' : `<span class="chk">${PICK.sel.has(p.email) ? '✓' : ''}</span>`}</div>`).join('')
    : '<div class="none" style="padding:12px">No one found. Team members need to sign in to Limelight once, or be added in Staff.</div>';
  $('#picked').innerHTML = [...PICK.sel].map((e) => `<span>${esc(nameOf(e))}</span>`).join('');
}
$('#pickSearch').addEventListener('input', renderPicker);
$('#plist').addEventListener('click', async (e) => {
  const r = e.target.closest('[data-email]'); if (!r) return;
  if (PICK.mode === 'chat') {
    $('#pickModal').classList.add('hidden');
    const c = await api('/api/chat/direct', { email: r.dataset.email });
    await loadChats(); openChat(c.id); return;
  }
  PICK.sel.has(r.dataset.email) ? PICK.sel.delete(r.dataset.email) : PICK.sel.add(r.dataset.email); renderPicker();
});
$('#pickGo').onclick = async () => {
  try {
    if (PICK.mode === 'group') {
      if (!$('#groupName').value.trim()) { $('#groupName').focus(); return toast('Enter a group name'); }
      const c = await api('/api/chat/group', { name: $('#groupName').value, members: [...PICK.sel] });
      $('#pickModal').classList.add('hidden'); await loadChats(); openChat(c.id);
    } else if (PICK.mode === 'add') {
      if (!PICK.sel.size) return;
      await api(`/api/chat/${ACTIVE.id}`, { add: [...PICK.sel] }, 'PATCH'); $('#pickModal').classList.add('hidden');
    }
  } catch (err) { toast(err.message); }
};
$('#pickClose').onclick = () => $('#pickModal').classList.add('hidden');
$('#pickModal').addEventListener('click', (e) => { if (e.target.id === 'pickModal') $('#pickModal').classList.add('hidden'); });
$('#newChatBtn').onclick = () => openPicker('chat');
$('#newGroupBtn').onclick = () => openPicker('group');

// ---------- info panel: profile / group settings ----------
$('#convHead').addEventListener('click', (e) => { if (!e.target.closest('.back')) { renderInfo(); $('#info').classList.remove('hidden'); } });
function renderInfo() {
  const c = ACTIVE; if (!c) return;
  const admin = c.type === 'group' && c.admins?.includes(ME.email);
  let body;
  if (c.type === 'direct') {
    const p = PEOPLE[other(c)] || { email: other(c), name: nameOf(other(c)) };
    body = `${avatar(c, 'big')}<h3>${esc(p.name)}</h3><div class="sub">${esc(p.email)}</div>
      ${p.dept ? `<h5>Department</h5><div>${esc(p.dept)}</div>` : ''}<h5>Status</h5><div>${p.online ? '🟢 online' : 'offline'}</div>`;
  } else {
    body = `${avatar(c, 'big')}
      ${admin ? `<input class="field" id="gName" value="${esc(c.name)}" maxlength="80" style="text-align:center;font-weight:700;font-size:17px">` : `<h3>${esc(c.name)}</h3>`}
      <div class="sub">Group · ${c.members.length} members</div>
      ${admin ? `<textarea class="field" id="gAbout" rows="2" placeholder="About this group">${esc(c.about || '')}</textarea><button class="btn sm" id="gSave" style="align-self:flex-start">Save</button>`
        : c.about ? `<div>${esc(c.about)}</div>` : ''}
      <h5>Members</h5>
      ${admin ? `<button class="btn sm" id="gAdd" style="align-self:flex-start">${icon('plus')} Add members</button>` : ''}
      ${c.members.map((e) => `<div class="mem"><div class="cav sm" style="background:${colorOf(e)}">${esc(initials(nameOf(e)))}</div>
        <div><b>${e === ME.email ? 'You' : esc(nameOf(e))}</b> ${c.admins.includes(e) ? '<span class="tag">admin</span>' : ''}<small>${esc(PEOPLE[e]?.dept || e)}</small></div>
        ${admin && e !== ME.email ? `${c.admins.includes(e) ? '' : `<button data-admin="${esc(e)}">Make admin</button>`}<button data-remove="${esc(e)}">Remove</button>` : ''}</div>`).join('')}
      <button class="btn danger" id="gLeave" style="margin-top:10px">Group chhodo</button>`;
  }
  $('#info').innerHTML = `<div class="info-h"><b>${c.type === 'group' ? 'Group info' : 'Contact info'}</b><button class="icon-btn" id="infoX" style="width:30px;height:30px">×</button></div><div class="info-b">${body}</div>`;
}
$('#info').addEventListener('click', async (e) => {
  const c = ACTIVE, t = e.target.closest('button'); if (!t) return;
  try {
    if (t.id === 'infoX') $('#info').classList.add('hidden');
    if (t.id === 'gSave') { await api(`/api/chat/${c.id}`, { name: $('#gName').value, about: $('#gAbout').value }, 'PATCH'); toast('Group updated'); }
    if (t.id === 'gAdd') openPicker('add');
    if (t.dataset.remove && confirm(`Remove ${nameOf(t.dataset.remove)} from the group?`)) await api(`/api/chat/${c.id}`, { remove: [t.dataset.remove] }, 'PATCH');
    if (t.dataset.admin) await api(`/api/chat/${c.id}`, { makeAdmin: [t.dataset.admin] }, 'PATCH');
    if (t.id === 'gLeave' && confirm('Leave this group?')) await api(`/api/chat/${c.id}`, { leave: true }, 'PATCH');
  } catch (err) { toast(err.message); }
});

// ---------- boot ----------
ready.then(async () => {
  await Promise.all([loadPeople().catch(() => {}), loadChats()]); // (side by side: one trip instead of two)
  renderList();
  connect();
  if (CURRENT === 'home') loadHome();
  if ('Notification' in window && Notification.permission === 'default') document.addEventListener('click', () => Notification.requestPermission(), { once: true });
});
