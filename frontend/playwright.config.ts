import { defineConfig } from "@playwright/test";

// Suppress automatic DOM error snapshots; diagnostic artifacts must never contain credentials.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  forbidOnly: !!process.env.CI,
  outputDir: "./e2e-results/artifacts",
  reporter: [["./e2e/reporter.ts"]],
  globalSetup: "./e2e/prepare.ts",
  globalTeardown: "./e2e/verify-isolation.ts",
  use: {
    baseURL: process.env.DOCFLOW_E2E_BASE_URL || "http://localhost:5173",
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1050 },
    locale: "en-GB",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
});
