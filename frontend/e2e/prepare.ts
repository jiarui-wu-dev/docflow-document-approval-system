import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { apiFor, fingerprint, resultsDir, type Baseline } from "./environment";
import type { Document, Role, User } from "../src/lib/types";

export default async function prepare() {
  mkdirSync(resultsDir, { recursive: true });
  const users = {} as Record<Role, User>;
  for (const role of ["SUBMITTER", "REVIEWER", "ADMIN"] as const) {
    const api = await apiFor(role);
    try {
      const response = await api.get("/api/auth/me");
      if (response.status() !== 200)
        throw new Error(
          `E2E preflight identity failed for ${role}: HTTP ${response.status()}`,
        );
      const user: User = await response.json();
      if (
        user.role !== role ||
        Object.keys(user).sort().join(",") !== "id,role,username"
      )
        throw new Error(`Unexpected identity contract for ${role}`);
      users[role] = user;
    } finally {
      await api.dispose();
    }
  }
  const api = await apiFor("ADMIN");
  try {
    const response = await api.get("/api/documents");
    if (!response.ok())
      throw new Error(
        `Baseline document read failed: HTTP ${response.status()}`,
      );
    const documents: Document[] = await response.json();
    const data: Baseline = {
      prefix: `E2E-DOCFLOW-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 6)}`,
      users,
      approvedCount: documents.filter((doc) => doc.status === "APPROVED")
        .length,
      existing: documents.map((doc) => ({
        id: doc.id,
        digest: fingerprint(doc),
      })),
    };
    writeFileSync(
      resolve(resultsDir, "baseline.json"),
      JSON.stringify(data, null, 2),
    );
    console.log(
      `Preflight passed. ${documents.length} pre-existing documents fingerprinted; all new records use ${data.prefix}.`,
    );
  } finally {
    await api.dispose();
  }
}
