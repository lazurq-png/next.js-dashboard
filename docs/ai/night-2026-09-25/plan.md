# Night run 2026-09-25

## Goal

Xenocat Analytics: a professional invoices-and-customers dashboard that is
haunted by alien cats. The cats are hand-drawn SVG. They drift onto the screen,
curl up and sleep, and every so often one wakes up and attacks the mouse pointer.
Each cat type has its own attack effect and its own way of appearing and
disappearing. There are at least 20 cat types and never more than 5 cats on
screen at once. The dashboard itself still works like a professional tool:
the invoice and customer pages, search, pagination and login keep working. The
project has unit tests, browser tests and CI that prove all of this, and no
security problem known at the start of the run is left open.

## Limits

Deadline: 2026-09-27 07:00

Weekly usage at start: 12% (resets Sunday 08:00). This is information only: the
run cannot see the usage limit, and if it runs out the session just stops.

## Design decisions (made by the human; the run does not revisit them)

- **Fake cursor.** Browsers cannot move, slow or hide the real pointer, so on
  pages with cats the system cursor is hidden (`cursor: none`) and a fake
  cursor is drawn that follows the real pointer exactly. Every effect acts on
  the fake cursor.
- **Clicks are blocked while an effect is active**, so the user never clicks
  somewhere other than where they see the cursor. When the effect ends, the
  fake cursor snaps back to the real pointer and clicks work again. The
  keyboard is never affected.
- **One effect at a time.** A cat that wants to attack while another effect is
  active waits until the active effect ends.
- **Where cats appear:** every page under `/dashboard`, and a public `/cats`
  page. `/cats` lists all cat types, and each has a button that makes it appear
  and attack immediately. This is what the browser tests use, so they need no
  login and no database.
- **No off switch.** Cats are always on, and the OS reduced-motion setting is
  not honoured. Keyboard users and screen readers are unaffected, because cats
  only act on the pointer. The fake cursor and the cats are hidden from
  assistive technology (`aria-hidden`).
- **Name:** Xenocat Analytics.
- **CI uses the real database.** The human adds the repository secret
  `POSTGRES_URL` on GitHub; the run cannot. CI generates its own throwaway
  `AUTH_SECRET` per run, so no secret is needed for that. No test, local or in
  CI, may write to the database.
- **Exploration work (task 11) is merged** like planned work.

## Tasks

1. **Unit tests.** Set up Vitest with an `npm test` script, and test what
   exists: `app/lib/utils.ts` (`formatCurrency`, `formatDateToLocal`,
   `generateYAxis`, `generatePagination`) and the zod schemas in
   `app/lib/actions.ts` (move them to their own module if needed to import them
   without a database connection). From this task on, `npm test` is part of the
   gate.
   *Explicitly lifts §3's dependency, `npm install` and external-service rules
   for this task only*, for these dev dependencies and nothing else: `vitest`,
   `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`,
   `@testing-library/dom`, `vite-tsconfig-paths`.

2. **Browser tests and CI.** Set up Playwright with an `npm run test:e2e` script
   (Chromium only), with a smoke test that the home page and `/login` render.
   Add `.github/workflows/ci.yml`, which on every push and pull request runs
   `npm ci`, lint, type check, `npm test`, `npm run build` and `npm run test:e2e`.
   It reads `POSTGRES_URL` from a repository secret. It does **not** use an
   `AUTH_SECRET` secret: a step generates a random one for each CI run (e.g.
   `openssl rand -base64 32` written to `$GITHUB_ENV`), since it only signs
   sessions inside that run, and sets `AUTH_TRUST_HOST=true` so NextAuth accepts
   the `localhost` host under `next start`. It must
   trigger on pushes to `night-**` branches, because the run polls CI for every
   task it pushes. From this task on, `npm run test:e2e` is part of the gate.
   Update the "no CI" statements in `CLAUDE.md` §9, `.claude/README.md` and
   `.claude/docs/ai-workflow.md` to describe the workflow. Record in
   `questions.md` that the human must add the `POSTGRES_URL` secret.
   *Explicitly lifts §3's dependency, `npm install`, external-service and
   installing-software rules for this task only*, for `@playwright/test` and
   `npx playwright install chromium`, and nothing else.

3. **Security baseline.** Delete `app/seed/route.ts` and `app/query/route.ts`
   (*explicitly lifts §3's "deleting a file you did not create" rule for these
   two files only*). Every Server Action in `app/lib/actions.ts` that changes
   data refuses to act without a session (`auth()`). No route or action returns
   a raw error object to the client. Unit tests cover the session refusal
   without touching the database.

4. **Cursor engine.** A client-side fake-cursor layer: hides the system cursor
   on pages with cats, draws the fake cursor, blocks clicks while an effect is
   active, and snaps back afterwards. Effects are pure, unit-tested functions
   `(real position, time, cat position, params) → fake position / visibility /
   scale / blur`, so that each cat type only needs to supply its own. Build the
   first three here and test them: **vanish**, **heavy** and **knockback**
   (cats 1–3 below). All randomness goes through one seedable random source, so
   tests are deterministic.

5. **Cat engine.** The cat lifecycle: appear (per-type entrance) → sleep (an
   idle sleeping animation every cat has: slow breathing plus drifting "z"s)
   → wake → attack (per-type effect) → disappear (per-type exit). A spawner
   places cats at random positions that do not cover the fake cursor, at random
   intervals, and never allows more than 5 on screen. All timings live in one
   config module. Mount it in the dashboard layout. Unit tests prove the
   max-5 rule, the lifecycle order, and one-effect-at-a-time.

