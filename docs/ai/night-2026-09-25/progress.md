# Progress — night-2026-09-25

## Run start

- Wall clock: 2026-09-25 16:28 (time zone id `W. Europe Standard Time`)
- Session budget at start: 14,976,374 tokens (`<total_tokens>` at preflight)
- **Deadline: 2026-09-27 07:00** (from the plan's `## Limits`). No new task
  from 2026-09-27 06:30; ceiling 2026-09-27 07:30.
- Limits, as written in the plan: "Weekly usage at start: 12% (resets Sunday
  08:00). This is information only: the run cannot see the usage limit, and if
  it runs out the session just stops."
- Started as `/loop /night-run` in the same session that wrote the plan
  (heartbeat mode, SKILL.md §9.5).

### Goal (verbatim from plan.md)

> Xenocat Analytics: a professional invoices-and-customers dashboard that is
> haunted by alien cats. The cats are hand-drawn SVG. They drift onto the screen,
> curl up and sleep, and every so often one wakes up and attacks the mouse pointer.
> Each cat type has its own attack effect and its own way of appearing and
> disappearing. There are at least 20 cat types and never more than 5 cats on
> screen at once. The dashboard itself still works like a professional tool:
> the invoice and customer pages, search, pagination and login keep working. The
> project has unit tests, browser tests and CI that prove all of this, and no
> security problem known at the start of the run is left open.

### Preflight

