// Service Worker de APPOPO: cachea la "app shell" (HTML/CSS/JS propios) para que
// la aplicación se pueda instalar y siga abriendo sin conexión. Firebase, Gemini y
// los documentos de Storage NO se gestionan aquí (ver DOC_CACHE en app.js) porque
// son peticiones a otros orígenes o inherentemente dependientes de red.
const CACHE_NAME = 'appopo-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './js/temarioBase.js',
  './js/firebaseService.js',
  './js/geminiService.js',
  './js/app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((e) => console.warn('APPOPO SW: no se pudo precachear toda la app shell', e))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo gestionamos peticiones GET del propio origen (la app en sí).
  // Firebase/Gemini/Storage se dejan pasar directos a la red.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      // Responder al instante con la versión cacheada si existe (rápido y funciona offline),
      // y refrescar la caché en segundo plano con la respuesta de red.
      return cached || networkFetch;
    })
  );
});
