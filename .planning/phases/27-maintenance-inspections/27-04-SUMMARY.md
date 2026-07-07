# 27-04 Summary — MAINT-08 (expense description)

**Requirement:** MAINT-08 — the add-expense dialog collected a Description that was silently discarded (no column, not in the insert payload).

**What changed:**
- **Migration `20260707031720_add_expenses_description.sql`** — adds a nullable `description text` column to `public.expenses` (additive, backward-compatible; table-level owner-scoped RLS inherits it). Applied to prod via Supabase MCP (CLI `db:types`/deploy 401s), reconciled to the prod-assigned timestamp, proven with a rolled-back insert (`description` round-trips).
- **`src/types/supabase.ts`** — regenerated the `expenses` Row/Insert/Update to include `description` (via MCP `generate_typescript_types`, since `bun run db:types` 401s; applied as a surgical 3-line edit matching the generator output byte-for-byte rather than reformatting the whole file). `ExpenseRecord = Tables<"expenses">` picks it up automatically.
- **`add-expense-dialog.tsx`** — the insert payload now includes `description: description || null`.
- **`maintenance-details.client.tsx`** — the expenses `.select(...)` column list now includes `description` so fetched rows carry it.
- **`expenses-card.tsx`** — renders `expense.description` (muted line under the vendor) when present.

**Verified:** `bun run typecheck` exit 0, `bun run lint` exit 0. Rolled-back prod insert with a description returned it intact. RLS unchanged (table-level).

**Residual:** none. (Behavioral browser walkthrough folded into 27-07.)
