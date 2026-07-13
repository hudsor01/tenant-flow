# Phase 27 — Perfect-PR Review Log

**Gate:** two consecutive zero-finding review cycles.
**Method:** each cycle ran a Workflow fanning out 6 dimensions (kanban, table, stat, expenses, inspection-display, inspection-upload), each *reviewed* then independently *adversarially verified* against the live Supabase DB. Reviewed 2026-07-06/07.

## Why the review was deep (11 cycles)
Phase 27 is frontend-heavy over two complex, stateful surfaces — the maintenance kanban/table and the inspection photo-upload component. The findings cascaded: fixing the pagination (c1) exposed a rows-per-page gap (c2); moving stats to an RPC (c2) created an invalidation regression that only surfaced two cycles later (c5); and the inspection-upload component yielded a chain of lifecycle/concurrency edges (c2, c3, c8, c9). Each fix pass was re-reviewed, and the gate only closed once two consecutive cycles found nothing.

## Findings by cycle (all fixed unless deferred)
| Cycle | Findings | Disposition |
|-------|----------|-------------|
| 1 | MEDIUM pagination cosmetic (footer lied — manualPagination renders all rows); LOW table badge missed assigned/needs_reassignment (6th lockstep site); LOW stale mapper comment | fixed (slice pagination, badge, comment) |
| 2 | MEDIUM rows-per-page selector inert; MEDIUM stats computed over capped-50 list; LOW blob-URL leak; LOW double-toast; **HIGH expenses.amount money-convention** | 4 fixed; amount **deferred → BILL-06 (Phase 29)** |
| 3 | MEDIUM dropzone-rejected files (HEIC/oversized) silently dropped | fixed (onDropRejected feedback) |
| 4 | CLEAN | — |
| 5 | MEDIUM stats-invalidation regression (from c2 — drag + mutations didn't invalidate the new stats() query); LOW empty non-core kanban columns not droppable | fixed (invalidate stats everywhere; On Hold always-visible lane) |
| 6 | CLEAN | — |
| 7 | LOW Urgent KPI counted cancelled-urgent (diverged from urgent() list) | fixed (exclude cancelled) |
| 8 | LOW auto-close discarded a photo staged during the 1.5s window | fixed (gate auto-close + clear timer on unmount) |
| 9 | LOW retry double-fire race (duplicate storage object + DB row) | fixed (uploadingIdsRef synchronous guard) |
| 10 | CLEAN (all 6 dimensions verify-confirmed across the run + resumes) | — |
| 11 | CLEAN | — |

## Migrations added during review (3, applied to prod, repo↔prod byte-parity)
- `20260707031720_add_expenses_description` — MAINT-08 nullable `expenses.description` column.
- `20260707112443_extend_get_maintenance_stats_urgent_and_month` — added `urgent` + `completed_this_month` (local month-start param) to the stats RPC; DROP+CREATE, grants replicated.
- `20260707121808_fix_maintenance_stats_urgent_exclude_cancelled` — urgent excludes cancelled (unify with the list definition).

## Final state
- All 10 requirements (MAINT-01..08, INSP-01..02) delivered + verified. `get_maintenance_stats` now backs the KPI cards (accurate over the full owner set, local-timezone "this month"), invalidated on every status-changing path.
- The inspection-upload component hardened across 9 fixes: stable-id status keying, error+retry, skip-succeeded dedup, blob-revoke on unmount, single-toast, dropzone-reject feedback, gated auto-close, timer cleanup, retry double-fire guard.
- Gates: typecheck 0, lint 0, full unit suite green. Prod: 0 inactive rows. Live DB proofs on every migration.

## Deferred (captured, not dropped)
- **BILL-06 (Phase 29)** — `expenses.amount` is an `integer` column (rounds cents) read inconsistently as cents vs dollars across the /financials/* feature + summed by `::bigint` financial RPCs. Systemic financials-domain fix; the review independently confirmed the deferral is sound (spans ~10 readers + RPCs, pre-existing, outside Maintenance scope). The MAINT-08 description deliverable itself is correct.

## Note
Transient "Connection closed mid-response" API errors hit one verify agent per run in cycles 9-10; resolved by resuming the Workflow (cached agents replay, the failed one re-runs). Every dimension was verify-confirmed clean.
