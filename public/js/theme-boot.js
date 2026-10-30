// Lighthouse - apply the saved colour theme before the page paints (loaded in <head>; theme picker is in workspace.js).
// No theme picked on this device yet: Pure Black (the stylesheet's own colours, nothing to set).
(function () {
  try {
    // once: Desktop was the default for a few minutes on 30 Oct 2026 and got saved as if picked - back to the default
    if (!localStorage.getItem('lh-theme-reset1')) {
      if (JSON.parse(localStorage.getItem('lh-theme-vars') || 'null')?.key === 'desktop') localStorage.removeItem('lh-theme-vars');
      localStorage.setItem('lh-theme-reset1', '1');
    }
    const t = JSON.parse(localStorage.getItem('lh-theme-vars') || 'null');
    if (!t || t.auto) return;
    for (const [k, v] of Object.entries(t.vars || {})) document.documentElement.style.setProperty(k, v);
    if (t.light) document.documentElement.dataset.mode = 'light';
  } catch (e) { /* private window or old value: default theme */ }
})();

// the installed app's background script (sw.js): makes Lighthouse installable and shows "No connection" when offline
if ('serviceWorker' in navigator && window.top === window.self) navigator.serviceWorker.register('/sw.js').catch(() => {});
