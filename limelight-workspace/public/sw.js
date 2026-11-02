// Limelight - the installed app's background script. It never serves an old copy of a page: every page load goes to
// the server. Its jobs: make the app installable, show a friendly "No connection" page instead of the browser's error
// when there is no internet, and keep the versioned files (css/js with ?v=) on the phone so a repeat open needs no trip
// for them. A ?v= link changes whenever its file changes (servePage, server/core.mjs), so a kept copy is never old.
const CACHE = 'lh-offline-1';
const ASSETS = 'lh-assets-1';
const OFFLINE = ['/offline.html', '/img/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ASSETS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// versioned file: the kept copy, else from the server (kept for next time; older versions of that file are dropped)
async function versioned(req, url) {
  const c = await caches.open(ASSETS);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  // (only a real answer: not the login page that a signed-out visit is sent to)
  if (r.ok && !r.redirected && r.type === 'basic') {
    await c.put(req, r.clone());
    for (const k of await c.keys()) if (new URL(k.url).pathname === url.pathname && k.url !== req.url) c.delete(k);
  }
  return r;
}
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  // pages: always the live one from the server; no internet -> the "No connection" page
  if (req.mode === 'navigate') return e.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
  if (req.method === 'GET' && url.origin === self.location.origin && /^\/(css|js)\//.test(url.pathname) && url.searchParams.get('v') && url.searchParams.get('v') !== '0')
    e.respondWith(versioned(req, url));
});
