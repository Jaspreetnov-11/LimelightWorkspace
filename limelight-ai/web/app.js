// Limelight AI front end. Talks only to the local server (same origin).
const $ = s => document.querySelector(s);
const esc = md.esc;

// Minimal line icons (stroke = currentColor). Used instead of emojis.
const ICONS = {
  chat: "M20 12a8 8 0 0 1-11.5 7.2L4 20l.9-4.2A8 8 0 1 1 20 12z",
  cowork: "M3 8h18v11H3z M8 8V5h8v3 M3 13h18",
  code: "M8 7l-5 5 5 5 M16 7l5 5-5 5",
  image: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M15.5 9.5h.01",
  plus: "M12 5v14 M5 12h14",
  clip: "M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1L13 4.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6",
  folder: "M3 6h6l2 2h10v11H3z",
  file: "M6 3h8l5 5v13H6z M14 3v5h5",
  up: "M12 19V6 M6 11l6-6 6 6",
  x: "M6 6l12 12 M18 6L6 18",
  refresh: "M20 12a8 8 0 1 1-2.4-5.7 M20 4v5h-5",
  warn: "M12 4l9 16H3z M12 10v4 M12 17h.01",
  newchat: "M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5 M17.5 3.5a2.1 2.1 0 0 1 3 3L13 14l-4 1 1-4z",
  film: "M3 5h18v14H3z M7 5v14 M17 5v14 M3 9.5h4 M3 14.5h4 M17 9.5h4 M17 14.5h4",
  bulb: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M5 11a7 7 0 0 0 14 0 M12 18v3",
  arrowup: "M12 19V5 M6 11l6-6 6 6",
  stop: "M7 7h10v10H7z",
  chev: "M6 9l6 6 6-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  bolt: "M13 3L5 13.5h6L10 21l8-10.5h-6z",
  menu: "M4 7h16 M4 12h16 M4 17h16",
  lock: "M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  arrowright: "M5 12h14 M13 6l6 6-6 6",
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;
document.querySelectorAll("[data-ic]").forEach(el => el.outerHTML = ic(el.dataset.ic));

// Brand mark. Style ids 1-30 are CSS "AI" treatments next to the wordmark; m1/m2 are image marks
// where the logo's own triangle forms the "A". Chosen on logo-options.html.
const LOGO_IMG = { m1: "logo-ai-slant.png", m2: "logo-ai-i.png" };
function brandHTML(big) {
  const id = document.documentElement.dataset.logo;
  const inner = LOGO_IMG[id]
    ? `<img class="logo" src="${LOGO_IMG[id]}" alt="Limelight AI">`
    : `<img class="logo" src="logo-mark.png" alt="Limelight"><span class="ai">AI</span>`;
  return `<span class="brand-mark${big ? " big" : ""}">${inner}</span>`;
}
document.querySelectorAll(".brand-mark").forEach(el => el.outerHTML = brandHTML(el.classList.contains("big")));
const S = {
  mode: localStorage.getItem("ll_mode") || "chat",
  conv: null, status: null, attachments: [], streaming: false, abort: null,
};

const SUGGEST = {
  chat: ["Draft a press release", "Write an email to the ministry", "Caption ideas for a post"],
  cowork: ["Summarise the PDFs in this folder", "Make an Excel tracker of these files", "Write a project report (.docx)"],
  code: ["Explain this project", "Find and fix bugs", "/init"],
};
const SLASH = [
  ["/clear", "Clear this conversation"],
  ["/init", "Scan the workspace and write LIMELIGHT.md (project memory)"],
  ["/review", "Review recent code in the workspace for bugs"],
  ["/compact", "Summarize this conversation and continue from the summary"],
  ["/image ", "Generate an image: /image a sunset over India Gate"],
  ["/help", "Show what Limelight AI can do"],
];

// ------------------------------------------------------------------ api
async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {},
    body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body,
  });
  if (r.status === 401) { showLogin(); throw new Error("login required"); }
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || r.statusText);
  return r.json();
}

async function* sse(path, body, signal) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  if (!r.ok) throw new Error(await r.text());
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      if (chunk.startsWith("data: ")) { try { yield JSON.parse(chunk.slice(6)); } catch {} }
    }
  }
}

// ------------------------------------------------------------------ auth
function showLogin() { $("#login").classList.remove("hidden"); }
$("#loginForm").onsubmit = async e => {
  e.preventDefault();
  try { await api("/api/login", { method: "POST", body: { password: $("#loginPw").value } }); location.reload(); }
  catch {
    $("#loginErr").textContent = "Wrong password, try again";
    const card = $("#loginForm"); card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
    $("#loginPw").select();
  }
};
$("#logoutBtn").onclick = async () => {
  await fetch("/api/logout", { method: "POST" }).catch(() => {});
  location.reload();
};
$("#loginEye").onclick = () => {
  const pw = $("#loginPw"), show = pw.type === "password";
  pw.type = show ? "text" : "password";
  $("#loginEye").classList.toggle("on", show);
  $("#loginEye").setAttribute("aria-label", show ? "Hide password" : "Show password");
  pw.focus();
};

// ------------------------------------------------------------------ status & models
async function refreshStatus() {
  try {
    S.status = await api("/api/status");
  } catch { return; }
  const o = S.status.engine || S.status.ollama;
  $("#statusLine").innerHTML = o.running
    ? `<span class="dot ok-dot" title="Engine ready"></span>`
    : `<span class="dot bad-dot" title="Engine offline"></span>`;
  // "Auto" (the default) lets the server pick the best model per message; a manual pick is remembered per mode.
  renderModelPicker(S.conv?.model || (S.pick || {})[S.mode] || defaultModel());
  if (!$("#wsInput").value) $("#wsInput").value = localStorage.getItem("ll_ws") || S.status.default_workspace;
  const im = S.status.images;
  $("#imgStatus").textContent = im.available ? (im.cuda ? `GPU: ${im.gpu}` : "CPU mode (slow)") : im.reason;
  if ($("#settingsDlg").open) renderSettings();
}

