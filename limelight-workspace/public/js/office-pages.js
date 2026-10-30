// Limelight workspace - Office › Home, Tasks and Projects, drawn by the workspace itself (Office menu item type 'ws',
// like Salary) from the HR data through /api/hr/* - as the signed-in person, so the HR server still decides what each
// one may see and change. Anything not here (assigning to others, timers, editing projects) opens the classic page.
// Uses workspace.js ($, $$, api, esc, toast, icon, ME, openOffice).
const OP = { tasks: null, projects: null, perf: null, acts: null, at: 0 };
const OP_STATUS = [['pipeline', 'To do', '#9aa4b5'], ['progress', 'In progress', '#4f8cff'], ['approval', 'In review', '#b48cff'],
  ['changes', 'Changes', '#ff9f43'], ['completed', 'Done', '#3ddc84'], ['hold', 'On hold', '#7d7d88']];
const ST = Object.fromEntries(OP_STATUS.map(([k, l, c]) => [k, { l, c }]));
const AV = { o: '#ff9f43', b: '#4f8cff', g: '#3ddc84', p: '#b48cff', pk: '#ff7ab3', y: '#ffc21a', r: '#ff6b6b', t: '#22c3c3', pu: '#b48cff' };
const todayIso = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const dayDiff = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date(todayIso() + 'T00:00:00')) / 864e5);
const opHm = (m) => { m = Math.round(+m || 0); return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`; };
const fmtDay = (iso) => (iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
const meId = () => ME?.hrId || '';
const isMine = (t) => String(t.assignee || '').split(',').includes(meId());
const opAv = (name, av, ini) => `<span class="op-av" style="--c:${AV[av] || '#9aa4b5'}" title="${esc(name || '')}">${esc(ini || (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join(''))}</span>`;
function due(t) {
  if (!t.deadline || t.status === 'completed') return '';
  const n = dayDiff(t.deadline);
  const [cls, txt] = n < 0 ? ['late', `${-n}d late`] : n === 0 ? ['today', 'Today'] : n === 1 ? ['soon', 'Tomorrow'] : ['', fmtDay(t.deadline)];
  return `<span class="op-due ${cls}">${icon('cal')}${txt}</span>`;
}
const pill = (s) => `<span class="op-pill" style="--c:${ST[s]?.c || '#9aa4b5'}">${esc(ST[s]?.l || s)}</span>`;
const classic = (key, label = 'Open classic view') => `<button class="op-link" data-classic="${key}">${label} →</button>`;
function wireClassic(el) { $$('[data-classic]', el).forEach((b) => (b.onclick = () => openOffice(b.dataset.classic))); }

async function opLoad(force) {
  if (!force && OP.tasks && Date.now() - OP.at < 30e3) return;
  const get = (p) => api(`/api/hr/${p}`).then((r) => r.data).catch(() => null);
  const [tasks, projects, perf, acts] = await Promise.all([get('tasks'), get('projects'), get('performance'), get('activity')]);
  Object.assign(OP, { tasks: tasks || [], projects: projects || [], perf, acts: acts || [], at: Date.now() });
}
// the next step for a task, for the person looking at it
function nextSteps(t) {
  const mine = isMine(t), mgr = t.assigned_by === meId() || ME?.admin;
  const out = [];
  if (mine && (t.status === 'pipeline' || t.status === 'changes' || t.status === 'hold')) out.push(['progress', t.status === 'pipeline' ? 'Start' : 'Resume']);
  if (mine && t.status === 'progress') out.push(['approval', 'Submit for review']);
  if (mgr && t.status === 'approval') out.push(['completed', 'Approve'], ['changes', 'Ask for changes']);
  return out;
}
async function setStatus(t, status) {
  const old = t.status; t.status = status;
  try { await api(`/api/hr/tasks/${encodeURIComponent(t.id)}/status`, { status }, 'PATCH'); toast(`${t.title.slice(0, 40)} → ${ST[status].l}`); return true; }
  catch (err) { t.status = old; toast(err.message); return false; }
}

// ======================= Home =======================
async function openOfficeHome(el) {
  el.innerHTML = `<div class="op op-home"><div class="op-loading">${icon('home')}Loading your day…</div></div>`;
  await opLoad();
  // admins and the owners get the whole team at a glance; everyone else their own day
  if (ME?.admin) { await adminLoad(); return drawAdminHome(el); }
  drawHome(el);
}
function drawHome(el) {
  const now = new Date(), h = now.getHours(), first = (ME?.name || '').split(' ')[0] || 'there';
  const mine = OP.tasks.filter(isMine), open = mine.filter((t) => t.status !== 'completed');
  const late = open.filter((t) => t.deadline && dayDiff(t.deadline) < 0), today = open.filter((t) => t.deadline && dayDiff(t.deadline) === 0);
  const month = todayIso().slice(0, 7), doneMonth = mine.filter((t) => t.status === 'completed' && String(t.completed_at || t.completed || '').slice(0, 7) === month);
  const review = OP.tasks.filter((t) => t.status === 'approval' && t.assigned_by === meId());
  const unread = OP.acts.filter((a) => !a.read).length;
  const me = OP.perf?.list?.find((p) => p.id === meId());
  const focus = [...open].sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0, 7);
  const top = (OP.perf?.list || []).filter((p) => p.total > 0).slice(0, 5), best = top[0]?.total || 1;
  const live = OP.projects.filter((p) => (p.task_count || 0) > (p.completed_task_count || 0)).sort((a, b) => (b.task_count - b.completed_task_count) - (a.task_count - a.completed_task_count)).slice(0, 4);
  const line = [late.length && `<b class="late">${late.length} overdue</b>`, today.length && `<b>${today.length} due today</b>`, `${open.length} open task${open.length === 1 ? '' : 's'}`, unread && `${unread} unread updates`].filter(Boolean).join('<i>·</i>');
  const score = me ? Math.round(me.total) : 0;
  el.innerHTML = `<div class="op op-home">
    <section class="op-hero">
      <div class="op-hello"><small>${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
        <h1>${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${esc(first)}</h1><p>${line}</p>
        <div class="op-hero-acts"><button class="btn op-primary" data-go="tasks">${icon('check')}Open my tasks</button><button class="btn" id="opQuick">${icon('plus')}Quick task</button></div></div>
      <div class="op-score"><div class="op-ring" style="--p:${Math.min(100, score)}"><b>${score}</b><small>/100</small></div>
        <div><small>Your score this month</small><b>${me?.rank ? `#${me.rank} of ${OP.perf.list.length}` : 'Not ranked yet'}</b><span>${me ? `${me.tasks} tasks · ${me.onTimePct ?? 0}% on time` : 'Deliver tasks to get ranked'}</span></div></div>
    </section>
    <section class="op-metrics">
      ${[['Overdue', late.length, 'late', 'Needs you first'], ['Due today', today.length, 'today', 'Finish before you leave'], ['In review', review.length, 'review', 'Waiting for your approval'], ['Done this month', doneMonth.length, 'done', `${opHm(doneMonth.reduce((a, t) => a + (+t.taken_mins || 0), 0))} of work`]]
        .map(([l, n, c, s]) => `<div class="op-metric ${c}"><small>${l}</small><b>${n}</b><span>${s}</span></div>`).join('')}
    </section>
    <section class="op-cols">
      <div class="op-card op-focus"><header><h3>Focus</h3><span>your open tasks, most urgent first</span>${classic('tasks-classic', 'Classic')}</header>
        ${focus.length ? `<div class="op-list">${focus.map((t) => `<div class="op-task" data-id="${esc(t.id)}"><i class="op-dot" style="--c:${ST[t.status]?.c}"></i>
          <div class="op-t"><b>${esc(t.title)}</b><small>${esc(t.project_name || 'Personal')}${t.mins ? ` · ${opHm(t.mins)}` : ''}</small></div>${due(t)}${pill(t.status)}
          ${nextSteps(t).slice(0, 1).map(([s, l]) => `<button class="btn sm op-step" data-step="${s}">${l}</button>`).join('')}</div>`).join('')}</div>`
        : `<div class="op-empty">${icon('check')}<b>All clear</b><span>No open tasks. Enjoy the calm.</span></div>`}</div>
      <div class="op-side">
        <div class="op-card"><header><h3>Leaderboard</h3><span>${esc(month)}</span></header>
          ${top.length ? top.map((p, i) => `<div class="op-lb${p.id === meId() ? ' me' : ''}"><em>${i + 1}</em>${opAv(p.name, p.av, p.ini)}<div><b>${esc(p.name)}</b><i style="width:${Math.round((p.total / best) * 100)}%"></i></div><span>${Math.round(p.total * 10) / 10}</span></div>`).join('') : '<p class="op-none">No scores yet this month</p>'}</div>
        <div class="op-card"><header><h3>Latest</h3><span>${unread ? `${unread} new` : 'all read'}</span>${classic('alerts', 'All')}</header>
          ${OP.acts.slice(0, 4).map((a) => `<div class="op-note${a.read ? '' : ' new'}"><i></i><div><p>${esc(a.text)}</p><small>${fmtDay(a.at)} · ${new Date(a.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small></div></div>`).join('') || '<p class="op-none">Nothing yet</p>'}</div>
      </div>
    </section>
    <section class="op-card op-projrow"><header><h3>Active projects</h3><span>where the open work is</span><button class="op-link" data-go="projects">All projects →</button></header>
      <div class="op-pgrid">${live.map(projCard).join('') || '<p class="op-none">No active projects</p>'}</div></section>
  </div>`;
  wireClassic(el);
  $$('[data-go]', el).forEach((b) => (b.onclick = () => openOffice(b.dataset.go)));
  $('#opQuick', el).onclick = () => quickTask(() => drawHome(el));
  $$('.op-task', el).forEach((row) => {
    const t = OP.tasks.find((x) => x.id === row.dataset.id);
    row.onclick = (e) => { if (!e.target.closest('.op-step')) taskDrawer(t, () => drawHome(el)); };
    const b = $('.op-step', row); if (b) b.onclick = async () => { b.disabled = true; if (await setStatus(t, b.dataset.step)) drawHome(el); else b.disabled = false; };
  });
  $$('.op-proj', el).forEach((c) => (c.onclick = () => projectDrawer(OP.projects.find((p) => p.id === c.dataset.id))));
}

// ======================= Tasks =======================
let TK = { scope: 'mine', q: '', proj: '' };
async function openTasks(el) {
  el.innerHTML = `<div class="op op-tasks"><div class="op-loading">${icon('check')}Loading tasks…</div></div>`;
  await opLoad();
  el.innerHTML = `<div class="op op-tasks">
    <div class="op-head"><div><h2>Tasks</h2><p><span id="tkSum"></span> · ${classic('tasks-classic', 'Assign to others')}</p></div>
      <div class="op-seg" id="tkScope">${[['mine', 'Mine'], ['byme', 'Assigned by me'], ['all', 'Everyone']].map(([k, l]) => `<button data-s="${k}" class="${TK.scope === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="op-search">${icon('search')}<input id="tkQ" placeholder="Search tasks" value="${esc(TK.q)}"></label>
      <select class="field op-sel" id="tkProj"><option value="">All projects</option>${OP.projects.map((p) => `<option value="${esc(p.id)}"${TK.proj === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
      <button class="btn op-primary" id="tkNew">${icon('plus')}New task</button></div>
    <div class="op-board" id="tkBoard"></div></div>`;
  wireClassic(el);
  $$('#tkScope button', el).forEach((b) => (b.onclick = () => { TK.scope = b.dataset.s; $$('#tkScope button', el).forEach((x) => x.classList.toggle('on', x === b)); drawBoard(el); }));
  $('#tkQ', el).oninput = (e) => { TK.q = e.target.value; drawBoard(el); };
  $('#tkProj', el).onchange = (e) => { TK.proj = e.target.value; drawBoard(el); };
  $('#tkNew', el).onclick = () => quickTask(() => drawBoard(el));
  drawBoard(el);
}
function drawBoard(el) {
  const q = TK.q.trim().toLowerCase(), cut = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const list = OP.tasks.filter((t) => (TK.scope === 'mine' ? isMine(t) : TK.scope === 'byme' ? t.assigned_by === meId() && !isMine(t) : true)
    && (!TK.proj || t.project === TK.proj) && (!q || `${t.title} ${t.project_name} ${t.assignee_name}`.toLowerCase().includes(q))
    && (t.status !== 'completed' || String(t.completed_at || t.updated_at || '').slice(0, 10) >= cut));
  const open = list.filter((t) => t.status !== 'completed'), late = open.filter((t) => t.deadline && dayDiff(t.deadline) < 0).length;
  $('#tkSum', el).innerHTML = `${open.length} open${late ? ` · <b class="late">${late} overdue</b>` : ''} · done in the last 30 days: ${list.length - open.length}`;
  const board = $('#tkBoard', el);
  board.innerHTML = OP_STATUS.map(([k, l, c]) => {
    const col = list.filter((t) => t.status === k).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    return `<div class="op-col" data-col="${k}" style="--c:${c}"><header><i></i><b>${l}</b><span>${col.length}</span></header><div class="op-cards">
      ${col.slice(0, 80).map((t) => `<article class="op-tcard" draggable="true" data-id="${esc(t.id)}"><b>${esc(t.title)}</b>
        <div class="op-tmeta"><span class="op-chip">${esc(t.project_name || 'Personal')}</span>${t.type ? `<span class="op-chip ghost">${esc(t.type)}</span>` : ''}</div>
        <footer>${opAv(t.assignee_name, t.assignee_av, t.assignee_ini)}${due(t)}${t.mins ? `<span class="op-est">${opHm(t.taken_mins || 0)} / ${opHm(t.mins)}</span>` : ''}</footer></article>`).join('')}
      ${col.length > 80 ? `<p class="op-none">+${col.length - 80} more — search to narrow down</p>` : ''}${!col.length ? '<p class="op-drop">Drop a task here</p>' : ''}</div></div>`;
  }).join('');
  let dragId = null;
  $$('.op-tcard', board).forEach((c) => {
    c.ondragstart = (e) => { dragId = c.dataset.id; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; };
    c.ondragend = () => c.classList.remove('drag');
    c.onclick = () => taskDrawer(OP.tasks.find((t) => t.id === c.dataset.id), () => drawBoard(el));
  });
  $$('.op-col', board).forEach((col) => {
    col.ondragover = (e) => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = async (e) => {
      e.preventDefault(); col.classList.remove('over');
      const t = OP.tasks.find((x) => x.id === dragId); if (!t || t.status === col.dataset.col) return;
      await setStatus(t, col.dataset.col); drawBoard(el);
    };
  });
}

// a task's details, in a drawer from the right
function taskDrawer(t, after) {
  if (!t) return;
  const steps = nextSteps(t);
  const d = drawer(`<header><span class="op-pill" style="--c:${ST[t.status]?.c}">${esc(ST[t.status]?.l)}</span><button class="op-x" data-close>✕</button></header>
    <h2>${esc(t.title)}</h2><p class="op-sub">${esc(t.project_name || 'Personal / operational')}${t.type ? ` · ${esc(t.type)}` : ''}${t.dept ? ` · ${esc(t.dept)}` : ''}</p>
    <div class="op-kv">
      <div><small>Assigned to</small><span>${opAv(t.assignee_name, t.assignee_av, t.assignee_ini)}${esc(t.assignee_name || '—')}</span></div>
      <div><small>Assigned by</small><span>${esc(t.assigned_by_name || '—')}</span></div>
      <div><small>Deadline</small><span>${fmtDay(t.deadline)} ${due(t)}</span></div>
      <div><small>Time</small><span>${opHm(t.taken_mins || 0)} taken of ${opHm(t.mins || 0)}</span></div>
      <div><small>Assigned on</small><span>${fmtDay(t.assigned)}</span></div>
      <div><small>Completed</small><span>${t.completed_at ? fmtDay(t.completed_at) : '—'}</span></div>
    </div>
    ${t.remarks && t.remarks.trim().length > 2 ? `<div class="op-notes"><small>Notes</small><p>${esc(t.remarks)}</p></div>` : ''}
    <div class="op-acts">${steps.map(([s, l], i) => `<button class="btn${i === 0 ? ' op-primary' : ''}" data-step="${s}">${l}</button>`).join('')}
      <span class="grow"></span>${classic('tasks-classic', 'Open in classic view')}</div>`);
  wireClassic(d);
  $$('[data-step]', d).forEach((b) => (b.onclick = async () => { b.disabled = true; if (await setStatus(t, b.dataset.step)) { closeDrawer(); after?.(); } else b.disabled = false; }));
}
function quickTask(after) {
  const d = drawer(`<header><b>New task for yourself</b><button class="op-x" data-close>✕</button></header>
    <form class="op-form" id="qtF"><label>What needs doing<input class="field" name="title" required minlength="2" placeholder="e.g. Cut the 30 sec reel for Bihar Project"></label>
      <label>Project<select class="field" name="project"><option value="">Personal / operational</option>${OP.projects.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
      <div class="op-2"><label>Deadline<input class="field" type="date" name="deadline" value="${todayIso()}" min="${todayIso()}"></label>
      <label>Time it needs<select class="field" name="mins">${[[30, '30 min'], [60, '1 hour'], [120, '2 hours'], [240, 'Half day'], [480, 'Full day']].map(([v, l]) => `<option value="${v}"${v === 120 ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <label class="op-check"><input type="checkbox" name="start" checked> Start it now</label>
      <div class="op-acts"><button class="btn op-primary" type="submit">${icon('plus')}Add task</button><span class="grow"></span>${classic('tasks-classic', 'Assign to someone else')}</div></form>`);
  wireClassic(d);
  $('input[name=title]', d).focus();
  $('#qtF', d).onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), btn = $('button[type=submit]', d); btn.disabled = true;
    try {
      await api('/api/hr/tasks/self', { title: f.title, project: f.project, deadline: f.deadline, mins: +f.mins, status: f.start ? 'progress' : 'pipeline' });
      toast('Task added'); closeDrawer(); await opLoad(true); after?.();
    } catch (err) { toast(err.message); btn.disabled = false; }
  };
}

// ======================= Projects =======================
let PJ = { f: 'active', q: '' };
function projCard(p) {
  const n = +p.task_count || 0, done = +p.completed_task_count || 0, pct = n ? Math.round((done / n) * 100) : 0;
  const used = +p.consumed_mins || 0, est = +p.est_mins || 0, over = est && used > est;
  return `<article class="op-proj" data-id="${esc(p.id)}"><div class="op-ring sm" style="--p:${pct}"><b>${pct}%</b></div>
    <div class="op-pbody"><b>${esc(p.name)}</b><small>${esc(p.client || 'Internal')}</small>
      <div class="op-pmeta"><span>${done}/${n} tasks</span><span class="${over ? 'late' : ''}">${opHm(used)}${est ? ` of ${opHm(est)}` : ''}</span></div>
      <div class="op-bar"><i style="width:${est ? Math.min(100, Math.round((used / est) * 100)) : 0}%" class="${over ? 'over' : ''}"></i></div></div>
    <span class="op-chip ${p.billable ? 'bill' : 'ghost'}">${p.billable ? 'Billable' : 'Non-billable'}</span></article>`;
}
async function openProjects(el) {
  el.innerHTML = `<div class="op op-projects"><div class="op-loading">${icon('brief')}Loading projects…</div></div>`;
  await opLoad();
  el.innerHTML = `<div class="op op-projects">
    <div class="op-head"><div><h2>Projects</h2><p><span id="pjSum"></span> · ${classic('projects-classic', 'Add or edit projects')}</p></div>
      <div class="op-seg" id="pjF">${[['active', 'Active'], ['done', 'Finished'], ['bill', 'Billable'], ['all', 'All']].map(([k, l]) => `<button data-f="${k}" class="${PJ.f === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="op-search">${icon('search')}<input id="pjQ" placeholder="Search projects or clients" value="${esc(PJ.q)}"></label></div>
    <div class="op-pgrid big" id="pjGrid"></div></div>`;
  wireClassic(el);
  $$('#pjF button', el).forEach((b) => (b.onclick = () => { PJ.f = b.dataset.f; $$('#pjF button', el).forEach((x) => x.classList.toggle('on', x === b)); drawProjects(el); }));
  $('#pjQ', el).oninput = (e) => { PJ.q = e.target.value; drawProjects(el); };
  drawProjects(el);
}
function drawProjects(el) {
  const q = PJ.q.trim().toLowerCase(), active = (p) => (+p.task_count || 0) > (+p.completed_task_count || 0) || !+p.task_count;
  const list = OP.projects.filter((p) => (PJ.f === 'active' ? active(p) : PJ.f === 'done' ? !active(p) : PJ.f === 'bill' ? +p.billable : true)
    && (!q || `${p.name} ${p.client}`.toLowerCase().includes(q)));
  const hours = OP.projects.reduce((a, p) => a + (+p.consumed_mins || 0), 0);
  $('#pjSum', el).textContent = `${OP.projects.filter(active).length} active · ${OP.projects.length} in all · ${opHm(hours)} logged`;
  $('#pjGrid', el).innerHTML = list.map(projCard).join('') || '<p class="op-none">No projects here</p>';
  $$('.op-proj', el).forEach((c) => (c.onclick = () => projectDrawer(OP.projects.find((p) => p.id === c.dataset.id))));
}
function projectDrawer(p) {
  if (!p) return;
  const tasks = OP.tasks.filter((t) => t.project === p.id);
  const by = OP_STATUS.map(([k, l, c]) => [k, l, c, tasks.filter((t) => t.status === k)]).filter((x) => x[3].length);
  const people = [...new Map(tasks.map((t) => [t.assignee_name, t])).values()].slice(0, 12);
  const d = drawer(`<header><span class="op-chip ${p.billable ? 'bill' : 'ghost'}">${p.billable ? 'Billable' : 'Non-billable'}</span><span class="op-chip ghost">${esc(p.status || '')}</span><button class="op-x" data-close>✕</button></header>
    <h2>${esc(p.name)}</h2><p class="op-sub">${esc(p.client || 'Internal')} · started ${fmtDay(p.start)}</p>
    <div class="op-kv"><div><small>Tasks</small><span>${p.completed_task_count || 0} done of ${p.task_count || 0}</span></div><div><small>Time</small><span>${opHm(p.consumed_mins)} of ${opHm(p.est_mins)}</span></div>
      <div class="wide"><small>Team</small><span class="op-avs">${people.map((t) => opAv(t.assignee_name, t.assignee_av, t.assignee_ini)).join('') || '—'}</span></div></div>
    ${by.map(([k, l, c, list]) => `<div class="op-pgroup" style="--c:${c}"><h4><i></i>${l}<span>${list.length}</span></h4>${list.slice(0, 12).map((t) => `<div class="op-prow" data-id="${esc(t.id)}"><b>${esc(t.title)}</b>${opAv(t.assignee_name, t.assignee_av, t.assignee_ini)}${due(t)}</div>`).join('')}${list.length > 12 ? `<p class="op-none">+${list.length - 12} more</p>` : ''}</div>`).join('') || '<p class="op-none">No tasks in this project yet</p>'}
    <div class="op-acts"><span class="grow"></span>${classic('projects-classic', 'Open in classic view')}</div>`);
  wireClassic(d);
  $$('.op-prow', d).forEach((r) => (r.onclick = () => taskDrawer(OP.tasks.find((t) => t.id === r.dataset.id))));
}

// ---------- the drawer ----------
function drawer(html) {
  closeDrawer();
  const wrap = document.createElement('div'); wrap.className = 'op-drawer-bg'; wrap.innerHTML = `<aside class="op-drawer glass">${html}</aside>`;
  document.body.append(wrap);
  wrap.onclick = (e) => { if (e.target === wrap || e.target.closest('[data-close]')) closeDrawer(); };
  $$('[data-classic]', wrap).forEach((b) => b.addEventListener('click', closeDrawer));
  setTimeout(() => wrap.classList.add('open'), 10);
  return wrap.firstElementChild;
}
function closeDrawer() { $$('.op-drawer-bg').forEach((x) => x.remove()); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

// ======================= Overtime =======================
// Everyone writes their OT for a day; each entry shows how it compares with that day's clock-out (checked again on
// every load, so OT written before clocking out is confirmed once the person clocks out). Admins approve or reject.
let OT = { month: null, view: 'mine', pendingOnly: true, data: null };
const otMonth = () => todayIso().slice(0, 7);
const CHECK = { ok: 'Matches clock-out', over: 'More than clock-out', wait: 'Waiting for clock-out', none: 'No clock-in' };
async function openOvertime(el) {
  OT.month ||= otMonth();
  el.innerHTML = `<div class="op op-ot"><div class="op-head"><div><h2>Overtime</h2><p id="otSub">Write your OT every day — it is checked against your clock-out</p></div>
    <div class="op-seg hidden" id="otView"><button data-v="mine">Mine</button><button data-v="all">Team</button></div>
    <input type="month" class="field op-sel" id="otMonth" value="${OT.month}" max="${otMonth()}"></div><div id="otBody"><div class="op-loading">${icon('clock')}Loading…</div></div></div>`;
  $('#otMonth', el).onchange = (e) => { OT.month = e.target.value; loadOt(el); };
  $$('#otView button', el).forEach((b) => (b.onclick = () => { OT.view = b.dataset.v; loadOt(el); }));
  loadOt(el);
}
async function loadOt(el) {
  try { OT.data = await api(`/api/ot?month=${OT.month}${OT.view === 'all' ? '&all=1' : ''}`); }
  catch (err) { $('#otBody', el).innerHTML = `<p class="op-none">${esc(err.message)}</p>`; return; }
  $('#otView', el).classList.toggle('hidden', !OT.data.admin);
  $$('#otView button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === OT.view));
  (OT.view === 'all' && OT.data.admin ? drawOtTeam : drawOtMine)(el);
}
const clockLine = (c) => (!c ? 'No clock-in' : c.out === null ? `In ${c.in} · not clocked out yet` : `${c.in} → ${c.out}${c.nextDay ? ' (next day)' : ''} · ${c.worked}h worked`);
const checkBadge = (x) => `<span class="op-check ${x.check.state}" title="${esc(x.check.text)}">${x.check.state === 'ok' ? '✓ ' : ''}${CHECK[x.check.state]}</span>`;
const otStatus = (e) => (e.status === 'approved' ? `<span class="op-pill" style="--c:var(--green)">Approved ${e.approved}h</span>`
  : e.status === 'rejected' ? '<span class="op-pill" style="--c:var(--red)">Rejected</span>' : '<span class="op-pill" style="--c:var(--acc)">Pending</span>');
const dateTile = (d) => { const x = new Date(d + 'T00:00:00'); return `<div class="op-date"><b>${x.getDate()}</b><small>${x.toLocaleDateString('en-IN', { weekday: 'short' })}</small></div>`; };

function drawOtMine(el) {
  const D = OT.data, list = D.entries, t = D.today;
  const sum = (f) => Math.round(list.filter(f).reduce((a, e) => a + (e.status === 'approved' ? +e.approved : +e.hours), 0) * 100) / 100;
  $('#otSub', el).textContent = 'Write your OT every day — it is checked against your clock-out';
  $('#otBody', el).innerHTML = `<div class="op-ot-top">
    <form class="op-card op-otform" id="otF"><header><h3>Log overtime</h3><span>one entry a day — save again to change it</span></header>
      <div class="op-otrow"><label>Day<input class="field" type="date" name="date" value="${todayIso()}" max="${todayIso()}"></label>
        <label>Hours<input class="field" type="number" name="hours" min="0.25" max="16" step="0.25" placeholder="e.g. 2" value="${t?.ot > 0 ? t.ot : ''}" required></label></div>
      <label>What you worked on<input class="field" name="reason" placeholder="e.g. Final edit of the CM Helpline reel for tomorrow" required minlength="3"></label>
      <div class="op-acts"><button class="btn op-primary" type="submit">${icon('clock')}Save OT</button>
        <span class="op-today">Today: ${esc(clockLine(t))}${t?.ot > 0 ? ` · <b>${t.ot}h past a full day</b>` : ''}</span></div></form>
    <div class="op-otsum">${[['Claimed', `${sum(() => true)}h`, '', 'this month'], ['Approved', `${sum((e) => e.status === 'approved')}h`, 'done', 'goes into salary'],
      ['Waiting', list.filter((e) => e.status === 'pending').length, 'today', 'entries for an admin']]
      .map(([l, n, c, s]) => `<div class="op-metric ${c}"><small>${l}</small><b>${n}</b><span>${s}</span></div>`).join('')}</div></div>
    <div class="op-card"><header><h3>Your OT this month</h3><span>${list.length} ${list.length === 1 ? 'entry' : 'entries'}</span></header>
      ${list.length ? `<div class="op-otlist">${list.map((e) => `<div class="op-otitem" data-id="${esc(e.id)}">${dateTile(e.date)}
        <div class="op-otmain"><b>${e.hours}h <span>· ${esc(e.reason)}</span></b><small>${esc(clockLine(e.clock))}</small></div>${checkBadge(e)}${otStatus(e)}
        ${e.status === 'pending' ? '<button class="op-x sm" data-edit title="Change">✎</button><button class="op-x sm" data-del title="Remove">✕</button>' : ''}</div>`).join('')}</div>`
      : `<div class="op-empty">${icon('clock')}<b>No OT written this month</b><span>Stayed late? Write it here the same day.</span></div>`}</div>`;
  const f = $('#otF', el);
  f.date.onchange = () => { const e = list.find((x) => x.date === f.date.value); if (e) { f.hours.value = e.hours; f.reason.value = e.reason; } };
  f.onsubmit = async (ev) => {
    ev.preventDefault(); const b = $('button[type=submit]', f); b.disabled = true;
    try {
      await api('/api/ot', Object.fromEntries(new FormData(f))); toast('OT saved');
      if (f.date.value.slice(0, 7) !== OT.month) { OT.month = f.date.value.slice(0, 7); $('#otMonth', el).value = OT.month; }
      loadOt(el);
    } catch (err) { toast(err.message); b.disabled = false; }
  };
  $$('.op-otitem', el).forEach((row) => {
    const e = list.find((x) => x.id === row.dataset.id);
    const ed = $('[data-edit]', row); if (ed) ed.onclick = () => { f.date.value = e.date; f.hours.value = e.hours; f.reason.value = e.reason; f.hours.focus(); };
    const del = $('[data-del]', row);
    if (del) del.onclick = async () => { if (!confirm(`Remove your OT for ${fmtDay(e.date)}?`)) return; try { await api('/api/ot/remove', { id: e.id, month: OT.month }); loadOt(el); } catch (err) { toast(err.message); } };
  });
}

function drawOtTeam(el) {
  const D = OT.data, all = D.entries, list = OT.pendingOnly ? all.filter((e) => e.status === 'pending') : all;
  const pend = all.filter((e) => e.status === 'pending').length, appr = Math.round(all.filter((e) => e.status === 'approved').reduce((a, e) => a + +e.approved, 0) * 100) / 100;
  const people = new Set(all.map((e) => e.emp)).size;
  $('#otSub', el).textContent = `${pend} waiting · ${appr}h approved · ${people} ${people === 1 ? 'person' : 'people'} this month — approved hours go into Salary`;
  const days = [...new Set(list.map((e) => e.date))];
  const row = (e) => {
    const fair = e.clock?.ot != null ? Math.min(e.hours, e.clock.ot) : e.hours;
    return `<div class="op-otitem team" data-id="${esc(e.id)}"><span class="op-av" style="--c:var(--acc)">${esc(e.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</span>
      <div class="op-otmain"><b>${esc(e.name)} <span>· ${e.hours}h</span></b><small>${esc(e.reason)}</small>
        <small>${esc(clockLine(e.clock))}${e.clock?.ot != null ? ` · clock shows ${e.clock.ot}h OT` : ''}</small></div>${checkBadge(e)}
      ${e.status === 'pending' ? `<input class="field op-hrs" type="number" min="0" max="16" step="0.25" value="${Math.round(fair * 100) / 100}" title="Hours to approve">
        <button class="btn sm op-primary" data-ok>Approve</button><button class="btn sm" data-no>Reject</button>`
      : `${otStatus(e)}<button class="op-link" data-undo>Undo</button>`}</div>`;
  };
  $('#otBody', el).innerHTML = `<div class="op-card"><header><h3>${OT.pendingOnly ? 'Waiting for you' : 'All OT'}</h3><span>${list.length} ${list.length === 1 ? 'entry' : 'entries'}</span>
      <label class="op-toggle"><input type="checkbox" id="otPend"${OT.pendingOnly ? ' checked' : ''}> Waiting only</label></header>
    ${days.length ? days.map((d) => `<div class="op-otday"><h4>${new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
      ${list.filter((e) => e.date === d).map(row).join('')}</div>`).join('')
    : `<div class="op-empty">${icon('check')}<b>${OT.pendingOnly ? 'Nothing waiting' : 'No OT this month'}</b><span>${OT.pendingOnly ? 'Every OT entry has been decided.' : 'Nobody has written OT yet.'}</span></div>`}</div>`;
  $('#otPend', el).onchange = (e) => { OT.pendingOnly = e.target.checked; drawOtTeam(el); };
  $$('.op-otitem.team', el).forEach((r) => {
    const e = all.find((x) => x.id === r.dataset.id);
    const go = async (status, hours) => {
      try { await api('/api/ot/review', { id: e.id, month: OT.month, status, hours }); toast(status === 'approved' ? `Approved ${hours}h for ${e.name}` : status === 'rejected' ? 'Rejected' : 'Back to waiting'); loadOt(el); }
      catch (err) { toast(err.message); }
    };
    $('[data-ok]', r)?.addEventListener('click', () => go('approved', +$('.op-hrs', r).value));
    $('[data-no]', r)?.addEventListener('click', () => go('rejected'));
    $('[data-undo]', r)?.addEventListener('click', () => go('pending'));
  });
}

// ======================= Home for admins and the owners: the whole team at a glance =======================
const AD = { emps: null, today: null, prod: null, ot: null };
async function adminLoad() {
  const get = (p) => api(p).then((r) => r.data ?? r).catch(() => null);
  const [emps, today, prod, ot] = await Promise.all([get('/api/hr/employees'), get('/api/hr/attendance/today'), get('/api/hr/productivity'), get(`/api/ot?all=1&month=${todayIso().slice(0, 7)}`)]);
  Object.assign(AD, { emps: (emps || []).filter((e) => e.status !== 'inactive' && e.active !== 0), today, prod, ot });
}
const isOwnerEmp = (e) => (ME?.owners || []).includes(String(e.name || '').trim().split(' ')[0].toLowerCase());
function drawAdminHome(el) {
  const now = new Date(), h = now.getHours(), first = (ME?.name || '').split(' ')[0] || 'there', month = todayIso().slice(0, 7);
  const staff = AD.emps.filter((e) => !isOwnerEmp(e)), recs = AD.today?.staffAttendance || [];
  const recOf = new Map(recs.map((r) => [r.emp, r]));
  const inToday = staff.filter((e) => recOf.get(e.id)?.clock_in), late = inToday.filter((e) => recOf.get(e.id).late);
  const wfh = inToday.filter((e) => recOf.get(e.id).mode === 'wfh'), out = staff.filter((e) => !recOf.get(e.id)?.clock_in && !['absent', 'leave'].includes(recOf.get(e.id)?.status));
  const onLeave = staff.filter((e) => ['absent', 'leave'].includes(recOf.get(e.id)?.status));
  const open = OP.tasks.filter((t) => t.status !== 'completed'), overdue = open.filter((t) => t.deadline && dayDiff(t.deadline) < 0);
  const review = OP.tasks.filter((t) => t.status === 'approval').sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)));
  const doneMonth = OP.tasks.filter((t) => t.status === 'completed' && String(t.completed_at || '').slice(0, 7) === month);
  const otWait = (AD.ot?.entries || []).filter((e) => e.status === 'pending');
  const pct = staff.length ? Math.round((inToday.length / staff.length) * 100) : 0;
  const prodList = (AD.prod?.list || []).filter((p) => p.clockMins > 0 || p.productiveMins > 0).sort((a, b) => b.productiveMins - a.productiveMins).slice(0, 8);
  const maxClock = Math.max(1, ...prodList.map((p) => Math.max(p.clockMins, p.productiveMins)));
  const tot = AD.prod?.totals || {}, prodPct = tot.clockMins ? Math.round((tot.productiveMins / tot.clockMins) * 100) : 0;
  const top = (OP.perf?.list || []).filter((p) => p.total > 0).slice(0, 5), best = top[0]?.total || 1;
  const risk = OP.projects.map((p) => ({ p, late: open.filter((t) => t.project === p.id && t.deadline && dayDiff(t.deadline) < 0).length, over: +p.est_mins && +p.consumed_mins > +p.est_mins }))
    .filter((x) => x.late || x.over).sort((a, b) => b.late - a.late).slice(0, 5);
  const depts = [...new Set(OP.tasks.map((t) => t.dept).filter(Boolean))].map((d) => {
    const ts = OP.tasks.filter((t) => t.dept === d), op = ts.filter((t) => t.status !== 'completed');
    return { d, people: staff.filter((e) => e.dept === d).length, open: op.length, late: op.filter((t) => t.deadline && dayDiff(t.deadline) < 0).length, done: ts.filter((t) => t.status === 'completed' && String(t.completed_at || '').slice(0, 7) === month).length };
  }).sort((a, b) => b.open - a.open);
  const faces = (list, more = 12) => (list.length ? `<div class="op-faces">${list.slice(0, more).map((e) => opAv(e.name, e.av, e.ini)).join('')}${list.length > more ? `<em>+${list.length - more}</em>` : ''}</div>` : '<p class="op-none">Nobody</p>');
  const line = [`<b>${inToday.length} of ${staff.length}</b> in today`, overdue.length && `<b class="late">${overdue.length} overdue tasks</b>`, review.length && `${review.length} waiting for approval`, otWait.length && `${otWait.length} OT to approve`].filter(Boolean).join('<i>·</i>');

  el.innerHTML = `<div class="op op-home op-admin">
    <section class="op-hero">
      <div class="op-hello"><small>${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · Team overview</small>
        <h1>${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${esc(first)}</h1><p>${line}</p>
        <div class="op-hero-acts"><button class="btn op-primary" data-go="tasks">${icon('check')}All tasks</button><button class="btn" data-go="overtime">${icon('clock')}Overtime${otWait.length ? ` <span class="op-badge">${otWait.length}</span>` : ''}</button>
          <button class="btn" data-go="staff">${icon('people')}Staff</button>${ME?.admin ? `<button class="btn" data-go="salary">${icon('money')}Salary</button>` : ''}</div></div>
      <div class="op-score"><div class="op-ring" style="--p:${pct}"><b>${inToday.length}</b><small>of ${staff.length}</small></div>
        <div><small>Attendance today</small><b>${pct}% in</b><span>${late.length} late · ${wfh.length} WFH · ${onLeave.length} on leave</span></div></div>
    </section>
    <section class="op-metrics six">
      ${[['Open tasks', open.length, '', `${new Set(open.map((t) => t.assignee)).size} people working`], ['Overdue', overdue.length, 'late', 'past their deadline'],
        ['Waiting approval', review.length, 'review', 'submitted, need a decision'], ['Done this month', doneMonth.length, 'done', `${opHm(doneMonth.reduce((a, t) => a + (+t.taken_mins || 0), 0))} of work`],
        ['Productive', `${prodPct}%`, 'today', `${opHm(tot.productiveMins)} of ${opHm(tot.clockMins)} clocked`], ['OT to approve', otWait.length, '', `${Math.round(otWait.reduce((a, e) => a + +e.hours, 0) * 100) / 100}h claimed`]]
        .map(([l, n, c, s]) => `<div class="op-metric ${c}"><small>${l}</small><b>${n}</b><span>${s}</span></div>`).join('')}
    </section>
    <section class="op-grid3">
      <div class="op-card"><header><h3>Today</h3><span>${now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>${classic('home-classic', 'Classic')}</header>
        <div class="op-att"><div><small><i style="--c:var(--green)"></i>In · ${inToday.length}</small>${faces(inToday)}</div>
          <div><small><i style="--c:#ff9f43"></i>Late · ${late.length}</small>${faces(late, 8)}</div>
          <div><small><i style="--c:var(--red)"></i>Not in yet · ${out.length}</small>${faces(out)}</div>
          ${onLeave.length ? `<div><small><i style="--c:#4f8cff"></i>Leave / absent · ${onLeave.length}</small>${faces(onLeave, 8)}</div>` : ''}</div></div>
      <div class="op-card"><header><h3>Needs your decision</h3><span>${review.length + otWait.length} waiting</span></header>
        ${review.slice(0, 6).map((t) => `<div class="op-task" data-id="${esc(t.id)}">${opAv(t.assignee_name, t.assignee_av, t.assignee_ini)}<div class="op-t"><b>${esc(t.title)}</b><small>${esc(t.assignee_name || '')} · ${esc(t.project_name || 'Personal')}</small></div>
          <button class="btn sm op-primary op-step" data-step="completed">Approve</button></div>`).join('')}
        ${otWait.length ? `<button class="op-wait" data-go="overtime">${icon('clock')}<b>${otWait.length} OT ${otWait.length === 1 ? 'entry' : 'entries'}</b> waiting for approval →</button>` : ''}
        ${!review.length && !otWait.length ? `<div class="op-empty">${icon('check')}<b>Nothing waiting</b><span>No submitted tasks or OT to decide.</span></div>` : ''}</div>
      <div class="op-card"><header><h3>Leaderboard</h3><span>${esc(month)}</span>${classic('performance', 'All')}</header>
        ${top.length ? top.map((p, i) => `<div class="op-lb"><em>${i + 1}</em>${opAv(p.name, p.av, p.ini)}<div><b>${esc(p.name)}</b><i style="width:${Math.round((p.total / best) * 100)}%"></i></div><span>${Math.round(p.total * 10) / 10}</span></div>`).join('') : '<p class="op-none">No scores yet</p>'}</div>
    </section>
    <section class="op-grid2">
      <div class="op-card"><header><h3>Team hours this month</h3><span>productive (task time) of clocked</span></header>
        ${prodList.map((p) => `<div class="op-hours">${opAv(p.name, p.av, p.ini)}<div><b>${esc(p.name)}</b><div class="op-hbar"><i class="c" style="width:${(p.clockMins / maxClock) * 100}%"></i><i class="p" style="width:${(p.productiveMins / maxClock) * 100}%"></i></div></div>
          <span>${opHm(p.productiveMins)} <small>/ ${opHm(p.clockMins)}</small></span></div>`).join('') || '<p class="op-none">No hours yet this month</p>'}</div>
      <div class="op-card"><header><h3>Projects at risk</h3><span>overdue work or over the estimate</span><button class="op-link" data-go="projects">Projects →</button></header>
        ${risk.map(({ p, late: l, over }) => `<div class="op-risk op-proj-open" data-id="${esc(p.id)}"><div class="op-t"><b>${esc(p.name)}</b><small>${esc(p.client || 'Internal')} · ${p.completed_task_count || 0}/${p.task_count || 0} tasks</small></div>
          ${l ? `<span class="op-pill" style="--c:var(--red)">${l} overdue</span>` : ''}${over ? `<span class="op-pill" style="--c:#ff9f43">${opHm(p.consumed_mins)} of ${opHm(p.est_mins)}</span>` : ''}</div>`).join('') || `<div class="op-empty">${icon('check')}<b>All on track</b></div>`}</div>
    </section>
    <section class="op-card"><header><h3>Departments</h3><span>open work by team</span></header>
      <table class="op-table"><thead><tr><th>Department</th><th>People</th><th>Open</th><th>Overdue</th><th>Done this month</th><th></th></tr></thead><tbody>
      ${depts.map((d) => { const mx = Math.max(1, ...depts.map((x) => x.open)); return `<tr><td><b>${esc(d.d)}</b></td><td>${d.people}</td><td>${d.open}</td><td class="${d.late ? 'late' : ''}">${d.late}</td><td>${d.done}</td>
        <td class="op-dbar"><i style="width:${(d.open / mx) * 100}%"></i><i class="l" style="width:${(d.late / mx) * 100}%"></i></td></tr>`; }).join('')}</tbody></table></section>
    <section class="op-card"><header><h3>Latest</h3><span>clock-ins, submissions and updates</span>${classic('alerts', 'All')}</header>
      <div class="op-feed">${OP.acts.slice(0, 10).map((a) => `<div class="op-note${a.read ? '' : ' new'}"><i></i><div><p>${esc(a.text)}</p><small>${fmtDay(a.at)} · ${new Date(a.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small></div></div>`).join('') || '<p class="op-none">Nothing yet</p>'}</div></section>
  </div>`;
  wireClassic(el);
  $$('[data-go]', el).forEach((b) => (b.onclick = () => openOffice(b.dataset.go)));
  $$('.op-task', el).forEach((row) => {
    const t = OP.tasks.find((x) => x.id === row.dataset.id);
    row.onclick = (e) => { if (!e.target.closest('.op-step')) taskDrawer(t, () => drawAdminHome(el)); };
    const b = $('.op-step', row); if (b) b.onclick = async () => { b.disabled = true; if (await setStatus(t, 'completed')) drawAdminHome(el); else b.disabled = false; };
  });
  $$('.op-proj-open', el).forEach((c) => (c.onclick = () => projectDrawer(OP.projects.find((p) => p.id === c.dataset.id))));
}
