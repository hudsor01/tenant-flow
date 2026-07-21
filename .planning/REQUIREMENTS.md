# Requirements: TenantFlow v10.0 Claims Integrity + Canonical Feature Expansion

**Defined:** 2026-07-19
**Source:** 2026-07-19 full feature audit (3 parallel sweeps: app routes/UI, backend/data layer, marketing claims — cross-verified) + `.planning/research/` (STACK/FEATURES/ARCHITECTURE/PITFALLS/SUMMARY, all HIGH confidence, Next.js 16 idioms verified against official docs).
**Core Value:** Every claim sold on the marketing surface is delivered end-to-end in the product; the built-but-unshipped backend becomes user-facing features; the canonical landlord feature set ships within Next.js 16 idioms — extending, never violating, landlord-only / no-rent-facilitation / tenants-are-records positioning.

**Positioning invariants (every requirement must respect):** tenants/applicants NEVER get accounts; NO rent payment facilitation (ledger is record-keeping only); NO screening; no service worker with a fetch handler (permanent ban); no fabricated data; zero new npm runtime dependencies (research-verified — every feature rides an existing rail).

## v10 Requirements

### Track A — Claims Integrity

#### Renewal Reminder Delivery (REMIND)

- [ ] **REMIND-01**: Growth/Max owner receives automated lease-renewal reminder emails, delivered in-house by a `send-lease-reminders` Edge Function draining `lease_reminders` on pg_cron (dead n8n hop `wf-lease-reminder` removed)
- [ ] **REMIND-02**: Each reminder is delivered exactly once per (lease, reminder_type) — delivery-state column (`delivery_status`/`delivered_at`) added to `lease_reminders`, `FOR UPDATE SKIP LOCKED` drain, Resend Idempotency-Key
- [ ] **REMIND-03**: Reminder delivery honors ALL suppression layers — `notification_settings` opt-out, `email_suppressions`, and the synthetic-CI-owner guard currently embedded in the `notify_n8n_lease_reminder` trigger (re-ported, not dropped)
- [ ] **REMIND-04**: Delivery flip is gated on a backlog dry-run — queued `lease_reminders` backlog counted and expired/cleared before enabling sends (no reminder storm)
- [ ] **REMIND-05**: Each delivered reminder also creates an in-app notification via the notification write path

#### Metering & Quotas (METER)

- [ ] **METER-01**: Growth e-sign sends are metered at 25/month enforced race-safely (append-only `esign_events` + atomic count-and-insert RPC) at the `lease-signature` send path after `checkTierEntitlement`; Max is unlimited
- [ ] **METER-02**: Owner sees current-month e-sign usage and receives an upgrade prompt when at/near the cap
- [ ] **METER-03**: Owner sees storage usage vs plan quota in Settings, computed by RPC as `SUM((storage.objects.metadata->>'size')::bigint)` over the owner's objects across all buckets
- [ ] **METER-04**: Uploads are soft-enforced against the plan quota with an upgrade prompt; existing over-quota owners are grandfathered (pre-launch over-quota population report gates enforcement; no retroactive lockout)

#### Honesty (HONEST)

- [x] **HONEST-01**: SMS notification toggle removed from Settings (no SMS delivery infrastructure exists)
- [x] **HONEST-02**: Browser-push notification toggle removed (Web Push cut — requires a service worker; in-app notification center + email cover the need)
- [ ] **HONEST-03**: Growth/Max support claims (phone support, dedicated account manager) confirmed by owner as operationally real, or pricing/marketing copy softened to match reality
- [ ] **HONEST-04**: Marketing/pricing surfaces updated to truthfully reflect v10.0 capabilities as they ship (renewal reminders now real, e-sign metering real, storage quotas real, notification center, rent ledger, applications)

### Track B — Ship the Orphaned Backend

#### Notification Center (NOTIF)

- [x] **NOTIF-01**: `create_notification` write-path RPC + owner-scoped RLS exist on the `notifications` table (mirrors `sign_lease_with_token` atomic-insert pattern) — the shared write path all v10.0 features use
- [x] **NOTIF-02**: Owner sees a notification bell with unread count in the app-shell header (client island, TanStack Query `refetchInterval` 60s — no Supabase Realtime)
- [x] **NOTIF-03**: Owner can open a notification inbox and mark items read/unread including mark-all-read
- [x] **NOTIF-04**: Product events generate notifications (lease signed, renewal reminder sent, application received, maintenance created, digest sent)
- [x] **NOTIF-05**: Notifications have bounded retention via an archive-then-delete cleanup cron (3 AM window, consistent with existing retention jobs)

