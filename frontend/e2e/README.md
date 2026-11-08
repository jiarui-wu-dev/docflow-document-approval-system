# Live DOCFLOW E2E tests

This suite drives Chromium against the **running frontend**, its Vite or Nginx proxy, Spring Boot, and PostgreSQL. It does not mock HTTP responses or inject authenticated browser state. Scenarios A–C create, submit, review, comment on, approve, and inspect one document through real forms, buttons, dialogs, and navigation. A separate UI scenario exercises rejection.

Security tests supplement those browser actions with direct, adversarial HTTP requests. Those calls are intentionally separate from UI checks: a hidden button alone does not prove server authorization. Existing business permission denials return 400; anonymous requests return 401. State/history/comment checks verify that denied requests have no side effects.

## Run

1. Start the existing PostgreSQL and backend services and the Vite frontend at port 5173.
2. Install dependencies and the Chromium headless browser:

   ```powershell
   cd frontend
   npm ci
   npx playwright install chromium --only-shell
   ```

3. Supply credentials **only through the process environment**. For local accounts that share a password, use a secure prompt:

   ```powershell
   $e2eSecret = Read-Host 'Local E2E account password' -AsSecureString
   $env:DOCFLOW_E2E_PASSWORD = [System.Net.NetworkCredential]::new('', $e2eSecret).Password
   try {
     npm run e2e:typecheck
     npm run e2e
   } finally {
     Remove-Item Env:DOCFLOW_E2E_PASSWORD
   }
   ```

Alternatively, provide individual `DOCFLOW_E2E_ALICE_PASSWORD`, `DOCFLOW_E2E_BOB_PASSWORD`, and `DOCFLOW_E2E_ADMIN_PASSWORD` secrets. Corresponding `*_USERNAME` variables override the default local usernames. The suite resolves actual user IDs using `/api/auth/me`; it does not assume database IDs.

Optional target overrides: `DOCFLOW_E2E_BASE_URL` (default frontend port 5173) and `DOCFLOW_E2E_API_URL` (default backend port 8080). Run only against a development database where disposable records are permitted.

## Data isolation

- Every run creates a fresh `E2E-DOCFLOW-<timestamp>-<random>` prefix.
- Every mutation uses a document created by that run. The test accounts are never created, edited, or deleted.
- Preflight fingerprints all existing document DTOs. Teardown checks those same IDs and fingerprints again and fails if an original document has changed or disappeared.
- Teardown writes a manifest listing only the current run's disposable IDs, titles, owners, reviewers, and final statuses.
- Documents remain for inspection because the application has no delete API. The tests do not use SQL to bypass the application or clean up records, reset PostgreSQL, remove volumes, or alter migrations.
- Run serially, without other writers, for deterministic dashboard delta assertions. Retries are disabled so a failure cannot silently create additional records.

## Credentials and artifacts

`e2e-results/` is ignored by Git. It contains a sanitized `report.json`, per-test HTTP method/path/status and console diagnostics, `isolation.json`, and explicitly captured screenshots of authenticated workflow stages.

The custom reporter omits action arguments and headers and redacts known secrets from failures. Traces, videos, automatic screenshots, and automatic page snapshots are disabled because they can retain form values or HTTP Basic headers. No browser storage state is saved. Stage screenshots first assert that the password control is absent. Do not enable debug logging, raw HTML reporters, tracing, or credential persistence when testing with real accounts without reviewing their artifact exposure.

## Structure

- `docflow.e2e.spec.ts`: nine browser/integration scenarios.
- `helpers.ts`: UI login, logout/role switching, creation, status confirmation, comment, search, history, and denial assertions.
- `fixtures.ts`: per-test HTTP/console diagnostics and safe stage screenshots.
- `environment.ts`: credential environment access, role-scoped API clients, baseline fingerprints, and redaction.
- `prepare.ts` / `verify-isolation.ts`: authenticated preflight and original-record preservation checks.
- `reporter.ts`: sanitized machine-readable result and diagnostic files.

Selectors use labels, roles, accessible names, and visible document titles. Small accessibility labels on status/history/comments/statistics provide reliable semantic targets without altering production workflow behavior.

References: [Playwright configuration](https://playwright.dev/docs/test-configuration), [custom reporters](https://playwright.dev/docs/test-reporters).
