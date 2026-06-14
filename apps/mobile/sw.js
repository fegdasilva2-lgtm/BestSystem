// Service Worker do PWA PredialOps (estilo Workbox, sem runtime).
// Estrategias:
//   - precache do shell (cache-first)
//   - network-first com fallback para cache nas navegacoes HTML
//   - cache-first para estaticos versionados (hash no nome)
//   - network-first para /api/* com fallback para cache
//   - Background Sync para POST/PUT/PATCH/DELETE no Supabase
//   - fila de upload retomada no reconnect

const VERSION = "predialops-v2";
const SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/assets/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignora requisicoes de extensoes e websocket
  if (url.protocol === "chrome-extension:" || url.protocol === "ws:") return;

  // Mutacoes: enfileira no outbox via Background Sync (quando suportado)
  if (req.method !== "GET" && isSupabase(url)) {
    event.respondWith(handleMutation(req));
    return;
  }

  // API (Supabase REST): network-first, fallback cache
  if (isSupabase(url) && req.method === "GET") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Navegacao HTML: network-first com fallback index
  if (req.mode === "navigate") {
    event.respondWith(navigationStrategy(req));
    return;
  }

  // Estaticos: cache-first
  event.respondWith(cacheFirst(req));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "outbox-drain") {
    event.waitUntil(notifyClientsToDrain());
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// =====================================================================
// Estrategias
// =====================================================================

async function navigationStrategy(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(VERSION);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return caches.match("/index.html");
  }
}

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(VERSION);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return new Response("offline", { status: 503 });
  }
}

async function handleMutation(req) {
  // Tenta enviar agora; se falhar (offline), enfileira Background Sync
  try {
    return await fetch(req.clone());
  } catch (err) {
    if ("sync" in self.registration) {
      try {
        await self.registration.sync.register("outbox-drain");
      } catch { /* SW sem background sync (Firefox/Safari) */ }
    }
    // Sinaliza o app para enfileirar no outbox local (Dexie)
    return new Response(JSON.stringify({ queued: true, reason: "offline" }), {
      status: 202,
      headers: { "Content-Type": "application/json" }
    });
  }
}

async function notifyClientsToDrain() {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const c of clients) c.postMessage({ type: "DRAIN_OUTBOX" });
}

function isSupabase(url) {
  return url.hostname.endsWith(".supabase.co") || url.pathname.startsWith("/api/");
}
