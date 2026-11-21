const CACHE = 'mivida-static-v15';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('mivida-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put('./index.html', copy));
      }
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});

// Show a notification when the browser receives a Web Push message.
self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data = { body: event.data.text() };
    }
  }
  if (!data || typeof data !== 'object') data = {};

  const title = String(data.title || data.titulo || 'MiVida');
  const body = String(data.body || data.mensaje || 'Tienes un recordatorio pendiente.');
  const options = {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: String(data.tag || data.id || 'mivida-recordatorio'),
    data: { url: './' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Open or focus MiVida when the user taps a notification.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL('./', self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        if ('focus' in client) return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
