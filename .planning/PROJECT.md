# TenantFlow

## Current State

**Latest shipped milestone:** v5.0 AI Blog Content Engine (shipped 2026-06-10, 6 phases / 14 plans / 9/9 requirements). A local-LLM (LM Studio on the M5 Pro) + RAG n8n pipeline that drafts brand-positive, judge-gated, E-E-A-T-credible blog posts into the `n8n-blog-ingest` Edge Function as `status='in-review'` drafts for human approval at `/admin/blog`, executes the SEO-01 ghost-slug reclaim (republish at the exact deleted high-impression URLs), and self-schedules with pre-POST slug dedup + `BLOG-GEN-FAIL` alerts + documented runaway/cost guards. The perfect-PR gate caught and fixed a live prod incident along the way (an RLS policy referencing `is_admin()` raised 42501 on every anonymous `blogs` read). Archive: [milestones/v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md).

**Active milestone:** v6.0 Final Canonical Cleanup (started 2026-06-14) — remove every orphaned remnant of the demolished offerings (tenant-as-user/portal, rent-payment facilitation, Stripe Connect/payouts, automated screening) and finish the deferred dead-code trim. Requirements in [REQUIREMENTS.md](REQUIREMENTS.md); phases 15-19 in [ROADMAP.md](ROADMAP.md). The last milestone before the project is considered fully complete.

### Recently shipped

