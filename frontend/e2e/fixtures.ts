import {
  test as base,
  expect,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { redact } from "./environment";

export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use, info) => {
      const http: { method: string; path: string; status: number }[] = [];
      const runtimeErrors: string[] = [];
      page.on("response", (response) => {
        const path = new URL(response.url()).pathname;
        if (path.startsWith("/api/"))
          http.push({
            method: response.request().method(),
            path,
            status: response.status(),
          });
      });
      page.on("pageerror", (error) =>
        runtimeErrors.push(redact(error.message)),
      );
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !/Failed to load resource.*(?:400|401|403|404)/.test(message.text())
        )
          runtimeErrors.push(redact(message.text()));
      });
      page.on("requestfailed", (request) => {
        const failure = request.failure()?.errorText || "";
        if (failure && !failure.includes("ERR_ABORTED"))
          runtimeErrors.push(`${new URL(request.url()).pathname}: ${failure}`);
      });
      try {
        await use();
      } finally {
        await info.attach("browser-http-and-console", {
          body: JSON.stringify({ http, runtimeErrors }, null, 2),
          contentType: "application/json",
        });
        expect
          .soft(
            http.filter((event) => event.status >= 500),
            "No server failures in browser requests",
          )
          .toEqual([]);
        expect
          .soft(
            runtimeErrors,
            "No browser runtime, console, or connection errors",
          )
          .toEqual([]);
      }
    },
    { auto: true },
  ],
});
export { expect };

export async function screenshot(page: Page, info: TestInfo, name: string) {
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}
