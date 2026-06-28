import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para testes E2E do PredialOps.
 *
 * Estrutura:
 *   tests/e2e/
 *     global-setup.ts     - cria 14 usuarios de teste (um por role)
 *     auth.setup.ts       - gera storageState por role
 *     fixtures.ts         - exporta `test` autenticado por role
 *     rbac-matrix.spec.ts - testa matriz RBAC end-to-end
 *
 * Env vars necessarias:
 *   BASE_URL              - default http://localhost:3000
 *   SUPABASE_URL          - URL do projeto Supabase
 *   SUPABASE_ANON_KEY     - chave publica
 *   SUPABASE_SERVICE_ROLE_KEY - service role (para criar usuarios de teste)
 *   E2E_TEST_TENANT_ID    - tenant_id onde criar os 14 usuarios de teste
 *
 * Sem essas env vars, os testes sao pulados via test.skip().
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const HAS_SUPABASE = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["junit", { outputFile: "playwright-results.xml" }], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Nao sobe webServer automaticamente - CI assume que ja esta rodando,
  // ou que `npm run dev:web` sera invocado antes pelo job.
  // Para rodar local com auto-start:
  //   npm run test:e2e -- --webServer
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        command: "npm run dev:web",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      },

  // Setup global: cria usuarios de teste e gera storageState por role.
  globalSetup: HAS_SUPABASE ? "./tests/e2e/global-setup.ts" : undefined,
});