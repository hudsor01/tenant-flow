# Phase 55: Rent Ledger - Research

**Researched:** 2026-07-24
**Domain:** Postgres append-only financial ledger (Supabase PostgREST + RPCs + pg_cron), money-boundary correctness, revenue-analytics reconciliation
**Confidence:** HIGH (money boundary, table/RPC shapes, cron slots, revenue integration all verified against live migration DDL + generated types; a few planner decisions flagged)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-00 (money boundary — load-bearing):** `leases.rent_amount` is an **integer (dollars)** in prod. `rent_charges.amount` and all ledger amounts are `numeric(10,2)` **dollars**. The integer→numeric conversion happens **exactly once**, at charge generation (`amount := leases.rent_amount::numeric(10,2)` — NO `* 100`, NO cents anywhere). Any `* 100` in this phase is a bug.
- **D-01 (charge generation):** Charges are **calendar-month**, one per active lease per month, `period_start` = 1st of the month, `due_date` = the 1st. `UNIQUE(lease_id, period_start)` idempotency (re-runs are no-ops). Generate only for leases active in the period AND on/after the lease's "track since" date (D-05/D-04). Mirror the named-SECURITY-DEFINER pg_cron pattern, `SET search_path = public`, `ON CONFLICT DO NOTHING`.
- **D-02 (receipt→charge allocation — NON-default precise choice):** **Per-charge allocation.** A `rent_receipts` row is recorded against a specific charge (owner-selected `charge_id`). Fields: date, amount (numeric dollars), `method` text LABEL only, `charge_id` FK. **Partial payments = multiple/partial receipts against one charge** (each a discrete entry). A charge's paid/partial/unpaid state is DERIVED: `Σ(receipts.amount for that charge)` vs `charge.amount`. Per-lease running balance is `Σ charges − Σ receipts − Σ credits` at lease level.
- **D-02a (planner discretion):** auto-FIFO convenience (apply receipt to oldest unpaid charge automatically) is Claude's discretion; the load-bearing model is owner-specified `charge_id` per receipt.
- **D-03 (late detection):** A charge is flagged **late** when it has unpaid remaining balance AND `due_date + 5 days < current_date` (fixed **5-day grace**, single constant, NOT a config knob in v10). Late is a DERIVED flag (computed in the balance/summary RPC), never a stored mutable status.
- **D-05a (manual lines):** Owner can add manual **charge** lines (late fee, "other") and **credit** lines — MANUAL only, no auto rules. Model as `rent_charges` rows with `type` (text+CHECK: `rent` | `late_fee` | `manual_charge` | `credit` | `opening`). Credits reduce balance.
- **D-06 (append-only + reversals):** All ledger rows are **append-only** — no UPDATE/DELETE of amounts by the owner. Corrections are **reversal entries**: a new row referencing the original (`reverses_id` FK) that negates its effect. Enforce via RLS (owner INSERT + SELECT only; no UPDATE/DELETE policy) + a trigger/column-privilege guard so amounts are immutable after insert. Balance nets reversed pairs to zero.
- **D-04 (onboarding):** Per-lease **"track since" date + opening balance** (Stessa pattern — NO history backfill). Store `ledger_start_date` + record opening balance as a single `type='opening'` charge dated at track-since. Generation only produces charges for periods on/after `ledger_start_date`. A lease with no ledger onboarding shows no ledger until the owner sets track-since.
- **D-07 (revenue definition):** **Single revenue definition, no double-counting.** Existing lease-derived revenue (`get_revenue_trends_optimized`, `revenue_stats_type`, `get_financial_overview`, `get_dashboard_stats` revenue fields) is relabeled **"Scheduled"**. A NEW **"Collected"** figure comes from ledger receipts. Both surface with explicit labels. Nothing sums scheduled+collected.
- **D-08 (collection-rate KPI):** Returns to the dashboard = `collected ÷ scheduled` for the current month (from ledger actuals). Owners with no ledger data see collected=0 / rate 0% honestly.

### Claude's Discretion
- Exact table/column shapes (`rent_charges`, `rent_receipts`, whether a unified `ledger_entries` view); the reversal-immutability enforcement mechanism (RLS + trigger vs column privileges — mirror Phase 54 `guard_user_self_update` / append-only `esign_events`); the balance/summary RPC shape (per-lease {charges, receipts, credits, balance, late_count} + collection-rate); cron slot (avoid the 3 AM cleanup cluster + 06:00/06:30 reminder slots); the auto-FIFO convenience (D-02a).

### Deferred Ideas (OUT OF SCOPE)
- Auto-late-fee rules (statutory-cap/dispute risk) — manual lines only in v10.
- Per-lease/per-owner configurable grace period — fixed 5 days in v10.
- Lease-anchored (non-calendar) rent due days — calendar-month in v10 (no due-day column added).
- Auto-FIFO receipt allocation as the DEFAULT — owner-specified per-charge in v10.
- History backfill / reconstructed ledgers — never (track-since only).
- ANY payment rail / facilitation (ACH, autopay, cards, Stripe Connect) — demolished April 2026, stays demolished. Receipts are a `method` LABEL only.
- Tenant-facing anything (tenants are records, not users).
- Reusing/reviving the legacy `public.rent_due` table.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEDGER-01 | Monthly rent charges auto-generate from active lease terms into `rent_charges` via pg_cron (dollars `numeric(10,2)`; the integer `leases.rent_amount` boundary converted exactly once) | Verified `leases.rent_amount integer` (never numeric); `generate_rent_charges()` SECURITY DEFINER cron fn mirroring `queue_lease_reminders`; partial `UNIQUE(lease_id, period_start) WHERE type='rent'` + `ON CONFLICT DO NOTHING`; free cron slot `0 5 * * *` |
| LEDGER-02 | Owner records payment received against a charge into `rent_receipts` — date, amount, method label only; partials as discrete entries | `rent_receipts` table (charge_id FK, signed `amount numeric(10,2)`, `method` text label, `received_date`); owner INSERT RLS; per-charge paid-state derivation |
| LEDGER-03 | Per-lease running balance (Σ charges − Σ receipts/credits) + unpaid-past-due flagged late | `get_lease_ledger_summary()` RPC: signed-sum balance + `due_date + interval '5 days' < current_date` late predicate |
| LEDGER-04 | Ledger onboarding: "track since" date + opening balance per lease (no history backfill) | `leases.ledger_start_date date` (nullable) + single `type='opening'` charge at track-since; generation floors periods at `ledger_start_date` |
| LEDGER-05 | Manual charge/credit lines (late fee, other) — manual only, no auto-late-fee | `rent_charges.type IN ('late_fee','manual_charge','credit')`; owner INSERT; NO auto-late-fee cron |
| LEDGER-06 | Append-only — corrections are reversal entries, never edits/deletes | RLS SELECT+INSERT only (no UPDATE/DELETE policy) + `BEFORE UPDATE OR DELETE` trigger raising exception; `reverses_id` self-FK; reversal = exact negation |
| LEDGER-07 | Single revenue definition — lease-derived = scheduled, ledger = collected, no double-counting | Fill `get_revenue_trends_optimized.collections` (currently hardcoded 0) from ledger receipts; relabel `revenue`→"Scheduled" in UI; keep figures separate |
| LEDGER-08 | Collection-rate KPI restored from ledger actuals | `collected ÷ scheduled` (current month); reuse existing `getCollectionRateStatus()` helper (already in `currency.ts`); 0% honest when no data |
</phase_requirements>

