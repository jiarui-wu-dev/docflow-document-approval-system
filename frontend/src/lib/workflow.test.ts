import { describe, expect, it } from "vitest";
import { availableTransitions, canComment } from "./workflow";
import {
  statuses,
  type Document,
  type Role,
  type Status,
  type User,
} from "./types";
const doc: Document = {
  id: 10,
  title: "Policy",
  description: null,
  status: "DRAFT",
  submitterId: 1,
  reviewerId: 2,
  createdAt: "",
  updatedAt: "",
};
const submitter: User = { id: 1, username: "author", role: "SUBMITTER" };
const reviewer: User = { id: 2, username: "reviewer", role: "REVIEWER" };
const admin: User = { id: 3, username: "admin", role: "ADMIN" };
describe("backend workflow parity", () => {
  const transitions: Record<Status, Status[]> = {
    DRAFT: ["SUBMITTED"],
    SUBMITTED: ["IN_REVIEW"],
    IN_REVIEW: ["APPROVED", "REJECTED"],
    APPROVED: [],
    REJECTED: [],
  };
  for (const status of statuses) {
    it(`allows only valid admin transitions from ${status}`, () =>
      expect(availableTransitions({ ...doc, status }, admin)).toEqual(
        transitions[status],
      ));
    it(`restricts author transitions from ${status}`, () =>
      expect(availableTransitions({ ...doc, status }, submitter)).toEqual(
        status === "DRAFT" ? ["SUBMITTED"] : [],
      ));
    it(`restricts assigned reviewer transitions from ${status}`, () =>
      expect(availableTransitions({ ...doc, status }, reviewer)).toEqual(
        status === "SUBMITTED" || status === "IN_REVIEW"
          ? transitions[status]
          : [],
      ));
    it(`blocks non-owner and unassigned reviewer from ${status}`, () => {
      expect(
        availableTransitions({ ...doc, status, submitterId: 9 }, submitter),
      ).toEqual([]);
      expect(
        availableTransitions({ ...doc, status, reviewerId: null }, reviewer),
      ).toEqual([]);
    });
  }
  it.each<Role>(["SUBMITTER", "REVIEWER", "ADMIN"])(
    "matches comment permission for %s",
    (role) => {
      const user = { ...reviewer, role };
      expect(canComment(doc, user)).toBe(role !== "SUBMITTER");
      expect(canComment({ ...doc, reviewerId: 99 }, user)).toBe(
        role === "ADMIN",
      );
    },
  );
});
