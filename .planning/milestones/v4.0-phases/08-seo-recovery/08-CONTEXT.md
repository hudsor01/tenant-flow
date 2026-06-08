# Phase 8: SEO Recovery - Context

**Gathered:** 2026-06-07
**Status:** Executed (code-doable scope); SEO-01 content-dependency surfaced
**Source:** Direct source-read of /pricing structured data, the blog category page, and the blog-redirect map + its collision-guard test.

<domain>
## Phase Boundary
The three SEO requirements split cleanly by what is code-resolvable vs. content-dependent:
- **SEO-02** — already fixed in code (verify + it has a regression-guard test).
- **SEO-03** — code-doable (noindex empty category pages).
- **SEO-01** — content-dependent (republishing requires real article content via the n8n pipeline; cannot be fabricated).
</domain>

<decisions>
## Determinations (LOCKED)

### SEO-02 — /pricing JSON-LD validates clean — ALREADY DONE (verify + close)
The Product schema was already removed from `/pricing` (`src/app/pricing/page.tsx:38-44` documents why: Product forced the page into Google's Merchant-listings validation, which requires `shippingDetails` + `hasMerchantReturnPolicy` — meaningless for SaaS — producing the GSC "Merchant listings: invalid item" error). The page now emits only FAQ + Breadcrumb JSON-LD; the SoftwareApplication + AggregateOffer are emitted sitewide by `SeoJsonLd` (`src/lib/generate-metadata.ts:167-188`). A regression-guard test already exists and passes: `src/app/pricing/__tests__/page.test.ts:97-106` asserts `schemaTypes === ["FAQPage","BreadcrumbList"]` and `not.toContain("Product")`. Nothing to change — SEO-02 is satisfied. (Google's live rich-results-test is an external check the owner can re-run; the code emits no merchant-listing-eligible node, which is the fix.)

### SEO-03 — empty category pages don't bleed crawl signal — IMPLEMENT (noindex)
`src/app/blog/category/[category]/page.tsx` validated categories (notFound for invalid) and rendered `BlogEmptyState` for zero posts, but `generateMetadata` only set `noindex: page > 1` — so page 1 of an empty valid category (e.g. `financial-management`, `maintenance`) served an indexable thin page. Fix: a `cache()`-deduped `getCategoryPublishedCount(name)` (HEAD count) drives `noindex: page > 1 || publishedCount === 0`. The page stays reachable for users; Google won't index it until it has content (self-healing — once a post is published the count flips and it becomes indexable). Pinned by 3 new `generateMetadata` tests (empty → `robots: "noindex, follow"`; non-empty page 1 → no robots; page 2 → noindex).

### SEO-01 — republish highest-impression deleted posts — CONTENT-DEPENDENT (surfaced, not code-completed)
The requirement is "republished at their original slugs (**content via the n8n pipeline**), and each republished slug's entry removed from `blog-redirects.ts`." This has a hard external dependency: real, quality, ranking-equivalent article CONTENT must be authored + published to `public.blogs` via the n8n pipeline. It cannot be fabricated by the agent (fake content would harm SEO and is not honest), and removing a redirect entry BEFORE the post exists would turn the slug into a 404 (the slug 404s without content AND without the redirect — `dynamicParams=false` on `/blog/[slug]`). So the code-side is already prepared and correct:
- The 301 redirect map (`DELETED_BLOG_REDIRECTS`, 144 entries) transfers ranking signal today.
- The collision-guard test (`src/lib/seo/__tests__/blog-redirects.test.ts`) already enforces the reclaim invariant: a source may never collide with a live published slug, and destinations must be live paths.
- The documented reclaim runbook is in the `blog-redirects.ts` header: "when a quality replacement is published at one of these slugs, DELETE that entry so the new post serves instead of redirecting."
**Owner action required:** run the n8n pipeline to publish the top-impression posts (top-10 first per the Hybrid plan), then delete their entries from `blog-redirects.ts` (the collision-guard test will keep it honest). This is the only v4.0 item that cannot be closed in code.
</decisions>

<canonical_refs>
- `src/app/pricing/page.tsx` + `src/app/pricing/__tests__/page.test.ts` (SEO-02 fix + guard, already in place).
- `src/lib/generate-metadata.ts` (sitewide SoftwareApplication + AggregateOffer).
- `src/app/blog/category/[category]/page.tsx` + `.test.tsx` (SEO-03).
- `src/lib/seo/blog-redirects.ts` + `__tests__/blog-redirects.test.ts` (SEO-01 mechanics + collision guard).
- `seo-deleted-blog-catalogue` memory (the ~126 ghost slugs, top-10 republish candidates).
</canonical_refs>

<deferred>
- SEO-01 content republishing — owner's n8n pipeline. The redirect map keeps transferring signal in the meantime; reclaim is per-post and incremental (delete one entry as each post lands).
</deferred>

---
*Phase: 08-seo-recovery — SEO-02 verified-done, SEO-03 implemented (noindex empty categories), SEO-01 surfaced as content-dependent on the n8n pipeline.*
