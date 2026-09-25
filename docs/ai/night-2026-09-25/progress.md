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

## T4 — Cursor engine (`night-2026-09-25-t4-cursor-engine`)

- Start: 2026-09-25 16:54, budget 14,838,317 tokens.
- Base SHA: `ed68d9c` (T3 merged).
- T3 outcome: committed `ed68d9c`, fast-forwarded, both branches pushed; CI
  poll started (pending).

### What the code does

- `app/ui/xenocats/random.ts` (new): `createRandom(seed)` — Mulberry32 with
  `next`, `range`, `int` (inclusive) and `pick`; the only randomness source.
- `app/ui/xenocats/effects.ts` (new): the `Effect` contract — a pure
  `step(input) → CursorLook` (position, visible, scale, blur, opacity) given the
  real pointer, its movement since the last frame, the previous fake look, the
  pointer at attack start, the cat's centre, elapsed ms, the viewport and one
  per-attack random `roll`. Three effects: **vanish** (hidden 3 s), **heavy**
  (30 % of real movement, 5 s), **knockback** (eases out 300 px directly away
  from the cat in 250 ms, holds the offset, 1.5 s). Everything is clamped to
  the viewport.
- `app/ui/xenocats/cursor-controller.ts` (new): the fake cursor's state machine,
  with time passed in: hidden until the pointer is first seen; follows it
  exactly otherwise; `attack()` refuses while another effect runs (one at a
  time); `frame()` sums pointer moves since the last frame, applies the active
  effect, and snaps back to the real pointer when it ends; `isBlocking()` is
  true exactly while an effect runs.
- `app/ui/xenocats/fake-cursor.tsx` (new, client): `XenocatCursorProvider`
  enables itself only with a precise pointer (`(pointer: fine)`), hides the
  system cursor via a class on `<html>`, draws an `aria-hidden` SVG arrow each
  animation frame, and, in the window's capture phase, cancels pointer
  events (pointer/mouse down/up, click, dblclick, auxclick, contextmenu) while an
  effect runs. The keyboard is never touched. `useXenocatCursor()` lets cats
  start an attack.
