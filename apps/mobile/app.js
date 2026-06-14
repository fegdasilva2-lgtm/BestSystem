// Bootstrap e entrypoint do PWA PredialOps
// Inicializa Dexie, hidrata o estado, configura listeners online/offline
// e registra o service worker.

import { initDb, db } from "./lib/db.js";
import { hydrateState, attachAutoSave, saveState } from "./lib/state.js";
import { render } from "./views/render.js";
import { wireGlobalActions } from "./lib/actions.js";
import { initSync, requestSync } from "./lib/sync.js";

async function start() {
  await initDb();
  await hydrateState();

  // Auto-save sempre que o estado mudar
  attachAutoSave();

  // Estado inicial da UI
  window.addEventListener("online", () => {
    document.body.classList.remove("offline");
    document.body.classList.add("online");
    requestSync("auto-online");
  });
  window.addEventListener("offline", () => {
    document.body.classList.add("offline");
    document.body.classList.remove("online");
  });
  document.body.classList.toggle("offline", !navigator.onLine);
  document.body.classList.toggle("online", navigator.onLine);

  wireGlobalActions();
  await initSync();
  render();

  // Service worker (apenas em producao ou https)
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (err) {
      console.warn("SW register failed", err);
    }
  }

  // Expor para debug
  window.__predialops = { db, saveState };
}

start().catch((err) => {
  console.error("Falha ao iniciar PredialOps PWA", err);
  document.body.innerHTML =
    '<div style="padding:24px;font-family:sans-serif">Falha ao iniciar o aplicativo. Verifique o console.</div>';
});
