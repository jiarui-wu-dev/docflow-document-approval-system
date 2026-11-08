# Publication readiness review

Reviewed **17 October 2026**. Scope: current DOCFLOW source files, configuration, documentation, dependencies, local tests, and isolated Docker execution.

**Outcome:** the current source is ready for final human review as a local portfolio application. No known unresolved critical issue was found in the reviewed publication files after the fixes below. This is not a production security certification. The Git index/history could not be reviewed because this directory has no `.git` metadata; review the actual publication index and any imported history before making a repository public.

## Final private-repository publication review - 8 November 2026

This section supersedes the earlier source-control availability statements above and below. The October execution results remain historical.

- Verified both the GitHub connector and the saved Git transport credential authenticate as `jiarui-wu-dev` (GitHub user ID 73450437). Publication targets only `jiarui-wu-dev/docflow-document-approval-system`, with private visibility.
- Initialized a fresh local `main` branch; there was no previous Git history to import. Reviewed all 121 staged paths. No environment secrets, scratch configurations, logs, database backups, IDE settings, dependency folders, compiled output, or generated E2E diagnostics are staged. `.env.example` contains placeholders only.
- Scanned the exact staged contents for common private-key, GitHub/OpenAI/AWS token, JWT, embedded URL credential, and BCrypt hash patterns, and for the five actual secret values from local configuration. Zero matches. Reviewed the staged documentation screenshots; they show demo/test records and no exposed credentials. This targeted review is not an exhaustive dedicated secret-scanner certification.
- Re-ran frontend unit tests: **27 passed**; E2E TypeScript validation and the production build passed. Current `npm audit` reports **zero vulnerabilities**.
- Re-ran demo-data tests: **10 passed**.
- Re-ran all backend tests: **21 passed**, with **one environment error** in `DocumentApprovalSystemApplicationTests.contextLoads` because PostgreSQL at `localhost:5433` refused the connection. No application assertion failed. The full PostgreSQL-backed startup, Docker workflow, and browser E2E suite were not re-run successfully in this final review; their October results are historical.
- Java dependency and container/OS advisory scans remain unperformed. The deployment limitations documented above still apply; this publication is source code in a private repository, not a hosted application deployment.

The actual index/history publication gate is satisfied for this fresh initial commit. Credential rotation remains conditional on any earlier exposure outside this checkout.

## Findings and fixes

| Finding | Priority | Resolution |
| --- | --- | --- |
| Embedded database credentials in Spring and Compose configuration | High / publication blocker | Replaced with environment placeholders; added placeholder-only `.env.example`; actual local settings remain in ignored `.env` |
| Unused password utility containing working development credentials and printing hashes | High / publication blocker | Removed the utility; no working account passwords remain in publication source/docs |
| Incomplete ignores for environment files, diagnostics, and database backups | High | Expanded Git and Docker ignores; excluded scratch files, keys, logs, dumps, build output, and E2E artifacts |
| Three npm advisories: two critical and one moderate in test tooling | High | Updated Vitest and its locked dependency tree; final `npm audit` reports zero vulnerabilities |
| No safe, documented way to initialize accounts on a fresh database | Medium | Added explicit `dev`-only, opt-in provisioning with caller-supplied non-placeholder passwords; existing users are never modified |
| Fixed Compose container names and no readiness dependencies | Medium | Removed fixed names; introduced PostgreSQL/backend checks and health-based dependency ordering; configurable loopback host ports |
| Development Swagger exposed by default | Medium | Disabled API documentation in the default profile; enabled it explicitly in `dev` |
| Invalid inputs or unsupported HTTP requests could reach generic 500 handling | Medium | Added DTO length/ID validation and safe 400/405/415 responses, with regression tests |
| Status and audit writes lacked one explicit service transaction | Medium | Made mutations transactional so the status and history entry commit together; read paths use read-only transactions |
| Nginx location-level headers overrode inherited security headers | Medium | Removed conflicting location header declarations; verified CSP and cache headers on the delivered frontend |
| Sidebar API documentation URL assumed backend port 8080 | Low | Routed Swagger/OpenAPI through the same-origin Vite/Nginx proxy |
| README described a backend-only project and mixed historical verification with current behavior | Medium | Replaced it with verified full-stack setup, diagrams, real screenshots, permissions, testing, and limitations; marked old reports as historical |

No JWT, authentication bypass, user-management API, database schema rewrite, or broad application refactor was introduced. HTTP Basic, BCrypt, the three roles, existing document permissions, and workflow transitions remain intact.

## Security review

