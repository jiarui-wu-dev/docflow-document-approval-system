export const statuses = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export type Status = (typeof statuses)[number];
export type Role = "SUBMITTER" | "REVIEWER" | "ADMIN";
export interface User {
  id: number;
  username: string;
  role: Role;
}
export interface Document {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  submitterId: number;
  reviewerId: number | null;
  createdAt: string;
  updatedAt: string;
}
export interface History {
  id: number;
  documentId: number;
  changedByUserId: number;
  oldStatus: Status | null;
  newStatus: Status;
  remark: string | null;
  createdAt: string;
}
export interface ReviewComment {
  id: number;
  documentId: number;
  reviewerId: number;
  content: string;
  createdAt: string;
}
export interface CreateDocument {
  title: string;
  description: string;
  reviewerId: number | null;
}
export interface Filters {
  title?: string;
  status?: Status;
  submitterId?: string;
  reviewerId?: string;
}
