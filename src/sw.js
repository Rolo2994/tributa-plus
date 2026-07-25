import { precacheAndRoute } from 'workbox-precaching'

// Esta línea la necesita vite-plugin-pwa — no la borres aunque no
// la uses directamente: ahí es donde inyecta la lista de archivos
// para que la app funcione offline.
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus()
      return clients.openWindow('/')
    })
  )
})