// The picker shows what each model is good at, not model names. #modelSel (hidden) keeps the value for the rest of the app.
const ROLES = [
  { key: "auto", label: "Auto", hint: "Picks the best model for each message", icon: "spark" },
  { key: "chat", label: "Best for text", hint: "Writing, Hinglish, reasoning", icon: "chat" },
  { key: "fast", label: "Fastest", hint: "Quick, short replies", icon: "bolt" },
  { key: "code", label: "Best for code", hint: "Reading and writing code", icon: "code" },
  { key: "vision", label: "Best for photos", hint: "Reads images you attach", icon: "image" },
];
const KNOWN = { "gpt-oss-20b": { label: "Deep thinking", hint: "Slower, careful answers", icon: "chat" } };
// Engine names have no ":"; picks saved before the switch from Ollama ("qwen3:8b") mean the same model.
const norm = v => !v || v === "auto" ? v : v.toLowerCase().replace(":", "-");
function pickerOptions() {
  const d = S.status?.defaults || {}, have = (S.status?.engine || S.status?.ollama)?.models || [];
  const seen = new Set();  // one row per model: when two roles share a model, the first role names it
  const opts = ROLES.map(r => ({ ...r, value: r.key === "auto" ? "auto" : d[r.key] }))
    .filter(o => (o.value === "auto" || have.includes(o.value)) && !seen.has(o.value) && seen.add(o.value));
  // Anything else that was downloaded (embedding models can't chat, so they stay out).
  for (const m of have) if (!seen.has(m) && !/embed/i.test(m)) opts.push({ ...(KNOWN[m] || { label: m.replace(/-/g, " "), hint: "Other model", icon: "chat" }), value: m });
  return opts;
}
function renderModelPicker(cur) {
  cur = norm(cur);
  const opts = pickerOptions();
  if (!opts.some(o => o.value === cur)) opts.push({ label: cur, hint: "Not downloaded", icon: "warn", value: cur });
  $("#modelSel").innerHTML = opts.map(o => `<option value="${esc(o.value)}" ${o.value === cur ? "selected" : ""}></option>`).join("");
  const sel = opts.find(o => o.value === cur);
  $("#mpickLabel").textContent = sel.label;
  $("#mpickMenu").innerHTML = opts.map(o => `<button type="button" role="option" class="mpick-opt${o.value === cur ? " sel" : ""}" data-v="${esc(o.value)}" aria-selected="${o.value === cur}">
      ${ic(o.icon)}<span class="mpick-txt"><b>${esc(o.label)}</b><small>${esc(o.hint)}</small></span>${o.value === cur ? ic("check") : ""}</button>`).join("");
}
// What a pick actually loads (Auto = this mode's best model), for warming it up ahead of the first message.
const resolveModel = v => v === "auto" ? ({ chat: S.status?.defaults.chat, code: S.status?.defaults.code }[S.mode] || S.status?.defaults.agent) : v;
function closePicker() { $("#mpickMenu").classList.add("hidden"); $("#mpickBtn").setAttribute("aria-expanded", "false"); }
$("#mpickBtn").onclick = e => {
  e.stopPropagation();
  const open = $("#mpickMenu").classList.toggle("hidden") === false;
  $("#mpickBtn").setAttribute("aria-expanded", String(open));
};
$("#mpickMenu").onclick = e => {
  const b = e.target.closest(".mpick-opt");
  if (!b) return;
  closePicker();
  renderModelPicker(b.dataset.v);
  $("#modelSel").dispatchEvent(new Event("change"));
};
document.addEventListener("click", e => { if (!e.target.closest("#mpick")) closePicker(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closePicker(); });

// ------------------------------------------------------------------ settings
// Everything here is a per-browser preference (localStorage); it fills the same controls the chat screen uses.
const defaultModel = () => localStorage.getItem("ll_defmodel") || "auto";
function renderSettings() {
  const def = norm(defaultModel()), opts = pickerOptions();
  if (!opts.some(o => o.value === def)) opts.unshift({ label: def, hint: "Not installed", icon: "warn", value: def });
  $("#setModel").innerHTML = opts.map(o => `<button type="button" role="option" class="mpick-opt${o.value === def ? " sel" : ""}" data-v="${esc(o.value)}" aria-selected="${o.value === def}">
      ${ic(o.icon)}<span class="mpick-txt"><b>${esc(o.label)}</b><small>${esc(o.hint)}</small></span>${o.value === def ? ic("check") : ""}</button>`).join("");
  $("#setThink").checked = $("#thinkChk").checked;
  document.querySelectorAll("#setPerm button").forEach(b => b.classList.toggle("on", b.dataset.v === $("#permSel").value));
  $("#setWs").value = localStorage.getItem("ll_ws") || S.status?.default_workspace || "";
  const o = S.status?.engine || S.status?.ollama, im = S.status?.images;
  const chatModels = (o?.models || []).filter(m => !/embed/i.test(m)).length;
  $("#setInfo").innerHTML = [
    `<span class="dot ${o?.running ? "ok-dot" : "bad-dot"}"></span>AI engine ${o?.running ? "ready" : "offline"}`,
    `${chatModels} models installed`,
    im?.available ? (im.cuda ? `Images on ${esc(im.gpu)}` : "Images on CPU (slow)") : "Images not set up",
  ].map(t => `<span>${t}</span>`).join("<span>·</span>");
}
$("#settingsBtn").onclick = () => { $("#profileMenu").classList.add("hidden"); renderSettings(); $("#settingsDlg").showModal(); };
$("#setModel").onclick = e => {
  const b = e.target.closest(".mpick-opt");
  if (!b) return;
  localStorage.setItem("ll_defmodel", b.dataset.v);
  renderSettings();
  // A chat that hasn't started yet (and has no manual pick) takes the new default straight away.
  if (!S.conv && !(S.pick || {})[S.mode]) { renderModelPicker(b.dataset.v); warm(b.dataset.v); }
};
$("#setThink").onchange = () => { $("#thinkChk").checked = $("#setThink").checked; $("#thinkChk").dispatchEvent(new Event("change")); };
$("#setPerm").onclick = e => {
  const b = e.target.closest("button");
  if (!b) return;
  $("#permSel").value = b.dataset.v;
  $("#permSel").dispatchEvent(new Event("change"));
  renderSettings();
};
$("#setWs").onchange = () => {
  const ws = $("#setWs").value.trim();
  localStorage.setItem("ll_ws", ws);
  if (!S.conv) { $("#wsInput").value = ws; loadFiles(); }
};

// ------------------------------------------------------------------ modes & conversations
function setMode(mode) {
  S.mode = mode; localStorage.setItem("ll_mode", mode);
  S.conv = null;
  if (S.status) refreshStatus();  // switch the model dropdown to this mode's default
  document.querySelectorAll(".mode").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  const studio = mode === "images" || mode === "video";
  $("#chatView").classList.toggle("hidden", studio);
  $("#imagesView").classList.toggle("hidden", mode !== "images");
  $("#videoView").classList.toggle("hidden", mode !== "video");
  document.querySelectorAll(".agent-only").forEach(el => el.classList.toggle("hidden", mode === "chat"));
  $("#sidePanel").classList.toggle("hidden", mode === "chat" || studio);
  $("#input").placeholder = { chat: "Ask Limelight", cowork: "Describe the task", code: "Describe the change" }[mode] || "";
  if (mode === "images") loadGallery();
  else if (mode === "video") openVideo();
  else newConversation();
  loadConvList();
}
document.querySelectorAll(".mode").forEach(b => b.onclick = () => setMode(b.dataset.mode));
$("#newBtn").onclick = () => (S.mode === "images" || S.mode === "video") ? setMode("chat") : newConversation();

async function loadConvList() {
  const all = await api("/api/conversations").catch(() => []);
  loadProjects(all);
  const list = (S.mode === "images" || S.mode === "video") ? [] : all.filter(c => c.mode === S.mode);
  $("#convList").innerHTML = list.map(c =>
    `<div class="conv ${S.conv?.id === c.id ? "active" : ""}" data-id="${c.id}"><span class="t">${esc(c.title)}</span><button class="x" data-del="${c.id}" title="Delete">${ic("x")}</button></div>`).join("")
    || `<div class="proj-empty">Nothing yet</div>`;
  $("#convList").querySelectorAll(".conv").forEach(el => el.onclick = e => {
    const del = e.target.closest("[data-del]");
    if (del) { delConv(del.dataset.del); return; }
    openConversation(el.dataset.id);
  });
}

// Projects = workspace folders used in Work/Build. Clicking one starts a new task in that folder.
function loadProjects(all) {
  const seen = new Map();
  for (const c of all) if (c.mode !== "chat" && c.workspace && !seen.has(c.workspace)) seen.set(c.workspace, c.mode);
  const name = p => p.replace(/[\\/]+$/, "").split(/[\\/]/).pop();
  $("#projList").innerHTML = [...seen].slice(0, 8).map(([ws, mode]) =>
    `<div class="proj" data-ws="${esc(ws)}" data-mode="${mode}" title="${esc(ws)}">${ic("folder")}${esc(name(ws))}</div>`).join("")
    || `<div class="proj-empty">No projects</div>`;
  $("#projList").querySelectorAll(".proj").forEach(el => el.onclick = () => {
    localStorage.setItem("ll_ws", el.dataset.ws);
    $("#wsInput").value = el.dataset.ws;
    if (S.mode !== el.dataset.mode) setMode(el.dataset.mode); else newConversation();
    $("#wsInput").value = el.dataset.ws;
    loadFiles();
  });
}

$("#recentsToggle").onclick = () => {
  const off = $("#recentsToggle").classList.toggle("collapsed");
  $("#convList").classList.toggle("hidden", off);
};

// Profile menu (bottom-left)
function setProfile(name) {
  $("#pname").textContent = name;
  $("#avatar").textContent = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";
}
setProfile(localStorage.getItem("ll_name") || "Jaspreet Singh");
$("#profileBtn").onclick = e => { e.stopPropagation(); $("#profileMenu").classList.toggle("hidden"); };
document.addEventListener("click", e => { if (!e.target.closest(".profile-wrap")) $("#profileMenu").classList.add("hidden"); });
$("#profileMenu").addEventListener("click", () => setTimeout(() => $("#profileMenu").classList.add("hidden")));
$("#editNameBtn").onclick = () => {
  const n = prompt("Your name", $("#pname").textContent);
  if (n && n.trim()) { localStorage.setItem("ll_name", n.trim()); setProfile(n.trim()); }
  $("#profileMenu").classList.add("hidden");
};

// Voice typing: records in the browser, transcribed by local Whisper on this PC (no cloud).
let rec = null;
$("#micBtn").onclick = async () => {
  const btn = $("#micBtn");
  if (rec) { rec.stop(); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch { alert("Microphone not available or permission denied."); return; }
  const chunks = [];
  rec = new MediaRecorder(stream);
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    stream.getTracks().forEach(t => t.stop());
    rec = null;
    btn.classList.remove("rec"); btn.classList.add("busy");
    try {
      const fd = new FormData();
      fd.append("file", new Blob(chunks, { type: "audio/webm" }), "voice.webm");
      const r = await api("/api/transcribe", { method: "POST", body: fd });
      if (r.text) { input.value = (input.value ? input.value + " " : "") + r.text; autosize(); input.focus(); }
    } catch (err) { alert("Voice typing failed: " + err.message); }
    btn.classList.remove("busy");
  };
  rec.start();
  btn.classList.add("rec");
};

async function delConv(id) {
  if (!confirm("Delete this conversation?")) return;
  await api("/api/conversations/" + id, { method: "DELETE" });
  if (S.conv?.id === id) newConversation();
  loadConvList();
}

function newConversation() {
  S.conv = null;
  $("#convTitle").textContent = { chat: "New question", cowork: "New work task", code: "New build" }[S.mode];
  renderEmpty();
  renderTodos([]);
  loadFiles();
  $("#input").focus();
}

async function openConversation(id) {
  S.conv = await api("/api/conversations/" + id);
  $("#convTitle").textContent = S.conv.title;
  if (S.mode !== "chat") $("#wsInput").value = S.conv.workspace;
  await refreshStatus();
  renderHistory(S.conv.messages);
  renderTodos(S.conv.todos);
  loadFiles();
  loadConvList();
}

async function ensureConversation() {
  if (S.conv) return S.conv;
  const ws = $("#wsInput").value.trim();
  if (ws) localStorage.setItem("ll_ws", ws);
  S.conv = await api("/api/conversations", { method: "POST", body: { mode: S.mode, model: $("#modelSel").value, workspace: S.mode === "chat" ? "" : ws } });
  return S.conv;
}

$("#wsInput").onchange = async () => {
  const ws = $("#wsInput").value.trim();
  localStorage.setItem("ll_ws", ws);
  if (S.conv) S.conv = await api("/api/conversations/" + S.conv.id, { method: "PATCH", body: { workspace: ws } });
  loadFiles();
};
const warm = m => (m = resolveModel(m)) && api("/api/models/warm", { method: "POST", body: { model: m } }).catch(() => {});
$("#modelSel").addEventListener("change", () => {
  S.pick = { ...(S.pick || {}), [S.mode]: $("#modelSel").value };
  warm($("#modelSel").value);
});
$("#modelSel").onchange = () => S.conv && api("/api/conversations/" + S.conv.id, { method: "PATCH", body: { model: $("#modelSel").value } });
$("#permSel").value = localStorage.getItem("ll_perm") || "ask";
$("#permSel").onchange = () => localStorage.setItem("ll_perm", $("#permSel").value);
$("#thinkChk").checked = localStorage.getItem("ll_think") === "1";
$("#thinkChk").onchange = () => localStorage.setItem("ll_think", $("#thinkChk").checked ? "1" : "0");

// ------------------------------------------------------------------ rendering
const box = () => $("#messages");
function scrollDown(force) {
  const m = box();
  if (force || m.scrollHeight - m.scrollTop - m.clientHeight < 200) m.scrollTop = m.scrollHeight;
}

function renderEmpty() {
  const tag = { chat: "What can I help with?", cowork: "What should we get done?", code: "What are we building?" }[S.mode];
  box().innerHTML = `<div class="empty">${brandHTML(true)}
    <p class="sub muted">${tag}</p>
    <div class="suggest">${SUGGEST[S.mode].map(s => `<button>${esc(s)}</button>`).join("")}</div></div>`;
  box().querySelectorAll(".suggest button").forEach(b => b.onclick = () => { $("#input").value = b.textContent; autosize(); $("#input").focus(); });
}

function addUser(text, files) {
  if (box().querySelector(".empty")) box().innerHTML = "";
  const d = document.createElement("div");
  d.className = "msg user";
  d.innerHTML = `<div class="bubble">${esc(text)}${files ? `<div class="muted small">${ic("clip")} ${esc(files)}</div>` : ""}</div>`;
  box().appendChild(d);
}

function addTurn() {
  const d = document.createElement("div");
  d.className = "msg assistant";
  d.innerHTML = `<div class="bubble"></div>`;
  box().appendChild(d);
  return { root: d.querySelector(".bubble"), text: null, raw: "", think: null, thinkRaw: "", tools: {} };
}

function setText(turn, add, final) {
  if (!turn.text) {
    turn.text = document.createElement("div");
    turn.root.appendChild(turn.text);
    turn.raw = "";
  }
  turn.raw += add;
  turn.text.innerHTML = md.render(stripThink(turn.raw));
  turn.text.classList.toggle("cursor", !final);
  wireCopy(turn.text);
}
const stripThink = s => s.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trimStart();

function setThinking(turn, add) {
  if (!turn.think) {
    turn.think = document.createElement("details");
    turn.think.className = "thinking";
    turn.think.innerHTML = `<summary>Thinking…</summary><div></div>`;
    turn.root.appendChild(turn.think);
  }
  turn.thinkRaw += add;
  turn.think.querySelector("div").textContent = turn.thinkRaw;
}

function argSummary(name, a) {
  return a.command || a.path || a.pattern || a.prompt || (name === "todo_write" ? `${(a.todos || []).length} tasks` : JSON.stringify(a));
}

function addTool(turn, id, name, args) {
  if (turn.text) turn.text.classList.remove("cursor");
  turn.text = null; turn.think = null; turn.thinkRaw = "";
  const d = document.createElement("details");
  d.className = "tool";
  // Picture tools read as plain words; the full prompt stays inside the card for anyone curious.
  const pic = PIC_TOOLS[name];
  const arg = pic ? (args?.prompt || args?.instruction || (args?.texts || []).map(t => t.text).join(" · ") || "") : argSummary(name, args || {});
  d.innerHTML = `<summary>${pic ? ic("image") : ""}<span class="name">${esc(pic || name)}</span><span class="arg">${esc(String(arg))}</span><span class="st run">${pic ? "working…" : "running…"}</span></summary><pre></pre>`;
  turn.root.appendChild(d);
  turn.tools[id] = d;
  return d;
}

function finishTool(el, ok, result) {
  const st = el.querySelector(".st");
  st.className = "st " + (ok ? "ok" : "err");
  st.textContent = ok ? "done" : "failed";
  el.querySelector("pre").textContent = result;
  const img = ok && result.match(/\/images\/img_\d+\.png/);
  if (img) el.insertAdjacentHTML("afterend", `<a class="chat-img" href="${img[0]}" target="_blank" rel="noopener" title="Open full size"><img src="${img[0]}" alt="Generated picture"></a>`);
}
const PIC_TOOLS = { generate_image: "Creating image", edit_image: "Editing image", add_text_to_image: "Adding text" };

function previewArgs(name, a) {
  if (name === "run_command") return a.command;
  if (name === "edit_file") return `${a.path}\n\n- ${String(a.old_string).split("\n").join("\n- ")}\n\n+ ${String(a.new_string).split("\n").join("\n+ ")}`;
  if (name === "write_file") return `${a.path}\n\n${String(a.content).slice(0, 3000)}`;
  return JSON.stringify(a, null, 2).slice(0, 3000);
}

function addApproval(turn, ev) {
  const d = document.createElement("div");
  d.className = "approval";
  d.innerHTML = `<div><b>Allow ${esc(ev.name)}?</b></div><pre>${esc(previewArgs(ev.name, ev.args))}</pre>
    <div class="acts"><button class="btn primary" data-a="1">Allow</button><button class="btn" data-a="all">Allow all this session</button><button class="btn" data-a="0">Deny</button></div>`;
  turn.root.appendChild(d);
  d.querySelectorAll("button").forEach(b => b.onclick = async () => {
    const a = b.dataset.a;
    if (a === "all") { $("#permSel").value = ev.name === "run_command" ? "auto" : "auto-edit"; localStorage.setItem("ll_perm", $("#permSel").value); }
    await api("/api/approve", { method: "POST", body: { id: ev.id, approved: a !== "0", conversation: S.conv?.id || "",
      permission: a === "all" ? $("#permSel").value : "" } });
    d.innerHTML = `<span class="muted small">${a === "0" ? "Denied" : "Allowed"} ${esc(ev.name)}</span>`;
  });
  scrollDown(true);
}

function wireCopy(el) {
  el.querySelectorAll(".copy").forEach(b => b.onclick = () => {
    navigator.clipboard.writeText(b.nextElementSibling.textContent);
    b.textContent = "copied"; setTimeout(() => b.textContent = "copy", 1200);
  });
}

function renderHistory(msgs) {
  box().innerHTML = "";
  if (!msgs.length) return renderEmpty();
  let turn = null; const queue = [];
  for (const m of msgs) {
    if (m.role === "user") { addUser(m.content, m.images ? m.images[0] : ""); turn = null; continue; }
    if (!turn) turn = addTurn();
    if (m.role === "assistant") {
      if (m.content) setText(turn, m.content, true);
      (m.tool_calls || []).forEach((c, i) => {
        const id = "h" + Math.random();
        queue.push(addTool(turn, id, c.function.name, c.function.arguments));
      });
    } else if (m.role === "tool") {
      const el = queue.shift();
      if (el) finishTool(el, !m.content.startsWith("Error"), m.content);
    }
  }
  box().querySelectorAll(".thinking summary").forEach(s => s.textContent = "Thought process");
  scrollDown(true);
}

function renderTodos(todos) {
  $("#todoList").innerHTML = (todos || []).length
    ? todos.map(t => `<div class="td ${t.status}"><span class="mark"></span><span>${esc(t.content)}</span></div>`).join("")
    : "No tasks yet";
}

async function loadFiles(path = ".") {
  if (S.mode === "chat" || S.mode === "images") return;
  const ws = S.conv?.workspace || $("#wsInput").value.trim();
  if (!ws) return;
  const seq = S.filesSeq = (S.filesSeq || 0) + 1;
  try {
    const items = await api(`/api/files?workspace=${encodeURIComponent(ws)}&path=${encodeURIComponent(path)}`);
    if (seq !== S.filesSeq) return; // a newer listing was requested meanwhile
    const up = path !== "." ? `<div data-p="${esc(path.split("/").slice(0, -1).join("/") || ".")}" data-d="1">${ic("up")} ..</div>` : "";
    $("#fileTree").innerHTML = up + (items.map(i => `<div data-p="${esc(i.path)}" data-d="${i.dir ? 1 : ""}">${ic(i.dir ? "folder" : "file")}${esc(i.name)}</div>`).join("") || `<span class="muted">empty folder</span>`);
    $("#fileTree").querySelectorAll("div").forEach(d => d.onclick = () => d.dataset.d
      ? loadFiles(d.dataset.p)
      : window.open(`/api/files?workspace=${encodeURIComponent(ws)}&path=${encodeURIComponent(d.dataset.p)}`, "_blank"));
  } catch (e) { $("#fileTree").textContent = e.message; }
}
$("#refreshFiles").onclick = () => loadFiles();
$("#filesBtn").onclick = () => $("#sidePanel").classList.toggle("hidden");
$("#openFolder").onclick = () => api("/api/open-folder", { method: "POST", body: { path: S.conv?.workspace || $("#wsInput").value } });

// ------------------------------------------------------------------ sending
async function send(textOverride) {
  if (S.streaming) return;
  let text = (textOverride ?? $("#input").value).trim();
  if (!text && !S.attachments.length) return;

  // slash commands
  if (text === "/clear") { if (S.conv) await api(`/api/conversations/${S.conv.id}/clear`, { method: "POST" }); $("#input").value = ""; renderEmpty(); renderTodos([]); return; }
  if (text === "/help") { $("#input").value = ""; addUser("/help"); const t = addTurn(); setText(t, HELP, true); return; }
  if (text === "/image") { $("#input").value = "/image "; $("#input").focus(); return; }
  // In Chat the picture tools stream progress, so a slow first load can't time out behind Cloudflare (100 s limit).
  if (text.startsWith("/image ") && S.mode === "chat") text = "Make a picture: " + text.slice(7).trim();
  else if (text.startsWith("/image ")) { $("#input").value = ""; setMode("images"); $("#imgPrompt").value = text.slice(7); $("#imgForm").requestSubmit(); return; }
  if (text === "/init") text = "Explore this workspace (list_dir, glob, read key files) and write a LIMELIGHT.md file at the workspace root describing: what this project is, folder structure, how to run/build/test it, coding conventions, and important notes. Keep it concise.";
  if (text === "/review") text = "Review the code in this workspace for bugs, security issues and bad practices. Read the main files, then give a prioritized list with file:line references. Do not edit anything.";
  if (text === "/compact") text = "Summarize our whole conversation so far in a compact form: goals, decisions, files changed, current state, and next steps. This summary will replace the history.";

  const conv = await ensureConversation();
  const files = S.attachments.map(a => a.name).join(", ");
  const docs = S.attachments.filter(a => a.text).map(a => `\n\n<file name="${a.name}">\n${a.text}\n</file>`).join("");
  const images = S.attachments.filter(a => a.b64).map(a => a.b64);
  addUser(text, files);
  $("#input").value = ""; autosize();
  S.attachments = []; renderAttach();

  const turn = addTurn();
  setText(turn, "", false);
  S.streaming = true; toggleSend();
  scrollDown(true);
  S.abort = new AbortController();
  const compacting = text.startsWith("Summarize our whole conversation");
  let summary = "";
  try {
    for await (const ev of sse(`/api/conversations/${conv.id}/chat`, {
      message: text + docs, images, model: $("#modelSel").value, permission: $("#permSel").value,
      think: $("#thinkChk").checked ? true : null,
    }, S.abort.signal)) {
      if (ev.type === "token") { setText(turn, ev.text); summary += ev.text; }
      else if (ev.type === "thinking") { /* reasoning stays hidden; the cursor shows it's working */ }
      else if (ev.type === "tool_call") addTool(turn, ev.id, ev.name, ev.args);
      else if (ev.type === "tool_result") { const el = turn.tools[ev.id]; if (el) finishTool(el, ev.ok, ev.result); if (/write|edit|create|image|run/.test(ev.name)) loadFiles(); }
      else if (ev.type === "approval") addApproval(turn, ev);
      else if (ev.type === "todos") renderTodos(ev.todos);
      else if (ev.type === "error") turn.root.insertAdjacentHTML("beforeend", `<div class="err">${ic("warn")} ${esc(ev.text)}</div>`);
      else if (ev.type === "notice") turn.root.insertAdjacentHTML("afterbegin", `<div class="loading-note">${esc(ev.text)}</div>`);
      scrollDown();
    }
  } catch (e) {
    if (e.name !== "AbortError") turn.root.insertAdjacentHTML("beforeend", `<div class="err">${ic("warn")} ${esc(e.message)}</div>`);
  }
  if (turn.text) turn.text.classList.remove("cursor");
  turn.root.querySelectorAll(".thinking summary").forEach(s => s.textContent = "Thought process");
  turn.root.querySelectorAll(".st.run").forEach(s => { s.className = "st err"; s.textContent = "stopped"; });
  S.streaming = false; toggleSend();
  if (compacting && summary.trim()) {
    await api(`/api/conversations/${conv.id}/clear`, { method: "POST" });
    S.conv.messages = [];
    box().insertAdjacentHTML("beforeend", `<div class="muted small center">— conversation compacted; next message continues from the summary —</div>`);
    S.pendingSummary = summary;
  }
  const fresh = await api("/api/conversations/" + conv.id).catch(() => null);
  if (fresh) { S.conv = fresh; $("#convTitle").textContent = fresh.title; }
  loadConvList();
}

// After /compact, prepend the summary to the next message.
const _send = send;
send = async (t) => {
  if (S.pendingSummary && !S.streaming && $("#input").value.trim()) {
    $("#input").value = `Context from earlier (summary):\n${S.pendingSummary}\n\n---\n${$("#input").value}`;
    S.pendingSummary = null;
  }
  return _send(t);
};

function toggleSend() {
  $("#sendBtn").classList.toggle("hidden", S.streaming);
  $("#stopBtn").classList.toggle("hidden", !S.streaming);
}
$("#sendBtn").onclick = () => send();
$("#stopBtn").onclick = async () => {
  if (S.conv) await api(`/api/conversations/${S.conv.id}/stop`, { method: "POST" }).catch(() => {});
  setTimeout(() => S.abort?.abort(), 1500);
};

// composer
const input = $("#input");
function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 240) + "px"; }
let slashSel = 0;
input.addEventListener("input", () => { autosize(); slashMenu(); });
input.addEventListener("keydown", e => {
  const menu = $("#slashMenu");
  if (!menu.classList.contains("hidden")) {
    const items = menu.querySelectorAll("div");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); slashSel = (slashSel + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; slashMenu(); return; }
    if (e.key === "Tab" || (e.key === "Enter" && items.length && input.value.trim() !== items[slashSel].dataset.c.trim())) { e.preventDefault(); items[slashSel]?.click(); return; }
    if (e.key === "Escape") { menu.classList.add("hidden"); return; }
  }
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#slashMenu").classList.add("hidden"); send(); }
});
function slashMenu() {
  const v = input.value;
  const menu = $("#slashMenu");
  // Once the command is followed by a space the user is typing its argument: the menu would only steal Enter.
  if (!v.startsWith("/") || /\s/.test(v)) { menu.classList.add("hidden"); return; }
  const items = SLASH.filter(([c]) => c.startsWith(v.split(" ")[0]) || v === "/");
  if (!items.length) { menu.classList.add("hidden"); return; }
  slashSel = Math.min(slashSel, items.length - 1);
  menu.innerHTML = items.map(([c, d], i) => `<div data-c="${c}" class="${i === slashSel ? "sel" : ""}"><b>${c.trim()}</b> <span class="muted small">${d}</span></div>`).join("");
  menu.classList.remove("hidden");
  menu.querySelectorAll("div").forEach(d => d.onclick = () => { input.value = d.dataset.c; menu.classList.add("hidden"); input.focus(); });
}