#### Activity Feed (ACT)

- [x] **ACT-01**: Owner sees a historical activity timeline on the dashboard sourced from the existing `activity` table / `get_user_dashboard_activities` RPC
- [x] **ACT-02**: One design pass disambiguates notification center (actionable, read/unread) from activity feed (historical timeline) so the two surfaces do not duplicate

#### Orphan Cleanup (CLEAN)

- [x] **CLEAN-01**: Orphaned `payout_events` table dropped (residual from demolished Stripe Connect payouts; archive-then-delete)
- [x] **CLEAN-02**: Dead `docuseal_document_url` column dropped from `leases` (DocuSeal integration fully replaced by token e-sign)

### Track C — Consolidation

#### Reporting Hub (RPTHUB)

- [ ] **RPTHUB-01**: One unified reporting hub at `/reports` absorbs `/financials/*` and `/analytics/financial` (single navigation entry, statements + analytics + exports in one surface)
- [ ] **RPTHUB-02**: Every legacy financial/reporting URL (~15 routes) permanently redirects (308, `next.config.ts` `redirects()`) to its hub equivalent — no 404s, no proxy.ts involvement
- [ ] **RPTHUB-03**: Tier-gating on premium report exports (`export-report` `PREMIUM_REPORT_TYPES`) verified intact after consolidation — no route rewrite bypasses the gate
- [ ] **RPTHUB-04**: E2E coverage exists for hub routes before legacy routes are removed

#### Documents Landing (DOCS)

- [ ] **DOCS-01**: `/documents` renders a real landing page (vault + lease template builder + printable templates entry points) instead of a bare redirect

### Track D — Canonical Landlord Features

#### Rent Ledger (LEDGER)

- [ ] **LEDGER-01**: Monthly rent charges auto-generate from active lease terms into `rent_charges` via pg_cron (dollars `numeric(10,2)`; the integer `leases.rent_amount` boundary converted exactly once at generation, no 100× regressions)
- [ ] **LEDGER-02**: Owner can record a payment received against a charge into `rent_receipts` — date, amount, method label only (no payment rails); partial payments supported as discrete entries
- [ ] **LEDGER-03**: Owner sees per-lease running balance (Σ charges − Σ receipts/credits) and unpaid-past-due charges flagged late
- [ ] **LEDGER-04**: Ledger onboarding uses "track since" date + opening balance per lease (Stessa pattern — no history backfill required)
- [ ] **LEDGER-05**: Owner can add manual charge/credit lines (late fee, other) — manual only, no auto-late-fee rules in v10
- [ ] **LEDGER-06**: Ledger entries are append-only — corrections are reversal entries, never edits or deletes
- [ ] **LEDGER-07**: Revenue analytics adopt a single revenue definition — dashboards/reports label lease-derived figures as scheduled and ledger figures as collected, with no double-counting
- [ ] **LEDGER-08**: Collection-rate KPI restored to the dashboard from ledger actuals (the KPI v2.0 dropped for lack of honest data)

#### Rental Application Intake (APPLY)

- [ ] **APPLY-01**: Owner can generate a shareable application link for a vacant unit — 256-bit token stored SHA-256-hashed, public `/apply/[token]` page (mirrors `/sign/[token]`; route added to proxy `PUBLIC_ROUTES`)
- [ ] **APPLY-02**: Applicant submits a standard application without an account via a `verify_jwt=false` Edge-Function-mediated insert (never anonymous RLS INSERT) with per-IP rate limit + honeypot; SSN is NOT collected
- [ ] **APPLY-03**: Owner reviews applications per unit with status workflow (new / reviewing / approved / rejected)
- [ ] **APPLY-04**: Approving an application converts the applicant into a tenant record with prefilled fields
- [ ] **APPLY-05**: Applicant PII has a retention policy — auto-purge of non-converted applications after a defined window (cron) + cascade on owner GDPR deletion
- [ ] **APPLY-06**: Screening responsibility is explicitly disclaimed on the application surface (FCRA duties sit with the landlord; TenantFlow performs no screening)