## Summary

The rent ledger is a **pure-Postgres append-only bookkeeping subsystem** — two new owner-scoped tables (`rent_charges`, `rent_receipts`), one SECURITY DEFINER pg_cron generator, a small set of read RPCs, and a UI surface on the lease-detail page — with **zero new npm dependencies** and **zero payment facilitation**. Every primitive it needs already exists in the codebase as a proven analog: the append-only + owner-SELECT-only RLS discipline of `esign_events` (Phase 54), the named-SECURITY-DEFINER + `ON CONFLICT DO NOTHING` cron shape of `queue_lease_reminders`/`claim_lease_reminders` (Phase 53), and the `collections` placeholder already emitted by `get_revenue_trends_optimized` (hardcoded `0`, waiting for exactly this data).

The load-bearing constraint is the money boundary. **Verified against live DDL:** `leases.rent_amount` is `integer NOT NULL` (dollars) and was **never** altered to numeric — the `numeric(10,2)` conversion in `20260304140000_financial_fixes_schema.sql` touched only the now-demolished `rent_due`/`rent_payments` tables. `expenses.amount` is likewise `integer NOT NULL`. Ledger amounts are `numeric(10,2)` dollars; the conversion `leases.rent_amount::numeric(10,2)` happens exactly once at charge generation. `formatCurrency()` takes dollars directly — `formatCents()` (which divides by 100) must never touch a ledger amount. Any `* 100`, `/ 100`, or `formatCents` on ledger data is the v8.0 100× bug class recurring.

**Primary recommendation:** Two append-only tables with **signed `numeric(10,2)` amounts** and a `reverses_id` self-FK (reversal = exact negation, so the balance is a single `SUM(charges) − SUM(receipts)` with reversed pairs netting to zero); immutability enforced by RLS-without-UPDATE/DELETE-policy **plus** a `BEFORE UPDATE OR DELETE` guard trigger; a daily idempotent `generate_rent_charges()` cron at `0 5 * * *`; and collection-rate wired in by filling the existing `collections` field rather than adding a parallel revenue path.

**Three disagreements between the LOCKED CONTEXT and the live schema are flagged below** (`payment_day`, `grace_period_days`/`late_fee_days`, `late_fee_amount` columns all exist on `leases` despite D-01/D-03/D-05a premises) — none block the locked decisions, but the planner must know the columns exist and are intentionally ignored.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Monthly charge generation (LEDGER-01) | Database (pg_cron + SECURITY DEFINER fn) | — | Must run without a user session; money conversion belongs at the DB boundary once |
| Charge/receipt/credit persistence (LEDGER-02/05) | Database (tables + RLS) | Frontend (mutation hooks) | Append-only integrity + owner isolation are DB guarantees, not client promises |
| Balance / late / paid-state computation (LEDGER-03) | Database (read RPC) | Frontend (typed mapper + display) | Late/paid are DERIVED — computing them in SQL keeps one source of truth and avoids client drift |
| Append-only enforcement (LEDGER-06) | Database (RLS + guard trigger) | — | Immutability cannot be a client concern; enforced at the write boundary |
| Onboarding "track since" + opening balance (LEDGER-04) | Frontend (owner form) → Database (column + opening row) | — | Owner-initiated one-time action; stored as a column + a normal ledger row |
| Revenue relabel + collected + collection-rate (LEDGER-07/08) | Database (extend existing RPCs) | Frontend (labels + KPI card) | Numbers computed server-side (no double-count); tier relabels copy client-side |
| Ledger UI (per-lease view, record-receipt, add-line) | Frontend (lease-detail page) | Database (RPCs/PostgREST) | Interactive owner surface over `/leases/[id]` |

## Standard Stack

**No new runtime dependencies.** Positioning invariant (REQUIREMENTS.md line 7, 148): "zero new npm runtime dependencies — every feature rides an existing rail." This phase is DB migrations + RPCs + UI over the existing stack.

### Core (all already installed / in-prod)
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Postgres + pg_cron | Supabase-managed | Scheduled charge generation | Already runs 8+ crons (cleanup cluster, reminders, retention) |
| PostgREST + RPCs | Supabase-managed | Ledger reads/writes | Project's sole data-access layer (CLAUDE.md: "PostgREST + RPCs only. No custom backend.") |
| `@tanstack/react-query` | in-repo | Ledger query/mutation state | `queryOptions()` factories in `src/hooks/api/query-keys/` |
| `@tanstack/react-form` | in-repo | Record-receipt / add-line / onboarding forms | Project form standard |
| `zod` | in-repo | Amount/date/method validation at the mutation boundary | Used for all input validation |
| `Intl.NumberFormat` via `formatCurrency` | `src/lib/utils/currency.ts` | Dollar display (NO cents) | `formatCurrency(dollars)` — never `formatCents` here |
| Lucide icons | in-repo | Ledger UI iconography | CLAUDE.md rule 10 (sole icon library) |

### Supporting (existing helpers to reuse)
| Helper | Location | Purpose |
|--------|----------|---------|
| `getCollectionRateStatus(rate)` | `src/lib/utils/currency.ts:282` | **Already exists** (v2.0 leftover) — status/color for the LEDGER-08 KPI card. Reuse. Note its `icon` strings ("TARGET:", "[OK]") are labels, not emojis — swap for Lucide in the card. |
| `formatPercentage` / `formatCurrency` | `src/lib/utils/currency.ts` | KPI + amount display |
| `ownerDashboardKeys` | `src/hooks/api/query-keys/owner-dashboard-keys.ts` | Invalidate on ledger mutations (+ `ownerDashboardKeys.all`) |
| `handlePostgrestError` / `jsonArray` / rpc-shape | `src/lib/` | RPC boundary error + shape handling |
| `claim_lease_reminders` / `queue_lease_reminders` | migrations | Cron template (SECURITY DEFINER, `search_path=public`, service_role-only) |
| `esign_events` table + `meter_esign_send` RPC | `20260724031533_esign_metering.sql` | Append-only table + owner-SELECT-only RLS + service_role-only write template |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Signed `amount` + `reverses_id` negation | Magnitude `amount` + sign derived by `type` in the RPC | Magnitude keeps amounts non-negative but forces a self-join in the balance RPC to compute reversal effect; signed is a single `SUM()`. Signed recommended. |
| Two tables (`rent_charges`, `rent_receipts`) | One `ledger_entries` table with a `kind` column | Single table simplifies "one append-only stream" but muddies the per-charge allocation FK (a receipt must reference a charge row in the same table). Two tables keep the `charge_id` FK clean. Two tables recommended; expose a merged **view** for the chronological UI if desired. |
| `leases.ledger_start_date` column | Separate `lease_ledger_settings` table | A single nullable date per lease doesn't justify a table; column is minimal. Column recommended. |
| Daily idempotent cron | Monthly cron on the 1st | Daily catches mid-month onboarding + newly-activated leases the next day; idempotency makes re-runs free. Daily recommended (monthly alternative noted). |

