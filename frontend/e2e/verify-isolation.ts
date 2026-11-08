import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { apiFor, baseline, fingerprint, resultsDir } from "./environment";
import type { Document } from "../src/lib/types";

export default async function verifyIsolation() {
  const before = baseline();
  const api = await apiFor("ADMIN");
  try {
    const response = await api.get("/api/documents");
    if (!response.ok())
      throw new Error(
        `Isolation verification failed: HTTP ${response.status()}`,
      );
    const after: Document[] = await response.json();
    const changed = before.existing.filter((old) => {
      const current = after.find((doc) => doc.id === old.id);
      return !current || fingerprint(current) !== old.digest;
    });
    const disposable = after
      .filter((doc) => doc.title.startsWith(before.prefix))
      .map(({ id, title, status, submitterId, reviewerId }) => ({
        id,
        title,
        status,
        submitterId,
        reviewerId,
      }));
    writeFileSync(
      resolve(resultsDir, "isolation.json"),
      JSON.stringify(
        {
          prefix: before.prefix,
          preExistingCount: before.existing.length,
          preExistingUnchanged: changed.length === 0,
          changedIds: changed.map((doc) => doc.id),
          disposable,
          cleanup:
            "Retained: the API has no delete endpoint. No database reset or user changes were performed.",
        },
        null,
        2,
      ),
    );
    if (changed.length)
      throw new Error(
        "A pre-existing document changed during the run; see isolation.json IDs.",
      );
    console.log(
      `Isolation passed: ${before.existing.length} original documents unchanged; ${disposable.length} disposable records retained with the unique run prefix.`,
    );
  } finally {
    await api.dispose();
  }
}
