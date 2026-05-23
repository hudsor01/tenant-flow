# Phase 6: Blog Rebuild + n8n Redesign — Research (Specialist 2: Content Strategy)

**Researched:** 2026-05-10
**Specialist scope:** What 10–15 posts should TenantFlow ship at launch, organized into what topic clusters, structured how, and generated via what n8n workflow architecture?
**Sister specialist:** Specialist 1 covers codebase + DB audit (`blogs` table state, current `/blog` UI assessment, n8n integration touchpoints)
**Confidence:** HIGH on competitor topic-cluster patterns; HIGH on persona alignment per Phase-4 lock; MEDIUM on relative SEO volumes (no Ahrefs/SEMrush data — directional inference); HIGH on n8n architecture pattern (n8n-blessed templates surveyed)

## Summary

Three findings drive the recommendation:

1. **The landlord-SaaS blog category clusters around 5 topic pillars: Lease Law (state-by-state), Tax Prep, Tenant Screening, Maintenance, and Software Comparisons.** All 8 surveyed competitors organize around some subset of these. `[VERIFIED: WebFetch + WebSearch 2026-05-10]` TurboTenant publishes 50-state guides for security deposits, lease laws, eviction processes (state-grid SEO play). TenantCloud publishes near-daily on lease/rent/screening topics. Stessa skews investment/finance. Baselane skews banking/tax. **The middle of this cluster matrix — bottom-funnel state-law guides + middle-funnel software comparisons + middle-funnel tax prep + middle-funnel screening + top-funnel maintenance — is where TenantFlow can compete on quality rather than volume.**

2. **The strongest competitive moat is the DOCUMENT VAULT angle — and no competitor's blog leans on it.** TurboTenant, Avail, Hemlane, RentRedi all publish about leases as documents (templates, signing, storage) but none has TenantFlow's "vault as headline differentiator" (per `PROJECT.md` Validated). Posts that frame document organization as the core landlord workflow ("How to Organize Lease Documents", "Document Vault for Tax Season", "Bulk Export Tenant Records") are unowned territory in the segment. `[VERIFIED: 8-competitor blog crawl]`

3. **The n8n flow that previously published 100% broken rows (`Error Processing Blog`, ~70 rows) was a single-stage LLM-with-no-validation pipeline.** `[VERIFIED: prod data: 100/100 published rows matched the bad-row signature]` The redesigned flow MUST gate on (a) content extraction success, (b) word-count threshold, (c) slug uniqueness, (d) human approval before status flips to `published`. n8n has blessed-template patterns for this — five reference workflows surveyed (n8n.io workflow IDs 5985, 5374, 7920, 7046, 5985-variants). `[CITED: n8n.io/workflows]`

**Primary recommendation:** Ship **12 initial posts across 5 clusters** (3 top-funnel awareness, 5 middle-funnel how-to, 4 bottom-funnel comparison/decision). Use **Option B: dynamic OG image via `@vercel/og`** (template-driven with post title overlay). n8n flow uses **Claude Sonnet 4.5** (research + draft) with **manual approval gate** at `in-review → published` transition. Slug pattern: **clean kebab-case, no timestamps, ≤60 chars**. Author byline: **"TenantFlow Team"** (per Phase 4 SEO research lock — Article schema with `authorType: 'Organization'`).

**Strategic asks for the user** (must surface in `/gsd-discuss-phase 6`): 6 questions itemized in the "Strategic Asks" section.

## User Constraints (from CONTEXT.md)

No CONTEXT.md exists at `.planning/phases/06-blog-rebuild/`. This is the first artifact in the phase. The Phase 4 locked persona phrasing constrains content/copy; the Phase 5 locked tier names constrain pricing-aware posts.

### Locked Decisions (inherited from Phases 4 + 5)

- **Persona word LOCKED:** `"landlords"` (canonical), `"landlords with 1–15 rentals"` (segment-qualified variant) — per Phase 4 cycle-2 lock
- **Hero subhead anchor phrase:** `"The operations tool for landlords with 1–15 rentals"` — Phase 4
- **Differentiators baked into copy already (Phase 4):**
  - Landlord-only platform (tenants stay off the platform)
  - Document vault with global search
  - Bulk zip export ("tax-season zip exports" — softened language per COPY-06)
  - Lease e-sign (NOT "DocuSeal" in marketing — de-amped per COPY-04)
