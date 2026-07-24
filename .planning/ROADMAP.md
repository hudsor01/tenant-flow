# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02)
- ✅ **v3.0 Security Hardening** — Phases 1-3 (shipped 2026-06-02)
- ✅ **v4.0 Hardening & Hygiene** — Phases 1-8 (shipped 2026-06-07)
- ✅ **v5.0 AI Blog Content Engine** — Phases 9-14 (shipped 2026-06-10)
- ✅ **v6.0 Final Canonical Cleanup** — Phases 15-19 (shipped 2026-06-15)
- ⏸ **v7.0 TanStack Form Migration** — Phases 20-24 (paused: 20-22 merged)
- ✅ **v8.0 Correctness Restoration** — Phases 25-35 (shipped 2026-07-10)
- ✅ **v9.0 Full-Surface Remediation** — Phases 36-51 (shipped 2026-07-17)
- 🚧 **v10.0 Claims Integrity + Canonical Feature Expansion** — Phases 52-64 (active)

Archived roadmaps/requirements for v1.0–v9.0 live in `.planning/milestones/` (v9.0 at `milestones/v9.0-ROADMAP.md`).

## Overview

v10.0 closes the four verified claims-vs-code gaps from the 2026-07-19 feature audit (renewal reminders sold but undelivered, e-sign metering absent, storage quotas unenforced, dishonest SMS/push toggles), surfaces the built-but-orphaned backend (notification center, activity feed), consolidates the three duplicated financial-reporting surfaces into one hub, and ships the canonical landlord feature set (rent ledger, rental applications, tenant comms log, notice library, compliance tracking, Schedule E intelligence, owner digest, unit turnover) — every feature strictly within Next.js 16 idioms and the permanent positioning invariants (tenants are records not users, no rent-payment facilitation, no screening, no service worker). The build order is dependency-respecting: the notification write-path lands first (nearly every later feature calls `create_notification`), claims-integrity and the queue-drain-Resend delivery pattern come next, the rent ledger lands before any reporting/digest work so no metric gets re-fabricated, and the two highest-liability items (notice library, unit turnover) come last so every upstream primitive is already proven.

## Phases

**Phase Numbering:** Integer phases only (project convention — never decimals). Phase numbers continue across milestones; v9.0 ended at Phase 51, so v10.0 runs 52-64.

- [x] **Phase 52: Notification Center, Activity Feed & Channel Honesty** - Surface the orphaned `notifications`/`activity` backend as a bell + inbox + dashboard timeline; remove dishonest SMS/push toggles; drop orphan schema (completed 2026-07-19)
- [x] **Phase 53: Renewal Reminder Delivery** - Deliver the sold Growth/Max lease-renewal reminders in-house (edge fn draining `lease_reminders`), exactly-once, suppression-honoring, backlog dry-run gated (completed 2026-07-22)
- [ ] **Phase 54: E-sign & Storage Metering** - Enforce the sold e-sign (25/mo Growth) and storage quotas with visible usage + upgrade prompts; grandfather existing over-quota owners
- [ ] **Phase 55: Rent Ledger** - Record-keeping ledger (expected charges, recorded receipts, running balance, late flags) that unlocks honest revenue analytics — no payment facilitation
- [ ] **Phase 56: Reporting Hub & Documents Landing** - Collapse `/financials/*` + `/analytics/financial` + `/reports/*` into one `/reports` hub with preserved tier-gating; make `/documents` a real landing page
- [ ] **Phase 57: Rental Application Intake** - Public `/apply/[token]` intake (no accounts, no SSN, no screening) with owner review queue + convert-to-tenant
- [ ] **Phase 58: Tenant Communication Log** - Owner-side comms timeline: logged notes/calls + auto-logged suppression-honoring email from the app
- [ ] **Phase 59: State-Aware Notice Library** - Counsel-reviewed, state-aware notices on the lease-template rails, saved to the vault with a service date (curated launch states)
- [ ] **Phase 60: Compliance & Key-Date Tracking** - Track per-property key dates (insurance/license/tax/inspection) with reminders through the shared reminder rail
- [ ] **Phase 61: Schedule E Expense Intelligence** - Map expenses to Schedule E lines, attach receipt photos, export a Schedule E annual report; reconcile the expenses money-type mismatch
- [ ] **Phase 62: Scheduled Owner Digest** - Monthly ledger-backed email digest (occupancy, collected vs scheduled, expiring leases, open maintenance), exactly-once, opt-out honored
- [ ] **Phase 63: Unit Turnover Workflow** - Chain move-out inspection → auto-drafted maintenance → deposit worksheet → unit-ready, orchestrating existing subsystems
- [ ] **Phase 64: Claims Alignment & Marketing Truth** - Confirm-or-soften support claims (owner decision) and sweep marketing/pricing to truthfully reflect every shipped v10.0 capability