**Installation:** None. `bun run db:types` regenerates `src/types/supabase.ts` after each MCP-applied migration (owner-run; PAT-refresh caveat per MEMORY.md).

## Package Legitimacy Audit

**No external packages installed.** This phase adds Postgres migrations, RPCs, and React UI over existing rails. Zero new npm/PyPI/crates dependencies (enforced positioning invariant, REQUIREMENTS.md line 148). slopcheck / registry verification is **not applicable** — nothing is installed.

## Verified Money Boundary (the correctness core)

| Column | Live Postgres type | Evidence | Ledger handling |
|--------|-------------------|----------|-----------------|
| `leases.rent_amount` | `integer NOT NULL` (dollars) | `[VERIFIED: 20251101000000_base_schema.sql]` DDL `"rent_amount" integer NOT NULL`; **no** later `ALTER ... TYPE numeric` on `leases` | `rent_charges.amount := leases.rent_amount::numeric(10,2)` — **the one conversion**, NO `* 100` |
| `expenses.amount` | `integer NOT NULL` (dollars) | `[VERIFIED: 20251101000000_base_schema.sql]` `"amount" integer NOT NULL` (line 1273); untouched by `20260304140000` | Not modified this phase (Phase 61 reconciles it; TAX-04) |
| `leases.security_deposit` | `integer NOT NULL` | `[VERIFIED: base_schema DDL]` | Out of scope (deposit accounting is Phase 63) |
| `rent_charges.amount` (NEW) | `numeric(10,2)` (dollars) | design | Signed dollars; displayed via `formatCurrency()` |
| `rent_receipts.amount` (NEW) | `numeric(10,2)` (dollars) | design | Signed dollars |

**Critical clarification — the numeric conversion that DID happen was on demolished tables:** `20260304140000_financial_fixes_schema.sql` ran `alter column amount type numeric(10,2)` — but only on `public.rent_due` and `public.rent_payments`, **both dropped** in `20260418140000_demolish_rent_and_tenant_portal.sql` (`drop table if exists public.rent_due cascade`). It never touched `leases.rent_amount` or `expenses.amount`. `[VERIFIED: migration diff]`

**Display path:** `formatCurrency(amount, opts)` in `src/lib/utils/currency.ts` calls `Intl.NumberFormat({style:'currency'})` on the value **as dollars** (no division). `formatCents(cents)` divides by 100 — it exists for Stripe-cents values and **must not** be applied to any ledger amount. `[VERIFIED: src/lib/utils/currency.ts:28-59]`

## LOCKED-CONTEXT vs LIVE-SCHEMA Disagreements (planner must reconcile)

These are places where a CONTEXT.md decision's stated premise is contradicted by the live schema. **In every case the locked decision still stands** — the columns are intentionally ignored — but the planner and reviewers must know they exist so they don't "discover" them mid-review and think a requirement was missed.

| # | CONTEXT premise | Live schema reality | Resolution |
|---|-----------------|--------------------|-----------| 
| DIS-1 | D-01: "leases have no rent-due-day column; do NOT add one for v10" | `leases.payment_day integer DEFAULT 1 NOT NULL` **exists** `[VERIFIED: base_schema DDL]` | Locked decision (period_start = due_date = 1st) holds. `payment_day` default is 1, so it aligns for most leases. **Flag:** a lease with `payment_day != 1` will still have `due_date` forced to the 1st per the calendar-month lock. Do NOT add a new due-day column (none needed — one already exists and is deliberately unused). |
| DIS-2 | D-03: fixed 5-day grace as "a single constant, NOT a per-lease config knob" | `leases.grace_period_days integer DEFAULT 0` AND `leases.late_fee_days integer DEFAULT 5` **both exist** `[VERIFIED: base_schema DDL]` | Locked decision (hardcoded `interval '5 days'`) holds. **Flag:** the hardcoded 5 matches `late_fee_days` default (5) but NOT `grace_period_days` default (0). Ignore both columns; use the literal constant in the late predicate. |
| DIS-3 | D-05a: late fees are MANUAL charge lines only, "no auto rules" | `leases.late_fee_amount integer` **exists** (nullable) `[VERIFIED: base_schema DDL]` | Locked decision holds — no auto-late-fee. **Flag:** `late_fee_amount` exists but must NOT be read/applied automatically. A late fee is only ever a manually-inserted `type='late_fee'` `rent_charges` row. |
| DIS-4 | rls-policies skill lists `rent_due` under "owner+tenant shared read" and `get_current_owner_user_id()` "via stripe_connected_accounts" | `rent_due` was DROPPED; `stripe_connected_accounts`-based owner lookup is demolished-era | **Skill is stale for v10.** Follow the `esign_events` pattern: denormalized `owner_user_id` column with RLS `owner_user_id = (select auth.uid())` directly. Do NOT use `get_current_owner_user_id()` for the ledger. `[VERIFIED: 20260724031533_esign_metering.sql:67]` |
| DIS-5 (info) | Charge gen for "active" leases | `leases_lease_status_check` = `draft, pending_signature, active, ended, terminated, expired, inactive` `[VERIFIED: 20260702214706]` | Generate for a **coverage** predicate (`lease_status IN ('active','ended','expired','terminated')` AND period within `[start_date, end_date]`), NOT a naive `= 'active'`, so a lease that ends mid-tracking still gets charges for months it was active. Mirrors `get_revenue_trends_optimized`'s `IN ('active','ended','expired')`. Exclude `draft`/`pending_signature`/`inactive`. |

## Architecture Patterns

### System Architecture Diagram

```
                       ┌─────────────────────────────────────────────┐
                       │            pg_cron  (0 5 * * * UTC)           │
                       │        select public.generate_rent_charges() │
                       └───────────────────────┬─────────────────────┘
                                                │ SECURITY DEFINER, search_path=public
                                                │ amount := leases.rent_amount::numeric(10,2)  ← ONE conversion
                                                ▼
   leases (integer rent_amount) ──reads──►  INSERT rent_charges (type='rent', period_start=1st,
   + ledger_start_date (track-since)         due_date=1st)  ON CONFLICT (lease_id,period_start)
                                             WHERE type='rent' DO NOTHING   (idempotent)
                                                │
   ┌──────────────── Owner (authenticated, RLS owner_user_id = auth.uid()) ────────────────┐
   │                                                                                        │
   │  Onboarding form ──► set leases.ledger_start_date + INSERT rent_charges(type='opening')│
   │  Add manual line ──► INSERT rent_charges(type in late_fee|manual_charge|credit)        │
   │  Record receipt  ──► INSERT rent_receipts(charge_id, amount, method label, date)       │
   │  Correction      ──► INSERT reversal row (reverses_id = original, exact negation)       │
   │                          │  (UPDATE/DELETE blocked: no RLS policy + guard trigger RAISE) │
   └──────────────────────────┼─────────────────────────────────────────────────────────────┘
                              ▼
              ┌───────────────────────────────────────────────┐
              │  READ RPCs (SECURITY DEFINER, guard auth.uid)  │
              │  get_lease_ledger(p_lease_id)  → entries+running balance+paid-state+late │
              │  get_lease_ledger_summary()    → per-lease {charges,receipts,credits,balance,late_count} │
              │  extend get_revenue_trends_optimized → fill `collections` from receipts    │
              │  extend get_financial_overview → collected + collection_rate               │
              └───────────────┬───────────────────────────────┘
                              │  typed mapper (no `as unknown as`, no *100)
                              ▼
        Frontend:  /leases/[id] ledger tab  ·  dashboard collection-rate KPI card
                   revenue surfaces relabeled  Scheduled (leases)  vs  Collected (ledger)
```