// attachments
$("#attachBtn").onclick = () => $("#fileInput").click();
$("#fileInput").onchange = async e => { for (const f of e.target.files) await attach(f); e.target.value = ""; };
document.addEventListener("paste", async e => { for (const it of e.clipboardData?.files || []) await attach(it); });
box().addEventListener("dragover", e => e.preventDefault());
box().addEventListener("drop", async e => { e.preventDefault(); for (const f of e.dataTransfer.files) await attach(f); });
async function attach(file) {
  const a = { name: file.name };
  if (file.type.startsWith("image/")) {
    a.b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(",")[1]); fr.readAsDataURL(file); });
  } else {
    const fd = new FormData(); fd.append("file", file);
    const res = await api("/api/upload", { method: "POST", body: fd });
    a.text = res.text;
  }
  S.attachments.push(a); renderAttach();
}
function renderAttach() {
  $("#attachRow").innerHTML = S.attachments.map((a, i) => `<span class="chip">${ic(a.b64 ? "image" : "file")}${esc(a.name)} <button data-i="${i}">${ic("x")}</button></span>`).join("");
  $("#attachRow").querySelectorAll("button").forEach(b => b.onclick = () => { S.attachments.splice(+b.dataset.i, 1); renderAttach(); });
}

const HELP = `**Limelight AI — sab kuch aapke computer par, offline.**

- **Ask** — normal AI chat. Attach PDF/Word/Excel files or images (images need a vision model like \`gemma3\`).
- **Work** — the AI works on files in your workspace folder: reads documents, writes reports (.docx), sheets (.xlsx), images.
- **Build** — a coding agent: explores, edits files, runs commands/tests, keeps a task list.
- **Images** — local Stable Diffusion XL image generation.

**Commands:** \`/init\` project memory · \`/review\` code review · \`/compact\` shrink history · \`/clear\` · \`/image <prompt>\`

**Permissions:** *Ask before edits* asks for every file change and command. *Auto-accept edits* only asks for commands. *Full auto* never asks.

**Project memory:** put instructions in \`LIMELIGHT.md\` in the workspace and the agent will always follow them.`;

