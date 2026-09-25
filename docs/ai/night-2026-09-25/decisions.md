# Decisions — night-2026-09-25

## D1 — Type check runs `next typegen` first, not in parallel with the build

`tsconfig.json` includes `.next/types/**/*.ts`, which `next build` (and
`next typegen`) write. At baseline, `tsc` read a stale `.next/types/validator.ts`
that still referenced routes deleted on `main`, and failed; the concurrently
running build was rewriting the same files. So the two are not independent, as
SKILL.md §1.5 assumes. The gate runs `npx next typegen && npx tsc --noEmit`
(typegen takes ~2 s and needs no database), which regenerates the route types
from the current `app/` tree before checking. The build is out of the gate
anyway (progress.md, Baseline).

## D2 — Vitest 4.1.11, jsdom and Testing Library only; no Vite plugins (T1)

The plan allowed `vitest`, `@vitejs/plugin-react`, `jsdom`,
`@testing-library/react`, `@testing-library/dom` and `vite-tsconfig-paths`.
Installing all six at latest failed with ERESOLVE: Vite 7 and 8 declare an
optional peer `@types/node@"^20.19.0 || >=22.12.0"`, and this project pins
`@types/node@22.10.7`. Upgrading `@types/node` is not in the allowed list (Q3).

- `@vitejs/plugin-react` and `vite-tsconfig-paths` both peer on Vite and pulled
  in Vite 8, so they were dropped. Neither is needed: Vitest transforms JSX
  itself, and the `@/` alias is one `resolve.alias` line in `vitest.config.mts`.
- Vitest 3.1.4 (Vite 6) resolved cleanly but `npm audit` then reported one
  critical and one moderate advisory; 3.2.7 cleared the critical but kept the
  moderate `@vitest/mocker` path-traversal advisory (GHSA-82fw-gwwq-j7x9,
  fixed only in 4.1.11).
- **Chosen: `vitest@~4.1.11`**, `jsdom@^30.1.1`, `@testing-library/react@^16.3.3`,
  `@testing-library/dom@^10.4.2`. `npm audit`: 0 vulnerabilities. npm prints
  `ERESOLVE overriding peer dependency` for Vite 8's *optional* `@types/node`
  peer; that peer only affects Vite's own type declarations, and
  `next typegen && tsc --noEmit` passes. `react`, `react-dom` and `next` did
  not move (19.2.8 / 19.2.8 / 16.3.6).

## D3 — Formatting check normalises line endings; pre-existing unformatted files are not reformatted (T1)

`core.autocrlf=true` (system gitconfig) checks files out with CRLF, while
`.prettierrc` says `endOfLine: lf`, so `prettier --check` fails on every
checked-out file that is otherwise correctly formatted (`app/lib/actions.ts`,
`package.json`: whole-file diffs, but formatted at `HEAD`). Git converts back to
LF on commit. The gate therefore checks the LF-normalised content:
`tr -d '\r' < f | npx prettier --check --stdin-filepath f`.

`tsconfig.json` was already not Prettier-formatted on the base; reformatting it
would be a drive-by change (AGENTS.md §5), so a task that edits it keeps its own
lines consistent and leaves the rest.

`vitest.config` is `.mts` (plain `.ts` made Vite warn that ESM syntax was loaded
as CommonJS); `"**/*.mts"` was added to `tsconfig.json`'s `include` so the type
check still covers it.

## D4 — Browser tests run against `next dev` on port 3100; CI is three jobs (T2)