- Checked Spring Security, controller DTOs, service permission checks, list data scopes, history/comment reads, error handling, frontend credential handling, proxy configuration, development bootstrap, migrations, Docker inputs, and documentation.
- Document, history, and comment retrieval use the same ownership/assignment scope. Adversarial E2E requests verify that filter IDs and forged role/actor fields do not expand permissions.
- Live preflight checks and MVC tests verify that identity responses contain exactly `id`, `username`, and `role`, with no password or password hash. Frontend credentials remain in memory; refresh requires login. Browser storage exports, tracing, videos, and login screenshots are disabled.
- Sessions are explicitly stateless. This does not make HTTP Basic inherently CSRF-safe. CSRF remains disabled for the existing JSON API and is a deployment review item, especially with browser-managed Basic credentials. CORS was not broadened. TLS, rate limiting, production account provisioning, secret management, and concurrency controls remain outside the local portfolio setup.
- Default/non-development runtime verification returned **404** for both `/v3/api-docs` and `/swagger-ui/index.html`, and **401** for anonymous `/api/auth/me`. Development Swagger and the identity route through the frontend proxy returned **200**.
- Known demo-password and common private-key/token pattern searches found no matches in publication source/documentation after fixes. This was a code/configuration review and targeted pattern scan, not an exhaustive dedicated secret-scanner certification. Generated test secrets were not found in isolated backend logs.
- No Git repository was available: neither tracked-file state nor prior commits could be examined. `.gitignore` does not untrack previously committed files. If credentials were committed to another copy or remote, removing them from current files does **not** remove them from history; exposed credentials need rotation. No history was changed here.
- npm advisories were checked. A Java dependency advisory scan and container/OS vulnerability scan were **not** performed; do not interpret passing tests or the npm result as clearance of those dependency trees.

## Executed verification

| Check | Actual result |
| --- | --- |
| `.\mvnw.cmd package` with reachable PostgreSQL | **22 passed**, 0 failures, 0 errors, 0 skipped; executable JAR built |
| `npm test` | **27 passed**, 0 failed |
| `npm run typecheck` | Passed |
| `npm run e2e:typecheck` | Passed |
| `npm run build` | Passed; TypeScript and Vite production assets generated |
| `npm audit` after dependency update | **0** known npm vulnerabilities |
| Fresh `npm ci`, unit tests, E2E typecheck, and production build in a source-only snapshot | Passed; no pre-existing `node_modules` or frontend build output |
| Compose source build with fresh PostgreSQL volume | Passed; backend JAR compiled inside Maven/Java 21 image; frontend built inside Node 22 image |
| Final rebuilt backend image | Passed startup and browser checks after final error-handler changes |
| Full Playwright Chromium suite | **9/9 passed twice**, 0 failed or skipped; final run against the final rebuilt backend after stack restart |
| Browser HTTP/console diagnostics | 9 final diagnostic files; **0** runtime errors or HTTP 500 responses |
| Live malformed/oversized requests | Oversized title 400; invalid status filter 400; unsupported method 405; unsupported content type 415 |
| Backend runtime user | Non-root `docflow` user, UID 999 |
| Frontend HTTP/security headers | 200; Content-Security-Policy present; HTML Cache-Control `no-cache` |
| Swagger and development API schema through Nginx | 200; `/api/auth/me` present in schema |
| Stop/start persistence | All user, document, comment, and history row fingerprints unchanged; account password hashes unchanged |
| Existing development environment | Same database container; all rows unchanged in all four application tables |

Backend tests include identity/authentication, safe identity contracts for all roles, protected comment retrieval, input/HTTP error handling, development account initialization, and the real PostgreSQL context smoke test. Frontend unit tests cover API and workflow rules.

The browser suite actually signed in, created/submitted a draft, started review, posted a comment, approved, inspected history, and checked administrator statistics. A separate UI flow rejected a document. Direct adversarial requests supplemented these browser actions to test submitter denial, incorrect reviewer assignment, anonymous operations, forged identity fields, and invalid transitions. Hiding a control was not treated as proof of server authorization.

## Docker and data isolation

An isolated project named `docflow-publication` used:

- Frontend `127.0.0.1:13000`, backend `127.0.0.1:18080`, PostgreSQL `127.0.0.1:15433`.
- A separate `docflow-publication_postgres_data` volume and generated database/account secrets stored only in ignored scratch configuration.
- A source-only snapshot under ignored `publication-work/clean-source`, excluding local `.env`, `target/`, `node_modules/`, and build/test output. Hash comparisons confirmed all **66** relevant application/build/test source inputs matched the final repository files.
- The initial database had zero documents. Flyway applied V1 successfully on the empty schema. Opt-in provisioning created exactly three development role accounts with caller-supplied secrets.
- The first E2E run created seven disposable records. A stop/start cycle preserved all rows. The second run preserved those seven records and added seven more, leaving **14 isolated test documents**, all with unique E2E run prefixes.
- A second disposable application container on port 18081 verified non-development documentation settings using only the isolated database.

The original environment retained **3 users, 14 documents, 20 history entries, and 4 comments**. Full-row fingerprints and the original PostgreSQL container ID matched before/after. No existing accounts, document data, database volumes, or migrations were reset or deleted. The original app/database containers remain running; their images were not replaced during this audit.

All isolated test containers are now **stopped**. Their separate volume and disposable records remain for inspection. The generated local configuration and logs remain under ignored `publication-work/`; do not stage or publish that directory or `.env`.

This was a fresh-data/source-only snapshot install/start test, **not a Git clone test**: Git metadata was absent. Docker caches/base-image caches were available, so this was not a network/cache-free build. Image tags are not pinned to digests.

