// أين ورد؟ — offline support.
// Pages: always checked with GitHub first (so updates show up right away), cached copy when offline.
// Fonts: cached after the first visit. Recitation audio is never cached.
const CACHE = 'aynawarad-v113';
const CORE = ['./', './index.html', './farq.html', './akhir.html', './awwal.html', './wasat.html', './qabl.html', './rattib.html', './lam.html', './makki.html', './fawatih.html', './tartib.html', './asmaa.html', './support.html', './about.html', './guide.html', './privacy.html', './teacher.html',
  './data/index.js', './data/farq.js', './data/akhir.js', './data/awwal.js', './data/wasat.js', './data/qabl.js', './data/rattib.js', './data/lam.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && /^(aynawarad|mutashabih)-/.test(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // cache: 'no-cache' asks GitHub whether the file changed, so players never get an outdated page
    e.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
      }).catch(() => hit);
      return hit || net;
    }));
  }
  // everything else (recitation audio, counter) goes straight to the network
});
