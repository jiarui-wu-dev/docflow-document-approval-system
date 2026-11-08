"""Opt-in local Docker demo data. No application code, schema, or users are changed."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import random
import subprocess
import sys

DATASET = "DOCFLOW-DEMO-V1"
MARKER = f"Synthetic demo data | dataset={DATASET} | key="
TARGET = {"DRAFT": 15, "SUBMITTED": 30, "IN_REVIEW": 35, "APPROVED": 50, "REJECTED": 20}
UNITS = ["Berlin Operations", "London Finance", "Dublin Engineering", "Amsterdam Customer Success", "Stockholm People Operations"]
# All names, amounts, organizations, and requests are fictional.
CATALOG = [
    ("Ergonomic workstation purchase", "replace aging desks and adjustable monitor arms for twelve shared workstations", "supplier quotes, unit pricing, and the equipment replacement policy"),
    ("Quarterly cloud infrastructure budget", "reserve capacity for application hosting, backups, and observability", "usage forecasts, cost allocation, and reserved-capacity assumptions"),
    ("Production analytics access request", "grant time-limited read-only access to aggregated service metrics", "least-privilege scope, data classification, and access expiry"),
    ("Managed support vendor agreement", "renew business-hours support with the fictional Northbridge Services team", "service levels, liability caps, and escalation coverage"),
    ("Data retention compliance review", "validate retention periods and deletion responsibilities for support records", "retention evidence, legal basis, and accountable owners"),
    ("Remote working policy update", "clarify equipment reimbursement and cross-border approval requirements", "policy consistency, eligibility rules, and employee communication"),
    ("Network equipment purchase request", "replace branch switches and add a spare firewall for business continuity", "technical compatibility, competitive quotes, and warranty coverage"),
    ("Customer onboarding project budget", "fund an onboarding checklist redesign and implementation workshops", "milestones, staffing assumptions, and measurable delivery criteria"),
    ("Contractor repository access", "provide a fixed-term contractor with access to a single internal repository", "sponsor approval, repository scope, and automatic offboarding"),
    ("Software subscription renewal", "renew collaboration licenses and remove unused seats", "seat utilization, renewal terms, and cancellation notice"),
    ("Supplier due diligence assessment", "complete procurement onboarding for the fictional Cedarline Logistics group", "financial checks, ownership declarations, and sanctions screening evidence"),
    ("Incident response policy revision", "update incident severity definitions and executive notification timings", "on-call ownership, escalation paths, and tabletop exercise findings"),
    ("Employee training purchase request", "book secure coding and accessibility workshops for delivery teams", "training scope, attendance estimates, and supplier accreditation"),
    ("Disaster recovery exercise budget", "schedule a recovery rehearsal and fund temporary isolated infrastructure", "recovery objectives, test boundaries, and rollback responsibilities"),
    ("Finance reporting workspace access", "enable read access to the monthly cost reporting workspace", "manager approval, segregation of duties, and access duration"),
    ("Facilities maintenance agreement", "arrange preventative maintenance for meeting-room and cooling equipment", "response times, safety obligations, and annual price adjustment"),
    ("Privacy impact assessment", "assess a proposed customer feedback collection process", "data minimization, consent wording, and processor responsibilities"),
    ("Travel and expense policy refresh", "standardize rail booking thresholds and receipt requirements", "regional tax requirements, spending limits, and exception handling"),
    ("Meeting room equipment purchase", "upgrade microphones and cameras in three hybrid meeting spaces", "compatibility testing, installation schedule, and total cost"),
    ("Accessibility remediation funding", "allocate engineering capacity to keyboard navigation and screen-reader fixes", "audit findings, acceptance criteria, and delivery estimates"),
    ("Service account permission review", "replace broad integration permissions with narrowly scoped access", "token ownership, required operations, and credential rotation plans"),
    ("External security assessment agreement", "commission a scoped assessment from the fictional Harborlight Advisory team", "rules of engagement, confidentiality, and remediation reporting"),
    ("Quarterly control evidence review", "collect access review and change-management evidence for internal assurance", "evidence completeness, exceptions, and control owner sign-off"),
    ("Change management policy update", "define emergency change documentation and post-implementation review steps", "approval ownership, rollback plans, and audit evidence"),
    ("Laptop replacement purchase", "replace unsupported laptops for new and existing staff", "asset lifecycle, device specifications, and procurement lead times"),
    ("Customer research budget request", "fund moderated usability sessions and participant recruitment", "research objectives, consent handling, and incentive accounting"),
    ("Temporary database reporting access", "grant a supervised analyst read-only access to a reporting replica", "query scope, sensitive fields, and a defined expiry date"),
    ("Document processing vendor agreement", "evaluate the fictional Juniper Process Partners service for internal document conversion", "processing locations, deletion terms, and subcontractor controls"),
    ("Business continuity plan review", "update contact trees and manual workarounds for a regional service outage", "dependency mapping, recovery ownership, and exercise evidence"),
    ("Information classification policy", "refresh examples of internal, confidential, and restricted information", "handling requirements, training material, and exception approvals"),
]


def generate(now: datetime | None = None) -> list[dict]:
    now = (now or datetime.now(timezone.utc)).replace(tzinfo=None, microsecond=0)
    rng = random.Random(260150)
    states = [state for state, count in TARGET.items() for _ in range(count - 1)]
    rng.shuffle(states)
    states = list(TARGET) + states
    result = []
    for index, state in enumerate(states, 1):
        title, purpose, checks = CATALOG[(index - 1) % len(CATALOG)]
        unit = UNITS[(index - 1) // len(CATALOG)]
        key = f"{index:03d}"
        prefix = f"[DEMO-V1-{key}] "
        marker = f"{MARKER}{key}\n"
        activity = now - (timedelta(minutes=index * 2) if index <= 8 else
                          timedelta(days=(index * 37) % 87, hours=(index * 7) % 24, minutes=index % 60))
        submitter = "admin" if index % 5 == 0 else "alice"
        reviewer = "admin" if index % 4 == 0 and submitter != "admin" else "bob"
        path = [] if state == "DRAFT" else ["SUBMITTED"]
        if state in ("IN_REVIEW", "APPROVED", "REJECTED"):
            path.append("IN_REVIEW")
        if state in ("APPROVED", "REJECTED"):
            path.append(state)
        durations = [timedelta(hours=rng.randint(6, 22), minutes=rng.randint(5, 50)) for _ in path]
        created = activity - sum(durations, timedelta())
        cursor = created
        history = []
        old = "DRAFT"
        for step, duration in zip(path, durations):
            cursor += duration
            event_at = cursor - (timedelta(minutes=30) if step == "IN_REVIEW" and state == "IN_REVIEW" else timedelta())
            remark = {
                "SUBMITTED": "Request owner submitted the scope and supporting rationale for review.",
                "IN_REVIEW": "Assigned reviewer began checking scope, controls, and supporting evidence.",
                "APPROVED": "Approved after the supporting evidence and applicable controls were verified.",
                "REJECTED": "Rejected because required evidence is incomplete; prepare a revised request after resolving the findings.",
            }[step]
            history.append({"old": old, "new": step, "at": event_at.isoformat(),
                            "actor": "submitter" if step == "SUBMITTED" else "reviewer",
                            "remark": "[Synthetic demo] " + remark})
            old = step
        comments = []
        if len(history) >= 2:
            start = datetime.fromisoformat(history[1]["at"])
            if state == "IN_REVIEW":
                comments.append({"at": activity.isoformat(), "content": f"[Synthetic demo] Reviewing {checks}. Please confirm the responsible owner and attach the latest supporting evidence."})
            else:
                midpoint = start + (activity - start) / 2
                comments.append({"at": midpoint.replace(microsecond=0).isoformat(), "content": f"[Synthetic demo] Checked {checks}. The review covers {unit} and the requested delivery window."})
                outcome = ("The scope and supporting evidence are complete. No unresolved control exceptions remain for this request."
                           if state == "APPROVED" else
                           f"The evidence for {checks.split(',')[0]} is incomplete. A revised request needs updated documentation and a named accountable owner.")
                comments.append({"at": (activity - timedelta(minutes=10)).isoformat(), "content": "[Synthetic demo] " + outcome})
        result.append({"key": key, "prefix": prefix, "marker": marker,
                       "title": prefix + title + " — " + unit,
                       "description": marker + f"{unit} requests approval to {purpose}. "
                       f"Planning estimate: EUR {rng.randrange(15, 450) * 100:,}; this is an indicative synthetic amount, not a financial record. "
                       f"Review focus: {checks}. The request includes a responsible business owner, implementation scope, and acceptance criteria. "
                       "All organizations, amounts, supporting evidence references, and review decisions in this record are fictional portfolio demonstration data.",
                       "status": state, "submitter": submitter, "reviewer": reviewer,
                       "created": created.isoformat(), "updated": activity.isoformat(),
                       "history": history, "comments": comments})
    return result


def literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def docker(*args: str, stdin: str | None = None) -> str:
    process = subprocess.run(["docker", *args], input=stdin, encoding="utf-8", capture_output=True)
    if process.returncode:
        # Never echo docker inspect output or SQL payloads in failures.
        raise RuntimeError("Docker/PostgreSQL command failed. Check the local engine, target, and database permissions. "
                           + (process.stderr[-1200:] if args and args[0] == "exec" else ""))
    return process.stdout


def target(args: argparse.Namespace) -> tuple[str, str]:
    # Honor the actual Docker endpoint override as well as the selected context.
    context_override = os.environ.get("DOCKER_CONTEXT")
    endpoint = os.environ.get("DOCKER_HOST")
    if context_override:
        endpoint = json.loads(docker("context", "inspect", context_override))[0]["Endpoints"]["docker"]["Host"]
    elif not endpoint:
        endpoint = json.loads(docker("context", "inspect"))[0]["Endpoints"]["docker"]["Host"]
    if not (endpoint.startswith("npipe://") or endpoint.startswith("unix://")
            or endpoint.startswith("tcp://127.0.0.1:") or endpoint.startswith("tcp://localhost:")):
        raise RuntimeError("Refusing a non-local Docker endpoint.")
    info = json.loads(docker("inspect", args.container))[0]
    labels = info["Config"].get("Labels") or {}
    if not info["State"]["Running"] or labels.get("com.docker.compose.service") != "postgres" \
            or labels.get("com.docker.compose.project") != args.project:
        raise RuntimeError("Target must be the running postgres service of the explicitly selected local development project.")
    mounts = info.get("Mounts", [])
    if not any(m.get("Name") == args.project + "_postgres_data" and m["Destination"] == "/var/lib/postgresql/data" for m in mounts):
        raise RuntimeError("Database volume does not match the expected project-scoped development volume.")
    env = dict(entry.split("=", 1) for entry in info["Config"]["Env"] if "=" in entry)
    if env.get("POSTGRES_DB") != "docflow_db":
        raise RuntimeError("This command is restricted to the local docflow_db development database.")
    return env.get("POSTGRES_USER", "postgres"), "docflow_db"


def psql(args: argparse.Namespace, user: str, database: str, sql: str) -> dict:
    output = docker("exec", "-i", args.container, "psql", "-X", "-q", "-t", "-A",
                    "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database, stdin=sql)
    return json.loads(output.strip())


def setup_sql(records: list[dict]) -> str:
    payload = literal(json.dumps(records, ensure_ascii=False))
    return f"""
