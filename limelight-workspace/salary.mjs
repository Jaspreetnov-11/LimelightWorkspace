// Limelight workspace - Salary (admins only): the month's pay for everyone, worked out from Lighthouse's own payroll
// figures (monthly salary, present / half day / absent / late / leave, OT hours) and its settings (OT rate, hours per
// day, leaves per year), plus what an admin types in here: extra OT hours and an adjustment (₹, + or -) per person.
//   per day   = salary / working days in the month          hourly = per day / hours per day
//   absent    -> 1 day each        half day -> 1/2 day each        leave beyond the paid ones -> 1 day each
//   late      -> every <latesPerHalfDay> lates = 1/2 day     OT pay = (Lighthouse OT + typed OT) x hourly x OT rate
//   net       = salary - deductions + OT pay + adjustment
// Rules: Data/salary/rules.json; typed OT / adjustments: Data/salary/<YYYY-MM>.json (by employee id).
import fs from 'node:fs';
import path from 'node:path';

export function createSalary({ root }) {
  const DIR = path.join(root, 'salary');
  fs.mkdirSync(DIR, { recursive: true });
  const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch { return d; } };
  const write = (f, v) => fs.writeFileSync(path.join(DIR, f), JSON.stringify(v, null, 1));
  const DEFAULT_RULES = { latesPerHalfDay: 3, paidLeavesPerMonth: null /* null: Lighthouse's leaves per year / 12 */, otMultiplier: null /* null: Lighthouse's OT rate */ };
  const rules = () => ({ ...DEFAULT_RULES, ...read('rules.json', {}) });
  const r2 = (n) => Math.round(n * 100) / 100;

  // otRegister: { employee id: approved hours } from the Overtime register (overtime.mjs) - for the people who use it,
  // those approved hours replace the HR app's own clock-based OT (so nothing is paid twice)
  function compute(payroll, settings, month, exclude = () => false, otRegister = {}) {
    const R = rules(), inputs = read(`${month}.json`, {});
    const hoursPerDay = +settings?.hoursPerDay || 8;
    // (Lighthouse's OT rate: a multiplier like 1.5 - or, when it is bigger than 5, rupees an hour)
    const otRate = R.otMultiplier ?? (+settings?.otRate || 1);
    const paidLeaves = R.paidLeavesPerMonth ?? Math.floor((+settings?.leavesPerYear || 12) / 12);
    const rows = (payroll?.rows || []).filter((x) => !exclude(x.employee)).map((x) => {
      const e = x.employee || {}, s = x.stats || {}, inp = inputs[e.id] || {};
      const salary = +e.salary || 0, days = +s.workdaysTotal || +payroll.workdaysTotal || 26;
      const perDay = days ? salary / days : 0, hourly = perDay / hoursPerDay;
      const absent = +s.absent || 0, half = +s.half || 0, leave = +s.leave || 0, late = +s.late || 0;
      const unpaidLeave = Math.max(0, leave - paidLeaves), lateHalfDays = R.latesPerHalfDay > 0 ? Math.floor(late / R.latesPerHalfDay) : 0;
      const ded = { absent: absent * perDay, half: half * 0.5 * perDay, leave: unpaidLeave * perDay, late: lateHalfDays * 0.5 * perDay };
      const fromRegister = e.id in otRegister, otAuto = fromRegister ? +otRegister[e.id] || 0 : +s.otHours || 0;
      const otHours = otAuto + (+inp.ot || 0);
      const otPay = otRate > 5 ? otHours * otRate : otHours * hourly * otRate;
      const adj = +inp.adj || 0, deductions = ded.absent + ded.half + ded.leave + ded.late;
      return { id: e.id, name: e.name, empId: e.empId, dept: e.dept, salary, days, perDay: r2(perDay),
        present: +s.present || 0, half, absent, leave, unpaidLeave, late, lateHalfDays,
        otLighthouse: otAuto, otFrom: fromRegister ? 'register' : 'hr', otTyped: +inp.ot || 0, otHours: r2(otHours), otPay: r2(otPay),
        deductions: r2(deductions), ded: Object.fromEntries(Object.entries(ded).map(([k, v]) => [k, r2(v)])), adj, note: inp.note || '',
        net: r2(Math.max(0, salary - deductions + otPay + adj)) };
    });
    const sum = (k) => r2(rows.reduce((n, r) => n + (r[k] || 0), 0));
    return { month, rules: { ...R, paidLeavesPerMonth: paidLeaves, otMultiplier: otRate, hoursPerDay }, workdaysTotal: payroll?.workdaysTotal,
      rows, total: { salary: sum('salary'), deductions: sum('deductions'), otPay: sum('otPay'), adj: sum('adj'), net: sum('net') } };
  }
  // typed in by an admin: { id, ot?, adj?, note? }
  function setInput(month, b) {
    const all = read(`${month}.json`, {}), cur = all[b.id] || {};
    for (const k of ['ot', 'adj']) if (b[k] !== undefined) cur[k] = Math.round((+b[k] || 0) * 100) / 100;
    if (b.note !== undefined) cur.note = String(b.note).slice(0, 200);
    all[b.id] = cur; write(`${month}.json`, all);
    return cur;
  }
  function setRules(b) {
    const R = read('rules.json', {});
    for (const k of ['latesPerHalfDay', 'paidLeavesPerMonth', 'otMultiplier']) if (k in b) R[k] = b[k] === '' || b[k] === null ? null : Math.max(0, +b[k] || 0);
    write('rules.json', R); return rules();
  }
  return { compute, setInput, setRules };
}
