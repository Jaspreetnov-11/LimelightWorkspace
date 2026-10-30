// Limelight workspace - Office › Salary (admins): the month's pay for everyone, worked out by the server (salary.mjs)
// from Lighthouse's payroll figures - with an OT box and an adjustment box per person, the rules on top, totals and a
// CSV download. Opened by openOffice (Office menu item type 'ws') into #wsPane.
// Uses workspace.js ($, $$, api, esc, toast).
let SAL = null, SAL_MONTH = null;
const inr = (n) => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const thisMonth = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);

async function openSalary(el) {
  SAL_MONTH ||= thisMonth();
  el.innerHTML = `<div class="sal"><div class="sal-head"><div><h2>Salary</h2><p>Worked out from attendance, leaves, late marks and OT · owners are not included</p></div>
    <label>Month <input type="month" class="field" id="salMonth" value="${SAL_MONTH}" max="${thisMonth()}"></label>
    <button class="btn sm" id="salCsv">Download CSV</button></div>
    <div class="sal-rules glass" id="salRules"></div><div class="sal-sum" id="salSum"></div><div class="sal-table glass" id="salTable"><p class="none">Loading…</p></div></div>`;
  $('#salMonth').onchange = (e) => { SAL_MONTH = e.target.value; loadSalary(); };
  $('#salCsv').onclick = salCsv;
  $('#salTable').addEventListener('change', onSalInput);
  $('#salRules').addEventListener('change', onSalRule);
  loadSalary();
}
async function loadSalary() {
  try { SAL = await api(`/api/salary?month=${SAL_MONTH}`); } catch (err) { $('#salTable').innerHTML = `<p class="none">${esc(err.message)}</p>`; return; }
  drawSalary();
}
function drawSalary() {
  const R = SAL.rules, T = SAL.total;
  $('#salRules').innerHTML = `<b>Rules</b>
    <label>Every <input class="field" type="number" min="0" data-rule="latesPerHalfDay" value="${R.latesPerHalfDay}"> late marks = ½ day cut</label>
    <label>Paid leaves a month <input class="field" type="number" min="0" step="0.5" data-rule="paidLeavesPerMonth" value="${R.paidLeavesPerMonth}"></label>
    <label>OT rate <input class="field" type="number" min="0" step="0.1" data-rule="otMultiplier" value="${R.otMultiplier}"> <small>× hourly pay (above 5: ₹ an hour)</small></label>
    <small>${SAL.workdaysTotal || '—'} working days · ${R.hoursPerDay} h a day</small>`;
  $('#salSum').innerHTML = [['Salary', T.salary], ['Deductions', -T.deductions], ['OT pay', T.otPay], ['Adjustments', T.adj], ['Net pay', T.net]]
    .map(([l, v], i) => `<div class="glass ${i === 4 ? 'net' : ''}"><small>${l}</small><b>${inr(v)}</b></div>`).join('');
  $('#salTable').innerHTML = SAL.rows.length ? `<table><thead><tr><th>Name</th><th>Salary</th><th>Present</th><th>Half</th><th>Absent</th><th>Leave <small>(unpaid)</small></th><th>Late <small>(½ days)</small></th>
      <th>OT hours <small>HR or OT register + typed</small></th><th>OT pay</th><th>Deductions</th><th>Adjust ₹</th><th>Net</th></tr></thead><tbody>${SAL.rows.map((r) => `<tr data-id="${esc(r.id)}">
      <td><b>${esc(r.name)}</b><small>${esc(r.empId || '')} · ${esc(r.dept || '')}</small></td><td>${inr(r.salary)}<small>${inr(r.perDay)}/day</small></td>
      <td>${r.present}</td><td>${r.half}</td><td>${r.absent}</td><td>${r.leave}${r.unpaidLeave ? ` <em>(${r.unpaidLeave})</em>` : ''}</td><td>${r.late}${r.lateHalfDays ? ` <em>(${r.lateHalfDays})</em>` : ''}</td>
      <td class="sal-ot"><span title="${r.otFrom === 'register' ? 'Approved in Office › Overtime' : 'From the HR clock'}">${r.otLighthouse}${r.otFrom === 'register' ? ' <em>reg</em>' : ''}</span> + <input class="field" type="number" min="0" step="0.5" data-in="ot" value="${r.otTyped || ''}" placeholder="0"></td>
      <td>${inr(r.otPay)}</td><td class="neg" title="absent ${inr(r.ded.absent)} · half ${inr(r.ded.half)} · leave ${inr(r.ded.leave)} · late ${inr(r.ded.late)}">−${inr(r.deductions)}</td>
      <td><input class="field" type="number" step="100" data-in="adj" value="${r.adj || ''}" placeholder="0" title="${esc(r.note)}"></td><td class="net"><b>${inr(r.net)}</b></td></tr>`).join('')}</tbody></table>`
    : '<p class="none">No staff in the payroll for this month.</p>';
}
async function onSalInput(e) {
  const inp = e.target.closest('[data-in]'), tr = e.target.closest('tr[data-id]'); if (!inp || !tr) return;
  try { await api(`/api/salary/input?month=${SAL_MONTH}`, { id: tr.dataset.id, [inp.dataset.in]: inp.value }); await loadSalary(); } catch (err) { toast(err.message); }
}
async function onSalRule(e) {
  const inp = e.target.closest('[data-rule]'); if (!inp) return;
  try { await api(`/api/salary/rules?month=${SAL_MONTH}`, { [inp.dataset.rule]: inp.value }); await loadSalary(); toast('Rule saved — every month uses it'); } catch (err) { toast(err.message); }
}
function salCsv() {
  if (!SAL) return;
  const cols = ['name', 'empId', 'dept', 'salary', 'days', 'perDay', 'present', 'half', 'absent', 'leave', 'unpaidLeave', 'late', 'lateHalfDays', 'otLighthouse', 'otTyped', 'otHours', 'otPay', 'deductions', 'adj', 'net'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...SAL.rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `Salary ${SAL.month}.csv`; a.click();
}
window.openSalary = openSalary;
