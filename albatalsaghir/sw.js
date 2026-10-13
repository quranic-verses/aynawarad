/* Offline support. Change VERSION whenever you upload new files so phones pick them up. */
const VERSION = 'albatal-v10';
const FILES = [
  './', 'index.html', 'about.html', 'privacy.html',
  'style.css', 'app.js', 'config.js', 'questions.js', 'manifest.webmanifest',
  'fonts/Lalezar-Regular.woff2', 'fonts/BalooBhaijaan2.woff2', 'fonts/Amiri-Bold.woff2',
  'icons/favicon.svg', 'icons/favicon-32.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k.startsWith('albatal-'))   // only this quiz's old copies: «أين ورد؟» shares the address.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Same-site files: show the saved copy right away and refresh it in the background.
// Everything else (the Google Sheet) goes straight to the network.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { e.waitUntil(fresh); return cached; }
      const res = await fresh;
      if (res) return res;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    })
  );
});
