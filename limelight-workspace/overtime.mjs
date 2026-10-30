// Overtime register: staff write their OT for each day (hours + what they worked on); every entry is checked against
// that day's clock-in / clock-out in the HR attendance (the HR rule: time from clock-in to clock-out beyond the
// working hours of a day is overtime); admins approve or reject. Approved hours are what Salary pays (salary.mjs).
// Kept in Data/overtime/<YYYY-MM>.json as a list of entries.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function createOvertime({ root }) {
  const DIR = path.join(root, 'overtime');
  fs.mkdirSync(DIR, { recursive: true });
  const file = (month) => path.join(DIR, `${month}.json`);
  const read = (month) => { try { return JSON.parse(fs.readFileSync(file(month), 'utf8')); } catch { return []; } };
  const write = (month, list) => fs.writeFileSync(file(month), JSON.stringify(list, null, 1));
  const r2 = (n) => Math.round((+n || 0) * 100) / 100;
  const toMins = (t) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; };

  // what the clock shows for a day: { in, out, worked (h), ot (h) } - or null without a clock-in
  function clockOf(rec, hoursPerDay = 8) {
    if (!rec?.clock_in) return null;
    const a = toMins(rec.clock_in), b = toMins(rec.clock_out);
    if (b === null) return { in: rec.clock_in, out: null, worked: null, ot: null };
    const worked = (b + (rec.out_next_day || b < a ? 1440 : 0) - a) / 60;
    return { in: rec.clock_in, out: rec.clock_out, nextDay: !!rec.out_next_day || b < a, worked: r2(worked), ot: r2(Math.max(0, worked - hoursPerDay)) };
  }
  // the check shown next to an entry (15 minutes of slack)
  function check(entry, clock) {
    if (!clock) return { state: 'none', text: 'No clock-in that day' };
    if (clock.out === null) return { state: 'wait', text: 'Not clocked out yet — checks after clock-out' };
    if (entry.hours <= clock.ot + 0.25) return { state: 'ok', text: `Matches clock-out (${clock.ot}h after a full day)` };
    return { state: 'over', text: `Clock-out shows only ${clock.ot}h of OT` };
  }

  function list(month, { emp } = {}) { return read(month).filter((e) => !emp || e.emp === emp).sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name)); }
  // a person writes (or changes) their OT for a day - one entry a day; a decided entry can no longer change
  function save(person, b) {
    const date = String(b.date || ''), hours = r2(b.hours), reason = String(b.reason || '').trim().slice(0, 300);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Object.assign(new Error('Pick a date'), { status: 400 });
    if (!(hours > 0 && hours <= 16)) throw Object.assign(new Error('Hours must be between 0 and 16'), { status: 400 });
    if (reason.length < 3) throw Object.assign(new Error('Write what you worked on'), { status: 400 });
    const month = date.slice(0, 7), all = read(month);
    let e = all.find((x) => x.emp === person.emp && x.date === date);
    if (e && e.status !== 'pending') throw Object.assign(new Error(`This day's OT is already ${e.status}`), { status: 409 });
    if (!e) { e = { id: crypto.randomBytes(6).toString('hex'), emp: person.emp, email: person.email, name: person.name, date, created: Date.now() }; all.push(e); }
    Object.assign(e, { hours, reason, status: 'pending', updated: Date.now() });
    write(month, all); return e;
  }
  function remove(person, month, id, admin) {
    const all = read(month), i = all.findIndex((x) => x.id === id);
    if (i < 0) throw Object.assign(new Error('Not found'), { status: 404 });
    if (!admin && (all[i].emp !== person.emp || all[i].status !== 'pending')) throw Object.assign(new Error('Only your own pending OT can be removed'), { status: 403 });
    all.splice(i, 1); write(month, all); return { ok: true };
  }
  // admin: approve (with hours, default the claim) or reject
  function review(by, month, id, b) {
    const all = read(month), e = all.find((x) => x.id === id);
    if (!e) throw Object.assign(new Error('Not found'), { status: 404 });
    if (!['approved', 'rejected', 'pending'].includes(b.status)) throw Object.assign(new Error('Bad status'), { status: 400 });
    e.status = b.status; e.approved = b.status === 'approved' ? r2(b.hours ?? e.hours) : 0;
    e.note = String(b.note || '').slice(0, 200); e.by = by; e.decided = Date.now();
    write(month, all); return e;
  }
  // approved hours a person, for Salary: { emp: hours } (only people who used the register this month)
  function approvedByEmp(month) {
    const out = {};
    for (const e of read(month)) { out[e.emp] ??= 0; if (e.status === 'approved') out[e.emp] = r2(out[e.emp] + (+e.approved || 0)); }
    return out;
  }
  return { list, save, remove, review, clockOf, check, approvedByEmp };
}
