
'use strict';

// PWA: Update cache names any time any of the cached files change.
const CACHE_NAME = 'static-cache-v1';
const DATA_CACHE_NAME = 'data-cache-v1';

// PWA: Add list of files to cache here.
const FILES_TO_CACHE = [

  //HTML & raiz
  '/',
  '/index.html',

  // Scripts
  '/scripts/app.js',
  '/scripts/install.js',

  //Styles
  '/styles/inline.css',

  //images
  '/images/ic_add_white_24px.svg',
  '/images/ic_refresh_white_24px.svg',

];

self.addEventListener('install', (evt) => {
  console.log('[ServiceWorker] Install');
  // PWA: Precache static resources here.
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

/*
activate
El service worker recibirá un evento activate cada vez que se inicie. 
El objetivo principal del evento activate es configurar el comportamiento del service worker, 
limpiar los recursos que quedan de las ejecuciones anteriores (por ejemplo, cachés antiguas) 
y preparar al service worker para manejar las solicitudes de red 
*/
self.addEventListener('activate', (evt) => {
  console.log('[ServiceWorker] Activate');
  // PWA: Remove previous cached data from disk.
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // if (key !== CACHE_NAME) {
        // if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
        if (key !== CACHE_NAME) {

          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );

  self.clients.claim();
});


/**
  El evento fetch permite que el service worker intercepte cualquier solicitud de red y maneje las solicitudes.
   Puede ir a la red para obtener el recurso, puede extraerlo de su propia caché, 
   generar una respuesta personalizada o cualquiera de las múltiples opciones. 
   https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook
   Echa un vistazo a La guía de soluciones sin conexión para ver las diferentes estrategias que puedes usar.  
 */
self.addEventListener('fetch', (evt) => {
  console.log('[ServiceWorker] Fetch', evt.request.url);

  if (evt.request.mode !== 'navigate') {
    // Not a page navigation, bail.
    return;
  }
  evt.respondWith(
    fetch(evt.request)
      .catch(() => {
        return caches.open(CACHE_NAME)
          .then((cache) => {
            return cache.match('index.html');
          });
      })
  );

  // PWA: Add fetch event handler here.
  if (evt.request.url.includes('/forecast/')) {
    console.log('[Service Worker] Fetch (data)', evt.request.url);
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return fetch(evt.request)
          .then((response) => {
            // If the response was good, clone it and store it in the cache.
            if (response.status === 200) {
              cache.put(evt.request.url, response.clone());
            }
            return response;
          }).catch((err) => {
            // Network request failed, try to get it from the cache.
            return cache.match(evt.request);
          });
      }));
    return;
  }
  evt.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(evt.request)
        .then((response) => {
          return response || fetch(evt.request);
        });
    })
  );
  // PWA: Add fetch event handler here.
  //   if (evt.request.mode !== 'navigate') {
  //     // Not a page navigation, bail.
  //     return;
  //   }
  //   evt.respondWith(
  //     fetch(evt.request)
  //       .catch(() => {
  //         return caches.open(CACHE_NAME)
  //           .then((cache) => {
  //             return cache.match('offline.html');
  //           });
  //       })
  //   );

});
