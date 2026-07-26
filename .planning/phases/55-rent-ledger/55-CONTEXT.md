# Phase 55: Rent Ledger - Context

**Gathered:** 2026-07-24
**Status:** Ready for planning

<domain>
## Phase Boundary

A record-keeping rent ledger (bookkeeping ONLY — zero payment facilitation, zero money-boundary regressions): expected charges auto-generated from lease terms, owner-recorded receipts allocated per-charge, per-lease running balance + late flags, "track since" onboarding, append-only with reversal-entry corrections, and a single honest revenue definition (scheduled vs collected) that restores the collection-rate KPI. Requirements: LEDGER-01..08.

**In scope:** `rent_charges` (pg_cron monthly auto-generation, numeric(10,2) dollars), `rent_receipts` (owner-recorded, per-charge allocation, partials), manual charge/credit lines, per-lease running balance + late detection, "track since" + opening-balance onboarding, append-only + reversal entries, revenue relabel (scheduled/collected) + collection-rate KPI.

**Out of scope (locked OUT — do not build):**
- ANY payment rail / facilitation (ACH, autopay, cards, Stripe Connect) — demolished April 2026, stays demolished. Receipts are a `method` LABEL only (text), never a transaction.
- Auto-late-fee rules — late fees are MANUAL charge lines only (LEDGER-05); no statutory-cap logic.
- History backfill — onboarding is "track since" date + opening balance, never reconstructed history.
- Tenant-facing anything (tenants are records, not users).
- The legacy `rent_due` table (base_schema, from the demolished rent-facilitation era) — do NOT reuse or revive it; the ledger is net-new tables.
</domain>

<decisions>
## Implementation Decisions

### Money boundary (LOCKED — the load-bearing correctness constraint)
- **D-00:** `leases.rent_amount` is an **integer (dollars)** in prod (NOT numeric, NOT cents — verified; this is the column that caused the MONEY-01/02 100× bugs via `rent_amount * 100`). `rent_charges.amount` (and all ledger amounts) are `numeric(10,2)` **dollars**. The integer→numeric conversion happens **exactly once**, at charge generation (`amount := leases.rent_amount::numeric(10,2)` — NO `* 100`, NO cents anywhere). Every read/display path formats the numeric dollars directly. Any `* 100` in this phase is a bug.

### Charge generation (LEDGER-01)
- **D-01:** Charges are **calendar-month**, one per active lease per month, `period_start` = the 1st of the month, `due_date` = the 1st (leases have no rent-due-day column; do NOT add one for v10). `UNIQUE(lease_id, period_start)` for idempotency (pg_cron re-runs are no-ops). Generation only for leases active in that period AND on/after the lease's "track since" date (D-05). Mirror the existing named-SECURITY-DEFINER pg_cron pattern (`queue_lease_reminders` / `20260224091106_payment_reminders_cron.sql`), `SET search_path = public`, `FOR UPDATE SKIP LOCKED` not needed for insert-only but use ON CONFLICT DO NOTHING for the UNIQUE.

### Receipt → charge allocation model (LEDGER-02/03 — user's NON-default, precise choice)
- **D-02:** **Per-charge allocation** (NOT lease-aggregate). A `rent_receipts` row is recorded **against a specific charge** (owner-selected charge at entry time — matches LEDGER-02 "against a charge"). Fields: date, amount (numeric dollars), `method` text LABEL only, `charge_id` FK. **Partial payments = multiple/partial receipts against one charge** (each a discrete entry, LEDGER-02). A charge's paid/partial/unpaid state is DERIVED: `Σ(receipts.amount for that charge)` vs `charge.amount` → paid (≥), partial (0<Σ<amount), unpaid (Σ=0). The per-lease running balance (LEDGER-03) is still `Σ charges − Σ receipts − Σ credits` at the lease level for the summary/KPI.
- **D-02a (discretion for planner):** whether to also offer an auto-FIFO convenience (apply a receipt to the oldest unpaid charge automatically) is Claude's discretion; the load-bearing model is owner-specified `charge_id` per receipt. Keep the allocation explicit and reversible.