// ------------------------------------------------------------------ images
$("#imgForm").onsubmit = async e => {
  e.preventDefault();
  const prompt = $("#imgPrompt").value.trim();
  if (!prompt) return;
  const [w, h] = ($("#imgSize").value || "x").split("x").map(n => parseInt(n) || null);
  const body = { prompt, negative: $("#imgNeg").value, preset: $("#imgPreset").value, width: w, height: h,
    steps: parseInt($("#imgSteps").value) || null, seed: $("#imgSeed").value === "" ? null : parseInt($("#imgSeed").value),
    count: parseInt($("#imgCount").value) || 1 };
  $("#imgBtn").disabled = true;
  $("#imgMsg").textContent = "Generating… (first run loads the model, can take a few minutes)";
  const t0 = Date.now();
  try {
    // keepalive: the server sends spaces while the picture is made (Cloudflare cuts a silent request at 100 s);
    // an error then comes inside the JSON as { error, status, detail }
    const out = await api("/api/images/generate?keepalive=1", { method: "POST", body });
    if (out && out.error) {
      if (out.status === 401) { showLogin(); throw new Error("login required"); }
      throw new Error(out.detail || "Image failed");
    }
    $("#imgMsg").textContent = `Done in ${Math.round((Date.now() - t0) / 1000)}s`;
    loadGallery();
  } catch (err) { $("#imgMsg").textContent = "Error: " + err.message; }
  $("#imgBtn").disabled = false;
};
async function loadGallery() {
  const imgs = await api("/api/images").catch(() => []);
  $("#gallery").innerHTML = imgs.map(i => `<div class="card"><img src="${i.url}" loading="lazy" data-full="${i.url}">
    <div class="meta">${esc(i.prompt.slice(0, 120))}<div>${i.width}×${i.height} · seed ${i.seed} · ${i.seconds}s</div>
    <div class="acts"><a class="link" href="${i.url}" download>download</a><button class="link" data-re='${esc(JSON.stringify({ p: i.prompt, s: i.seed }))}'>reuse</button><button class="link" data-del="${i.file}">delete</button></div></div></div>`).join("")
    || `<div class="muted">No images yet. Write a prompt and press Generate.</div>`;
  $("#gallery").querySelectorAll("img").forEach(im => im.onclick = () => window.open(im.dataset.full, "_blank"));
  $("#gallery").querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { await api("/api/images/" + b.dataset.del, { method: "DELETE" }); loadGallery(); });
  $("#gallery").querySelectorAll("[data-re]").forEach(b => b.onclick = () => { const r = JSON.parse(b.dataset.re); $("#imgPrompt").value = r.p; $("#imgSeed").value = r.s; });
}

