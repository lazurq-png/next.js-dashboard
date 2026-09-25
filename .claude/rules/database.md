# Database Engineering Rules

Open this for schema, migration, and persistence work. Database changes are high-risk changes — treat existing data as valuable production state.

---

## This Repository

- **One database, and it is the real one.** `POSTGRES_URL` in `.env` points at a
  hosted PostgreSQL. There is no local, test or staging copy, so every write
  during development is a write to the project's data.
- **No migration system.** The schema exists only as `CREATE TABLE IF NOT EXISTS`
  statements in `app/seed/route.ts`, which also inserts the placeholder data.
  `IF NOT EXISTS` means editing those statements changes nothing in a database
  that already has the table: a schema change needs its own `ALTER` statement,
  run deliberately by a human.
- **Access is raw SQL** through the `postgres` library's tagged templates, in
  `app/lib/data.ts` (reads), `app/lib/actions.ts` (writes) and `auth.ts`. The
  template interpolation parameterises values. Never build a query with string
  concatenation or `sql.unsafe`.
- **Money is stored in cents** as integers. Convert at the edges only
  (`actions.ts` on the way in, `formatCurrency` on the way out).

---

## Schema Changes

Before modifying schema:

- inspect current schema
- inspect existing migrations
- inspect relevant queries
- inspect application assumptions
- identify constraints
- identify indexes
- identify existing data implications

Do not assume development data represents production.

---

## Migrations

Follow the repository's established migration system.

A migration should consider:

- existing rows
- nullability
- defaults
- indexes
- uniqueness
- foreign keys
- data conversion
- rollback
- deployment order
- application compatibility

Avoid migrations that require the application to stop functioning during deployment unless that is explicitly intended.

---

## Expand-and-Contract

For risky production changes, prefer compatible migration phases when appropriate:

```text
expand
  ↓
deploy compatible application
  ↓
backfill/migrate
  ↓
switch reads/writes
  ↓
contract
```

Do not immediately remove old columns or fields if old application versions may still depend on them.

---

## Data Integrity

Preserve invariants.

Consider:

- uniqueness
- foreign keys
- check constraints
- required values
- ownership
- tenant boundaries
- deletion behavior

Prefer database-level guarantees where appropriate.

---

## Queries

Use existing data-access abstractions.

Consider:

- N+1 queries
- unbounded result sets
- pagination
- indexes
- filtering
- sorting
- transaction boundaries

Do not load an entire large table when a bounded query is appropriate.

---

## Production Safety

Never:

- hard-code production credentials
- directly mutate production data during ordinary development
- delete production data to make tests pass
- assume production is disposable

Use approved tooling and processes for production operations.

---

## Backfills

For large datasets, consider:

- batching
- resumability
- locking
- load
- observability
- partial failure
- idempotency

Do not write a one-shot migration that assumes a tiny dataset unless that assumption is guaranteed.

---

## Verification

After database changes:

- run migration tests where available
- test relevant queries
- verify schema generation
- verify application compatibility
- inspect generated artifacts
- test important rollback/forward paths when practical