## Phase Details

### Phase 52: Notification Center, Activity Feed & Channel Honesty
**Goal**: The orphaned `notifications`/`activity` backend becomes user-facing (bell + inbox + dashboard timeline), the shared `create_notification` write-path exists for every later feature to call, dishonest notification channels are removed, and residual demolished-feature schema is cleaned.
**Depends on**: Nothing (first phase — establishes the notification write-path primitive)
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, ACT-01, ACT-02, HONEST-01, HONEST-02, CLEAN-01, CLEAN-02
**Success Criteria** (what must be TRUE):
  1. Owner sees a notification bell with a live unread count in the app-shell header and can open an inbox to mark items read/unread including mark-all-read (TanStack Query 60s poll, no Realtime)
  2. Product events (lease signed, renewal reminder sent, application received, maintenance created, digest sent) generate notifications via a `create_notification` RPC on the owner-scoped `notifications` table
  3. Owner sees a historical activity timeline on the dashboard sourced from `get_user_dashboard_activities`, visually disambiguated from the notification center (feed = historical, center = actionable read/unread)
  4. Settings no longer renders the SMS toggle or the browser-push toggle (no delivery infrastructure exists; in-app + email cover the need)
  5. Notifications are bounded by an archive-then-delete retention cron (3 AM window); the orphaned `payout_events` table and dead `docuseal_document_url` column are dropped
**Plans**: 8 plans
- [x] 52-01-PLAN.md — Notification write-path RPC + owner RLS reconcile (NOTIF-01)
- [x] 52-02-PLAN.md — Notification + activity event triggers + finalize-failed edge fn (NOTIF-04, ACT-01 write-path)
- [x] 52-03-PLAN.md — Retention cron + orphan schema reconcile (NOTIF-05, CLEAN-01/02)
- [x] 52-04-PLAN.md — Notification data layer: keys + mark-read mutations (NOTIF-02/03)
- [x] 52-05-PLAN.md — Notification bell + popover header island (NOTIF-02/03)
- [x] 52-06-PLAN.md — /notifications inbox page + E2E smoke (NOTIF-03)
- [x] 52-07-PLAN.md — Dashboard activity card (ACT-01/02)
- [x] 52-08-PLAN.md — Settings channel honesty (HONEST-01/02)
**UI hint**: yes

### Phase 53: Renewal Reminder Delivery
**Goal**: The renewal-reminder feature sold on Growth/Max is actually delivered in-house, exactly once, honoring every suppression layer, without storming a stale backlog at go-live.
**Depends on**: Phase 52 (writes an in-app notification per delivered reminder)
**Requirements**: REMIND-01, REMIND-02, REMIND-03, REMIND-04, REMIND-05
**Success Criteria** (what must be TRUE):
  1. A Growth/Max owner with an expiring lease receives an automated renewal-reminder email delivered by a `send-lease-reminders` Edge Function draining `lease_reminders` on pg_cron (dead n8n `wf-lease-reminder` hop removed)
  2. Each reminder is delivered exactly once per (lease, reminder_type) via a delivery-state column + `FOR UPDATE SKIP LOCKED` drain + Resend Idempotency-Key
  3. Reminder delivery honors all suppression layers — `notification_settings` opt-out, `email_suppressions`, and the re-ported synthetic-CI-owner guard
  4. Each delivered reminder also creates an in-app notification via the Phase 52 write-path
  5. Delivery is only enabled after a backlog dry-run counts and expires/clears queued `lease_reminders` (no reminder storm)
