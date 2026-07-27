const CACHE_NAME = 'mm-erp-assets-v1.2.3';
const STATIC_FILES = ['/logo-mm.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_FILES)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('mm-erp-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = { body: event.data?.text() || 'Você tem um novo lembrete no MM ERP.' };
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'MM ERP', {
    body: payload.body || 'Você tem um novo lembrete.',
    icon: '/logo-mm.png',
    badge: '/logo-mm.png',
    tag: payload.tag || `mm-erp-${Date.now()}`,
    data: { url: payload.url || '/app/dashboard' },
    vibrate: [200, 100, 200],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/app/dashboard', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.location.origin));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || url.pathname === '/version.json') {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname === '/logo-mm.png') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
