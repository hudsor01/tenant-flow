# Roadmap: TenantFlow

## Overview

TenantFlow is a multi-tenant property management SaaS platform for property owners and managers. The roadmap follows milestone-grouped phases with continuous numbering across all versions.

## Milestones

<details>
<summary>v1.0 Production Hardening -- Phases 1-10 (shipped 2026-03-07)</summary>

- [x] Phase 1: RPC & Database Security (2/2 plans) -- completed 2026-03-04
- [x] Phase 2: Financial Fixes (7/7 plans) -- completed 2026-03-05
- [x] Phase 3: Auth & Middleware (6/6 plans) -- completed 2026-03-05
- [x] Phase 4: Edge Function Hardening (4/4 plans) -- completed 2026-03-05
- [x] Phase 5: Code Quality & Type Safety (10/10 plans) -- completed 2026-03-06
- [x] Phase 6: Database Schema & Migrations (7/7 plans) -- completed 2026-03-06
- [x] Phase 7: UX & Accessibility (6/6 plans) -- completed 2026-03-06
- [x] Phase 8: Performance Optimization (7/7 plans) -- completed 2026-03-06
- [x] Phase 9: Testing & CI Pipeline (9/9 plans) -- completed 2026-03-06
- [x] Phase 10: Audit Cleanup (2/2 plans) -- completed 2026-03-07

