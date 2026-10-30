// Lighthouse - Share, the same in every app: whatever is open in Edit, Design or Office (or a chat message) goes to
// anyone on the team - people or groups - as a card in Chats that opens it right here. An Edit project is also shared
// in Edit itself. Each app page in a frame tells us what is open in it (the proxy adds WHERE_JS to the page).
// Uses workspace.js ($, $$, api, esc, icon, toast, APPS, appUrl, openApp, openOffice, OFFICE_ITEMS) and chats.js
// (PEOPLE, CHATS, colorOf, initials, pic).
const SHARE_NAMES = { editor: 'Edit', design: 'Design', office: 'Office', lighthouse: 'Office', ai: 'AI' };
const SHARE_ICONS = { editor: 'editor', design: 'design', office: 'office', lighthouse: 'office', ai: 'ai' };

window.addEventListener('message', (e) => {
  if (!e.data) return;
  // Edit's Open in Premiere / DaVinci (limelight://nle/...), from Edit or one of its project tabs: started from this page -
  // Lighthouse.exe and browsers let the main page hand a link to the Limelight Editor app, not a frame inside it
  if (typeof e.data.lhLaunch === 'string') {
    const ed = APPS.find((x) => x.id === 'editor');
    if (ed && e.origin === new URL(appUrl(ed)).origin && /^limelight:\/\/nle\/(premiere|resolve)\?/i.test(e.data.lhLaunch)) location.href = e.data.lhLaunch;
    return;
  }
  // (from the app's own frame, or - the shown one of Edit's project tabs - from a frame inside it)
  const f = $$('#frames iframe').find((x) => x.contentWindow === e.source || (e.data.inner && (() => { try { return e.source.parent === x.contentWindow; } catch { return false; } })())); if (!f) return;
  if (e.data.lhHome) return show('home'); // (an app's "← Workspace")
  if (typeof e.data.lhWhere !== 'string') return;
  f.dataset.where = e.data.lhWhere; f.dataset.wtitle = String(e.data.title || '').slice(0, 140);
});
// (the ?v= / ?o= that only stop the frame using a cached page are no part of a link)
const cleanPath = (p) => String(p || '/').replace(/([?&])(v|o|tab)=[^&#]*&?/g, '$1').replace(/[?&](#|$)/, '$1') || '/';
function openNow() {
  const f = $('#frames iframe:not(.hidden)'); if (!f || $('#v-app').classList.contains('hidden')) return null;
  const app = f.dataset.for, a = APPS.find((x) => x.id === app);
  let p = f.dataset.where;
  if (!p) { try { const u = new URL(f.dataset.url || f.src); p = u.pathname + u.search + u.hash; } catch { p = '/'; } }
  const t = f.dataset.wtitle && !/^limelight( office| studio)?$/i.test(f.dataset.wtitle) ? f.dataset.wtitle : '';
  return { app, path: cleanPath(p), title: t || $('#appTitle').textContent || a?.name || 'Shared' };
}

const SHARE = { what: null, sel: new Set(), groups: new Set() };
function openShare(what = openNow()) {
  if (!what) return toast('Open something in Edit, Design or Office first');
  SHARE.what = what; SHARE.sel = new Set(); SHARE.groups = new Set();
  const label = what.forward ? `Forward: ${what.forward.what || 'message'}` : `${SHARE_NAMES[what.app] || 'App'} · ${what.title}`;
  $('#shareWhat').innerHTML = `${icon(what.forward ? 'fwd' : SHARE_ICONS[what.app] || 'share')}<span>${esc(label)}</span>`;
  $('#shareTitle').textContent = what.forward ? 'Forward' : 'Share';
  $('#shareNote').value = ''; $('#shareSearch').value = '';
  drawShare();
  $('#shareModal').classList.remove('hidden'); $('#shareSearch').focus();
}
function drawShare() {
  const q = $('#shareSearch').value.trim().toLowerCase();
  const hit = (s) => !q || String(s || '').toLowerCase().includes(q);
  const groups = (typeof CHATS !== 'undefined' ? CHATS : []).filter((c) => c.type === 'group' && hit(c.name));
  const people = Object.values(PEOPLE).filter((p) => p.email !== ME.email && (hit(p.name) || hit(p.email) || hit(p.dept)))
    .sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  const row = (key, on, av, name, sub) => `<div class="prow ${on ? 'sel' : ''}" ${key}>${av}<div><b>${esc(name)}</b><small>${esc(sub)}</small></div><span class="chk">${on ? '✓' : ''}</span></div>`;
  $('#shareList').innerHTML = (groups.length ? `<div class="shsec">Groups</div>` + groups.map((c) => row(`data-group="${c.id}"`, SHARE.groups.has(c.id),
    `<div class="cav sm" style="background:${colorOf(c.id)}">${icon('group')}</div>`, c.name, `${c.members.length} people`)).join('') : '')
    + (people.length ? `<div class="shsec">People</div>` + people.map((p) => row(`data-email="${esc(p.email)}"`, SHARE.sel.has(p.email),
      `<div class="cav sm" style="background:${colorOf(p.email)}">${esc(initials(p.name))}${pic(p.email)}${p.online ? '<i class="on-dot"></i>' : ''}</div>`, p.name, p.dept || p.email)).join('') : '')
    || '<div class="none" style="padding:12px">Nobody found</div>';
  const n = SHARE.sel.size + SHARE.groups.size;
  $('#shareGo').textContent = n ? `Send to ${n}` : 'Send';
  $('#shareGo').disabled = !n;
}
$('#shareSearch').addEventListener('input', drawShare);
$('#shareList').addEventListener('click', (e) => {
  const r = e.target.closest('[data-email],[data-group]'); if (!r) return;
  const [set, k] = r.dataset.email ? [SHARE.sel, r.dataset.email] : [SHARE.groups, r.dataset.group];
  set.has(k) ? set.delete(k) : set.add(k); drawShare();
});
$('#shareGo').onclick = async () => {
  const w = SHARE.what, b = $('#shareGo');
  const body = { to: [...SHARE.sel], groups: [...SHARE.groups], note: $('#shareNote').value };
  if (w.forward) Object.assign(body, { fromChat: w.forward.chat, fromMsg: w.forward.msg }); else Object.assign(body, { app: w.app, path: w.path, title: w.title });
  b.disabled = true; b.textContent = 'Sending…';
  try {
    const r = await api('/api/share', body);
    $('#shareModal').classList.add('hidden');
    toast(`Sent to ${r.sent} chat${r.sent === 1 ? '' : 's'}${r.edit ? ' · ' + r.edit : ''}`);
    if (typeof loadChats === 'function') loadChats().catch(() => {});
  } catch (err) { toast('Not sent: ' + err.message); drawShare(); }
};
$('#shareClose').onclick = () => $('#shareModal').classList.add('hidden');
$('#shareModal').addEventListener('click', (e) => { if (e.target.id === 'shareModal') $('#shareModal').classList.add('hidden'); });
$('#appShare').onclick = () => openShare();

// a Share card in a chat, and opening it inside the workspace
function shareCard(s) {
  return `<button class="shcard" data-share-app="${esc(s.app)}" data-share-path="${esc(s.path)}">${icon(SHARE_ICONS[s.app] || 'share')}<span><b>${esc(s.title || 'Shared')}</b><small>Open in ${esc(SHARE_NAMES[s.app] || s.app)}</small></span></button>`;
}
function openShared(app, path) {
  const a = APPS.find((x) => x.id === app); if (!a) return toast(`${SHARE_NAMES[app] || app} is not set up here`);
  const u = new URL(cleanPath(path), appUrl(a));
  if (app === 'office' || app === 'lighthouse') {
    const it = OFFICE_ITEMS.find((i) => (i[3] === 'lh' ? 'lighthouse' : 'office') === app && (i[3] === 'lh' ? u.pathname.startsWith(i[4]) : u.hash.startsWith(i[4])));
    openOffice(it?.[0]);
  } else openApp(app);
  const f = $(`#frames iframe[data-for="${app}"]`); if (!f) return;
  // (a new ?o= makes the frame load again: Edit and Design read what to open from the address only when they load)
  u.searchParams.set('o', Date.now().toString(36));
  f.src = u.href; f.dataset.url = u.href;
}
window.openShare = openShare; window.openShared = openShared; window.shareCard = shareCard;