### Recommended Project Structure
```
supabase/migrations/
  <ts>_rent_ledger_schema.sql          # rent_charges + rent_receipts + RLS + guard trigger + leases.ledger_start_date
  <ts>_rent_charges_generation_cron.sql# generate_rent_charges() + cron.schedule('generate-rent-charges','0 5 * * *')
  <ts>_rent_ledger_read_rpcs.sql       # get_lease_ledger, get_lease_ledger_summary, get_collection_rate
  <ts>_revenue_collected_integration.sql# extend get_revenue_trends_optimized (fill collections) + get_financial_overview
src/hooks/api/
  use-rent-ledger.ts                   # queries + record-receipt / add-line / add-reversal / onboarding mutations (<300 lines)
  query-keys/rent-ledger-keys.ts       # queryOptions() factories + typed mappers (mapLedgerEntryRow, mapLedgerSummaryRow)
src/app/(owner)/leases/[id]/
  ledger/… (or a tab section)          # per-lease ledger view + forms (Server Component shell + 'use client' islands)
src/components/ledger/                  # ledger table, record-receipt form, add-line form, onboarding form, KPI card
```

### Pattern 1: Append-only table + owner-SELECT/INSERT RLS + guard trigger (LEDGER-06)
**What:** Owner may read and insert their own ledger rows, but never update or delete them; corrections are reversal inserts.
**When to use:** Both `rent_charges` and `rent_receipts`.
**Example:**
```sql
-- Source: adapted from 20260724031533_esign_metering.sql (append-only + owner RLS)
--         and Phase 54 guard_user_self_update discipline (immutability trigger)

create table if not exists public.rent_charges (
  id            uuid primary key default gen_random_uuid(),
  lease_id      uuid not null references public.leases(id) on delete cascade,
  owner_user_id uuid not null references public.users(id)  on delete cascade,  -- denormalized for direct RLS (DIS-4)
  type          text not null
                constraint rent_charges_type_check
                check (type in ('rent','late_fee','manual_charge','credit','opening')),
  amount        numeric(10,2) not null,           -- SIGNED dollars; NO cents, NO *100 (D-00)
  period_start  date,                             -- 1st of month for 'rent' (and 'opening' at track-since); NULL for ad-hoc lines
  due_date      date,                             -- late detection anchor; = period_start for 'rent'
  description   text,
  reverses_id   uuid references public.rent_charges(id),  -- reversal = exact negation of the referenced row
  created_at    timestamptz not null default now(),
  -- sign discipline: charges positive, credits negative, opening either; reversals exempt (they negate)
  constraint rent_charges_sign_check check (
    reverses_id is not null
    or (type in ('rent','late_fee','manual_charge') and amount > 0)
    or (type = 'credit' and amount < 0)
    or (type = 'opening')
  )
);

-- Idempotency for the cron's auto rent charges ONLY (D-01) — a manual line dated on the 1st must not collide.
create unique index if not exists uq_rent_charges_lease_period_rent
  on public.rent_charges (lease_id, period_start) where type = 'rent';
create index if not exists idx_rent_charges_lease on public.rent_charges (lease_id);
create index if not exists idx_rent_charges_owner on public.rent_charges (owner_user_id);

alter table public.rent_charges enable row level security;

-- One policy per op per role (rls-policies skill). SELECT + INSERT only — no UPDATE/DELETE policy (append-only).
create policy rent_charges_select on public.rent_charges
  for select to authenticated using (owner_user_id = (select auth.uid()));
create policy rent_charges_insert on public.rent_charges
  for insert to authenticated with check (owner_user_id = (select auth.uid()));

-- Belt-and-suspenders immutability: block UPDATE/DELETE for EVERY writer (RLS alone doesn't stop service_role).
create or replace function public.rent_ledger_append_only()
  returns trigger language plpgsql as $$
begin
  raise exception 'rent ledger is append-only; post a reversal entry instead of editing/deleting (row %)',
    coalesce(old.id::text, '?')
    using errcode = '0A000';   -- feature_not_supported
end;
$$;
create trigger rent_charges_no_mutate
  before update or delete on public.rent_charges
  for each row execute function public.rent_ledger_append_only();
```
`rent_receipts` follows the same shape: `charge_id uuid not null references rent_charges(id) on delete cascade`, denormalized `lease_id` + `owner_user_id`, `amount numeric(10,2) not null` (positive = received, negative = receipt reversal via `reverses_id`), `method text` (label), `received_date date not null`, same SELECT+INSERT policies + the same append-only trigger.

### Pattern 2: Idempotent charge generation cron (LEDGER-01)
**What:** Daily SECURITY DEFINER function inserts each active lease's current-tracked-month rent charge, converting `rent_amount` once.
**When to use:** The generation job.
**Example:**
```sql
-- Source: mirrors queue_lease_reminders / claim_lease_reminders (20260722005310) + expire-leases coverage logic
create or replace function public.generate_rent_charges()
returns integer                          -- count inserted (for cron logging)
language plpgsql security definer set search_path = public as $$
declare v_inserted integer;
begin
  with active_periods as (
    select l.id as lease_id, l.owner_user_id, l.rent_amount,
           gs::date as period_start
    from public.leases l
    join lateral generate_series(
           greatest(date_trunc('month', l.ledger_start_date),
                    date_trunc('month', l.start_date)),
           date_trunc('month', current_date),
           interval '1 month') gs on true
    where l.ledger_start_date is not null
      and l.lease_status in ('active','ended','expired','terminated')  -- coverage, not naive =active (DIS-5)
      and l.start_date <= (gs + interval '1 month' - interval '1 day')::date
      and (l.end_date is null or l.end_date >= gs::date)
  ),
  ins as (
    insert into public.rent_charges (lease_id, owner_user_id, type, amount, period_start, due_date, description)
    select lease_id, owner_user_id, 'rent',
           rent_amount::numeric(10,2),          -- ← THE ONE CONVERSION. No *100.
           period_start, period_start,          -- due_date = 1st (D-01)
           'Monthly rent'
    from active_periods
    on conflict (lease_id, period_start) where type = 'rent' do nothing   -- idempotent (D-01)
    returning 1
  )
  select count(*) into v_inserted from ins;
  return v_inserted;
end;
$$;
revoke all on function public.generate_rent_charges() from public, anon, authenticated;
grant execute on function public.generate_rent_charges() to service_role;

-- Free slot: clear of the 3 AM cleanup cluster (03:00–03:45) and the 06:00/06:30 reminder slots.
select cron.schedule('generate-rent-charges', '0 5 * * *', $$select public.generate_rent_charges()$$);
```
> **ON CONFLICT + partial index caveat:** Postgres `ON CONFLICT (cols) WHERE predicate` requires a matching **partial unique index** with the same predicate (defined above). Verify the arbiter matches at plan time.

