// Lighthouse - search in the top tray (Spotlight-style), on every page. Finds apps, Office pages, chats, people and designs as you type;
// nothing is shown until something is typed. Ctrl+K / Cmd+K focuses it from anywhere.
// Uses the helpers and data from workspace.js / chats.js ($, $$, api, esc, icon, show, openApp, openOffice, ...).
let SEARCH_SEL = 0, SEARCH_HITS = [], DESIGNS = null;

function searchIndex() {
  const items = [];
  for (const a of APPS.filter((x) => !x.part)) items.push({ kind: 'App', title: a.name, icon: APP_META[a.id]?.icon || 'ai', go: () => openApp(a.id) });
  items.push({ kind: 'App', title: 'Chats', icon: 'chat', go: () => show('chats') });
  items.push({ kind: 'App', title: 'Library', icon: 'image', go: () => show('library') });
  items.push({ kind: 'Create', title: 'AI Image', icon: 'image', go: () => { show('create'); setCreateTab('image'); } });
  items.push({ kind: 'Create', title: 'AI Video', icon: 'video', go: () => { show('create'); setCreateTab('video'); } });
  for (const [k, l, ic, , , adminOnly] of OFFICE_ITEMS) if (!adminOnly || ME?.admin) items.push({ kind: 'Office', title: l, icon: ic, go: () => openOffice(k) });
  for (const c of (typeof CHATS !== 'undefined' ? CHATS : [])) items.push({ kind: c.type === 'group' ? 'Group' : 'Chat', title: titleOf(c), icon: c.type === 'group' ? 'group' : 'chat',
    go: () => { show('chats'); openChat(c.id); } });
  const chatWith = new Set((typeof CHATS !== 'undefined' ? CHATS : []).filter((c) => c.type === 'direct').map(other));
  for (const p of Object.values(window.PEOPLE || {})) if (p.email !== ME?.email && !chatWith.has(p.email))
    items.push({ kind: 'Person', title: p.name, sub: p.dept || p.email, icon: 'people',
      go: async () => { const c = await api('/api/chat/direct', { email: p.email }); await loadChats(); show('chats'); openChat(c.id); } });
  for (const d of DESIGNS || []) items.push({ kind: 'Design', title: d.name, icon: 'design', go: () => openApp('design', '#' + d.id) });
  return items;
}
function runSearch() {
  const q = $('#spotIn').value.trim().toLowerCase();
  $('#spot').classList.toggle('open', !!q);
  if (!q) { $('#spotRes').classList.add('hidden'); SEARCH_HITS = []; return; }
  const score = (t) => { t = t.toLowerCase(); return t.startsWith(q) ? 0 : t.split(/[\s/·-]+/).some((w) => w.startsWith(q)) ? 1 : t.includes(q) ? 2 : 9; };
  const hits = searchIndex().map((it) => ({ ...it, s: Math.min(score(it.title), it.sub ? score(it.sub) + 1 : 9) })).filter((it) => it.s < 9)
    .sort((a, b) => a.s - b.s || a.title.localeCompare(b.title)).slice(0, 8);
  const raw = $('#spotIn').value.trim();
  hits.push({ kind: 'AI', title: `Make an image with AI: “${raw}”`, icon: 'spark', go: () => aiCreate('image', raw) });
  hits.push({ kind: 'AI', title: `Make a video with AI: “${raw}”`, icon: 'video', go: () => aiCreate('video', raw) });
  SEARCH_HITS = hits; SEARCH_SEL = 0; drawHits();
}
function drawHits() {
  $('#spotRes').innerHTML = SEARCH_HITS.map((h, i) => `<button class="${i === SEARCH_SEL ? 'sel' : ''}" data-hit="${i}">
    <i class="${h.kind === 'AI' ? 'ai' : ''}">${icon(h.icon)}</i><span class="t">${esc(h.title)}${h.sub ? `<small>${esc(h.sub)}</small>` : ''}</span><em>${h.kind}</em></button>`).join('');
  $('#spotRes').classList.remove('hidden');
  $('#spotRes .sel')?.scrollIntoView({ block: 'nearest' });
}
function pickHit(i) {
  const h = SEARCH_HITS[i]; if (!h) return;
  $('#spotIn').value = ''; runSearch(); $('#spotIn').blur();
  h.go();
}
function aiCreate(kind, text) {
  show('create'); setCreateTab(kind);
  $(kind === 'image' ? '#imgPrompt' : '#vidPrompt').value = text;
  $(kind === 'image' ? '#imgForm' : '#vidForm').requestSubmit();
}

$('#spotIn').addEventListener('input', runSearch);
$('#spotIn').addEventListener('focus', () => { if (!DESIGNS) api('/api/projects').then((l) => { DESIGNS = l; if ($('#spotIn').value) runSearch(); }).catch(() => { DESIGNS = []; }); });
$('#spotIn').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (!SEARCH_HITS.length) return;
    SEARCH_SEL = (SEARCH_SEL + (e.key === 'ArrowDown' ? 1 : -1) + SEARCH_HITS.length) % SEARCH_HITS.length; drawHits();
  }
  if (e.key === 'Enter') { e.preventDefault(); pickHit(SEARCH_SEL); }
  if (e.key === 'Escape') { $('#spotIn').value = ''; runSearch(); $('#spotIn').blur(); }
});
$('#spotRes').addEventListener('mousedown', (e) => { const b = e.target.closest('[data-hit]'); if (b) { e.preventDefault(); pickHit(+b.dataset.hit); } });
$('#spotIn').addEventListener('blur', () => setTimeout(() => { $('#spotRes').classList.add('hidden'); $('#spot').classList.remove('open'); }, 120));
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#spotIn').focus(); $('#spotIn').select(); }
});
