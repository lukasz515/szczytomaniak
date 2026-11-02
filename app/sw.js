// Szczytomaniak – service worker: aplikacja działa offline (poza mapą, która potrzebuje internetu).
// Przy każdej zmianie plików aplikacji zwiększ numer wersji, żeby telefony pobrały nowe pliki.
const CACHE = 'szczytomaniak-v1.0.2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './img/emblem.jpg',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];
const LIBS = ['https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js', 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Strona aplikacji: najpierw sieć (świeża wersja), bez sieci – kopia z pamięci.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Pliki aplikacji i biblioteka mapy: z pamięci, w tle odświeżane.
  if (url.origin === location.origin || LIBS.includes(req.url)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Kafelki i styl mapy (Maptoolkit) idą zawsze z sieci – nie zapisujemy ich (warunki usługi).
});
