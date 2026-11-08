import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCheck,
  CircleDashed,
  FileText,
  Plus,
  RefreshCw,
  ScanLine,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { statuses } from "@/lib/types";
import { statusLabels } from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import {
  DocumentTable,
  EmptyState,
  ErrorState,
  Loading,
  PageHeading,
} from "@/components/common";

const colors = ["#89919e", "#a397cd", "#89a3c5", "#8cbaa2", "#c28f98"];

export function Dashboard() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["documents", "overview"],
    queryFn: ({ signal }) => api.documents({}, signal),
  });
  const docs = query.data || [];
  const count = (status: string) =>
    docs.filter((d) => d.status === status).length;
  const pending = docs
    .filter((d) => d.status === "SUBMITTED" || d.status === "IN_REVIEW")
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const recent = [...docs].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const stats = [
    {
      label: "Total documents",
      value: docs.length,
      icon: FileText,
      foot: "Within your access scope",
    },
    {
      label: "Drafts",
      value: count("DRAFT"),
      icon: CircleDashed,
      foot: "Not yet submitted",
    },
    {
      label: "Pending review",
      value: pending.length,
      icon: ScanLine,
      foot: "Submitted and in review",
    },
    {
      label: "Approved",
      value: count("APPROVED"),
      icon: CheckCheck,
      foot: "Review completed",
    },
    {
      label: "Rejected",
      value: count("REJECTED"),
      icon: XCircle,
      foot: "Review completed",
    },
  ];
  const queuePath =
    user?.role === "ADMIN"
      ? "/admin"
      : user?.role === "REVIEWER"
        ? "/reviews"
        : "/documents";
  return (
    <>
      <PageHeading
        title="Overview"
        description="Document activity across your accessible workspace."
      >
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh overview"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw
            size={15}
            className={query.isFetching ? "animate-spin" : ""}
          />
        </Button>
        {user?.role === "REVIEWER" ? (
          <Button asChild>
            <Link to="/reviews">
              <ScanLine size={15} />
              Review documents
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link to="/documents/new">
              <Plus size={15} />
              New document
            </Link>
          </Button>
        )}
      </PageHeading>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <section className="stats-grid" aria-label="Document statistics">
            {stats.map((stat) => (
              <div
                className="stat-card"
                key={stat.label}
                role="group"
                aria-label={stat.label}
              >
                <div className="stat-top">
                  <span>{stat.label}</span>
                  <stat.icon size={15} />
                </div>
                <strong>{stat.value.toLocaleString()}</strong>
                <small>{stat.foot}</small>
              </div>
            ))}
          </section>
          <div className="dashboard-grid">
            <section className="panel queue-panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Awaiting review{" "}
                    <span className="count-tag">{pending.length}</span>
                  </h2>
                  <p>Submitted and in-review documents, oldest update first.</p>
                </div>
                <Link className="text-link" to={queuePath}>
                  View documents <ArrowRight size={14} />
                </Link>
              </div>
              {pending.length ? (
                <DocumentTable compact documents={pending.slice(0, 4)} />
              ) : (
                <EmptyState
                  title="No pending reviews"
                  description="There are no submitted or in-review documents within your access scope."
                />
              )}
            </section>
            <section className="panel status-summary">
              <div className="panel-heading">
                <div>
                  <h2>Document status</h2>
                  <p>Distribution within your access scope.</p>
                </div>
              </div>
              <div className="status-summary-list">
                {statuses.map((status, index) => {
                  const total = count(status);
                  const percentage = docs.length
                    ? (total / docs.length) * 100
                    : 0;
                  return (
                    <Link
                      to={`/documents?status=${status}`}
                      key={status}
                      className="status-summary-item"
                    >
                      <div>
                        <span>
                          <i style={{ background: colors[index] }} />
                          {statusLabels[status]}
                        </span>
                        <strong>
                          {total}
                          <small>{Math.round(percentage)}%</small>
                        </strong>
                      </div>
                      <div className="status-meter" aria-hidden="true">
                        <span
                          style={{
                            width: `${percentage}%`,
                            background: colors[index],
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
          <section className="panel recent-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  Recent documents{" "}
                  <span className="count-tag">{docs.length}</span>
                </h2>
                <p>Most recently updated documents.</p>
              </div>
              <Link className="text-link" to="/documents">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recent.length ? (
              <DocumentTable documents={recent.slice(0, 6)} />
            ) : (
              <EmptyState
                title="No documents yet"
                description={
                  user?.role === "REVIEWER"
                    ? "Documents will appear here when they are assigned to you."
                    : "Create a document to begin the review process."
                }
              />
            )}
          </section>
          <p className="scope-note">
            All totals reflect the documents available to your account.
            Permissions are enforced by the server.
          </p>
        </>
      )}
    </>
  );
}
