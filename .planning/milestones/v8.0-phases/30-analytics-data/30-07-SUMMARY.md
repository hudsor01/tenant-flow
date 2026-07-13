# 30-07 Summary — Phase 30 verification + follow-ups

**Gate:** perfect-PR MET (review cycles 14+15 zero-finding across 5 dimensions; see 30-REVIEW.md — 15 cycles total). typecheck 0, lint 0, full unit suite green.

## Requirements delivered (DATA-01/02/03 + PROP-01/02/03)
- DATA-01 occupancy analytics consume the RPC jsonb array (trends oldest->newest, metrics from latest).
- DATA-02 `_with_trends` + `_trends` exclude soft-deleted properties (`_analytics` was Phase 29).
- DATA-03 `get_lease_stats` counts `lease_status='expired'`; `LeaseStatus` union + all lockstep sites handle expired.
- PROP-01 unit mutations invalidate `unitQueries.all()`; PROP-02 property update invalidates `ownerDashboardKeys.all`; PROP-03 all virtualized tables (property/tenant/leases) flex-row positioned + ARIA roles restored.

## Migrations (4, applied + verified live, repo↔prod parity)
`20260709000354` (_trends status filter), `20260709000406` (get_lease_stats expired), `20260709044800` (DB expired-propagation: trigger + occupancy/revenue/billing/cached), `20260709050956` (dashboard leases.expired).

## Bonus: DB `'expired'`-propagation (discovered by the review, beyond the original hunt)
Formalizing `'expired'` exposed that DB functions predating the expire-leases cron special-cased only `'ended'`/`'terminated'`. Fixed the whole class — most importantly `sync_unit_status_from_lease` (a lapsed lease now FREES its unit; was a latent data-integrity bug). DB-wide sweep: 0 functions still omit `'expired'`.

## Verification
- typecheck 0, lint 0, full unit suite green (102,214+). Live DB proofs on all 4 migrations (0 stale `IN('ended','terminated')` predicates remain). Prod left clean (all leases still `draft`; fixes are latent-correct until the cron produces expired leases).

## Follow-ups (captured, out of scope)
1. lease/overview analytics mis-wire (fed the occupancy RPC; needs a real lease-analytics source) — candidate DATA-04.
2. tenant report turnover / on-time-payment (no data source; hardcoded 0).
3. `LeaseActionButtons` + `useDeleteLeaseOptimisticMutation` — dead (never rendered); its invalidation was fixed defensively, but the component (+ its uppercase-key badge bug) is pre-existing dead code — candidate for deletion in a cleanup phase.
