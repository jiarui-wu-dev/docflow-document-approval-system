# Login failure investigation and verification

Historical diagnosis and results. See [the publication review](../../docs/publication-readiness.md) for current configuration, startup requirements, and verification. Database credentials must now be supplied through ignored local configuration or environment variables.

## Root cause

The running application container contained an April 23 JAR. Binary inspection found `DocumentController` and `GlobalExceptionHandler`, but no `AuthController`. The deployed OpenAPI specification also lacked `/api/auth/me`. The current repository already had the correct protected endpoint, returning only `id`, `username`, and `role`.

Both direct requests on port 8080 and proxied requests on port 5173 produced the same 500 response. Vite forwarded the route and HTTP Basic credentials correctly. Spring routed the unknown path through its resource handler; the catch-all exception advice converted `NoResourceFoundException` into the misleading `Unexpected error occurred` response. An MVC regression test covers this condition.

## Fix

- The backend Dockerfile now builds the JAR from current Java source in a Maven/Java 21 stage instead of copying a potentially stale host-side JAR.
- Exception advice now returns a structured 404 for missing resources/endpoints, while other exception behavior is unchanged.
- Added HTTP-level tests with real Spring Security Basic authentication, covering all three roles, missing/invalid credentials, the exact three-field identity response, and missing-route behavior.
- Rebuilt the host JAR and Docker image, then replaced only the application container. No frontend authentication or proxy change was needed; HTTP Basic and memory-only credentials remain in place.

## Commands executed

Read-only diagnosis included `docker compose ps`, `docker compose logs --tail 100 app`, deployed OpenAPI requests, direct/proxied HTTP requests, and `docker cp` / `jar tf` to inspect the deployed JAR. Credentials used for live verification were not added to source or written to this report.

```powershell
# Focused tests
.\mvnw.cmd '-Dtest=AuthControllerTest,AuthEndpointTest,ReviewCommentAccessTest' test

# Full backend suite and host JAR, using the existing Compose database
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5433/docflow_db'
.\mvnw.cmd package

# Build and replace only the application
docker compose build app
docker compose up -d --no-deps app

# Frontend checks
npm --prefix frontend run build
npm --prefix frontend test
```

The source-based Docker build was run again after the exception-handler change so the deployed image contains the final code.

## Actual results

| Check | Result |
| --- | --- |
| Full backend suite, including PostgreSQL Spring context | 10 tests passed; JAR packaged |
| Frontend TypeScript and production build | Passed |
| Frontend API/workflow tests | 27 passed |
| `/api/auth/me`, direct and proxied, for alice / bob / admin | 200; correct ID, username, SUBMITTER / REVIEWER / ADMIN role |
| Identity response keys | Exactly `id`, `username`, `role`; no password/hash fields |
| Wrong password, direct and proxied | 401 |
| Missing credentials | 401 |
| Unknown authenticated route | 404 |
| `/api/documents`, all three accounts | 200; current database returns an empty document collection |
| Swagger UI and deployed identity route in OpenAPI | 200; route present |
| Real frontend login, each role | Dashboard reached; correct role and role-specific navigation displayed |
| Invalid frontend login | Clear credential rejection message displayed |

The PostgreSQL container ID and named volume were identical before and after application replacement. Flyway validated the existing schema and reported no migration necessary. No volumes were removed, users recreated, or document records created/modified during verification. Because the database has no documents, live history/comment reads and workflow mutations were not exercised; existing workflow/ownership unit tests passed.