#### Tenant Communication Log (COMMS)

- [ ] **COMMS-01**: Owner can log a communication (note / call summary) on a tenant record with timestamp and type
- [ ] **COMMS-02**: Owner can send an email to a tenant from the app via the Resend rail, auto-logged to the communication history (suppression-honoring)
- [ ] **COMMS-03**: Tenant detail shows the full communication history chronologically

#### Notice Library (NOTICE)

- [ ] **NOTICE-01**: Owner can generate state-aware notices (pay-or-quit, cure-or-quit, notice-of-entry, non-renewal) for a curated launch set of states on the lease-template rails
- [ ] **NOTICE-02**: Every generated notice carries counsel-reviewed "not legal advice — consult an attorney" disclaimer copy (ship-time legal review gate)
- [ ] **NOTICE-03**: Generated notices save to the document vault against the lease/tenant with a recordable service/delivery date

#### Compliance & Key Dates (COMPLY)

- [ ] **COMPLY-01**: Owner can track key dates per property (insurance expiry, license/registration renewal, property tax, inspection cadence)
- [ ] **COMPLY-02**: Upcoming key dates trigger reminders through the shared reminder rail (email + in-app, exactly-once, suppression-honoring)

#### Schedule E Expense Intelligence (TAX)

- [ ] **TAX-01**: Expense categories map to the canonical Schedule E line set (lines 5–19, Stessa/Landlord Studio-aligned)
- [ ] **TAX-02**: Owner can attach a receipt photo to an expense (existing upload rail; counts toward storage quota)
- [ ] **TAX-03**: Owner can export a Schedule E-grouped annual report through the reporting hub export rails
- [ ] **TAX-04**: Expense money semantics reconciled — prod `expenses.amount` integer vs `numeric(10,2)` convention resolved at schema time with exact conversion (no 100× class regressions)

#### Owner Digest (DIGEST)

- [ ] **DIGEST-01**: Owner receives a monthly email digest (occupancy, collected vs scheduled rent from the ledger, expiring leases, open maintenance), opt-out via notification settings
- [ ] **DIGEST-02**: Digest generation is per-owner batched on the pg_cron → Edge Function → Resend rail with exactly-once delivery and suppression honoring

#### Unit Turnover (TURN)

- [ ] **TURN-01**: Owner can start a turnover for a unit that chains move-out inspection → maintenance requests auto-drafted from flagged rooms
- [ ] **TURN-02**: Turnover produces a deposit-deduction worksheet from inspection findings, saved to the document vault
- [ ] **TURN-03**: Turnover completes into unit-ready status with an optional next step (new lease or application link)

## v2 Requirements (Deferred)

### AI Document Intelligence (AIDOC)

- **AIDOC-01**: Vault uploads auto-categorized — conflicts with the documented PROJECT.md Out of Scope entry ("Auto-categorization of documents — v2.6 deferred indefinitely"); revisiting requires explicit owner decision
- **AIDOC-02**: Key-term extraction from uploaded lease PDFs into lease records — same infrastructure family (local LLM/RAG exists for blog); defer until AIDOC-01 decision

### Notice Library Expansion (NOTICE)

- **NOTICE-04**: Full 50-state notice coverage — launch is a curated subset; expansion is content/legal sourcing, not engineering

## Out of Scope

| Feature | Reason |
|---------|--------|
| Tenant portal / tenant or applicant accounts | Positioning invariant — tenants are records, never users |
| Rent payment facilitation (ACH, autopay, cards) | Demolished April 2026 by design; ledger is bookkeeping only |
| Tenant screening / background checks | Never built; FCRA liability sits with landlord; APPLY-06 disclaims |
| SMS notifications | No provider; toggle removed (HONEST-01), not built |
| Web Push / any service worker | SW permanently banned after stale-chunk prod incident; in-app center + email cover it |
| Auto-late-fee rules | Statutory-cap/dispute risk; competitors treat late fees as manual charge lines (LEDGER-05) |
| SSN collection on applications | Pure liability without screening; deliberate divergence from TurboTenant/Avail |
| Supabase Realtime for notifications | Polling suffices at this urgency level; keeps client model consistent |
| New npm runtime dependencies | Research-verified zero needed; every feature rides an existing rail |
| `cacheComponents` / `'use cache'` adoption | No payoff for the client-fetch data model; keep current Next.js 16 config |

