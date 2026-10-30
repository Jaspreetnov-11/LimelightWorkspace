// Lighthouse - inside Lighthouse.exe (WebView2) the page's own top bar is the window's title bar: it drags the window
// (CSS app-region) and gets minimise / maximise / close buttons that ask the exe. In a normal browser this does nothing.
(function () {
  const host = window.chrome && window.chrome.webview;
  if (!host) return;
  document.documentElement.classList.add('in-app');
  const ico = {
    min: '<path d="M5 12h14"/>',
    max: '<rect x="5.5" y="5.5" width="13" height="13" rx="2"/>',
    restore: '<rect x="5.5" y="8.5" width="10" height="10" rx="2"/><path d="M8.5 8.5V6.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${ico[k]}</svg>`;
  function mount() {
    const box = document.createElement('div');
    box.className = 'winbtns';
    box.innerHTML = `<button data-w="min" title="Minimise">${svg('min')}</button><button data-w="max" title="Maximise">${svg('max')}</button><button data-w="close" class="x" title="Close">${svg('close')}</button>`;
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (b) host.postMessage(b.dataset.w); });
    document.body.append(box);
    box.classList.add('float');
    const strip = document.createElement('div'); strip.className = 'drag-strip'; document.body.prepend(strip);
    host.addEventListener('message', (e) => {
      if (typeof e.data === 'string' && e.data.startsWith('max:')) {
        const on = e.data === 'max:1';
        box.querySelector('[data-w="max"]').innerHTML = svg(on ? 'restore' : 'max');
        box.querySelector('[data-w="max"]').title = on ? 'Restore' : 'Maximise';
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
