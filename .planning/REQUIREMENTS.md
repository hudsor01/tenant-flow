# Requirements: TenantFlow v1.0 — Marketing Surface Honesty

**Defined:** 2026-05-08
**Core Value:** Every public claim on tenantflow.app maps to working code, and every visual aligns to canonical design tokens in `src/app/globals.css`.

## Cross-Cutting Constraint (applies to ALL requirements)

**Design-token alignment** — Every visual fix must use canonical tokens defined in `src/app/globals.css`:
- Color: `--color-*` tokens only (oklch); never hex/rgb/named colors. Status states use `--color-{success,warning,info,destructive}`.
- Surfaces: `bg-background`, `bg-card`, `bg-muted` — never `bg-white`.
- Text: `text-foreground`, `text-muted-foreground` — never bare `text-muted` or hex.
- Spacing: `--spacing-*` scale only.
- Radius: `--radius-{sm,md,lg,xl,2xl,full}` only.
- Shadow: `--shadow-{sm,md,lg,xl,2xl}` only.
- Typography: `--text-{display-*,title-*,base,lg,xl,sm,xs,caption,stat-*}` scale only.
- Animation: `--duration-*` + `--ease-*` tokens; never inline ms or one-off cubic-beziers.
- Icons: `lucide-react` only (per CLAUDE.md zero-tolerance rule); never `@radix-ui/react-icons` or emojis.

A PR that introduces a hex/rgb color, a `bg-white`, an inline ms duration, or any non-`globals.css` token value FAILS the perfect-PR review gate.

## v1 Requirements

Each maps to roadmap phases. Source: external UI audit at `audit-ui-2026-05-08.md` plus locked Key Decisions in `PROJECT.md`.

### Critical — Block Marketing Spend (CRIT) — Immediate Stop-Bleed Only

These are narrow Phase 1 fixes that stop SEO + ad-spend hemorrhaging. The full pricing restructure and blog rebuild live in dedicated later phases.

- [ ] **CRIT-01**: Bulk-unpublish all broken `blogs` rows that render "Error Processing Blog" — set `status='draft'` (or equivalent un-published state) on every row whose `content` or `title` matches the error pattern. `/blog` index renders an honest "Coming soon" / "No posts yet" empty state. Stops Google indexing duplicate error pages immediately. Full content rebuild + n8n redesign happens in the dedicated Blog Rebuild phase later.
- [x] **CRIT-02
**: Homepage stat counters animate to correct target values — fix `NumberTicker` (in `src/components/ui/number-ticker.tsx`) so "5 Entity Branches", "7 Default Categories", "500 Bulk-Zip Cap", "14 Day Free Trial" render correctly instead of "0". Source data in `stats-showcase.tsx` is correct; bug is in animation/intersection-observer.
- [ ] **CRIT-03**: Make Max plan pricing AGREE across all 4 surfaces using "Custom" placeholder — pricing card, `pricing-comparison-table.tsx`, homepage features grid, JSON-LD `Product` schema all show "Custom" / "Contact Sales" until the Pricing Restructure phase ships final tier numbers. Stops the visible 4-way contradiction without committing to a number that will change.
- [x] **CRIT-04
**: Mobile layout works at 375px — fix hero text overflow ("spreadsheet" word breaks viewport), CTA button truncation, and add a working hamburger nav using shadcn `Sheet` (slide-in drawer from right). All marketing-page nav links reachable on mobile. Verify in Chrome DevTools device toolbar (iPhone SE / mid-range Android).
- [ ] **CRIT-05**: `/signup` route either functions or 301s to `/pricing` — eliminate the `/signup → /login → /signup` redirect loop. External links/ads pointing at `/signup` reach a working page.
- [ ] **CRIT-06**: Long-form legal URLs alias to short paths — `/terms-of-service` → `/terms`, `/privacy-policy` → `/privacy`, `/help-center` → `/help`, `/rss-feed` → `/feed.xml`. Use Next.js `redirects()` config (301 permanent). Update `proxy.ts` `PUBLIC_ROUTES` if the long forms need to skip auth.

### Pricing Restructure (PRICE) — Dedicated Phase

Replaces the narrow CRIT-03 fix with a full revenue-driven tier rebuild. Phase ships after Persona phase (Phase 4) so pricing language can lean on settled persona terminology.