### Late detection (LEDGER-03 — user chose a grace period)
- **D-03:** A charge is flagged **late** when it has an unpaid remaining balance AND `due_date + 5 days < current_date` (fixed **5-day grace**, v10). i.e. `remaining > 0 AND now() > due_date + interval '5 days'`. Grace is a fixed 5 days (the user endorsed the "e.g. 5 days" example) — a single constant, NOT a per-lease/per-owner config knob in v10 (revisit if owners ask). Late is a DERIVED flag (computed in the balance/summary RPC), never a stored mutable status.

### Manual lines (LEDGER-05)
- **D-05a:** Owner can add manual **charge** lines (late fee, "other") and **credit** lines — MANUAL only, no auto rules. Model as `rent_charges` rows with a `type` (text+CHECK: `rent` | `late_fee` | `manual_charge` | `credit` | `opening`) so charges and credits share the append-only ledger and the balance math. Credits are negative-effect entries (reduce balance).

### Append-only + reversals (LEDGER-06)
- **D-06:** All ledger rows (charges, receipts, credits) are **append-only** — no UPDATE/DELETE of amounts by the owner. Corrections are **reversal entries**: a new row that references the original (`reverses_id` FK) and negates its effect. Enforce via RLS (owner gets INSERT + SELECT only; no UPDATE/DELETE policy on the amount-bearing tables) + a trigger or column-privilege guard so amounts are immutable after insert. The balance/summary nets reversed pairs to zero.

### Onboarding (LEDGER-04)
- **D-04:** Per-lease **"track since" date + opening balance** (Stessa pattern — NO history backfill). Store `ledger_start_date` + record the opening balance as a single `type='opening'` charge (or credit if negative) dated at track-since. Charge generation (D-01) only produces charges for periods on/after `ledger_start_date`. A lease with no ledger onboarding shows no ledger until the owner sets track-since.

### Revenue definition + KPI (LEDGER-07/08)
- **D-07:** **Single revenue definition, no double-counting.** The existing lease-derived revenue figures (`get_revenue_trends_optimized`, `revenue_stats_type`, `get_financial_overview`, `get_dashboard_stats` revenue fields) are relabeled **"Scheduled"** (expected rent from lease terms). A NEW **"Collected"** figure comes from ledger receipts. Both surface with explicit labels so no number silently changes meaning. Nothing sums scheduled+collected.
- **D-08:** The **collection-rate KPI** returns to the dashboard = `collected ÷ scheduled` for the current month (from ledger actuals). It was dropped in v2.0 for lack of honest data (LEDGER-08); the ledger now provides it. Owners with no ledger data yet see collected=0 / rate 0% honestly (not a fabricated number).