[archive](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>v1.1 Blog Redesign & CI -- Phases 11-15 (shipped 2026-03-08)</summary>

- [x] Phase 11: Blog Data Layer (2/2 plans) -- completed 2026-03-07
- [x] Phase 12: Blog Components & CSS (2/2 plans) -- completed 2026-03-07
- [x] Phase 13: Newsletter Backend (1/1 plans) -- completed 2026-03-07
- [x] Phase 14: Blog Pages (2/2 plans) -- completed 2026-03-08
- [x] Phase 15: CI Optimization (1/1 plans) -- completed 2026-03-08

[archive](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>v1.2 Production Polish & Code Consolidation -- Phases 16-20 (shipped 2026-03-11)</summary>

- [x] Phase 16: Shared Cleanup & Dead Code (3/3 plans) -- completed 2026-03-08
- [x] Phase 17: Hooks Consolidation (6/6 plans) -- completed 2026-03-08
- [x] Phase 18: Components Consolidation (6/6 plans) -- completed 2026-03-09
- [x] Phase 19: UI Polish (3/3 plans) -- completed 2026-03-09
- [x] Phase 20: Browser Audit (6/6 plans) -- completed 2026-03-09

[archive](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>v1.3 Stub Elimination -- Phases 21-25 (shipped 2026-03-18)</summary>

- [x] Phase 21: Email Invitations (2/2 plans) -- completed 2026-03-11
- [x] Phase 22: GDPR Data Rights (2/2 plans) -- completed 2026-03-11
- [x] Phase 23: Document Templates (2/2 plans) -- completed 2026-03-11
- [x] Phase 23.1: UI/UX Polish (2/2 plans) -- completed 2026-03-18
- [x] Phase 24: Bulk Property Import (2/2 plans) -- completed 2026-03-18
- [x] Phase 25: Maintenance Photos & Stripe Dashboard (2/2 plans) -- completed 2026-03-18

[archive](milestones/v1.3-ROADMAP.md)

</details>

<details>
<summary>v1.5 Code Quality & Deduplication -- Phases 29-31 (shipped 2026-04-08)</summary>

- [x] Phase 29: Edge Function Shared Utilities (3/3 plans) -- completed 2026-04-03
- [x] Phase 30: Frontend Import & Validation Cleanup (2/2 plans) -- completed 2026-04-03
- [x] Phase 31: Frontend Hook Factories (2/2 plans) -- completed 2026-04-08

</details>

<details>
<summary>v1.6 SEO & Google Indexing Optimization -- Phases 32-40 (shipped 2026-04-13)</summary>

- [x] Phase 32: Crawlability & Critical Fixes (1/1 plans) -- completed 2026-04-08
- [x] Phase 33: SEO Utilities Foundation (2/2 plans) -- completed 2026-04-08
- [x] Phase 34: Per-Page Metadata (2/2 plans) -- completed 2026-04-08
- [x] Phase 35: Structured Data Enrichment (3/3 plans) -- completed 2026-04-09
- [x] Phase 36: Pricing Page Polish (4/4 plans) -- completed 2026-04-10
- [x] Phase 37: Content SEO & Internal Linking (2/2 plans) -- completed 2026-04-10
- [x] Phase 38: Validation & Verification (2/2 plans) -- completed 2026-04-10
- [x] Phase 39: Structured Data Gap Closure (2/2 plans) -- completed 2026-04-13
- [x] Phase 40: Metadata & Verification Completeness (3/3 plans) -- completed 2026-04-13

[archive](milestones/v1.6-ROADMAP.md)

</details>

<details>
<summary>v1.7 Launch Readiness -- Phases 41-44 (shipped 2026-04-15)</summary>

- [x] Phase 41: Payment Correctness & Split-Rent Tests (3/3 plans) -- completed 2026-04-13
- [x] Phase 42: Cancellation UX End-to-End Audit + Fix (2/2 plans) -- completed 2026-04-14
- [x] Phase 43: Post-Deploy Sentry Regression Gate (1/1 plans) -- completed 2026-04-14
- [x] Phase 44: Deliverability + Funnel Analytics (3/3 plans) -- completed 2026-04-15

[archive](milestones/v1.7-ROADMAP.md)

</details>

## Active Milestone

**v2.4 Document Vault Extension + Category Taxonomy** — scoping phase as of 2026-04-22. Target ship 2026-05-06. Three phases:
- [ ] Phase 59: Storage RLS + upload entry points for lease/tenant/maintenance
- [ ] Phase 60: Global `/documents/vault` page with search + filter
- [ ] Phase 61: Category taxonomy + filter UI

See `milestones/v2.4-ROADMAP.md` for the full scope.

## Recently Shipped

**v2.3 Document Vault + Bulk-Import Extension** — fully shipped + deployed 2026-04-21, post-audit cleanup complete 2026-04-22.
- [x] Phase 57: Document vault MVP (PR #620) — property-scoped upload/list/preview/delete using signed URLs + path-based storage RLS. Migration `20260420030000` applied via MCP (title/tags/description cols + tenant-documents bucket MIME allowlist + 3 storage RLS policies). Types regen PR #622.
- [x] Phase 58: Bulk-import extension (PR #621) — generic `src/components/bulk-import/` stepper now powers property/tenant/unit/lease importers. 5 Sentry findings caught and fixed mid-PR.
- [x] Audit cycles 1-4: 135 findings across 4 rounds (PRs #624, #627, #628) — caught + fixed a P0 production bug (every bulk-imported lease rejected) in cycle 4. Migrations `20260421120000`, `20260422120000`, `20260422130000`, `20260423120000` applied via MCP.
- [x] RPC integration tests + RLS gap fix + CI gate honesty (PR #629) — 17 new integration tests, `lease_tenants` SELECT/UPDATE/DELETE policies, `rls-security` + `e2e-smoke` CI gates now actually run (were silently skipping every PR). Migration `20260424120000` applied.
- See `milestones/v2.3-ROADMAP.md`.

**v2.0 Revenue Gates** — both paywalls deployed 2026-04-21.
- [x] Phase 45: DocuSeal e-sign gate (PR #604)
- [x] Phase 46: Premium reports gate (PR #616 + audit fix PR #617)
- [x] Operator deploy complete: docuseal v74, export-report v77, generate-pdf v70 all redeployed via MCP with `EdgeRuntime.waitUntil` fix so gate_events rows actually land
- Battle-proven criteria: ≥5 `esign_gate` upgrades in 7d + ≥10 `reports_gate` upgrades in 14d (measured via admin Gate Conversion Stats page)

**v2.2 Landlord-First Positioning** — fully shipped 2026-04-20.
- [x] Phase 52: Dashboard copy + component rename (PR #609)
- [x] Phase 53: Public-facing value-prop reframe (PR #610)
- [x] Phase 54: Competitor-driven UX fixes (PRs #612, #613, #614) — lease-expiration widget, rent-increase notice, per-property performance, maintenance multi-file upload + work-order PDF
- See `milestones/v2.2-ROADMAP.md`

**v2.1 Production Integrity Hardening** — all 4 phases shipped 2026-04-19/20 (PRs #605, #606, #607).

Post-v1.7 stabilization (2026-04-18/19): PRs #596 (rent + tenant portal removed), #597 (CI hang fix), #598 (docs), #599 (tests), #600 (user_type → is_admin), #601 (GSD docs), #602 (v2.0 scoping), #603 (dead backend refs cleanup), #604 (Phase 45 esign gate tracking), #605 (v2.1 integrity), #606 (migration replay fix), #607 (14-day trial model).

## Wave 0 Operator Actions (v1.7)

Status: **4/4 complete** (all Wave 0 actions done 2026-04-16). v1.7 fully production-live.

1. ~~Apply 5 Phase 44 migrations (`20260415193245`..`193249`)~~ — DONE (commit `7da87331d`)
2. ~~Regenerate types~~ — DONE (commit `7da87331d`)
3. ~~Configure Resend webhook~~ — DONE: Edge Function deployed, webhook registered, `RESEND_WEBHOOK_SECRET` synced to Resend's `whsec_…` signing secret
4. ~~Provision admin test user~~ — DONE: `e2e-admin@tenantflow.app` (id `e4364d5c…`) with `user_type=ADMIN`; `E2E_ADMIN_EMAIL`/`PASSWORD` in GH secrets

See `milestones/v1.7-ROADMAP.md` for details.
