// Service Worker para cache estática y soporte offline básico
const CACHE_NAME = 'jc-design-v2';
const CORE_ASSETS = [
  'index.html',
  'assets/css/styles.css?v=6',
  'assets/js/main.js',
  'LogoChiquito.png',
  'offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navegaciones: estrategia network-first con fallback a offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return resp;
      }).catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match('offline.html');
      })
    );
    return;
  }

  // Estático (CSS/JS/imagenes): stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