### Commands executed

From the repository: `.\mvnw.cmd package` (including the complete test suite); frontend `npm test`, `npm run typecheck`, `npm run e2e:typecheck`, `npm run build`, and `npm audit`. The clean snapshot additionally ran `npm ci` before those frontend checks. Chromium was already installed from the earlier E2E setup; no new browser download was needed.

From the source-only snapshot, with a generated ignored environment file:

```powershell
docker compose --project-name docflow-publication --env-file ../isolated.env -f compose.yaml -f compose.frontend.yaml up -d --build --wait --wait-timeout 180
# After final backend changes, rebuilt the same isolated stack.
# Stopped and restarted it without removing containers/volumes:
docker compose --project-name docflow-publication --env-file ../isolated.env -f compose.yaml -f compose.frontend.yaml stop
docker compose --project-name docflow-publication --env-file ../isolated.env -f compose.yaml -f compose.frontend.yaml up -d --wait --wait-timeout 180
```

Both browser runs used `npm run e2e` from the main `frontend/`, targeting ports 13000/18080 through process environment overrides and generated per-role secrets. Additional checks used Docker logs/inspection, read-only SQL row fingerprints, non-root `id`, and HTTP requests without recording credential headers. No destructive cleanup commands, commits, pushes, or publishing actions were executed.

## Files changed in this review

Configuration/build:

- `.gitignore`, `.dockerignore`, `.env.example` (new).
- `Dockerfile`, `compose.yaml`, `compose.frontend.yaml`, `pom.xml`.
- `src/main/resources/application.yaml`, `src/main/resources/application-dev.yaml` (new).

Backend:

- `src/main/java/com/jeri/docflow/bootstrap/DevUserInitializer.java` (new).
- `src/main/java/com/jeri/docflow/security/SecurityConfig.java`.
- `src/main/java/com/jeri/docflow/service/DocumentService.java`, `ReviewCommentService.java`.
- `src/main/java/com/jeri/docflow/dto/CreateDocumentRequest.java`, `CreateReviewCommentRequest.java`, `UpdateDocumentStatusRequest.java`.
- `src/main/java/com/jeri/docflow/exception/GlobalExceptionHandler.java`.
- `src/main/java/com/jeri/docflow/util/PasswordEncoderUtil.java` (removed).
- `src/test/java/com/jeri/docflow/bootstrap/DevUserInitializerTest.java` (new).
- `src/test/java/com/jeri/docflow/controller/RequestValidationTest.java` (new).

Frontend:

- `frontend/package.json`, `frontend/package-lock.json`.
- `frontend/.dockerignore`, `frontend/nginx.conf`, `frontend/vite.config.ts`.
- `frontend/src/components/Layout.tsx`.

Documentation:

- `README.md`, `docs/publication-readiness.md` (new).
- `frontend/VALIDATION.md`, `frontend/e2e/README.md`, `frontend/docs/e2e-report.md`, `frontend/docs/login-fix.md`.
- Seven new real captures in `docs/screenshots/`: `01-alice-draft.png`, `02-alice-submitted.png`, `03-bob-in-review-with-comment.png`, `04-bob-approved-history.png`, `05-admin-dashboard-totals.png`, `06-admin-completed-document.png`, `07-rejected-terminal-history.png`.

An actual `.env` matching the existing local database was created only if absent, and is intentionally ignored. It is not a publication deliverable. Generated scratch copies, logs, compiled files, and E2E artifacts are likewise excluded. With no Git metadata, this list records work performed, not an independently verified `git diff`; unrelated pre-existing files were not discarded.

## Remaining issues and human publication checklist

There are **no known unresolved critical blockers in the reviewed current source files**. The source-control check below remains unverified and must be completed against the repository that will actually be published.

- [ ] **Required publication gate:** inspect the actual Git index and any existing/imported history for `.env`, credentials, SQL dumps, logs, IDE files, and generated output. Git state/history were unavailable here. Do not assume adding ignores removes tracked files.
- [ ] **Required if previously exposed:** rotate any credentials committed or shared outside their intended local environment. Do not reuse the old local development secrets for hosted deployment. Removing current values does not erase history.
- [ ] **Recommended dependency verification:** run Java and container/OS advisory scans and enable hosting-provider dependency alerts; only npm advisory checks were performed here.
- [ ] **Low / presentation:** choose a reuse license if desired, set the GitHub description/topics, and visually review screenshots/README in the target repository. Suggested description: “Full-stack document approval workflow with Spring Boot, React, PostgreSQL, role-scoped access, audit history, Docker, and Playwright tests.” No repository was published or modified remotely.
- [ ] **Deployment gate, not required for local-source publication:** configure TLS, CSRF/trusted-origin protection, rate limiting, production account provisioning, backups, monitoring, secret rotation, and concurrency conflict handling. The README identifies these limitations rather than claiming production readiness.

The README now includes a concise overview, real features/screenshots, stack, architecture and workflow diagrams, role permissions, environment reference, native and Docker startup, Flyway behavior, API routes, testing instructions, engineering decisions, known limitations, and future work.