- [ ] **PRICE-01**: Audit current Stripe revenue — query `stripe.subscriptions` + `stripe.products` + `stripe.prices` for actual customer count per tier, MRR per tier, ARR, churn rate per tier, conversion rate from trial. Document baseline. (User has reported "no current subscribers"; audit confirms the data and documents starting state.)
- [ ] **PRICE-02**: Competitor pricing analysis — research Buildium, AppFolio, DoorLoop, Hemlane, TurboTenant, Avail, RentRedi, and any other landlord/PM SaaS with comparable feature scope (vault, e-sign, no payment facilitation). Document tier structures, price points, feature-to-tier mappings, free-tier presence, and target persona for each.
- [ ] **PRICE-03**: Propose new tier structure — final tier names, prices, monthly + annual options, feature/limit mapping per tier, value-based positioning rationale. Document trade-offs vs current $29/$79/$199. Decision artifact written to `.planning/phases/<phase-id>/PRICING-DECISION.md`.
- [ ] **PRICE-04**: Migrate Stripe products + prices — create new Stripe products/prices via Stripe MCP. Preserve old prices for any grandfathered subscribers (none currently exist; design the migration path so it's there when needed). Test in Stripe test mode before flipping to live.
- [ ] **PRICE-05**: Customer migration plan — even though no current subscribers exist, document the migration policy (grandfather vs forced upgrade, email sequence, opt-in vs opt-out, deadline) so future restructures inherit a working playbook.
- [ ] **PRICE-06**: Update all marketing surfaces with final pricing — pricing card (`pricing-content.tsx`), comparison table (`pricing-comparison-table.tsx`), homepage features grid, JSON-LD `Product` schema, FAQ entries that reference pricing, annual savings math. Replaces the CRIT-03 "Custom" placeholders.

### Blog Rebuild + n8n (BLOG) — Dedicated Phase

Replaces the narrow CRIT-01 fix with a full data + UI + automation + content rebuild. Phase ships after Persona phase so content + UI lean on settled persona terminology and tone.

- [ ] **BLOG-01**: Database audit + cleanup — categorize all `blogs` rows: keep+regenerate, keep+as-is, delete entirely. Document criteria. Hard-delete rows that fail the "salvageable" test (rather than leaving as drafts forever).
- [ ] **BLOG-02**: Rebuild `/blog` index + `/blog/[slug]` page UI — server-rendered (eliminate the ~3-second client-loading state — covers PERF-01), persona-aligned hero, visible breadcrumbs (covers SEO-05 for blog), clean URL pattern (covers SEO-04 — no millisecond-timestamp slugs), aligned to globals.css tokens.
- [ ] **BLOG-03**: Redesign n8n content-generation workflow — surface the current n8n flow, document why outputs are broken, redesign for new persona terminology + new reasons-to-subscribe. Document the workflow in `.planning/phases/<phase-id>/N8N-FLOW.md`.
- [ ] **BLOG-04**: Generate initial persona-aligned content set — 10–15 posts covering top SEO-target topics for landlords with 1–15 rentals. Drafts go through manual review gate before publishing. Each post has unique OG image (covers part of SEO-02 for blog).
- [ ] **BLOG-05**: Content review/QA workflow — separate `draft` / `in-review` / `published` states; manual approval gate before any post becomes public; automated SEO + tone check pre-publish.
- [ ] **BLOG-06**: Sitemap + RSS feed updated to reflect new blog dataset — `/sitemap.xml` shows current published posts with real `lastmod`; `/feed.xml` reflects the new content; `robots.ts` rules unchanged.

### Consistency — Visual & Copy (CONS)

- [ ] **CONS-01**: Persona language unified across all marketing pages — final persona word selected during `/gsd-plan-phase 4` via per-phase researcher who surveys comparable B2B SaaS terminology and recommends. Lean direction: owner-operator framing (avoid bare "landlord" per user feedback). After selection, global find-and-replace across hero, About, meta descriptions, FAQ, and headlines.
- [ ] **CONS-02**: "Multi-Property Dashboard" feature card uses correct `lucide-react` icon (e.g. `LayoutGrid` / `Building2` / `LayoutDashboard`) — currently a back-arrow.
- [ ] **CONS-03**: Active-nav state on homepage stops highlighting "Compare" — fix `aria-current="page"` logic so `/` highlights the appropriate link (or none).
- [ ] **CONS-04**: Legal-page "Last Updated" dates standardized — Security Policy, Terms of Service, Privacy Policy must agree on most-recent revision date OR each page reflects its actual last revision (no future dates, no Oct-2025 stale entries).
- [ ] **CONS-05**: "Most Popular" badge on Growth pricing card no longer overlaps card border — adjust badge positioning, padding, or `--radius-*` so it sits cleanly on/above the card edge.
- [ ] **CONS-06**: CTA button styling unified — Starter card CTA matches primary blue style; sales-contact buttons use the canonical "Contact Sales" label + a single secondary style; Features-page top-nav has ONE CTA pill (not duplicate "Start Free Trial" + "Get Started").
- [ ] **CONS-07**: `/compare/buildium` (and other compare pages) re-frames positioning choices — replace red-✗ + "Landlord-only platform" for "ACH/Payment Processing" and "HOA Management" with neutral "By design" / "Not applicable" treatment using a non-destructive token.
- [ ] **CONS-08**: `/contact` "How did you hear about us?" dropdown defaults to "Please select" or "Search engine" (not "Sales Outreach").
- [ ] **CONS-09**: Pricing-page Starter subhead spacing fixed — sentence reads as one line; "/mo" stays adjacent to price, not on a new line.
- [ ] **CONS-10**: Annual toggle savings figure is correct and explainable — math matches a real per-plan calc post-pricing-restructure (Phase 7 ships after PRICE phase). Either a single composite "Save $X/year" backed by math, or per-plan savings shown on each card.
- [ ] **CONS-11**: Resources nav dropdown items navigate to real URLs — replace `href="/#"` with the actual destination route(s); ensure keyboard navigation activates them.
- [ ] **CONS-13**: Trusted Integrations row renders all 5 logos (Stripe, Vercel, DocuSeal, Resend, Supabase) at consistent visual weight — fix faded Supabase logo (export issue or stuck hover state).
- [ ] **CONS-14**: Duplicate "Why Landlords Choose TenantFlow" comparison table de-duplicated — remove from one of homepage or `/features`, or differentiate so they don't read as accidental copy-paste.

> **Note**: CONS-12 (remove "Powered by Hudson Digital" footer) was removed from v1.0 scope per user decision. Footer signature kept site-wide.

### Copy & UX Refinement (COPY)

- [ ] **COPY-01**: Hero subhead reworded to remove tenant-tracking contradiction — replace "Track properties, tenants, leases, and maintenance in one place — tenants never have to log in" with phrasing that reads cleanly (e.g. "...tenant records, leases, and maintenance in one place — landlord-only, tenants stay off the platform").
- [ ] **COPY-02**: Replace "Join 500+ Growth subscribers" with "Built for landlords with 1–15 rentals" — segment-specific framing replaces the fabricated count. No FTC substantiation risk; conveys "this is for me" honestly. Update wherever the "500+" claim currently appears.
- [ ] **COPY-03**: "Tenants never have to log in" elevated from buried subhead to a visible badge or dedicated section on homepage — single strongest differentiator vs multi-role platforms.
- [ ] **COPY-04**: DocuSeal plan-tier note de-amplified — currently mentioned 6× across cards/comparison/FAQ/footer. Reduce to ≤3 strategic mentions (pricing card, comparison table, dedicated FAQ entry).
- [ ] **COPY-05**: FAQ canonicalized to `/faq` — homepage and `/pricing` FAQ sections reduced to 3–5 most relevant questions each, with a "See all FAQs" link to `/faq`. Eliminate duplicate-content SEO penalty.
- [ ] **COPY-06**: "Bulk-zip export (500/request)" softened to non-technical phrasing — "Tax-season zip exports" or "Bulk download for tax season" everywhere it currently shouts the technical limit.
- [ ] **COPY-07**: Hero dashboard mockup simplified and review fake names — drop "John Miller", "Emma Wilson", "David Park" if they collide with real people; consider a simpler single-workflow mockup that reads cleanly at all breakpoints.

### Design-Token Alignment — Visible Drift (TOKEN)

- [ ] **TOKEN-01**: Resources page Free Downloads tags ("Checklist", "Spreadsheet", "Guide") use `globals.css` tokens — eliminate neon pink that clashes with the blue/teal/grey palette. Use `--color-{primary,accent,info}` or muted backgrounds with `text-foreground`.
- [ ] **TOKEN-02**: `/resources` cards use consistent surface tokens — replace decorative grey/blue/mint/cream backgrounds with `bg-card` or `bg-muted` for visual coherence.
- [ ] **TOKEN-03**: Site-wide audit for hex/rgb/named colors and inline ms durations in `src/components/**` and `src/app/**` — replace with `globals.css` token references. Codify a lint rule (custom ESLint plugin or stylelint) or CI check that fails future PRs introducing non-token values.

### Trust & Conversion (TRUST)

- [ ] **TRUST-01**: At least 3 real testimonials with names + property counts + quotes — NO HEADSHOTS (user-supplied unavailable; use initials/geometric placeholder for avatar). Surfaced on homepage and/or pricing page.
- [ ] **TRUST-02**: G2 / Capterra / Trustpilot review badges added if any real reviews exist — competitor `/compare/*` pages cite Buildium's 4.5/5 making absence of TenantFlow's rating conspicuous.
- [ ] **TRUST-03**: CTA labels canonicalized to "Contact Sales" — replace "Talk to Sales" / "Schedule a walkthrough" / "Connect with sales" everywhere.
- [ ] **TRUST-04**: `sales@tenantflow.app` and `security@tenantflow.app` inboxes confirmed monitored before driving paid traffic; document monitoring owner.

### SEO & Accessibility (SEO)

- [ ] **SEO-01**: Meta-title separator standardized across all pages — choose em-dash (—) OR pipe (|) for the title-template separator and apply consistently. Update `src/app/layout.tsx` and per-page metadata.
- [ ] **SEO-02**: Per-page Open Graph images for `/pricing`, `/features`, `/compare/[competitor]`, blog category pages, and at least the top blog posts (where applicable post-Blog-Rebuild).
- [ ] **SEO-03**: Site-wide schema.org `Organization` JSON-LD in root layout; `SoftwareApplication` schema added to homepage for richer SERP snippets.
- [ ] **SEO-04**: Blog post slugs cleaned — drop millisecond-timestamp slugs like `/blog/error-1778151609106`. Already covered by BLOG-02; this REQ tracks the SEO outcome.
- [ ] **SEO-05**: Visible breadcrumbs on blog posts and `/compare/[competitor]` pages — JSON-LD breadcrumbs already exist on `/pricing`; render them in the UI as well. Blog portion already covered by BLOG-02.
- [ ] **SEO-06**: Site-wide `aria-current="page"` audit — use the Compare-on-homepage bug as a starting symptom; verify nav, breadcrumbs, footer, and any active-link components throughout.
- [ ] **SEO-07**: Footer links to XML sitemap; `robots.txt` confirmed pointing at `/sitemap.xml`.

### Performance & Conversion Polish (PERF)

- [ ] **PERF-01**: `/blog` index server-renders post list — eliminate the ~3-second client-side "Loading TenantFlow…" state. Already covered by BLOG-02; this REQ tracks the perf outcome.
- [ ] **PERF-02**: Marketing pages use static generation + explicit cache headers where eligible — reduce TTI on `/`, `/pricing`, `/features`, `/about`, `/compare/[competitor]`.
- [ ] **PERF-03**: Sticky / floating CTA on long pages (`/pricing` comparison, `/faq`, `/features`) — visible after scrolling past primary CTA so users don't scroll back up to convert.
- [ ] **PERF-04**: Exit-intent or scroll-depth lead-capture component on top marketing pages for paid-traffic optimization (gated behind a feature flag if A/B testing is desired).

## v2 Requirements

Deferred to v2.0 milestone or later. Tracked but not in v1.0 roadmap.

### Future scope
- **Visual redesign of bento grid / pricing cards** — token alignment + bug fixes only in v1.0; layout overhauls go later.
- **A/B testing harness for marketing pages** — opportunistic if PERF-04 needs it; otherwise v2.0+.
- **Customer logos row** — promote TRUST-01 once 3+ paying customers consent to logo use.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New product features (any) | v1.0 is correctness/alignment of existing surfaces only. |
| Tenant portal / tenant authentication | Permanently demolished; will not be re-added. |
| Rent payment facilitation | Permanently demolished; landlords manually log received amounts. |
| Smart tenant screening | Never built; copy claiming this gets removed without reintroduction. |
| Localization / i18n | English-only is the strategic choice. |
| Native mobile app | Responsive web only. |
| Auto-categorization of documents | v2.6 deferred indefinitely; not part of UI fix scope. |
| ROI / NOI / "automate 80%" claims | Substantiate or delete; never re-add unverifiable percentages to copy. |
| `bg-white` / hex / rgb / inline ms — anywhere | Cross-cutting hard rule; PRs that introduce these fail review. |
| Real customer headshots in testimonials | User cannot source; initials/geometric placeholders used instead (TRUST-01). |
| Removing "Powered by Hudson Digital" footer | User wants kept site-wide (CONS-12 dropped from scope). |
| Fabricated subscriber counts ("500+", "1000+", etc.) | Replaced with segment-specific framing per Key Decision (COPY-02). FTC substantiation + future-trust risk. |

## Traceability

Updated by `gsd-roadmapper` during roadmap creation. See ROADMAP.md for canonical phase assignments.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRIT-01 | Phase 1 | Pending |
| CRIT-02 | Phase 2 | Pending |
| CRIT-03 | Phase 1 | Pending |
| CRIT-04 | Phase 2 | Pending |
| CRIT-05 | Phase 3 | Pending |
| CRIT-06 | Phase 3 | Pending |
| CONS-01 | Phase 4 | Pending |
| COPY-01 | Phase 4 | Pending |
| COPY-02 | Phase 4 | Pending |
| COPY-03 | Phase 4 | Pending |
| COPY-04 | Phase 4 | Pending |
| COPY-05 | Phase 4 | Pending |
| COPY-06 | Phase 4 | Pending |
| COPY-07 | Phase 4 | Pending |
| PRICE-01 | Phase 5 | Pending |
| PRICE-02 | Phase 5 | Pending |
| PRICE-03 | Phase 5 | Pending |
| PRICE-04 | Phase 5 | Pending |
| PRICE-05 | Phase 5 | Pending |
| PRICE-06 | Phase 5 | Pending |
| BLOG-01 | Phase 6 | Pending |
| BLOG-02 | Phase 6 | Pending |
| BLOG-03 | Phase 6 | Pending |
| BLOG-04 | Phase 6 | Pending |
| BLOG-05 | Phase 6 | Pending |
| BLOG-06 | Phase 6 | Pending |
| CONS-05 | Phase 7 | Pending |
| CONS-09 | Phase 7 | Pending |
| CONS-10 | Phase 7 | Pending |
| CONS-02 | Phase 8 | Pending |
| CONS-03 | Phase 8 | Pending |
| CONS-11 | Phase 8 | Pending |
| CONS-04 | Phase 9 | Pending |
| CONS-13 | Phase 9 | Pending |
| CONS-14 | Phase 9 | Pending |
| CONS-06 | Phase 10 | Pending |
| CONS-07 | Phase 10 | Pending |
| CONS-08 | Phase 10 | Pending |
| TRUST-01 | Phase 10 | Pending |
| TRUST-02 | Phase 10 | Pending |
| TRUST-03 | Phase 10 | Pending |
| TRUST-04 | Phase 10 | Pending |
| TOKEN-01 | Phase 11 | Pending |
| TOKEN-02 | Phase 11 | Pending |
| TOKEN-03 | Phase 11 | Pending |
| SEO-01 | Phase 12 | Pending |
| SEO-02 | Phase 12 | Pending |
| SEO-03 | Phase 12 | Pending |
| SEO-04 | Phase 12 | Pending |
| SEO-05 | Phase 12 | Pending |
| SEO-06 | Phase 12 | Pending |
| SEO-07 | Phase 12 | Pending |
| PERF-01 | Phase 13 | Pending |
| PERF-02 | Phase 13 | Pending |
| PERF-03 | Phase 13 | Pending |
| PERF-04 | Phase 13 | Pending |

**Coverage:**
- v1 requirements: 55 total (after CONS-12 removed; PRICE-* and BLOG-* added)
- Mapped to phases: 55
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-08*
*Last updated: 2026-05-08 after v1.0 Q&A — pricing restructure + blog rebuild added as dedicated phases; CONS-12 removed; COPY-02 + TRUST-01 modified per user decisions*