- `app/ui/global.css`: `html.xenocat-cursor-hidden` hides the system cursor.
- `app/dashboard/layout.tsx`: wraps the dashboard in the provider.
- Tests (new, `tests/unit/xenocats/`): random (determinism, ranges, pick),
  effects (each effect's numbers, easing, clamping, the roll fallback),
  controller (hidden until seen, following, blocking window boundaries,
  one-at-a-time, snap-back, delta summing, resize), and the provider in jsdom
  (cursor class and `aria-hidden`, cleanup, touch screens untouched, clicks
  blocked only during an effect, keyboard never blocked, second attack refused).

### Why it was added

Plan task 4; the goal's cats "attack the mouse pointer", which a browser allows
only through a fake cursor (human design decision). Effects are pure so each of
the 20 cat types supplies one `step` and the engine stays unchanged; all
randomness is seeded so tests are deterministic.
- **T3 CI outcome: CI passed** — `night-2026-09-25-t3-security`
  https://github.com/lazurq-png/next.js-dashboard/actions/runs/36150534838,
  `night-2026-09-25` https://github.com/lazurq-png/next.js-dashboard/actions/runs/36150540121.

Revised after review (D8, D9): effects return `{ look, state? }` and receive
their own per-attack `state` and the frame `dt`; `CursorLook.decoys` draws up to
four extra cursors; the controller hides the cursor while the pointer is outside
the page and refuses effects longer than 10 s; `cursor-kind.ts` (new) picks a
hand, I-beam or not-allowed shape from the hovered element; a press begun during
an effect is swallowed to its end; drag-start and drop are blocked during
effects; keyboard-made clicks, submits and context menus (`detail === 0`) and
keyboard selection always pass; the provider takes a `seed` and exposes its one
`Random` for the cats.

### Verification

- `npm test` → exit 0, 8 files, **85 passed** (48 new in `tests/unit/xenocats/`).
- Negative controls, each reversed by hand and followed by a green run:
  click-blocking made inert → "blocks clicks while an effect runs" failed;
  press flag made inert → the press-across-the-end test failed; pointer-origin
  check forced true → the keyboard-activation test failed.
- `npm run lint` → exit 0, no output (two react-hooks errors from the first
  draft fixed: ref updated in an effect; test captures the cursor in an effect).
- `npx next typegen && npx tsc --noEmit` → exit 0. `npm run test:e2e` → 3
  passed. Prettier (LF-normalised) clean on all new files; `layout.tsx` was
  already unformatted on the base (D3).
- Not verified in a real browser: the dashboard needs a login and the
  database, so no browser test renders the provider yet (T6's `/cats` page
  will). Cursor alignment, shape switching and leave/blur hiding are checked in
  jsdom and by reading only.
- Reviewer, pass 1: **Request Changes** — (1, medium) the interface could not
  express decoys, delay or bounce; (2) a press begun during an effect could
  still click after it, and drag/drop passed; (3) no cursor hints, stale cursor
  after leaving the page; (4) the random source was not seedable or shared; plus
  the two lint errors. All fixed (D8, D9).
- Reviewer, pass 2: all of those **resolved**; one new medium finding —
  blocking `click`/`contextmenu`/`selectstart` also blocked the keyboard
  (Enter/Space activation, implicit submit, Ctrl+A, Shift+F10), shown with a
  throwaway Chromium probe. Fixed as recommended: keyboard-made events
  (`detail === 0`) pass, `selectstart` no longer blocked, tests added.
- Reviewer, pass 3: keyboard fix **correct — Approve**. One low follow-up
  applied as recommended: `swallow = fromPointer && (swallowPress || blocking)`,
  so a pointer press that never ends in a click can no longer swallow a later
  keyboard activation, and `pointercancel` clears the press flag; two tests
  added. `npm test` 87 passed; lint, typegen + tsc, test:e2e (3) green.

## T5 — Cat engine (`night-2026-09-25-t5-cat-engine`)

- Start: 2026-09-25 17:14, budget 14,748,365 tokens.
- Base SHA: `57a832b` (T4 merged).
- T4 outcome: committed `57a832b`, fast-forwarded, both branches pushed; CI
  poll started (pending).
- **T4 CI outcome: CI passed** — `night-2026-09-25-t4-cursor-engine`
  https://github.com/lazurq-png/next.js-dashboard/actions/runs/36152664201,
  `night-2026-09-25` https://github.com/lazurq-png/next.js-dashboard/actions/runs/36152668905.

### What the code does

- `app/ui/xenocats/config.ts` (new): every cat timing and size in one place —
  max 5 cats, 72 px cats, 8 px margin, 140 px kept clear of the cursor, first
  spawn after 3–7 s, then every 7–16 s, sleep 8–22 s, wake 0.9 s, pounce 0.6 s.
- `app/ui/xenocats/cat-types.ts` (new): the `CatType` roster entry — number,
  name, effect, palette, named entrance/exit with durations — and cats 1–3
  (Void Tabby/vanish, Gravi Coon/heavy, Pulsar Siamese/knockback) with the
  default `fade` entrance and exit.
- `app/ui/xenocats/cat-engine.ts` (new): the pure lifecycle and spawner.
  appearing → sleeping → waking → ready → attacking → leaving → removed, caught
  up through every elapsed phase on each tick. `ready` retries the attack every
  tick until the cursor accepts it (one effect at a time). A summoned cat skips
  sleep and wake. Spawns and summons refuse at 5 cats on screen (any phase),
  and place cats fully on screen, 140 px from the cursor and not on another cat.
- `app/ui/xenocats/cat-sprite.tsx` (new): a parameterised alien-cat SVG in an
  awake pose (antenna, glowing slit eyes, stripes, tail) and a curled sleeping
  pose (closed eyes, drooping antenna, tail wrapped round).
- `app/ui/xenocats/cat-layer.tsx` (new, client): `XenocatCatsProvider` runs the
  engine on the cursor's clock, random source and position in an animation-
  frame loop that re-renders only when something changed; draws cats in an
  `aria-hidden`, `pointer-events: none` layer below the fake cursor; sleeping
  cats show three drifting z's; `useXenocats().summon(typeId)` for the /cats
  page. With no cursor (touch screens) a cat pounces at nothing and leaves.
- `app/ui/global.css`: keyframes for glowing eyes, breathing, drifting z's, the
  waking stretch, the ready wobble, the pounce, and the default fade entrance
  and exit.
- `fake-cursor.tsx` / `cursor-controller.ts`: the cursor API gains `position()`
  and `now()` so the cats share its clock and stay off it.
- `app/dashboard/layout.tsx`: mounts the cats inside the cursor provider.
- Tests (new): engine (the spawner never exceeds 5 while cats wait; a sixth
  summon refused; leaving cats count; the full lifecycle order; sleep length in
  range; summons skip sleep; attack gets the cat's centre; one effect at a time
  — a second cat waits `ready` until the first effect ends; placement rules;
  deterministic by seed; tiny viewport; unknown type), roster, and the layer in
  jsdom (drawn and aria-hidden, max 5, unknown type, a summoned Void Tabby
  really starts `vanish` on the fake cursor, a sleeping cat shows its z's).

### Why it was added

Plan task 5; the goal's cats "drift onto the screen, curl up and sleep, and
every so often one wakes up and attacks the mouse pointer", "never more than 5
cats on screen at once". Timings live in one module as the plan asks; per-type
art and animations come in T7–T9 on top of this roster shape.

### Verification

- `npm test` → exit 0, 11 files, **108 passed** (21 new).
- Negative control: `cats.length >= maxCats` loosened to `>` → the four max-5
  tests failed (spawner, sixth summon, leaving cats, layer); restored from a
  copy of my own file and green again.
- `npm run lint` → exit 0. `npx next typegen && npx tsc --noEmit` → exit 0.
  `npm run test:e2e` → 3 passed. Prettier (LF-normalised) clean on all
  xenocats files and `global.css`.
- Not verified in a real browser: no page shows cats without a login yet (T6's
  /cats will); the animations are checked by reading and jsdom only.
- Reviewer, pass 1: **Approve**, with four low findings, all fixed as
  recommended: (1) a ready cat now *waits* while the pointer is off the page
  (new `isPresent()` on the cursor) instead of starting a click-blocking effect
  nobody sees; (2) the waking and pounce animations take their duration from
  `config.wakeMs` / `config.attackMs`; (3) the overlap check is a box test (the
  old centre-distance rule let squares overlap diagonally — restoring it fails
  the new 60-seed placement test at seed 8); (4) new tests: one-tick catch-up
  over a 100 s gap, two cats against the real cursor (only one attacks), and a
  cat waiting while the pointer is away. `npm test` 111 passed; lint, tsc,
  test:e2e (3), Prettier green.
- Reviewer, pass 2: **Approve** — all four fixes confirmed; its optional note
  applied (the `global.css` comment now says the CSS durations are fallbacks).

## T5 — CI failure, cycle 1 (on `night-2026-09-25-t5-cat-engine`)

- 2026-09-25 17:40. **T5 CI outcome: failure** on both branches —
  https://github.com/lazurq-png/next.js-dashboard/actions/runs/36154302052
  (task branch), .../36154306455 (run branch). `/jobs`: *Lint, type check, unit
  tests* failed at step **Run npm test**; *Build + browser tests (production)*
  and *Browser tests (dev server)* succeeded.
- T6 was in flight: parked with `git stash push -u -- <T6 paths>`. Mistake: the
  T6 reviewer was still running its browser tests and lost its tree mid-run
  (it reported this). Lesson: let an in-flight review finish before parking.
- **Does not reproduce locally.** `CI=true npx vitest run` ×4 → 111/111 each;
  six suites concurrently under CPU load → 111/111 each; no unhandled errors in
  the output; the slowest jsdom test takes 105 ms, far from any timeout. No
  Linux environment here (no WSL distro, no Docker), and CI logs need auth (§3).
- Hypotheses: (H1) a timing-sensitive jsdom test (the new `cat-layer` tests
  drive animation frames) behaves differently on the slower Linux runner;
  (H2) something T5 added is platform-dependent; (H3) the step fails without a
  failing test (an unhandled error after teardown).
- **Cycle 1 action — diagnosis, not a guessed fix:** the checks job now runs the
  unit tests as three named steps that each run even if an earlier one failed —
  *dashboard* (37 tests), *cats, Node* (48), *cats, jsdom* (26); together the
  same 111 as `npm test` (verified locally). The next CI run names the failing
  group through `/jobs` alone. actionlint (with shellcheck, pyflakes) exit 0.