- **v5.0 AI Blog Content Engine** (2026-06-10, 9/9) — local-LLM RAG blog factory: judge-gated drafts → `/admin/blog` approve → SEO-01 reclaim → self-scheduled with dedup + alerts. See [milestones/v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md).
- **v4.0 Hardening & Hygiene** (2026-06-07, 20/21) — audit janitorial-debt + security-CI + SEO recovery; SEO-01 content-reclaim carried to v5.0. See [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md).
- **CI security gates** (PR #781, 2026-06-04) — CodeQL SAST (app + workflows) + gitleaks server-side secret scanning.
- **v3.0 Security Hardening** (2026-06-02, 12/12) — advisor steady state 44/0/1.
- **v2.0 Dashboard Command Center** (2026-06-02, 34/34) — `/dashboard` redesign.
- **v1.0 Marketing Surface Honesty** (2026-05-22, 56/56 audit findings).

## Current Milestone: v7.0 TanStack Form Composition Migration

**Goal:** Adopt TanStack Form's built-in composition API (`createFormHook` / `useAppForm` / `withForm` / `withFieldGroup` / `formOptions`) so the codebase never hand-rolls a form-instance type again — replacing 5 hand-rolled 12-generic `ReactFormExtendedApi` aliases, 10 `*FormApi`-prop sections, 14 raw `useForm` sites, and 123 per-field annotations with one shared form-hook module + a typed field-component library. Zero runtime/behavior change.

**Target areas:**
- One shared `form-hook` foundation (`createFormHook` → `useAppForm`/`withForm`/`withFieldGroup`) + a `formOptions()` convention — no hand-rolled generics anywhere
- Typed field-component library wrapping the existing shadcn primitives (TextField/NumberField/TextareaField/SelectField/SwitchField/IconInputField/DateField) + a shared SubmitButton
- Migrate all 5 typed forms (property, subscribe, lease, tenant, unit) + their 10 sections to `withForm`; delete the 5 `*-form-types.ts` aliases
- Multi-step lease-creation wizard typed via `withFieldGroup`
- Remaining standalone forms (login, maintenance-form hook, 4 document-template forms) on `useAppForm` + shared fields
- Drift guard: zero `ReactFormExtendedApi` aliases remain in `src/`

Built on the framework already installed (`@tanstack/react-form@1.32`) — no new dependency. Requirements in [REQUIREMENTS.md](REQUIREMENTS.md); phases 20-24 in [ROADMAP.md](ROADMAP.md). Roadmaps + requirements for v1.0–v6.0 are archived in `.planning/milestones/`.

## What This Is

TenantFlow is a landlord-only property management SaaS at tenantflow.app. Landlords use it to organize properties, leases, tenants (as records, not users), maintenance requests, inspections, and a per-entity document vault. Tenants never log in — they are contact records, not authenticated users. The product is mature: v2.6 shipped April 2026 with the document vault as the headline differentiator, custom categories, bulk-zip download, and global search.

## Core Value

Every public claim on tenantflow.app must map to working code, and every visual must align to canonical design tokens in `src/app/globals.css`. The marketing surface is the buying funnel — broken stat counters, dead blog posts, mobile layout collapse, and signup redirect loops are direct revenue blockers that compound through paid acquisition.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Locked — changing requires explicit discussion. -->

- ✓ **Document vault with per-entity branches** (5: property/lease/tenant/maintenance/inspection) — v2.4
- ✓ **Global vault search with full-text matching** — v2.4 (Phase 60)
- ✓ **Multi-select category filters with date-range picker (timezone-aware)** — v2.5 (Phase 63)
- ✓ **Bulk zip download (500 doc cap, streaming)** — v2.6 (Phase 64)
- ✓ **Per-owner custom category taxonomy with 7 seeded defaults** — v2.6 (Phases 65–66)
- ✓ **Auth via Supabase SSR (`getAll`/`setAll` cookies)** — pre-v1
- ✓ **Stripe subscriptions billing with `subscription_status` gate (active/trialing)** — pre-v1
- ✓ **DocuSeal e-sign integration (Starter 3/mo, Growth 25/mo, Max unlimited)** — earlier milestone
- ✓ **Marketing pages (homepage, pricing, features, compare/[competitor], about, blog, resources, contact, support, FAQ, security, terms, privacy)** — pre-v1
- ✓ **SEO + organic traffic baseline (sitemap with real lastmod, robots.ts per-bot allowlist for 12 AI crawlers, llms.txt + llms-full.txt + humans.txt, RSS feed at /feed.xml, Article + BreadcrumbList JSON-LD)** — recently shipped (PR #674)
- ✓ **Design token system in `src/app/globals.css`** (oklch colors, --color-/--spacing-/--text-/--radius-/--shadow-/--duration-/--ease- scales, `--color-{success,warning,info,destructive}` status palette, `--color-chart-{1..5}`)
- ✓ **GDPR account deletion with 30-day grace + anonymization** — earlier milestone
- ✓ **Data retention cron jobs (security_events 90d, user_errors 90d, stripe_webhook_events 90d/180d)** — earlier milestone
- ✓ **RLS on every table; landlord owner isolation enforced via `tests/integration/rls/`** — pre-v1
- ✓ **Marketing Surface Honesty (56 audit findings closed across CRIT/CONS/COPY/PRICE/BLOG/TOKEN/TRUST/SEO/PERF)** — v1.0 (shipped 2026-05-22, 15 phases, audit round 3 verdict PERFECT BY ALL MEASURES). Highlights: blog DB cleanup + server-render rebuild + n8n redesign; pricing restructured to Starter $19 / Growth $49 / Max $149 with single-source-of-truth `pricing.ts`; unified "landlord" persona across hero/About/meta/FAQ/blog; 5 redirect aliases (`/signup` + 4 legal long-form paths); homepage NumberTicker fix + 375px mobile drawer; design-token drift guard scanning hex/rgb/`bg-white`/inline-ms; canonical "Contact Sales" CTA; 2 real testimonials; SEO meta-separator standardization + per-page OG images + site-wide Organization/SoftwareApplication JSON-LD + visible breadcrumbs; static-gen + sticky CTA + lead-capture modal (feature-flagged); `@stripe/(react-)?stripe-js` dead-dep drift guard; host-derived Vitest worker-pool cap; `/blog` nav suppression regression-pin until content cohort lands.
- ✓ **Dashboard Command Center — `/dashboard` redesign (34/34 requirements: KPI-01..07, CHART-01..06, DT-01..09, POLISH-01..12)** — v2.0 (shipped 2026-06-02, 7 phases). 6-tile KPI bento row (`Stat` + `NumberTicker` + `StatTrend`, `@container` grid, sparklines on Revenue + Occupancy); refreshed `RevenueAreaChart` (30d/6mo toggle) + new `OccupancyDonutChart` (center label + legend from `stats.units`), series colors from `--color-chart-{1..5}`, `next/dynamic` `ssr:false`; vendored DiceUI/TanStack Portfolio DataTable (`useClientDataTable`, `aria-sort` + keyboard sort, faceted status filter, column visibility, virtualization, grid/table toggle, Zustand-`persist` saved presets, nuqs URL state — 3 hand-rolled files deleted); dark-mode token migration with theme-aware `--color-{success,warning,destructive}-text` companions (≥4.5:1 both themes); `NumberTicker` internal reduced-motion guard (16 consumers); 375px zero-horizontal-scroll + skeleton↔empty mutual-exclusion; `/dashboard` E2E smoke + axe-core WCAG 2.1 AA under CI `owner-axe`; **killed the `*100`/`÷100` revenue round-trip** (`get_dashboard_data_v2` returns dollars, correct end-to-end) + extracted shared `transformDashboardData` + dropped fabricated `collection_rate` (no rent-payment data exists). Deferred at close: 2 Phase-6 manual focus-ring sign-offs (automated axe coverage passed in CI).

- ✓ **Security Hardening — Supabase Security Advisor steady state (12/12 requirements: SDEF-01..03, TIGHTEN-01..03, RLSNP-01..03, SECTEST-01..03)** — v3.0 (shipped 2026-06-02, 3 phases). Classified all 46 `authenticated_security_definer_function_executable` functions against the live schema (43 KEEP / 2 TIGHTEN / 1 REVIEW, `CYCLE-2.md`) and tightened 3 → **46→44** (the 44 remaining are documented intentional KEEP; `get_lead_paint_compliance_report` + `assert_can_create_lease` revoked from authenticated, `audit_for_all_policies` `is_admin()`-body-gated). Resolved all 10 `rls_enabled_no_policy` tables with explicit `service_role_only` FOR ALL policies + revoked 5 vestigial Tier-A `authenticated` grants (pg_graphql lint 0027 leak closed) → **10→0** — without re-introducing the `20260527151342`-removed deny-all. New `rls-no-policy-lockdown.rls.test.ts` deny pins + extended `anon-rpc-grants`; the `rls-security` suite is the in-CI gate, the advisor the out-of-band oracle. Documented steady state (44/0/1) in `anon-exec-audit/STEADY-STATE.md`. `auth_leaked_password_protection` intentionally out of scope (paid feature).

### Active

<!-- v6.0 Final Canonical Cleanup active (started 2026-06-14). Requirements
     defined in REQUIREMENTS.md across LEGACY-CONNECT/LEGACY-RENT/LEGACY-TENANT/
     LEGACY-SCREENING/DEADDB/DEADCODE. -->

- **v6.0 Final Canonical Cleanup** — 6 categories (LEGACY-CONNECT, LEGACY-RENT, LEGACY-TENANT, LEGACY-SCREENING, DEADDB, DEADCODE). 24 requirements with REQ-IDs in [REQUIREMENTS.md](REQUIREMENTS.md); phases 15-19 in [ROADMAP.md](ROADMAP.md). Grounded in `.planning/repo-audit/v6.0-LEGACY-AUDIT.md`.
- _v4.0 Hardening & Hygiene shipped 2026-06-07 (20/21) and v5.0 AI Blog Content Engine shipped 2026-06-10 (9/9) — both archived in `.planning/milestones/`._

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **Tenant portal / tenant authentication** — pre-demolition decision, never re-add. Tenants are records, not users.
- **Rent payment facilitation** — demolished April 2026. Landlords manually log amounts received.
- **Smart tenant screening** — never built. Audit copy claiming this gets removed; not added back.
- **Localization / i18n** — English-only.
- **Native mobile app** — responsive web only. Mobile fixes target `375px` Safari/Chrome breakpoint.
- **Auto-categorization of documents** — v2.6 deferred indefinitely.
- **Unsubstantiated ROI/NOI/automation percentages in copy** (e.g. "+40% NOI", "Reduce vacancy 65%", "Automate 80%") — substantiate or delete; never re-add (v1.0 honesty constraint).
- **`auth_leaked_password_protection`** (Supabase advisor WARN) — paid feature (HaveIBeenPwned compromised-password check); intentionally disabled. Excluded from v3.0 Security Hardening per explicit user instruction.

## Context

**Tech stack** (relevant for fixes):
- Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query/Form + Zustand
- Supabase (PostgREST + RPCs + Edge Functions + RLS) + Stripe subscriptions
- React Compiler enabled. Server Components by default.
- bun 1.3 / Node 24. Hosted on Vercel (deploys from main only).
- Sentry for monitoring; tunnel `/monitoring`.

**Design token authority:** `src/app/globals.css` is the canonical source. The `@theme` block defines color (oklch), spacing, typography, radius, shadow, duration, easing scales. Status colors (`--color-{success,warning,info,destructive}`) handle all semantic states. Chart colors (`--color-chart-{1..5}`) handle data viz. CLAUDE.md zero-tolerance rules forbid: `any` types, barrel files, inline styles, hex/rgb colors, `bg-white`, `bg-text-muted` (use `text-muted-foreground`), `@radix-ui/react-icons` (lucide-react only), emojis in UI code.

**Domain conventions:**
- `properties`, `leases`, `maintenance_requests`, `documents` use `owner_user_id` (NOT `property_owner_id`).
- Soft-delete: `status: 'inactive'` filter on properties.
- Soft FK: `documents.document_type` validated by `validate_document_category` BEFORE-INSERT/UPDATE trigger.
- All `amount` columns store dollars as `numeric(10,2)`. Cents only at Stripe API boundary.
- PostgREST + RPCs only — no custom backend. `{ count: 'exact' }` for pagination.

**Audit source:** External UI audit conducted 2026-05-08 against tenantflow.app prod. Full text at `audit-ui-2026-05-08.md` (project root). Investigations already confirmed: stat counter is animation bug (not data), blog is data-broken (not component), `/signup` route doesn't exist (proxy redirects to login).

**Workflow:** GSD (gsd-build/get-shit-done) drives milestone planning + phase execution. Perfect-PR merge gate (two consecutive zero-finding review cycles) is the merge discipline. Each phase ships its own PR. Branch protection on `main` requires `checks` + `e2e-smoke` + `rls-security` to pass.

## Constraints

- **Tech stack**: Next.js 16, React 19, TailwindCSS 4, Supabase SSR — no framework swaps. Adding shadcn components or lucide-react icons is fine.
- **Design tokens**: Every color/spacing/typography/radius/shadow/duration value must use a `globals.css` token. No hex, rgb, named colors, or one-off cubic-beziers anywhere in the diff.
- **Mobile breakpoint**: Fixes must work at 375px (iPhone SE / mid-range Android). Test in Chrome DevTools device toolbar before claiming complete.
- **No tenant-portal regressions**: Never re-introduce tenant auth, rent collection, or smart screening — these were demolished and the audit explicitly enforces removal where copy still claims them.
- **Backward compatibility**: Long-form legal URLs (#6) must 301 to short paths, not 404 — external links/emails/sitemaps may reference them.
- **CI gates**: every PR must pass `lint`, `typecheck`, `next build`, `e2e-smoke`, `rls-security`. No `--no-verify` commits. No `any` types. No barrel files.
- **Perfect-PR gate**: Two consecutive zero-finding review cycles required before merge. Plan for review iteration in phase scoping.
- **Owner**: rhudson42@yahoo.com (hudsor01) is sole maintainer. No team coordination overhead.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GSD config: YOLO mode, **fine** granularity (8–13 phases), **quality** model profile, per-phase research ON, plan-checker + verifier + nyquist ON, parallelization ON, commit_docs ON | User explicit Q&A. Fine granularity = tighter phase scope = shorter perfect-PR review cycles per phase | ✓ Good — v1.0 |
| Branching: per-phase branches (`gsd/phase-{N}-{slug}`); one PR per phase; perfect-PR merge gate (2 consecutive zero-finding review cycles) | Matches v2.4–v2.6 history. Branch protection on `main` requires this. | ✓ Good — v1.0 |
| Code review depth: **deep** (architectural review + design-token compliance + a11y in every phase) | User upgrade from saved default. Reduces post-merge findings; raises token cost. | ✓ Good — v1.0 |
| Skip project-level research; rely on per-phase research during `/gsd-plan-phase` | Brownfield audit-fix; no greenfield stack decisions. Per-phase research keeps research targeted. | ✓ Good — v1.0 |
| Major-version-only milestone naming (`v1.0`, `v2.0`, `v3.0` — no decimals like `v1.1` or `Phase 5.5`) | User explicit instruction. Use integer phase numbers; insert NEW phases as integers, not decimals. | ✓ Good — v1.0 |
| **Persona** TBD; user leans owner-operator. Final word selected during `/gsd-plan-phase 4` (Persona + Copy) via per-phase researcher who surveys comparable successful B2B SaaS terminology | User rejected "landlord" as too narrow but accepted "landlords with 1–15 rentals" as a segment phrase. Locking single noun via research, not assumption. | ✓ Good — v1.0 |
| Sales-contact CTA canonical label: **"Contact Sales"** | User explicit. Replaces "Talk to Sales" / "Schedule a walkthrough" / "Connect with sales" everywhere. | ✓ Good — v1.0 |
| Mobile hamburger menu: **slide-in drawer from right** (shadcn `Sheet` component) at <md breakpoint | User explicit. Standard mobile pattern. | ✓ Good — v1.0 |
| **Pricing**: full revenue audit + tier restructure as a dedicated phase. Current Stripe prices ($29 / $79 / $199) treated as starting point only — final tiers/names/limits/prices land via the Pricing Restructure phase. | User explicit: "audit our entire offering from a revenue perspective then rebuild and build out an entirely new restructuring of the tiers entirely". Phase happens AFTER persona is locked (Phase 4). | ✓ Good — v1.0 |
| **Blog**: full rebuild as a dedicated phase — data cleanup + page UI rebuild (server-rendered) + n8n flow redesign for new audience + initial persona-aligned content set | User explicit: "rebuild blog page + maybe redo n8n flow for new audience + as a single Phase X in v1.0". Depends on persona (Phase 4). | ✓ Good — v1.0 |
| Phase 1 (immediate stop-bleed) bulk-unpublishes broken blog rows + makes Max pricing AGREE across 4 surfaces using "Custom" placeholder until Pricing Restructure phase ships | Decouples immediate SEO + ad-spend safety from longer-term restructure work. Avoids propagating $199 twice (once in Phase 1, again after restructure). | ✓ Good — v1.0 |
| Footer "Powered by Hudson Digital" line: **KEPT** site-wide. CONS-12 removed from v1.0 scope. | User explicit override of audit recommendation. Personal preference. | ✓ Good — v1.0 |
| "Join 500+ Growth subscribers" replaced with **"Built for landlords with 1–15 rentals"** — segment-specific framing, no fabricated count | User has zero subscribers. Segment phrase is honest + serves the same conversion goal (signal "this is for me"). Avoids FTC substantiation risk + future trust kill. | ✓ Good — v1.0 |
| Testimonials (TRUST-01): real names + property counts + quotes, **no headshots**. Avatar fallback uses initials or geometric placeholder. | User explicit: can provide names/counts/quotes, headshots difficult to source. | ✓ Good — v1.0 |
| Treat audit document as v1.0 spec; locked decisions captured here override audit-default recommendations where they conflict | User input > audit defaults. | ✓ Good — v1.0 |
| Brownfield framing — Validated section pre-populated from v2.6 capabilities | TenantFlow is mature; PROJECT.md must reflect that to prevent agents from re-deriving stack/architecture. | ✓ Good — v1.0 |
| v2.0 phase numbering **reset to 1-7** (major-version → fresh sequence; v1.0's phases 1-15 archived independently) | Keeps per-milestone phase numbers small and legible; archives keep history separable. | ✓ Good — v2.0 |
| KPI grid is a plain `@container` CSS grid of `Stat` tiles — `ui/bento-grid.tsx` is OUT | `bento-grid.tsx` is a marketing-flash component; the dashboard is restrained B2B. | ✓ Good — v2.0 |
| Drop `collection_rate` from the KPI set rather than fabricate `0` | TenantFlow facilitates no rent payments, so the data does not exist — v1.0 honesty principle (never fabricate). | ✓ Good — v2.0 |
| No `*100` / `/100` revenue arithmetic anywhere — cross-cutting hard rule, perfect-PR-gate enforced | The latent round-trip made in-memory values 100× wrong while display accidentally cancelled; `get_dashboard_data_v2` returns dollars. | ✓ Good — v2.0 |
| Authed dashboard E2E runs under the CI **`owner-axe`** project (in-test `loginAsOwner` cookie injection), NOT the storageState `owner` project | The `owner` storageState project does not run in CI; `owner-axe` is the CI-runnable authed path. | ✓ Good — v2.0 |
| Dark-mode text uses theme-aware `--color-{success,warning,destructive}-text` companions (≥4.5:1); vivid brand tokens stay on icons only (3:1) | Vivid tokens fail AA as foreground text in one theme each; carried into the post-milestone app-wide token sweep (PRs #769/#770). | ✓ Good — v2.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-25 — started v7.0 "TanStack Form Composition Migration" (FORM-01..13; phases 20-24), adopting the framework's `createFormHook`/`useAppForm`/`withForm`/`withFieldGroup`/`formOptions` composition API to delete all 5 hand-rolled `ReactFormExtendedApi` aliases. v6.0 "Final Canonical Cleanup" (24 reqs, phases 15-19) shipped + archived. v5.0 "AI Blog Content Engine" (9/9), v4.0 "Hardening & Hygiene" (20/21, advisor 44/0/1 via v3.0), v3.0 "Security Hardening" (12/12), v2.0 "Dashboard Command Center" (34/34), v1.0 "Marketing Surface Honesty" (56/56, PERFECT BY ALL MEASURES) shipped + archived.*