### Pattern 3: Balance / late / summary read RPC (LEDGER-03)
```sql
-- Per-lease running balance + late count. SECURITY DEFINER + auth guard mirrors get_revenue_trends_optimized.
create or replace function public.get_lease_ledger_summary(p_lease_id uuid)
returns table(charges_total numeric, credits_total numeric, receipts_total numeric,
              balance numeric, late_count integer, late_amount numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_owner uuid := (select auth.uid());
begin
  if not exists (select 1 from public.leases where id = p_lease_id and owner_user_id = v_owner) then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  return query
  with c as (select * from public.rent_charges where lease_id = p_lease_id),
       r as (select * from public.rent_receipts where lease_id = p_lease_id)
  select
    coalesce(sum(c.amount) filter (where c.amount > 0), 0),
    coalesce(sum(c.amount) filter (where c.amount < 0), 0),
    coalesce((select sum(amount) from r), 0),
    coalesce(sum(c.amount), 0) - coalesce((select sum(amount) from r), 0),   -- balance = Σcharges − Σreceipts (signed)
    coalesce(count(*) filter (
      where c.type in ('rent','late_fee','manual_charge') and c.reverses_id is null
        and c.due_date + interval '5 days' < current_date                    -- fixed 5-day grace (D-03)
        and c.amount > coalesce((select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    )::int, 0),
    coalesce(sum(c.amount - coalesce((select sum(rr.amount) from r rr where rr.charge_id = c.id),0)) filter (
      where c.type in ('rent','late_fee','manual_charge') and c.reverses_id is null
        and c.due_date + interval '5 days' < current_date
        and c.amount > coalesce((select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    ), 0)
  from c;
end;
$$;
grant execute on function public.get_lease_ledger_summary(uuid) to authenticated;
revoke all on function public.get_lease_ledger_summary(uuid) from public, anon;
```
> For the chronological ledger UI (running balance per row, per-charge paid/partial/unpaid badge), return an ordered `jsonb` array from a companion `get_lease_ledger(p_lease_id)` RPC and shape it with a typed mapper (`mapLedgerEntryRow`) — never `as unknown as` (CLAUDE.md rule 8).

### Pattern 4: Revenue relabel + collected + collection-rate (LEDGER-07/08)
**Key integration point — the placeholder already exists.** `get_revenue_trends_optimized` currently emits `'collections', 0` (hardcoded) and `'outstanding', expected_revenue`. `[VERIFIED: 20260709060533 lines 116-118]` and the frontend already reads `collections`/`outstanding` (`RevenueTrendRow` in `use-owner-dashboard-financial.ts:37-42`). Fill it:
```sql
-- In get_revenue_trends_optimized, add a monthly_collected CTE from rent_receipts and change the build:
--   'revenue',     coalesce(me.expected_revenue, 0),           -- = SCHEDULED (Σ rent_amount), UI relabels
--   'collections', coalesce(mc.collected, 0),                  -- NEW: Σ rent_receipts.amount for that month
--   'outstanding', coalesce(me.expected_revenue,0) - coalesce(mc.collected,0)
-- where monthly_collected sums receipts by date_trunc('month', received_date) for the owner's leases.
```
```sql
-- Collection-rate KPI (LEDGER-08). Either a dedicated RPC or extend get_financial_overview (Returns Json).
-- collected ÷ scheduled for the current month; NULL/0 when scheduled = 0 (honest, not fabricated).
create or replace function public.get_collection_rate(p_user_id uuid, p_month date default date_trunc('month', current_date)::date)
returns table(scheduled numeric, collected numeric, rate numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_user_id != (select auth.uid()) then raise exception 'Access denied' using errcode='42501'; end if;
  return query
  with sched as (   -- scheduled = Σ rent_amount of leases active in p_month (mirrors trend coverage; integer→numeric once)
    select coalesce(sum(l.rent_amount),0)::numeric(10,2) s
    from public.leases l
    where l.owner_user_id = p_user_id and l.lease_status in ('active','ended','expired','terminated')
      and l.start_date <= (p_month + interval '1 month' - interval '1 day')::date
      and (l.end_date is null or l.end_date >= p_month)
  ),
  coll as (   -- collected = Σ receipts in p_month across owner leases
    select coalesce(sum(rr.amount),0)::numeric(10,2) c
    from public.rent_receipts rr
    where rr.owner_user_id = p_user_id
      and rr.received_date >= p_month and rr.received_date < (p_month + interval '1 month')::date
  )
  select s, c, case when s > 0 then round(c / s * 100, 1) else 0 end from sched, coll;
end;
$$;
```
**No double-counting rule:** `scheduled` (Σ `rent_amount`) and `collected` (Σ receipts) are separate fields on separate labels. Nothing adds them. NOI/margin in `analytics-mappers.ts` currently derive from `revenue` (= scheduled) — **relabel only, do not silently re-base NOI on collected.** Leave `revenue_stats_type` (the composite feeding `get_dashboard_stats`) untouched to avoid a breaking composite-type migration; add `collected`/`collection_rate` via `get_financial_overview` (Json) + the new `get_collection_rate` RPC.

### Anti-Patterns to Avoid
- **`* 100` / `/ 100` / `formatCents` on any ledger amount** — reintroduces the v8.0 100× bug (MONEY-01/02). Ledger is dollars end to end.
- **Storing paid/late as a mutable column** — they are DERIVED (D-02/D-03). A `status` column would drift and violate append-only.
- **Auto-applying `leases.late_fee_amount`** — DIS-3; late fees are manual `type='late_fee'` rows only.
- **`FOR ALL` policies on the ledger tables** — rls-policies skill forbids it for authenticated tables; use per-op policies and rely on the guard trigger for immutability.
- **Reusing/reviving `public.rent_due`** — demolished; net-new tables only.
- **Bare `UNIQUE(lease_id, period_start)`** across all types — a manual line dated on the 1st would collide with the auto rent charge. Use the partial index `WHERE type='rent'`.
- **`get_current_owner_user_id()` for ledger RLS** — stale (stripe_connected_accounts path demolished); use `owner_user_id = (select auth.uid())` directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled monthly generation | A Node worker / external scheduler | pg_cron + SECURITY DEFINER fn | Already the project's cron rail; no session, no deploy |
| Exactly-once / idempotent generation | App-level dedupe checks | Partial unique index + `ON CONFLICT DO NOTHING` | DB guarantees it under concurrent runs |
| Owner isolation | App-level `where owner = me` filters | RLS `owner_user_id = (select auth.uid())` | Enforced for every query incl. bugs; integration-tested |
| Immutability | Client "are you sure" + soft flags | RLS (no UPDATE/DELETE policy) + guard trigger | Append-only must be a DB invariant, not UI etiquette |
| Currency display | Custom `$` formatting | `formatCurrency()` (dollars) | Locale/decimal correctness; avoids cents mistakes |
| Collection-rate status/color | New helper | `getCollectionRateStatus()` (already in `currency.ts:282`) | v2.0 left it in place for exactly this |
| Query cache keys | String-literal arrays | `queryOptions()` factories in `query-keys/` | CLAUDE.md rule 9 |

