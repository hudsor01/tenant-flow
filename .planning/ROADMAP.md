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

**v2.0 Revenue Gates** — Phases 45-46 (scoped 2026-04-19, target ship 2026-05-10).

- [ ] Phase 45: DocuSeal gate prod validation (3d) — verify PR #595 paywall is earning
- [ ] Phase 46: Premium reports tier gate (1w) — paywall year-end / 1099 / tax exports

See `milestones/v2.0-ROADMAP.md` for success criteria (battle-proven per phase).

Post-v1.7 stabilization (unplanned, 2026-04-18/19): PRs #596 (rent + tenant portal removed), #597 (CI hang fix), #598 (docs), #599 (tests), #600 (user_type → is_admin), #601 (GSD docs).

## Wave 0 Operator Actions (v1.7)

Status: **4/4 complete** (all Wave 0 actions done 2026-04-16). v1.7 fully production-live.

1. ~~Apply 5 Phase 44 migrations (`20260415193245`..`193249`)~~ — DONE (commit `7da87331d`)
2. ~~Regenerate types~~ — DONE (commit `7da87331d`)
3. ~~Configure Resend webhook~~ — DONE: Edge Function deployed, webhook registered, `RESEND_WEBHOOK_SECRET` synced to Resend's `whsec_…` signing secret
4. ~~Provision admin test user~~ — DONE: `e2e-admin@tenantflow.app` (id `e4364d5c…`) with `user_type=ADMIN`; `E2E_ADMIN_EMAIL`/`PASSWORD` in GH secrets

See `milestones/v1.7-ROADMAP.md` for details.
