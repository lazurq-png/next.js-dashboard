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