// ------------------------------------------------------------------ video
// A clip takes minutes: the server runs it as a job; we poll its progress and refresh the gallery when it's done.
let vidTimer = null;
async function openVideo() {
  const st = (S.status && S.status.video) || {};
  $("#vidStatus").textContent = st.available ? (st.gpu || "") : (st.reason || "Video model not installed");
  $("#vidBtn").disabled = !st.available;
  loadVideos();
  const running = await api("/api/videos/jobs").catch(() => []);
  if (running.length) watchJob(running[0].id);
}
$("#vidImage").onchange = () => { $("#vidImageName").textContent = $("#vidImage").files[0]?.name || ""; };
$("#vidForm").onsubmit = async e => {
  e.preventDefault();
  const prompt = $("#vidPrompt").value.trim();
  if (!prompt) return;
  const fd = new FormData();
  fd.append("prompt", prompt);
  fd.append("preset", $("#vidPreset").value);
  fd.append("aspect", $("#vidAspect").value);
  fd.append("seconds", $("#vidSeconds").value);
  fd.append("seed", $("#vidSeed").value);
  fd.append("enhance", $("#vidEnhance").checked ? "true" : "false");
  if ($("#vidImage").files[0]) fd.append("image", $("#vidImage").files[0]);
  $("#vidMsg").textContent = "";
  try { const job = await api("/api/videos", { method: "POST", body: fd }); watchJob(job.id); }
  catch (err) { $("#vidMsg").textContent = "Error: " + err.message; }
};
function watchJob(id) {
  clearInterval(vidTimer);
  $("#vidJob").classList.remove("hidden");
  $("#vidBtn").disabled = true;
  $("#vidCancel").onclick = () => api(`/api/videos/jobs/${id}/cancel`, { method: "POST" });
  const t0 = Date.now();
  const tick = async () => {
    const j = await api(`/api/videos/jobs/${id}`).catch(() => null);
    if (!j) return;
    const mins = Math.floor((Date.now() - t0) / 60000), secs = Math.floor((Date.now() - t0) / 1000) % 60;
    $("#vidBar").style.width = `${Math.round((j.progress || 0) * 100)}%`;
    $("#vidNote").textContent = `${j.note} · ${mins}:${String(secs).padStart(2, "0")}`;
    if (["done", "error", "cancelled"].includes(j.state)) {
      clearInterval(vidTimer);
      $("#vidJob").classList.add("hidden");
      $("#vidBtn").disabled = false;
      $("#vidMsg").textContent = j.state === "done" ? `Done in ${j.result.took}s` : j.note;
      loadVideos();
    }
  };
  tick();
  vidTimer = setInterval(tick, 2000);
}
async function loadVideos() {
  const vids = await api("/api/videos").catch(() => []);
  $("#vidGallery").innerHTML = vids.map(v => `<div class="card"><video src="${v.url}" poster="${v.poster}" controls preload="none" playsinline></video>
    <div class="meta">${esc(v.prompt.slice(0, 120))}<div>${v.width}×${v.height} · ${v.seconds}s${v.from_photo ? " · from photo" : ""} · made in ${Math.round(v.took / 60)} min</div>
    <div class="acts"><a class="link" href="${v.url}" download>download</a><button class="link" data-re="${esc(v.prompt)}" data-seed="${v.seed}">reuse</button><button class="link" data-del="${v.file}">delete</button></div></div></div>`).join("")
    || `<div class="muted">No videos yet. Describe a clip and press Generate video.</div>`;
  $("#vidGallery").querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { await api("/api/videos/" + b.dataset.del, { method: "DELETE" }); loadVideos(); });
  $("#vidGallery").querySelectorAll("[data-re]").forEach(b => b.onclick = () => { $("#vidPrompt").value = b.dataset.re; $("#vidSeed").value = b.dataset.seed; });
}

