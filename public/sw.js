self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('ms-app-shell-v1').then((cache) => cache.addAll(['/', '/manifest.webmanifest']))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone()
        caches.open('ms-runtime-v1').then((cache) => cache.put(req, copy)).catch(() => undefined)
        return res
      }).catch(() => cached || Response.error()),
    )
  )
})

