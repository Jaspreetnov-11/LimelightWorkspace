// Tiny offline markdown renderer (no external libraries, HTML is always escaped).
(function () {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function inline(s) {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => /^(\/|https?:)/.test(u) ? `<img alt="${a}" src="${u}" style="max-width:100%;border-radius:10px">` : a);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => /^(\/|https?:|#)/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
  }

  // Local models sometimes answer in LaTeX; turn the common bits into readable plain text.
  function delatex(s) {
    return s.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, "$1").replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, "$1")
      .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
      .replace(/\\text\{([^}]*)\}/g, "$1").replace(/\\mathrm\{([^}]*)\}/g, "$1")
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
      .replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\approx/g, "≈").replace(/\\div/g, "÷")
      .replace(/\\le(q)?\b/g, "≤").replace(/\\ge(q)?\b/g, "≥").replace(/\\%/g, "%").replace(/\\,/g, " ")
      .replace(/\\;|\\!|\\quad/g, " ").replace(/\\rightarrow|\\to\b/g, "→");
  }

  function render(src) {
    const lines = delatex((src || "").replace(/\r/g, "")).split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      const fence = l.match(/^\s*```\s*([\w+-]*)/);
      if (fence) {
        const buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre><button class="copy">copy</button><code data-lang="${esc(fence[1])}">${esc(buf.join("\n"))}</code></pre>`);
        continue;
      }
      const h = l.match(/^(#{1,6})\s+(.*)/);
      if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
      if (/^\s*([-*_])\1\1+\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(l)) {
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
        const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        let html = "<table>";
        rows.forEach((r, k) => {
          if (k === 1 && /^[\s|:-]+$/.test(r)) return;
          const tag = k === 0 ? "th" : "td";
          html += "<tr>" + cells(r).map(c => `<${tag}>${inline(c)}</${tag}>`).join("") + "</tr>";
        });
        out.push(html + "</table>");
        continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) {
        const ordered = /^\s*\d/.test(l);
        const items = [];
        while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, "").replace(/^\[( |x)\]\s*/, (m, x) => x === "x" ? "☑ " : "☐ "));
          i++;
        }
        const t = ordered ? "ol" : "ul";
        out.push(`<${t}>` + items.map(x => `<li>${inline(x)}</li>`).join("") + `</${t}>`);
        continue;
      }
      if (/^\s*>/.test(l)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ""));
        out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
        continue;
      }
      if (!l.trim()) { i++; continue; }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^\s*(```|#{1,6}\s|\||[-*+]\s|\d+[.)]\s|>)/.test(lines[i])) buf.push(lines[i++]);
      if (!buf.length) buf.push(lines[i++]);
      out.push(`<p>${buf.map(inline).join("<br>")}</p>`);
    }
    return out.join("\n");
  }

  window.md = { render, esc };
})();
