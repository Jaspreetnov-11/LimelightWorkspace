// Put into the HR pages of Office inside the workspace, with office-hr.css. It only tags the app's own elements with
// data- attributes (never adds, moves or removes them, so the app's React stays in charge of its DOM); the stylesheet
// draws from those tags: Notifications in day groups with a type icon, Events with a date tile, the page name on <html>.
(function () {
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const set = (el, k, v) => { if (v == null) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== v) el.setAttribute(k, v); };
  // "29 Oct, 11:16" / "05 Nov" -> a date this year (or last year, for a date in the future that must be past)
  function parseDM(t, past) {
    const m = /(\d{1,2})\s+([A-Za-z]{3})/.exec(t || ''); if (!m) return null;
    const now = new Date(), d = new Date(now.getFullYear(), MON.indexOf(m[2].toUpperCase()), +m[1]);
    if (past && d - now > 864e5) d.setFullYear(d.getFullYear() - 1);
    return d;
  }

  // ---------- Notifications: type, unread, day group ----------
  function kindOf(row) {
    const dot = row.querySelector(':scope > i.dot'), t = (row.textContent || '').toLowerCase();
    if (/pink/.test(dot?.getAttribute('style') || '') || /announce/.test(t)) return 'news';
    if (/leave|wfh|work from home/.test(t)) return 'leave';
    if (/clock|check in|check-in|checked in|attendance|punch|late\b|shift/.test(t)) return 'time';
    if (/mention|@\w|tagged|comment|replied/.test(t)) return 'mention';
    if (/project/.test(t)) return 'project';
    if (/task|assign|deadline|due|approv|review|changes/.test(t)) return 'task';
    return 'system';
  }
  const KIND = { task: 'Task', leave: 'Leave', time: 'Attendance', mention: 'Mention', project: 'Project', news: 'Announcement', system: 'Update' };
  function notifications() {
    const today = day0(Date.now()), yest = new Date(today - 864e5), week = new Date(today - 6 * 864e5);
    for (const list of document.querySelectorAll('.simple-list')) {
      const alert = list.classList.contains('notif-alert');
      let prev = null;
      for (const row of list.querySelectorAll(':scope > .row')) {
        if (alert) { set(row, 'data-kind', 'alert'); continue; }
        const k = kindOf(row); set(row, 'data-kind', k); set(row, 'data-kl', KIND[k]);
        set(row, 'data-unread', /ov-04/.test(row.getAttribute('style') || '') ? '' : null);
        const d = parseDM(row.querySelector('small')?.textContent, true);
        const g = !d ? 'Earlier' : d >= today ? 'Today' : d >= yest ? 'Yesterday' : d >= week ? 'This week' : 'Earlier';
        set(row, 'data-head', g !== prev ? g : null); prev = g;
      }
    }
  }

  // ---------- Events: the date chip becomes a tile (big day + month) ----------
  function events() {
    const today = day0(Date.now());
    for (const chip of document.querySelectorAll('.panel .row > .chip')) {
      const t = chip.textContent.trim();
      let d = t === 'Today' ? today : t === 'Tomorrow' ? new Date(+today + 864e5) : parseDM(t, false);
      if (!d) continue;
      if (d < today) d.setFullYear(d.getFullYear() + 1);
      set(chip, 'data-d', String(d.getDate()).padStart(2, '0'));
      set(chip, 'data-m', t === 'Today' ? 'TODAY' : t === 'Tomorrow' ? 'TMRW' : MON[d.getMonth()]);
      set(chip, 'data-soon', (d - today) / 864e5 <= 7 ? '' : null);
    }
  }

  let queued = false;
  function run() {
    queued = false;
    const page = location.pathname.split('/')[1] || 'dashboard';
    set(document.documentElement, 'data-page', page);
    if (page === 'notifications') notifications();
    if (page === 'events') events();
  }
  const soon = () => { if (!queued) { queued = true; setTimeout(run, 30); } }; // (a timer, not a frame: frames stop in hidden tabs)
  function start() { new MutationObserver(soon).observe(document.body, { childList: true, subtree: true, characterData: true }); soon(); }
  if (document.body) start(); else addEventListener('DOMContentLoaded', start);
})();
