import { randomUUID } from "node:crypto";
import { expect, type APIResponse, type Page } from "@playwright/test";
import { account, baseline } from "./environment";
import type { Document, Role, Status, User } from "../src/lib/types";

const labels: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
const actions: Partial<Record<Status, string>> = {
  SUBMITTED: "Submit for review",
  IN_REVIEW: "Start review",
  APPROVED: "Approve document",
  REJECTED: "Reject document",
};
export function uniqueTitle(label: string) {
  return `${baseline().prefix} ${label} ${randomUUID().slice(0, 6)}`;
}

export async function login(page: Page, role: Role) {
  const credentials = account(role);
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(credentials.username);
  try {
    await page
      .getByLabel("Password", { exact: true })
      .fill(credentials.password);
  } catch {
    throw new Error(
      "The password control could not be populated. Credential values are intentionally omitted.",
    );
  }
  const responsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/auth/me",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const response = await responsePromise;
  expect(response.status(), `Frontend identity response for ${role}`).toBe(200);
  const user: User = await response.json();
  expect(user).toEqual(baseline().users[role]);
  expect(Object.keys(user).sort()).toEqual(["id", "role", "username"]);
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText(role.toLowerCase());
  return user;
}

export async function logout(page: Page) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (
    (await menu.isVisible()) &&
    (await menu.getAttribute("aria-expanded")) !== "true"
  )
    await menu.click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in to DOCFLOW", exact: true }),
  ).toBeVisible();
}
export async function switchRole(page: Page, role: Role) {
  await logout(page);
  return login(page, role);
}
export async function currentStatus(page: Page, status: Status) {
  await expect(
    page.getByRole("status", { name: "Current document status", exact: true }),
  ).toHaveText(labels[status]);
}

export async function createDocument(
  page: Page,
  title: string,
  reviewerId: number,
) {
  await page.getByRole("link", { name: "New document", exact: true }).click();
  await page.getByLabel("Document title", { exact: false }).fill(title);
  await page
    .getByLabel("Description Optional", { exact: true })
    .fill(
      `Disposable automated E2E document. Run: ${baseline().prefix}. Retained for audit; safe to remove after testing.`,
    );
  await page
    .getByLabel("Reviewer user ID Optional", { exact: true })
    .fill(String(reviewerId));
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/documents" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create draft", exact: true }).click();
  const response = await responsePromise;
  expect(response.status(), "Create document through the frontend").toBe(200);
  const doc: Document = await response.json();
  expect(doc.title).toBe(title);
  expect(doc.reviewerId).toBe(reviewerId);
  await expect(
    page.getByRole("heading", { level: 1, name: title, exact: true }),
  ).toBeVisible();
  await currentStatus(page, "DRAFT");
  return doc;
}

export async function transition(
  page: Page,
  doc: Document,
  status: Status,
  remark: string,
) {
  await page
    .getByRole("button", { name: actions[status], exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: actions[status],
    exact: true,
  });
  await dialog
    .getByLabel("Decision remark Optional", { exact: true })
    .fill(remark);
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === `/api/documents/${doc.id}/status` &&
      response.request().method() === "PUT",
  );
  await dialog
    .getByRole("button", {
      name: `Confirm ${labels[status].toLowerCase()}`,
      exact: true,
    })
    .click();
  const response = await responsePromise;
  expect(response.status(), `Frontend transition to ${status}`).toBe(200);
  await expect(dialog).not.toBeVisible();
  await currentStatus(page, status);
}

export async function searchDocuments(page: Page, title: string) {
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/documents" &&
      url.searchParams.get("title") === title
    );
  });
  await page
    .getByRole("textbox", { name: "Search documents by title", exact: true })
    .fill(title);
  const response = await responsePromise;
  expect(response.status()).toBe(200);
}
export async function openDocument(
  page: Page,
  title: string,
  workspace:
    | "All documents"
    | "Review workspace"
    | "Admin workspace" = "All documents",
) {
  await page.getByRole("link", { name: workspace, exact: true }).click();
  await searchDocuments(page, title);
  await page.getByRole("link", { name: `View ${title}`, exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: title, exact: true }),
  ).toBeVisible();
}
export async function addComment(page: Page, doc: Document, content: string) {
  await page.getByLabel("Add a review comment", { exact: true }).fill(content);
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        `/api/documents/${doc.id}/comments` &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Post comment", exact: true }).click();
  expect((await responsePromise).status()).toBe(200);
  await expect(
    page
      .getByRole("region", { name: "Review comments", exact: true })
      .getByText(content, { exact: true }),
  ).toBeVisible();
}
export async function historyMatches(
  page: Page,
  entries: { from: Status; to: Status; actor: number; remark: string }[],
) {
  const articles = page
    .getByRole("region", { name: "Approval history", exact: true })
    .getByRole("article");
  await expect(articles).toHaveCount(entries.length);
  for (const [index, entry] of entries.entries()) {
    const article = articles.nth(index);
    await expect(
      article.getByText(labels[entry.from], { exact: true }),
    ).toBeVisible();
    await expect(
      article.getByText(labels[entry.to], { exact: true }),
    ).toBeVisible();
    await expect(article).toContainText(`User #${entry.actor}`);
    await expect(
      article.getByText(entry.remark, { exact: true }),
    ).toBeVisible();
  }
}
export async function denial(response: APIResponse, message: RegExp) {
  expect(
    response.status(),
    `Authorization/business-rule status for ${new URL(response.url()).pathname}`,
  ).toBe(400);
  expect((await response.json()).message).toMatch(message);
}