**Plans**: 4 plans
- [x] 53-01-PLAN.md — Migration A: delivery-state columns + notification_type CHECK extension + reminders_delivery_enabled flag (default OFF) + claim_lease_reminders RPC
- [x] 53-02-PLAN.md — send-lease-reminders drainer (bearer auth, flag gate, ordered suppression, new reminder email template, create_notification) + Deno branch-matrix test + config.toml/TYPE_VISUALS wiring
- [x] 53-03-PLAN.md — Deploy the drainer + Migration B drain cron (invoke_send_lease_reminders + cron.schedule) + invoke-secret wiring (still flag-OFF no-op)
- [x] 53-04-PLAN.md — Migration C go-flip (count → expire backlog without sending → drop n8n trigger/fn → flip flag LAST) + RLS integration test, behind a blocking go-live checkpoint
**Waves**: strictly sequential — Wave 1 (53-01) → Wave 2 (53-02) → Wave 3 (53-03 deploy) → Wave 4 (53-04 flip). Migration C physically cannot precede the deploy (encoded via depends_on).
**Gate**: REMIND-04 pre-flip backlog dry-run — delivery must not be enabled until the queued backlog is counted and cleared (Migration C, Plan 04, gated by a blocking human-verify checkpoint).

### Phase 54: E-sign & Storage Metering
**Goal**: The sold e-sign monthly cap and storage quotas are actually enforced with visible usage and upgrade prompts, while existing over-quota owners are grandfathered so nobody is retroactively locked out.
**Depends on**: Phase 52 (shares Settings surface / upgrade-prompt pattern; no hard dependency on 53)
**Requirements**: METER-01, METER-02, METER-03, METER-04
**Success Criteria** (what must be TRUE):
  1. Growth e-sign sends are metered at 25/month enforced race-safely (append-only `esign_events` + atomic count-and-insert RPC at the `lease-signature` send path after `checkTierEntitlement`); Max is unlimited
  2. Owner sees current-month e-sign usage in Settings and gets an upgrade prompt at/near the cap
  3. Owner sees storage usage vs plan quota in Settings, computed by an RPC summing `storage.objects.metadata->>'size'` across the owner's objects
  4. Uploads are soft-enforced against the plan quota with an upgrade prompt; a pre-launch over-quota population report gates enforcement and existing over-quota owners are grandfathered (never blocked from reads/downloads/deletes)