**Key insight:** every hard part of a ledger — scheduling, idempotency, isolation, immutability — is a database guarantee the codebase already uses elsewhere. The novel work is the *money-boundary discipline* (convert once, dollars throughout) and the *reversal-not-edit* modeling, not infrastructure.

## Runtime State Inventory

> This is a **greenfield** subsystem (net-new tables + RPCs + UI). It is not a rename/refactor/migration of existing runtime state. The one piece of pre-existing state it *reconciles* (not migrates) is the hardcoded `collections: 0` in `get_revenue_trends_optimized`.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | **None** — no existing ledger data to migrate. `public.rent_due` (legacy) was DROPPED (`20260418140000`); it holds nothing. `[VERIFIED]` | None (net-new tables) |
| Live service config | **None** — no external service holds ledger state; generation is in-DB pg_cron (no edge fn, no n8n, no pg_net) | None |
| OS-registered state | **None** — pg_cron jobs live in the DB (`cron.job`), created idempotently by migration | Register `generate-rent-charges` via `cron.schedule` (idempotent) |
| Secrets / env vars | **None** — no edge function, no Bearer secret, no `app_config` keys needed (unlike Phase 53/54) | None |
| Build artifacts | `src/types/supabase.ts` regenerates after each migration | `bun run db:types` (owner-run; PAT-refresh caveat) |
| Existing-figure reconciliation | `get_revenue_trends_optimized.collections` hardcoded `0`; frontend `RevenueTrendRow.collections` reads it | **Code edit** (fill from ledger) — not a data migration |

## Common Pitfalls

### Pitfall 1: The 100× money regression (v8.0 class)
**What goes wrong:** Multiplying `rent_amount` by 100 anywhere, or running a ledger amount through `formatCents()`.
**Why it happens:** Muscle memory from cents-based Stripe code; `rent_amount` "looks like" it might be cents.
**How to avoid:** `rent_amount` is `integer` **dollars**. Convert once: `rent_amount::numeric(10,2)`. Display with `formatCurrency()` only. Add a grep-based test asserting no `* 100` / `formatCents` in ledger paths (see Validation).
**Warning signs:** A $1,500 rent showing as $150,000; charge.amount = 150000 instead of 1500.00.

### Pitfall 2: `ON CONFLICT` without a matching partial index
**What goes wrong:** `on conflict (lease_id, period_start) where type='rent'` errors ("no unique or exclusion constraint matching the ON CONFLICT specification") if the partial unique index predicate doesn't match exactly.
**How to avoid:** Create `uq_rent_charges_lease_period_rent ... WHERE type='rent'` first, identical predicate.
**Warning signs:** Cron fails with 42P10 in `cron.job_run_details` (surfaced by `check_cron_health`).

### Pitfall 3: RLS blocks authenticated UPDATE but not service_role/owner-role edits
**What goes wrong:** Relying only on "no UPDATE policy" for append-only leaves service_role (and any SECURITY DEFINER path) able to mutate rows.
**Why it happens:** RLS is bypassed by service_role and table owners.
**How to avoid:** Add the `BEFORE UPDATE OR DELETE` guard trigger — it fires for all writers.
**Warning signs:** An amount changes without a reversal row appearing.

### Pitfall 4: Reversal leaves orphan receipts
**What goes wrong:** Reversing a charge that had receipts nets the charge to zero but leaves the receipts subtracting → an unexpected credit balance.
**Why it happens:** Charges and receipts are separate append-only streams.
**How to avoid:** When reversing a charge that has receipts, the UI must also post a receipt reversal (negative `rent_receipts` row with `reverses_id`). Document this in the correction flow; consider a single "reverse charge + its receipts" mutation.
**Warning signs:** Lease balance goes negative after a correction.

### Pitfall 5: Double-counting scheduled vs collected
**What goes wrong:** A dashboard sums or conflates "scheduled" and "collected," or silently re-bases NOI on collected.
**How to avoid:** Keep them as distinct, explicitly-labeled fields; collection-rate is the only place they combine (as a ratio). Relabel `revenue`→"Scheduled" in UI copy without changing the underlying calc.
**Warning signs:** Total revenue doubling; margin math shifting after the ledger ships.

### Pitfall 6: Charge generation for the wrong lease population
**What goes wrong:** Using `lease_status = 'active'` only skips leases that ended mid-tracking (they still owed rent for active months); or generating for `draft`/`inactive` leases creates phantom charges.
**How to avoid:** Coverage predicate `lease_status IN ('active','ended','expired','terminated')` AND period within `[start_date, end_date]` AND period ≥ `ledger_start_date` (DIS-5).
**Warning signs:** Missing final-month charges on ended leases; charges on draft leases.

## Code Examples

### Recording a receipt (owner mutation, per-charge allocation, dollars)
```typescript
// Source: pattern per CLAUDE.md data-access + query-key-factory rules
// src/hooks/api/use-rent-ledger.ts  (< 300 lines; createClient() inside the fn)
const recordReceiptSchema = z.object({
  chargeId: z.string().uuid(),
  amount: z.number().positive(),          // dollars — NO cents
  method: z.string().min(1).max(40),      // label only: 'cash' | 'check' | 'zelle' | 'venmo' | 'ach (manual)' | 'other'
  receivedDate: z.string(),               // YYYY-MM-DD
});
async function recordReceipt(input: z.infer<typeof recordReceiptSchema>, ownerId: string, leaseId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('rent_receipts').insert({
    charge_id: input.chargeId, lease_id: leaseId, owner_user_id: ownerId,
    amount: input.amount, method: input.method, received_date: input.receivedDate,
  });
  if (error) handlePostgrestError(error, 'record receipt');
}
// onSuccess: invalidate rentLedgerKeys.forLease(leaseId) + ownerDashboardKeys.all
```

