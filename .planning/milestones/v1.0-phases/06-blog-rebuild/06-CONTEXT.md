# Phase 6: Blog Rebuild + n8n Redesign — Context

**Gathered:** 2026-05-10
**Status:** Ready for research synthesis → planning
**Source:** ROADMAP.md § Phase 6 + 2 specialist research artifacts + user strategic decision 2026-05-10

<domain>
## Phase Boundary

Phase 6 cleans the blog DB, rebuilds the `/blog` index + post page UI as server-rendered with breadcrumbs and clean URL slugs, redesigns the n8n content-generation workflow into a full LLM-driven content factory, and ships an initial 12 persona-aligned posts. Six requirements: BLOG-01 (DB cleanup + status workflow), BLOG-02 (UI server-render + breadcrumbs), BLOG-03 (n8n redesign), BLOG-04 (initial post set), BLOG-05 (review/QA workflow), BLOG-06 (sitemap/RSS reflection).

**In scope:**
- DB migration: add `'in-review'` to `blogs.status` CHECK constraint
- Drop the Phase-1 BEFORE-INSERT reject trigger (it was a blast-radius limiter; obsolete now)
- Hard-delete the 100 broken draft rows from Phase-1 unpublish
- Add slug regex CHECK constraint to prevent `Date.now()`-style slug fallback
- Add `canonical_url text NULL` column to enable per-post canonical override (Blocker-#1 prerequisite)
- 9 DB validation triggers (word count, H2 count, persona phrase, slug pattern, meta length, excerpt length, category, banlist, DocuSeal-mention)
- `/blog` index UI rewrite: drop `BlogClient` client component, server-render the post list, no client loading state (PERF-01)
- `/blog/[slug]` UI: swap `force-dynamic` for `generateStaticParams` + `revalidate=300` (5-min ISR), real HTTP 404 via `notFound()` for unknown slugs
- `/blog/[slug]` `generateMetadata()` wires `alternates.canonical` from `blogs.canonical_url` (canonical tag lands in `<head>` via Next.js Metadata API)
- `/blog/category/[slug]` UI: same SSR rewrite (BlogCategoryClient → server component)
- shadcn `breadcrumb` primitive added via `pnpm dlx shadcn@latest add breadcrumb`
- Visible breadcrumb on `/blog/[slug]` and `/blog/category/[slug]` (SEO-05; complements existing BreadcrumbList JSON-LD shipped in PR #674)
- New `/api/og/blog/[slug]/route.ts` dynamic OG image generator using `@vercel/og` (per-post unique image, brand colors, post title)
- New webhook endpoint at `supabase/functions/n8n-blog-ingest/index.ts` accepting n8n payloads (including optional `canonical_url`), validating against the 9 gates, inserting into `blogs` with `status='in-review'`
- `.planning/phases/06-blog-rebuild/N8N-FLOW.md` documenting the redesigned workflow as a runbook + JSON spec
- 12 initial posts generated via the n8n flow → `in-review` → manually approved → `published`
- Sitemap + RSS already handle empty state (PR #674); auto-reflect new published dataset

**Out of scope** (deferred to other phases):
- Affiliate disclosures — explicitly REJECTED for v1.0
- "Updated {date}" UI display alongside `published_at` — Phase 12 follow-up
- n8n-flow polish post-launch (per-topic prompt tuning) — out of phase
- Cannibalization monitoring (tenantflow-vs-buildium post vs `/compare/buildium` page) — Phase 12 SEO follow-up; ship with `<link rel="canonical">` to compare page where appropriate (via `blogs.canonical_url` column → `alternates.canonical` in `<head>`)
- Author byline = real human names — locked at "TenantFlow Team" (Phase 4 lock)
- Per-tier publish gating — out of scope; all 12 posts public
- Newsletter signup flow polish — Phase 10 TRUST-* owns
- "Comments" / community engagement — out of scope for v1.0

**Branch:** `gsd/phase-06-blog-rebuild`
**Phase requirement IDs:** BLOG-01, BLOG-02, BLOG-03, BLOG-04, BLOG-05, BLOG-06
**Cross-cutting design-token constraint:** No new hex/rgb/`bg-white`/inline-ms tokens.
</domain>

<decisions>
## Implementation Decisions (LOCKED)

### Tier (LOCKED — user 2026-05-10)

**Full LLM content factory.** n8n trigger via webhook (manual curl); Claude Sonnet 4.5 generates outline → draft → image → SEO meta → 9 validation gates → INSERT into `blogs` with `status='in-review'`. User flips `'in-review'` → `'published'` in Supabase Studio. Cost: ~22K words for 12 posts < $1.

### Editorial Gatekeeper (LOCKED)

**Supabase Studio direct edit.** Sole maintainer model. User reviews each `'in-review'` row in Studio, edits if needed, flips `status='published'`. No separate admin UI for v1.0.

### OG Image Strategy (LOCKED)

**Option B — `@vercel/og` dynamic per-post images.** New route at `src/app/api/og/blog/[slug]/route.tsx` returns a 1200×630 PNG with: post title (Roboto Black 64px), category label (uppercase 24px), brand gradient background (`oklch(--color-primary)` → `oklch(--color-primary-dark)`), TenantFlow wordmark. Cached at the CDN edge. Linked via `og:image` + `twitter:image` on every post page.

### Initial 12-Post Slate (LOCKED — Specialist 2 recommendation)

5 topic clusters, 3-2-2-2-3 distribution. Funnel mix: 3 top / 5 middle / 4 bottom.

| # | Cluster | Title (working) | Slug | Funnel |
|---|---------|-----------------|------|--------|
| 1 | Lease Law | "What's Required in a Lease Agreement (Every State Covers This)" | `whats-required-in-a-lease-agreement` | top |
| 2 | Lease Law | "How to Send a Rent Increase Notice (Per-State Notice Period Cheat Sheet)" | `rent-increase-notice-per-state` | middle |
| 3 | Lease Law | "Late Fee Rules for Landlords by State (2026)" | `late-fee-rules-by-state-2026` | middle |
| 4 | Tax Prep | "What Landlords Can Deduct (2026 Tax Guide for 1–15 Rentals)" | `landlord-tax-deductions-2026` | top |
| 5 | Tax Prep | "Tax-Time Document Vault: Every Receipt Your CPA Will Ask For" | `tax-document-vault-checklist` | bottom |
| 6 | Tenant Screening | "Free Tenant Screening Checklist for DIY Landlords" | `tenant-screening-checklist` | top |
| 7 | Tenant Screening | "Tenant Screening Software Compared (2026)" | `tenant-screening-software-compared-2026` | middle |
| 8 | Maintenance | "Annual Maintenance Schedule for 1–15 Rentals" | `annual-maintenance-schedule` | middle |
| 9 | Maintenance | "How to Track Maintenance Requests Without a Ticketing System" | `track-maintenance-no-ticketing-system` | middle |
| 10 | Software & Vault | "TenantFlow vs Buildium: Honest Comparison for 1–15 Rental Landlords" | `tenantflow-vs-buildium` | bottom |
| 11 | Software & Vault | "How to Organize Lease Documents: One System, Search-Ready, Tax-Ready" | `lease-document-organization-system-landlords` | bottom |
| 12 | Software & Vault | "From Spreadsheet to Document Vault: Migration Guide for Small Landlords" | `spreadsheet-to-document-vault-migration` | bottom |

Post #10 ships with `<link rel="canonical" href="/compare/buildium">` to avoid cannibalization with the existing compare page. The canonical tag is set via `blogs.canonical_url` (Plan 06-01 column) → n8n payload field (Plan 06-03) → Next.js `Metadata.alternates.canonical` (Plan 06-02) — it lives in `<head>`, NOT inside the markdown body. Monitored in Phase 12 (SEO).

### Status Workflow Primitive (LOCKED)

`blogs.status` CHECK constraint: `('draft', 'in-review', 'published', 'archived')`. Migration extends current 3-value CHECK to 4-value. Manual `'in-review'` → `'published'` transition via Supabase Studio.

### Slug Naming Pattern (LOCKED)

**Topic-only kebab-case + year suffix on time-sensitive posts.**
- Format: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (regex enforced by DB CHECK constraint — leading letter required to close the audit-#38 numeric-only-slug class; Blocker-#4 fix)
- Length: 3..120 chars
- Time-sensitive (yearly-relevance) posts append `-{year}` suffix (e.g., `late-fee-rules-by-state-2026`, `landlord-tax-deductions-2026`, `tenant-screening-software-compared-2026`)
- Evergreen posts use topic-only (e.g., `tenant-screening-checklist`, `tenantflow-vs-buildium`)
- NO `Date.now()` fallback — DB rejects slug INSERT if regex doesn't match. The regex closes the numeric-only class (`1234567890`); the `error-1778151609106` ms-suffix pattern PASSES the regex (it starts with a letter) and is closed by the n8n flow not generating Date.now()-suffix slugs as a fallback.

### Author Byline (LOCKED — Phase 4 carry-forward)

**"TenantFlow Team"** — Organization-type schema in Article JSON-LD (Phase 4 already shipped this). Confirms AI-generated content with editorial review.

### Publish Cadence (LOCKED)

**Stagger over 3-4 weeks** (Specialist 2 recommendation). Don't ship all 12 at once. Distribution: ~3 posts/week. Phase 6 PR includes the `'in-review'` rows; user flips published_at over the 3-4 week window post-merge. Sitemap auto-updates each time published_at advances.

### 9 Validation Gates (LOCKED)

Implemented as DB BEFORE-INSERT triggers + n8n-side validation:

| Gate | Rule |
|------|------|
| Word count | 1,200 ≤ word_count(content) ≤ 3,000 |
| H2 count | 4 ≤ count(`^## `) ≤ 10 |
| Persona phrase | content contains "landlord" OR "landlords" (≥1 occurrence) |
| Slug pattern | slug matches `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (leading-letter requirement) |
| Meta length | 50 ≤ length(meta_description) ≤ 160 |
| Excerpt length | 80 ≤ length(excerpt) ≤ 200 |
| Category | category IN ('lease-law', 'tax-prep', 'tenant-screening', 'maintenance', 'software-vault') |
| Banlist | content does NOT contain banned phrases from `marketing-copy-landlord-only.test.ts` BANNED_PHRASES |
| DocuSeal mention | content contains ≤1 mention of "DocuSeal" (per Phase 4 COPY-04 de-amp) |

### Phase 1 + Phase 4 Cross-Check (REGRESSION GUARDS)

- **Phase 1 BEFORE-INSERT reject trigger:** DROP it (Phase 6 obligation per Phase 1 migration comment). Trigger name: `reject_n8n_error_blogs_trigger` (verified at `supabase/migrations/20260508231802_unpublish_broken_blogs.sql:100`).
- **Phase 1 broken-draft rows:** hard-DELETE the 100 rows.
- **Phase 4 banlist test:** stays green (validation gate #8 enforces the same banlist at insert time, complementary not redundant).
- **Phase 4 persona word:** every post body uses "landlords" (not "property owners") — validation gate #3 enforces this at insert time.
- **Phase 4 DocuSeal de-amp:** validation gate #9 limits per-post mentions to ≤1.

### Cross-Cutting Design-Token Constraint (LOCKED)

OG image route generates oklch colors via inline CSS (Vercel/og requires inline). Allowed by token rule because they read FROM `globals.css` `--color-primary` definitions, not introduce new ones. Verify diff has 0 hex / 0 rgba / 0 `bg-white` / 0 inline-ms additions outside the OG route's deliberate CSS.

### Claude's Discretion

- Plan decomposition (suggested 4 plans below)
- Specific n8n node sequence + JSON spec
- Webhook auth scheme (API key vs HMAC vs Supabase service role) — Specialist 1 + 2 recommendations TBD
- Test fixture for the 12 posts (snapshot? per-post unit? integration?)
- ISR `revalidate` timing (300 = 5min recommended)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 6 research artifacts
- `.planning/phases/06-blog-rebuild/06-RESEARCH.md` — canonical synthesis (read FIRST after research completes)
- `.planning/phases/06-blog-rebuild/06-RESEARCH-codebase-audit.md` — Specialist 1 (DB + UI + n8n surface)
- `.planning/phases/06-blog-rebuild/06-RESEARCH-content-strategy.md` — Specialist 2 (5 clusters + 12 posts + n8n architecture)

### Project context
- `.planning/PROJECT.md` — locked v1.0
- `.planning/REQUIREMENTS.md § BLOG-01..06`
- `.planning/ROADMAP.md § Phase 6` — 7 success criteria
- `.planning/phases/04-persona-copy/04-RESEARCH.md` — Phase 4 locked persona word + banlist
- `.planning/phases/05-pricing-restructure/05-RESEARCH.md` — Phase 5 (Stripe state)

### Codebase conventions
- `CLAUDE.md` — zero-tolerance rules (no `any`, lucide-react sole icons, design tokens from `globals.css` only)
- `src/app/blog/` — current `/blog` directory tree (Specialist 1 mapped)
- `src/components/blog/` — current blog components
- `src/components/shared/blog-*.tsx` — shared blog components
- `src/hooks/api/use-blogs.ts` + `src/hooks/api/query-keys/blog-keys.ts` — current TanStack Query hooks
- `src/types/supabase.ts` — generated `blogs` table types
- `src/app/sitemap.ts` + `src/app/feed.xml/route.ts` — Phase 4 PR #674 already handle empty state and real lastmod
- `supabase/runbooks/n8n-webhook-config.md` — existing n8n operations runbook (DO NOT touch — separate from content-generation)

### Existing patterns
- Phase 4 PR #674 shipped: MarkdownContent server component, Article schema, BreadcrumbList JSON-LD, sitemap with real lastmod, RSS feed with content sanitization, related-posts hook, lead-magnet CTA, mid-article CTA split
- Phase 4 PR #688 shipped: persona-consistency e2e (16 PUBLIC_PATHS) — `/blog` is in the path list and asserts no "property owners" body text

### Memory references
- `feedback_perfect_pr_gate.md` — 2 zero-finding cycles required for merge
- `branch-protection-config.md` — required CI checks: `checks`, `e2e-smoke`, `rls-security`
- `migration-mcp-prod-drift.md` — reconcile prod migration timestamps after MCP applies

</canonical_refs>

<specifics>
## Specific Ideas

### Suggested plan decomposition: 4 plans

**Plan 06-01: DB cleanup + status workflow + validation triggers + canonical_url column (Wave 1)**
- Drop Phase-1 BEFORE-INSERT reject trigger (`reject_n8n_error_blogs_trigger`)
- Hard-DELETE 100 broken draft rows
- Migration: extend `blogs.status` CHECK to include `'in-review'`
- Migration: add slug regex CHECK constraint (`^[a-z][a-z0-9]*(-[a-z0-9]+)*$`)
- Migration: 9 BEFORE-INSERT validation triggers (word count, H2 count, persona phrase, slug, meta, excerpt, category, banlist, DocuSeal)
- Migration: ADD COLUMN `canonical_url text NULL` (Blocker-#1 prerequisite for Plan 06-02 + Plan 06-03 wiring)
- Update `src/types/supabase.ts` via `pnpm db:types`

**Plan 06-02: UI server-render rewrite + breadcrumbs + OG image + canonical wiring (Wave 2, depends on 06-01 schema)**
- shadcn breadcrumb primitive add (`pnpm dlx shadcn@latest add breadcrumb`)
- Rewrite `BlogClient` (`src/app/blog/[...]`) as server component (drop client loading state)
- Rewrite `BlogCategoryClient` as server component
- `/blog/[slug]` swap: `force-dynamic` → `generateStaticParams` + `revalidate=300` + `notFound()` for unknown slugs
- `/blog/[slug]` `generateMetadata()` reads `post.canonical_url` and emits `alternates.canonical` → Next.js renders `<link rel="canonical">` in `<head>` (Blocker-#1 fix)
- Visible breadcrumb component on `/blog/[slug]` and `/blog/category/[slug]`
- `src/app/api/og/blog/[slug]/route.tsx` dynamic OG image generator (`@vercel/og`)
- Update post page `generateMetadata()` to point `og:image` at `/api/og/blog/{slug}`
- Update e2e: `tests/e2e/tests/public/seo-smoke.spec.ts` extends with breadcrumb + OG image + canonical assertions (skip-if-not-published guard)

**Plan 06-03: n8n webhook ingest endpoint + flow spec doc (Wave 3, depends on 06-01)**
- New Edge Function `supabase/functions/n8n-blog-ingest/index.ts` — POST endpoint accepting n8n payload (including optional `canonical_url` field), validates against the 9 gates (defense-in-depth; DB triggers are primary), inserts into `blogs` with `status='in-review'`
- Webhook auth: HMAC-SHA256 with shared secret in Vault; n8n includes `x-n8n-signature` header
- `.planning/phases/06-blog-rebuild/N8N-FLOW.md` runbook + JSON workflow spec (importable into n8n cloud) + reproducible HMAC test vector
- `scripts/compute-hmac-vector.ts` Deno script that recomputes the locked HMAC vector deterministically
- Edge Function tests in `supabase/functions/tests/n8n-blog-ingest.test.ts` (Deno; deterministic `phase-6-deno-` slug prefix + beforeAll/afterEach/afterAll cleanup; valid payload, malformed payload, signature mismatch, slug collision, banlist hit, persona missing, canonical_url passthrough, canonical_url shape rejection)

**Plan 06-04: Generate 12 initial posts via n8n flow + manually approve (Wave 4, depends on 06-02 + 06-03)**
- User runs the n8n flow 12 times (once per locked title) — flow inserts each post as `in-review`. Brief #10's payload includes `canonical_url: '/compare/buildium'`.
- User reviews each post in Supabase Studio; edits if needed; flips `status='published'` and sets `published_at`. For brief #10, preserves the `canonical_url` column value.
- Verify: `/blog` index renders 12 cards; `/blog/[slug]` for each renders correctly; brief #10's slug page emits `<link rel="canonical" href="/compare/buildium">` in `<head>`; `/sitemap.xml` includes all 12; `/feed.xml` carries them
- Stagger publish over 3-4 weeks per Specialist 2 recommendation (user's choice on cadence; not gated by Phase 6 merge)

### Test strategy

- **Unit tests:** new validation-gate trigger fixtures (insert each violation type, expect rejection); slug-regex leading-letter case (reject `1234567890`, accept `valid-slug-format`)
- **e2e tests:** `seo-smoke.spec.ts` extension covers breadcrumb visibility + OG image URL pattern + canonical href ends with `/compare/buildium` for the buildium slug (skip-if-not-published); persona-consistency.spec.ts already covers `/blog`
- **Integration tests:** RLS on `blogs` (anon SEE published only; service-role full access); canonical_url column wiring (INSERT/SELECT)
- **Edge Function tests:** Deno suite for `n8n-blog-ingest` including canonical_url passthrough + shape rejection

### Live verification (post-deploy)

```bash
# Breadcrumb visible on /blog/[slug]
curl -s https://tenantflow.app/blog/whats-required-in-a-lease-agreement | grep -oE 'aria-label="Breadcrumb"'
# Expect: ≥1

# Real 404 (not soft-200) for unknown slug
curl -s -o /dev/null -w "%{http_code}\n" https://tenantflow.app/blog/this-slug-does-not-exist
# Expect: 404

# OG image URL pattern
curl -s https://tenantflow.app/blog/whats-required-in-a-lease-agreement | grep -oE 'og:image"[^>]*content="[^"]*api/og/blog/'
# Expect: ≥1

# Brief #10 canonical tag in <head> (Blocker-#1 verification)
curl -s https://tenantflow.app/blog/tenantflow-vs-buildium | grep -oE 'link rel="canonical"[^>]+href="[^"]*"'
# Expect: link rel="canonical" with href ending in /compare/buildium

# Sitemap includes 12 posts
curl -s https://tenantflow.app/sitemap.xml | grep -oE '<loc>[^<]+/blog/[a-z0-9-]+</loc>' | wc -l
# Expect: ≥12 (after staggered publish complete)

# Persona word in every post body (sample)
for slug in whats-required-in-a-lease-agreement landlord-tax-deductions-2026 tenant-screening-checklist; do
  curl -s "https://tenantflow.app/blog/$slug" | grep -oE 'landlord' | head -1
done
# Expect: ≥1 per post
```

</specifics>

<deferred>
## Deferred Ideas

These came up during research but explicitly belong to other phases or are out-of-scope:

- **Affiliate disclosures** — REJECTED for v1.0 (no affiliate program live)
- **"Updated {date}" UI** alongside `published_at` — Phase 12 (SEO refinement)
- **Per-tier publish gating** — out of scope; all 12 posts public
- **Newsletter signup flow polish** — Phase 10 TRUST-* owns
- **Cannibalization monitoring** for `tenantflow-vs-buildium` post — Phase 12 SEO
- **n8n flow polish post-launch** (per-topic prompt tuning) — separate operations workstream
- **Real human author bylines** — Phase 4 lock; "TenantFlow Team" stays
- **Comments / community engagement** — out of scope for v1.0
- **n8n operations webhook redesign** (the existing 5 triggers via `app_config_table_for_n8n_webhooks`) — explicitly NOT touched; only content-generation flow is in Phase 6 scope

</deferred>

---

*Phase: 06-blog-rebuild*
*Context gathered: 2026-05-10 — pre-research-synthesis lock-in, all 12 strategic decisions resolved*
*Revision 1 (Blocker-#4 slug regex leading-letter requirement) applied 2026-05-10*
