import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { request, type APIRequestContext } from "@playwright/test";
import type { Document, Role, User } from "../src/lib/types";

export const resultsDir = resolve("e2e-results");
export const backendURL =
  process.env.DOCFLOW_E2E_API_URL || "http://localhost:8080";
export function account(role: Role) {
  const key =
    role === "SUBMITTER" ? "ALICE" : role === "REVIEWER" ? "BOB" : "ADMIN";
  const username =
    process.env[`DOCFLOW_E2E_${key}_USERNAME`] || key.toLowerCase();
  const password =
    process.env[`DOCFLOW_E2E_${key}_PASSWORD`] ||
    process.env.DOCFLOW_E2E_PASSWORD;
  if (!password)
    throw new Error(
      `Set DOCFLOW_E2E_${key}_PASSWORD or DOCFLOW_E2E_PASSWORD in the process environment before testing.`,
    );
  return { username, password };
}
export function redact(value: string): string {
  let safe = value;
  for (const role of ["SUBMITTER", "REVIEWER", "ADMIN"] as const) {
    try {
      const { username, password } = account(role);
      for (const secret of [
        password,
        Buffer.from(`${username}:${password}`).toString("base64"),
      ])
        safe = safe.split(secret).join("<redacted>");
    } catch {
      /* Missing environment variables are reported without their values. */
    }
  }
  return safe.replace(/Basic\s+[A-Za-z0-9+/=]+/g, "Basic <redacted>");
}
export async function apiFor(role?: Role): Promise<APIRequestContext> {
  const identity = role ? account(role) : null;
  return request.newContext({
    baseURL: backendURL,
    extraHTTPHeaders: identity
      ? {
          Authorization: `Basic ${Buffer.from(`${identity.username}:${identity.password}`).toString("base64")}`,
          "X-Requested-With": "XMLHttpRequest",
        }
      : {},
  });
}
export function fingerprint(doc: Document) {
  return createHash("sha256").update(JSON.stringify(doc)).digest("hex");
}
export interface Baseline {
  prefix: string;
  users: Record<Role, User>;
  approvedCount: number;
  existing: { id: number; digest: string }[];
}
export function baseline(): Baseline {
  return JSON.parse(
    readFileSync(resolve(resultsDir, "baseline.json"), "utf8"),
  ) as Baseline;
}
