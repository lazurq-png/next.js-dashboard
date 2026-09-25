# Questions — night-2026-09-25

## Q1 — Git author email is a placeholder

Every commit this run makes is authored as
`Martin Larsson <id+lazurq-png@users.noreply.github.com>`. `id` is not a real
GitHub user id, so GitHub will not link these commits to the account. The run
does not change git config (§3: nothing outside the task's files).

- **Fix for future commits:** `git config user.email "<your numeric id>+lazurq-png@users.noreply.github.com"`
  (GitHub → Settings → Emails shows the exact address).
- **Existing commits** keep the placeholder unless history is rewritten, which
  would need a force-push. Recommendation: fix the config and leave history.

## Q2 — `POSTGRES_URL` is not usable locally

`npm run build` connects to `127.0.0.1:5432`, the `postgres` library's default
when `POSTGRES_URL` is unset, so the local `.env` does not provide a reachable
`POSTGRES_URL`. Consequences: the build is not part of this run's gate, and any
check that renders a database-backed page cannot run locally.

- **Fix:** put the hosted database's connection string in `.env` as
  `POSTGRES_URL=...` (and `AUTH_SECRET`), then `npm run build` should pass.

## Q3 — Upgrade `@types/node` (22.10.7 → ≥22.12)?

Vite 7/8 (and so current Vitest and `@vitejs/plugin-react`) declare an optional
peer `@types/node@"^20.19.0 || >=22.12.0"`. With 22.10.7 pinned, `npm install`
prints `ERESOLVE overriding peer dependency` and `@vitejs/plugin-react` /
`vite-tsconfig-paths` could not be installed at all (D2). Not a blocker: tests
and the type check pass without them.

- **Option A (recommended):** `npm install -D @types/node@^22.12` — types only,
  clears the warning, and allows the Vite plugins later if ever wanted.
- **Option B:** leave it; the warning stays.
