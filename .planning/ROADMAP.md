# Roadmap: TenantFlow v1.0 — Marketing Surface Honesty (Fine Granularity)

## Overview

TenantFlow is a mature Next.js 16 + Supabase landlord-only SaaS (v2.6 shipped April 2026). The v1.0 milestone is a brownfield quality pass on the existing marketing surface plus two strategic rebuilds (pricing restructure + blog rebuild + n8n redesign) that emerged during Q&A. 13 fine-grained phases, 55 requirements mapped, sequenced by the audit's "Recommended Fix Order" plus dependency chain (persona before pricing/blog/copy-card-chrome; pricing-card chrome after pricing restructure ships final numbers). Each phase ships as a small per-phase PR through the perfect-PR merge gate (two consecutive zero-finding review cycles). The cross-cutting design-token alignment constraint (canonical tokens in `src/app/globals.css`; no hex/rgb/`bg-white`/inline ms anywhere) is verified as a success criterion inside every phase. Phase 11 is the only phase that explicitly *targets* existing token drift; every other phase must *not introduce* it.

## Phases

**Phase Numbering:**
- Integer phases only (1–13). User explicit instruction: no decimal phases (no `4.5`).
- Per-phase branches: `gsd/phase-{N}-{slug}`.

- [ ] **Phase 1: Critical Stop-Bleed (Blog Unpublish + Pricing Placeholder)** — Halt SEO bleeding from broken blog rows; unify Max pricing across 4 surfaces using a "Custom" placeholder until the Pricing Restructure phase ships final numbers
- [ ] **Phase 2: Frontend Correctness (NumberTicker + Mobile)** — Fix homepage stat counter animation; ship 375px responsive hero with shadcn `Sheet` hamburger
- [ ] **Phase 3: Routing & Legal-URL Aliases** — Eliminate `/signup → /login` loop; 301 long-form legal URLs to short paths
- [ ] **Phase 4: Persona & Copy Honesty** — Research-driven persona terminology selection; unify copy; surface tenants-never-login differentiator; replace "Join 500+" with segment-specific framing
- [ ] **Phase 5: Pricing Restructure** — Revenue audit + competitor analysis + new tier proposal + Stripe migration + propagate everywhere. Replaces CRIT-03 placeholder with final tier structure
- [ ] **Phase 6: Blog Rebuild + n8n Redesign** — Database cleanup + server-rendered `/blog` UI rebuild + n8n workflow redesign + initial persona-aligned content set
- [ ] **Phase 7: Pricing-Card Chrome** — Most-Popular badge overlap, Starter subhead spacing, annual-toggle savings math (uses Phase 5's final tier numbers)
- [ ] **Phase 8: Nav, Active States & Dead Links** — Multi-Property Dashboard icon, `aria-current` on `/`, dead `href="/#"` in Resources dropdown
- [ ] **Phase 9: Page-Level Cleanup** — Legal-page dates, faded Supabase logo, dup "Why Landlords Choose" table
- [ ] **Phase 10: CTA & Conversion Standardization** — Canonical "Contact Sales" labels + styles, neutral compare-page framing, fix `/contact` default, testimonials (no headshots) + review badges + monitored inboxes
- [ ] **Phase 11: Design-Token Alignment & Resources Page** — `/resources` neon-pink + decorative cards → tokens; codify no-hex/no-bg-white/no-inline-ms lint rule
- [ ] **Phase 12: SEO Metadata, Schema & Content Cleanup** — Meta separator, per-page OG images, Organization + SoftwareApplication schema, blog slugs (post-Phase 6), breadcrumbs, footer sitemap link, sitewide `aria-current` audit
- [ ] **Phase 13: Performance & Conversion Polish** — Static export + cache headers, sticky CTA on long pages, exit-intent / scroll-depth lead capture (PERF-01 server-render `/blog` already covered in Phase 6)

## Phase Details

### Phase 1: Critical Stop-Bleed (Blog Unpublish + Pricing Placeholder)
**Goal**: Stop ongoing SEO + ad-spend hemorrhage. Bulk-unpublish all broken `blogs` rows so Google stops indexing duplicate "Error Processing Blog" pages. Make Max plan pricing AGREE across pricing card / comparison table / homepage features grid / JSON-LD using "Custom" placeholder until Phase 5 ships final tier numbers.
**Depends on**: Nothing (first phase)
**Requirements**: CRIT-01, CRIT-03
**Branch**: `gsd/phase-1-critical-stop-bleed`
**Success Criteria**:
1. `/blog` index and `/blog/[slug]` URLs no longer render the string "Error Processing Blog" — broken rows are unpublished (status='draft' or equivalent), index renders honest empty state
2. Google Search Console shows declining count of error-pattern pages within 7 days of merge
3. Pricing card / `pricing-comparison-table.tsx` / homepage features grid / `Product` JSON-LD all show "Custom" / "Contact Sales" for Max plan with zero contradiction
4. No new hex/rgb/`bg-white`/inline-ms tokens introduced (cross-cutting design-token check)

**Plans:** 2 plans (parallel — wave 1)

Plans:
- [ ] 01-01-PLAN.md — Bulk-unpublish broken blog rows + BEFORE-INSERT trigger guard (Supabase migration via MCP, post-flight verification, timestamp reconcile)
- [ ] 01-02-PLAN.md — Add MAX_PUBLIC_PRICE_DISPLAY constant; update comparison-table sticky header + pricing-page metadata + JSON-LD (omit Max from offers); page-level test; Rich Results Test verification

### Phase 2: Frontend Correctness (NumberTicker + Mobile)
**Goal**: Homepage stat counters display "5", "7", "500", "14" instead of "0"; 375px viewport renders the hero without horizontal overflow with a working shadcn `Sheet` hamburger drawer for nav.
**Depends on**: Nothing (parallel-eligible with Phase 1, 3)
**Requirements**: CRIT-02, CRIT-04
**Branch**: `gsd/phase-2-frontend-correctness`
**Success Criteria**:
1. A visitor on `/` sees "5 Entity Branches", "7 Default Categories", "500 Bulk-Zip Cap", "14 Day Free Trial" animate from 0 → target value (verify via Chrome DevTools + manual viewport scroll)
2. At 375px width, hero text wraps within viewport (no horizontal scroll), CTA fully visible, hamburger button visible in top nav
3. Tapping hamburger opens shadcn `Sheet` (right-side slide-in drawer) containing Features, Pricing, Compare, About, Resources, Sign In, Get Started — all reachable
4. No new hex/rgb/`bg-white`/inline-ms tokens introduced

**Plans:** 2 plans (parallel — wave 1)

Plans:
- [ ] 02-01-PLAN.md — NumberTicker animation fix (rewrite number-ticker.tsx eliminating 4 compounding defects: hasIntersected one-shot trigger, useEffect cleanup, monotonic rAF timestamp, no Date.now) + 5 Vitest 4 fake-timer regression tests
- [ ] 02-02-PLAN.md — Mobile hero overflow + CTA truncation fix (text-3xl + text-balance; flex-col sm:flex-row + w-full sm:w-auto) + drawer polish (toggle 44x44, drop ad-hoc width override, Sheet close aria-label + 44x44) + 8-test 375x667 Playwright spec

### Phase 3: Routing & Legal-URL Aliases
**Goal**: `/signup` reaches a real destination (or 301s to `/pricing`) — eliminate the redirect loop. Long-form legal URLs (`/terms-of-service`, `/privacy-policy`, `/help-center`, `/rss-feed`) 301 to canonical short paths.
**Depends on**: Nothing (parallel-eligible with Phase 1, 2)
**Requirements**: CRIT-05, CRIT-06
**Branch**: `gsd/phase-3-routing-aliases`
**Success Criteria**:
1. `curl -I /signup` returns either 200 (real page) or 301 (to `/pricing`) — no redirect loop
2. `curl -I /terms-of-service` returns 301 → `/terms`; same pattern for the other 3 long-form URLs
3. External links/ads/emails referencing the long-form URLs reach the canonical short-path page in one redirect hop
4. No new hex/rgb/`bg-white`/inline-ms tokens introduced

**Plans:** 1 plan (single wave — both fixes ship in one routing-config diff)

Plans:
- [ ] 03-01-PLAN.md — Append 5 redirects() entries to next.config.ts (CRIT-05 + 4 CRIT-06 aliases, all permanent: true → 308) + add 6 entries to src/proxy.ts PUBLIC_ROUTES (defense-in-depth + /feed.xml latent bug fix) + new Playwright spec with 6 tests + post-deploy live curl verification

### Phase 4: Persona & Copy Honesty
**Goal**: One persona term used consistently across all marketing pages; hero contradiction resolved; tenants-never-login pulled forward as visible differentiator; "Join 500+" replaced with "Built for landlords with 1–15 rentals" segment framing; technical jargon softened; FAQ canonicalized.
**Depends on**: Phases 1, 2, 3 (immediate stop-bleed must ship first; persona work is content-not-emergency)
**Requirements**: CONS-01, COPY-01, COPY-02, COPY-03, COPY-04, COPY-05, COPY-06, COPY-07
**Branch**: `gsd/phase-4-persona-copy`
**Per-phase research**: Research successful B2B SaaS landlord-targeted products for terminology conventions; recommend final persona word with citations.
**Success Criteria**:
1. Per-phase researcher delivers a persona terminology recommendation (e.g. "property owner", "owner-operator", "rental property owner") with citation evidence from 3+ comparable products
2. After global find-and-replace, every public marketing page (`/`, `/pricing`, `/features`, `/about`, `/compare/*`, `/contact`, `/faq`) uses the chosen persona word consistently
3. Hero subhead reads cleanly: no contradiction between "track tenants" and "tenants never log in"
4. "Tenants never have to log in" rendered as visible badge or dedicated section above the fold
5. "Join 500+" string fully replaced with "Built for landlords with 1–15 rentals" framing
6. DocuSeal plan-tier note appears in ≤3 strategic mentions (down from 6)
7. FAQ on `/` and `/pricing` reduced to ≤5 entries each, with link to canonical `/faq`
8. Hero dashboard mockup names reviewed (drop "John Miller" / "Emma Wilson" / "David Park" if collision with real people)
9. No new hex/rgb/`bg-white`/inline-ms tokens introduced

**Plans:** 2 plans (sequential — wave 1 → wave 2)

Plans:
- [ ] 04-01-PLAN.md — Persona unification (CONS-01) + hero subhead (COPY-01) + social-proof segment framing (COPY-02) + tenants-never-login Badge elevation (COPY-03)
- [ ] 04-02-PLAN.md — DocuSeal de-amp (COPY-04) + FAQ canon + canonical link (COPY-05) + bulk-zip softening (COPY-06) + dashboard mockup names (COPY-07)

### Phase 5: Pricing Restructure
**Goal**: Audit current Stripe revenue baseline; survey competitor tier structures; propose + ship a new tier structure (names, prices, limits, feature mapping); migrate Stripe products + prices; propagate final numbers across all marketing surfaces.
**Depends on**: Phase 4 (pricing copy leans on settled persona terminology)
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-04, PRICE-05, PRICE-06
**Branch**: `gsd/phase-5-pricing-restructure`
**Per-phase research**: Heavy. Surveys Buildium, AppFolio, DoorLoop, Hemlane, TurboTenant, Avail, RentRedi for tier structure + pricing + feature mapping + persona alignment.
**Success Criteria**:
1. `.planning/phases/<phase-id>/PRICING-DECISION.md` documents revenue audit, competitor analysis, new tier rationale (price points, names, limits, features)
2. New Stripe products/prices created via Stripe MCP; tested in Stripe test mode
3. Customer migration playbook documented (no current subscribers to migrate, but playbook exists for future restructures)
4. All 4 marketing surfaces (pricing card, comparison table, homepage features grid, JSON-LD `Product`) show the same final tier numbers — replaces CRIT-03 placeholders
5. Annual savings math (used in CONS-10) is calculable from new monthly + annual prices
6. No new hex/rgb/`bg-white`/inline-ms tokens introduced

**Plans:** 2 plans (sequential — wave 1 → wave 2)

Plans:
- [ ] 05-01-PLAN.md — Stripe MCP migration (UPDATE 3 live products + CREATE 6 new prices with lookup_keys + ARCHIVE 2 stale duplicate products + 12 stale prices) + rewrite `pricing.ts` with Option A tier numbers ($19/$49/$149) and flip `MAX_PUBLIC_PRICE_DISPLAY` constant
- [ ] 05-02-PLAN.md — Marketing surface propagation: page metadata, JSON-LD product offers (CRIT-03 reversal — Max included as 3rd offer), pricing card, comparison tables, FAQ, compare-page tuple + recomputed savings, OG/Twitter descriptions, persona banlist recalibration; flipped pricing/page test; post-deploy curl verification

### Phase 6: Blog Rebuild + n8n Redesign
**Goal**: Audit + clean blog DB; rebuild `/blog` index + post page UI server-rendered with persona-aligned hero, breadcrumbs, clean URL slugs; redesign n8n content-generation workflow for new audience; ship initial 10–15 persona-aligned post set.
**Depends on**: Phase 4 (content + UI lean on settled persona terminology and tone)
**Requirements**: BLOG-01, BLOG-02, BLOG-03, BLOG-04, BLOG-05, BLOG-06
**Branch**: `gsd/phase-6-blog-rebuild`
**Per-phase research**: Survey successful blog-driven B2B SaaS for landlord audience — content topics, post structure, SEO conventions, n8n flow patterns.
**Success Criteria**:
1. `.planning/phases/<phase-id>/N8N-FLOW.md` documents redesigned workflow with persona-aligned content generation
2. `/blog` index server-renders post list with no client-loading state (covers PERF-01)
3. `/blog/[slug]` posts render with visible breadcrumbs (covers SEO-05 for blog) and clean URL pattern (covers SEO-04)
4. 10–15 initial published posts exist, each persona-aligned, each with unique OG image (covers part of SEO-02 for blog)
5. Content review/QA workflow active: posts ship via `draft` → `in-review` → `published` states with manual approval gate
6. `/sitemap.xml` and `/feed.xml` reflect the new published dataset
7. No new hex/rgb/`bg-white`/inline-ms tokens introduced

### Phase 7: Pricing-Card Chrome
**Goal**: Most-Popular badge sits cleanly on Growth card; Starter subhead reads as one sentence with adjacent `/mo`; annual-toggle savings math is correct + explainable (uses Phase 5's final tier numbers).
**Depends on**: Phase 5 (annual savings math depends on new tier prices)
**Requirements**: CONS-05, CONS-09, CONS-10
**Branch**: `gsd/phase-7-pricing-card-chrome`
**Success Criteria**:
1. "Most Popular" badge on Growth card no longer overlaps card border at any breakpoint
2. Starter subhead "Ideal for [persona] managing a few [rental properties]" reads as one sentence; "/mo" stays adjacent to price (no orphaned line)
3. Annual toggle reveals per-plan annual prices + math-correct savings figure backed by Phase 5's monthly + annual price values
4. No new hex/rgb/`bg-white`/inline-ms tokens introduced

### Phase 8: Nav, Active States & Dead Links
**Goal**: Multi-Property Dashboard feature card uses correct lucide-react icon; `aria-current="page"` logic on homepage stops highlighting "Compare"; Resources nav dropdown items navigate to real URLs.
**Depends on**: Phase 4 (icon choice + dropdown destinations may depend on persona-aligned page list)
**Requirements**: CONS-02, CONS-03, CONS-11
**Branch**: `gsd/phase-8-nav-active-states`
**Success Criteria**:
1. "Multi-Property Dashboard" feature card icon is one of `LayoutGrid`, `Building2`, `LayoutDashboard` (not back-arrow); icon visually communicates the feature
2. On `/`, no nav link is incorrectly highlighted as active; `aria-current="page"` is correct
3. Every Resources nav dropdown item navigates to a real URL (no `href="/#"`); keyboard activation works
4. No new hex/rgb/`bg-white`/inline-ms tokens introduced

### Phase 9: Page-Level Cleanup
**Goal**: Legal-page "Last Updated" dates are honest + consistent; Trusted Integrations row renders all 5 logos at consistent visual weight; duplicate "Why Landlords Choose" table de-duplicated.
**Depends on**: Phase 4 (date standardization may depend on persona-aligned legal copy revision date)
**Requirements**: CONS-04, CONS-13, CONS-14
**Branch**: `gsd/phase-9-page-cleanup`
**Success Criteria**:
1. Security Policy / Terms of Service / Privacy Policy `Last Updated:` dates each reflect actual most-recent revision (no future dates, no Oct-2025 stale entries)
2. Trusted Integrations row: Stripe, Vercel, DocuSeal, Resend, Supabase logos render at consistent visual weight (no faded Supabase)
3. "Why Landlords Choose TenantFlow" table appears on EITHER homepage OR `/features` (not both); the chosen surface differentiates if both are kept
4. No new hex/rgb/`bg-white`/inline-ms tokens introduced

### Phase 10: CTA & Conversion Standardization
**Goal**: Canonical "Contact Sales" CTA label + style site-wide; neutral framing on `/compare/*` (no red-✗ for positioning choices); `/contact` form default fixed; testimonials section ships with real names + property counts + quotes (no headshots); review badges added if available; monitored inbox owners documented.
**Depends on**: Phase 4 (CTA copy + testimonials lean on persona terminology)
**Requirements**: CONS-06, CONS-07, CONS-08, TRUST-01, TRUST-02, TRUST-03, TRUST-04
**Branch**: `gsd/phase-10-cta-conversion`
**Success Criteria**:
1. Every sales-contact CTA across the site uses the label "Contact Sales" — no "Talk to Sales", "Schedule a walkthrough", or "Connect with sales" remaining
2. CTA visual style: primary blue for "Start Free Trial"; one canonical secondary style for "Contact Sales"; Features-page top-nav has ONE CTA pill
3. `/compare/*` ACH/Payment Processing + HOA Management rows use neutral "By design" / "Not applicable" treatment (non-destructive token, not red-✗)
4. `/contact` "How did you hear about us?" defaults to "Please select" or "Search engine"
5. ≥3 testimonials surface on homepage and/or `/pricing` with name + property count + quote (avatar = initials/geometric placeholder, no headshot)
6. G2 / Capterra / Trustpilot review badges added if any reviews exist (or REQ documented as deferred)
7. Monitoring owner documented for `sales@tenantflow.app` and `security@tenantflow.app`
8. No new hex/rgb/`bg-white`/inline-ms tokens introduced

### Phase 11: Design-Token Alignment & Resources Page
**Goal**: `/resources` Free Downloads tags + decorative card backgrounds use canonical tokens; site-wide audit replaces remaining hex/rgb/`bg-white`/inline-ms references; lint rule codified to fail future PRs.
**Depends on**: Nothing (parallel-eligible with later phases; explicitly *targets* drift)
**Requirements**: TOKEN-01, TOKEN-02, TOKEN-03
**Branch**: `gsd/phase-11-token-alignment`
**Success Criteria**:
1. `/resources` Free Downloads tags use `--color-{primary,accent,info}` or muted backgrounds (no neon pink)
2. `/resources` cards use `bg-card` or `bg-muted` (no decorative grey/blue/mint/cream tints)
3. Sitewide grep across `src/components/**` and `src/app/**` returns zero hex codes, zero `rgb(`, zero `bg-white`, zero inline `[NNN]ms`
4. Custom ESLint plugin or stylelint config codifies the no-token-drift rule; CI fails future PRs that introduce hex/rgb/`bg-white`/inline ms
5. Lint rule documented in `.planning/phases/<phase-id>/LINT-RULE.md` for future maintainers

### Phase 12: SEO Metadata, Schema & Content Cleanup
**Goal**: Meta-title separator standardized; per-page Open Graph images for top routes; site-wide `Organization` + homepage `SoftwareApplication` JSON-LD; visible breadcrumbs on `/compare/*` (blog already covered in Phase 6); footer XML sitemap link; site-wide `aria-current="page"` audit.
**Depends on**: Phases 4, 5, 6 (SEO copy depends on persona, pricing, blog being settled)
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, SEO-07
**Branch**: `gsd/phase-12-seo-metadata`
**Success Criteria**:
1. Every `<title>` uses the same separator (em-dash OR pipe — chosen during phase plan); zero mixed usage
2. `/pricing`, `/features`, `/compare/[competitor]` each have unique OG images (1200×630)
3. Root layout emits `Organization` JSON-LD; homepage emits `SoftwareApplication` JSON-LD
4. SEO-04 + SEO-05 outcomes verified for blog (already covered by Phase 6 BLOG-02)
5. Visible breadcrumbs render on `/compare/[competitor]` posts
6. Site-wide `aria-current="page"` audit produces a green report covering nav, breadcrumbs, footer, active-link components
7. Footer links to `/sitemap.xml`; `robots.txt` confirmed pointing at it
8. No new hex/rgb/`bg-white`/inline-ms tokens introduced

### Phase 13: Performance & Conversion Polish
**Goal**: Marketing pages use static generation + cache headers where eligible; sticky CTA on long pages; exit-intent / scroll-depth lead capture (gated behind feature flag for A/B testing).
**Depends on**: Phases 4, 5, 6, 12 (perf optimization on a stable surface)
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04
**Branch**: `gsd/phase-13-performance-polish`
**Success Criteria**:
1. PERF-01 outcome (server-rendered `/blog`) verified — already shipped in Phase 6 (BLOG-02)
2. `/`, `/pricing`, `/features`, `/about`, `/compare/[competitor]` use static generation + explicit `Cache-Control` headers; Lighthouse TTI improves vs pre-Phase-13 baseline
3. Sticky CTA bar visible on `/pricing` (scroll past primary CTA), `/faq`, `/features`
4. Exit-intent OR scroll-depth lead-capture component active on top marketing pages, gated behind a feature flag (default off for v1.0; flip on after copy + visuals settled)
5. No new hex/rgb/`bg-white`/inline-ms tokens introduced

## Cross-Cutting Constraint

Every phase's final success criterion is the design-token alignment check (no hex/rgb/`bg-white`/inline ms introduced). Phase 11 explicitly *targets* existing drift; Phase 11's lint rule then protects Phases 12–13 + future v2.0+.

## Sequencing Rationale

- **Phases 1–3 ship first (parallel-eligible).** All three handle audit-flagged emergencies that block paid marketing spend (SEO bleed, broken signup, broken mobile). Each touches a different review surface (data/content, frontend components, routing/redirects), so they can run as parallel branches without merge conflict.
- **Phase 4 (Persona) before Phases 5/6.** Pricing copy + blog content + n8n flow design all need the persona word locked. Sequencing Persona → Pricing → Blog avoids re-doing copy after the persona research lands.
- **Phase 5 (Pricing) before Phase 7 (Pricing-Card Chrome).** Phase 7's annual-toggle savings math depends on Phase 5's final monthly + annual prices. Doing Phase 7 with old $29/$79/$199 numbers means re-doing it after Phase 5 ships.
- **Phase 6 (Blog) sequenced after Phase 4 (Persona) but parallel-eligible with Phase 5.** Blog content needs persona terminology but doesn't depend on pricing. Could ship in parallel with Phase 5 if reviewer bandwidth allows.
- **Phases 8–10 sequenced after Phase 4.** Visual cleanup, nav/active-states, CTA standardization all benefit from settled persona copy (CTA labels reference persona; nav active states verify against persona-aligned page set).
- **Phase 11 (Token Alignment) before Phase 12 (SEO).** Lint rule from Phase 11 protects Phase 12's metadata changes from accidentally introducing token drift.
- **Phase 13 (Performance) last.** Performance optimization on a moving target wastes work. Stable copy (4) + stable pricing (5) + stable blog (6) + stable metadata (12) → optimize.

## Edge-Case Decisions

- **CRIT-01 narrow scope (Phase 1) + BLOG-01..06 full scope (Phase 6).** User decision: full blog rebuild as a dedicated v1.0 phase. Phase 1 stops the immediate SEO bleed via bulk-unpublish; Phase 6 rebuilds data + UI + n8n. Decoupling these keeps Phase 1 small + parallel-eligible while preserving the full rebuild as a strategic project.
- **CRIT-03 narrow scope (Phase 1) + PRICE-01..06 full scope (Phase 5).** Same pattern. Phase 1 unifies pricing across surfaces with "Custom" placeholder; Phase 5 ships final tier structure.
- **CONS-12 removed from v1.0.** User decision: keep "Powered by Hudson Digital" footer. Audit recommendation overridden.
- **COPY-02 = segment-specific framing, no fabricated count.** User originally asked for arbitrary "500+" count; switched to "Built for landlords with 1–15 rentals" after risk flag. Honest framing.
- **TRUST-01 modified: name + property count + quote, no headshots.** User-supplied headshots unavailable; avatar fallback uses initials or geometric placeholder.
- **No standalone research phase.** `config.workflow.research = true` triggers per-phase research inside each `/gsd-plan-phase`. Heaviest research lands in Phase 4 (persona terminology), Phase 5 (competitor pricing), Phase 6 (n8n + blog SEO patterns).
- **Major-version naming preserved.** Integer phases only (1–13); no decimals. User explicit instruction.

## Coverage

55 requirements / 13 phases / 0 unmapped. See REQUIREMENTS.md Traceability table for canonical mapping.

## Next Action

`/gsd-plan-phase 1` — decompose Phase 1 (Critical Stop-Bleed) into per-CRIT plans. Per-phase research happens inside this command (config.workflow.research=true). Phase 1's research will be light (data cleanup + placeholder unification — no novel tech).

### Phase 14: Battle Test Findings Remediation

**Goal:** Close the four real bugs surfaced by the production browser-agent battle test (2026-05-13 + 2026-05-14) that were not resolved by prior milestone work. Findings #1 (aria-current) and #5 (unknown-routes 404) were fixed in PRs #700/#702/#703/#704 — out of scope. Findings #4 (no blog posts) and #8 (Chrome-extension warning) are operational/environmental — out of scope. The four in-scope bugs: public 404 lacks marketing nav + bouncing button; Stripe.js fires on `/pricing` (ad-blocker console noise); `/blog` 5xx's on Supabase hiccup; `/blog` shows skeleton AND empty-state simultaneously.
**Requirements**: D-01, D-02, D-03, D-04 (decision IDs from `14-CONTEXT.md` — no REQ-IDs; these are battle-test findings)
**Depends on:** Phase 13
**Branch**: `gsd/phase-14-battle-test-findings-remediation`
**Plans:** 4 plans (waves 1 + 2 — plans 01, 02, 03 parallel in wave 1 with zero `files_modified` overlap; plan 04 in wave 2 depending on 14-03 because 14-04 reads the final shape of `src/app/blog/page.tsx` after 14-03 lands)

Plans:
- [ ] 14-01-PLAN.md — D-01 public 404 wraps marketing layout: `<NotFoundPage>` infers button label from href, `src/app/not-found.tsx` wraps in `<PageLayout>` with `dashboardHref="/"`, 6-case test suite incl. explicit `/dashboard` inference case (partially started on `gsd/public-404-layout`; verify + extend, do not re-implement)
- [ ] 14-02-PLAN.md — D-02 drop client-side Stripe.js load from `/pricing`: dead-code reality — `getStripe` has zero callers, so delete it from `src/lib/stripe/stripe-client.ts` and uninstall `@stripe/stripe-js` via `pnpm remove`. No new file. `grep -rn '@stripe/stripe-js' src/ package.json` returns zero matches everywhere
- [ ] 14-03-PLAN.md — D-03 `/blog` Supabase fetch handles errors gracefully: wrap `Promise.all` in try/catch, route failures through `Sentry.captureException` with `tags: { surface: 'blog-index' }`, render empty-state on failure (never 5xx), 4 new tests covering result.error + Promise.all rejection paths
- [ ] 14-04-PLAN.md — D-04 blog skeleton ↔ empty-state precedence: create route-scoped `src/app/blog/loading.tsx` so Next.js streaming renders blog-themed skeleton chrome instead of generic site-wide PageLoader; `page.tsx` is read-only confirmatory (the grep must return zero skeleton matches — if not, 14-04 flags it as a 14-03 leak and stops); 5-case unit suite proves loading.tsx CONTENTS; runtime mutual exclusion is a Next.js streaming-boundary guarantee verified MANUAL-ONLY

---
*Roadmap defined: 2026-05-08 after v1.0 Q&A. Replaces 11-phase fine-granularity draft after pricing restructure + blog rebuild scope additions. Phase 14 added 2026-05-14 from production battle test.*
