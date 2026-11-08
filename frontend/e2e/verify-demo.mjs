/** Read-only verification of the local synthetic dataset. Never creates or changes records. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect, request } from "@playwright/test";

const baseURL = process.env.DOCFLOW_E2E_BASE_URL || "http://localhost:5173";
const apiURL = process.env.DOCFLOW_E2E_API_URL || "http://localhost:8080";
for (const url of [baseURL, apiURL]) {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname))
    throw new Error("Demo verification is restricted to local development URLs.");
}
const roles = { alice: "SUBMITTER", bob: "REVIEWER", admin: "ADMIN" };
const accounts = Object.keys(roles).map((username) => {
  const password = process.env[`DOCFLOW_E2E_${username.toUpperCase()}_PASSWORD`] || process.env.DOCFLOW_E2E_PASSWORD;
  if (!password) throw new Error(`Supply the ${username} test password through the process environment.`);
  return { username, password, role: roles[username] };
});
const synthetic = (doc) => doc.title.startsWith("[DEMO-V1-") && doc.description?.startsWith("Synthetic demo data | dataset=DOCFLOW-DEMO-V1 | key=");
const target = { DRAFT: 15, SUBMITTED: 30, IN_REVIEW: 35, APPROVED: 50, REJECTED: 20 };
const counts = (documents) => Object.fromEntries(Object.keys(target).map((status) => [status, documents.filter((d) => d.status === status).length]));
const screenshots = resolve("../docs/screenshots");
const browserErrors = [];
const results = [];
let browser;

function redact(message) {
  let safe = String(message);
  for (const { username, password } of accounts) {
    safe = safe.split(password).join("<redacted>").split(Buffer.from(`${username}:${password}`).toString("base64")).join("<redacted>");
  }
  return safe;
}
async function client(account) {
  return request.newContext({ baseURL: apiURL, extraHTTPHeaders: {
    Authorization: `Basic ${Buffer.from(`${account.username}:${account.password}`).toString("base64")}`,
    "X-Requested-With": "XMLHttpRequest",
  }});
}
async function safeScreenshot(page, name) {
  assert.equal(await page.getByLabel("Password", { exact: true }).count(), 0);
  await page.screenshot({ path: resolve(screenshots, name), fullPage: !name.endsWith("documents.png"), animations: "disabled" });
}

try {
  await mkdir(screenshots, { recursive: true });
  const admin = await client(accounts.find((a) => a.username === "admin"));
  let all;
  try {
    const response = await admin.get("/api/documents");
    assert.equal(response.status(), 200);
    all = await response.json();
  } finally { await admin.dispose(); }
  assert.equal(all.filter(synthetic).length, 150);
  assert.deepEqual(counts(all.filter(synthetic)), target);
  const adminOwned = all.find((d) => synthetic(d) && d.title.startsWith("[DEMO-V1-005]"));
  const adminReviewed = all.find((d) => synthetic(d) && d.title.startsWith("[DEMO-V1-004]"));
  assert.ok(adminOwned && adminReviewed);
  browser = await chromium.launch({ headless: true });
  for (const account of accounts) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, locale: "en-GB", reducedMotion: "reduce" });
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => browserErrors.push(redact(error.message)));
      page.on("console", (message) => {
        if (message.type() === "error" && !/Failed to load resource.*(?:400|401|403|404)/.test(message.text()))
          browserErrors.push(redact(message.text()));
      });
      page.on("response", (response) => {
        if (response.status() >= 500) browserErrors.push(`${new URL(response.url()).pathname}: ${response.status()}`);
      });
      await page.goto(baseURL + "/login");
      await page.getByLabel("Username", { exact: true }).fill(account.username);
      await page.getByLabel("Password", { exact: true }).fill(account.password);
      const identityPromise = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/auth/me");
      const documentsPromise = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/documents" && r.status() === 200);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      const identityResponse = await identityPromise;
      assert.equal(identityResponse.status(), 200);
      const identity = await identityResponse.json();
      assert.deepEqual(Object.keys(identity).sort(), ["id", "role", "username"]);
      assert.equal(identity.role, account.role);
      const documents = await (await documentsPromise).json();
      const expected = all.filter((d) => account.role === "ADMIN" || (account.role === "SUBMITTER" ? d.submitterId === identity.id : d.reviewerId === identity.id));
      assert.deepEqual(documents.map((d) => d.id).sort((a, b) => a - b), expected.map((d) => d.id).sort((a, b) => a - b));
      await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
      const byStatus = counts(expected);
      for (const [label, value] of Object.entries({
        "Total documents": expected.length, Drafts: byStatus.DRAFT,
        "Pending review": byStatus.SUBMITTED + byStatus.IN_REVIEW,
        Approved: byStatus.APPROVED, Rejected: byStatus.REJECTED,
      })) {
        await expect(page.getByRole("group", { name: label, exact: true }).locator("strong")).toHaveText(String(value));
      }
      const summary = page.locator(".status-summary");
      for (const [status, value] of Object.entries(byStatus)) {
        const item = summary.locator(`a[href="/documents?status=${status}"]`);
        await expect(item.locator("strong")).toHaveText(`${value}${Math.round(value / expected.length * 100)}%`);
        const meterWidth = await item.locator(".status-meter > span").evaluate((node) => Number.parseFloat(node.style.width));
        assert.ok(Math.abs(meterWidth - value / expected.length * 100) < 0.001);
      }
      await safeScreenshot(page, `demo-${account.username}-dashboard.png`);
      await page.getByRole("link", { name: "All documents", exact: true }).click();
      await expect(page.getByRole("heading", { name: "All documents", exact: true })).toBeVisible();
      await page.getByRole("textbox", { name: "Search documents by title", exact: true }).fill("[DEMO-V1-");
      const rows = page.getByRole("table").getByRole("row");
      await expect(rows).toHaveCount(expected.filter(synthetic).length + 1);
      if (account.role === "ADMIN") {
        await safeScreenshot(page, "demo-admin-documents.png");
        await page.getByRole("link", { name: new RegExp("DEMO-V1-004") }).first().click();
        await expect(page.getByRole("status", { name: "Current document status", exact: true })).toHaveText("Approved");
        await expect(page.getByRole("region", { name: "Approval history", exact: true }).getByRole("article")).toHaveCount(3);
        await safeScreenshot(page, "demo-approved-document.png");
      }
      const api = await client(account);
      try {
        const deniedDocument = account.role === "SUBMITTER" ? adminOwned : adminReviewed;
        for (const suffix of ["", "/history", "/comments"]) {
          const response = await api.get(`/api/documents/${deniedDocument.id}${suffix}`);
          assert.equal(response.status(), account.role === "ADMIN" ? 200 : 400);
        }
      } finally { await api.dispose(); }
      results.push({ username: account.username, role: account.role, visibleDocuments: expected.length,
        visibleDemoDocuments: expected.filter(synthetic).length, byStatus,
        dashboardAndDistribution: "passed", filteredList: "passed", resourceScope: "passed" });
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
    } finally { await context.close(); }
  }
  assert.deepEqual(browserErrors, []);
  const report = { dataset: "DOCFLOW-DEMO-V1", mode: "read-only browser and API verification", results, browserErrors };
  await mkdir(resolve("e2e-results"), { recursive: true });
  await writeFile(resolve("e2e-results/demo-verification.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(redact(error.message));
  process.exitCode = 1;
} finally {
  await browser?.close();
}
