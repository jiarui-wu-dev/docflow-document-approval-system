import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Info,
  LoaderCircle,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeading } from "@/components/common";
import { Button } from "@/components/ui/button";
export function CreateDocument() {
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: api.create,
    onSuccess: (doc) => {
      void client.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Draft created.");
      navigate(`/documents/${doc.id}`);
    },
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const reviewer = String(data.get("reviewerId")).trim();
    mutation.mutate({
      title: String(data.get("title")).trim(),
      description: description.trim(),
      reviewerId: reviewer ? Number(reviewer) : null,
    });
  }
  return (
    <>
      <Link className="back-link" to="/documents">
        <ArrowLeft size={16} />
        Back to documents
      </Link>
      <PageHeading
        eyebrow="DOCUMENTS"
        title="Create a document"
        description="Add document details and optionally assign a reviewer."
      />
      <div className="create-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>
                <FileText size={19} />
                Document details
              </h2>
              <p>Title, description, and reviewer assignment.</p>
            </div>
            <span className="step-tag">01 / 02</span>
          </div>
          <form onSubmit={submit} className="document-form">
            <div>
              <label htmlFor="title">
                Document title <span className="text-violet">*</span>
              </label>
              <input
                id="title"
                name="title"
                placeholder="Give your document a clear, descriptive title"
                maxLength={200}
                pattern=".*\S.*"
                required
                disabled={mutation.isPending}
              />
              <small>A good title makes your document easy to find.</small>
            </div>
            <div>
              <label htmlFor="description">
                Description <span className="optional">Optional</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={7}
                placeholder="What is this document about? Include the context, goals, and information your reviewer should know."
                value={description}
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
                disabled={mutation.isPending}
              />
              <small className="character-count">
                {description.length} / 2,000
              </small>
            </div>
            <div className="form-divider" />
            <div className="form-section-title">
              <Users size={18} />
              <h3>Reviewer assignment</h3>
            </div>
            <div>
              <label htmlFor="reviewerId">
                Reviewer user ID <span className="optional">Optional</span>
              </label>
              <input
                id="reviewerId"
                name="reviewerId"
                type="number"
                min="1"
                max={Number.MAX_SAFE_INTEGER}
                step="1"
                placeholder="Enter an existing reviewer or admin ID"
                disabled={mutation.isPending}
              />
              <div className="field-note">
                <Info size={16} />
                <p>
                  The API accepts a user ID but does not provide a reviewer
                  directory. Ask your administrator for the correct ID. Leave
                  this blank to create an unassigned draft; an admin can review
                  it.
                </p>
              </div>
            </div>
            {mutation.error && (
              <p className="form-error" role="alert">
                {mutation.error.message}
              </p>
            )}
            <div className="form-actions">
              <Button asChild variant="ghost">
                <Link to="/documents">Cancel</Link>
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <PlusDocument />
                )}
                Create draft
              </Button>
            </div>
          </form>
        </section>
        <aside className="create-aside">
          <div className="panel guide-panel">
            <span className="eyebrow">PROCESS</span>
            <h3>Review process</h3>
            <div className="guide-step">
              <span>1</span>
              <div>
                <strong>Create your draft</strong>
                <p>Add a title, context, and a reviewer.</p>
              </div>
            </div>
            <div className="guide-step">
              <span>2</span>
              <div>
                <strong>Submit when ready</strong>
                <p>Open your draft and send it for review.</p>
              </div>
            </div>
            <div className="guide-step">
              <span>3</span>
              <div>
                <strong>Review and decision</strong>
                <p>Your reviewer evaluates and makes a decision.</p>
              </div>
            </div>
            <div className="guide-foot">
              <Check size={15} />
              Status changes are recorded in history.
            </div>
          </div>
          <div className="create-note">
            <Send size={21} />
            <p>
              Creating a document saves it as a <strong>draft</strong>. You’ll
              confirm submission in the next step.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
function PlusDocument() {
  return <ArrowRight size={16} />;
}
