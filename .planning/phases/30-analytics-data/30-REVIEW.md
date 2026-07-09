# Phase 30 — Perfect-PR Review Log

**Gate:** two consecutive zero-finding cycles. Method: a Workflow fanned out 5 dimensions (data02-db, data03, data01, prop01-02, prop03), each reviewed then adversarially verified — the DB dimensions re-proving against live prod each cycle. Reviewed 2026-07-08/09.

## Findings by cycle (all fixed) — 12 cycles
| Cycle | Findings | Fix |
|-------|----------|-----|
| 1 | occupancy chart time-reversed; tenant "past" stat dropped expired; tenant filter had no Expired option; leases-table was a 3rd unpositioned virtualized table | reverse trends (metrics still element[0]); count expired in the tile; add Expired filter; flex-row the leases table |
| 2 | lease form offered a non-writable "Expired" status | drop the option (matches the write union) |
| 3 | leases-page filter missing Expired (mirror of the tenant fix); grid/flex stripped ARIA roles on all 3 tables | add the option; restore roles on all 6 files (mirroring portfolio-data-table.tsx) |
| 4 | leases date line lacked `truncate` | add truncate |
| 5 | CLEAN (all 5) | — |
| 6 | occupancy chart discarded-fetch failure-coupling; orphaned mapLeaseAnalytics dead code; lease mutations didn't refresh the units table | drop the discarded fetch; delete 327 lines of dead code; broaden lease-mutation invalidation to unitQueries.all() (+ owner-sign + conflict path) |
| 7 | editing an expired lease showed a blank Status; leases rows overlapped sub-lg (fixed 72px vs 3-line cell) | disabled "Expired" option (displays, not selectable); measureElement for the variable-height leases rows |
| 8 | stale mapLeaseAnalytics comment + surplus tenant-report test mocks | doc/test hygiene |
| 9 | optimistic lease-delete omitted unitQueries.all() | add it (last of the invalidation class) |
| 10 | lease detail timeline had no Expired terminal event | add the event + type + icon/color |
| 11 | CLEAN (all 5) | — |
| 12 | DB `'expired'`-propagation class: `sync_unit_status_from_lease` didn't free a unit on expire (data-integrity); `get_occupancy_trends_optimized` + `get_revenue_trends_optimized` historical CTEs excluded expired; `get_billing_insights` churn omitted expired; `get_property_performance_cached` (dead) lacked the property status filter | one migration recreating all 5 to handle `'expired'` |
| 13 | `get_dashboard_stats` + `get_dashboard_data_v2` `leases.expired` count omitted `'expired'` (unread field, but the last of the class) | migration adding `'expired'` to both — DB-wide sweep now shows 0 stale predicates |
| 14 | CLEAN (all 5) | — |
| 15 | CLEAN | — |

Recurring theme: three cross-cutting mechanisms (the DATA-03 `LeaseStatus` widening, the PROP-03 flex-row virtualizer rework, and the DATA-01 occupancy-array rewire) each rippled into **runtime consumers, a11y semantics, sibling mutations, and dead code that typecheck can't see** — reversed chart axis, stat/filter/timeline lockstep sites, stripped ARIA roles, a third+fourth virtualized-mutation sibling, orphaned mappers. The adversarial sweeps caught each; proactive class-sweeps (all occupancy-changing mutations; all `lease_status` branches) closed the tails. (A recurring spurious subagent glitch echoing injected skill boilerplate was neutralized by a reviewer-guard preamble.)

## Migrations (2, applied to prod, verified live, repo↔prod parity)
- `20260709000354` — `get_property_performance_with_trends` + `get_property_performance_trends` gain `p.status <> 'inactive'` (CREATE OR REPLACE; `_analytics` untouched — Phase 29's numeric+status preserved, verified byte-identical).
- `20260709000406` — `get_lease_stats` expiredLeases filter `'ended'` → `'expired'` (the bucket the expire-leases cron actually sets).

## Requirements delivered
- **DATA-01** — occupancy analytics consume the RPC's jsonb array (were parsed as an object → empty); trends render oldest→newest, metrics from the latest month.
- **DATA-02** — soft-deleted properties excluded from the two remaining per-property trend RPCs.
- **DATA-03** — the "Expired" lease tile counts `lease_status='expired'`; `LeaseStatus` union widened with `'expired'` across every lockstep site + runtime consumer (stats, both filters, badges).
- **PROP-01** — unit mutations invalidate `unitQueries.all()` so the property-detail units table refreshes.
- **PROP-02** — `useUpdatePropertyMutation` invalidates `ownerDashboardKeys.all` (the dashboard's real key) instead of the never-queried `analytics.stats()`.
- **PROP-03** — all three virtualized tables (property, tenant, **and leases**) position rows via the shared flex-row helper with header-aligned columns and restored ARIA roles.

## Verification
- typecheck 0, lint 0, full unit suite green (102,214). Live DB proofs on both migrations. Prod left clean.

## Follow-ups (captured, out of scope — candidates for a later phase)
1. **lease/overview analytics mis-wire** — `leasePageData`/`overviewPageData` are fed the occupancy RPC (no lease-financial source exists); occupancy is derived into vacancyTrends, lease-financial sub-shapes stay empty. Needs a real lease-analytics data source.
   - **DATA-04 (dashboard historical-CTE accuracy, discovered cycle 15)** — `get_dashboard_data_v2`'s trend/time-series CTEs (live-rendered) + the caller-less `get_dashboard_time_series`/`get_metric_trend` filter historical windows on the CURRENT `lease_status='active'`, dropping since-ended/expired leases from past periods. Pre-existing (predates 'expired', undercounts ended too — NOT a Phase-30 regression; never touched here), latent (prod all-draft), distinct from DATA-03's status handling. Align with the standalone trend RPCs' `IN ('active','ended','expired')` in a focused plan.
2. **tenant report turnover/on-time-payment** — read non-existent fields off the occupancy RPC; hardcoded 0 with a comment. No real source today.
3. **`LeaseActionButtons` + `useDeleteLeaseOptimisticMutation`** — the component is rendered nowhere (dead); its mutation's invalidation was fixed defensively here, but the component itself (incl. its uppercase-key `getStatusBadge` bug) is pre-existing dead code — candidate for deletion in a cleanup phase.

## DB `'expired'`-propagation (delivered — migration `20260709044800`)
Cycle 12's adversarial sweep found that DATA-03 formalized `'expired'` as first-class but several DB functions/triggers predating the expire-leases cron special-cased only `'ended'`/`'terminated'`. Audited every DB function referencing `'ended'`/`'terminated'`; `get_dashboard_stats`/`get_dashboard_data_v2` already handled `'expired'`. Fixed the 5 that didn't: the unit-sync trigger (frees the unit on expire), occupancy + revenue historical CTEs (count expired periods), billing churn, and the dead cached RPC (property status filter). This closes the whole class.

## Adjudicated non-defects (settled during review)
- **get_financial_overview expense join** does NOT filter `p.status <> 'inactive'` — INTENTIONAL. The primary expense aggregator `get_expense_summary` joins expenses->maintenance_requests by owner with no property join at all (includes soft-deleted-property expenses per the financial-records-retention convention); `get_financial_overview` matches it. Filtering it would diverge the financials-page total from the expense breakdown and drop retained records. Also a Phase-29 (BILL-02) function, untouched here. Financial/expense AGGREGATION is owner-level; only PER-PROPERTY PERFORMANCE analytics filter property status. Not changed.
- **get_dashboard_time_series / get_metric_trend** occupancy-branch property-status omission: caller-less (no .rpc() consumer), pre-existing → folded into DATA-04.
