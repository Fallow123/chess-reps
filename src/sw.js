// Pawnstorm service worker: lets the installed app open offline.
// The page is fetched fresh when online (so updates arrive at once) and from the cache when not.
// chess.js and the icons are cached at install, the engine on first use. Other sites (lichess, chess.com, sync) are never cached.
const VERSION = '__VERSION__';
const SHELL = 'pawnstorm-shell-' + VERSION, ENGINE = 'pawnstorm-engine-18';
const CORE = ['./', 'vendor/chess.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('pawnstorm-') && k !== SHELL && k !== ENGINE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Network first; strip ?code=… (sign-in return) so the cached page is the plain app.
    e.respondWith(fetch(req).then(res => {
      if (res.ok && !url.search) { const copy = res.clone(); caches.open(SHELL).then(c => c.put('./', copy)); }
      return res;
    }).catch(() => caches.match('./', { cacheName: SHELL }).then(r => r || Response.error())));
    return;
  }
  const cacheName = url.pathname.includes('/engine/') ? ENGINE : SHELL;
  e.respondWith(caches.open(cacheName).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) c.put(req, res.clone());
    return res;
  }))));
});