6. **The `/cats` page.** Public, and reachable when logged in too:
   `auth.config.ts` currently redirects logged-in users away from every
   non-dashboard page, so change it for `/cats` only. It lists every cat type
   with its name, a thumbnail of its SVG, and a one-line description of its
   attack. A "Summon" button per cat makes it appear and attack at once. Stable
   `data-testid`s on cats, the fake cursor and the buttons. An e2e test summons
   cats 1–3 and checks their effects on the fake cursor.

7. **Cats 1–7** from the roster below: SVG, sleeping pose, attack effect,
   entrance and exit, each with a unit test for its effect and an e2e test on
   `/cats`.

8. **Cats 8–14**, same as task 7.

9. **Cats 15–20**, same as task 7. At the end, an e2e test proves that all 20
   appear on `/cats` and that summoning a sixth cat while 5 are on screen does
   not exceed 5.

10. **Xenocat Analytics branding.** Replace the Acme name and logo everywhere
    (`app/ui/acme-logo.tsx`, the metadata in `app/layout.tsx`,
    `app/ui/dashboard/sidenav.tsx`, `app/login/page.tsx`, `app/page.tsx`) with "Xenocat Analytics" and an SVG alien-cat logo. It should
    look professional and restrained: the dashboard's colours, spacing and
    layout stay consistent, and the cats are the only playful element. Keep
    every `data-testid`, role and heading the tests rely on.

11. **Exploration, until the deadline.** When tasks 1–10 are done, parked or
    abandoned, keep improving the project toward the goal until `D` − 30 min.
    *Explicitly lifts §6's "do not invent work" and §1.0's "work no task names
    is not built" for this task only.* Rules:
    - Each item is its own task (`night-2026-09-25-t11-<n>-<slug>`) through the
      whole of §2: tests, gate, reviewer, commit, merge, push. Exploration work
      is merged like planned work.
    - Before starting an item, write in `progress.md` what it is, which kind it
      is (new feature, tests, security, code quality) and how it serves the
      goal.
    - Rotate between the four kinds, so none is starved. A security problem
      found at any point jumps the queue.
    - New features stay inside the goal: more cat types, cat behaviour,
      polish of the dashboard. Nothing that needs a new dependency, a database
      write or a schema change; those go to `questions.md` instead.
    - None of §3's rules are lifted for this task.

## Cat roster

Durations and distances are starting values; tune them in the config module
and record changes in `decisions.md`.

| # | Cat | Attack effect on the fake cursor | Appears | Disappears |
| - | --- | -------------------------------- | ------- | ---------- |
| 1 | Void Tabby | **Vanish**: invisible for 3 s | a black hole opens and it steps out | collapses into a point |
| 2 | Gravi Coon | **Heavy**: moves at 30 % of real speed for 5 s | drops from the top with a thud | sinks through the floor |
| 3 | Pulsar Siamese | **Knockback**: flung 300 px directly away from the cat | a pulse ring expands | pulses out |
| 4 | Mirror Sphynx | **Reverse**: both axes inverted for 4 s | steps out of a mirror shard | shatters |
| 5 | Static Calico | **Jitter**: shakes ±15 px for 4 s | TV-static flicker in | flicker out |
| 6 | Cryo Persian | **Freeze**: stuck in place for 2.5 s, iced over | an ice crystal grows | melts |
| 7 | Nebula Ragdoll | **Drift**: pushed steadily in one direction for 5 s | condenses from a gas cloud | dissipates |
| 8 | Quantum Kitten | **Teleport**: jumps to a random spot three times | blinks in at several spots | blinks out |
| 9 | Magneto Bengal | **Magnet**: pulled toward the cat for 4 s | slides in along a screen edge | slides off |
| 10 | Orbit Abyssinian | **Orbit**: circles the cat for 3 s | spirals in | spirals out |
| 11 | Decoy Burmese | **Decoys**: four identical fake cursors for 5 s | splits from its own shadow | merges back into it |
| 12 | Wobble Fold | **Drunk**: sinusoidal wobble for 5 s | tumbles in | rolls away |
| 13 | Munchkin Mite | **Tiny**: cursor at 25 % size for 6 s | grows from a dot | shrinks to nothing |
| 14 | Titan Forest Cat | **Giant**: cursor at 400 % size for 5 s | stomps in (screen shake) | stomps out |
| 15 | Lag Ragamuffin | **Delay**: follows the real pointer 800 ms late for 5 s | fades in in slow motion | slow fade |
| 16 | Gravity Manx | **Fall**: sinks toward the bottom edge unless moved up, 4 s | lowered on a UFO beam | beamed up |
| 17 | Smoke Bombay | **Blur**: blurred and half-transparent for 5 s | materialises from smoke | poof of smoke |
| 18 | Hypno Rex | **Spiral**: spirals in to the screen centre for 4 s | eyes appear first, then the body | body fades, eyes last |
| 19 | Pinball Devon | **Bounce**: keeps momentum and bounces off the edges for 4 s | bounces in | bounces off |
| 20 | Laser Ocicat | **Axis lock**: moves only horizontally or only vertically for 5 s | slides in along a laser line | slides off along it |