// ------------------------------------------------------------------ themes
// pv = preview colours: [page, sidebar, text line, user bubble, accent]
const THEMES = [
  { id: "limelight", name: "Limelight", desc: "Midnight glow, calm layout, Inter", pv: ["#121a3f", "#1d2445", "#eceefa", "#2a2f4a", "#FFD21F"] },
  { id: "noir", name: "Noir Gold", desc: "Black and gold, classic serif headings", pv: ["#0a0a0a", "#0d0d0d", "#f2efe6", "#1a1a1a", "#f5c518"] },
  { id: "studio", name: "Studio", desc: "Warm charcoal, serif reading, no clutter", pv: ["#1d1c1a", "#191816", "#ece6da", "#2c2a26", "#e3a548"] },
  { id: "terminal", name: "Terminal", desc: "Monospace, amber on black, square edges", pv: ["#000000", "#070707", "#ffd27a", "#000000", "#ffb000"] },
  { id: "paper", name: "Paper", desc: "Light cream paper, ink and highlighter", pv: ["#f5f0e4", "#fbf8f0", "#1b1a17", "#fff1a8", "#ffd23f"] },
  { id: "midnight", name: "Midnight Glass", desc: "Deep blue glow, frosted floating panels", pv: ["#101631", "#1b2140", "#eef1ff", "#3a3520", "#ffd23f"] },
  { id: "rail", name: "Minimal Rail", desc: "Pure monochrome, icon rail sidebar", pv: ["#000000", "#0a0a0a", "#f5f5f5", "#141414", "#ffffff"] },
];
function setTheme(id) {
  document.documentElement.dataset.ui = id;
  try { localStorage.setItem("ll_ui", id); } catch {}
  document.querySelectorAll(".theme-card").forEach(c => c.classList.toggle("sel", c.dataset.id === id));
}
$("#themeGrid").innerHTML = THEMES.map(t => {
  const [bg, sb, tx, ub, ac] = t.pv;
  return `<button class="theme-card" data-id="${t.id}">
    <div class="pv" style="background:${bg}"><div class="sb" style="background:${sb};border:1px solid ${tx}22"></div>
      <div class="mn"><div class="ub" style="background:${ub};border:1px solid ${ac}66"></div>
        <div class="ln" style="background:${tx};width:85%;opacity:.8"></div><div class="ln" style="background:${tx};width:60%;opacity:.5"></div>
        <div class="cp" style="border:1px solid ${tx}33"><i style="background:${ac}"></i></div></div></div>
    <div class="nm">${t.name}</div><div class="ds">${t.desc}</div></button>`;
}).join("");
document.querySelectorAll(".theme-card").forEach(c => c.onclick = () => setTheme(c.dataset.id));
// Background gradients (Limelight theme). sw = swatch preview.
const BGS = [
  { id: "1", name: "Midnight", sw: "radial-gradient(120% 90% at 10% 0%, #1e2a63, transparent 60%), radial-gradient(100% 80% at 100% 100%, #33195a, transparent 60%), #07080f" },
  { id: "2", name: "Slate Night", sw: "radial-gradient(120% 90% at 10% 0%, #26335e, transparent 62%), radial-gradient(100% 80% at 100% 100%, #2c2f45, transparent 60%), #0d0f15" },
  { id: "3", name: "Deep Ocean", sw: "radial-gradient(120% 90% at 5% 0%, #15306a, transparent 60%), radial-gradient(110% 80% at 100% 100%, #0b3d4f, transparent 60%), #060a12" },
  { id: "4", name: "Aurora", sw: "radial-gradient(130% 80% at 50% -20%, #22337a, transparent 62%), radial-gradient(90% 70% at 90% 110%, #4a1f5c, transparent 60%), #06070e" },
  { id: "5", name: "Night Sky", sw: "radial-gradient(90% 60% at 50% 0%, rgba(58,82,170,.45), transparent 70%), linear-gradient(180deg, #121a3a, #0a0e1f 45%, #06070c)" },
];
function setBg(id) {
  document.documentElement.dataset.bg = id;
  try { localStorage.setItem("ll_bg", id); } catch {}
  if (document.documentElement.dataset.ui !== "limelight") setTheme("limelight");
  document.querySelectorAll(".bg-card").forEach(c => c.classList.toggle("sel", c.dataset.id === id));
}
$("#bgGrid").innerHTML = BGS.map(b => `<button class="bg-card" data-id="${b.id}"><div class="sw" style="background:${b.sw}"></div><div class="nm">${b.name}</div></button>`).join("");
document.querySelectorAll(".bg-card").forEach(c => c.onclick = () => setBg(c.dataset.id));

