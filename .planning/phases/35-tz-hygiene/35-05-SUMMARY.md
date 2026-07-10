# Phase 35 Summary — TZ Sweep, Bulk-Import, Scripts & Hygiene (FINAL v8.0 phase)

**Requirements:** TZ-01, TZ-02, TZ-03, MISC-01, MISC-02, MISC-03, MISC-04 — all shipped.
**Branch:** `phase/35-tz-hygiene`. **Migrations:** 1 (repo-reconciliation, no prod DDL change).
**Perfect-PR gate:** two consecutive fully-clean review cycles (cycles 4 & 5 on the frozen final state; cycles 1–2 each caught a real defect introduced by the change).

## What shipped

- **TZ-01** — Eradicated the date-only "one day early" class. Extracted `parseLocalYmd`/`formatLocalYmd` into `src/lib/formatters/date.ts` (were private in `documents-vault.client.tsx`) and converted every affected site: **display** sites route through `formatDate` (UTC-anchored — parse and format both pinned to UTC, so they cancel), **compute/persist** sites use the local helpers + `differenceInCalendarDays`. Highest-impact fix: lease *terminate* wrote `new Date().toISOString()` into the `date` column `end_date`, persisting *tomorrow* for evening negative-offset users → now `formatLocalYmd(new Date())`. Also fixed 6 sites the requirement list missed (maintenance date renders, wizard `calculateEndDate`, expense/schedule dialog defaults).
- **TZ-02** — `getDefaultDateRange` overflowed on month-end days (`setMonth` while day-of-month was still e.g. 31). Extracted pure `startOfMonthsBack(today, monthsBack)` that pins `setDate(1)` before the month shift; unit-tested with a Feb-target case that genuinely distinguishes fixed (Feb 1) from buggy (Mar 1).
- **TZ-03** — Dashboard revenue-vs-expenses chart hardcoded `expenses:0` (fake 100% margin) and collapsed 7d/30d to a single monthly bucket. Now joins **real** expenses from `get_expense_summary.monthly_totals` (typed boundary mapper, `YYYY-MM` join alongside the revenue RPC, `Promise.all`) and replaced the meaningless sub-month toggles with 3M/6M/1Y month windows. No day-level revenue exists in the schema, so **zero synthetic data** introduced.
- **MISC-01** — Lease bulk-import `.omit`'d `rent_currency` (Zod stripped the CSV value → forced USD); invalid tenant/unit status cells silently coerced to the default. Removed the omit (the shared 3-letter guard now validates client-side too) and pass status through to a strict enum so an invalid cell fails its row while a blank one still defaults. Two tests that *asserted the bug* were rewritten.
- **MISC-02** — Three bugs in the dormant continuous blog runner: kill-switch ignored (guard now first in `main()`), `acquireLock` TOCTOU (rewrote to rename-the-stale-lock-aside + **content-verify** the moved file is the observed stale one, restoring a live lock via exclusive `linkSync` — closes the two-reclaimer race the review caught in two passes), and the slug-brand gate ran on the pre-override slug (now re-gates after `applySlugOverride`, fails closed).
- **MISC-03** — `db-types.sh` merged the CLI's stderr into the generated types file (`2>&1`); now routes stderr to its own file, fails on any exit-0 warning, and leaves the EXIT trap armed so the `.err` temp is cleaned (not gitignored, unlike `.tmp`). Retired the orphaned `verify-seeds.sh` (queried dropped schema; nothing invokes it).
- **MISC-04** — Repo↔prod drift: the last repo `request_account_deletion` migration referenced dropped `users.user_type`/`public.rent_due`, so a fresh `db reset` would build a function that runtime-errors. Added `20260710220901_reconcile_request_account_deletion.sql` with the **verbatim live body** (`CREATE OR REPLACE` on the unchanged `()` signature — preserves ACLs, idempotent no-op on prod, already applied via MCP; filename reconciled to the prod-assigned timestamp).

## Review-caught defects (gate working as designed)

- **Cycle 1 (MISC-02, major):** the first lock fix (temp-write→rename→read-back) still let two racers both acquire (`P1.rename→P1.readback(true)→P2.rename→P2.readback(true)`). Fixed via rename-aside.
- **Cycle 2 (MISC-02, major):** rename-aside *still* had a read→rename window — a late reclaimer blindly renamed aside a faster racer's freshly-installed live lock. Closed with content-verify + `linkSync` restore. (MISC-03 minor: leftover `.err` temp — fixed.)
- **Cycles 3–5:** zero findings. Cycles 4 & 5 are the two consecutive clean cycles on the frozen final state.

## Verification
- `bun run typecheck` clean · `biome check` clean · full unit suite green (**102,454 tests, 245 files**).
- Migration applied via Supabase MCP + reconciled to the prod timestamp `20260710220901`.

## Residual / follow-ups (out of scope — do not drop)
- **Blog seed subsystem stale** — `supabase/seeds/*.sql` + `db:seed:{smoke,dev,perf}` in `package.json` are written against the dropped schema (`property_owners`/`property_owner_id`). Retiring `verify-seeds.sh` leaves this dead-but-present; a separate ticket should rewrite the seeds to `owner_user_id` or retire the whole seed subsystem.
- **acquireLock** — the pid-file lock is now race-free for the reported two-reclaimer scenario; a fundamental 3-process restore-window residual remains (documented, acceptable for a single-user internal script).

## Milestone
Phase 35 is the **final** phase of the **v8.0 Correctness Restoration** milestone (phases 25–35). All 56+ requirements from the 2026-07-02 whole-codebase bug hunt are now eradicated.