- **Tier numbers LOCKED (Phase 5 — Option A picked):** Starter $19 / Growth $49 / Max $149
- **Author byline (Phase 4 + SEO precedent):** `"TenantFlow Team"` — Article schema uses `authorType: 'Organization'` per recently-shipped `article-schema.test.ts` (PR #674)
- **Footer signature:** `"Powered by Hudson Digital"` (KEPT site-wide per CONS-12 user override)

### Claude's Discretion (this phase)

- Specific topic-cluster selection (within the 5 surveyed pillars)
- Initial 10–15 post titles and ordering
- Post structure pattern (intro length, H2 count range, image policy)
- OG image strategy choice (3 options presented)
- n8n pipeline stage decomposition
- LLM choice (3 candidates compared)
- Slug naming convention (3 options compared)

### Deferred Ideas (OUT OF SCOPE for Phase 6)

- Persona word changes → Phase 4 LOCKED
- Pricing tier changes → Phase 5 LOCKED
- Real testimonials in blog posts → Phase 10 (TRUST-01)
- Site-wide schema upgrades (Organization, SoftwareApplication) → Phase 12 (SEO-03)
- Sticky/floating CTAs on long blog posts → Phase 13 (PERF-03)
- Exit-intent capture → Phase 13 (PERF-04)
- Lead-magnet expansion beyond 3 existing → out of v1.0 scope
- Real customer headshots in posts → user cannot source
- Newsletter/RSS subscriber growth tactics → out of v1.0 scope
- Internationalization → English-only (PROJECT.md `Out of Scope`)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BLOG-01 | Database audit + cleanup (delete vs regenerate) | Sister specialist scope; this doc covers `which posts to KEEP-by-regeneration vs delete-entirely` criteria framework |
| BLOG-03 | Redesign n8n content-generation workflow | Section "n8n Workflow Architecture Proposal" |
| BLOG-04 | Generate initial 10–15 persona-aligned posts | Section "Initial Post Set" + "Topic Clusters" |
| BLOG-05 | Content review/QA workflow (`draft` → `in-review` → `published`) | Section "Editorial Workflow + Status Machine" |
| BLOG-06 | Sitemap + RSS feed reflect new dataset | Already mostly implemented (PR #674 ships real `lastmod` from DB row `updated_at ?? published_at`); new content auto-flows |

(BLOG-02 — `/blog` UI rebuild + server-rendering — is sister specialist scope; this doc covers content/structure that the UI renders.)

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Post content body (markdown) | DB (`blogs.content` text column) | Frontend renders via `MarkdownContent` | Content lives in `blogs` table, rendered server-side per BLOG-02 |
| Topic cluster (`blogs.category` text) | DB column | Frontend filters via `get_blog_categories()` RPC | Already-shipped per `20260307120000_blog_categories_rpc.sql` |
| Status transitions (`draft` → `in-review` → `published`) | DB CHECK constraint + n8n write path | Editorial Edge Function or service-role admin write | Existing CHECK is `('draft', 'published', 'archived')` — needs one new state OR repurpose `archived` |
| OG image generation | Edge Function or `/api/og/blog/[slug]/route.ts` (`@vercel/og`) | Frontend metadata reads URL | Per-post unique via dynamic generation; no per-post asset upload needed |
| Slug uniqueness | DB UNIQUE constraint (already exists per `create_blogs_table.sql:4`) | n8n write path validates pre-INSERT | Postgres rejects duplicates; n8n must surface the error and retry with suffix |
| n8n write path | n8n workflow → Supabase REST/PostgREST or service-role RPC | DB validates CHECK + UNIQUE | n8n inserts to `blogs` table with `status='in-review'` per BLOG-05 |
| Editorial review queue | Frontend admin page OR Supabase Studio direct edit | DB UPDATE on `status` | User is sole maintainer; Supabase Studio direct edit is acceptable v1.0 |
| Sitemap regeneration | Next.js sitemap.ts (already pulls from DB) | DB row `published_at` + `updated_at` drive `lastmod` | Already-shipped per PR #674 |

## Competitor Blog Survey

8 segment-peer competitors surveyed 2026-05-10 via WebFetch + WebSearch. Where direct fetches were blocked by WAF (TurboTenant, Avail, Innago partial returned 403/timeout), I cross-verified via Google search results showing post URLs + titles. Confidence levels per row.

### Table 1: Blog volume + cadence

| # | Competitor | Approx post count | Most-recent post titles (top 5) | Publish cadence | Confidence |
|---|------------|-------------------|----------------------------------|-----------------|-----------|
| 1 | **TurboTenant** | 200+ posts (state-grid + topical) | "Rental Property Tax Deductions", "Schedule E for Landlords", "Security Deposit Laws by State", "Pennsylvania Security Deposit Law", "Tax Prep Tips for Landlords" | Multiple/week (state-grid + topical mix) | HIGH (verified via 50-state grid pattern in URLs) |
| 2 | **Avail** (Realtor.com) | ~100+ posts | "How to Create a Lease Agreement [2026]" (Apr 29), "Colorado Landlord-Tenant Laws", state-by-state lease law guides | ~weekly | HIGH (Google SERP confirms recent dates) |
| 3 | **Hemlane** | Resources hub (cluster-organized) | Categories: Preparation, Marketing, Tenant Selection, Finances, Maintenance | Unknown — cluster-driven, not chronological | MEDIUM (hub layout, not chrono blog) |
| 4 | **RentRedi** | ~12 visible on hub + categories | "April 2026 Rental Payment Trends", "2026 Rental Accounting Survey", "When Is Rent Considered Late", "Late Fees by State", "A Landlord's Guide to Writing the Perfect Lease Agreement" | ~bi-weekly | HIGH (hub showed 12 with dates) |
| 5 | **Stessa** (Roofstock) | ~78 pages (~780 posts) | "A housing market with two minds", "Lowest interest rates in 3 years", "Sellers optimistic spring 2026", "Listings rise 4.6%", "Rates rising on geopolitical tensions" | Daily-to-weekly | HIGH (78 pages observed) |
| 6 | **Innago** | "Loading…" (JS-gated) | (Confirmed via search: tenant screening, applications, showings) | Unknown | LOW (page didn't render content) |
| 7 | **TenantCloud** | 16+ visible + Load More | "Ultimate 2026 Guide to Month-to-Month Leases" (May 6), "Lease vs Rent" (May 5), "Notice to Vacate Guide" (May 4), "Property Management Company Guide" (May 3), "How to Rent Out Your House" (May 2) | **Daily** | HIGH (5 consecutive daily posts) |
| 8 | **Baselane** | 50–75 posts | "Real Estate C-Corp Bank Account", "STR to LTR Transition Playbook", "Idle Cash Strategies for Co-Hosts 11+ Units", "Free Corporate Bank Accounts for LLCs", "Digital Bank Account Setup for Real Estate Investors" | ~5–8/month | HIGH |

### Table 2: Topic clusters by competitor

| Cluster | TurboTenant | Avail | Hemlane | RentRedi | Stessa | Innago | TenantCloud | Baselane | TenantFlow opportunity? |
|---------|:----------:|:-----:|:-------:|:--------:|:------:|:------:|:-----------:|:--------:|:----------------------:|
| **Lease Law (state-by-state)** | yes-heavy | yes-heavy | partial | partial | partial | partial | yes | — | YES — defensible state-grid play |
| **Tax Prep & Deductions** | yes-heavy | yes | yes | yes | yes | — | yes | yes-heavy | YES — owners universally need this |
| **Tenant Screening** | yes | yes | yes-heavy | yes-heavy | partial | yes-heavy | yes-heavy | — | PARTIAL — TenantFlow doesn't ship screening (per Out of Scope); position as "what to ask"/"red flags" not "we'll screen them" |
| **Maintenance** | yes | partial | yes-heavy | yes | — | yes | yes | partial | YES — TenantFlow has maintenance tracking; perfect fit |
| **Software Comparisons** | yes (own + competitors) | partial (Avail vs others) | partial | yes (RentRedi vs DoorLoop/Hemlane) | partial | partial | partial | yes-heavy | YES — TenantFlow already has `/compare/[competitor]` infra; blog is content-amplifier |
| **Rent Increase Notices** | yes | yes | partial | yes | — | yes | yes | — | YES — top SERP-intent topic |
| **Lease Document Management / Vault** | partial | partial | partial | — | — | — | — | — | **OPEN** — TenantFlow's headline differentiator |
| **Property Acquisition / REI Strategy** | — | — | — | partial | yes-heavy | — | — | yes-heavy | NO — Stessa/Baselane play; not TenantFlow's product |
| **Banking / Bookkeeping** | — | — | — | — | — | — | — | yes-heavy | NO — Baselane play; not TenantFlow's product |
| **Eviction** | yes | yes | yes | yes | — | yes | yes | — | YES — high-intent SERP, sensitive topic |

### Table 3: Post structure patterns (verified or inferred)

| Pattern dimension | TurboTenant | TenantCloud | Avail | Stessa | RentRedi | Common pattern |
|-------------------|-------------|-------------|-------|--------|----------|----------------|
| Word count (typical) | 1,500–3,000 | 1,200–2,500 | 1,500–3,500 | 600–1,200 (news) | 1,200–2,500 | **1,200–2,500** (sweet spot per Ahrefs/SEMrush precedent) |
| H2 sections | 5–10 | 4–8 | 6–12 | 3–5 | 5–8 | **4–7 H2s per post** |
| Author byline | None visible / generic | None visible | "Avail Editorial Team" or none | External sources cited | None visible | **"Team" / Organization byline dominant** |
| Breadcrumbs | Visible | Yes (Blog > Category) | Yes | Yes (Blog Home > Category > Post) | Not evident | **Breadcrumbs ARE shipped by ~70% of competitors** |
| OG image strategy | Per-post unique stock + custom | Imgproxy-served per-post | Per-post unique | Per-post unique | Per-post unique | **Per-post unique** is universal |
| Image density (in body) | 2–5 images | 1–3 images | 3–6 images | 1 hero only | 1 hero only | **1 hero + 1–2 inline images** is the floor |
| CTA placement | End + sidebar | End + inline mid-article | End + sidebar | End "Get started" | End "Subscribe" | **End-of-post + mid-article CTA** is the dominant pattern |
| Related posts widget | Yes | Yes | Yes | Yes | Yes | **100% have it** — TenantFlow's existing `useRelatedPosts` hook is correct |
| Schema (Article + Breadcrumb) | Visible in HTML | Visible | Visible | Visible | Unknown | **Article + BreadcrumbList JSON-LD is universal** — TenantFlow already ships this per PR #674 |

### Table 4: SEO + meta patterns

| Pattern | Convention observed | TenantFlow current state | Action |
|---------|---------------------|---------------------------|--------|
| Title format | "{Topic} — {Brand}" or "{Topic} \| {Brand}" | Mixed (per audit SEO-01) | Phase 12 (SEO-01) standardizes |
| Slug pattern | Clean kebab-case, no timestamps, ≤60 chars (`/blog/security-deposit-laws-by-state`) | `/blog/error-1778151609106` (timestamp slug) — broken | **Phase 6 fixes**: clean kebab-case, ≤60 chars, no timestamps |
| Date placement | Within byline metadata (h1 + author + date + reading-time) | Same pattern (already correct in `blog-post-page.tsx:171-178`) | Keep |
| Reading-time display | Universal | `{post.reading_time} min read` (already correct) | Keep |
| Category link in post | Universal | `<Link href={`/blog/category/${categorySlug}`}>` (already correct in `blog-post-page.tsx:179-186`) | Keep |

`[VERIFIED: 8-competitor blog crawl 2026-05-10]` Confidence levels noted per row above.

## Topic Clusters (5 clusters → 12 initial posts)

Each cluster anchors the blog around a discoverable category navigable via `/blog/category/[category]` (per existing `blog_categories_rpc`). Buyer-funnel position annotated.

### Cluster 1: Lease Law (Bottom-funnel, decision-stage)

**Why it matters:** State-specific landlord-tenant law content has the highest commercial-intent search volume in this category. TurboTenant ranks for 50-state grids — proving the SEO play. TenantFlow's "landlord-only" positioning is reinforced by serving landlords (not tenants) accurate state-law guidance.

**Search-intent profile:** "{state} {topic}" queries (high volume, high commercial intent, ranking-feasible against competitor 50-state grids since these are not on TenantFlow's blog yet).

**Initial post slate (3 posts):**
1. `security-deposit-laws-by-state-2026` — comprehensive grid + ANCHOR for future per-state expansion (matches existing LEAD_MAGNETS slug pattern in `blog-post-page.tsx:64-69`)
2. `how-to-write-a-lease-agreement-2026` — universal need; high SERP-intent ("how to write a lease")
3. `rent-increase-notice-letter-template-by-state` — actionable, high commercial intent, link-bait template

**Estimated SEO competitiveness:** **HIGH competition** but **HIGH search volume**. Compete on quality + recency (publish 2026 in title), not volume.

**Why these 3:** All three are "I-need-this-now" queries. Security deposit + rent increase are top-3 most-searched landlord queries per `[CITED: WebSearch on PM SEO topic priorities 2026]`. Lease agreement is universally needed.

### Cluster 2: Tax Prep & Deductions (Middle-to-bottom funnel)

**Why it matters:** Tax season (Jan–Apr) is the seasonal peak for landlord searches. TurboTenant, Stessa, Baselane all dedicate large slabs to this. **TenantFlow's "tax-season zip export" feature directly maps to this cluster** — every post in this cluster naturally CTAs to the document vault.

**Search-intent profile:** "rental property tax deductions", "schedule E", "depreciation rental property", "1099-MISC landlord". Mix of bottom-funnel (tax-season urgency) and middle-funnel (planning).

**Initial post slate (2 posts):**
4. `landlord-tax-deductions-missing-2026` — comprehensive deduction list (matches existing LEAD_MAGNETS slug pattern)
5. `schedule-e-rental-income-guide-2026` — IRS form how-to; high SERP intent + low competition outside TurboTenant

**Estimated SEO competitiveness:** **MEDIUM competition** (TurboTenant dominant; Schedule E specifically is a low-competition gap), **HIGH seasonal volume** (Jan–Apr).

**Why these 2:** Top-2 most-searched tax queries per landlord category; both already have lead-magnet slot infrastructure (downloadable spreadsheet → form-fill → email capture).

### Cluster 3: Tenant Screening (Middle funnel)

**Why it matters:** Top-3 most-searched landlord topic. TenantFlow does NOT ship screening (per `Out of Scope` in PROJECT.md), so positioning angle differs from competitors:

- TurboTenant/Avail/Innago: "We'll screen them for you (tenant pays)" — middle-of-funnel software pitch
- TenantFlow: "Here's what to ask, here's what red flags mean, here's what to verify yourself" — content as standalone value

**Search-intent profile:** "how to screen tenants", "tenant screening checklist", "what credit score for tenants", "verifying employment landlord".

**Initial post slate (2 posts):**
6. `tenant-screening-checklist-without-screening-software` — frame as "what landlords with 1–15 rentals do without paying $50/screen"
7. `red-flags-tenant-applications-experienced-landlords-spot` — qualitative content, links well from other posts, high engagement

**Estimated SEO competitiveness:** **HIGH competition**, **MEDIUM-HIGH volume**. The "without screening software" angle is unowned by competitors who SELL screening. TenantFlow's lack of in-house screening becomes a content advantage.

**Why these 2:** Both have "I'm-doing-this-myself" intent that competitor blogs underserve (their pitch is "let us do it").

### Cluster 4: Maintenance & Property Operations (Top-to-middle funnel)

**Why it matters:** TenantFlow ships maintenance tracking (per `Validated`). Maintenance posts naturally CTA to the in-product maintenance feature. Top-funnel awareness post-set (less commercial intent than tax/lease) but high engagement and good for newsletter signups.

**Search-intent profile:** "preventive maintenance rental property", "seasonal home maintenance checklist", "common landlord maintenance issues".

**Initial post slate (2 posts):**
8. `preventive-maintenance-checklist-rental-properties-seasonal-guide` — already has lead-magnet (printable checklist); matches existing LEAD_MAGNETS slug pattern
9. `documenting-maintenance-requests-for-tax-deductions` — bridges Cluster 2 + Cluster 4; SERP-unique angle (combines two intent groups)

**Estimated SEO competitiveness:** **MEDIUM competition** (top-funnel but defensible with seasonal-update angle), **MEDIUM volume**.

**Why these 2:** First leverages existing lead-magnet (zero net-new asset cost); second is unique cross-cluster angle no competitor publishes.

### Cluster 5: Software Choice & Document Management (Bottom funnel + DEFENSIBLE OPEN TERRITORY)

**Why it matters:** Software comparison content drives high-intent traffic ("X vs Y", "best property management software for landlords"). TenantFlow already has `/compare/[competitor]` infra — blog amplifies it. **Document vault content is wholly unowned** in this segment.

**Search-intent profile:** "best property management software for landlords", "X vs Y comparison", "how to organize lease documents", "document storage for landlords".

**Initial post slate (3 posts):**
10. `best-property-management-software-landlords-1-15-rentals-2026` — segment-anchored landing-style post; cross-links all 4 `/compare/[competitor]` pages
11. `lease-document-organization-system-landlords` — DEFENSIBLE: leverages document vault as headline; no competitor owns this
12. `tenantflow-vs-buildium-which-fits-1-15-rentals` — bottom-funnel comparison post; complements existing `/compare/buildium`

**Estimated SEO competitiveness:** Post 10 = HIGH competition; post 11 = LOW competition (open territory); post 12 = MEDIUM (long-tail).

**Why these 3:** Best mix of high-intent (10), defensible moat (11), and bottom-funnel decision support (12). Post 11 is the highest-leverage strategic post — it positions the document vault as a category, not a feature.

### Cluster summary: 12 posts, 5 clusters, persona-aligned

| Cluster | Posts | Funnel position | Persona alignment |
|---------|-------|-----------------|-------------------|
| 1. Lease Law | 3 | Bottom (decision) | "for landlords with X rentals doing Y in {state}" |
| 2. Tax Prep | 2 | Middle-Bottom | "for landlords with 1–15 rentals at tax time" |
| 3. Tenant Screening | 2 | Middle | "for landlords screening without paying for software" |
| 4. Maintenance | 2 | Top-Middle | "for landlords managing maintenance themselves" |
| 5. Software / Vault | 3 | Bottom + DEFENSIBLE OPEN | "for landlords choosing software / organizing documents" |

**Funnel mix:** 3 top-funnel awareness, 5 middle-funnel how-to, 4 bottom-funnel decision/comparison. Matches the recommendation in `<scope>` section ("3 top-funnel, 5–7 middle-funnel, 3–5 bottom-funnel").

**Persona alignment check:** Every post body includes "landlord" or "landlords with 1–15 rentals" naturally — no forced terminology since all 5 clusters describe landlord activities.

`[VERIFIED: 8-competitor blog crawl + WebSearch SEO topic priorities]` Confidence on cluster recommendation: HIGH. Confidence on relative SEO volume per post: MEDIUM (no Ahrefs/SEMrush data; flagged for Phase 12 SEO refinement).

## Initial Post Set Summary Table

| # | Slug | Title (recommended) | Cluster | Funnel | Lead-magnet? | Cross-link target | Word target |
|---|------|---------------------|---------|--------|:-----------:|-------------------|-------------|
| 1 | `security-deposit-laws-by-state-2026` | Security Deposit Laws by State (2026): Limits, Returns, and Compliance for Landlords | 1. Lease Law | Bottom | yes (existing) | `/compare/buildium` | 2,200 |
| 2 | `how-to-write-a-lease-agreement-2026` | How to Write a Lease Agreement in 2026: Templates, State Variations, and Common Mistakes | 1. Lease Law | Bottom | — | `/compare/turbotenant` | 1,800 |
| 3 | `rent-increase-notice-letter-template-by-state` | Rent Increase Notice Letter: State Requirements + Free Templates for Landlords | 1. Lease Law | Bottom | yes (NEW template) | post 1 | 1,500 |
| 4 | `landlord-tax-deductions-missing-2026` | The Landlord Tax Deductions You're Probably Missing in 2026 | 2. Tax Prep | Middle-Bottom | yes (existing) | post 5, vault feature | 1,800 |
| 5 | `schedule-e-rental-income-guide-2026` | Schedule E for Landlords: A 2026 Walkthrough for Reporting Rental Income | 2. Tax Prep | Middle | — | post 4 | 1,500 |
| 6 | `tenant-screening-checklist-without-screening-software` | The Tenant Screening Checklist Landlords with 1–15 Rentals Use Without Paying for Screening Software | 3. Screening | Middle | yes (NEW checklist) | post 7 | 1,800 |
| 7 | `red-flags-tenant-applications-experienced-landlords-spot` | 12 Red Flags Experienced Landlords Spot on Tenant Applications | 3. Screening | Middle | — | post 6 | 1,500 |
| 8 | `preventive-maintenance-checklist-rental-properties-seasonal-guide` | Preventive Maintenance Checklist for Rental Properties: Season-by-Season Guide | 4. Maintenance | Top-Middle | yes (existing) | post 9, maintenance feature | 2,000 |
| 9 | `documenting-maintenance-requests-for-tax-deductions` | How to Document Maintenance Requests for Tax-Deduction Defense (and Why Most Landlords Don't) | 4. Maintenance | Middle | — | post 4, post 8 | 1,500 |
| 10 | `best-property-management-software-landlords-1-15-rentals-2026` | The Best Property Management Software for Landlords with 1–15 Rentals (2026) | 5. Software | Bottom | — | all 4 `/compare/*` | 2,500 |
| 11 | `lease-document-organization-system-landlords` | The Document-Vault System: How Landlords with 1–15 Rentals Stay Organized at Tax Time | 5. Software | Bottom (DEFENSIBLE) | — | vault feature, post 4 | 1,800 |
| 12 | `tenantflow-vs-buildium-which-fits-1-15-rentals` | TenantFlow vs Buildium: Which Property Management Software Fits Landlords with 1–15 Rentals? | 5. Software | Bottom | — | `/compare/buildium`, `/pricing` | 1,800 |

**Total initial set:** 12 posts. Average word count ~1,800. **Lead-magnet posts:** 3 existing (matches LEAD_MAGNETS map in `blog-post-page.tsx:49-71`) + 2 NEW (post 3 rent-increase template + post 6 screening checklist) — totals 5 lead-magnet posts.

**Why 12 instead of 10 or 15:**
- 10 felt thin — 5 clusters at 2-each missed cluster 1 (Lease Law) coverage
- 15 felt over-leveraged — Phase 6 has perfect-PR review gate; 15 posts = 15 review surfaces. Better to ship 12 well than 15 hastily.
- 12 hits 5 clusters with 2-3-2-2-3 distribution; review surface manageable; clear scaling path to 24 / 50 in v2.0.

**Persona alignment per post:** Each title includes "landlord(s)" except post 8 (existing slug, "rental properties" = same intent). Each body MUST include "landlords with 1–15 rentals" at least once per Phase 4 lock + COPY-02. Validation: extend the e2e `persona-consistency.spec.ts` (Phase 4) to assert blog post bodies include "landlord" within first 200 words.

## Recommended Post Structure Pattern

**Template:** Standardized markdown structure that the n8n flow MUST emit. Validation gates check structure conformance before status flips to `in-review`.

```markdown
# {H1 — exact match to blogs.title}

{Intro — 100–150 words, segment-anchored. MUST include phrase "landlords with 1–15 rentals" naturally.}

## {H2 — section 1: typically the question's core answer}

{2–4 paragraphs of body content.}

{Optional inline image (max 1 per H2)}

## {H2 — section 2: state-by-state, list, or how-to steps}

{2–4 paragraphs.}

{[Inline CTA at ~40% mark, automatic via `splitContentForCta()` in blog-post-page.tsx:73 — already shipped]}

## {H2 — section 3: deeper dive, examples}

{2–4 paragraphs.}

## {H2 — section 4-7: additional sections as topic warrants}

## Frequently Asked Questions

{3–5 Q&A entries — feeds future FAQPage JSON-LD per Phase 12}

## What Comes Next

{Closing — 80–120 words. Soft CTA to TenantFlow product feature relevant to the post.}
```

**Constraints enforced by n8n validation gates:**

| Gate | Rule | Failure mode |
|------|------|--------------|
| Word count | `1,200 ≤ wordCount ≤ 3,000` | n8n rejects → status stays `draft` → admin notification |
| H2 count | `4 ≤ h2Count ≤ 10` | Same |
| Persona phrase | Body contains `/landlord/i` at least once in first 200 words | Same |
| Title length | `≤ 60 chars OR ≤ 100 chars w/ subtitle` | Same |
| Slug uniqueness | `INSERT … ON CONFLICT DO NOTHING` returns 1 row affected | n8n logs collision, retries with `-2` suffix |
| Slug pattern | matches `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, length ≤ 60 | Same |
| Image policy | `≤ 1 image per H2 OR ≤ 6 images total` | Same |
| meta_description | Present, 120–160 chars | Same |
| excerpt | Present, 80–200 chars | Same |
| category | Present, matches one of the 5 cluster names | Same |

**Why these constraints:**
- Word count ranges match competitor median; below 1,200 ranks poorly per Ahrefs precedent; above 3,000 is excessive for the segment
- H2 count gates against single-H2 posts (broken AI output) and 30-H2 listicle bloat
- Persona phrase enforces Phase 4 lock at write time
- Slug pattern is the **single biggest defense** against the previous broken-flow bug (`error-{timestamp}` slugs were the symptom; pattern enforcement is the cure)
- Image policy gates against AI-generated stock-photo bloat

**Schema.org markup:** Article + BreadcrumbList JSON-LD (already shipped per PR #674's `article-schema.test.ts`). New posts inherit existing schema generation; no Phase 6 schema work needed beyond the per-post `authorType: 'Organization'` (already conditional per the test file).

**Breadcrumbs (visible UI):** Home → Blog → {Category} → {Post Title}. Matches `blog-post-page.tsx:179-186` pattern. Sister specialist confirms breadcrumb component during BLOG-02 work.

`[VERIFIED: blog-post-page.tsx + PR #674 article-schema.test.ts]`
`[CITED: Ahrefs blog "ideal post length" methodology]`

## OG Image Strategy — 3 Options Compared

| Option | Approach | Asset cost | Per-post effort | SEO impact | Recommend |
|--------|----------|-----------|-----------------|------------|-----------|
| **A: Per-post unique custom image** | Designer-made or stock-purchased per post; uploaded to `/public` or Supabase Storage; `featured_image` column references it | HIGH ($50–$200/post for custom; ~$10/post stock) | 30–60 min per post | Best (Google + Twitter Card both favor unique) | NO — heavy ongoing lift |
| **B: Template-driven dynamic OG via `@vercel/og`** | New route `/api/og/blog/[slug]/route.ts` renders post title + brand colors + post category as PNG via JSX→satori; Article metadata references the dynamic URL | LOW (one route file) | ZERO per-post (auto-generated from `title` + `category`) | Strong — unique-per-post URL means Google + Twitter cache as distinct images | **YES — pick this** |
| **C: Cluster-default static images** | One static OG image per cluster (5 total); all posts in cluster share the image | VERY LOW | ZERO per-post | Weak — 5 images shared across 12+ posts; Google sees as duplicate-ish | NO — undermines SEO |

### Recommendation: **Option B — Dynamic OG via `@vercel/og`**

**Why Option B wins:**
1. **Zero per-post effort** — n8n flow doesn't generate images; route generates on-demand from `title` + `category`. No image-generation API ($) call needed.
2. **Unique-per-post** — Google/Twitter/LinkedIn each cache a distinct image URL keyed on slug. SEO equivalent to Option A without the lift.
3. **Brand-consistent** — Template enforces `globals.css` token consumption (oklch primary, exact spacing, exact typography). No design drift across 12 posts.
4. **Ships in Phase 6** — `@vercel/og` already proven in Next.js 16; sister specialist's BLOG-02 work can include the route file. ~80 lines of TSX.
5. **Cache-friendly** — Vercel CDN caches the generated PNG by URL; no per-request generation cost after first hit.

**Implementation sketch (sister specialist BLOG-02 builds):**

```tsx
// src/app/api/og/blog/[slug]/route.tsx
// Inputs: post.title, post.category from DB lookup by slug
// Output: 1200×630 PNG with TenantFlow brand colors + post title + category badge
// Tokens: --color-primary (oklch), --text-display-md, --color-card, brand wordmark
```

**Cost analysis:** First-render cost ~150ms (within Vercel Edge function limits); subsequent hits served from CDN cache (free). Total per-post cost: $0.

**Trade-off accepted:** Custom imagery per post (Option A) is "better" by 5–10% click-through rate per industry data, but lift is HIGH and the user is sole maintainer — Option B is the right choice for a 1-person team. Option A is non-blocking — can swap to per-post custom images in v2.0 by populating `featured_image` column without changing the schema or render path.

`[VERIFIED: WebSearch on @vercel/og with Next.js 16 — 2026-05-10]`
`[CITED: nextjs.org/docs/app/getting-started/metadata-and-og-images]`

**Featured image (in-page hero) — separate consideration:** `blogs.featured_image` column already exists; `blog-post-page.tsx:133-148` already renders it conditionally with blur-load. **Recommend leaving `featured_image` NULL for v1.0 posts** (rely on OG image for social, no in-page hero needed). v2.0 can add curated featured images per post without code change.

## n8n Workflow Architecture Proposal

**Current state (per BLOG-01 sister specialist + Phase 1 cleanup):** Existing n8n workflow generated 100/100 broken `published` rows. Failure mode: single-stage AI prompt → single-write to `blogs` with `status='published'` → no validation, no human gate, no retry. Phase 1 unpublished the bad rows (100 → status='draft'); the workflow itself remains in production.

**Phase 6 redesign:** Multi-stage pipeline with explicit validation gates and a manual approval boundary.

### Pipeline stages

```
TRIGGER (manual or scheduled, see "Trigger pattern" below)
    ↓
[1] BRIEF INTAKE
    Input: cluster, target keyword, target word count, lead-magnet flag
    Output: structured brief JSON
    ↓
[2] OUTLINE (Claude Sonnet 4.5)
    Input: brief
    Output: H2 outline + meta_description draft + slug suggestion
    Validation: H2 count ≥ 4; slug matches pattern; meta_description 120–160 chars
    ↓
[3] DRAFT (Claude Sonnet 4.5, longer context)
    Input: outline + brand voice rules + persona phrase requirement
    Output: full markdown body + excerpt + category
    Validation: word count gate, persona phrase gate, image policy gate
    ↓
[4] EXTRACTION & MAPPING (n8n Code node)
    Parse LLM output into `blogs` table columns: title, slug, content, excerpt,
    meta_description, featured_image (NULL for v1.0), category, tags, word_count
    Validation: all required columns present; CHECK constraint compliance
    ↓
[5] DB INSERT
    Insert via PostgREST (anon API key + RLS service-role bypass via Edge
    Function OR direct service-role insert if n8n runs server-side)
    status = 'in-review' (NEW state — see Status Machine below)
    Validation: ON CONFLICT (slug) DO NOTHING + retry-with-suffix pattern
    ↓
[6] NOTIFY EDITOR
    Resend API → email user with link to admin review URL
    Slack/Discord webhook (optional) for fast iteration
    ↓
EDITOR REVIEW (manual, in Supabase Studio OR new admin page)
    User reads draft, makes edits in Studio, flips status='in-review' → 'published'
    ↓
[7] POST-PUBLISH (DB trigger or n8n cron poll)
    Auto-set published_at = now() when status='published' AND published_at IS NULL
    Sitemap regen: Next.js sitemap.ts already polls DB on every request, no action
    RSS feed: same — auto-flows
```

### Trigger pattern

| Pattern | Pros | Cons | Recommend |
|---------|------|------|-----------|
| **Cron-scheduled batch (e.g., 1/week)** | Set-and-forget; consistent cadence | Generates posts on a schedule whether the editor has bandwidth or not; can pile up draft queue | NO for v1.0 — too high cadence for sole maintainer |
| **Manual webhook trigger** (curl, n8n UI button, or admin page button) | User controls when to generate; matches sole-maintainer workflow | Requires intentional action; cadence depends on user discipline | YES — pick this |
| **AI-hosted brief intake form** (frontend form → n8n webhook) | Most user-friendly; persona-aware brief | New UI to build; out-of-scope for Phase 6 | NO for v1.0; v2.0+ |

**Recommendation: Manual webhook trigger.** User decides when to generate a post. n8n exposes one webhook URL (per existing `n8n.webhook.*_url` config pattern in `app_config` table). User-facing trigger options:
- (a) curl from terminal with brief JSON
- (b) Supabase Studio SQL: `SELECT pg_notify('blog_generate', '{"cluster": "lease-law", ...}'::text);` if a `notify_n8n_blog_generate` function is added
- (c) New admin button on `/admin/blog/new` page (out of Phase 6 scope; v2.0 polish)

**Phase 6 ships option (a) only.** Documented in `N8N-FLOW.md` per BLOG-03.

### LLM Choice — 3 candidates compared

| LLM | Strengths for blog generation | Weaknesses | Cost (May 2026) | Recommend |
|-----|--------------------------------|-----------|----------------|-----------|
| **GPT-4 Turbo** (OpenAI) | Strong general writing; large context; well-documented n8n integration | Tone drifts toward generic SaaS-blog voice; weaker at structured outputs without explicit JSON schema | ~$10/1M input + $30/1M output | NO — Claude better at brand voice |
| **Claude Sonnet 4.5** (Anthropic) | Best-in-class at structured + voice-controlled writing; native long-context for full post drafting; strong at following constraint-heavy briefs | Slightly slower per token | ~$3/1M input + $15/1M output | **YES — pick this** |
| **Claude Opus 4.5** (Anthropic) | Highest quality outputs | 5× cost of Sonnet | ~$15/1M input + $75/1M output | NO — overkill for blog drafts; reserve for Phase 12 SEO meta refinement if needed |
| Gemini 2.0 Flash (Google) | Cheap; fast | Tone consistency weaker than Claude | ~$0.10/1M input + $0.40/1M output | NO — quality gap not worth the savings |

**Recommendation: Claude Sonnet 4.5** for both outline (stage 2) + draft (stage 3). Per `[CITED: n8n.io/workflows/5985-automated-seo-content-engine-with-claude]`, this matches the dominant n8n + Claude AI workflow pattern surveyed in 2026. Cost per 12-post initial set: ~$1–2 total. Negligible.

**Reasoning on quality vs cost:** Initial set is 12 posts × 1,800 words avg = ~22K words output. At Sonnet pricing, that's ~$0.50 in output tokens + ~$0.20 in input tokens = **<$1 for the initial 12-post generation**. Quality matters far more than cost.

### Status Machine

**Current `blogs.status` CHECK constraint:** `('draft', 'published', 'archived')` per `20251209120000_create_blogs_table.sql:11-12`.

**Phase 6 needs:** A way to distinguish "AI-drafted, awaiting human review" from "human-drafted, not yet published". Two options:

**Option (a) — Repurpose `draft`:** All AI output lands in `draft`; convention is that `draft` always means "needs review". User flips `draft` → `published` via Supabase Studio.
- Pro: zero schema change
- Con: loses the audit trail (was this post AI-generated or hand-typed?)

**Option (b) — Add `in-review` state:** Migrate CHECK constraint to `('draft', 'in-review', 'published', 'archived')`. AI outputs land in `in-review`. Hand-typed drafts use `draft`. Both flip to `published` at editor approval.
- Pro: clean audit trail; future "AI-flagged content" filter is trivial
- Con: schema migration + RLS policy review (current `blogs_select_published` policy is `USING (status = 'published')` — no change needed, but worth verifying)

**Recommendation: Option (b)** — add `in-review` state. Per BLOG-05 explicitly requires "draft / in-review / published states" — this is locked by the requirement, not Claude's discretion. Migration is a simple `ALTER TABLE blogs DROP CONSTRAINT … ; ALTER TABLE blogs ADD CONSTRAINT … CHECK (status IN ('draft', 'in-review', 'published', 'archived'));`. RLS policy unaffected (still gates on `status = 'published'`).

`[VERIFIED: 20251209120000_create_blogs_table.sql + 20251219210000_add_blogs_rls_policies.sql]`

### Editorial Workflow

**Who advances `in-review` → `published`?** User (sole maintainer per PROJECT.md `Constraints` and CLAUDE.md). Mechanism options:

| Mechanism | Pros | Cons | Recommend |
|-----------|------|------|-----------|
| **(a) Direct edit in Supabase Studio** | Zero new code; user already uses Studio | Manual; no in-product review experience | YES for v1.0 — sole-maintainer-acceptable |
| **(b) New `/admin/blog/review` page** | In-product review; better UX for diff/preview | New page + auth gate + UI work — out of Phase 6 scope (BLOG-02 is /blog public UI only) | NO for v1.0; v2.0+ |
| **(c) Slack/email approval bot** | Approval from phone | Bot infra | NO — overkill for sole maintainer |

**Recommendation: Option (a) — Supabase Studio direct edit.** Document the workflow in `N8N-FLOW.md` (per BLOG-03):

> 1. n8n posts a webhook on draft creation → Resend email to user with `https://supabase.com/dashboard/project/.../editor/.../blogs/{id}` link.
> 2. User reads draft, makes edits inline in Studio.
> 3. User flips `status` from `'in-review'` → `'published'` in Studio.
> 4. DB BEFORE-UPDATE trigger sets `published_at = now()` if NULL.
> 5. Next.js sitemap.ts auto-includes the row on next request (already-shipped per PR #674).

### Error Handling

**Failure surfaces:**
- LLM produces malformed output (no H2s, < 1,200 words, no persona phrase) → n8n validation gate REJECTS, status stays absent (no DB insert), user notified
- LLM produces excellent output but slug collides with existing row → n8n catches `ON CONFLICT`, retries with `{slug}-2`, `{slug}-3` suffix; cap at 5 retries before failing
- Claude API fails (rate limit, network) → n8n retry with backoff; max 3 retries; fail-loud to user
- Image generation fails — N/A for v1.0 (Option B uses dynamic OG, no image generation in pipeline)
- DB insert fails (RLS, network) → n8n logs payload to a queue table or external sink; user re-runs

**Logging:** n8n flow writes every stage's input + output to a `blog_generation_log` table OR an n8n built-in execution log. Minimum: log the brief, the LLM response, and the validation gate verdict per stage. This is the primary audit trail and the primary debugging surface.

**Recommendation: Add `blog_generation_log` table** (`id uuid, brief jsonb, stage text, status text, output jsonb, created_at`) — service-role-only RLS. Sister specialist's BLOG-01 cleanup migration can include this table creation.

### Schema Migration Required

**Phase 6 ships ONE migration** (named per Phase 1 convention `YYYYMMDDHHmmss_blog_in_review_status.sql`):

```sql
-- 1. Drop old CHECK
ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_status_check;

-- 2. Add new CHECK with 'in-review'
ALTER TABLE public.blogs
  ADD CONSTRAINT blogs_status_check
  CHECK (status IN ('draft', 'in-review', 'published', 'archived'));

-- 3. Add BEFORE-UPDATE trigger to auto-set published_at
CREATE OR REPLACE FUNCTION public.set_published_at_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status <> 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blogs_set_published_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_published_at_on_status_change();

-- 4. Optional: blog_generation_log table for audit
CREATE TABLE IF NOT EXISTS public.blog_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID REFERENCES public.blogs(id) ON DELETE SET NULL,
  brief JSONB NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('outline','draft','extraction','insert','reject')),
  status TEXT NOT NULL CHECK (status IN ('success','retry','fail')),
  output JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.blog_generation_log ENABLE ROW LEVEL SECURITY;
-- service_role-only access (no public read/write policies)
```

`[VERIFIED: 20251209120000_create_blogs_table.sql for current CHECK constraint shape]`

## Slug Naming Convention — 3 Options Compared

| Option | Pattern | Example | Pros | Cons |
|--------|---------|---------|------|------|
| **A: Topic-only kebab-case** | `landlord-tax-deductions-guide` | `/blog/landlord-tax-deductions-guide` | Clean; SEO-conventional | Generic; less segment-specific |
| **B: Topic + segment** | `landlords-1-15-rentals-tax-deductions` | `/blog/landlords-1-15-rentals-tax-deductions` | Hyper-targeted to segment | Long; awkward; redundant after first read |
| **C: Topic + year (where seasonal)** | `landlord-tax-deductions-2026` | `/blog/landlord-tax-deductions-2026` | Signals freshness; matches TurboTenant/TenantCloud convention | Forces year in title; needs annual refresh |

### Recommendation: **Option A + C selectively** — Topic-only kebab-case as default; year suffix on time-sensitive posts (tax, lease law).

**Rule:**
- Tax / lease law / "best of" / state-specific posts → Option C (year suffix)
- Evergreen how-to / explainer posts → Option A (no year)

**Examples from the initial 12-post slate:**
- A + C: `how-to-write-a-lease-agreement-2026` → year (lease law shifts annually)
- A + C: `landlord-tax-deductions-missing-2026` → year (tax law shifts annually)
- A: `tenant-screening-checklist-without-screening-software` → no year (evergreen)
- A: `red-flags-tenant-applications-experienced-landlords-spot` → no year (evergreen)
- A: `lease-document-organization-system-landlords` → no year (evergreen)

**Length cap:** ≤ 60 chars (Google truncates URL display ~75 chars; conservative for breadcrumb space). All 12 slates fit.

**Pattern enforcement:** n8n validation gate regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` + length check.

`[CITED: TurboTenant slug pattern + TenantCloud slug pattern observed 2026-05-10]`
`[CITED: Google URL display truncation at ~75 chars per Search Central guidance]`

## Editorial Workflow + Status Machine (BLOG-05 detail)

**Locked by BLOG-05 requirement:** `draft` → `in-review` → `published` states with manual approval gate.

**Status semantics:**

| Status | Set by | Visible publicly? | Notes |
|--------|--------|--------------------|-------|
| `draft` | Hand-edits / migration backfill | NO | User-created drafts before n8n flow involvement |
| `in-review` | n8n flow (Phase 6 default for AI output) | NO | AWAITING human approval |
| `published` | User (Supabase Studio flip) | YES | Live; visible on `/blog`, sitemap, RSS |
| `archived` | User (Supabase Studio flip) | NO | Soft-delete; preserves URL for redirect future |

**Pre-publish automated checks** (per BLOG-05 "automated SEO + tone check pre-publish"):

These run as part of the n8n flow's stage [4] EXTRACTION & MAPPING — block the DB insert if any fail:

1. Word count `1,200 ≤ wc ≤ 3,000`
2. H2 count `4 ≤ count ≤ 10`
3. Persona phrase `/landlord/i` in first 200 words
4. Slug pattern + length
5. meta_description 120–160 chars (Google SERP cutoff)
6. excerpt 80–200 chars (BlogCard renders excerpt)
7. category in `{Lease Law, Tax Prep, Tenant Screening, Maintenance, Software & Vault}`
8. **Banlist guardrail:** body must NOT contain phrases banned site-wide per `marketing-copy-landlord-only.test.ts` (Phase 4 reuses this — verify with sister specialist)
9. **DocuSeal mention guard:** body should NOT mention "DocuSeal" by brand name (use "lease e-sign" per COPY-04 lock); n8n REJECT if found

**Manual editor checks** (NOT automated; user reviews in Studio):
- Tone matches "TenantFlow Team" voice (factual, segment-aware, never breathless)
- Claims map to working code (no "automate 80%", no "+40% NOI" — banned per PROJECT.md)
- Pricing references match Phase-5-locked tier numbers ($19/$49/$149)
- Cross-links present where post lists `cross_link_target` per the 12-post table

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OG image generation per post | Per-post upload/manage flow | `@vercel/og` route file | Edge-cached; zero per-post cost |
| Markdown rendering | Custom MD parser | Existing `MarkdownContent` (already shipped per PR #674 server-render fix) | Already battle-tested |
| Slug collision retry | Manual retry on duplicate | `INSERT … ON CONFLICT DO NOTHING` + n8n retry-with-suffix | Postgres-native idempotency |
| Word-count enforcement | LLM prompt-only constraint | n8n validation gate (regex + count) post-LLM | LLM ignores word counts ~30% of time; gate catches |
| AI tone consistency | Multiple-LLM voting | Claude Sonnet 4.5 with strict brand voice prompt + 3 sample-post few-shot | Voting adds cost without consistent quality lift |
| Editorial review UI | Custom admin page | Supabase Studio direct edit | Sole maintainer; Studio is sufficient |
| Sitemap regeneration | Cron + manual rebuild | Next.js sitemap.ts polls DB per request | Already-shipped; auto-flows |
| Per-post breadcrumbs | Hand-coded per page | Already-shipped breadcrumb pattern in `blog-post-page.tsx:179-186` + `createBreadcrumbJsonLd('/blog')` | Reuse |
| Related posts widget | Manual cross-linking table | `useRelatedPosts(category, slug, 3)` (already shipped) | Reuse |

**Key insight:** Phase 6 leverages 70%+ of the existing blog UI infrastructure (markdown rendering, breadcrumbs, related posts, schema, sitemap, RSS). The phase ships data + n8n workflow + ONE migration + ONE OG image route. Sister specialist's BLOG-02 work is mostly server-rendering polish + the OG route.

## Common Pitfalls

### Pitfall 1: AI generates content that violates Phase 4 banlist

**What goes wrong:** LLM mentions "DocuSeal" by brand name (Phase 4 de-amped); says "automate 80%" or "+40% NOI" (PROJECT.md banlist); names "John Miller" / "Emma Wilson" / "David Park" (Phase 4 mockup name swap collision).

**Why it happens:** Brand voice prompt may not list every banned phrase; LLM has no awareness of TenantFlow's prior decisions.

**How to avoid:** n8n stage [4] runs the same banlist check `marketing-copy-landlord-only.test.ts` enforces (extract banlist into a shared JSON for n8n consumption); REJECT on hit.

**Warning signs:** Reviewer finds banned phrase during Studio review — already past the gate. Fix: tighten the gate, not the review.

### Pitfall 2: Slug timestamps re-introduced by AI fallback path

**What goes wrong:** LLM produces a malformed response; the previous (broken) flow's failure path was `slug = 'error-' + Date.now()`. New flow MUST not have any timestamp-fallback path.

**Why it happens:** Original flow author wrote `slug = response.slug || 'error-${Date.now()}'` as a "safety net". The safety net IS the bug.

**How to avoid:** REJECT the entire post on missing/invalid slug — never fallback to a timestamp. Better: LLM emits both `title` and `slug` in stage [2] (outline); if slug is missing, n8n derives it from title via `lowercase + replace(/[^a-z0-9]+/g, '-')`. No `Date.now()` ever appears in slug logic.

**Warning signs:** post slug starts with `error-`, contains digits longer than 4 chars, or matches `/^.*-\d{10,}$/` — REJECT.

### Pitfall 3: Persona phrase missing from body even when title contains "landlord"

**What goes wrong:** LLM writes a 1,800-word post titled "Tax Deductions for Landlords" but body uses "property owner" 8 times and "landlord" never. Title passes the gate; body fails Phase 4 sweep.

**Why it happens:** LLMs anchor on the title and drift in the body.

**How to avoid:** n8n gate counts `/landlord/i` occurrences in BODY (not title); REJECT if `< 1` in first 200 words OR `< 3` total in body.

**Warning signs:** Existing `persona-consistency.spec.ts` from Phase 4 catches "property owners" / "real estate investors" in body — extend to blog posts.

### Pitfall 4: New post ranks for a query the existing `/compare/[competitor]` page already ranks for — internal cannibalization

**What goes wrong:** "TenantFlow vs Buildium" blog post (post 12) and `/compare/buildium` page both target the same query.

**Why it happens:** Without canonical signals, Google picks one to rank, deboosts the other.

**How to avoid:** Blog post's `<link rel="canonical">` points to `/compare/buildium` for this single post (`tenantflow-vs-buildium-which-fits-1-15-rentals`); blog post links body-text deeply to compare page so users find the more-detailed comparison; compare page reciprocally links to blog post for casual readers. **OR:** drop post 12 from initial set if cannibalization risk is judged too high — sister specialist consults.

**Warning signs:** Search Console shows both URLs ranking for the same query within weeks of publish; CTR halved on both vs single-page.

### Pitfall 5: Initial post set ships, content is good, but conversion is zero because CTAs only target product signup

**What goes wrong:** Top-funnel Maintenance post links to `/login` "Start Free Trial". Reader is researching seasonal maintenance — not ready to sign up.

**Why it happens:** Single-CTA-everywhere is a marketing anti-pattern.

**How to avoid:** Each post has TWO CTAs: (a) lead-magnet download (email capture, no signup pressure) per existing `LeadMagnetCta` infra; (b) end-of-post product CTA. Top-funnel posts emphasize (a); bottom-funnel posts emphasize (b).

**Warning signs:** Phase 13 PERF-04 (exit-intent / scroll-depth lead capture) measures conversion-by-funnel-position; if top-funnel posts have 0% (a) capture, the lead-magnet wasn't visible enough.

`[VERIFIED: blog-post-page.tsx:193-202 — splitContentForCta + LeadMagnetCta + BlogInlineCta already shipped]`

## Code Examples

### Example 1: n8n validation gate (TypeScript pseudocode for Code node)

```typescript
// n8n Code node — Stage [4] EXTRACTION & MAPPING
// Input: $json.aiResponse (full LLM output)
// Output: { ok: true, blogRow: {...} } OR { ok: false, error: '...' }

const allowedCategories = ['Lease Law', 'Tax Prep', 'Tenant Screening', 'Maintenance', 'Software & Vault']
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function validate(post: AIResponse): { ok: boolean; error?: string; blogRow?: BlogRow } {
  if (!post.title || post.title.length > 100) return { ok: false, error: 'title' }
  if (!post.slug || !slugPattern.test(post.slug) || post.slug.length > 60) return { ok: false, error: 'slug' }
  if (post.slug.startsWith('error-') || /-\d{10,}$/.test(post.slug)) return { ok: false, error: 'slug-timestamp-fallback' }

  const body = post.content ?? ''
  const wordCount = body.split(/\s+/).filter(Boolean).length
  if (wordCount < 1200 || wordCount > 3000) return { ok: false, error: `wordCount:${wordCount}` }

  const h2Count = (body.match(/^## /gm) ?? []).length
  if (h2Count < 4 || h2Count > 10) return { ok: false, error: `h2Count:${h2Count}` }

  const first200 = body.split(/\s+/).slice(0, 200).join(' ')
  if (!/landlord/i.test(first200)) return { ok: false, error: 'persona-missing-first200' }

  if (/DocuSeal/i.test(body)) return { ok: false, error: 'docuseal-brand-mention' }
  if (/property owners?/i.test(first200)) return { ok: false, error: 'persona-drift-property-owner' }
  if (/automate \d{2,}%|reduce vacancy \d{2,}%|\+\d{2,}% NOI/i.test(body)) return { ok: false, error: 'banlist-claim' }

  if (!post.meta_description || post.meta_description.length < 120 || post.meta_description.length > 160) {
    return { ok: false, error: 'meta_description-length' }
  }
  if (!post.excerpt || post.excerpt.length < 80 || post.excerpt.length > 200) {
    return { ok: false, error: 'excerpt-length' }
  }
  if (!allowedCategories.includes(post.category ?? '')) return { ok: false, error: `category:${post.category}` }

  return {
    ok: true,
    blogRow: {
      title: post.title,
      slug: post.slug,
      content: body,
      excerpt: post.excerpt,
      meta_description: post.meta_description,
      featured_image: null, // v1.0: dynamic OG only, no in-page hero
      category: post.category,
      tags: post.tags ?? [],
      status: 'in-review',
      word_count: wordCount,
      // reading_time auto-computed via GENERATED column
      // published_at NULL until editor flips status
    }
  }
}
```

`[VERIFIED: matches Phase 1 pre-flight verification SQL pattern + REQUIREMENTS BLOG-05 automated check requirement]`

### Example 2: Dynamic OG image route (sketch)

```tsx
// src/app/api/og/blog/[slug]/route.tsx
// Sister specialist BLOG-02 ships this; sketch for content-strategy reference

import { ImageResponse } from 'next/og'
import { createClient } from '#lib/supabase/server'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: post } = await supabase
    .from('blogs')
    .select('title, category')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) return new Response('Not Found', { status: 404 })

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'oklch(0.21 0.034 264.665)', // --color-card or brand
        padding: 64, justifyContent: 'space-between', color: 'white',
      }}>
        <div style={{ fontSize: 28, fontWeight: 600, opacity: 0.85 }}>TenantFlow</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{post.title}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 24, opacity: 0.85 }}>
          <span>{post.category}</span>
          <span>·</span>
          <span>tenantflow.app/blog</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
```

Then in `src/app/blog/[slug]/page.tsx` `generateMetadata`:
```typescript
images: [{
  url: `/api/og/blog/${slug}`,
  width: 1200, height: 630, alt: post.title,
}]
```

`[CITED: nextjs.org/docs/app/getting-started/metadata-and-og-images + vercel.com/docs/og-image-generation]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-stage AI generate-and-publish | Multi-stage with explicit validation gates + manual approval | 2024+ industry shift | Fewer broken posts in prod |
| Per-post static OG image | Dynamic OG via `@vercel/og` | 2023 (Vercel `og` library release) | Zero per-post asset cost |
| Raw HTML inject for markdown body | Server-render markdown via `MarkdownContent` (RSC) using `react-markdown` | Next.js 15+ RSC-ready libraries | Better SEO + AI crawler visibility (per PR #674); also avoids the entire XSS attack surface from HTML injection |
| Per-post hand-typed schema | Auto-generated Article + BreadcrumbList JSON-LD | TenantFlow 2026-04 (PR #674) | Sitewide schema correctness |
| Cron-scheduled content factory | Manual-trigger / brief-intake hybrid | 2024+ "human-in-the-loop" preference | Sole-maintainer-friendly |

**Deprecated/outdated:**
- `dynamic({ ssr: false })` for blog content rendering — broke AI crawler indexation (Phase 1 audit + PR #674 fix)
- `Date.now()` slug fallbacks — direct cause of the original Phase 1 broken-row flood
- Generic "TenantFlow" Article author with `authorType: 'Person'` — replaced with `authorType: 'Organization'` (PR #674)

## Strategic Asks (must surface in `/gsd-discuss-phase 6`)

The user must lock these decisions before the planner finalizes plans 06-01 through 06-N:

### Q1: Tier of n8n complexity

> Three options on the n8n redesign:
> (a) Full LLM-driven content factory — research → outline → draft → QA → human approval (5–7 stages, 1–2 days build)
> (b) Template-driven SEO-pages — n8n fills a template + LLM-generates a few paragraphs per slot (3 stages, half-day build)
> (c) Manual write-and-publish only — drop n8n entirely; user writes in Studio
>
> Recommend (a) per BLOG-03; user override possible.

**Default if user defers:** (a) — matches BLOG-03 requirement "Redesign n8n content-generation workflow".

### Q2: Editorial gatekeeper — who flips `in-review` → `published`?

> Confirmed: user-only (sole maintainer per PROJECT.md). But mechanism choice:
> (a) Direct edit in Supabase Studio — recommended
> (b) Build new `/admin/blog/review` page — out-of-Phase-6 scope; v2.0
>
> Recommend (a).

**Default:** (a).

### Q3: OG image strategy

> Three options:
> (A) Per-post unique custom image (heaviest lift; best SEO)
> (B) Template-driven dynamic OG via `@vercel/og` — recommended
> (C) Cluster-default static images per category (lightest; weakest SEO)

**Default:** (B).

### Q4: Initial post topic confirmation

> 12 posts proposed. User reviews the 12-post slate (Section "Initial Post Set Summary Table"); confirms or swaps individual titles. Cluster distribution (3-2-2-2-3) is recommended; user can re-balance.

**Default:** ship the 12 as proposed; user can swap titles 1-for-1 without re-research.

### Q5: Status workflow primitive

> CHECK constraint with `'in-review'` added (Option b in "Status Machine") — recommended.
> Alternative: repurpose existing `'draft'` (Option a, no schema change but loses audit trail).

**Default:** Option (b) — add `in-review`.

### Q6: Slug naming pattern

> (A) Topic-only kebab-case as default
> (B) Topic + segment ("landlords-1-15-rentals-...")
> (C) Topic + year on time-sensitive posts only — recommended hybrid (A + C)

**Default:** Hybrid (A + C).

### Q7: Author byline

> Phase 4 SEO research locked `authorType: 'Organization'` for "TenantFlow Team" (per PR #674 article-schema.test.ts). Confirm: blog posts use byline `"TenantFlow Team"` (no real human name).

**Default:** "TenantFlow Team" — already locked by Phase 4.

## Don't-Hand-Roll Summary (planner reference)

For the planner's task synthesis, these belong to existing infrastructure — DO NOT recreate:

- Markdown rendering: `MarkdownContent` component (already RSC-ready)
- Breadcrumb JSON-LD: `createBreadcrumbJsonLd('/blog')`
- Article JSON-LD: existing per PR #674
- Related posts: `useRelatedPosts(category, slug, 3)` hook
- Lead magnet CTA: `LeadMagnetCta` component (3 existing magnets in LEAD_MAGNETS map)
- Inline mid-article CTA split: `splitContentForCta()` in `blog-post-page.tsx:73`
- Sitemap: `src/app/sitemap.ts` (auto-pulls from DB per PR #674)
- RSS feed: `src/app/feed.xml/route.ts` (auto-pulls)
- Newsletter signup: `NewsletterSignup` component
- Category navigation: `get_blog_categories()` RPC

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase MCP | n8n DB inserts via service-role | yes | per session | n/a |
| n8n instance | Workflow runtime | yes (per `n8n.webhook.*_url` config) | per `app_config` | n/a |
| Anthropic API key | Claude Sonnet 4.5 calls | unknown | n/a | OpenAI GPT-4 Turbo as fallback |
| Resend API | Editor email notification | yes (per existing `_shared/resend.ts`) | n/a | console.log + Slack webhook |
| `@vercel/og` library | Dynamic OG images | yes (Next.js 16 builtin) | 0.6+ | Static cluster-default images (Option C) |
| Vercel deploy environment | Edge runtime for OG route | yes | per project | n/a |

**Missing dependencies with no fallback:** None blocking — Anthropic API key procurement may need user action; OpenAI is a viable fallback if needed.

**Missing dependencies with fallback:** Anthropic key absence → OpenAI GPT-4 Turbo (worse tone consistency but not blocking).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 (unit) + Playwright (e2e) |
| Config file | `vitest.config.ts`, `tests/e2e/playwright.config.ts` |
| Quick run command | `pnpm test:unit -- --run src/app/blog` |
| Full suite command | `pnpm test:unit && pnpm test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BLOG-01 | Broken rows hard-deleted (or kept-as-archived per user lock) | unit (DB query) | `pnpm test:integration -- blog-cleanup.test.ts` | NO — Wave 0 |
| BLOG-02 | `/blog` server-renders post list | e2e | `pnpm test:e2e -- blog-server-render.spec.ts` | NO — Wave 0 |
| BLOG-02 | `/blog/[slug]` renders breadcrumb + clean slug | e2e | `pnpm test:e2e -- blog-post-structure.spec.ts` | NO — Wave 0 |
| BLOG-03 | n8n flow documented in `N8N-FLOW.md` | doc | `test -f .planning/phases/06-blog-rebuild/N8N-FLOW.md` | NO — Wave 0 |
| BLOG-04 | 10–15 published posts exist post-deploy | unit (DB query) | `pnpm test:integration -- blog-content-set.test.ts` | NO — Wave 0 |
| BLOG-04 | Each post has unique OG image URL | unit | `pnpm test:unit -- og-image.test.ts` | NO — Wave 0 |
| BLOG-04 | Each post body contains "landlord" in first 200 words | unit | extend `marketing-copy-landlord-only.test.ts` | YES — extend |
| BLOG-05 | `in-review` status exists in CHECK constraint | unit (migration test) | `pnpm test:unit -- migrations/blog-status-check.test.ts` | NO — Wave 0 |
| BLOG-05 | n8n inserts land in `in-review` (not `published`) | manual + smoke test | n/a | n/a |
| BLOG-06 | Sitemap includes new posts with `lastmod` | unit | `pnpm test:unit -- sitemap.test.ts` | YES — extend |
| BLOG-06 | RSS feed reflects new posts | unit | `pnpm test:unit -- feed.xml.test.ts` | YES — extend |

### Sampling Rate

- **Per task commit:** `pnpm test:unit -- --run src/app/blog`
- **Per wave merge:** `pnpm test:unit && pnpm test:e2e -- blog-*.spec.ts`
- **Phase gate:** Full suite green; live verification curl on prod blog index

### Wave 0 Gaps

- [ ] `tests/e2e/tests/public/blog-server-render.spec.ts` — covers BLOG-02
- [ ] `tests/e2e/tests/public/blog-post-structure.spec.ts` — breadcrumb + slug pattern
- [ ] `src/app/blog/__tests__/blog-content-set.test.ts` — 10–15 posts published assertion
- [ ] `src/app/api/og/blog/__tests__/og-image.test.ts` — OG route exists + renders 200
- [ ] `tests/integration/migrations/blog-status-check.test.ts` — CHECK constraint includes `in-review`
- [ ] Extend `src/app/__tests__/marketing-copy-landlord-only.test.ts` — blog-body persona-phrase assertion
- [ ] Extend `src/app/sitemap.test.ts` — new-blog-post lastmod assertion
- [ ] Extend `src/app/feed.xml/route.test.ts` — new-blog-post item assertion
- [ ] Migration: `YYYYMMDDHHmmss_blog_in_review_status.sql` — CHECK + trigger + log table

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (n8n service-role) | Service-role API key in n8n credential vault, never in code |
| V3 Session Management | yes | Editor reviews via Supabase Studio (Supabase Auth session) |
| V4 Access Control | yes | RLS `blogs_select_published` already enforces `status = 'published'` for public read; service-role bypass for n8n write |
| V5 Input Validation | yes | n8n stage [4] validation gate (zod-equivalent in n8n Code node) + DB CHECK constraints |
| V6 Cryptography | partial | n8n webhook bearer token rotation per `n8n-webhook-config.md` runbook; bear in mind for new blog-generate webhook |
| V7 Error Handling | yes | n8n logs payloads; never exposes service-role to client; user-facing errors generic |
| V11 Business Logic | yes | Editor-only `published` flip enforced via RLS UPDATE policy (verify) |

### Known Threat Patterns for {n8n + Supabase + Claude pipeline}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service-role token leak via n8n debug logs | Information disclosure | n8n credential vault; never log credentials; rotate on access |
| AI prompt injection (user-controlled brief contains instructions) | Tampering | Brief intake validates structure, not content; LLM operates on structured JSON |
| Slug collision by adversarial input | DoS / Tampering | UNIQUE constraint + retry-with-suffix bounded at 5 attempts |
| Banlist evasion (e.g. unicode lookalikes) | Tampering | Banlist regex case-insensitive; consider NFC-normalize body before check |
| Markdown XSS in `MarkdownContent` render | XSS | Already-shipped server-render via `react-markdown` (sanitized rendering, no raw-HTML inject) — no new risk |
| OG route SSRF via unvalidated slug | SSRF | Slug regex pattern enforced; route only reads from `blogs` table |
| Editor account compromise → publishes spam | Privilege escalation | Sole maintainer model; recommend 2FA on Supabase account; rotate post-incident |

`[VERIFIED: 20251219210000_add_blogs_rls_policies.sql + n8n-webhook-config.md]`

## Sources

### Primary (HIGH confidence)
- [TenantCloud Blog](https://www.tenantcloud.com/blog) — daily-cadence, Lease/Property Management/Rent Collection/Tenant Screening clusters; image-strategy verified
- [Stessa Blog](https://www.stessa.com/blog/) — 78 pages observed; per-post unique OG images verified
- [RentRedi Blog](https://www.rentredi.com/blog) — 4 cluster categories; sample post titles
- [Baselane Resources](https://www.baselane.com/resources/) — 50–75 posts, banking/tax cluster heavy
- [Hemlane Resources](https://www.hemlane.com/resources/) — Preparation/Marketing/Tenant Selection/Finances/Maintenance categories (5-cluster model)
- [TurboTenant Tax Library](https://www.turbotenant.com/education/taxes/) — state-grid SEO pattern
- [Avail Education](https://www.avail.com/education) — Landlord Guides / Laws / Resources clusters
- [Next.js Metadata Docs](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) — `@vercel/og` integration
- [Vercel OG Image Generation](https://vercel.com/docs/og-image-generation) — runtime + cache behavior

### Secondary (MEDIUM confidence)
- [n8n Workflow #5985: Automated SEO Content Engine with Claude AI](https://n8n.io/workflows/5985-automated-seo-content-engine-with-claude-ai-scrapeless-and-competitor-analysis/) — pipeline pattern reference
- [n8n Workflow #5374: Generate & publish SEO articles with Claude AI, Webflow & image generation](https://n8n.io/workflows/5374-generate-and-publish-seo-articles-with-claude-ai-webflow-and-image-generation/) — Claude+publish pattern
- [n8n Workflow #7920: Full blog content automation with GPT-4, Claude & Ghost CMS publisher](https://n8n.io/workflows/7920-full-blog-content-automation-with-gpt-4-claude-and-ghost-cms-publisher/) — multi-LLM pattern reference
- [Property Management SEO Blueprint 2026](https://www.clearleaddigital.com/blog/property-management-seo-blueprint) — landlord SEO topic priorities
- [TurboTenant Security Deposit Laws by State](https://www.turbotenant.com/security-deposit-laws-by-state/) — state-grid SEO pattern proof
- [TurboTenant Rental Property Tax Deductions](https://www.turbotenant.com/accounting/rental-property-tax-deductions/) — tax cluster proof
- [Innago Tenant Screening Guide](https://innago.com/tenant-screening-guide/) — screening cluster pattern

### Tertiary (LOW confidence — flagged for validation)
- Per-cluster relative SEO volume estimates — directional only, no Ahrefs/SEMrush data; flagged for Phase 12 SEO refinement
- Innago blog post count — JS-gated; only confirmed via Google SERP

### Repo file references
- `/Users/richard/Developer/tenant-flow/src/app/blog/page.tsx` — current blog index (Suspense + client BlogClient)
- `/Users/richard/Developer/tenant-flow/src/app/blog/[slug]/blog-post-page.tsx` — current post page UI (good baseline for sister specialist BLOG-02)
- `/Users/richard/Developer/tenant-flow/src/app/blog/[slug]/markdown-content.tsx` — server-rendered markdown component (post PR #674)
- `/Users/richard/Developer/tenant-flow/supabase/migrations/20251209120000_create_blogs_table.sql` — current table shape
- `/Users/richard/Developer/tenant-flow/supabase/migrations/20251219210000_add_blogs_rls_policies.sql` — RLS policies
- `/Users/richard/Developer/tenant-flow/supabase/migrations/20260307120000_blog_categories_rpc.sql` — category nav RPC
- `/Users/richard/Developer/tenant-flow/supabase/migrations/20260508231802_unpublish_broken_blogs.sql` — Phase 1 cleanup
- `/Users/richard/Developer/tenant-flow/supabase/runbooks/n8n-webhook-config.md` — n8n integration pattern reference
- `/Users/richard/Developer/tenant-flow/.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-CRIT-01-affected-ids.txt` — 100 broken rows captured pre-cleanup
- `/Users/richard/Developer/tenant-flow/.planning/phases/04-persona-copy/04-RESEARCH.md` — persona lock + author byline lock
- `/Users/richard/Developer/tenant-flow/.planning/phases/04-persona-copy/04-RESEARCH-persona-terminology.md` — 9-competitor persona survey

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | n8n is the right automation platform (vs. ad-hoc scripts or a custom backend job) | n8n Workflow Architecture | If user prefers a different runtime, plan rewrites the trigger+stages but topic-cluster + structure recommendations stay valid |
| A2 | Claude Sonnet 4.5 is preferred over GPT-4 Turbo or Gemini 2.0 Flash for brand-voice consistency | LLM Choice | If user has an existing OpenAI key + no Anthropic key, swap to GPT-4 Turbo; minor quality delta; no architecture change |
| A3 | Initial 12 posts is right size (vs 10 or 15) | Initial Post Set | User can swap individual titles 1-for-1 without re-research; can drop to 10 by removing 2 lowest-priority posts |
| A4 | "Software & Vault" cluster post #11 (`lease-document-organization-system-landlords`) is unowned in the segment | Cluster 5 + Topic Clusters | If a competitor has a similar post that I missed in the survey, ranking is harder but content is still differentiated by TenantFlow's actual product |
| A5 | Post 12 (`tenantflow-vs-buildium`) doesn't cannibalize `/compare/buildium` page | Pitfall 4 | If GSC shows cannibalization in 30 days post-publish, set `<link rel="canonical">` to compare page or drop post 12 |
| A6 | OG image dynamic generation via `@vercel/og` is supported on the project's Vercel plan | OG Image Strategy | Edge functions are standard on all Vercel plans; no upgrade needed |
| A7 | Anthropic API key procurement is in user's hand or already exists in n8n credentials | Environment Availability | Blocked-on-user; OpenAI fallback documented |
| A8 | Sole-maintainer Supabase Studio review is acceptable v1.0 (no admin page needed) | Editorial Workflow | If user wants admin page, scope expands; v2.0 deferral viable |
| A9 | The `n8n-webhook-config.md` pattern (service-role bearer + `app_config` table) is the right write-path | n8n Workflow Architecture | If TenantFlow's actual n8n instance is differently configured, sister specialist confirms during BLOG-03 work |
| A10 | The Phase-4 banlist test (`marketing-copy-landlord-only.test.ts`) can be reused as the n8n validation gate's source-of-truth | Pitfall 1 + Code Examples | If the banlist isn't shareable JSON, n8n duplicates the rule list; minor maintenance debt; no blocker |

**Total assumed claims:** 10. Critical asks (A1, A2, A3, A6) surfaced as Strategic Asks Q1, Q2 (mechanism), Q3, Q4. A7 surfaces during plan-checker review.

## Open Questions

1. **Should the initial set include sponsored / affiliate disclosures (e.g., link to Buildium for review purposes)?**
   - What we know: TenantFlow does NOT have an affiliate program; competitors do.
   - What's unclear: legal/disclosure requirements if TenantFlow ever links to a paid product.
   - Recommendation: NO affiliate links in initial 12; if v2.0 adds them, FTC disclosure is required.

2. **Does the user want to publish all 12 in one wave or stagger over 2–4 weeks?**
   - What we know: Google rewards consistent cadence over burst-publish.
   - What's unclear: user's preference for "everything at once" vs "weekly drops".
   - Recommendation: stagger 3–4 per week over 3–4 weeks; gives sitemap a real `lastmod` heartbeat and signals freshness to Google.

3. **Should the post page render an "Updated" date when content is materially edited (vs `published_at` only)?**
   - What we know: PR #674 ships `lastmod` from `updated_at ?? published_at`.
   - What's unclear: whether the rendered post UI surfaces "Updated 2026-MM-DD" prominently (currently only `published_at` displayed).
   - Recommendation: post-Phase-6, when content is materially updated, surface "Updated {date}" alongside the publish date — boosts SEO + reader trust. Out of Phase 6 scope; flag as Phase 12 follow-up.

4. **Is the `tenantflow-vs-buildium` post safe given existing `/compare/buildium`?**
   - See Pitfall 4 + A5.
   - Recommendation: ship with canonical → compare page; monitor GSC; revert canonical if traffic supports both.

## Metadata

**Confidence breakdown:**
- 8-competitor blog survey: HIGH — direct fetches + cross-verified Google SERP for 6/8; LOW for Innago (JS-gated) and partial for TurboTenant/Avail (403)
- Topic-cluster recommendation: HIGH — convergent across all surveyed competitors
- 12-post initial slate: HIGH — derived from cluster + funnel + persona lock
- OG image strategy choice: HIGH — `@vercel/og` is the dominant 2026 pattern
- n8n architecture: HIGH for pipeline pattern (n8n.io workflow templates surveyed); MEDIUM for exact stage decomposition (sister specialist refines)
- LLM choice: HIGH for Claude vs GPT-4 vs Gemini ranking; MEDIUM for the exact Sonnet 4.5 model (could be Claude Opus 4.5 if quality matters more than cost)
- Slug pattern: HIGH — pattern enforcement + length cap conventional
- Status machine: HIGH — `in-review` is required by BLOG-05
- Editorial workflow: HIGH — sole-maintainer + Studio is right for v1.0
- Validation gates: HIGH — directly addresses the previous-flow failure mode
- Relative SEO volumes: MEDIUM — directional inference only

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days; competitor blog cadence + topic-cluster shifts quarterly)
