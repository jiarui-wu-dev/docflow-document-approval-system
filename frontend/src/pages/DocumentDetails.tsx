import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileText,
  History as HistoryIcon,
  LoaderCircle,
  MessageSquare,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { availableTransitions, canComment, statusLabels } from "@/lib/workflow";
import type { Status } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  EmptyState,
  ErrorState,
  Loading,
  StatusBadge,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
const actionLabels: Partial<Record<Status, string>> = {
  SUBMITTED: "Submit for review",
  IN_REVIEW: "Start review",
  APPROVED: "Approve document",
  REJECTED: "Reject document",
};
export function DocumentDetails() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const client = useQueryClient();
  const [target, setTarget] = useState<Status | null>(null);
  const [remark, setRemark] = useState("");
  const [comment, setComment] = useState("");
  const document = useQuery({
    queryKey: ["document", id],
    queryFn: ({ signal }) => api.document(id, signal),
    enabled: /^\d+$/.test(id),
  });
  const history = useQuery({
    queryKey: ["history", id],
    queryFn: () => api.history(id),
    enabled: !!document.data,
  });
  const comments = useQuery({
    queryKey: ["comments", id],
    queryFn: () => api.comments(id),
    enabled: !!document.data,
  });
  const update = useMutation({
    mutationFn: (status: Status) =>
      api.transition(Number(id), status, remark.trim()),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["document", id] });
      void client.invalidateQueries({ queryKey: ["history", id] });
      void client.invalidateQueries({ queryKey: ["documents"] });
      setTarget(null);
      setRemark("");
      toast.success("Document workflow updated.");
    },
    onError: (e) => toast.error(e.message),
  });
  const addComment = useMutation({
    mutationFn: () => api.comment(Number(id), comment.trim()),
    onSuccess: () => {
      setComment("");
      void client.invalidateQueries({ queryKey: ["comments", id] });
      toast.success("Review comment added.");
    },
    onError: (e) => toast.error(e.message),
  });
  if (!/^\d+$/.test(id))
    return (
      <EmptyState
        title="Invalid document address"
        description="Choose a document from your library."
      />
    );
  if (document.isPending) return <Loading />;
  if (document.isError)
    return (
      <ErrorState
        error={document.error}
        retry={() => void document.refetch()}
      />
    );
  const doc = document.data;
  if (!user) return null;
  const transitions = availableTransitions(doc, user);
  const stages: Status[] = [
    "DRAFT",
    "SUBMITTED",
    "IN_REVIEW",
    doc.status === "REJECTED" ? "REJECTED" : "APPROVED",
  ];
  const current = stages.indexOf(doc.status);
  function submitComment(e: FormEvent) {
    e.preventDefault();
    if (comment.trim()) addComment.mutate();
  }
  return (
    <>
      <Link className="back-link" to="/documents">
        <ArrowLeft size={16} />
        Back to documents
      </Link>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">
            DOC-{String(doc.id).padStart(4, "0")} / DOCUMENT DETAILS
          </div>
          <h1>{doc.title}</h1>
          <p>
            Created {formatDate(doc.createdAt)} <span>·</span> Updated{" "}
            {formatDate(doc.updatedAt)}
          </p>
        </div>
        <span role="status" aria-label="Current document status">
          <StatusBadge status={doc.status} />
        </span>
      </div>
      <section className="panel workflow-panel" aria-label="Approval workflow">
        {stages.map((s, index) => (
          <div
            key={s}
            className={`workflow-step ${index <= current ? "reached" : ""} ${s === doc.status ? "current" : ""}`}
          >
            <span
              className={`workflow-dot ${doc.status === "REJECTED" && index === 3 ? "rejected" : ""}`}
            >
              {index < current ? <Check size={15} /> : index + 1}
            </span>
            <div>
              <small>STEP 0{index + 1}</small>
              <strong>{statusLabels[s]}</strong>
            </div>
            {index < 3 && <ArrowRight size={17} className="workflow-arrow" />}
          </div>
        ))}
      </section>
      <div className="details-grid">
        <div className="space-y-6">
          <section className="panel">
            <div className="panel-heading">
              <h2>
                <FileText size={18} />
                Document overview
              </h2>
            </div>
            <div className="description-content">
              {doc.description || (
                <span className="text-muted">No description was provided.</span>
              )}
            </div>
          </section>
          <section className="panel" aria-label="Review comments">
            <div className="panel-heading">
              <div>
                <h2>
                  <MessageSquare size={18} />
                  Review conversation{" "}
                  <span className="count-tag">
                    {comments.data?.length ?? "—"}
                  </span>
                </h2>
                <p>Comments from reviewers and administrators.</p>
              </div>
            </div>
            <div className="comments-content">
              {comments.isPending ? (
                <Loading />
              ) : comments.isError ? (
                <ErrorState
                  error={comments.error}
                  retry={() => void comments.refetch()}
                />
              ) : !comments.data.length ? (
                <div className="inline-empty">
                  <MessageSquare size={24} />
                  <p>No comments yet. Review feedback will appear here.</p>
                </div>
              ) : (
                comments.data.map((c) => (
                  <article className="comment" key={c.id}>
                    <span className="avatar avatar-small">
                      {c.reviewerId === user.id
                        ? user.username.slice(0, 2).toUpperCase()
                        : `U${c.reviewerId}`}
                    </span>
                    <div>
                      <div className="comment-meta">
                        <strong>
                          {c.reviewerId === user.id
                            ? `${user.username} (you)`
                            : `User #${c.reviewerId}`}
                        </strong>
                        <time>{formatDate(c.createdAt, true)}</time>
                      </div>
                      <p>{c.content}</p>
                    </div>
                  </article>
                ))
              )}
              {canComment(doc, user) && (
                <form className="comment-form" onSubmit={submitComment}>
                  <label htmlFor="comment">Add a review comment</label>
                  <textarea
                    id="comment"
                    rows={3}
                    maxLength={2000}
                    placeholder="Share thoughtful feedback…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    disabled={addComment.isPending}
                  />
                  <div className="form-actions">
                    <small>{comment.length} / 2,000</small>
                    <Button
                      size="sm"
                      disabled={!comment.trim() || addComment.isPending}
                    >
                      {addComment.isPending ? (
                        <LoaderCircle size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                      Post comment
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </section>
          <section className="panel" aria-label="Approval history">
            <div className="panel-heading">
              <div>
                <h2>
                  <HistoryIcon size={18} />
                  Approval history
                </h2>
                <p>The complete trail of workflow decisions.</p>
              </div>
            </div>
            <div className="history-content">
              {history.isPending ? (
                <Loading />
              ) : history.isError ? (
                <ErrorState
                  error={history.error}
                  retry={() => void history.refetch()}
                />
              ) : !history.data.length ? (
                <div className="inline-empty">
                  <Clock3 size={24} />
                  <p>No status changes have been recorded.</p>
                </div>
              ) : (
                history.data.map((item) => (
                  <article className="history-item" key={item.id}>
                    <span className="history-dot">
                      <Check size={13} />
                    </span>
                    <div>
                      <div className="history-statuses">
                        {item.oldStatus && (
                          <>
                            <StatusBadge status={item.oldStatus} />
                            <ArrowRight size={14} />
                          </>
                        )}
                        <StatusBadge status={item.newStatus} />
                      </div>
                      <p>
                        User #{item.changedByUserId}{" "}
                        <span>· {formatDate(item.createdAt, true)}</span>
                      </p>
                      {item.remark && <blockquote>{item.remark}</blockquote>}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="panel metadata-panel">
            <h2>People & details</h2>
            <div className="metadata-row">
              <UserRound size={18} />
              <div>
                <small>Submitted by</small>
                <strong>
                  {doc.submitterId === user.id
                    ? `${user.username} (you)`
                    : `User #${doc.submitterId}`}
                </strong>
              </div>
            </div>
            <div className="metadata-row">
              <ShieldCheck size={18} />
              <div>
                <small>Assigned reviewer</small>
                <strong>
                  {doc.reviewerId === user.id
                    ? `${user.username} (you)`
                    : doc.reviewerId
                      ? `User #${doc.reviewerId}`
                      : "Unassigned"}
                </strong>
              </div>
            </div>
            <div className="metadata-row">
              <Clock3 size={18} />
              <div>
                <small>Created on</small>
                <strong>{formatDate(doc.createdAt, true)}</strong>
              </div>
            </div>
          </section>
          <section className="panel action-panel">
            <span className="eyebrow">WORKFLOW ACTIONS</span>
            <h3>
              {transitions.length
                ? "Available actions"
                : doc.status === "APPROVED" || doc.status === "REJECTED"
                  ? "Review complete"
                  : "No actions available"}
            </h3>
            <p>
              {transitions.length
                ? "Update the document status. Each decision is recorded in the approval history."
                : doc.status === "APPROVED" || doc.status === "REJECTED"
                  ? "This document has reached the end of its approval workflow."
                  : "The next action belongs to another role or the assigned reviewer."}
            </p>
            {transitions.map((s) => (
              <Button
                key={s}
                className="w-full mt-3"
                variant={s === "REJECTED" ? "destructive" : "default"}
                onClick={() => {
                  update.reset();
                  setTarget(s);
                }}
              >
                {s === "APPROVED" ? (
                  <Check size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}{" "}
                {actionLabels[s]}
              </Button>
            ))}
          </section>
          {!doc.reviewerId && (
            <div className="field-note">
              <ShieldCheck size={18} />
              <p>
                This document is unassigned. The current API has no reassignment
                endpoint. An admin can perform the review.
              </p>
            </div>
          )}
        </aside>
      </div>
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open && !update.isPending) {
            setTarget(null);
            setRemark("");
          }
        }}
        title={
          target ? actionLabels[target] || "Confirm action" : "Confirm action"
        }
        description={
          target
            ? `This changes the status from ${statusLabels[doc.status]} to ${statusLabels[target]} and records your identity in the approval history. This transition cannot be undone.`
            : ""
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (target) update.mutate(target);
          }}
        >
          <label htmlFor="remark">
            Decision remark <span className="optional">Optional</span>
          </label>
          <textarea
            id="remark"
            rows={4}
            value={remark}
            maxLength={1000}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Add context for your decision…"
            disabled={update.isPending}
          />
          {update.error && (
            <p className="form-error mt-3" role="alert">
              {update.error.message}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTarget(null)}
              disabled={update.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={target === "REJECTED" ? "destructive" : "default"}
              disabled={update.isPending}
            >
              {update.isPending && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              Confirm {target ? statusLabels[target].toLowerCase() : ""}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
