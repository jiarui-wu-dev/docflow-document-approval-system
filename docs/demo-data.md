# Synthetic portfolio demonstration data

Dataset: **DOCFLOW-DEMO-V1**. These are fictional records for a local portfolio demonstration, not real procurement activity, review decisions, or business performance. The frontend continues to calculate all totals and status bars from the real authorized API responses.

## Design and scope

`scripts/demo_data.py` is an explicit Python 3.10+ development utility using only the standard library and the existing Docker/PostgreSQL client. It is not part of Spring startup, Flyway migrations, or application runtime. No backend code, authentication, schema, or workflow rules are modified. Direct fixture insertion is intentional: the public API cannot backdate records, and no backdating capability was added to the application.

Before writing, the command checks the actual Docker endpoint, Compose project/service labels, named database volume, database name, and existing user roles. It refuses remote Docker endpoints, unrelated project labels/volumes, missing accounts, and conflicting/duplicate dataset identifiers. The default verified target is:

| Item | Local development target |
| --- | --- |
| Docker project | `document-approval-system` |
| Container | `docflow-postgres` |
| Service | `postgres` |
| Database | `docflow_db` |
| Volume | `document-approval-system_postgres_data` |

On a new Compose setup with generated container names, pass `--container document-approval-system-postgres-1`. If the local project name differs, explicitly pass `--project YOUR_LOCAL_PROJECT` and its corresponding container; the volume must be that project's `postgres_data` volume. This is an operator safeguard for development, not a security boundary that identifies a production environment automatically. Never point it at a hosted or production database.

All records use two matching identifiers: title prefix `[DEMO-V1-001]` through `[DEMO-V1-150]`, and a first-line description marker containing `dataset=DOCFLOW-DEMO-V1` and the same numeric key. Descriptions, comments, and history remarks clearly identify the data as synthetic. Titles and descriptions cover 30 enterprise request types across five fictional business units, including purchases, budgets, IT access, supplier agreements, compliance assessments, and policy changes. Vendor names and amounts are fictional.

The dataset uses only existing accounts:

- Alice owns 120 documents; Admin owns 30. No new users are created.
- Bob is assigned 120 documents; Admin is assigned 30. Submitter and reviewer are different on every generated record.
- Submission history is attributed to the document owner; review and decision history to the assigned reviewer. Both assignments conform to the current role model.
- DRAFT has no history; SUBMITTED has one transition; IN_REVIEW has two; APPROVED/REJECTED have three. Comments begin after review starts. Created, history, comment, and updated timestamps are ordered, use UTC values for the schema's timestamp-without-time-zone columns, and are never future-dated.

## Preview, seed, and verify

Run from the repository root, with Docker and the existing development PostgreSQL service running:

```powershell
python scripts/demo_data.py plan
python scripts/demo_data.py seed --allow-local-demo-write
python scripts/demo_data.py verify
```

`plan` and `verify` do not write persistent data. The seed runs in one transaction with an advisory lock shared by concurrent copies of this utility. It inserts only missing keys and their associated history/comments. It never updates or deletes existing records, and never creates or changes users/passwords. Full-row fingerprints check that pre-existing document, history, comment, and user rows are preserved before commit. A consistency failure rolls the transaction back.

The seed is repeatable: rerunning inserts zero records after a complete run. If a generated document is subsequently advanced through the application, its existing state/history is retained; rerunning does not force the original distribution back onto it. `target_matches` then reports whether the current dataset still matches the original distribution. Keep both identifiers intact; conflicting or duplicate identifiers cause a refusal instead of a repair or overwrite. Do not run while other users are actively modifying the development database.

Optional `--report publication-work/demo-seed.json` writes non-sensitive JSON counts to an ignored scratch directory. No database or application passwords are embedded in the utility or its reports. Database access is through the verified local container; application credentials are unnecessary for SQL fixture insertion.

## Cleanup is preview-first

```powershell
python scripts/demo_data.py cleanup
```

This prints only the candidate IDs and document/history/comment counts. **It does not delete anything.** The preview requires both markers to match one of the 150 reserved keys; unrelated records, including E2E records, are excluded.

For intentional removal only, review the preview first and explicitly request execution:

```powershell
python scripts/demo_data.py cleanup --execute --allow-local-demo-write --confirm-dataset DOCFLOW-DEMO-V1
```

This deletes only those matched synthetic documents. Existing foreign-key cascades remove their associated comments/history, including any subsequent review activity on those demo documents. It never removes users or unrelated documents. **Cleanup execution was not performed during this task.** No reset, truncation, volume removal, or account changes were performed.

## Executed verification — 17 October 2026

