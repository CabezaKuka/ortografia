// Service worker de la app de Dictado.
// Estrategia: network-first con caché de respaldo.
//  - Siempre intenta la red primero → nunca queda pegado en una versión vieja.
//  - Guarda copia de lo que descarga → si no hay internet, la app igual abre.
// Para forzar que todos los dispositivos descarten la caché vieja, subí el número.
const CACHE = "dictado-shell-v16";

// Lo mínimo para que la app arranque sin conexión.
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // allSettled: si falta un ícono, la instalación no se cae igual
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Solo GET sobre http(s) y del mismo origen.
  // Evita romper POST y esquemas como chrome-extension:.
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.origin !== self.location.origin) return; // Google Fonts lo maneja el navegador

  e.respondWith(
    fetch(req)
      .then(res => {
        // Guardar copia fresca (solo respuestas propias y válidas)
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => {
          if (hit) return hit;
          // Navegación sin conexión y sin coincidencia exacta → servir el index
          if (req.mode === "navigate") {
            return caches.match("./index.html").then(idx => idx || new Response("Sin conexión", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            }));
          }
          // Nunca devolver undefined: respondWith lo trata como error de red
          return new Response("", { status: 504, statusText: "Sin conexion" });
        })
      )
  );
});