// The look is locked (Limelight + Aurora + Badge); the Theme button was removed from the menu.
if ($("#themeBtn")) $("#themeBtn").onclick = () => {
  document.querySelectorAll(".bg-card").forEach(c => c.classList.toggle("sel", c.dataset.id === (document.documentElement.dataset.bg || "4"))); setTheme(document.documentElement.dataset.ui || "limelight"); $("#themeDlg").showModal(); };

// ------------------------------------------------------------------ mobile drawer
// On phones the sidebar slides in over the chat; picking anything in it closes it again.
const sideOpen = on => document.documentElement.classList.toggle("side-open", on);
document.querySelectorAll("[data-side-open]").forEach(b => b.onclick = () => sideOpen(true));
$("#sideScrim").onclick = () => sideOpen(false);
document.querySelector(".mobile-new").onclick = () => $("#newBtn").click();
document.querySelector(".sidebar").addEventListener("click", e => {
  if (e.target.closest(".x, #recentsToggle, #profileBtn, .menu")) return;
  if (e.target.closest(".nav-item, .conv, .proj")) setTimeout(() => sideOpen(false), 0);
});
addEventListener("keydown", e => { if (e.key === "Escape") sideOpen(false); });
// On phones the workspace field folds into a folder button; tap to open it, it folds again when you leave it.
const wsLabel = document.querySelector(".ws-label");
const wsMark = () => wsLabel.classList.toggle("has-ws", !!$("#wsInput").value.trim());
wsLabel.addEventListener("click", e => {
  if (!matchMedia("(max-width: 800px)").matches || wsLabel.classList.contains("open")) return;
  e.preventDefault(); wsLabel.classList.add("open"); $("#wsInput").focus();
});
$("#wsInput").addEventListener("blur", () => { wsLabel.classList.remove("open"); wsMark(); });
$("#wsInput").addEventListener("input", wsMark);

// ------------------------------------------------------------------ boot
(async function boot() {
  const a = await fetch("/api/auth").then(r => r.json()).catch(() => ({}));
  if (a.required && !a.ok) { showLogin(); return; }
  $("#logoutBtn").classList.toggle("hidden", !a.required);
  await refreshStatus();
  setMode(S.mode);
  warm($("#modelSel").value);
  setInterval(refreshStatus, 30000);
})();
