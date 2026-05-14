# TenantFlow

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

### Active

<!-- v1.0 scope: 45 audit findings from external UI audit (2026-05-08).
     Source spec: audit-ui-2026-05-08.md (project root).
     All fixes must align to globals.css canonical design tokens. -->

**Critical (block marketing spend):**
- [ ] Blog content broken — every post renders "Error Processing Blog" (data-broken, ~70 rows in `blogs` table need cleanup or regeneration)
- [ ] Homepage stat counters render "0" — `NumberTicker` animation/intersection-observer bug, source values are correct
- [ ] Pricing inconsistency for Max plan across pricing card / comparison table / homepage features grid / JSON-LD
- [ ] Mobile layout broken at 375px (hero overflow, CTA cut off, no hamburger nav)
- [ ] `/signup` redirect loop to `/login`
- [ ] Long-form legal URLs (`/terms-of-service`, `/privacy-policy`, `/help-center`, `/rss-feed`) redirect to login

**High Priority (visual/copy inconsistencies):**
- [ ] Persona language unification (owner/landlord/manager/investor → ONE primary persona)
- [ ] Wrong icon on Multi-Property Dashboard feature card
- [ ] Active-nav state bug ("Compare" highlighted on `/`)
- [ ] Legal-page date inconsistencies
- [ ] "Most Popular" badge overlaps Growth card border
- [ ] Inconsistent CTA button styling (Starter solid black, Talk-to-Sales unstyled, duplicate Free Trial pill on Features)
- [ ] /compare/buildium frames positioning choices as missing features (red ✗)
- [ ] /contact "How did you hear" defaults to "Sales Outreach"
- [ ] Pricing subhead spacing/period bug
- [ ] Annual-toggle "Save $158" math doesn't match
- [ ] Resources nav dropdown has dead `href="/#"`
- [ ] "Powered by Hudson Digital" footer signature
- [ ] Supabase logo faded in Trusted Integrations
- [ ] Duplicate "Why Landlords Choose" comparison tables (homepage + Features)

