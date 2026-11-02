// Limelight workspace - Office › Leave approvals (admins): the HR app's leave / half-day / WFH requests. Pending ones as
// cards with the person's leave balance this year, a note box and Approve / Reject (sent to the HR app as this admin,
// which notifies the person); below, the last ones decided. Opened by openOffice (Office menu item type 'ws') into #wsPane.
// Uses workspace.js ($, api, esc, toast) and the Salary page's look (salary.css).
let LVA = null;
const LVA_KIND = { leave: 'Leave', half_day: 'Half day', wfh: 'Work from home' };
const lvaDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const lvaSpan = (r) => (r.from === r.to ? lvaDate(r.from) : `${lvaDate(r.from)} → ${lvaDate(r.to)}`);
const lvaWhat = (r) => `${LVA_KIND[r.kind] || 'Leave'}${r.slot ? ` (${r.slot})` : ''}`;

async function openLeaveApprovals(el) {
  el.innerHTML = `<div class="sal lva"><div class="sal-head"><div><h2>Leave approvals</h2><p>Leave, half-day and work-from-home requests · the person is told when you decide</p></div>
    <button class="btn sm" id="lvaReload">Refresh</button></div>
    <div class="lva-list" id="lvaPending"><p class="none">Loading…</p></div>
    <h3 class="lva-h">Recently decided</h3><div class="sal-table glass" id="lvaDone"></div></div>`;
  $('#lvaReload').onclick = loadLeaveApprovals;
  $('#lvaPending').addEventListener('click', onLvaDecide);
  loadLeaveApprovals();
}
async function loadLeaveApprovals() {
  try { LVA = await api('/api/salary/leaves'); } catch (err) { if ($('#lvaPending')) $('#lvaPending').innerHTML = `<p class="none">${esc(err.message)}</p>`; return; }
  if ($('#lvaPending')) drawLeaveApprovals();
}
function drawLeaveApprovals() {
  const bal = (b) => (b ? `<span class="lva-bal"><b>${b.left}</b> of ${b.quota} days left in ${b.year}${b.pending ? ` · ${b.pending} pending` : ''}</span>` : '');
  $('#lvaPending').innerHTML = LVA.pending.length ? LVA.pending.map((r) => `<div class="lva-card glass" data-id="${esc(r.id)}">
      <div class="lva-who"><b>${esc(r.name)}</b><small>${esc(r.empId)}${r.empId && r.dept ? ' · ' : ''}${esc(r.dept)}</small></div>
      <div class="lva-what"><em class="k-${esc(r.kind)}">${esc(lvaWhat(r))}</em><b>${esc(lvaSpan(r))}</b>${r.days ? `<small>${r.days} day${r.days === 1 ? '' : 's'}</small>` : ''}</div>
      ${r.reason ? `<p class="lva-why">${esc(r.reason)}</p>` : ''}${r.remarks ? `<p class="lva-why"><small>${esc(r.remarks)}</small></p>` : ''}
      ${bal(r.balance)}
      <div class="lva-acts"><input class="field" data-note placeholder="Note (optional)" maxlength="300">
        <button class="btn sm lva-no" data-st="rejected">Reject</button><button class="btn sm lva-yes" data-st="approved">Approve</button></div></div>`).join('')
    : '<p class="none glass lva-empty">No requests waiting. All caught up.</p>';
  $('#lvaDone').innerHTML = LVA.decided.length ? `<table><thead><tr><th>Name</th><th>Request</th><th>Dates</th><th>Days</th><th>Reason</th><th>Decision</th></tr></thead><tbody>${LVA.decided.map((r) => `<tr>
      <td><b>${esc(r.name)}</b><small>${esc(r.dept)}</small></td><td>${esc(lvaWhat(r))}</td><td>${esc(lvaSpan(r))}</td><td>${r.days ?? '—'}</td>
      <td class="lva-reason" title="${esc(r.remarks)}">${esc(r.reason || '—')}</td><td><span class="lva-st ${esc(r.status)}">${r.status === 'approved' ? 'Approved' : 'Rejected'}</span></td></tr>`).join('')}</tbody></table>`
    : '<p class="none">Nothing decided yet.</p>';
}
async function onLvaDecide(e) {
  const b = e.target.closest('[data-st]'), card = e.target.closest('.lva-card'); if (!b || !card) return;
  card.querySelectorAll('button').forEach((x) => (x.disabled = true));
  try {
    await api('/api/salary/leaves/decide', { id: card.dataset.id, status: b.dataset.st, note: card.querySelector('[data-note]').value.trim() });
    toast(b.dataset.st === 'approved' ? 'Approved · they have been told' : 'Rejected · they have been told');
    await loadLeaveApprovals();
  } catch (err) { toast(err.message); card.querySelectorAll('button').forEach((x) => (x.disabled = false)); }
}
window.openLeaveApprovals = openLeaveApprovals;
