import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { redact, resultsDir } from "./environment";

/** Intentionally omits action parameters, headers, raw traces, stdout, and storage state. */
export default class SafeReporter implements Reporter {
  private tests: unknown[] = [];
  private globalErrors: string[] = [];
  onTestEnd(test: TestCase, result: TestResult) {
    const errors = result.errors.map((error) =>
      redact(error.message || "Test failed"),
    );
    const diagnostics = resolve(resultsDir, "diagnostics");
    mkdirSync(diagnostics, { recursive: true });
    const attachments = result.attachments.map((attachment, index) => {
      let path = attachment.path;
      if (attachment.body) {
        path = resolve(
          diagnostics,
          `${this.tests.length + 1}-${index}-${attachment.name.replace(/[^a-z0-9-]/gi, "-")}.json`,
        );
        writeFileSync(path, redact(attachment.body.toString("utf8")));
      } else if (attachment.name === "error-context" && path) {
        writeFileSync(path, redact(readFileSync(path, "utf8")));
      }
      return {
        name: attachment.name,
        path,
        contentType: attachment.contentType,
      };
    });
    const record = {
      title: test.titlePath().filter(Boolean).join(" > "),
      status: result.status,
      durationMs: result.duration,
      errors,
      attachments,
    };
    this.tests.push(record);
    console.log(`${result.status.toUpperCase()}: ${record.title}`);
    for (const error of errors) console.log(error);
  }
  onError(error: { message?: string }) {
    const message = redact(error.message || "Runner error");
    this.globalErrors.push(message);
    console.log(message);
  }
  onStdOut() {
    /* Avoid recording action/debug output that might contain secrets. */
  }
  onStdErr() {
    /* Failures are reported through the sanitized error channel. */
  }
  onEnd(result: FullResult) {
    mkdirSync(resultsDir, { recursive: true });
    writeFileSync(
      resolve(resultsDir, "report.json"),
      JSON.stringify(
        {
          status: result.status,
          globalErrors: this.globalErrors,
          tests: this.tests,
        },
        null,
        2,
      ),
    );
    console.log(
      `E2E result: ${result.status}. Sanitized report: e2e-results/report.json`,
    );
  }
}