**Medium (content + design-token alignment):**
- [ ] Hero subhead contradiction ("track tenants" vs "tenants never log in")
- [ ] "Join 500+" social proof verification
- [ ] "Tenants never log in" promoted from buried subhead → visible badge/section
- [ ] DocuSeal tier-restriction messaging de-amplified (mentioned 6× currently)
- [ ] FAQ canonicalization (home + /pricing + /faq overlap)
- [ ] "Bulk-zip 500/request" softened to non-technical phrasing
- [ ] Hero dashboard mockup simplified + name review
- [ ] Resources page neon-pink download tags → globals.css palette
- [ ] /resources card backgrounds → globals.css surface tokens
- [ ] Stale blog dates on error posts (incidentally resolved by Critical #1 fix)

**Low (polish/SEO/A11y/conversion):**
- [ ] Real testimonials + customer logos
- [ ] G2/Capterra/Trustpilot review badges
- [ ] SEO meta separator standardization (em-dash vs pipe)
- [ ] Per-page Open Graph images
- [ ] Site-wide Organization + SoftwareApplication schema
- [ ] Sticky/floating CTA on long pages
- [ ] Exit-intent / scroll-depth lead capture
- [ ] Clean blog slugs (drop millisecond timestamps)
- [ ] Server-render `/blog` index (replace client loading state)
- [ ] Visible breadcrumbs on blog + comparison pages
- [ ] Static export + cache headers for marketing pages
- [ ] `aria-current="page"` site-wide audit
- [ ] CTA label canonicalization ("Talk to Sales" / "Contact Sales" / "Schedule walkthrough" / "Connect with sales")
- [ ] Confirm `sales@` + `security@` inboxes monitored
- [ ] Footer XML sitemap link / robots.txt verification

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- **New features beyond audit fixes** — v1.0 is correctness/alignment only. New product capabilities go to v2.0.
- **Tenant portal / tenant authentication** — pre-demolition decision, never re-add. Tenants are records, not users.
- **Rent payment facilitation** — demolished April 2026. Landlords manually log amounts received.
- **Smart tenant screening** — never built. Audit copy claiming this gets removed; not added back.
- **Localization / i18n** — English-only.
- **Native mobile app** — responsive web only. Mobile fixes target `375px` Safari/Chrome breakpoint.
- **Visual redesign of bento grid / pricing cards** — token-alignment + bug fixes only. Layout overhauls are v2.0+.
- **Auto-categorization of documents** — v2.6 deferred indefinitely.
- **Unsubstantiated ROI/NOI/automation percentages in copy** (e.g. "+40% NOI", "Reduce vacancy 65%", "Automate 80%") — substantiate or delete; never re-add.

## Context

**Tech stack** (relevant for fixes):
- Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query/Form + Zustand
- Supabase (PostgREST + RPCs + Edge Functions + RLS) + Stripe subscriptions
- React Compiler enabled. Server Components by default.
- pnpm 11 / Node 24. Hosted on Vercel (deploys from main only).
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
| GSD config: YOLO mode, **fine** granularity (8–13 phases), **quality** model profile, per-phase research ON, plan-checker + verifier + nyquist ON, parallelization ON, commit_docs ON | User explicit Q&A. Fine granularity = tighter phase scope = shorter perfect-PR review cycles per phase | — Pending |
| Branching: per-phase branches (`gsd/phase-{N}-{slug}`); one PR per phase; perfect-PR merge gate (2 consecutive zero-finding review cycles) | Matches v2.4–v2.6 history. Branch protection on `main` requires this. | — Pending |
| Code review depth: **deep** (architectural review + design-token compliance + a11y in every phase) | User upgrade from saved default. Reduces post-merge findings; raises token cost. | — Pending |
| Skip project-level research; rely on per-phase research during `/gsd-plan-phase` | Brownfield audit-fix; no greenfield stack decisions. Per-phase research keeps research targeted. | — Pending |
| Major-version-only milestone naming (`v1.0`, `v2.0`, `v3.0` — no decimals like `v1.1` or `Phase 5.5`) | User explicit instruction. Use integer phase numbers; insert NEW phases as integers, not decimals. | — Pending |
| **Persona** TBD; user leans owner-operator. Final word selected during `/gsd-plan-phase 4` (Persona + Copy) via per-phase researcher who surveys comparable successful B2B SaaS terminology | User rejected "landlord" as too narrow but accepted "landlords with 1–15 rentals" as a segment phrase. Locking single noun via research, not assumption. | — Pending |
| Sales-contact CTA canonical label: **"Contact Sales"** | User explicit. Replaces "Talk to Sales" / "Schedule a walkthrough" / "Connect with sales" everywhere. | — Pending |
| Mobile hamburger menu: **slide-in drawer from right** (shadcn `Sheet` component) at <md breakpoint | User explicit. Standard mobile pattern. | — Pending |
| **Pricing**: full revenue audit + tier restructure as a dedicated phase. Current Stripe prices ($29 / $79 / $199) treated as starting point only — final tiers/names/limits/prices land via the Pricing Restructure phase. | User explicit: "audit our entire offering from a revenue perspective then rebuild and build out an entirely new restructuring of the tiers entirely". Phase happens AFTER persona is locked (Phase 4). | — Pending |
| **Blog**: full rebuild as a dedicated phase — data cleanup + page UI rebuild (server-rendered) + n8n flow redesign for new audience + initial persona-aligned content set | User explicit: "rebuild blog page + maybe redo n8n flow for new audience + as a single Phase X in v1.0". Depends on persona (Phase 4). | — Pending |
| Phase 1 (immediate stop-bleed) bulk-unpublishes broken blog rows + makes Max pricing AGREE across 4 surfaces using "Custom" placeholder until Pricing Restructure phase ships | Decouples immediate SEO + ad-spend safety from longer-term restructure work. Avoids propagating $199 twice (once in Phase 1, again after restructure). | — Pending |
| Footer "Powered by Hudson Digital" line: **KEPT** site-wide. CONS-12 removed from v1.0 scope. | User explicit override of audit recommendation. Personal preference. | — Pending |
| "Join 500+ Growth subscribers" replaced with **"Built for landlords with 1–15 rentals"** — segment-specific framing, no fabricated count | User has zero subscribers. Segment phrase is honest + serves the same conversion goal (signal "this is for me"). Avoids FTC substantiation risk + future trust kill. | — Pending |
| Testimonials (TRUST-01): real names + property counts + quotes, **no headshots**. Avatar fallback uses initials or geometric placeholder. | User explicit: can provide names/counts/quotes, headshots difficult to source. | — Pending |
| Treat audit document as v1.0 spec; locked decisions captured here override audit-default recommendations where they conflict | User input > audit defaults. | — Pending |
| Brownfield framing — Validated section pre-populated from v2.6 capabilities | TenantFlow is mature; PROJECT.md must reflect that to prevent agents from re-deriving stack/architecture. | — Pending |

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
*Last updated: 2026-05-08 after v1.0 initialization*
