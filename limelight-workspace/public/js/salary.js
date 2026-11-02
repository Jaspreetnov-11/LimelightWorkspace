// Limelight workspace - Office › Salary and Office › Attendance (admins): two pages the workspace draws itself, opened by
// openOffice (Office menu items type 'ws') into #wsPane. (Payroll stays the HR app's own page, a menu item of its own.)
//   Salary     - the month's pay for everyone, worked out by the server (salary.mjs) from Lighthouse's payroll figures,
//                with an OT box and an adjustment box per person, the rules on top, totals and a CSV download
//   Attendance - everyone's month day by day (P / ½ / A / L, late, WFH, holidays, week off) from the HR team summary
// Uses workspace.js ($, $$, api, esc, toast).
let SAL = null, SAL_MONTH = null, SAL_TAB = 'salary', ATT = null;
const inr = (n) => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const thisMonth = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 7);
const istToday = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

// the page frame both share: title, month box (one month for both pages), CSV button
function salPage(el, t, title, sub, body, load, csv) {
  SAL_MONTH ||= thisMonth(); SAL_TAB = t;
  el.innerHTML = `<div class="sal"><div class="sal-head"><div><h2>${title}</h2><p>${sub}</p></div>
    <label>Month <input type="month" class="field" id="salMonth" value="${SAL_MONTH}" max="${thisMonth()}"></label>
    <button class="btn sm" id="salCsv">Download CSV</button></div>${body}</div>`;
  $('#salMonth').onchange = (e) => { SAL_MONTH = e.target.value; load(); };
  $('#salCsv').onclick = csv;
  load();
}
async function openSalary(el) {
  salPage(el, 'salary', 'Salary', 'Worked out from attendance, leaves, late marks and OT · owners are not included',
    '<div class="sal-rules glass" id="salRules"></div><div class="sal-sum" id="salSum"></div><div class="sal-table glass" id="salTable"><p class="none">Loading…</p></div>', loadSalary, salCsv);
  $('#salTable').addEventListener('change', onSalInput);
  $('#salRules').addEventListener('change', onSalRule);
}
async function openAttendance(el) {
  salPage(el, 'attendance', 'Attendance', 'Everyone’s month, day by day · owners are not included',
    '<div class="sal-sum" id="attSum"></div><div class="att-key" id="attKey"></div><div class="sal-table att glass" id="attTable"><p class="none">Loading…</p></div>', loadAttendance, attCsv);
}
async function loadSalary() {
  const month = SAL_MONTH;
  try { SAL = await api(`/api/salary?month=${month}`); } catch (err) { if ($('#salTable')) $('#salTable').innerHTML = `<p class="none">${esc(err.message)}</p>`; return; }
  if (SAL_TAB === 'salary' && month === SAL_MONTH) drawSalary();
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
// ---------- Attendance tab ----------
async function loadAttendance() {
  const month = SAL_MONTH;
  try { ATT = await api(`/api/salary/attendance?month=${month}`); } catch (err) { if ($('#attTable')) $('#attTable').innerHTML = `<p class="none">${esc(err.message)}</p>`; return; }
  // a past working day with no punch and no absence is a leave day - shown as L only when those days add up to the
  // person's leave count (otherwise, e.g. days before they joined, it is just 'no record')
  const today = istToday();
  for (const s of ATT.staff) { s.leaveFits = false; const free = attDays().filter((x) => attCell(s, x.iso, x.wd, ATT.holidays.find((h) => h.date === x.iso), today)[0] === '–').length; s.leaveFits = free > 0 && free <= Math.ceil(+s.leave || 0); }
  if (SAL_TAB === 'attendance' && month === SAL_MONTH) drawAttendance();
}
// one person's day -> [letter, class, tooltip]
function attCell(s, iso, wd, hol, today) {
  const d = s.days.find((x) => x.date === iso), hm = (m) => (m ? `${Math.floor(m / 60)}h ${m % 60}m` : '');
  if (d && d.status !== 'absent') {
    const half = d.status === 'half', wfh = d.mode === 'wfh';
    const t = [half ? 'Half day' : 'Present', wfh && 'WFH', d.late && 'late', d.open ? 'not clocked out' : hm(d.mins)].filter(Boolean).join(' · ');
    return [half ? '½' : wfh ? 'W' : 'P', `${half ? 'half' : 'p'}${d.late ? ' late' : ''}`, t];
  }
  if (d || s.missed.includes(iso)) return ['A', 'a', 'Absent'];
  if (hol) return ['H', 'off', hol.name || 'Holiday'];
  if ((Array.isArray(s.weekOff) ? s.weekOff : [0]).includes(wd)) return ['', 'off', 'Week off'];
  if (iso >= today) return ['', '', ''];
  return s.leaveFits ? ['L', 'l', 'Leave'] : ['–', 'off', 'No record'];
}
function attDays() {
  const [y, m] = ATT.month.split('-').map(Number), n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => ({ iso: `${ATT.month}-${String(i + 1).padStart(2, '0')}`, d: i + 1, wd: new Date(y, m - 1, i + 1).getDay() }));
}
function drawAttendance() {
  const dates = attDays(), today = istToday(), hol = (iso) => ATT.holidays.find((h) => h.date === iso);
  const sum = (k) => ATT.staff.reduce((t, s) => t + (+s[k] || 0), 0);
  $('#attSum').innerHTML = [['Staff', ATT.staff.length], ['Working days so far', `${ATT.workdaysSoFar ?? '—'} / ${ATT.workdaysTotal ?? '—'}`], ['Absent days', sum('absent')], ['Late marks', sum('late')], ['OT hours', Math.round(sum('otHours') * 10) / 10]]
    .map(([l, v]) => `<div class="glass"><small>${l}</small><b>${v}</b></div>`).join('');
  $('#attKey').innerHTML = [['P', 'p', 'Present'], ['P', 'p late', 'Late'], ['W', 'p', 'WFH'], ['½', 'half', 'Half day'], ['A', 'a', 'Absent'], ['L', 'l', 'Leave'], ['H', 'off', 'Holiday']]
    .map(([c, k, l]) => `<span><i class="${k}">${c}</i>${l}</span>`).join('');
  const W = 'SMTWTFS';
  $('#attTable').innerHTML = ATT.staff.length ? `<table><thead><tr><th>Name</th>${dates.map((x) => `<th class="d${x.iso === today ? ' now' : ''}">${x.d}<small>${W[x.wd]}</small></th>`).join('')}
      <th>P</th><th>½</th><th>A</th><th>L</th><th>Late</th><th>OT h</th></tr></thead><tbody>${ATT.staff.map((s) => `<tr><td><b>${esc(s.name)}</b><small>${esc(s.empId || '')} · ${esc(s.dept || '')}</small></td>
      ${dates.map((x) => { const [c, k, t] = attCell(s, x.iso, x.wd, hol(x.iso), today); return `<td class="d"><i class="${k}" title="${esc(x.iso + (t ? ' · ' + t : ''))}">${c}</i></td>`; }).join('')}
      <td>${s.present}</td><td>${s.half}</td><td class="${s.absent ? 'neg' : ''}">${s.absent}</td><td>${s.leave}</td><td>${s.late ? `<em>${s.late}</em>` : 0}</td><td>${s.otHours || 0}</td></tr>`).join('')}</tbody></table>`
    : '<p class="none">No staff for this month.</p>';
}
function attCsv() {
  if (!ATT) return;
  const dates = attDays(), today = istToday(), q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = ATT.staff.map((s) => [s.name, s.empId, s.dept, ...dates.map((x) => { const c = attCell(s, x.iso, x.wd, ATT.holidays.find((h) => h.date === x.iso), today); return c[0] + (c[1].includes('late') ? '*' : ''); }),
    s.present, s.half, s.absent, s.leave, s.late, s.otHours]);
  const csv = [['Name', 'Emp ID', 'Department', ...dates.map((x) => x.d), 'Present', 'Half', 'Absent', 'Leave', 'Late', 'OT hours'], ...rows].map((r) => r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `Attendance ${ATT.month}.csv`; a.click();
}
function salCsv() {
  if (!SAL) return;
  const cols = ['name', 'empId', 'dept', 'salary', 'days', 'perDay', 'present', 'half', 'absent', 'leave', 'unpaidLeave', 'late', 'lateHalfDays', 'otLighthouse', 'otTyped', 'otHours', 'otPay', 'deductions', 'adj', 'net'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...SAL.rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `Salary ${SAL.month}.csv`; a.click();
}
window.openSalary = openSalary;
window.openAttendance = openAttendance;
