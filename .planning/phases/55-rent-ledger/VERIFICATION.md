---
phase: 55-rent-ledger
status: passed
date: 2026-07-25
criteria_passed: 5/5
remediation: 20260726020701_rent_ledger_verification_fixes.sql
---

# Phase 55 — Rent Ledger: Verification

## Remediation (post-verification) — all findings fixed and re-proven live

The verification below graded the phase **partial** on two majors. Both were fixed, and
executing the reversal path during remediation surfaced a **blocker the code-reading pass
could not see**. All are shipped in prod migration `20260726020701_rent_ledger_verification_fixes`
and re-verified behaviourally inside deliberately-aborted transactions (zero prod mutation).

**F6 (BLOCKER, found while fixing F1) — an auto-generated rent charge could not be reversed
at all.** `uq_rent_charges_lease_period_rent` was `(lease_id, period_start) where type='rent'`.
`reverse_charge` copies both `type` and `period_start`, so reversing a `type='rent'` charge
collided with its own original and aborted:

```
ERROR: 23505 duplicate key value violates unique constraint
       "uq_rent_charges_lease_period_rent"
```

LEDGER-06's correction path was therefore broken for the single most common charge type. The
index exists only to make the cron idempotent — a reversal is not a generated charge — so the
predicate is now `type='rent' and reverses_id is null`, with the generator's ON CONFLICT arbiter
realigned in the same transaction (a mismatched arbiter raises 42P10).

**Re-verified live, all in rolled-back transactions:**

| Check | Before | After |
|---|---|---|
| Reverse a `type='rent'` charge | `23505` abort | 1 reversal row |
| Reversed original counts as late (F1) | yes | **0** |
| Balance after reversal | — | `0.00` |
| Reversing a reversal (F4) | posts a re-charge | **0** (no-op) |
| Generation idempotency | 3 then 0 | **3 then 0** |
| Regenerate *after* a reversal | — | **0** (no resurrection) |

That last row is the non-obvious risk of the index change: excluding reversals could have let
the generator recreate a reversed charge. It does not — the original still occupies the slot.

**F2** was fixed at both layers: the INSERT `WITH CHECK` on each ledger table now proves the
referenced lease (and, for receipts, the referenced charge) belongs to the caller, and the read
RPCs additionally scope every CTE and the per-charge `receipts_sum` subquery by `owner_user_id`,
so even a pre-existing foreign row cannot fold into another owner's totals.

**F5** fixed (`ledger-math.ts` now cites the real migration filenames).