### Typed mapper at the RPC boundary (no `as unknown as`)
```typescript
// Source: mapDocumentRow discipline (CLAUDE.md) — validate shape, throw on missing NOT NULL
function mapLedgerSummaryRow(raw: Record<string, unknown>): LedgerSummary {
  return {
    chargesTotal: Number(raw.charges_total ?? 0),
    creditsTotal: Number(raw.credits_total ?? 0),
    receiptsTotal: Number(raw.receipts_total ?? 0),
    balance: Number(raw.balance ?? 0),        // dollars
    lateCount: Number(raw.late_count ?? 0),
    lateAmount: Number(raw.late_amount ?? 0),
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `rent_due` + `rent_payments` (facilitation-era, RLS shared owner+tenant) | Net-new append-only `rent_charges`/`rent_receipts` (owner-only, bookkeeping) | This phase | No tenant access, no payment rail, append-only |
| `collections: 0` hardcoded in revenue trend RPC | `collections` filled from ledger receipts | This phase | Collection-rate KPI becomes real (LEDGER-08) |
| Owner lookup via `get_current_owner_user_id()`/`stripe_connected_accounts` | Direct `owner_user_id = (select auth.uid())` on `users.id` | v8.0+ (esign_events) | Simpler RLS; the rls-policies skill note is stale |

**Deprecated/outdated:**
- `public.rent_due` — dropped; do not reference.
- `calculate_late_fees()` cron + `late_fees` table (facilitation-era) — unscheduled/demolished; late fees are manual ledger lines now.
- rls-policies skill's `rent_due` and `get_current_owner_user_id()`-via-stripe mentions — stale for v10.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Signed-amount + `reverses_id`-negation is preferred over magnitude+type-sign | Table shapes | Low — both correct; signed simplifies the balance SUM. Planner may choose either; if magnitude chosen, the balance RPC needs a reversal self-join. |
| A2 | `ledger_start_date` belongs as a nullable column on `leases` (not a separate table) | Onboarding | Low — cosmetic; a settings table is a valid alternative. |
| A3 | Bounded-range generation (ledger_start month → current month) rather than current-month-only per run | Charge generation | **Medium** — decides whether a lease onboarded with a past track-since gets its intervening months' charges. Recommended (makes balance meaningful from track-since; never backfills receipts). Planner should confirm. |
| A4 | Daily cron `0 5 * * *` (vs monthly `0 4 1 * *`) | Cron slot | Low — daily catches mid-month onboarding; idempotent either way. |
| A5 | `method` is free text with a soft suggested set (cash/check/zelle/venmo/ach-manual/other), not a hard CHECK | rent_receipts | Low — a CHECK could over-constrain owner labels; keep flexible per D-02 "method LABEL only". |
| A6 | Reversing a charge with receipts requires an explicit paired receipt reversal (no auto-cascade) | Reversals | Medium — if the planner wants a one-click "reverse charge and its receipts," it must be a composed mutation. Flagged in Pitfall 4. |
| A7 | Ledger does not emit in-app notifications in v10 (no locked decision requires it) | Scope | Low — ROADMAP "Depends on Phase 52" is ordering/dependency, not a notification requirement. If a late-charge notification is wanted, use `create_notification` + extend the `notification_type` CHECK (mirror Phase 53). |

**Confirm A3 and A6 with the user via discuss-phase before locking the plan** — they change the task list.

## Open Questions (RESOLVED)

1. **Past-dated track-since → which months get charges?**
   - What we know: opening balance captures pre-track-since state; no receipt backfill (D-04).
   - What's unclear: whether charges are generated for months between a *past* `ledger_start_date` and now.
   - Recommendation: bounded-range generation (A3) — generate each month from `ledger_start_date`'s month forward; this derives expected charges (from lease terms) without reconstructing historical receipts. Confirm in discuss-phase.
   - **RESOLVED** - CONTEXT D-04 (bounded-range generation from ledger_start_date; no receipt backfill) + 55-06 track-since dialog copy warning the owner the tracked month's rent is auto-generated so the opening balance is sized to reconcile (W1).

2. **Reversal of a charge that already has receipts (A6).**
   - Recommendation: post a paired receipt reversal; expose a single composed "reverse this charge" mutation that inserts both negations in one transaction. Confirm UX.
   - **RESOLVED** - 55-02 reverse_charge posts the paired charge + receipt negation, and the new reverse_receipt RPC (W2) posts a standalone receipt's exact negation (reverses_id); 55-05's receipt-reversal path calls reverse_receipt instead of a raw negative insert.

3. **Collection-rate placement on the dashboard.**
   - What we know: `getCollectionRateStatus()` exists; Phase 52 dashboard + `ownerDashboardKeys` are the surfaces.
   - Recommendation: a KPI card fed by `get_collection_rate()`; wire into `ownerDashboardKeys.financial`. Exact card position is a UI-planning detail.
   - **RESOLVED** - 55-08 mounts <CollectionRateKpi /> on the dashboard, wired into ownerDashboardKeys.financial and fed by get_collection_rate.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pg_cron | Charge generation | ✓ | Supabase-managed | — (8+ jobs already scheduled) |
| PostgREST / RPC | All reads/writes | ✓ | Supabase-managed | — |
| Supabase MCP `apply_migration` + `list_migrations` | Migration apply + prod-timestamp reconcile | ✓ | — | CLI 401 workaround N/A (no edge fn this phase) |
| `bun run db:types` | Regenerate `supabase.ts` | ✓ (owner-run) | — | Owner runs post-apply (PAT refresh caveat, MEMORY.md) |
| pg_net | — | Not needed | — | Generation is pure in-DB (no HTTP), unlike reminder crons |
| Edge Function deploy | — | Not needed | — | No edge function in this phase |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None — every rail exists.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 + jsdom (unit); RLS integration harness (`tests/integration/rls/`, dual-client ownerA/ownerB vs prod); Playwright (E2E) |
| Config file | `vitest.config.ts` (existing); `tests/integration/rls/` (existing) |
| Quick run command | `bun run test:unit -- --run src/hooks/api/__tests__/rent-ledger.test.ts` |
| Full suite command | `bun run validate:quick` (types + lint + unit) then `bun run test:integration` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEDGER-01 | `generate_rent_charges()` inserts one 'rent' charge/lease/month; amount = rent_amount exactly (no ×100) | integration (SQL) | `bun run test:integration -- rent-ledger-generation` | ❌ Wave 0 |
| LEDGER-01 | Re-running generation inserts 0 (idempotent partial-unique) | integration | same | ❌ Wave 0 |
| LEDGER-01 | Money-boundary static assertion: no `* 100`/`/ 100`/`formatCents` in ledger paths | unit (grep) | `bun run test:unit -- --run src/hooks/api/__tests__/rent-ledger-money.test.ts` | ❌ Wave 0 |
| LEDGER-02 | Partial receipts against one charge → charge derives partial→paid | unit (balance math) | `bun run test:unit -- --run …/rent-ledger-balance.test.ts` | ❌ Wave 0 |
| LEDGER-03 | Balance = Σcharges − Σreceipts (signed); credits reduce balance | unit | same | ❌ Wave 0 |
| LEDGER-03 | Late = unpaid remaining AND `due_date + 5d < today` (boundary: +5 not late, +6 late) | unit | same | ❌ Wave 0 |
| LEDGER-04 | No `ledger_start_date` → no charges; opening balance seeds balance | integration | generation test | ❌ Wave 0 |
| LEDGER-05 | Manual `late_fee`/`manual_charge`/`credit` insert + affect balance | unit + integration | balance + RLS | ❌ Wave 0 |
| LEDGER-06 | UPDATE/DELETE on `rent_charges`/`rent_receipts` RAISES; reversal nets to zero | integration (RLS) | `bun run test:integration -- rent-ledger-append-only` | ❌ Wave 0 |
| LEDGER-06 | ownerA cannot SELECT ownerB's charges/receipts; cross-owner INSERT blocked | integration (RLS) | dual-client | ❌ Wave 0 |
| LEDGER-07 | `get_revenue_trends_optimized.collections` reflects receipts; scheduled ≠ collected, never summed | unit (mapper) + integration | analytics-mappers test | partial (analytics-mappers.test.ts exists) |
| LEDGER-08 | `get_collection_rate` = collected÷scheduled; 0 when scheduled=0 (no fabrication) | unit + integration | collection-rate test | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun run validate:quick` (types + lint + unit) — pre-commit lefthook enforces 80% coverage.
- **Per wave merge:** `bun run test:integration` (RLS owner-isolation + append-only) — hits prod, sequential.
- **Phase gate:** full suite green before `/gsd-verify-work`; perfect-PR gate (two consecutive zero-finding cycles).

