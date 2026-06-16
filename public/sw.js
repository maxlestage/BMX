// bmx — Service Worker
// Stratégies :
//  - assets fingerprintés <base>assets/*       → cache-first (immutables)
//  - images & icônes statiques                 → stale-while-revalidate
//  - navigations (document)                     → network-first + fallback offline.html
//
// Le précache du shell permet un lancement hors-ligne complet (PWA).
//
// BASE est dérivé du scope d'enregistrement → fonctionne à la racine ("/")
// comme sous un sous-chemin GitHub Pages ("/BMX/").

const VERSION = 'v4';
const ASSETS = `bmx-assets-${VERSION}`;
const PAGES = `bmx-pages-${VERSION}`;
const RUNTIME = `bmx-runtime-${VERSION}`;
const BASE = new URL(self.registration.scope).pathname; // se termine par "/"
const OFFLINE = `${BASE}offline.html`;

const PRECACHE = [BASE, OFFLINE, `${BASE}favicon-32.png`, `${BASE}site.webmanifest`];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGES).then((c) =>
      Promise.all(
        PRECACHE.map((url) =>
          c.add(new Request(url, { cache: 'reload' })).catch(() => null),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![ASSETS, PAGES, RUNTIME].includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) => url.pathname.startsWith(`${BASE}assets/`);
const isImage = (url) => /\.(png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isAsset(url)) {
    event.respondWith(cacheFirst(req, ASSETS));
    return;
  }
  if (isImage(url)) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME));
    return;
  }
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirst(req, PAGES));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await network) || Response.error();
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(req)) || (await cache.match(BASE));
    if (hit) return hit;
    return cache.match(OFFLINE);
  }
}

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// --- Web Push : notifications natives (nouveaux messages) -------------------

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text ? event.data.text() : '' };
  }
  const title = data.title || 'bmx';
  const options = {
    body: data.body || '',
    icon: `${BASE}icon-192.png`,
    badge: `${BASE}favicon-32.png`,
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || '' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur une notification : focalise un onglet existant ou en ouvre un,
// en naviguant vers l'URL fournie (ex. #tab=messages).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '', `${self.location.origin}${BASE}`).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(`${self.location.origin}${BASE}`) && 'focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