**Plans**: 7 plans
- [ ] 54-01-PLAN.md — E-sign metering DB layer: append-only `esign_events` + advisory-lock `meter_esign_send` RPC + `get_esign_usage_current_month` read RPC (METER-01)
- [ ] 54-02-PLAN.md — E-sign edge-fn hook: `meter_esign_send` at the `lease-signature` send path (send-only, D-02) + 402 over-cap upgrade CTA wiring (METER-01)
- [ ] 54-03-PLAN.md — Storage quota + usage DB layer: net-new `get_owner_storage_limit_gb` (Max -1) + path `storage_object_owner` resolver + `get_owner_storage_usage` SUM + `get_storage_usage_summary` read RPC (METER-03)
- [ ] 54-04-PLAN.md — Storage upload guard: BEFORE INSERT trigger on `storage.objects` + `users.storage_grandfathered_at` + `storage_enforcement_enabled` flag seeded OFF (METER-04)
- [ ] 54-05-PLAN.md — Settings usage widgets: e-sign + storage usage bars with 80% near-cap upgrade prompts + `formatBytes` GB fix (METER-02, METER-03)
- [ ] 54-07-PLAN.md — Storage upload-CTA client wiring: `plan_limit_exceeded:` StorageApiError detector + proactive `usageQueries.storage` pre-check → Upgrade toast, wired into the 3 real upload sites (documents, images, avatar) (METER-04)
- [ ] 54-06-PLAN.md — Grandfather snapshot go-flip gate: over-quota report → stamp grandfather → flip flag LAST, behind a blocking human-verify checkpoint (METER-04)
**Waves**: Wave 1 (54-01) → Wave 2 (54-02 edge hook, 54-03 storage DB — parallel) → Wave 3 (54-04 guard, 54-05 Settings UI — parallel) → Wave 4 (54-07 upload-CTA client wiring) → Wave 5 (54-06 go-flip gate). Migrations apply sequentially (shared `src/types/supabase.ts` regen); the go-flip ships LAST — after the client Upgrade-prompt path (54-07) — behind a blocking checkpoint, so enforcement never goes live without the upgrade prompt.
**Gate**: METER-04 pre-flip grandfather report — the over-quota owner population must be reported and grandfathered before upload enforcement flips on.
**UI hint**: yes

### Phase 55: Rent Ledger
**Goal**: Owner has a record-keeping rent ledger — expected charges from lease terms, recorded receipts, per-lease running balance, late flags — that becomes the single source of truth for honest "collected" revenue, with zero payment facilitation and zero money-boundary regressions.
**Depends on**: Phase 52 (notifications); sequenced before Phases 56 & 62 so no reporting/digest metric is re-fabricated
**Requirements**: LEDGER-01, LEDGER-02, LEDGER-03, LEDGER-04, LEDGER-05, LEDGER-06, LEDGER-07, LEDGER-08
**Success Criteria** (what must be TRUE):
  1. Monthly rent charges auto-generate from active lease terms into `rent_charges` via pg_cron in `numeric(10,2)` dollars, converting the integer `leases.rent_amount` boundary exactly once (no 100× regressions, `UNIQUE(lease_id, period_start)` idempotency)
  2. Owner can record payments received into `rent_receipts` (date, amount, method label — no payment rails) including partial payments as discrete entries, and add manual charge/credit lines
  3. Owner sees per-lease running balance (Σ charges − Σ receipts/credits) with unpaid past-due charges flagged late; ledger onboarding uses a "track since" date + opening balance (no history backfill)
  4. Ledger entries are append-only — corrections are reversal entries, never edits or deletes
  5. Revenue analytics adopt one revenue definition (lease-derived = scheduled, ledger = collected, no double-counting) and the collection-rate KPI returns to the dashboard from ledger actuals
**Plans**: TBD
**UI hint**: yes

### Phase 56: Reporting Hub & Documents Landing
**Goal**: The three duplicated financial-reporting surfaces collapse into one `/reports` hub with tier-gating provably intact, and `/documents` becomes a real landing page instead of a bare redirect.
**Depends on**: Phase 55 (hub launches with real ledger actuals, not a re-fabricated `collection_rate`)
**Requirements**: RPTHUB-01, RPTHUB-02, RPTHUB-03, RPTHUB-04, DOCS-01
**Success Criteria** (what must be TRUE):
  1. One unified `/reports` hub absorbs `/financials/*` and `/analytics/financial` under a single navigation entry (statements + analytics + exports in one surface)
  2. Every legacy financial/reporting URL (~15 routes) permanently 308-redirects to its hub equivalent via `next.config.ts` `redirects()` — no 404s, no `proxy.ts` involvement
  3. Premium report export tier-gating (`export-report` `PREMIUM_REPORT_TYPES`) is verified intact after consolidation, and E2E covers hub routes before legacy routes are removed
  4. `/documents` renders a real landing page (vault + lease template builder + printable templates entry points) instead of a bare redirect
