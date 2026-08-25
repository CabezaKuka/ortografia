// Service worker mínimo: solo existir + interceptar fetch es requisito
// de Chrome/Android para mostrar el prompt de instalación.
// No cachea nada agresivamente para no complicar actualizaciones futuras.
const CACHE = "dictado-shell-v3";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // network-first, sin cache forzado: evita que quede pegado en versión vieja
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
