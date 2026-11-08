import { test, expect, screenshot } from "./fixtures";
import { account, apiFor, baseline } from "./environment";
import {
  addComment,
  createDocument,
  currentStatus,
  denial,
  historyMatches,
  login,
  logout,
  openDocument,
  searchDocuments,
  switchRole,
  transition,
  uniqueTitle,
} from "./helpers";
import type { Document } from "../src/lib/types";

let approvedDocument: Document;
const comment =
  "E2E review: document content verified and approved by the assigned reviewer.";
const submissionRemark = "E2E submitted by the document owner.";
const reviewRemark = "E2E assigned reviewer started the review.";
const approvalRemark = "E2E assigned reviewer approved the document.";
function approvalHistory() {
  const users = baseline().users;
  return [
    {
      from: "DRAFT",
      to: "SUBMITTED",
      actor: users.SUBMITTER.id,
      remark: submissionRemark,
    },
    {
      from: "SUBMITTED",
      to: "IN_REVIEW",
      actor: users.REVIEWER.id,
      remark: reviewRemark,
    },
    {
      from: "IN_REVIEW",
      to: "APPROVED",
      actor: users.REVIEWER.id,
      remark: approvalRemark,
    },
  ] as const;
}

test.describe.serial("Browser workflow A–C", () => {
  test("A — submitter creates, assigns, and submits a draft through the UI", async ({
    page,
  }, info) => {
    const user = await login(page, "SUBMITTER");
    approvedDocument = await createDocument(
      page,
      uniqueTitle("approval"),
      baseline().users.REVIEWER.id,
    );
    expect(approvedDocument.submitterId).toBe(user.id);
    await expect(
      page.getByRole("button", { name: "Approve document", exact: true }),
    ).toHaveCount(0);
    await screenshot(page, info, "01-alice-draft");
    await transition(page, approvedDocument, "SUBMITTED", submissionRemark);
    await screenshot(page, info, "02-alice-submitted");
    await page
      .getByRole("link", { name: "All documents", exact: true })
      .click();
    await searchDocuments(page, approvedDocument.title);
    const row = page
      .getByRole("row")
      .filter({
        has: page.getByRole("link", {
          name: `View ${approvedDocument.title}`,
          exact: true,
        }),
      });
    await expect(row).toContainText("Submitted");
    await expect(row).toContainText(`User #${baseline().users.REVIEWER.id}`);
    await logout(page);
  });

  test("B — assigned reviewer starts review, comments, and approves through the UI", async ({
    page,
  }, info) => {
    await login(page, "REVIEWER");
    await expect(
      page.getByRole("link", { name: "New document", exact: true }),
    ).toHaveCount(0);
    await openDocument(page, approvedDocument.title, "Review workspace");
    await currentStatus(page, "SUBMITTED");
    await expect(
      page.getByRole("button", { name: "Approve document", exact: true }),
    ).toHaveCount(0);
    await transition(page, approvedDocument, "IN_REVIEW", reviewRemark);
    await addComment(page, approvedDocument, comment);
    await screenshot(page, info, "03-bob-in-review-with-comment");
    await transition(page, approvedDocument, "APPROVED", approvalRemark);
    await expect(
      page.getByRole("region", { name: "Review comments", exact: true }),
    ).toContainText(comment);
    await historyMatches(page, [...approvalHistory()]);
    await expect(
      page.getByRole("button", { name: "Approve document", exact: true }),
    ).toHaveCount(0);
    await screenshot(page, info, "04-bob-approved-history");
    await logout(page);
  });

  test("C — admin verifies approved document, history, comments, and dashboard totals", async ({
    page,
  }, info) => {
    await login(page, "ADMIN");
    const before = baseline();
    await expect(
      page
        .getByRole("group", { name: "Total documents", exact: true })
        .getByText(String(before.existing.length + 1), { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("group", { name: "Approved", exact: true })
        .getByText(String(before.approvedCount + 1), { exact: true }),
    ).toBeVisible();
    await screenshot(page, info, "05-admin-dashboard-totals");
    await openDocument(page, approvedDocument.title, "Admin workspace");
    await currentStatus(page, "APPROVED");
    await historyMatches(page, [...approvalHistory()]);
    const comments = page.getByRole("region", {
      name: "Review comments",
      exact: true,
    });
    await expect(comments.getByText(comment, { exact: true })).toBeVisible();
    await expect(comments).toContainText(`User #${before.users.REVIEWER.id}`);
    await screenshot(page, info, "06-admin-completed-document");
    await logout(page);
  });
});

test("Authorization — submitter cannot approve or comment, even with spoofed identity fields", async ({
  page,
}, info) => {
  await login(page, "SUBMITTER");
  const doc = await createDocument(
    page,
    uniqueTitle("submitter-denials"),
    baseline().users.REVIEWER.id,
  );
  await transition(page, doc, "SUBMITTED", "E2E negative-test submission.");
  await switchRole(page, "REVIEWER");
  await openDocument(page, doc.title, "Review workspace");
  await transition(
    page,
    doc,
    "IN_REVIEW",
    "E2E prepare a valid approval state before checking submitter denial.",
  );
  await switchRole(page, "SUBMITTER");
  await openDocument(page, doc.title);
  await expect(
    page.getByRole("button", { name: "Approve document", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Add a review comment", { exact: true }),
  ).toHaveCount(0);
  const api = await apiFor("SUBMITTER");
  try {
    const status = await api.put(`/api/documents/${doc.id}/status`, {
      data: {
        status: "APPROVED",
        role: "ADMIN",
        changedByUserId: baseline().users.ADMIN.id,
        reviewerId: baseline().users.SUBMITTER.id,
      },
    });
    await denial(status, /SUBMITTER can only submit/);
    const feedback = await api.post(`/api/documents/${doc.id}/comments`, {
      data: {
        content: "E2E forbidden comment.",
        reviewerId: baseline().users.REVIEWER.id,
        role: "REVIEWER",
      },
    });
    await denial(feedback, /Only REVIEWER or ADMIN/);
    expect(
      (await (await api.get(`/api/documents/${doc.id}`)).json()).status,
    ).toBe("IN_REVIEW");
    expect(
      await (await api.get(`/api/documents/${doc.id}/comments`)).json(),
    ).toEqual([]);
    expect(
      await (await api.get(`/api/documents/${doc.id}/history`)).json(),
    ).toHaveLength(2);
    await info.attach("negative-http", {
      body: JSON.stringify({
        approval: status.status(),
        comment: feedback.status(),
        unchangedStatus: "IN_REVIEW",
      }),
      contentType: "application/json",
    });
  } finally {
    await api.dispose();
  }
  await logout(page);
});

test("Authorization — reviewer cannot access or approve a document assigned to another reviewer", async ({
  page,
}, info) => {
  await login(page, "SUBMITTER");
  // ADMIN is an existing valid reviewer; no additional user accounts are created.
  const doc = await createDocument(
    page,
    uniqueTitle("other-reviewer"),
    baseline().users.ADMIN.id,
  );
  await transition(
    page,
    doc,
    "SUBMITTED",
    "E2E assigned to the administrator for isolation.",
  );
  await switchRole(page, "ADMIN");
  await openDocument(page, doc.title, "Admin workspace");
  await transition(
    page,
    doc,
    "IN_REVIEW",
    "E2E administrator starts review before the wrong-reviewer approval attempt.",
  );
  await switchRole(page, "REVIEWER");
  await page
    .getByRole("link", { name: "Review workspace", exact: true })
    .click();
  await searchDocuments(page, doc.title);
  await expect(
    page.getByRole("heading", { name: "No matching documents", exact: true }),
  ).toBeVisible();
  const api = await apiFor("REVIEWER");
  const statuses: Record<string, number> = {};
  try {
    const forcedScope = await api.get("/api/documents", {
      params: { reviewerId: baseline().users.ADMIN.id, title: doc.title },
    });
    expect(forcedScope.status()).toBe(200);
    expect(await forcedScope.json()).toEqual([]);
    statuses.forgedFilter = forcedScope.status();
    for (const suffix of ["", "/history", "/comments"]) {
      const response = await api.get(`/api/documents/${doc.id}${suffix}`);
      await denial(response, /only access documents assigned/);
      statuses[`GET ${suffix || "details"}`] = response.status();
    }
    const approve = await api.put(`/api/documents/${doc.id}/status`, {
      data: {
        status: "APPROVED",
        reviewerId: baseline().users.REVIEWER.id,
        role: "ADMIN",
      },
    });
    await denial(approve, /only update documents assigned/);
    statuses.approve = approve.status();
    const feedback = await api.post(`/api/documents/${doc.id}/comments`, {
      data: {
        content: "E2E forbidden unassigned review.",
        reviewerId: baseline().users.ADMIN.id,
      },
    });
    await denial(feedback, /only comment on documents assigned/);
    statuses.comment = feedback.status();
  } finally {
    await api.dispose();
  }
  const owner = await apiFor("SUBMITTER");
  try {
    expect(
      (await (await owner.get(`/api/documents/${doc.id}`)).json()).status,
    ).toBe("IN_REVIEW");
  } finally {
    await owner.dispose();
  }
  await info.attach("negative-http", {
    body: JSON.stringify(statuses),
    contentType: "application/json",
  });
  await logout(page);
});

test("Authorization — anonymous requests cannot read or mutate protected resources", async ({
  page,
}, info) => {
  await login(page, "SUBMITTER");
  const doc = await createDocument(
    page,
    uniqueTitle("anonymous-denials"),
    baseline().users.REVIEWER.id,
  );
  await logout(page);
  await page.goto("/documents/new");
  await expect(
    page.getByRole("heading", { name: "Sign in to DOCFLOW", exact: true }),
  ).toBeVisible();
  const api = await apiFor();
  const statuses: Record<string, number> = {};
  try {
    for (const path of [
      "/api/auth/me",
      "/api/documents",
      `/api/documents/${doc.id}`,
      `/api/documents/${doc.id}/history`,
      `/api/documents/${doc.id}/comments`,
    ]) {
      const response = await api.get(path);
      expect(response.status()).toBe(401);
      statuses[`GET ${path}`] = response.status();
    }
    const attemptedTitle = uniqueTitle("anonymous-create-must-not-exist");
    const create = await api.post("/api/documents", {
      data: { title: attemptedTitle, role: "ADMIN" },
    });
    const approve = await api.put(`/api/documents/${doc.id}/status`, {
      data: { status: "APPROVED", role: "ADMIN" },
    });
    const feedback = await api.post(`/api/documents/${doc.id}/comments`, {
      data: { content: "E2E anonymous forbidden comment." },
    });
    for (const response of [create, approve, feedback])
      expect(response.status()).toBe(401);
    Object.assign(statuses, {
      create: create.status(),
      approve: approve.status(),
      comment: feedback.status(),
    });
    const admin = await apiFor("ADMIN");
    try {
      expect(
        (await (await admin.get(`/api/documents/${doc.id}`)).json()).status,
      ).toBe("DRAFT");
      expect(
        await (
          await admin.get("/api/documents", {
            params: { title: attemptedTitle },
          })
        ).json(),
      ).toEqual([]);
      expect(
        await (await admin.get(`/api/documents/${doc.id}/comments`)).json(),
      ).toEqual([]);
      expect(
        await (await admin.get(`/api/documents/${doc.id}/history`)).json(),
      ).toEqual([]);
    } finally {
      await admin.dispose();
    }
  } finally {
    await api.dispose();
  }
  await info.attach("negative-http", {
    body: JSON.stringify(statuses),
    contentType: "application/json",
  });
});

test("Workflow — invalid transitions are rejected; rejection is terminal in the real UI", async ({
  page,
}, info) => {
  await login(page, "ADMIN");
  const user = baseline().users.ADMIN;
  const doc = await createDocument(
    page,
    uniqueTitle("rejection-and-invalid-transitions"),
    baseline().users.REVIEWER.id,
  );
  const api = await apiFor("ADMIN");
  const results: { from: string; to: string; status: number }[] = [];
  try {
    for (const status of ["APPROVED", "IN_REVIEW", "DRAFT"]) {
      const response = await api.put(`/api/documents/${doc.id}/status`, {
        data: { status },
      });
      await denial(response, /Invalid status transition/);
      results.push({ from: "DRAFT", to: status, status: response.status() });
    }
    await transition(page, doc, "SUBMITTED", "E2E rejection case submitted.");
    await transition(
      page,
      doc,
      "IN_REVIEW",
      "E2E administrator started review.",
    );
    await addComment(page, doc, "E2E rejection feedback: changes required.");
    await transition(
      page,
      doc,
      "REJECTED",
      "E2E administrator rejected this disposable document.",
    );
    await historyMatches(page, [
      {
        from: "DRAFT",
        to: "SUBMITTED",
        actor: user.id,
        remark: "E2E rejection case submitted.",
      },
      {
        from: "SUBMITTED",
        to: "IN_REVIEW",
        actor: user.id,
        remark: "E2E administrator started review.",
      },
      {
        from: "IN_REVIEW",
        to: "REJECTED",
        actor: user.id,
        remark: "E2E administrator rejected this disposable document.",
      },
    ]);
    await expect(
      page.getByRole("button", { name: "Approve document", exact: true }),
    ).toHaveCount(0);
    for (const status of ["DRAFT", "APPROVED"]) {
      const response = await api.put(`/api/documents/${doc.id}/status`, {
        data: { status },
      });
      await denial(response, /Invalid status transition/);
      results.push({ from: "REJECTED", to: status, status: response.status() });
    }
    expect(
      (await (await api.get(`/api/documents/${doc.id}`)).json()).status,
    ).toBe("REJECTED");
    expect(
      await (await api.get(`/api/documents/${doc.id}/history`)).json(),
    ).toHaveLength(3);
    await screenshot(page, info, "07-rejected-terminal-history");
  } finally {
    await api.dispose();
  }
  await info.attach("negative-http", {
    body: JSON.stringify(results),
    contentType: "application/json",
  });
  await logout(page);
});

test("Authorization — payload fields cannot change the authenticated actor, initial status, or role", async ({
  page,
}, info) => {
  await login(page, "SUBMITTER");
  const alice = baseline().users.SUBMITTER;
  const doc = await createDocument(
    page,
    uniqueTitle("payload-denials"),
    baseline().users.REVIEWER.id,
  );
  const api = await apiFor("SUBMITTER");
  const spoofedTitle = uniqueTitle("spoofed-create");
  try {
    const response = await api.post("/api/documents", {
      data: {
        title: spoofedTitle,
        description: "Disposable E2E payload-tampering case.",
        reviewerId: baseline().users.REVIEWER.id,
        submitterId: baseline().users.ADMIN.id,
        status: "APPROVED",
        role: "ADMIN",
      },
    });
    // Secure implementations may reject unknown fields or ignore them; either way privileges must not change.
    if (response.status() === 200) {
      const created: Document = await response.json();
      expect(created.submitterId).toBe(alice.id);
      expect(created.status).toBe("DRAFT");
    } else {
      expect([400, 403]).toContain(response.status());
    }
    const submitted = await api.put(`/api/documents/${doc.id}/status`, {
      data: {
        status: "SUBMITTED",
        changedByUserId: baseline().users.ADMIN.id,
        role: "ADMIN",
      },
    });
    expect(submitted.status()).toBe(200);
    const history = await (
      await api.get(`/api/documents/${doc.id}/history`)
    ).json();
    expect(history).toHaveLength(1);
    expect(history[0].changedByUserId).toBe(alice.id);
    const me = await (await api.get("/api/auth/me")).json();
    expect(me.role).toBe("SUBMITTER");
    await info.attach("payload-http", {
      body: JSON.stringify({
        creation: response.status(),
        transition: submitted.status(),
        actualActor: history[0].changedByUserId,
        actualRole: me.role,
      }),
      contentType: "application/json",
    });
  } finally {
    await api.dispose();
  }
  const reviewer = await apiFor("REVIEWER");
  try {
    const response = await reviewer.post("/api/documents", {
      data: {
        title: uniqueTitle("reviewer-create-must-not-exist"),
        role: "ADMIN",
        submitterId: alice.id,
      },
    });
    await denial(response, /Only SUBMITTER or ADMIN/);
  } finally {
    await reviewer.dispose();
  }
  await logout(page);
});

test("Authentication — invalid login is clear and refresh does not persist credentials", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("Username", { exact: true })
    .fill(account("ADMIN").username);
  await page
    .getByLabel("Password", { exact: true })
    .fill("intentionally-invalid-e2e-password");
  const responsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/auth/me",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  expect((await responsePromise).status()).toBe(401);
  await expect(page.getByRole("alert")).toHaveText(
    "Your credentials were not accepted. Please sign in again.",
  );
  await login(page, "ADMIN");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign in to DOCFLOW", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
});
