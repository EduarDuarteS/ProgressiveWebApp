const cacheName = 'cache-ver2';
const cacheData = 'data-ver1';

const cacheAssets = [
  '/',
  'index.html',

  'images/ic_add_white_24px.svg',
  'images/ic_refresh_white_24px.svg',

  'images/icons/train-512x512.png',
  'images/icons/train-256x256.png',
  'images/icons/train-192x192.png',
  'images/icons/train-152x152.png',
  'images/icons/train-144x144.png',
  'images/icons/train-128x128.png',
  'images/icons/train-32x32.png',
  'scripts/app.js',
  'styles/inline.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(cacheAssets);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== cacheName && key !== cacheData) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/schedules/')) {
    e.respondWith(
      caches.open(cacheData).then((cache) => {
        return fetch(e.request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(e.request.url, response.clone());
            }
            return response;
          }).catch((err) => {
            return cache.match(evt.request);
          });
      }));
    return;
  }
  e.respondWith(
    caches.open(cacheName).then((cache) => {
      return cache.match(e.request)
        .then((response) => {
          return response || fetch(e.request);
        });
    })
  );
  if (e.request.mode !== 'navigate') {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .catch(() => {
        return caches.open(cacheName)
          .then((cache) => {
            return cache.match('');
          });
      })
  );
});