BEGIN;
SET LOCAL standard_conforming_strings = on;
SET LOCAL lock_timeout = '5s';
SET LOCAL TIME ZONE 'UTC';
SELECT pg_advisory_xact_lock(hashtext('{DATASET}')) \g /dev/null
CREATE TEMP TABLE demo_expected ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset({payload}::jsonb) AS x(
 key text, prefix text, marker text, title text, description text, status text,
 submitter text, reviewer text, created timestamp, updated timestamp, history jsonb, comments jsonb);
DO $guard$
BEGIN
 IF current_database() <> 'docflow_db' THEN RAISE EXCEPTION 'Not the development database'; END IF;
 IF (SELECT count(*) FROM users WHERE (username='alice' AND role='SUBMITTER') OR
   (username='bob' AND role='REVIEWER') OR (username='admin' AND role='ADMIN')) <> 3
 THEN RAISE EXCEPTION 'Expected existing development users and roles; no users will be created'; END IF;
 IF EXISTS (SELECT 1 FROM documents d WHERE
   (starts_with(d.title, '[DEMO-V1-') OR starts_with(d.description, '{MARKER}')) AND NOT EXISTS
   (SELECT 1 FROM demo_expected e WHERE starts_with(d.title,e.prefix) AND starts_with(d.description,e.marker)))
 THEN RAISE EXCEPTION 'Conflicting demo identifiers; inspect manually, no changes applied'; END IF;
 IF EXISTS (SELECT e.key FROM documents d JOIN demo_expected e
   ON starts_with(d.title,e.prefix) AND starts_with(d.description,e.marker) GROUP BY e.key HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Duplicate demo identifiers; no changes applied'; END IF;
END $guard$;
CREATE TEMP TABLE demo_before ON COMMIT DROP AS
SELECT jsonb_build_object(
 'users', (SELECT md5(coalesce(string_agg(row_to_json(u)::text,'' ORDER BY id),'')) FROM users u),
 'documents', (SELECT md5(coalesce(string_agg(row_to_json(d)::text,'' ORDER BY id),'')) FROM documents d),
 'history', (SELECT md5(coalesce(string_agg(row_to_json(h)::text,'' ORDER BY id),'')) FROM approval_history h),
 'comments', (SELECT md5(coalesce(string_agg(row_to_json(c)::text,'' ORDER BY id),'')) FROM review_comments c)) AS fingerprint;
CREATE TEMP TABLE demo_original_ids ON COMMIT DROP AS SELECT id FROM documents;
CREATE TEMP TABLE demo_original_history_ids ON COMMIT DROP AS SELECT id FROM approval_history;
CREATE TEMP TABLE demo_original_comment_ids ON COMMIT DROP AS SELECT id FROM review_comments;
"""


VERIFY_SQL = """
CREATE TEMP TABLE demo_scope ON COMMIT DROP AS SELECT d.* FROM documents d JOIN demo_expected e
 ON starts_with(d.title,e.prefix) AND starts_with(d.description,e.marker);
CREATE TEMP TABLE demo_invalid ON COMMIT DROP AS
WITH ordered AS (
 SELECT h.*, d.status AS final_status, d.created_at AS document_created, d.updated_at AS document_updated,
 d.submitter_id, d.reviewer_id, u.role AS actor_role,
 lag(h.new_status,1,'DRAFT') OVER w AS preceding_status,
 lag(h.created_at,1,d.created_at) OVER w AS preceding_time
 FROM approval_history h JOIN demo_scope d ON d.id=h.document_id JOIN users u ON u.id=h.changed_by
 WINDOW w AS (PARTITION BY h.document_id ORDER BY h.created_at,h.id))
SELECT 'invalid history chain, time, or actor' AS reason, document_id FROM ordered WHERE
 old_status<>preceding_status OR created_at<preceding_time OR created_at>document_updated OR
 (old_status||'>'||new_status) NOT IN ('DRAFT>SUBMITTED','SUBMITTED>IN_REVIEW','IN_REVIEW>APPROVED','IN_REVIEW>REJECTED') OR
 NOT (actor_role='ADMIN' OR (actor_role='SUBMITTER' AND changed_by=submitter_id AND old_status='DRAFT' AND new_status='SUBMITTED')
 OR (actor_role='REVIEWER' AND changed_by=reviewer_id AND old_status IN ('SUBMITTED','IN_REVIEW')))
UNION ALL
SELECT 'history does not match document state', d.id FROM demo_scope d WHERE
 coalesce((SELECT h.new_status FROM approval_history h WHERE h.document_id=d.id ORDER BY h.created_at DESC,h.id DESC LIMIT 1),'DRAFT')<>d.status
 OR (SELECT count(*) FROM approval_history h WHERE h.document_id=d.id) <>
 CASE d.status WHEN 'DRAFT' THEN 0 WHEN 'SUBMITTED' THEN 1 WHEN 'IN_REVIEW' THEN 2 ELSE 3 END
 OR d.created_at>d.updated_at OR d.updated_at>localtimestamp
UNION ALL
SELECT 'invalid comment time or author', d.id FROM demo_scope d JOIN review_comments c ON c.document_id=d.id
 JOIN users u ON u.id=c.reviewer_id WHERE c.created_at<d.created_at OR c.created_at>localtimestamp
 OR NOT (u.role='ADMIN' OR (u.role='REVIEWER' AND c.reviewer_id=d.reviewer_id));
DO $verify$ BEGIN
 IF EXISTS(SELECT 1 FROM demo_invalid) THEN RAISE EXCEPTION 'Demo history/comment consistency check failed; transaction rolled back'; END IF;
END $verify$;
"""


PRESERVE_SQL = """
DO $preserve$ BEGIN
 IF (SELECT fingerprint FROM demo_before) <> jsonb_build_object(
 'users', (SELECT md5(coalesce(string_agg(row_to_json(u)::text,'' ORDER BY id),'')) FROM users u),
 'documents', (SELECT md5(coalesce(string_agg(row_to_json(d)::text,'' ORDER BY d.id),'')) FROM documents d JOIN demo_original_ids o ON o.id=d.id),
 'history', (SELECT md5(coalesce(string_agg(row_to_json(h)::text,'' ORDER BY h.id),'')) FROM approval_history h JOIN demo_original_history_ids o ON o.id=h.id),
 'comments', (SELECT md5(coalesce(string_agg(row_to_json(c)::text,'' ORDER BY c.id),'')) FROM review_comments c JOIN demo_original_comment_ids o ON o.id=c.id))
 THEN RAISE EXCEPTION 'Pre-existing rows changed; transaction rolled back'; END IF;
END $preserve$;
"""


REPORT_SQL = """
SELECT jsonb_build_object(
 'demo_documents', (SELECT count(*) FROM demo_scope),
 'by_status', (SELECT coalesce(jsonb_object_agg(status,n),'{}') FROM (SELECT status,count(*) n FROM demo_scope GROUP BY status) s),
 'history_records', (SELECT count(*) FROM approval_history h JOIN demo_scope d ON d.id=h.document_id),
 'review_comments', (SELECT count(*) FROM review_comments c JOIN demo_scope d ON d.id=c.document_id),
 'invalid_records', (SELECT count(*) FROM demo_invalid),
 'created_from', (SELECT min(created_at) FROM demo_scope),
 'last_activity', (SELECT max(updated_at) FROM demo_scope),
 'total_database_documents', (SELECT count(*) FROM documents),
 'excluded_existing_documents', (SELECT count(*) FROM documents WHERE id NOT IN (SELECT id FROM demo_scope)),
 'excluded_e2e_documents', (SELECT count(*) FROM documents WHERE starts_with(title,'E2E-DOCFLOW-') AND id NOT IN (SELECT id FROM demo_scope)),
 'demo_submitters', (SELECT jsonb_object_agg(username,n) FROM (SELECT u.username,count(*) n FROM demo_scope d JOIN users u ON u.id=d.submitter_id GROUP BY u.username) s),
 'demo_reviewers', (SELECT jsonb_object_agg(username,n) FROM (SELECT u.username,count(*) n FROM demo_scope d JOIN users u ON u.id=d.reviewer_id GROUP BY u.username) s),
 'inserted', (SELECT count(*) FROM demo_new),
 'preserved_existing_rows', true);
COMMIT;
"""


def sql_for(mode: str, records: list[dict], execute_cleanup: bool = False) -> str:
    sql = setup_sql(records)
    if mode == "cleanup":
        if execute_cleanup:
            # Only explicit double-marked keys from this exact version; FK cascades remove children.
            sql += """WITH removed AS (DELETE FROM documents d USING demo_expected e
              WHERE starts_with(d.title,e.prefix) AND starts_with(d.description,e.marker) RETURNING d.id)
              SELECT jsonb_build_object('removed_documents',count(*),'dataset','DOCFLOW-DEMO-V1') FROM removed;
              COMMIT;"""
        else:
            sql += """WITH candidates AS (SELECT d.id FROM documents d JOIN demo_expected e
              ON starts_with(d.title,e.prefix) AND starts_with(d.description,e.marker))
              SELECT jsonb_build_object('mode','cleanup preview only','dataset','DOCFLOW-DEMO-V1',
              'document_ids',coalesce(jsonb_agg(d.id ORDER BY d.id),'[]'), 'documents',count(*),
              'history_records',(SELECT count(*) FROM approval_history WHERE document_id IN (SELECT id FROM candidates)),
              'review_comments',(SELECT count(*) FROM review_comments WHERE document_id IN (SELECT id FROM candidates)),
              'warning','Execution removes these synthetic documents and all of their associated comments/history, including subsequent demo review activity.')
              FROM candidates d;
              ROLLBACK;"""
        return sql
    if mode == "seed":
        sql += """
CREATE TEMP TABLE demo_new ON COMMIT DROP AS WITH added AS (
 INSERT INTO documents(title,description,status,submitter_id,reviewer_id,created_at,updated_at)
 SELECT e.title,e.description,e.status,s.id,r.id,e.created,e.updated FROM demo_expected e
 JOIN users s ON s.username=e.submitter JOIN users r ON r.username=e.reviewer
 WHERE NOT EXISTS(SELECT 1 FROM documents d WHERE starts_with(d.title,e.prefix) AND starts_with(d.description,e.marker))
 ORDER BY e.key RETURNING id,title)
 SELECT a.id,e.key FROM added a JOIN demo_expected e ON a.title=e.title;
INSERT INTO approval_history(document_id,changed_by,old_status,new_status,remark,created_at)
 SELECT d.id,CASE h->>'actor' WHEN 'submitter' THEN d.submitter_id ELSE d.reviewer_id END,
 h->>'old',h->>'new',h->>'remark',(h->>'at')::timestamp FROM demo_new n
 JOIN documents d ON d.id=n.id JOIN demo_expected e ON e.key=n.key CROSS JOIN LATERAL jsonb_array_elements(e.history) h;
INSERT INTO review_comments(document_id,reviewer_id,content,created_at)
 SELECT d.id,d.reviewer_id,c->>'content',(c->>'at')::timestamp FROM demo_new n
 JOIN documents d ON d.id=n.id JOIN demo_expected e ON e.key=n.key CROSS JOIN LATERAL jsonb_array_elements(e.comments) c;
"""
    else:
        sql += "CREATE TEMP TABLE demo_new(id bigint) ON COMMIT DROP;\n"
    return sql + VERIFY_SQL + PRESERVE_SQL + REPORT_SQL


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["plan", "seed", "verify", "cleanup"])
    parser.add_argument("--container", default="docflow-postgres")
    parser.add_argument("--project", default="document-approval-system")
    parser.add_argument("--allow-local-demo-write", action="store_true")
    parser.add_argument("--execute", action="store_true", help="Cleanup only; otherwise cleanup is a read-only preview")
    parser.add_argument("--confirm-dataset")
    parser.add_argument("--report", type=Path, help="Write non-sensitive JSON counts to this path")
    args = parser.parse_args()
    if args.execute and args.mode != "cleanup":
        parser.error("--execute is only valid for cleanup")
    if args.mode == "seed" or args.execute:
        if not args.allow_local_demo_write:
            parser.error("Writes require --allow-local-demo-write and an explicitly local development target")
    if args.execute and args.confirm_dataset != DATASET:
        parser.error(f"Cleanup execution requires --confirm-dataset {DATASET}")
    user, database = target(args)
    records = generate()
    result = psql(args, user, database, sql_for(args.mode, records, args.execute))
    result.update(dataset=DATASET, mode=args.mode, local_container=args.container, project=args.project)
    if args.mode == "cleanup":
        result["cleanup_executed"] = args.execute
    if "by_status" in result:
        result["target_by_status"] = TARGET
        result["target_matches"] = result["by_status"] == TARGET
        result["skipped_existing_demo_documents"] = result["demo_documents"] - result["inserted"]
        result["missing_demo_documents"] = sum(TARGET.values()) - result["demo_documents"]
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, OSError) as error:
        print(f"Demo operation failed: {error}", file=sys.stderr)
        sys.exit(1)