**Plans**: TBD
**UI hint**: yes

### Phase 57: Rental Application Intake
**Goal**: Owner can collect standardized rental applications via a public hashed-token link — no applicant accounts, no SSN, no screening — and convert approved applicants into tenant records, with a real PII retention path.
**Depends on**: Phase 52 (owner notification on submission); independent of ledger/reporting
**Requirements**: APPLY-01, APPLY-02, APPLY-03, APPLY-04, APPLY-05, APPLY-06
**Success Criteria** (what must be TRUE):
  1. Owner generates a shareable application link for a vacant unit — 256-bit token stored SHA-256-hashed, public `/apply/[token]` page (mirrors `/sign/[token]`; route added to proxy `PUBLIC_ROUTES`)
  2. An applicant submits without an account via a `verify_jwt=false` Edge-Function-mediated insert (never an anonymous RLS INSERT) with per-IP rate limit + honeypot; SSN is never collected
  3. Owner reviews applications per unit through a new / reviewing / approved / rejected workflow, and approving converts the applicant into a tenant record with prefilled fields
  4. Applicant PII auto-purges for non-converted applications after a defined window (cron) and cascades on owner GDPR deletion
  5. The application surface explicitly discloses that screening/FCRA duties sit with the landlord and TenantFlow performs no screening
**Plans**: TBD
**UI hint**: yes

### Phase 58: Tenant Communication Log
**Goal**: Owner has an owner-side communication history on each tenant record — manually logged notes/calls plus email sent from the app that auto-logs — with no two-way tenant messaging surface.
**Depends on**: Phase 52 (notification write-path) + Phase 53 (Resend delivery rail)
**Requirements**: COMMS-01, COMMS-02, COMMS-03
**Success Criteria** (what must be TRUE):
  1. Owner can log a communication (note / call summary) on a tenant record with timestamp and type
  2. Owner can send an email to a tenant from the app via the Resend rail, auto-logged to the communication history and honoring suppression
  3. Tenant detail shows the full communication history chronologically
**Plans**: TBD
**UI hint**: yes

### Phase 59: State-Aware Notice Library
**Goal**: Owner can generate state-aware notices on the lease-template rails for a curated launch set of states, every notice carrying counsel-reviewed disclaimer copy, saved to the vault with a recordable service date.
**Depends on**: Phase 58 (notice delivery events write into the comms log); lease-template/PDF rails proven stable
**Requirements**: NOTICE-01, NOTICE-02, NOTICE-03
**Success Criteria** (what must be TRUE):
  1. Owner can generate state-aware notices (pay-or-quit, cure-or-quit, notice-of-entry, non-renewal) for a curated launch set of states on the lease-template rails
  2. Every generated notice carries counsel-reviewed "not legal advice — consult an attorney" disclaimer copy
  3. Generated notices save to the document vault against the lease/tenant with a recordable service/delivery date
**Plans**: TBD
**Gate**: NOTICE-02 ship-time counsel-review — disclaimer language and per-state template data must pass counsel review before merge.
**Research flag**: `/gsd-plan-phase 59 --research-phase` — per-state notice-period data + UPL-safe disclaimer language are jurisdiction-specific (MEDIUM confidence); align with the resolved ToS governing-law jurisdiction (Texas, MKTUI-02).
**UI hint**: yes

### Phase 60: Compliance & Key-Date Tracking
**Goal**: Owner can track key property dates and receive reminders through the exact same queue-drain-Resend rail proven in Phase 53, with each date attachable to the document vault.
**Depends on**: Phase 53 (reuses the reminder-drain/suppression infrastructure) + Phase 52 (in-app reminders)
**Requirements**: COMPLY-01, COMPLY-02
**Success Criteria** (what must be TRUE):
  1. Owner can track key dates per property (insurance expiry, license/registration renewal, property tax, inspection cadence) surfaced on a calendar/dashboard view
  2. Upcoming key dates trigger reminders through the shared reminder rail (email + in-app, exactly-once, suppression-honoring)
