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

Each maps to roadmap phases. Source: external UI audit at `audit-ui-2026-05-08.md` (project root).

### Critical — Block Marketing Spend (CRIT)

- [ ] **CRIT-01**: Blog content regenerated or removed — every published row in `blogs` table currently renders "Error Processing Blog"; ~70 posts across 12 pages of pagination. Either (a) regenerate content for posts worth keeping, (b) un-publish broken rows so they 404 instead of showing error pages, or (c) bulk-delete and rebuild from scratch. SEO-priority: stop Google indexing duplicate "Error Processing Blog" pages.
- [ ] **CRIT-02**: Homepage stat counters animate to correct target values — fix `NumberTicker` (in `src/components/ui/number-ticker.tsx`) so "5 Entity Branches", "7 Default Categories", "500 Bulk-Zip Cap", "14 Day Free Trial" render correctly instead of "0". Source data in `stats-showcase.tsx` is already correct; bug is in animation/intersection-observer.
- [ ] **CRIT-03**: Max plan price reconciled across all surfaces — pricing card, `pricing-comparison-table.tsx`, homepage features grid, JSON-LD `Product` schema. Pick ONE value (recommend "Custom" for sales-led OR "$199/mo" for self-serve) and propagate everywhere.
- [ ] **CRIT-04**: Mobile layout works at 375px — fix hero text overflow ("spreadsheet" word breaks viewport), CTA button truncation, and add a working hamburger nav. All marketing-page nav links must be reachable on mobile. Verify in Chrome DevTools device toolbar (iPhone SE / mid-range Android).
- [ ] **CRIT-05**: `/signup` route either functions or 301s to `/pricing` — eliminate the `/signup → /login → /signup` redirect loop. External links/ads pointing at `/signup` must reach a working page.
- [ ] **CRIT-06**: Long-form legal URLs alias to short paths — `/terms-of-service` → `/terms`, `/privacy-policy` → `/privacy`, `/help-center` → `/help`, `/rss-feed` → `/feed.xml`. Use Next.js `redirects()` config (301 permanent). Update `proxy.ts` `PUBLIC_ROUTES` if the long forms need to skip auth.

### Consistency — Visual & Copy (CONS)

- [ ] **CONS-01**: Persona language unified across all marketing pages — pick ONE primary persona ("landlord" recommended given product is landlord-only) and global find-and-replace. Hero, About, meta descriptions, FAQ, and headline copy must agree.
- [ ] **CONS-02**: "Multi-Property Dashboard" feature card uses correct `lucide-react` icon (e.g. `LayoutGrid` / `Building2` / `LayoutDashboard`) — currently a back-arrow.
- [ ] **CONS-03**: Active-nav state on homepage stops highlighting "Compare" — fix `aria-current="page"` logic so `/` highlights the appropriate link (or none).
- [ ] **CONS-04**: Legal-page "Last Updated" dates standardized — Security Policy, Terms of Service, and Privacy Policy must agree on most-recent revision date OR each page reflects its actual last revision (no future dates, no Oct-2025 stale entries).
- [ ] **CONS-05**: "Most Popular" badge on Growth pricing card no longer overlaps card border — adjust badge positioning, padding, or `--radius-*` so it sits cleanly on/above the card edge.
- [ ] **CONS-06**: CTA button styling unified — Starter card CTA matches primary blue style; "Talk to Sales" / "Contact Sales" buttons use a single canonical secondary style; Features-page top-nav has ONE CTA pill (not duplicate "Start Free Trial" + "Get Started").
- [ ] **CONS-07**: `/compare/buildium` (and other compare pages) re-frames positioning choices — replace red-✗ + "Landlord-only platform" for "ACH/Payment Processing" and "HOA Management" with neutral "By design" / "Not applicable" treatment using a non-destructive token.
- [ ] **CONS-08**: `/contact` "How did you hear about us?" dropdown defaults to "Please select" or "Search engine" (not "Sales Outreach").
- [ ] **CONS-09**: Pricing-page Starter subhead spacing fixed — "Ideal for property owners managing a few properties." reads as one sentence; "/mo" stays adjacent to price, not on a new line.
- [ ] **CONS-10**: Annual toggle savings figure is correct and explainable — "Save $158" either matches a real per-plan calc (verified Starter $29×12 - annual price; Growth $79×12 - annual price) OR is removed in favor of per-plan savings shown on each card.
- [ ] **CONS-11**: Resources nav dropdown items navigate to real URLs — replace `href="/#"` with the actual destination route(s); ensure keyboard navigation activates them.
- [ ] **CONS-12**: Footer "Powered by Hudson Digital" line removed — TenantFlow is the brand on its own marketing site.
- [ ] **CONS-13**: Trusted Integrations row renders all 5 logos (Stripe, Vercel, DocuSeal, Resend, Supabase) at consistent visual weight — fix faded Supabase logo (export issue or stuck hover state).
- [ ] **CONS-14**: Duplicate "Why Landlords Choose TenantFlow" comparison table de-duplicated — remove from one of homepage or `/features`, or differentiate the two so they don't read as accidental copy-paste.