## Traceability

Populated by roadmap creation (2026-07-19). Every v10 requirement maps to exactly one phase (52-64). No orphans, no double-mapping.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NOTIF-01 | Phase 52 | Complete |
| NOTIF-02 | Phase 52 | Complete |
| NOTIF-03 | Phase 52 | Complete |
| NOTIF-04 | Phase 52 | Complete |
| NOTIF-05 | Phase 52 | Complete |
| ACT-01 | Phase 52 | Complete |
| ACT-02 | Phase 52 | Complete |
| HONEST-01 | Phase 52 | Complete |
| HONEST-02 | Phase 52 | Complete |
| CLEAN-01 | Phase 52 | Complete |
| CLEAN-02 | Phase 52 | Complete |
| REMIND-01 | Phase 53 | Pending |
| REMIND-02 | Phase 53 | Pending |
| REMIND-03 | Phase 53 | Pending |
| REMIND-04 | Phase 53 | Pending |
| REMIND-05 | Phase 53 | Pending |
| METER-01 | Phase 54 | Pending |
| METER-02 | Phase 54 | Pending |
| METER-03 | Phase 54 | Pending |
| METER-04 | Phase 54 | Pending |
| LEDGER-01 | Phase 55 | Pending |
| LEDGER-02 | Phase 55 | Pending |
| LEDGER-03 | Phase 55 | Pending |
| LEDGER-04 | Phase 55 | Pending |
| LEDGER-05 | Phase 55 | Pending |
| LEDGER-06 | Phase 55 | Pending |
| LEDGER-07 | Phase 55 | Pending |
| LEDGER-08 | Phase 55 | Pending |
| RPTHUB-01 | Phase 56 | Pending |
| RPTHUB-02 | Phase 56 | Pending |
| RPTHUB-03 | Phase 56 | Pending |
| RPTHUB-04 | Phase 56 | Pending |
| DOCS-01 | Phase 56 | Pending |
| APPLY-01 | Phase 57 | Pending |
| APPLY-02 | Phase 57 | Pending |
| APPLY-03 | Phase 57 | Pending |
| APPLY-04 | Phase 57 | Pending |
| APPLY-05 | Phase 57 | Pending |
| APPLY-06 | Phase 57 | Pending |
| COMMS-01 | Phase 58 | Pending |
| COMMS-02 | Phase 58 | Pending |
| COMMS-03 | Phase 58 | Pending |
| NOTICE-01 | Phase 59 | Pending |
| NOTICE-02 | Phase 59 | Pending |
| NOTICE-03 | Phase 59 | Pending |
| COMPLY-01 | Phase 60 | Pending |
| COMPLY-02 | Phase 60 | Pending |
| TAX-01 | Phase 61 | Pending |
| TAX-02 | Phase 61 | Pending |
| TAX-03 | Phase 61 | Pending |
| TAX-04 | Phase 61 | Pending |
| DIGEST-01 | Phase 62 | Pending |
| DIGEST-02 | Phase 62 | Pending |
| TURN-01 | Phase 63 | Pending |
| TURN-02 | Phase 63 | Pending |
| TURN-03 | Phase 63 | Pending |
| HONEST-03 | Phase 64 | Pending |
| HONEST-04 | Phase 64 | Pending |

**Coverage:**
- v10 requirements: 58 total (enumerated REQ-IDs across all 16 categories: REMIND 5, METER 4, HONEST 4, NOTIF 5, ACT 2, CLEAN 2, RPTHUB 4, DOCS 1, LEDGER 8, APPLY 6, COMMS 3, NOTICE 3, COMPLY 2, TAX 4, DIGEST 2, TURN 3)
- Mapped to phases: 58 ✓
- Unmapped: 0 ✓
- Double-mapped: 0 ✓

> **Count correction (2026-07-19):** the prior coverage note read "46 total." The actual enumerated REQ-IDs total **58**. All 58 are mapped across phases 52-64. The stale "46" figure is superseded.

---
*Requirements defined: 2026-07-19*
*Last updated: 2026-07-19 — traceability populated by roadmap creation; 58/58 mapped across phases 52-64; corrected the stale "46 total" coverage count to the actual 58.*