**Plans**: TBD
**UI hint**: yes

### Phase 61: Schedule E Expense Intelligence
**Goal**: Expense categories map to the canonical Schedule E line set, owners can attach receipt photos (metered against storage), a Schedule E annual report exports through the hub, and the expenses money-type mismatch is reconciled without a 100× regression.
**Depends on**: Phase 54 (receipts consume the storage quota) + Phase 56 (export rides the reporting-hub export rails)
**Requirements**: TAX-01, TAX-02, TAX-03, TAX-04
**Success Criteria** (what must be TRUE):
  1. Expense categories map to the canonical Schedule E line set (lines 5–19, Stessa/Landlord Studio-aligned)
  2. Owner can attach a receipt photo to an expense via the existing upload rail, counting toward the storage quota
  3. Owner can export a Schedule E-grouped annual report through the reporting hub export rails
  4. The prod `expenses.amount integer` vs `numeric(10,2)` convention is resolved at schema time with exact conversion (no 100× class regressions)
**Plans**: TBD
**Research flag**: `/gsd-plan-phase 61 --research-phase` — the `expenses.amount` integer-vs-numeric reconciliation (migrate the column vs handle at a typed-mapper boundary) is a planning-time decision.
**UI hint**: yes

### Phase 62: Scheduled Owner Digest
**Goal**: Owner receives a monthly email digest built from real ledger-backed numbers, delivered exactly once with opt-out honored, reusing the proven drain + PDF rails.
**Depends on**: Phase 55 (ledger actuals) + Phase 56 (single revenue definition) + Phase 53 (drain pattern)
**Requirements**: DIGEST-01, DIGEST-02
**Success Criteria** (what must be TRUE):
  1. Owner receives a monthly email digest covering occupancy, collected vs scheduled rent from the ledger, expiring leases, and open maintenance, with opt-out via notification settings
  2. Digest generation is per-owner batched on the pg_cron → Edge Function → Resend rail with exactly-once delivery and suppression honoring
**Plans**: TBD

### Phase 63: Unit Turnover Workflow
**Goal**: Owner can run a unit turnover that chains inspection → maintenance → deposit worksheet → unit-ready as an advisory (non-gating) orchestration over five existing subsystems, built last so every subsystem it chains already exists.
**Depends on**: Phases 55 (deposit accounting), 57 (optional re-lease application link), 52 (notifications), plus existing inspection/maintenance/lease subsystems
**Requirements**: TURN-01, TURN-02, TURN-03
**Success Criteria** (what must be TRUE):
  1. Owner can start a turnover for a unit that chains a move-out inspection into maintenance requests auto-drafted from flagged rooms
  2. Turnover produces a deposit-deduction worksheet from inspection findings, saved to the document vault
  3. Turnover completes into unit-ready status with an optional next step (new lease or application link)
**Plans**: TBD
**Research flag**: `/gsd-plan-phase 63 --research-phase` — highest orchestration surface; the advisory non-gating state-machine design must be worked out concretely against the live inspection/maintenance/lease schemas.
**UI hint**: yes

### Phase 64: Claims Alignment & Marketing Truth
**Goal**: The milestone's core promise is verified — every claim sold on the marketing surface now maps to shipped code — by confirming-or-softening the support claims (owner decision) and sweeping marketing/pricing to truthfully reflect the shipped v10.0 capabilities.
**Depends on**: All prior v10.0 phases (marketing reflects everything shipped)
**Requirements**: HONEST-03, HONEST-04
**Success Criteria** (what must be TRUE):
  1. Growth/Max support claims (phone support, dedicated account manager) are either confirmed operationally real by the owner or the pricing/marketing copy is softened to match reality
  2. Marketing/pricing surfaces truthfully reflect the shipped v10.0 capabilities (renewal reminders now real, e-sign metering real, storage quotas real, notification center, rent ledger, rental applications)