**F3 left as-is deliberately** — a mid-month track-since still generating that month's full rent
charge is disclosed in the track-since dialog copy ("Rent for the month you start tracking is
added automatically. Size your opening balance accordingly"), so it is a product decision, not a
defect to silently reverse.

**Still open for a product decision, not filed as a defect:** the collection-rate denominator
sums `leases.rent_amount` rather than `rent_charges`, so during rollout it counts leases that
have no generated charges and the ratio reads low. See "Raised in verifier notes" below.

---

## Original verification (pre-remediation)

## Verdict

Phase 55 achieved its goal. A real record-keeping rent ledger ships end to end: charges
generate nightly from lease terms in `numeric(10,2)` dollars with a proven-binding
idempotency arbiter, receipts (including partials) and manual charge/credit lines are
recordable per charge, the per-lease running balance and late derivation render on a
mounted Ledger tab, the ledger is append-only at two independent layers with reversal as
the only correction path, and the dashboard collection-rate KPI is live off ledger actuals
with no double-counting. All five scope fences hold — no payment rail, no automatic late
fee, no history backfill, no tenant surface, `rent_due` untouched. It is **partial**, not
passed, on two majors: (1) a reversed past-due charge still counts toward `late_count` in
the read RPC, producing the exact client/SQL divergence the phase claimed impossible, and
(2) the INSERT `WITH CHECK` on both ledger tables validates `owner_user_id = auth.uid()`
but never that the referenced `lease_id`/`charge_id` belongs to the caller — so an
authenticated owner who knows another owner's lease UUID can append a permanent row into
that owner's balance, which append-only guarantees can never be removed. Neither is a data
loss or disclosure blocker; both are correctness defects in shipped server code and should
be fixed before the phase is treated as closed.

All six verifiers reported: C1 PASS, C2 PASS, C3 PARTIAL, C4 PASS, C5 PASS, C6 PASS.

## Success criteria

| # | Criterion | Verdict | Strongest evidence |
|---|-----------|---------|--------------------|
| 1 | Monthly rent charges auto-generate from lease terms into `rent_charges` via pg_cron in `numeric(10,2)` dollars, integer boundary converted exactly once, `UNIQUE(lease_id, period_start)` idempotency | PASS | Live `EXPLAIN` of the generator's INSERT reports `Conflict Arbiter Indexes: uq_rent_charges_lease_period_rent`; single dollar cast at `supabase/migrations/20260725020952_rent_charges_generation_cron.sql:80` (`rent_amount::numeric(10,2)`) |
| 2 | Owner records receipts (date, amount, method label, no rails) incl. partials as discrete entries, plus manual charge/credit lines | PASS | Per-charge FK `charge_id uuid not null references rent_charges(id)` at `supabase/migrations/20260725020925_rent_ledger_schema.sql:106`; accumulation via `sum(rr.amount) ... where rr.charge_id = c.id` at `supabase/migrations/20260725021100_rent_ledger_rpcs.sql:153-155` |
| 3 | Per-lease running balance (Σ charges − Σ receipts/credits) with unpaid past-due charges flagged late; "track since" onboarding, no backfill | PARTIAL | Balance at `supabase/migrations/20260725021100_rent_ledger_rpcs.sql:88`; late derived at `:92,:102` — but the derivation excludes reversal rows and not reversed originals (F1) |
| 4 | Ledger entries are append-only — corrections are reversal entries, never edits or deletes | PASS | SELECT+INSERT-only RLS at `supabase/migrations/20260725020925_rent_ledger_schema.sql:91-94,128-131` plus BEFORE UPDATE OR DELETE guard triggers at `:149-155`, body raising 0A000 at `supabase/migrations/20260725134519_rent_ledger_guard_search_path.sql:36-53` |
| 5 | One revenue definition (lease-derived = scheduled, ledger = collected, no double-counting); collection-rate KPI back on the dashboard from ledger actuals | PASS | `collections` filled from `rent_receipts` at `supabase/migrations/20260725021124_revenue_collected_integration.sql:66-84`; KPI unconditionally mounted at `src/components/dashboard/dashboard.tsx:13,148` |
| — | Scope fences (no payment rail · no auto late fee · no backfill · no tenant surface · `rent_due` untouched · no PG ENUM · no barrel) | PASS | `method` is nullable free text, commented "label only... never a payment rail" at `supabase/migrations/20260725020925_rent_ledger_schema.sql:114,122`; cron inserts `'rent'` only at `supabase/migrations/20260725020952_rent_charges_generation_cron.sql:75` |

## Findings

### Major

**F1 — A reversed past-due charge still counts as late.**
`supabase/migrations/20260725021100_rent_ledger_rpcs.sql:90-105`

The late predicate excludes reversal rows (`c.reverses_id is null`) but not the reversed
original. `reverse_charge` copies `type` and nets the paired receipts to zero
(`rpcs.sql:248,255-266`), so after a reversal the original still satisfies every late
predicate. Result: the balance strip renders "N late"
(`src/components/ledger/ledger-balance-strip.tsx:79-83`) while the balance is $0 and the
table shows no Late badge (`src/components/ledger/ledger-tab.tsx:86-93` treats it as
voided). This is precisely the client/SQL divergence the phase asserted could not happen.

**F2 — Ledger INSERT `WITH CHECK` never validates that the referenced lease/charge belongs
to the caller.**
`supabase/migrations/20260725020925_rent_ledger_schema.sql:93-94` (charges) and `:130-131`
(receipts)

Both policies check only `owner_user_id = auth.uid()`. `get_lease_ledger` /
`get_lease_ledger_summary` filter by `lease_id` alone
(`supabase/migrations/20260725021100_rent_ledger_rpcs.sql:79,158`), so owner B who knows
owner A's lease UUID can append a row that folds into A's balance — and append-only means A
can never remove it. The receipts-side facet of the same defect (C2 filed it as minor): no
constraint or trigger requires `rent_receipts.charge_id`'s charge to share the row's
`lease_id`/`owner_user_id`, and the per-charge `receipts_sum` subquery
(`rpcs.sql:153-155`) is neither lease- nor owner-scoped, so a foreign `charge_id` inflates
another owner's charge in the entries stream while the lease-scoped summary RPC
(`rpcs.sql:81-83`) stays unchanged — an internal drift between the two RPCs. Exploitation
requires guessing a v4 UUID and discloses nothing, which is why C2 rated its half minor;
the write-into-another-owner's-balance half is a major. The isolation suite only covers the
forged-`owner_user_id` variant (`tests/integration/rls/rent-ledger-isolation.test.ts:305-341`).

### Minor

**F3 — Mid-month track-since generates a full-month charge dated before the start date.**
`supabase/migrations/20260725020952_rent_charges_generation_cron.sql:65`

`date_trunc('month', ledger_start_date)` floors track-since to the 1st, so
`ledger_start_date = 2026-07-20` yields a `period_start = 2026-07-01` full rent charge
whose `due_date` is already past grace. Deviates from D-04's literal "only produces charges
for periods on/after `ledger_start_date`" (`55-CONTEXT.md:44`). If the owner's
`type='opening'` balance already includes that month's unpaid rent, the month is
double-counted in the running balance. Disclosed in the track-since dialog copy
(`55-06-SUMMARY.md:75`), so deliberate rather than silent backfill — reported independently
by C1 and C3.

**F4 — `reverse_charge`/`reverse_receipt` do not reject a reversal row as the target.**
`supabase/migrations/20260725021100_rent_ledger_rpcs.sql:238,305`

The guards check only "is the target already reversed", not "is the target itself a
reversal". An authenticated owner calling the RPC directly on a reversal row posts a
positive re-charge, inflating balance and the collection KPI. The UI blocks it
(`src/components/ledger/ledger-table.tsx:98`); the server has no equivalent
`v_charge.reverses_id is null` check.

**F5 — Drift-guard docblock cites a migration filename that does not exist.**
`src/lib/ledger/ledger-math.ts:18-19` references `20260724140200_rent_ledger_rpcs.sql`;
the actual file is `20260725021100_rent_ledger_rpcs.sql`.

### Raised in verifier notes, not filed as findings

- **Collection-rate "scheduled" basis mismatch.** `get_collection_rate`
  (`supabase/migrations/20260725021100_rent_ledger_rpcs.sql:404`) and
  `get_revenue_trends_optimized` (`supabase/migrations/20260725021124_revenue_collected_integration.sql:56`)
  both sum `leases.rent_amount` rather than `rent_charges`, so the denominator counts
  non-onboarded leases that have zero generated charges — the ratio reads artificially low
  during rollout. Both casts are dollar-preserving (no 100× risk). C1 flagged this as the
  same class as deferred D3 and asked the synthesizer to confirm LEDGER-08's intent; it is
  recorded here as an open question, not a defect.
- **`lateAmount` is mapped but never rendered** (`src/hooks/api/query-keys/rent-ledger-keys.ts:104`);
  only `lateCount` surfaces.
- **No static guard against future `.update(`/`.delete(` on ledger tables** in
  `src/hooks/api/__tests__/rent-ledger-money.test.ts` — the DB triggers are the only
  backstop. Today's client surface has exactly two writes, both `.insert()`
  (`src/hooks/api/query-keys/rent-ledger-mutation-options.ts:149,172`).
- **Marketing guard softened deliberately:** `"rent tracking"` was removed from
  `BANNED_FEATURE_CLAIMS` in `src/app/__tests__/marketing-copy-landlord-only.test.ts` under
  that file's own "if the product genuinely ships this, remove it" rule. Every facilitation
  phrase ("rent collection", "collect rent", "autopay", "pay rent", "online payments")
  remains banned. Not a fence breach.

## Known and accepted

- **RLS integration suites are CI-gated on `E2E_OWNER_*` secrets.** `rent-ledger-isolation`,
  `-append-only` and `-generation` require `E2E_OWNER_EMAIL/PASSWORD` + `E2E_OWNER_B_*` plus
  the Supabase app vars, which are GitHub secrets not present locally (`.env.local` is
  deliberately untouched). They run in CI on the PR via the required `rls-security` check
  (`55-04-SUMMARY.md:119`). The money boundary was meanwhile proven directly on the live
  engine in a rolled-back transaction — integer `1800` produced `1800.00`, not `180000`,
  across three generated periods, with zero persistence afterward
  (`55-04-SUMMARY.md:104-114`).
- **D3 — the dashboard KPI bento tile stays labelled "Revenue."** It renders
  `stats.revenue.monthly` from `get_dashboard_stats` (active-lease MRR, point-in-time),
  while the collection-rate KPI beside it bases `scheduled` on `rent_charges` for the
  current month. Those numbers legitimately differ for any owner not tracking every lease,
  so printing "Scheduled" on both would assert a false equivalence — a worse honesty failure
  than the generic label. D-07's hard rule still holds: nothing sums the bento tile with a
  ledger figure, and the KPI is a ratio. Deferred with a defined resolution path
  (`deferred-items.md:116-147`).

## Out of scope held

All five fences verified clean: no payment rail (`method` is a bookkeeping text label, zero
Stripe/checkout/payment-intent/autopay/Connect/ACH-rail tokens anywhere in the ledger
surface), no automatic late-fee rule (late is derived-only; `late_fee` exists solely as a
manual line type), no history backfill (three INSERT sites total, `generate_series` bounded
by track-since forward), no tenant surface (every `src/app/**` change is inside `(owner)`),
and `rent_due` untouched. No PG ENUM (`text` + CHECK), no barrel files added.
