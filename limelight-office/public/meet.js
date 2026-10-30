// meet.js - Limelight Meetings: a video room inside the app. WebRTC between the people in the room (each to each, fine
// for a team call on the office network); offers / answers / ICE go through the app's live stream.
const L = window.LLO;
const { $, $$, esc, ic, toast, fail, POST } = L;

export async function open(view, { room, cid, me, team, online }) {
  const peers = new Map(); // peer cid -> { pc, name, color, stream, tile, cam, mic, hand }
  let local = null, camOn = true, micOn = true, screen = null, hand = false, left = false, panel = '';
  const started = Date.now();

  view.innerHTML = `<div class="meet">
    <div class="mt-top"><div class="mt-title"><b id="mt-name">Meeting</b><span class="mono">${esc(room)}</span><span id="mt-time">00:00</span></div><span class="grow"></span>
      <button class="mt-btn" id="mt-copy" title="Copy room code">${ic('copy')}<span>Copy code</span></button><button class="mt-btn" id="mt-inv" title="Call people in">${ic('people')}<span>Invite</span></button></div>
    <div class="mt-body"><div class="mt-grid" id="mt-grid"></div><aside class="mt-side" id="mt-side" hidden></aside></div>
    <div class="mt-bar">
      <button class="mt-c" id="c-mic" title="Microphone (Ctrl+D)">${MIC}</button>
      <button class="mt-c" id="c-cam" title="Camera (Ctrl+E)">${CAM}</button>
      <button class="mt-c" id="c-scr" title="Share your screen">${SCR}</button>
      <button class="mt-c" id="c-hand" title="Raise hand">✋</button>
      <button class="mt-c" id="c-chat" title="Chat">${ic('chat')}<i id="chat-n" hidden></i></button>
      <button class="mt-c" id="c-ppl" title="People">${ic('people')}</button>
      <button class="mt-c end" id="c-end" title="Leave">${END}</button></div></div>`;
  const grid = $('#mt-grid'), side = $('#mt-side');
  const chat = [];
  const timer = setInterval(() => { const s = Math.floor((Date.now() - started) / 1000); $('#mt-time') && ($('#mt-time').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`); }, 1000);

  // ---------- my camera / mic ----------
  try { local = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch {
    try { local = await navigator.mediaDevices.getUserMedia({ audio: true }); camOn = false; toast('No camera found — joining with mic only'); }
    catch { local = new MediaStream(); camOn = false; micOn = false; toast('No camera or mic allowed — you can still watch and chat', true); }
  }
  // a blank video track keeps a video sender ready, so the camera or a screen share can be switched in later
  if (!local.getVideoTracks().length) local.addTrack(blankTrack());
  addTile('me', { name: `${me.name} (you)`, color: me.color, stream: local, me: true });
  syncButtons();

  const onRtc = (e) => handle(e.detail).catch((er) => console.warn('meeting signal', e.detail.type, er));
  window.addEventListener('llo-rtc', onRtc);
  let res;
  try { res = await POST(`/api/rtc/${room}/join`, { cid, cam: camOn, mic: micOn }); }
  catch (e) { fail(e); return cleanup(); }
  if (res.event) $('#mt-name').textContent = res.event.title;
  for (const p of res.peers) { const x = peer(p.id, p); await offer(x, p.id); }
  if (!res.peers.length) toast('You are the first one here — press Invite to call people in');

  function peer(id, info) {
    if (peers.has(id)) return peers.get(id);
    const pc = new RTCPeerConnection({ iceServers: [] });
    const x = { pc, name: info.name, color: info.color, cam: info.cam ?? true, mic: info.mic ?? true, hand: false, stream: new MediaStream() };
    peers.set(id, x);
    for (const t of local.getTracks()) pc.addTrack(t, local);
    pc.onicecandidate = (e) => { if (e.candidate) sig(id, { ice: e.candidate }); };
    pc.ontrack = (e) => { if (!x.stream.getTracks().includes(e.track)) x.stream.addTrack(e.track); x.tile && (x.tile.querySelector('video').srcObject = x.stream); };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) drop(id); };
    addTile(id, x);
    return x;
  }
  function sig(to, data) { return POST(`/api/rtc/${room}/signal`, { cid, to, data }).catch(() => {}); }
  async function offer(x, id) { const o = await x.pc.createOffer(); await x.pc.setLocalDescription(o); sig(id, { sdp: x.pc.localDescription }); }
  async function handle(m) {
    if (m.room !== room || left) return;
    if (m.type === 'join') { peer(m.from, m); toast(`${m.name} joined`); sound(660); }
    if (m.type === 'leave') { const x = peers.get(m.from); if (x) toast(`${x.name} left`); drop(m.from); }
    if (m.type === 'signal') {
      const x = peers.get(m.from) || peer(m.from, { name: 'Guest' });
      const d = m.data;
      if (d.sdp) {
        await x.pc.setRemoteDescription(d.sdp);
        if (d.sdp.type === 'offer') { const a = await x.pc.createAnswer(); await x.pc.setLocalDescription(a); sig(m.from, { sdp: x.pc.localDescription }); }
        for (const c of x.queued || []) await x.pc.addIceCandidate(c).catch(() => {}); x.queued = [];
      } else if (d.ice) {
        if (x.pc.remoteDescription) await x.pc.addIceCandidate(d.ice).catch(() => {}); else (x.queued ||= []).push(d.ice);
      }
    }
    if (m.type === 'state') { const x = peers.get(m.from); if (x) { Object.assign(x, Object.fromEntries(Object.entries(m).filter(([k, v]) => ['cam', 'mic', 'screen', 'hand'].includes(k) && v !== undefined))); paintTile(m.from); if (m.hand) toast(`✋ ${x.name} raised a hand`); } }
    if (m.type === 'chat') { chat.push(m); if (panel === 'chat') drawChat(); else if (m.from !== cid) { $('#chat-n').hidden = false; toast(`${m.name}: ${m.text.slice(0, 80)}`); } }
  }
  function drop(id) { const x = peers.get(id); if (!x) return; try { x.pc.close(); } catch {} x.tile?.remove(); peers.delete(id); layout(); if (panel === 'ppl') drawPeople(); }

  // ---------- tiles ----------
  function addTile(id, x) {
    const t = document.createElement('div'); t.className = 'tile'; t.dataset.id = id;
    t.innerHTML = `<video autoplay playsinline ${x.me ? 'muted' : ''}></video><div class="tile-av" style="background:${x.color || '#444'}33;color:${x.color || '#ddd'}">${esc((x.name || '?').replace(' (you)', '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase())}</div><div class="tile-n"><span class="tile-mic"></span>${esc(x.name)}<span class="tile-hand">✋</span></div>`;
    t.querySelector('video').srcObject = x.stream;
    t.ondblclick = () => t.classList.toggle('big');
    grid.append(t); x.tile = t;
    if (!x.me) watchVoice(x);
    paintTile(id); layout();
  }
  function paintTile(id) {
    const x = id === 'me' ? { tile: grid.querySelector('[data-id="me"]'), cam: camOn || !!screen, mic: micOn, hand } : peers.get(id);
    if (!x?.tile) return;
    x.tile.classList.toggle('nocam', !x.cam && !x.screen);
    x.tile.classList.toggle('muted', !x.mic);
    x.tile.classList.toggle('hand', !!x.hand);
    x.tile.classList.toggle('screen', !!x.screen || (id === 'me' && !!screen));
  }
  function layout() { const n = grid.children.length; grid.dataset.n = Math.min(n, 9); }
  // who is talking: a soft ring on their tile
  function watchVoice(x) {
    try {
      const ac = new AudioContext(), an = ac.createAnalyser(); an.fftSize = 512; const buf = new Uint8Array(an.frequencyBinCount);
      let src = null;
      const tick = () => {
        if (left || !x.tile?.isConnected) return ac.close();
        if (!src && x.stream.getAudioTracks().length) { src = ac.createMediaStreamSource(x.stream); src.connect(an); }
        if (src) { an.getByteFrequencyData(buf); const v = buf.reduce((a, b) => a + b, 0) / buf.length; x.tile.classList.toggle('talking', v > 18); }
        setTimeout(tick, 200);
      };
      tick();
    } catch {}
  }

  // ---------- controls ----------
  const state = () => POST(`/api/rtc/${room}/state`, { cid, cam: camOn || !!screen, mic: micOn, screen: !!screen, hand }).catch(() => {});
  function syncButtons() {
    $('#c-mic').classList.toggle('off', !micOn); $('#c-mic').innerHTML = micOn ? MIC : MIC_OFF;
    $('#c-cam').classList.toggle('off', !camOn); $('#c-cam').innerHTML = camOn ? CAM : CAM_OFF;
    $('#c-scr').classList.toggle('on', !!screen); $('#c-hand').classList.toggle('on', hand);
    paintTile('me');
  }
  $('#c-mic').onclick = () => { micOn = !micOn; local.getAudioTracks().forEach((t) => (t.enabled = micOn)); if (micOn && !local.getAudioTracks().length) toast('No microphone found', true); syncButtons(); state(); };
  $('#c-cam').onclick = async () => {
    const real = local.getVideoTracks().find((t) => !t.__blank);
    if (!real && !camOn) {
      try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); const t = s.getVideoTracks()[0]; swapVideo(t); local.getVideoTracks().forEach((x) => local.removeTrack(x)); local.addTrack(t); camOn = true; }
      catch { return toast('Camera not available', true); }
    } else { camOn = !camOn; if (real) real.enabled = camOn; }
    syncButtons(); state();
  };
  $('#c-scr').onclick = async () => {
    if (screen) return stopScreen();
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      const t = screen.getVideoTracks()[0]; swapVideo(t);
      grid.querySelector('[data-id="me"] video').srcObject = screen;
      t.onended = stopScreen; syncButtons(); state(); toast('You are sharing your screen');
    } catch { screen = null; }
  };
  function stopScreen() {
    if (!screen) return; screen.getTracks().forEach((t) => t.stop()); screen = null;
    swapVideo(local.getVideoTracks()[0]); grid.querySelector('[data-id="me"] video').srcObject = local; syncButtons(); state();
  }
  function swapVideo(track) { for (const x of peers.values()) x.pc.getSenders().find((s) => s.track?.kind === 'video' || (!s.track && s.dtmf === null))?.replaceTrack(track).catch(() => {}); }
  $('#c-hand').onclick = () => { hand = !hand; syncButtons(); state(); };
  $('#c-chat').onclick = () => togglePanel('chat');
  $('#c-ppl').onclick = () => togglePanel('ppl');
  $('#mt-inv').onclick = () => togglePanel('ppl');
  $('#mt-copy').onclick = () => L.copyText(room);
  $('#c-end').onclick = () => { cleanup(); location.hash = 'meetings'; };

  function togglePanel(p) {
    panel = panel === p ? '' : p; side.hidden = !panel;
    if (panel === 'chat') { $('#chat-n').hidden = true; drawChat(); }
    if (panel === 'ppl') drawPeople();
  }
  function drawChat() {
    side.innerHTML = `<div class="ms-h">Chat</div><div class="ms-list" id="ms-l">${chat.map((c) => `<div class="cm${c.from === cid ? ' mine' : ''}"><b>${esc(c.from === cid ? 'You' : c.name)}</b><span>${new Date(c.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span><p>${esc(c.text)}</p></div>`).join('') || '<div class="empty">Say hello 👋</div>'}</div>
      <form class="ms-in" id="ms-f"><input class="input" placeholder="Message everyone" autocomplete="off"><button class="btn primary sm">${ic('send')}</button></form>`;
    const l = $('#ms-l'); l.scrollTop = l.scrollHeight;
    $('#ms-f').onsubmit = (e) => { e.preventDefault(); const v = $('#ms-f input').value.trim(); if (!v) return; $('#ms-f input').value = ''; POST(`/api/rtc/${room}/chat`, { cid, text: v }).catch(fail); };
    $('#ms-f input').focus();
  }
  function drawPeople() {
    const here = [{ name: `${me.name} (you)`, color: me.color }, ...[...peers.values()]];
    const others = team().filter((u) => u.id !== me.id);
    side.innerHTML = `<div class="ms-h">In this call · ${here.length}</div><div class="ms-ppl">${here.map((x) => `<div class="pp">${L.avatar(x)}<span>${esc(x.name)}</span>${x.hand ? '✋' : ''}${x.mic === false ? MIC_OFF : ''}</div>`).join('')}</div>
      <div class="ms-h">Call someone in</div><div class="ms-ppl">${others.map((u) => `<button class="pp inv" data-inv="${u.id}">${L.avatar(u)}<span>${esc(u.name)}</span><i class="${online().has(u.id) ? 'on' : ''}">${online().has(u.id) ? 'online' : 'offline'}</i></button>`).join('') || '<div class="empty">No team members yet</div>'}</div>
      <p class="faint" style="font-size:12px;padding:0 14px">They get a ring with a Join button. Or share the code <b class="mono">${esc(room)}</b>.</p>`;
    $$('[data-inv]', side).forEach((b) => (b.onclick = async () => { await POST(`/api/rtc/${room}/invite`, { users: [b.dataset.inv] }).catch(fail); b.classList.add('sent'); b.querySelector('i').textContent = 'called'; }));
  }
  const onKey = (e) => { if (!e.ctrlKey) return; if (e.key.toLowerCase() === 'd') { e.preventDefault(); $('#c-mic').click(); } if (e.key.toLowerCase() === 'e') { e.preventDefault(); $('#c-cam').click(); } };
  addEventListener('keydown', onKey);
  const onHash = () => { if (!location.hash.startsWith(`#meet/${room}`)) cleanup(); };
  addEventListener('hashchange', onHash);
  addEventListener('beforeunload', cleanup);

  function cleanup() {
    if (left) return; left = true;
    clearInterval(timer);
    removeEventListener('llo-rtc', onRtc); removeEventListener('keydown', onKey); removeEventListener('hashchange', onHash); removeEventListener('beforeunload', cleanup);
    for (const id of [...peers.keys()]) drop(id);
    local?.getTracks().forEach((t) => t.stop()); screen?.getTracks().forEach((t) => t.stop());
    fetch(`/api/rtc/${room}/leave`, { method: 'POST', headers: { 'x-llo': '1', 'content-type': 'application/json' }, body: JSON.stringify({ cid }), keepalive: true }).catch(() => {});
  }
}

function blankTrack() {
  const c = Object.assign(document.createElement('canvas'), { width: 640, height: 360 });
  const g = c.getContext('2d'); g.fillStyle = '#111'; g.fillRect(0, 0, 640, 360);
  const t = c.captureStream(1).getVideoTracks()[0]; t.__blank = true; return t;
}
function sound(f) { try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = f; g.gain.value = 0.04; o.connect(g).connect(a.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.25); o.stop(a.currentTime + 0.26); setTimeout(() => a.close(), 400); } catch {} }

const S = (p) => `<svg class="i" viewBox="0 0 24 24">${p}</svg>`;
const MIC = S('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>');
const MIC_OFF = S('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16"/>');
const CAM = S('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>');
const CAM_OFF = S('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3zM3 3l18 18"/>');
const SCR = S('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M12 13V7M9 10l3-3 3 3"/>');
const END = S('<path d="M3 15c5-5 13-5 18 0l-2.5 2.5-3.5-2v-2.5a12 12 0 0 0-6 0V15.5l-3.5 2z" fill="currentColor"/>');