**Plans**: TBD
**Gate**: HONEST-03 owner decision — surface phone-support / dedicated-AM staffing reality as a `/gsd-discuss-phase 64` input; the copy direction (confirm vs soften) is an owner call, not a blocker to the rest of the milestone.
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in strict numeric order: 52 → 53 → 54 → 55 → 56 → 57 → 58 → 59 → 60 → 61 → 62 → 63 → 64. Each phase branches only after the previous phase's PR is merged to main.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 52. Notification Center, Activity Feed & Channel Honesty | 8/8 | Complete    | 2026-07-21 |
| 53. Renewal Reminder Delivery | 4/4 | Complete    | 2026-07-23 |
| 54. E-sign & Storage Metering | 0/6 | Not started | - |
| 55. Rent Ledger | 0/TBD | Not started | - |
| 56. Reporting Hub & Documents Landing | 0/TBD | Not started | - |
| 57. Rental Application Intake | 0/TBD | Not started | - |
| 58. Tenant Communication Log | 0/TBD | Not started | - |
| 59. State-Aware Notice Library | 0/TBD | Not started | - |
| 60. Compliance & Key-Date Tracking | 0/TBD | Not started | - |
| 61. Schedule E Expense Intelligence | 0/TBD | Not started | - |
| 62. Scheduled Owner Digest | 0/TBD | Not started | - |
| 63. Unit Turnover Workflow | 0/TBD | Not started | - |
| 64. Claims Alignment & Marketing Truth | 0/TBD | Not started | - |

## Execution Disciplines (binding, phases 52-64)

1. **Strictly sequential** — each phase branches (`gsd/phase-{N}-{slug}`) only after the previous phase's PR is MERGED to main. Never stack phase branches. Many phases share surfaces (Settings, notification write-path, Resend rail, reporting export, money boundary) so a stacked branch could silently overwrite a prior fix.
2. **Perfect-PR gate per phase** — merge only after two consecutive zero-finding deep review cycles on the frozen final state (a mid-streak edit resets the streak). Deep review = architectural + design-token + a11y.
3. **Positioning invariants are load-bearing** — every phase must respect: tenants/applicants NEVER get accounts, NO rent-payment facilitation (ledger is record-keeping only), NO screening, no service worker with a fetch handler, no fabricated data, zero new npm runtime dependencies. A PR that violates any invariant fails review regardless of feature completeness.
4. **Money boundary discipline** — Phases 55 and 61 touch integer money columns (`leases.rent_amount`, `expenses.amount`) against the `numeric(10,2)`-dollars convention. Convert exactly once at a typed mapper boundary with cent-exact allocation property tests — the v8.0 100× bug class must not recur.
5. **Pre-flip gates before enabling delivery/enforcement** — REMIND-04 (backlog dry-run before reminder sends), METER-04 (over-quota grandfather report before upload enforcement), NOTICE-02 (counsel review before notices ship), HONEST-03 (owner decision before support-copy direction).
6. **Owner-run deployment residuals** — every phase introducing an edge function deploys via `bun scripts/deploy-edge-functions.ts` (CLI-401 workaround); every phase applying a migration via MCP reconciles the repo filename to the prod-assigned timestamp via `list_migrations`, then regenerates `src/types/supabase.ts`.

---
*Roadmap created 2026-07-19 for milestone v10.0. Phase numbers continue from v9.0 (ended Phase 51). 58 v10 requirements mapped across 13 phases (52-64) — 100% coverage, no orphans, no double-mapping. Note: the REQUIREMENTS.md coverage note previously read "46 total"; the enumerated REQ-IDs actually total 58 (all 16 categories counted), corrected during roadmap creation.*