### Copy & UX Refinement (COPY)

- [ ] **COPY-01**: Hero subhead reworded to remove tenant-tracking contradiction — replace "Track properties, tenants, leases, and maintenance in one place — tenants never have to log in" with phrasing that reads cleanly (e.g. "...tenant records, leases, and maintenance in one place — landlord-only, tenants stay off the platform").
- [ ] **COPY-02**: "Join 500+ Growth subscribers" social proof verified or replaced — confirm the count is accurate against `stripe.subscriptions` for Growth plan; if aspirational, change to a verifiable claim (e.g. customer-count, downloads, or remove entirely).
- [ ] **COPY-03**: "Tenants never have to log in" elevated from buried subhead to a visible badge or dedicated section on homepage — this is the single strongest differentiator vs multi-role property-management platforms.
- [ ] **COPY-04**: DocuSeal plan-tier note de-amplified — currently mentioned 6× across cards/comparison/FAQ/footer. Reduce to ≤3 strategic mentions (pricing card, comparison table, dedicated FAQ entry).
- [ ] **COPY-05**: FAQ canonicalized to `/faq` — homepage and `/pricing` FAQ sections reduced to 3-5 most relevant questions each, with a "See all FAQs" link to `/faq`. Eliminate duplicate-content SEO penalty.
- [ ] **COPY-06**: "Bulk-zip export (500/request)" softened to non-technical phrasing — "Tax-season zip exports" or "Bulk download for tax season" everywhere it currently shouts the technical limit.
- [ ] **COPY-07**: Hero dashboard mockup simplified and review fake names — drop "John Miller", "Emma Wilson", "David Park" if they collide with real people; consider a simpler single-workflow mockup that reads cleanly at all breakpoints.

### Design-Token Alignment — Visible Drift (TOKEN)

- [ ] **TOKEN-01**: Resources page Free Downloads tags ("Checklist", "Spreadsheet", "Guide") use `globals.css` tokens — eliminate neon pink that clashes with the blue/teal/grey palette. Use `--color-{primary,accent,info}` or muted backgrounds with `text-foreground`.
- [ ] **TOKEN-02**: `/resources` cards use consistent surface tokens — replace decorative grey/blue/mint/cream backgrounds with `bg-card` or `bg-muted` for visual coherence.
- [ ] **TOKEN-03**: Site-wide audit for hex/rgb/named colors and inline ms durations in `src/components/**` and `src/app/**` — replace with `globals.css` token references. Codify a lint rule or CI check if ROI warrants.

### Trust & Conversion (TRUST)

- [ ] **TRUST-01**: At least 3 real testimonials with names + headshots + property counts surfaced on homepage and/or pricing.
- [ ] **TRUST-02**: G2 / Capterra / Trustpilot review badges added if any real reviews exist — competitor `/compare/*` pages cite Buildium's 4.5/5 making absence of TenantFlow's rating conspicuous.
- [ ] **TRUST-03**: CTA labels canonicalized — pick ONE phrasing for sales-contact ("Talk to Sales" recommended) and replace "Contact Sales" / "Schedule a walkthrough" / "Connect with sales" everywhere.
- [ ] **TRUST-04**: `sales@tenantflow.app` and `security@tenantflow.app` inboxes confirmed monitored before driving paid traffic; document monitoring owner.

### SEO & Accessibility (SEO)

- [ ] **SEO-01**: Meta-title separator standardized across all pages — choose em-dash (—) OR pipe (|) for the title-template separator and apply consistently. Update `src/app/layout.tsx` and per-page metadata.
- [ ] **SEO-02**: Per-page Open Graph images for `/pricing`, `/features`, `/compare/[competitor]`, blog category pages, and at least the top-traffic blog posts.
- [ ] **SEO-03**: Site-wide schema.org `Organization` JSON-LD in root layout; `SoftwareApplication` schema added to homepage for richer SERP snippets.
- [ ] **SEO-04**: Blog post slugs cleaned — drop millisecond-timestamp slugs like `/blog/error-1778151609106`. Either regenerate slugs from titles or delete the bad rows.
- [ ] **SEO-05**: Visible breadcrumbs on blog posts and `/compare/[competitor]` pages — JSON-LD breadcrumbs already exist on `/pricing`; render them in the UI as well.
- [ ] **SEO-06**: Site-wide `aria-current="page"` audit — use the Compare-on-homepage bug as a starting symptom; verify nav, breadcrumbs, footer, and any active-link components throughout.
- [ ] **SEO-07**: Footer links to XML sitemap; `robots.txt` confirmed pointing at `/sitemap.xml`.

### Performance & Conversion Polish (PERF)

- [ ] **PERF-01**: `/blog` index server-renders post list — eliminate the ~3-second client-side "Loading TenantFlow…" state. Use Server Component data fetching.
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

## Traceability

Empty initially — populated by `gsd-roadmapper` during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| (pending roadmap) | — | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 0 ⚠️ (pending roadmap)
- Unmapped: 41 ⚠️

---
*Requirements defined: 2026-05-08*
*Last updated: 2026-05-08 after initial definition*
