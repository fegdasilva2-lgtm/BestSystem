// Sanity check do PWA PredialOps apos a refatoracao para Dexie + Supabase.
// Verifica arquivos, marcadores no HTML/JS e novos modulos em lib/ e views/.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(here, "..");
const repoRoot = path.resolve(mobileRoot, "..", "..");

const requiredFiles = [
  // arquivos do PWA
  ["index.html", mobileRoot],
  ["styles.css", mobileRoot],
  ["app.js", mobileRoot],
  ["manifest.webmanifest", mobileRoot],
  ["sw.js", mobileRoot],
  // modulos novos
  ["db.js", path.join(mobileRoot, "lib")],
  ["state.js", path.join(mobileRoot, "lib")],
  ["sync.js", path.join(mobileRoot, "lib")],
  ["supabase.js", path.join(mobileRoot, "lib")],
  ["ui.js", path.join(mobileRoot, "lib")],
  ["seed.js", path.join(mobileRoot, "lib")],
  ["actions.js", path.join(mobileRoot, "lib")],
  ["render.js", path.join(mobileRoot, "views")],
  // migrations Supabase
  ["0001_base_schema.sql", path.join(repoRoot, "supabase", "migrations")],
  ["0002_rls_policies.sql", path.join(repoRoot, "supabase", "migrations")],
  ["0003_audit_and_outbox.sql", path.join(repoRoot, "supabase", "migrations")],
  ["0004_storage.sql", path.join(repoRoot, "supabase", "migrations")],
  ["0005_seed_sandbox.sql", path.join(repoRoot, "supabase", "migrations")],
  ["config.toml", path.join(repoRoot, "supabase")]
];

const missing = requiredFiles
  .map(([name, dir]) => path.join(dir, name))
  .filter((abs) => !fs.existsSync(abs));

if (missing.length) {
  console.error("Missing files:");
  for (const m of missing) console.error("  - " + m);
  process.exit(1);
}

const html = fs.readFileSync(path.join(mobileRoot, "index.html"), "utf8");
const app  = fs.readFileSync(path.join(mobileRoot, "app.js"), "utf8");
const db   = fs.readFileSync(path.join(mobileRoot, "lib", "db.js"), "utf8");
const sync = fs.readFileSync(path.join(mobileRoot, "lib", "sync.js"), "utf8");
const sb   = fs.readFileSync(path.join(mobileRoot, "lib", "supabase.js"), "utf8");
const views= fs.readFileSync(path.join(mobileRoot, "views", "render.js"), "utf8");
const rls  = fs.readFileSync(path.join(repoRoot, "supabase", "migrations", "0002_rls_policies.sql"), "utf8");

const markers = [
  "PredialOps",
  "requestDialog",
  "renderFoundation",
  "Fundacao SaaS",
  "renderDashboard",
  "renderOrders",
  "renderMeasurements",
  "serviceWorker",
  // novos marcadores da refatoracao
  "Dexie",
  "outbox",
  "audit_logs",
  "tenant_id",
  "current_tenant_id",
  "idempotencyKey"
];

const blob = [html, app, db, sync, sb, views, rls].join("\n");
const absent = markers.filter((m) => !blob.includes(m));
if (absent.length) {
  console.error("Missing markers:");
  for (const a of absent) console.error("  - " + a);
  process.exit(1);
}

console.log("CHECK_OK PredialOps PWA: estrutura, modulos e marcadores OK.");
