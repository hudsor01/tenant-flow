---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: Correctness Restoration
status: executing
last_updated: "2026-07-07T02:57:08.843Z"
last_activity: 2026-07-07 -- Phase 27 execution started
progress:
  total_phases: 11
  completed_phases: 2
  total_plans: 21
  completed_plans: 14
  percent: 18
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v8.0):** Every core operation an owner performs — create a lease, delete a unit, view the leases list, sign a document, pay an invoice, upload a photo, run a report — produces correct data and correct behavior. This milestone eradicates the full set of real bugs surfaced by the 2026-07-02 whole-codebase hunt (12 parallel domain agents; every P0 and every cross-owner/DB claim verified against source + the live Supabase DB). Nothing new is built; every requirement restores an existing feature to correct behavior.
**Current focus:** Phase 27 — maintenance-inspections

## Current Position

Phase: 27 (maintenance-inspections) — REVIEW-PASSED (perfect-PR gate met, cycles 10+11)
Plan: 7 of 7 (execution + review complete)
Status: Executing Phase 27
Last activity: 2026-07-07 -- Phase 27 execution started

## Roadmap Summary (v8.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 25. Critical: Corruption & Broken Deletes | Stop 100× money corruption on lease create + document template; restore unit + lease delete | CRIT-01..04 |
| 26. Lease Domain Correctness | Leases list/renew/sign/status/pagination show + persist correct data | LEASE-01..08 |
| 27. Maintenance & Inspections | Kanban drag/search, list actions/delete/pagination, inspection photos + upload | MAINT-01..08, INSP-01..02 |
| 28. Tenant Domain | Real deletes, correct lease navigation, status persistence, current-lease selection | TEN-01..06 |
| 29. Billing, Stripe & Financial Reports | Correct period-end, period-scoped statements, invoice amounts, matching PDFs | BILL-01..05 |
| 30. Analytics & Data-Layer Correctness | Occupancy analytics, soft-delete filtering, cache invalidation, virtualizer | DATA-01..03, PROP-01..03 |
| 31. Forms Behavior Correctness | Unsaved-guard, contact send, no render loop, saved fields, validators, single toast | FORMFIX-01..08 |
| 32. Shared UI, Data-Table & Uploads | Working filters/pagination, single-upload, search sanitize, error messages, taxonomy | UIX-01..05, PROP-04..05 |
| 33. Security & Delivery Config | Server-side MFA, CSP image allowance, remove public cache on auth routes | SEC-01..03 |
| 34. Marketing, Blog & SEO Surface | OG images, blog pagination, 404 honesty, search contract, cross-links | MKT-01..05 |
| 35. TZ Sweep, Bulk-Import, Scripts & Hygiene | Local-zone dates, currency/status import, script + migration hygiene | MISC-01..04, TZ-01..03 |

## Blockers

None. (Phase 25 #882 + Phase 26 #883 merged to main + deployed to prod 2026-07-06.)

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" archived (15 phases).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 34/34).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 12/12).
- 2026-06-07: v4.0 "Hardening & Hygiene" shipped + archived (8 phases, 20/21).
- 2026-06-10: v5.0 "AI Blog Content Engine" shipped + archived (6 phases 9-14, 9/9).
- 2026-06-14: v6.0 "Final Canonical Cleanup" roadmap created (5 phases 15-19, 24 requirements); resolved/verified 2026-06-19.
- 2026-06-25: v7.0 "TanStack Form Composition Migration" started (5 phases 20-24, FORM-01..13). Paused mid-flight 2026-07-02 (phases 20-22 merged, 23-24 open); plan archived to `.planning/milestones/v7.0-{REQUIREMENTS,ROADMAP}.md`.
- 2026-07-02: v8.0 "Correctness Restoration" started (11 phases 25-35, 56 requirements) — bug-eradication milestone scoped from the 2026-07-02 whole-codebase hunt.

## Next Action

Phase 25 (CRIT-01..04) is executed, verified, and REVIEW-PASSED (perfect-PR gate met — cycles 8+9 zero-finding) on branch `milestone/v8.0-correctness`. 9 migrations are applied to prod (additive CHECK values + RPC/trigger inactive-exclusion); the PR carries the migration files for repo↔prod parity. Residual (non-gating): manual UI eyeball of the two money-display flows (`/leases/new`, `/documents/lease-template`). Next: user reviews + merges the PR, then plan **Phase 26** (Lease Domain Correctness) via `/gsd-plan-phase 26`. Note: PROP-01 (Phase 30) already tracks the pre-existing `unitQueries.byProperty` invalidation gap surfaced during review.

## Overrides

(none active)

---
*Last updated: 2026-07-02 — v8.0 "Correctness Restoration" started; REQUIREMENTS (56 reqs) + ROADMAP (11 phases 25-35) authored. v7.0 paused mid-flight, plan archived. Integer phase numbers continue across milestones (v7.0 ended at 24; v8.0 is 25-35). Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
