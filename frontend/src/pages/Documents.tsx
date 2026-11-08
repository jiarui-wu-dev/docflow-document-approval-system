import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownUp,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { statuses, type Filters, type Status } from "@/lib/types";
import { statusLabels } from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import {
  DocumentTable,
  EmptyState,
  ErrorState,
  Loading,
  PageHeading,
} from "@/components/common";
export function Documents({
  mode = "all",
}: {
  mode?: "all" | "review" | "admin";
}) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("title") || "");
  const [sort, setSort] = useState("updated");
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const selected = params.get("status") || "";
  const status = statuses.includes(selected as Status)
    ? (selected as Status)
    : undefined;
  const filters: Filters = {
    title: debounced,
    status,
    ...(mode === "review" ? { reviewerId: String(user?.id) } : {}),
    ...(mode === "admin"
      ? {
          submitterId: params.get("submitterId") || "",
          reviewerId: params.get("reviewerId") || "",
        }
      : {}),
  };
  const query = useQuery({
    queryKey: ["documents", mode, filters],
    queryFn: ({ signal }) => api.documents(filters, signal),
  });
  const docs = [...(query.data || [])].sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : sort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.updatedAt.localeCompare(a.updatedAt),
  );
  function updateParam(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }
  const title =
    mode === "review"
      ? "Review workspace"
      : mode === "admin"
        ? "Organization documents"
        : "All documents";
  return (
    <>
      <PageHeading
        eyebrow={
          mode === "admin"
            ? "ADMIN WORKSPACE"
            : mode === "review"
              ? "REVIEWER"
              : "WORKSPACE"
        }
        title={title}
        description={
          mode === "review"
            ? "Review and manage the documents assigned to you."
            : mode === "admin"
              ? "Search and review all documents available to your admin account."
              : "Search, filter, and track your documents."
        }
      >
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh documents"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw
            size={17}
            className={query.isFetching ? "animate-spin" : ""}
          />
        </Button>
        {user?.role !== "REVIEWER" && (
          <Button asChild>
            <Link to="/documents/new">
              <Plus size={17} />
              New document
            </Link>
          </Button>
        )}
      </PageHeading>
      {mode === "review" && (
        <div className="info-banner">
          <ShieldCheck size={21} />
          <div>
            <strong>Your review queue</strong>
            <p>
              Open a submitted document to start a review. Approve or reject it
              after moving it to “In review”.
            </p>
          </div>
        </div>
      )}
      <section className="panel">
        <div className="document-tabs">
          <button
            className={!status ? "selected" : ""}
            onClick={() => updateParam("status", "")}
          >
            <FileText size={16} />
            All documents
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              className={status === s ? "selected" : ""}
              onClick={() => updateParam("status", s)}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search documents by title"
              placeholder="Search documents by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search">
                ×
              </button>
            )}
          </div>
          <div className="sort-control">
            <ArrowDownUp size={15} />
            <select
              aria-label="Sort documents locally"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="updated">Recently updated</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
        </div>
        {mode === "admin" && (
          <div className="admin-filters">
            <Filter size={16} />
            <span>Filter by user</span>
            <input
              aria-label="Submitter ID filter"
              type="number"
              min="1"
              step="1"
              placeholder="Submitter ID"
              value={params.get("submitterId") || ""}
              onChange={(e) => updateParam("submitterId", e.target.value)}
            />
            <input
              aria-label="Reviewer ID filter"
              type="number"
              min="1"
              step="1"
              placeholder="Reviewer ID"
              value={params.get("reviewerId") || ""}
              onChange={(e) => updateParam("reviewerId", e.target.value)}
            />
          </div>
        )}
        {query.isPending ? (
          <div className="p-6">
            <Loading />
          </div>
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => void query.refetch()} />
        ) : docs.length ? (
          <DocumentTable documents={docs} />
        ) : (
          <EmptyState
            title={
              search || status
                ? "No matching documents"
                : mode === "review"
                  ? "Your queue is clear"
                  : undefined
            }
            description={
              search || status
                ? "Try a different title or status to find what you’re looking for."
                : mode === "review"
                  ? "Documents assigned to your user ID will appear here."
                  : undefined
            }
          >
            {(search || status) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setParams({});
                }}
              >
                Clear filters
              </Button>
            )}
          </EmptyState>
        )}
        <div className="table-footer">
          <span>
            {query.isPending
              ? "Loading"
              : `${docs.length} document${docs.length !== 1 ? "s" : ""}`}{" "}
            · {mode === "review" ? "Assigned to you" : "Your accessible scope"}
          </span>
          <span>Sorting applied locally</span>
        </div>
      </section>
      <p className="under-table">
        Every action is permission-checked by the server. Your workspace
        reflects your account’s access.
      </p>
    </>
  );
}