### Wave 0 Gaps
- [ ] `src/hooks/api/__tests__/rent-ledger-balance.test.ts` — balance/late/paid-state math (LEDGER-02/03/05)
- [ ] `src/hooks/api/__tests__/rent-ledger-money.test.ts` — grep assertion: no `*100`/`formatCents` on ledger amounts (LEDGER-01)
- [ ] `tests/integration/rls/rent-ledger-append-only.test.ts` — UPDATE/DELETE raises; reversal nets zero (LEDGER-06)
- [ ] `tests/integration/rls/rent-ledger-isolation.test.ts` — dual-client owner isolation (LEDGER-06)
- [ ] `tests/integration/rls/rent-ledger-generation.test.ts` — idempotency + amount-exactness + coverage predicate (LEDGER-01/04)
- [ ] `src/hooks/api/query-keys/rent-ledger-keys.test.ts` — mapper shape + collection-rate (LEDGER-07/08)
- [ ] Framework install: none needed (Vitest + RLS harness present)

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth; RPCs guard `(select auth.uid())`; generation cron is service_role-only |
| V3 Session Management | no (inherited) | Existing `@supabase/ssr` middleware |
| V4 Access Control | **yes** | Per-op RLS `owner_user_id = (select auth.uid())` on both tables; read RPCs verify lease ownership before returning; append-only guard trigger |
| V5 Input Validation | **yes** | zod at the mutation boundary (amount positive, date, method length); DB CHECK on `type`, sign, `numeric(10,2)` scale |
| V6 Cryptography | no | No secrets/tokens in this phase (no edge fn) |
| V7 Error Handling / Logging | yes | `handlePostgrestError`; cron failures surface via `check_cron_health` → `user_errors`/Sentry |

### Known Threat Patterns for a Postgres owner-scoped ledger
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-owner read of another landlord's ledger | Information disclosure | RLS `owner_user_id = (select auth.uid())`; RPC ownership guard; dual-client integration test |
| Tampering with a booked amount (edit/delete) | Tampering / Repudiation | No UPDATE/DELETE RLS policy + `BEFORE UPDATE OR DELETE` guard trigger; corrections are reversal inserts (audit trail) |
| Client forging `owner_user_id` on insert | Spoofing / Elevation | INSERT `WITH CHECK (owner_user_id = (select auth.uid()))` |
| End user calling the generator to fabricate charges | Elevation | `generate_rent_charges()` revoked from public/anon/authenticated; service_role-only; SECURITY DEFINER `search_path=public` |
| SQL injection via method/description | Tampering | Parameterized PostgREST/RPC; no dynamic SQL; text columns |
| Money-scale corruption (×100) | Tampering (integrity) | `numeric(10,2)` scale; convert-once discipline; static grep test |

## Sources

### Primary (HIGH confidence)
- `[VERIFIED]` `supabase/migrations/20251101000000_base_schema.sql` — `leases.rent_amount integer NOT NULL`, `expenses.amount integer NOT NULL`, `payment_day/grace_period_days/late_fee_amount/late_fee_days` columns, `rent_due` DDL
- `[VERIFIED]` `supabase/migrations/20260418140000_demolish_rent_and_tenant_portal.sql` — `drop table if exists public.rent_due cascade`; `cron.unschedule('calculate-late-fees'|'payment-reminders')`
- `[VERIFIED]` `supabase/migrations/20260304140000_financial_fixes_schema.sql` — numeric conversion applied only to demolished `rent_due`/`rent_payments`
- `[VERIFIED]` `supabase/migrations/20260724031533_esign_metering.sql` — append-only table + owner-SELECT-only RLS + service_role-only RPC template
- `[VERIFIED]` `supabase/migrations/20260722005310_lease_reminders_delivery_state.sql` — SECURITY DEFINER + `FOR UPDATE SKIP LOCKED` + service_role-only cron primitive
- `[VERIFIED]` `supabase/migrations/20260709060533_data02_...sql` — `get_revenue_trends_optimized` emits `revenue`/`collections:0`/`outstanding`
- `[VERIFIED]` `supabase/migrations/20260222120000_phase56_pg_cron_jobs.sql`, `20260306170000_cleanup_cron_scheduling.sql`, `20260606205922_...`, `20260722012107_send_lease_reminders_drain_cron.sql` — cron slot map
- `[VERIFIED]` `supabase/migrations/20260702214706_add_inactive_to_leases_lease_status_check.sql` — current `lease_status` value set
- `[VERIFIED]` `src/types/supabase.ts` — `leases`/`expenses` Row shapes; revenue RPC signatures
- `[VERIFIED]` `src/lib/utils/currency.ts` — `formatCurrency` (dollars), `formatCents` (÷100), `getCollectionRateStatus`
- `[VERIFIED]` `src/hooks/api/use-owner-dashboard-financial.ts` — `RevenueTrendRow { revenue, collections, outstanding }` consumer
- `[CITED]` `.claude/skills/rls-policies/SKILL.md`, `.claude/skills/sql-migration-rules/SKILL.md` — RLS/migration conventions (with staleness noted, DIS-4)

### Secondary (MEDIUM confidence)
- Stessa "track since + opening balance" onboarding pattern (referenced in CONTEXT as the model) — `[ASSUMED]` training knowledge; the concrete implementation is fully specified by locked decisions, so no external verification needed.

### Tertiary (LOW confidence)
- None relied upon.

## Metadata

**Confidence breakdown:**
- Money boundary: HIGH — verified from DDL + absence of any later ALTER; the numeric conversion provably hit only demolished tables.
- Table/RPC shapes: HIGH — mirror in-prod analogs (esign_events, claim_lease_reminders, get_revenue_trends_optimized); one modeling choice (signed vs magnitude) flagged as A1.
- Cron slot: HIGH — full slot map read from migrations; `0 5 * * *` verified clear.
- Revenue integration: HIGH — `collections` placeholder + frontend consumer verified; integration is drop-in.
- Onboarding/generation range: MEDIUM — A3 (bounded range) is a recommendation needing user confirmation.

**Research date:** 2026-07-24
**Valid until:** 2026-08-23 (stable subsystem; the only fast-moving dependency is `src/types/supabase.ts`, regenerated per migration)
