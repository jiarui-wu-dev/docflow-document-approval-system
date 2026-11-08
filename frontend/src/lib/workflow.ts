import type { Document, Status, User } from "./types";
export const statusLabels: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
export function availableTransitions(doc: Document, user: User): Status[] {
  if (
    doc.status === "DRAFT" &&
    (user.role === "ADMIN" ||
      (user.role === "SUBMITTER" && doc.submitterId === user.id))
  )
    return ["SUBMITTED"];
  const canReview =
    user.role === "ADMIN" ||
    (user.role === "REVIEWER" && doc.reviewerId === user.id);
  if (canReview && doc.status === "SUBMITTED") return ["IN_REVIEW"];
  if (canReview && doc.status === "IN_REVIEW") return ["APPROVED", "REJECTED"];
  return [];
}
export function canComment(doc: Document, user: User) {
  return (
    user.role === "ADMIN" ||
    (user.role === "REVIEWER" && doc.reviewerId === user.id)
  );
}
