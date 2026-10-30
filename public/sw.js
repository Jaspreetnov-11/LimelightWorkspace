// Limelight - the installed app's background script. It never serves an old copy of Lighthouse: every request goes to
// the server as usual (the browser's own cache and the ?v= links do the speed-up). Its only jobs are to make the app
// installable and to show a friendly "No connection" page instead of the browser's error when there is no internet.
const CACHE = 'lh-offline-1';
const OFFLINE = ['/offline.html', '/img/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// pages: always the live one from the server; no internet -> the "No connection" page
self.addEventListener('fetch', (e) => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => caches.match('/offline.html')));
});
