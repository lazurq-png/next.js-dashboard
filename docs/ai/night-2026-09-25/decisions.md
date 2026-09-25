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