### Claude's Discretion
- Exact table/column shapes (`rent_charges`, `rent_receipts`, whether a unified `ledger_entries` view over both); the reversal-immutability enforcement mechanism (RLS + trigger vs column privileges — mirror the Phase 54 `guard_user_self_update` allowlist discipline / append-only `esign_events` pattern); the balance/summary RPC shape (single RPC returning per-lease {charges, receipts, credits, balance, late_count} + the collection-rate); cron slot (avoid the 3 AM cleanup cluster + the 06:00/06:30 reminder slots); the auto-FIFO convenience (D-02a).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` §"Phase 55: Rent Ledger" — goal, 5 success criteria (esp. the "convert the integer boundary exactly once" + "single revenue definition" clauses).
- `.planning/REQUIREMENTS.md` — LEDGER-01..08 exact wording (lines ~72-79); the "Auto-late-fee rules" + "Rent payment facilitation" OUT-OF-SCOPE rows (~lines 141-145).

### Money boundary (the correctness core — verify against live DB, do NOT trust the stale schema dump)
- `src/types/supabase.ts` — `leases.rent_amount` (integer dollars in prod). Confirm the exact type via MCP before writing the conversion.
- The MONEY-01/02 fix history (v8.0 audit remediation, PR #893) — the `rent_amount * 100` → 100× overstatement class this phase must NOT reintroduce. `formatCurrency` is the display helper; amounts are dollars end-to-end.
- All `amount` columns store **dollars** as `numeric(10,2)` (CLAUDE.md Database rules) — cents only at a Stripe boundary, and there is NO Stripe boundary in this phase.

### pg_cron analogs (mirror these for charge generation)
- `supabase/migrations/20260224091106_payment_reminders_cron.sql` + `20260222120000_phase56_pg_cron_jobs.sql` — named SECURITY DEFINER cron fns, `SET search_path=public`, idempotent `cron.schedule()`, the queue-generation shape.
- `supabase/migrations/20260722005310_lease_reminders_delivery_state.sql` — append-only table + service_role-only RPC + RLS discipline to mirror for the ledger tables.

### Existing revenue analytics to reconcile (LEDGER-07/08)
- The revenue RPCs in `src/types/supabase.ts`: `get_revenue_trends_optimized`, `revenue_stats_type`, `get_financial_overview`, `get_dashboard_stats` (revenue fields) — these currently compute lease-derived "revenue"; they get relabeled "scheduled" + a new "collected" is added. Migrations: `20260708131721`, `20260708132045`, `20260709000354/044800/050956/060533` (the recent numeric/status revenue work).
- Dashboard KPI surfaces (where the collection-rate KPI lands) — Phase 52 dashboard + `ownerDashboardKeys`.

### DO-NOT-REUSE
- `public.rent_due` (base_schema `20251101000000`, status pending/paid/overdue/waived) — LEGACY from the demolished rent-facilitation era. Do NOT reuse/revive; the ledger is net-new. Verify via MCP whether it still exists post-demolition (`20260418183608`, `20260530015823`) and leave it alone regardless.

### Money-boundary demolition guardrails
- `20260418183608_demolish_rent_and_tenant_portal.sql`, `20260530015823_finish_rent_payment_demolition.sql` — the demolition this phase must not regress. No ACH/autopay/cards; receipts are labels.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Named SECURITY DEFINER pg_cron pattern + idempotent `cron.schedule()` (payment_reminders_cron / phase56_pg_cron_jobs) — the charge-generation cron template.
- Append-only table + RLS + service_role-only RPC (`lease_reminders` / `esign_events`) — the ledger tables' template (append-only, owner SELECT, no UPDATE/DELETE policy).
- `formatCurrency` + the dollars-numeric money conventions — display path (no cents).
- Phase 52 dashboard + `ownerDashboardKeys` + `queryOptions()` factories — where the collection-rate KPI + ledger views hook in; mutations invalidate related keys + `ownerDashboardKeys.all`.
- Existing revenue RPCs (get_revenue_trends_optimized etc.) — extend/relabel, don't duplicate.

### Established Patterns
- Migrations via MCP `apply_migration` + `list_migrations` reconcile (NOT `supabase db push`); text+CHECK not PG enums; `owner_user_id` canonical owner column; `(select auth.uid())` subselect; one policy per op per role; RLS on every table.
- Query keys = `queryOptions()` factories; typed mapper at every RPC/PostgREST boundary (no `as unknown as`, no `any`); no barrel files; Lucide icons; no inline styles.

### Integration Points
- New: `rent_charges` + `rent_receipts` (+ reversal/opening/manual via the `type` column), the charge-generation pg_cron, the balance/summary RPC (per-lease {charges, receipts, credits, balance, late_count} + collection-rate), the ledger UI (per-lease ledger view + record-receipt/add-line forms), the collection-rate dashboard KPI, the scheduled/collected relabel on revenue surfaces.
- Reads from: `leases` (rent_amount, dates, status), the revenue RPCs.
- Money boundary: convert `leases.rent_amount` integer→numeric(10,2) exactly once at generation.
</code_context>

<specifics>
## Specific Ideas
- Stessa-style ledger: "track since" + opening balance, per-charge receipts, running balance, manual late-fee lines. No facilitation.
- Honest revenue: scheduled (from leases) vs collected (from ledger) must NEVER be conflated or summed; the collection-rate returns only because the ledger finally provides honest "collected" data.
- Money correctness is paramount — this phase touches the exact `rent_amount` boundary that produced 100× bugs; convert once, dollars throughout, verify with real values via MCP.
</specifics>

<deferred>
## Deferred Ideas
- Auto-late-fee rules (statutory-cap/dispute risk) — manual lines only in v10.
- Per-lease/per-owner configurable grace period — fixed 5 days in v10; revisit if owners ask.
- Lease-anchored (non-calendar) rent due days — calendar-month in v10 (no due-day column).
- Auto-FIFO receipt allocation as the default — owner-specified per-charge in v10 (FIFO convenience is optional/discretion).
- History backfill / reconstructed ledgers — never (track-since only).

### Reviewed Todos (not folded)
None — discussion stayed within phase scope.
</deferred>

---

*Phase: 55-Rent Ledger*
*Context gathered: 2026-07-24*
