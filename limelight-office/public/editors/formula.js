// formula.js - a small spreadsheet formula engine for the Grid editor.
// Cell refs (A1, $B$2), ranges (A1:C9), + - * / ^ & = <> < > <= >=, %, and the common functions.
// Anything it does not know falls back to the value Excel last saved for that cell.

export const colName = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
export const colNum = (s) => [...s.toUpperCase()].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
export const parseRef = (r) => { const m = /^\$?([A-Z]{1,3})\$?(\d+)$/i.exec(r); return m ? { c: colNum(m[1]), r: +m[2] } : null; };
export const refName = (c, r) => `${colName(c)}${r}`;

const ERR = (s) => ({ err: s });
const isErr = (v) => v && typeof v === 'object' && 'err' in v;

function tokenize(src) {
  const t = []; let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') { let j = i + 1, s = ''; while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j++]; } t.push({ k: 'str', v: s }); i = j + 1; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
    if (num) { t.push({ k: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
    const rng = /^\$?[A-Z]{1,3}\$?\d+:\$?[A-Z]{1,3}\$?\d+/i.exec(src.slice(i));
    if (rng) { t.push({ k: 'range', v: rng[0].replace(/\$/g, '').toUpperCase() }); i += rng[0].length; continue; }
    const id = /^[A-Z_][A-Z0-9_.]*/i.exec(src.slice(i));
    if (id) {
      const w = id[0].toUpperCase();
      if (src[i + id[0].length] === '(') t.push({ k: 'fn', v: w });
      else if (/^\$?[A-Z]{1,3}\$?\d+$/.test(w)) t.push({ k: 'ref', v: w.replace(/\$/g, '') });
      else if (w === 'TRUE' || w === 'FALSE') t.push({ k: 'bool', v: w === 'TRUE' });
      else t.push({ k: 'name', v: w });
      i += id[0].length; continue;
    }
    const $ref = /^\$[A-Z]{1,3}\$?\d+/i.exec(src.slice(i));
    if ($ref) { t.push({ k: 'ref', v: $ref[0].replace(/\$/g, '').toUpperCase() }); i += $ref[0].length; continue; }
    const op = /^(<=|>=|<>|[-+*/^&=<>(),:%;])/.exec(src.slice(i));
    if (op) { t.push({ k: 'op', v: op[0] === ';' ? ',' : op[0] }); i += op[0].length; continue; }
    throw new Error('bad token');
  }
  return t;
}

// evaluate formula text (without the leading "=") with get(ref) -> value
export function evaluate(src, get) {
  let toks, p = 0;
  try { toks = tokenize(src); } catch { return ERR('#ERROR!'); }
  const peek = () => toks[p], next = () => toks[p++];
  const want = (v) => { const t = next(); if (!t || t.v !== v) throw new Error(`expected ${v}`); };
  const num = (v) => { if (isErr(v)) throw v; if (Array.isArray(v)) v = v.flat()[0]; if (v === '' || v == null) return 0; if (typeof v === 'boolean') return +v; const n = +v; if (Number.isNaN(n)) throw ERR('#VALUE!'); return n; };
  const str = (v) => { if (isErr(v)) throw v; if (Array.isArray(v)) v = v.flat()[0]; return v == null ? '' : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v); };
  const range = (a) => { const [x, y] = a.split(':').map(parseRef); const out = []; for (let r = Math.min(x.r, y.r); r <= Math.max(x.r, y.r); r++) { const row = []; for (let c = Math.min(x.c, y.c); c <= Math.max(x.c, y.c); c++) row.push(get(refName(c, r))); out.push(row); } return out; };

  function expr() { return compare(); }
  function compare() {
    let a = concat();
    while (peek() && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) {
      const o = next().v, b = concat();
      const x = Array.isArray(a) ? a.flat()[0] : a, y = Array.isArray(b) ? b.flat()[0] : b;
      const [l, r] = typeof x === 'number' && typeof y === 'number' ? [x, y] : [str(x).toLowerCase(), str(y).toLowerCase()];
      a = { '=': l === r, '<>': l !== r, '<': l < r, '>': l > r, '<=': l <= r, '>=': l >= r }[o];
    }
    return a;
  }
  function concat() { let a = add(); while (peek()?.v === '&') { next(); a = str(a) + str(add()); } return a; }
  function add() { let a = mul(); while (peek() && (peek().v === '+' || peek().v === '-')) { const o = next().v, b = mul(); a = o === '+' ? num(a) + num(b) : num(a) - num(b); } return a; }
  function mul() { let a = pow(); while (peek() && (peek().v === '*' || peek().v === '/')) { const o = next().v, b = pow(); if (o === '/' && num(b) === 0) throw ERR('#DIV/0!'); a = o === '*' ? num(a) * num(b) : num(a) / num(b); } return a; }
  function pow() { let a = unary(); while (peek()?.v === '^') { next(); a = num(a) ** num(unary()); } return a; }
  function unary() { if (peek()?.v === '-') { next(); return -num(unary()); } if (peek()?.v === '+') { next(); return num(unary()); } let v = atom(); if (peek()?.v === '%') { next(); v = num(v) / 100; } return v; }
  function atom() {
    const t = next();
    if (!t) throw ERR('#ERROR!');
    if (t.k === 'num' || t.k === 'str' || t.k === 'bool') return t.v;
    if (t.k === 'ref') { const v = get(t.v); if (isErr(v)) throw v; return v; }
    if (t.k === 'range') return range(t.v);
    if (t.k === 'op' && t.v === '(') { const v = expr(); want(')'); return v; }
    if (t.k === 'fn') {
      next(); const args = [];
      if (peek()?.v !== ')') { args.push(lazyArg()); while (peek()?.v === ',') { next(); args.push(lazyArg()); } }
      want(')');
      return call(t.v, args);
    }
    if (t.k === 'name') throw ERR('#NAME?');
    throw ERR('#ERROR!');
  }
  // arguments are parsed now, but IF / IFERROR only evaluate the branch they need: keep each as a thunk over its tokens
  function lazyArg() {
    const start = p; let depth = 0;
    while (p < toks.length) { const v = toks[p].v; if (v === '(') depth++; else if (v === ')') { if (!depth) break; depth--; } else if (v === ',' && !depth) break; p++; }
    const slice = toks.slice(start, p);
    return () => { const saveT = toks, saveP = p; toks = slice; p = 0; try { const v = slice.length ? expr() : ''; if (p < toks.length) throw ERR('#ERROR!'); return v; } finally { toks = saveT; p = saveP; } };
  }
  const flat = (vals) => vals.flatMap((v) => (Array.isArray(v) ? v.flat() : [v]));
  // like Excel: text and blanks inside ranges are skipped
  const nums = (args) => flat(args.map((a) => a())).filter((v) => { if (isErr(v)) throw v; return typeof v === 'number'; });
  const crit = (c) => {
    const s = str(c), m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(s), o = m[1] || '=', val = m[2];
    const n = val !== '' && !Number.isNaN(+val) ? +val : null;
    return (v) => {
      if (n !== null && typeof v === 'number') return { '=': v === n, '<>': v !== n, '<': v < n, '>': v > n, '<=': v <= n, '>=': v >= n }[o];
      const a = str(v).toLowerCase(), b = val.toLowerCase();
      if (o === '=' && b.includes('*')) return new RegExp(`^${b.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(a);
      return { '=': a === b, '<>': a !== b, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b }[o];
    };
  };
  const round = (x, d, f = Math.round) => { const k = 10 ** d; return f(x * k) / k; };
  function call(fn, a) {
    const v = (i) => a[i]?.();
    switch (fn) {
      case 'SUM': return nums(a).reduce((s, x) => s + x, 0);
      case 'AVERAGE': { const n = nums(a); if (!n.length) throw ERR('#DIV/0!'); return n.reduce((s, x) => s + x, 0) / n.length; }
      case 'MIN': { const n = nums(a); return n.length ? Math.min(...n) : 0; }
      case 'MAX': { const n = nums(a); return n.length ? Math.max(...n) : 0; }
      case 'COUNT': return nums(a).length;
      case 'COUNTA': return flat(a.map((x) => x())).filter((x) => x !== '' && x != null).length;
      case 'COUNTBLANK': return flat(a.map((x) => x())).filter((x) => x === '' || x == null).length;
      case 'PRODUCT': return nums(a).reduce((s, x) => s * x, 1);
      case 'IF': return v(0) && v(0) !== '' && v(0) !== 0 ? (a[1] ? v(1) : true) : (a[2] ? v(2) : false);
      case 'IFERROR': try { const x = v(0); if (isErr(x)) throw x; return x; } catch { return v(1); }
      case 'AND': return flat(a.map((x) => x())).every(Boolean);
      case 'OR': return flat(a.map((x) => x())).some(Boolean);
      case 'NOT': return !v(0);
      case 'ROUND': return round(num(v(0)), num(v(1) ?? 0));
      case 'ROUNDUP': return round(num(v(0)), num(v(1) ?? 0), (x) => (x < 0 ? Math.floor(x) : Math.ceil(x)));
      case 'ROUNDDOWN': return round(num(v(0)), num(v(1) ?? 0), Math.trunc);
      case 'INT': return Math.floor(num(v(0)));
      case 'ABS': return Math.abs(num(v(0)));
      case 'MOD': return num(v(0)) % num(v(1));
      case 'SQRT': return Math.sqrt(num(v(0)));
      case 'POWER': return num(v(0)) ** num(v(1));
      case 'CONCAT': case 'CONCATENATE': return flat(a.map((x) => x())).map(str).join('');
      case 'LEN': return str(v(0)).length;
      case 'UPPER': return str(v(0)).toUpperCase();
      case 'LOWER': return str(v(0)).toLowerCase();
      case 'PROPER': return str(v(0)).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
      case 'TRIM': return str(v(0)).trim().replace(/\s+/g, ' ');
      case 'LEFT': return str(v(0)).slice(0, num(v(1) ?? 1));
      case 'RIGHT': { const s = str(v(0)), n = num(v(1) ?? 1); return n ? s.slice(-n) : ''; }
      case 'MID': return str(v(0)).substr(num(v(1)) - 1, num(v(2)));
      case 'TODAY': { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 864e5); }
      case 'NOW': return (Date.now() - Date.UTC(1899, 11, 30)) / 864e5 + 5.5 / 24;
      case 'SUMIF': { const r = flat([v(0)]), t = crit(v(1)), s = a[2] ? flat([v(2)]) : r; return r.reduce((acc, x, i) => acc + (t(x) && typeof s[i] === 'number' ? s[i] : 0), 0); }
      case 'COUNTIF': { const t = crit(v(1)); return flat([v(0)]).filter(t).length; }
      case 'AVERAGEIF': { const r = flat([v(0)]), t = crit(v(1)), s = a[2] ? flat([v(2)]) : r; const n = r.map((x, i) => (t(x) && typeof s[i] === 'number' ? s[i] : null)).filter((x) => x !== null); if (!n.length) throw ERR('#DIV/0!'); return n.reduce((x, y) => x + y, 0) / n.length; }
      case 'VLOOKUP': {
        const key = v(0), tbl = v(1), col = num(v(2)), approx = a[3] ? v(3) : true;
        if (!Array.isArray(tbl)) throw ERR('#N/A');
        const k = typeof key === 'number' ? key : str(key).toLowerCase();
        let hit = tbl.find((row) => (typeof k === 'number' ? row[0] === k : str(row[0]).toLowerCase() === k));
        if (!hit && approx && approx !== 0 && typeof k === 'number') hit = [...tbl].reverse().find((row) => typeof row[0] === 'number' && row[0] <= k);
        if (!hit) throw ERR('#N/A');
        return hit[col - 1] ?? ERR('#REF!');
      }
      default: throw ERR('#NAME?');
    }
  }
  try {
    const out = expr();
    if (p < toks.length) return ERR('#ERROR!');
    return Array.isArray(out) ? out.flat()[0] ?? 0 : out;
  } catch (e) { return isErr(e) ? e : ERR('#ERROR!'); }
}
export { isErr };

// move references when rows / columns are inserted or deleted (axis 'r' or 'c', at = first moved index, by = +n / -n)
export function shiftRefs(formula, axis, at, by) {
  return formula.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(])/gi, (m, d1, col, d2, row) => {
    let c = colNum(col), r = +row;
    if (axis === 'r' && r >= at) r += by;
    if (axis === 'c' && c >= at) c += by;
    if (r < 1 || c < 1) return '#REF!';
    return `${d1}${colName(c)}${d2}${r}`;
  });
}

// show a number the way its number format asks (General, 0.00, #,##0, ₹, %, dates)
export function formatValue(v, nf = '') {
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v !== 'number') return v == null ? '' : String(v);
  const f = String(nf || '');
  const dec = (/0\.(0+)/.exec(f)?.[1] || '').length;
  if (/[dmy]{2}/i.test(f) && !/0/.test(f)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 864e5));
    const dd = String(d.getUTCDate()).padStart(2, '0'), mm = String(d.getUTCMonth() + 1).padStart(2, '0'), yy = d.getUTCFullYear();
    if (/mmm/i.test(f)) return `${dd}-${d.toLocaleString('en', { month: 'short', timeZone: 'UTC' })}-${yy}`;
    return /^m/i.test(f) ? `${mm}/${dd}/${yy}` : `${dd}/${mm}/${yy}`;
  }
  if (f.includes('%')) return `${(v * 100).toFixed(dec)}%`;
  if (f.includes('#,##') || f.includes('₹') || f.includes('[$')) {
    const s = v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return f.includes('₹') ? `₹${s}` : s;
  }
  if (/^0(\.0+)?$/.test(f)) return v.toFixed(dec);
  if (Number.isInteger(v)) return String(v);
  return String(+v.toPrecision(10));
}
