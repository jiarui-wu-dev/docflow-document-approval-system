import { AlertCircle, ArrowRight, FileText, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { Document, Status } from "@/lib/types";
import { statusLabels } from "@/lib/workflow";
import { formatDate } from "@/lib/utils";
import { Button } from "./ui/button";
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="DOCFLOW home">
      <span className="brand-icon">
        <FileText size={23} strokeWidth={1.8} />
      </span>
      <span>DOCFLOW</span>
    </Link>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div aria-label="Loading documents" role="status" className="space-y-4">
      <span className="sr-only">Loading…</span>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-20 rounded-xl" />
      ))}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <span className="empty-icon danger">
        <AlertCircle />
      </span>
      <h3>Unable to load this workspace</h3>
      <p>{error.message}</p>
      <Button variant="outline" onClick={retry}>
        <RefreshCw size={15} />
        Try again
      </Button>
    </div>
  );
}
export function EmptyState({
  title = "No documents yet",
  description = "Create a document to begin the review process.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <FileText />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function DocumentTable({
  documents,
  compact = false,
}: {
  documents: Document[];
  compact?: boolean;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Document name</th>
            <th>Status</th>
            {!compact && <th>Reviewer</th>}
            <th>Last updated</th>
            <th>
              <span className="sr-only">Open document</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td>
                <Link className="document-name" to={`/documents/${doc.id}`}>
                  <span
                    className={`file-icon file-${doc.status.toLowerCase()}`}
                  >
                    <FileText size={18} />
                  </span>
                  <span>
                    <strong>{doc.title}</strong>
                    <small>
                      DOC-{String(doc.id).padStart(4, "0")} · User #
                      {doc.submitterId}
                    </small>
                  </span>
                </Link>
              </td>
              <td>
                <StatusBadge status={doc.status} />
              </td>
              {!compact && (
                <td className="text-muted">
                  {doc.reviewerId ? `User #${doc.reviewerId}` : "Unassigned"}
                </td>
              )}
              <td className="date-cell">{formatDate(doc.updatedAt)}</td>
              <td>
                <Link
                  className="row-open"
                  to={`/documents/${doc.id}`}
                  aria-label={`View ${doc.title}`}
                >
                  <ArrowRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