The local database initially contained 14 E2E documents and no `DOCFLOW-DEMO-V1` records. The seed actually inserted **150 documents, 310 status-history entries, and 175 comments**. A second actual seed run inserted **0** documents and skipped **150** existing demo keys. Verification reported **0** history/comment consistency violations. The cleanup preview selected exactly those 150 documents and their 310/175 child records, and was not executed.

| Status | New synthetic dataset | Existing records excluded | Combined Admin total |
| --- | ---: | ---: | ---: |
| DRAFT | 15 | 4 | 19 |
| SUBMITTED | 30 | 4 | 34 |
| IN_REVIEW | 35 | 2 | 37 |
| APPROVED | 50 | 2 | 52 |
| REJECTED | 20 | 2 | 22 |
| **Total** | **150** | **14** | **164** |

All 14 excluded records were existing E2E data. The first seed skipped no earlier records from this dataset because none existed. Document IDs 15–164 identify this local run, but the script never assumes fixed IDs. The earliest generated creation time was **20 July 2026 22:32:18 UTC**, and the latest activity **17 October 2026 18:39:18 UTC**. Relative dates are anchored at the first insertion; rerunning does not rewrite timestamps.

Real Playwright browser sessions at localhost:5173 verified login, dashboard totals, all five status counts/percentages/bar widths, filtered document lists, and an approved document's three-entry history. No frontend responses were mocked. The read-only verification created no additional test documents and did not change states.

| Account | Total visible | Synthetic visible | Verified behavior |
| --- | ---: | ---: | --- |
| Alice / SUBMITTER | 132 | 120 | Own documents only; denied direct access to an Admin-owned document, history, and comments |
| Bob / REVIEWER | 132 | 120 | Assigned documents only; denied direct access to an Admin-assigned document, history, and comments |
| Admin / ADMIN | 164 | 150 | Complete dataset, dashboard, filtered list, approved details/history |

The existing backend returns 400 for these business-permission denials; its status semantics were not changed. All browser dashboard/status/list checks passed, with no captured runtime errors or HTTP 500 responses. Admin's pending-review statistic was **71**: 65 synthetic pending documents plus six existing ones. The 150-document distribution is not presented as the entire database total.

### Verification commands

```powershell
python -m unittest discover -s scripts -p 'test_*.py' -v
cd frontend
node --check e2e/verify-demo.mjs
node e2e/verify-demo.mjs
npm test
npm run build
```

Before the browser command, supply the existing test credentials through process environment variables: `DOCFLOW_E2E_ALICE_PASSWORD`, `DOCFLOW_E2E_BOB_PASSWORD`, and `DOCFLOW_E2E_ADMIN_PASSWORD` (or `DOCFLOW_E2E_PASSWORD` only if those local accounts share a password). Never put their values in source files or reports. The browser/Chromium setup and secure prompting are described in [the E2E guide](../frontend/e2e/README.md). This read-only utility reuses the installed Playwright dependency; it does not run the mutation-based E2E suite.

Actual results: **10 Python utility tests passed**, **27 frontend unit tests passed**, and the frontend production build/TypeScript validation passed. The browser verification passed for all three roles. Backend code was unchanged, so backend packaging/tests and the full mutation-based E2E suite were not rerun for this data-only change. Their earlier results are recorded separately in [the publication review](publication-readiness.md).

The utility tests cover exact distribution, stable identifiers, timestamp/state chains, lengths/roles, insert-only SQL, escaped literals, cleanup preview/scoping, refusal of remote/unrelated targets, and explicit write/cleanup confirmation requirements. Live SQL checks validate state-history agreement, valid transitions, chronological history, permitted actors, and comment authors/timestamps. Cleanup execution itself remains deliberately untested against the existing database.

### Actual screenshots

- [Admin dashboard](screenshots/demo-admin-dashboard.png)
- [Alice's scoped dashboard](screenshots/demo-alice-dashboard.png)
- [Bob's scoped dashboard](screenshots/demo-bob-dashboard.png)
- [Filtered demo document list](screenshots/demo-admin-documents.png)
- [Approved demo document and history](screenshots/demo-approved-document.png)

Screenshots are captured only after the login form is absent. No credentials, HTTP headers, traces, videos, or saved browser storage are included. Sanitized browser results remain in ignored `frontend/e2e-results/demo-verification.json`.

Files added/changed for this task: `scripts/demo_data.py`, `scripts/test_demo_data.py`, `frontend/e2e/verify-demo.mjs`, `docs/demo-data.md`, the five screenshots above, `README.md`, and Python cache ignore rules in `.gitignore`. No application behavior was changed.