- Node v24.19.0, npm 11.17.0; `node_modules` present; `.env` present.
- Base: `main` at `66dee3e` ("asds"), up to date with `origin/main`.
- Run branch `night-2026-09-25` cut from `main` at `66dee3e`.
- Remote reachable; no `night-2026-09-25*` branch on `origin`.
- The plan is committed on `main` (commits `6275489`, `66dee3e`), not untracked.
- **Pre-existing uncommitted change (not the run's; never committed by it):**
  `M .claude/skills/night-run/SKILL.md` — the §9.5 `/loop` heartbeat section.
- Note: `app/seed/route.ts` and `app/query/route.ts` were already deleted by
  the human on `main` (`a1e8040`) before the run started.
- Git identity is `Martin Larsson <id+lazurq-png@users.noreply.github.com>`, a
  placeholder address (Q1).

### Baseline

- `npm run lint` → exit 0, **0 errors, 0 warnings** (`lint-baseline.txt`). 76 s
  together with the first type check.
- `npx tsc --noEmit` → first exit 2: `.next/types/validator.ts` still
  referenced the deleted `app/query/route.js` / `app/seed/route.js` (stale
  generated types from an earlier build). Re-run after regeneration → exit 0.
  The gate's type check is therefore `npx next typegen && npx tsc --noEmit`
  (D1); typegen took 2 s.
- `npm run build` → **exit 1, environment**: prerendering `/dashboard` fails
  with `Error: connect ECONNREFUSED 127.0.0.1:5432` (then "Failed to fetch card
  data."). Compilation and TypeScript passed; the failure is the database
  connection. `127.0.0.1:5432` is the `postgres` library's default when
  `POSTGRES_URL` is unset, so `.env` exists but does not supply a reachable
  `POSTGRES_URL` (not read, per §3). **The build is out of the gate for the
  whole run** (§1.5). 45 s.
- Tests: none exist yet.

## T1 — Unit tests (`night-2026-09-25-t1-unit-tests`)

- Start: 2026-09-25 16:31, budget 14,962,202 tokens.
- Base SHA: `66dee3ea4af82705ea8828b5e42c14048c5bf0c3`.

### What the code does

- `app/lib/schemas.ts` (new): the invoice zod schemas (`FormSchema`,
  `CreateInvoice`, `UpdateInvoice`), moved verbatim out of `app/lib/actions.ts`.
- `app/lib/actions.ts`: imports those schemas instead of defining them. The
  actions' validation, cents conversion, SQL, `revalidatePath` and `redirect`
  are unchanged.
- `vitest.config.mts` (new): runs `tests/unit/**/*.test.{ts,tsx}` in Node with
  `TZ=UTC`, and maps the `@/` alias like `tsconfig.json`.
- `tests/unit/utils.test.ts` (new): `formatCurrency`, `formatDateToLocal`
  (default and explicit locale), `generateYAxis` (round-up and exact thousand),
  and all four `generatePagination` branches with their boundaries.
- `tests/unit/schemas.test.ts` (new): both invoice schemas — valid input and
  amount coercion; zero, negative, missing and non-numeric amounts; the exact
  "Please select a customer." / "Please select an invoice status." messages for
  missing fields; an unknown status; `id`/`date` stripped.
- `package.json`: `npm test` → `vitest run`; dev dependencies `vitest ~4.1.11`,
  `jsdom ^30.1.1`, `@testing-library/react ^16.3.3`, `@testing-library/dom ^10.4.2`
  (D2). `tsconfig.json`: includes `**/*.mts` (D3).

### Why it was added

Plan task 1; the goal requires "unit tests … that prove all of this", and every
later task's gate now includes `npm test`. The schemas moved because a
`'use server'` module may only export async functions and importing
`actions.ts` opens a database connection (the plan allowed the move). Package
choices: D2. Formatting check: D3.

### Verification

- `npm test` → exit 0, 2 files, **27 tests passed**.
- Negative control: `generatePagination`'s `totalPages <= 7` changed to `< 7`
  → "lists every page when there are 7 or fewer" failed (1 failed / 26
  passed); edit reversed by hand, suite green again.
- `npm run lint` → exit 0, output identical to `lint-baseline.txt` (0 warnings).
- `npx next typegen && npx tsc --noEmit` → exit 0.
- Prettier (LF-normalised, D3) on every changed file except the
  pre-existing-unformatted `tsconfig.json` → all pass.
- `npm audit` → 0 vulnerabilities.
- Build: not in the gate (Baseline).
- **Reviewer: Approve, no findings.** It independently re-ran test/lint/tsc,
  proved the `TZ=UTC` pin reaches the workers (27/27 pass under
  `TZ=America/Los_Angeles`, where the unpinned date would read "Jun 4"), and
  compared the lockfile's package map: no existing package moved, all
  additions are the allowed four plus transitive dev deps. Note carried to T2:
  `jsdom` 30 requires Node `^22.22.2 || ^24.15.0 || >=26.0.0`, so CI must pin a
  Node version in that range.
- Covered by tests: the utils and schema behaviour above. Not covered (not in
  scope): the actions' database and redirect paths.

## T2 — Browser tests and CI (`night-2026-09-25-t2-e2e-and-ci`)

- Start: 2026-09-25 16:39, budget 14,919,030 tokens.
- Base SHA: `a797385` (T1 merged).
- T1 outcome: committed `a797385`, fast-forwarded onto `night-2026-09-25`,
  both branches pushed; **pushed; no CI** (no workflow in that commit).

### What the code does

- `playwright.config.ts` (new): Chromium-only browser tests in `tests/e2e/`
  against a test server on port 3100 — `next dev` by default, `next start` when
  `E2E_SERVER=start` — started with a throwaway `AUTH_SECRET` and
  `AUTH_TRUST_HOST=true`; retries and traces only on CI.
- `tests/e2e/smoke.spec.ts` (new): the home page's "Log in" link is visible and
  leads to `/login`; `/login` shows its heading, the Email and Password fields
  (by label) and the log-in button; `/dashboard` without a session ends on
  `/login`. No form is submitted.
- `.github/workflows/ci.yml` (new): on every push and pull request, three jobs
  on Node 24 with `permissions: contents: read` — *checks* (`npm ci`, lint,
  `next typegen && tsc --noEmit`, `npm test`); *Build + browser tests
  (production)* (`npm run build` with the `POSTGRES_URL` secret on that step
  only, then Chromium and the browser tests against `next start`); *Browser
  tests (dev server)*. Jobs that start Next make a masked throwaway
  `AUTH_SECRET`. Playwright reports are uploaded on failure.
- `package.json`: `test:e2e` → `playwright test`; dev dependency
  `@playwright/test ^1.63.0`. `.gitignore`: Playwright output directories.
- `AGENTS.md`: the Next.js agent-rules block `next dev` writes (D5).
- Docs: `CLAUDE.md` §9 (checks table with unit and browser tests, typegen,
  the e2e server, CI's three jobs), `.claude/README.md`,
  `.claude/docs/ai-workflow.md`, and `.claude/rules/testing.md` /
  `frontend.md`, whose "no test suite / no Playwright" statements had become false.

### Why it was added

Plan task 2; the goal requires "browser tests and CI that prove all of this",
and from this commit `npm run test:e2e` is part of the gate and CI runs on every
pushed task branch (the run polls it). Dev versus production server and the job
split: D4. The `AGENTS.md` block: D5. `next-env.d.ts`: D6.

### Verification

- `npm run test:e2e` → exit 0, **3 passed** (~7 s once warm; 23 s cold).
  Before the throwaway secret, the dev server logged `MissingSecret` (local
  `.env` has no `AUTH_SECRET`, Q2 addendum); after, none.
- Negative control on the redirect test **not run**: temporarily making
  `auth.config.ts` let visitors without a session into `/dashboard` was
  refused by the session's auto-mode classifier ("Security Weaken"). The edit
  was reversed at once; `git diff --exit-code auth.config.ts` confirmed it
  identical to HEAD. The redirect test is therefore unproven against a broken
  callback.
- actionlint 1.7.12 with shellcheck and pyflakes on `.github/workflows/` → exit 0.
- `npm test` → 27 passed. `npm run lint` → exit 0, same as baseline.
  `npx next typegen && npx tsc --noEmit` → exit 0.
- Prettier (LF-normalised): all new files, `package.json`, `.gitignore`,
  `frontend.md`, `testing.md` pass; `CLAUDE.md`, `.claude/README.md` and
  `ai-workflow.md` were already unformatted on the base (D3).
- `npm audit` → 0 vulnerabilities. Chromium Headless Shell 153 installed with
  `npx playwright install chromium`.
- `next start` could not be run locally (no build: database unreachable, Q2);
  it runs only in CI.
- Reviewer, first pass: **Request Changes** — (1) browser tests only against
  `next dev`, never the production build the plan's `next start` implies;
  (2) `POSTGRES_URL` visible to every step of the build job, including
  `npm ci`'s install scripts. Both fixed as the reviewer recommended (D4):
  production browser tests after the build, and the secret scoped to the build
  step. Re-verified: actionlint, tsc, lint, e2e (3 passed) all exit 0.
- Reviewer, re-review: both findings **resolved**; one new low finding — the
  docs (`CLAUDE.md` §9, `.claude/README.md`, `ai-workflow.md`, `testing.md`)
  still described CI's browser tests as `next dev` only. Fixed as recommended:
  each now describes the build job's production browser tests, and `CLAUDE.md`
  names `E2E_SERVER=start`. Docs-only change, so no third review.
- Behaviour covered by tests: the three smoke paths above. Not covered: search,
  pagination and the dashboard pages (they need a session and the database).

## T3 — Security baseline (`night-2026-09-25-t3-security`)

- Start: 2026-09-25 16:48, budget 14,861,965 tokens.
- Base SHA: `48124b5` (T2 merged).
- T2 outcome: committed `48124b5`, fast-forwarded, both branches pushed; CI
  poll started in the background (pending).

### What the code does

- `app/lib/actions.ts`: a private `isSignedIn()` helper reads `auth()`.
  `createInvoice` and `updateInvoice` first return "You must be logged in to
  create/update an invoice." without a session, before validating or touching
  the database; `deleteInvoice` throws `Unauthorized`. `deleteInvoice` now
  catches a database error, logs it server-side and throws a generic
  "Database Error: Failed to Delete Invoice.". `authenticate` is unchanged.
- `tests/unit/actions.test.ts` (new): with `postgres`, `@/auth`, `next-auth`,
  `next/cache` and `next/navigation` replaced by fakes (no database, no real
  session), proves each writing action refuses without a session — including a
  session object without a user — and makes no SQL call, redirect or
  revalidation; and, signed in, that create/update store cents
  (12.50 → 1250), redirect, and that delete hides the database error text.

### Why it was added

Plan task 3; the goal says "no security problem known at the start of the run
is left open". At the start, the actions accepted calls from anyone who could
POST to the site (Next's docs: Server Functions are public endpoints; `proxy.ts`
only gates navigation). The route deletions were already done on `main`
(`a1e8040`). Design: D7. Left for the human: Q7 (demo password, unused
placeholder file).

### Verification

- `npm test` → exit 0, 3 files, **37 passed** (10 new in `actions.test.ts`).
- Negative control **not run**: removing a session check to watch its test fail
  is the same temporary security-weakening edit the session's classifier
  refused in T2, so it was not attempted. The reviewer confirmed by reading
  that each refusal test fails without its check (see below).
- `npm run test:e2e` → 3 passed. `npm run lint` → exit 0, same as baseline.
  `npx next typegen && npx tsc --noEmit` → exit 0. Prettier (LF-normalised)
  on `actions.ts` and `actions.test.ts` → pass.
- Reviewer: **Approve.** It confirmed every writing action checks the session
  first (before `formData` is read), `authenticate` rightly has none, no route
  handler remains, redirects still follow the try/catch, and by reading that
  removing any check or moving it after validation fails a test. One low
  finding — `createInvoice`/`updateInvoice` swallowed database errors without
  logging them — fixed by adding `console.error('Database Error:', error)` to
  both, as recommended; tests, lint, tsc and Prettier re-run green (37 passed).
  Its note that the demo password in `app/lib/placeholder-data.ts` keeps a
  known problem open is Q7.
- Not verified: refusal against a running app (no Server Action may be invoked
  against the real database).
- **T2 CI outcome: CI passed** — all jobs `success` on both pushed branches
  (checks, build + production browser tests, dev-server browser tests):
  `night-2026-09-25-t2-e2e-and-ci` https://github.com/lazurq-png/next.js-dashboard/actions/runs/36149930139,
  `night-2026-09-25` https://github.com/lazurq-png/next.js-dashboard/actions/runs/36149929526.
  The build job succeeding means the `POSTGRES_URL` secret is set (Q4 resolved).