The plan's CI note mentions `next start`, which needs `next build`, and the build
prerenders `/dashboard` from the database. Locally the database is unreachable
(Q2), and in CI it depends on a secret the human may not have set yet (Q4). Tying
the browser tests to the build would mean no browser test runs anywhere until
both are fixed. So Playwright's `webServer` is `next dev --turbopack -p 3100`:
no build needed, and the pages under test read no database (plan: "browser tests
... need no login and no database"). Port 3100 avoids reusing a developer's own
`npm run dev` on 3000.

CI is split into three jobs so a missing `POSTGRES_URL` fails only *build*, and
the poll can tell an environment failure from a code failure by job name
(SKILL.md §2 step 6): *checks* (lint, `next typegen && tsc`, `npm test`),
*build* ("Build + browser tests (production)": `npm run build` with the
`POSTGRES_URL` secret scoped to that step alone, then the browser tests against
`next start` via `E2E_SERVER=start`), and *e2e* ("Browser tests (dev server)").
Every command the plan lists runs on every push, and the plan's `next start` is
tested wherever the build succeeds; the dev-server job keeps browser tests
running while the secret is missing. (Reviewer finding 1 asked for exactly this
as option (b); finding 2 asked for the step-scoped secret.) Each job that starts Next generates its own masked throwaway
`AUTH_SECRET` and sets `AUTH_TRUST_HOST=true`; locally, `playwright.config.ts`
does the same for its test server. Node 24 in CI satisfies jsdom 30's engines
(reviewer note on T1).

## D5 — The Next.js agent-rules block in `AGENTS.md` is committed (T2)

Running `next dev` (the e2e server) appended a `nextjs-agent-rules` block to
`AGENTS.md`. Verified in `node_modules/next/dist/server/lib/generate-agent-files.js`
and `app-info-log.js` (`ensureAgentRulesForDev`): Next 16 writes it whenever it
detects an AI agent, and rewrites it if removed. It tells agents to read the
Next.js docs bundled in `node_modules/next/dist/docs/` because this version
differs from their training data — sound advice this run will follow. Committing
it keeps the tree stable across e2e runs; `agentRules: false` in `next.config`
would switch it off (Q6).

## D6 — `next-env.d.ts` is restored before each commit, not committed (T2)

`next dev` rewrites `next-env.d.ts` to import `.next/dev/types/...`; `next build`
and `next typegen` write the `.next/types/...` variant. It is listed in
`.gitignore` but still tracked, so every e2e run leaves it modified. It is not
part of any task's change, so the run restores it (`git restore -- next-env.d.ts`)
before committing. Untracking it is a deletion from the repository, which §3
reserves for a human (Q5).

## D7 — Session checks: returned message for form actions, thrown error for delete (T3)

Next 16's bundled docs (`data-security.md`, `forms.md`, `07-mutating-data.md`)
say to verify authentication inside every Server Function, since they are
reachable by direct POST. `createInvoice` and `updateInvoice` are `useActionState`
form actions whose `State.message` the forms already display, so they *return*
"You must be logged in to … an invoice." — the form shows it instead of an error
page. `deleteInvoice` returns nothing and is called from a plain form action, so
it *throws* `Unauthorized`, as the docs' own example does; the dashboard's
`error.tsx` boundary catches it. The check runs before validation, so a caller
without a session learns nothing about the form. `authenticate` (the login
action) deliberately has no check.

Authorization beyond "signed in" does not apply: invoices have no owner column,
and every account is an administrator of one shared ledger. Per-user ownership
would be a schema change (§3) and a product decision.

`deleteInvoice` previously let a database error propagate unwrapped; it now logs
it with `console.error` (as `app/lib/data.ts` does) and throws a generic
"Database Error: Failed to Delete Invoice.". No route handlers remain
(`app/seed/route.ts` and `app/query/route.ts` were deleted on `main` before the
run), so nothing else can return a raw error object.

## D8 — Effects carry their own per-attack state, a frame `dt`, and optional decoys (T4)

The first interface (`step(input) → CursorLook`, with only the previous look
carried) could not express three roster effects: **decoys** (four cursors),
**delay** (800 ms behind: needs a history of real positions) and **bounce**
(momentum: needs velocity and frame time). Reviewer finding, fixed in T4 rather
than rediscovered in T7–T9: `Effect<S>.step(input) → { look, state? }`, with
`input.state` (the effect's own value from its previous frame, `undefined` on
the first, reset per attack) and `input.dt`; `CursorLook.decoys` draws up to
`MAX_DECOYS` (4) identical extra cursors. Per-frame randomness (jitter,
teleport) seeds `createRandom` from the attack's `roll` and keeps the generator
position in `state`, so effects stay pure and deterministic.

## D9 — The fake cursor keeps the platform's hints and never outstays the pointer (T4)

Hiding the system cursor is the human's decision; the fake cursor's fidelity is
not. It shows a hand over links and controls, an I-beam over text fields and
"not allowed" over disabled controls (`cursor-kind.ts`), hides when the pointer
leaves the window or the window loses focus, and swallows a whole press that
began during an effect even if released after it (otherwise the browser
dispatches `click` on release). Drag-start, drop and select-start are blocked
during effects too. An effect longer than 10 s (`MAX_EFFECT_MS`) is refused,
since clicks are blocked for its whole duration. Known gap: a native `<select>`
popup may not report the pointer leaving, so the arrow can linger at its edge
while the popup is open.

## D1 amendment — `.next/dev/types` can also go stale (T5 CI cycle 2)

`tsconfig.json` also includes `.next/dev/types/**/*.ts`, which only `next dev`
writes (the e2e server) and `next typegen` does not refresh. After an e2e run on
another branch it can reference routes this branch lacks. When `tsc` reports a
missing module under `.next/dev/types`, remove that directory (build output the
run itself created) and re-run the type check.
## D10 — /cats only summons; the dashboard auto-spawns (T6)

The plan puts cats on every dashboard page and on a public /cats page whose
per-type Summon buttons the browser tests use. On /cats the cats provider runs
with `autoSpawn={false}`: cats come only when summoned. A random cat pouncing
mid-test would block the very clicks the tests make, and a gallery that attacks
while you read it is hard to browse; the dashboard keeps the full haunting. If
the human wants ambient cats on /cats too, it is one prop.

## D11 — The system cursor is hidden on the first pointer move, not on load (T6)

Found by the first real-browser test: the provider hid the system cursor as soon
as it enabled (after hydration), but the fake cursor cannot be drawn until the
pointer's position is known, so until the first mouse move there was no cursor
on screen at all. The class that hides it is now added on the first
`pointermove`. The browser tests nudge the mouse until the page has taken over.
