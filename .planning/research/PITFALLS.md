# Pitfalls Research: SEO & Google Indexing Optimization

**Domain:** Adding comprehensive SEO to existing Next.js 16 SaaS on Vercel
**Researched:** 2026-04-08
**Confidence:** HIGH (verified against Google developer docs, Next.js official docs, codebase audit)

## Critical Pitfalls

### Pitfall 1: robots.txt Blocks `/_next/` -- Googlebot Cannot Render Pages

**What goes wrong:**
The current `public/robots.txt` contains `Disallow: /_next/` which blocks ALL assets under that path, including CSS and JavaScript that Googlebot needs to render pages. Google's crawler fetches these assets to understand page layout and content. Without them, pages appear as blank white screens to Googlebot, leading to "Crawled but not indexed" status in Search Console. One documented case showed only 23 of 156 pages indexed after this mistake.

**Why it happens:**
Developers see `/_next/` as internal build artifacts and assume blocking them saves crawl budget. In reality, `/_next/static/` contains CSS and JS required for rendering, and `/_next/image/` serves optimized images that appear in content.

**How to avoid:**
Replace the blanket `Disallow: /_next/` with targeted rules:
```
Allow: /_next/static/
Allow: /_next/image/
Disallow: /_next/data/
Disallow: /*_buildManifest.js$
Disallow: /*_middlewareManifest.js$
```
This preserves rendering assets while blocking internal data fetching routes and build manifests that waste crawl budget.

**Warning signs:**
- Google Search Console shows "Crawled - currently not indexed" for pages that have content
- Rich Results Test shows blank page or no structured data detected
- Mobile Usability report shows issues on pages that look fine in a browser

**Phase to address:**
Phase 1 (robots.txt audit) -- this is the single highest-impact fix. Must be done before any structured data work, because broken rendering means Google cannot see JSON-LD either.

---

### Pitfall 2: Self-Serving AggregateRating on Organization Schema Triggers Spam Signals

**What goes wrong:**
The current `generate-metadata.ts` includes `aggregateRating` with `ratingValue: '4.8'` and `reviewCount: '1250'` on both the Organization and SoftwareApplication schemas. Google explicitly prohibits self-serving reviews where entity A's website hosts ratings for entity A. For Organization and LocalBusiness schema types, Google stopped showing review rich results in 2019 and will never display these stars. Worse, if the rating numbers (4.8 stars, 1,250 reviews) are not visible on any page, this constitutes "invisible markup" -- a direct violation of Google's structured data policies that can trigger a manual action.

**Why it happens:**
Developers copy schema examples from SEO guides without checking whether the specific schema type supports self-hosted ratings. The Organization + AggregateRating combination looks correct syntactically but violates Google's content policies.

**How to avoid:**
- Remove `aggregateRating` from the Organization schema entirely -- Google will never show it as a rich result
- For SoftwareApplication: only include `aggregateRating` if the ratings are from a third-party review platform (e.g., embedded Capterra widget) and the numbers are visibly displayed on the page
- If keeping ratings on SoftwareApplication, the `ratingValue` and `reviewCount` must exactly match what users see on the page
- Use `offers` on SoftwareApplication (already present) which IS eligible for rich results

**Warning signs:**
- Google Search Console Manual Actions report shows "Spammy structured markup"
- Rich Results Test shows warnings about reviews not being eligible
- No star ratings ever appear in SERPs despite having the schema

**Phase to address:**
Phase 1 (structured data audit) -- must fix before adding more structured data, as a manual action removes ALL rich result eligibility across the entire site.

---

### Pitfall 3: FAQPage Schema Will Not Generate Rich Results for Non-Government/Health Sites

**What goes wrong:**
The current FAQ page and pricing page both emit `FAQPage` structured data. Since August 2023, Google restricted FAQ rich results to only well-known, authoritative government and health websites. For a SaaS product like TenantFlow, this schema will never produce visible rich results in Google Search. The markup is not harmful (no penalty), but it creates false expectations and wastes development effort if the goal is visible rich snippets.

**Why it happens:**
FAQ schema was extremely popular before 2023 and many SEO guides still recommend it. The restriction was a major change that invalidated years of SEO advice.

**How to avoid:**
- Keep FAQPage schema for AI/LLM discoverability (ChatGPT, Perplexity, and other AI platforms do consume it) but do not expect or measure Google rich result appearances
- Do NOT invest additional effort making FAQ schema more elaborate for Google purposes
- Focus structured data effort on schema types that DO produce visible rich results: Article (blog posts), BreadcrumbList, SoftwareApplication, Product (pricing), WebSite (sitelinks searchbox)

**Warning signs:**
- FAQ rich results never appear in Google Search despite valid schema
- Time wasted debugging FAQ schema that validates perfectly but produces nothing

**Phase to address:**
Phase 1 (structured data strategy) -- understand which schemas actually produce results before investing implementation time.

---

### Pitfall 4: Expired `priceValidUntil` Dates in Offer Schema

**What goes wrong:**
The pricing page's Product/Offer schema contains `priceValidUntil: '2025-12-31'` on all three pricing tiers. This date has already passed (it is April 2026). Google's Rich Results Test will flag expired offers, and Google may stop showing pricing rich results or show them with a "price expired" indicator, actively hurting CTR.

**Why it happens:**
Structured data with dates is set-and-forget. Developers add it once during initial implementation and never update the dates. Unlike visible page content that someone might notice is stale, JSON-LD dates are invisible to casual page review.

**How to avoid:**
- Compute `priceValidUntil` dynamically: set it to 1 year from the current date, regenerated on each build/ISR cycle
- Add a unit test that validates all structured data date fields are in the future
- Alternative: omit `priceValidUntil` entirely if prices do not actually have expiration dates (subscription pricing is ongoing)

**Warning signs:**
- Rich Results Test shows warnings about expired offers
- Pricing rich results disappear from SERPs
- Google Search Console shows "Invalid item" errors for Product structured data

**Phase to address:**
Phase 1 (structured data audit) -- quick fix with high impact. Already broken in production.

---

### Pitfall 5: Canonical URL Inconsistency Across Pages

**What goes wrong:**
The codebase has three different canonical URL patterns:
1. Root layout: `canonical: SITE_URL` (absolute URL via `generate-metadata.ts`)
2. Blog posts: `canonical: '/blog/${slug}'` (relative path)
3. Compare pages: `canonical: '${baseUrl}/compare/${slug}'` (absolute URL via env var)
4. Most pages (features, help, search, blog hub): NO explicit canonical at all

Pages without explicit canonicals inherit the root layout's `alternates.canonical: SITE_URL` which points to the homepage -- meaning Google may treat those pages as duplicates of the homepage. Additionally, the mix of relative and absolute canonical URLs creates unpredictable behavior when `metadataBase` resolution interacts with different environments.

**Why it happens:**
Next.js metadata merging is deep -- child pages override parent metadata properties. But developers assume "the root layout handles it" without verifying what actually gets merged for each specific page. The root canonical pointing to the site root is correct for the homepage but wrong when inherited by child pages.

**How to avoid:**
- Every public-facing page MUST set its own `alternates.canonical` to its specific URL
- Use consistent format: always relative paths (e.g., `/pricing`, `/about`) and let `metadataBase` resolve them to absolute URLs
- Remove the root-level `alternates.canonical` from `generate-metadata.ts` or change it to only apply to the root page
- Add a build-time check or test that verifies every page in the sitemap has a unique canonical URL

**Warning signs:**
- Google Search Console shows "Duplicate without user-selected canonical" issues
- Multiple pages competing for the same keyword because Google thinks they are the same URL
- Blog posts showing homepage in search results instead of the blog post URL

**Phase to address:**
Phase 2 (metadata audit) -- systematic review of all pages. Must be done before sitemap improvements, as sitemaps and canonicals must agree.

---

### Pitfall 6: Adding Structured Data to Client Components Breaks SSR Extraction

**What goes wrong:**
Blog post detail page (`blog-post-page.tsx`) is a `'use client'` component. If JSON-LD structured data for Article schema is added inside this client component, it will only be present after JavaScript hydration. Googlebot's initial HTML parse (the "first pass") will not see the structured data. While Google does execute JavaScript, there is a delay and sometimes Googlebot's rendering budget is exhausted before reaching the client-rendered JSON-LD.

**Why it happens:**
The blog post page has a Server Component wrapper (`page.tsx`) that calls `generateMetadata`, but the actual content rendering happens in the client component. Developers naturally want to place the Article JSON-LD where the article data is available -- inside the client component. But JSON-LD should be in server-rendered HTML for reliable extraction.

**How to avoid:**
- Add Article JSON-LD in the Server Component (`page.tsx`) alongside `generateMetadata`, using the same data fetched for metadata
- Use Next.js's recommended pattern: `<script type="application/ld+json">` in the Server Component's JSX
- Never place structured data inside `'use client'` components
- For data already fetched in `generateMetadata`, pass it to a Server Component that renders both the JSON-LD script tag and the client component

**Warning signs:**
- Rich Results Test (URL Inspection) shows structured data, but "View Page Source" does not contain JSON-LD
- Intermittent rich results -- sometimes appearing, sometimes not
- Rich Results Test in "code" mode shows JSON-LD but "live test" does not

**Phase to address:**
Phase 2 (Article structured data) -- this is the architectural decision that must be right from the start. Retrofitting server-side JSON-LD after building it client-side requires restructuring data flow.

---

### Pitfall 7: Sitemap Uses `new Date().toISOString()` for All `lastModified` Values

**What goes wrong:**
The current sitemap sets `lastModified: currentDate` (the generation timestamp) for every static page. This means every time the sitemap regenerates (every 24h via ISR), ALL pages appear to have been modified. Google's crawler interprets `lastmod` as a signal to re-crawl. When every page has today's date, Google learns that `lastmod` is unreliable for this site and may start ignoring the sitemap's freshness signals entirely, or waste crawl budget re-crawling pages that have not actually changed.

**Why it happens:**
Using `new Date()` is the simplest implementation. Developers think "fresh dates = good for SEO" when the opposite is true -- accurate dates build crawler trust.

**How to avoid:**
- Static marketing pages: use hardcoded dates that only change when the page content actually changes (or the last git commit date for that file)
- Blog posts: already using `post.published_at` (correct) but should use `updated_at` if available
- Comparison pages: use a fixed date, updated only when comparison data changes
- Resource pages: use a fixed date, updated only when the resource content changes
- Consider adding `updated_at` column to blogs table for content freshness tracking

**Warning signs:**
- Google Search Console crawl stats show high re-crawl rate on unchanged pages
- `lastmod` dates in sitemap all match (easy to spot by viewing `/sitemap.xml`)
- Google stops respecting sitemap freshness signals (crawl patterns become random)

**Phase to address:**
Phase 3 (sitemap improvements) -- after metadata and structured data are solid.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding `priceValidUntil` dates | Quick to implement | Goes stale, breaks rich results | Never -- always compute dynamically |
| Using `FAQPage` schema everywhere | Appears comprehensive | Wasted effort, false expectations | Acceptable if team understands it is for AI only |
| Single monolithic sitemap | Simpler code | Cannot track crawl patterns per section | Acceptable under ~100 URLs total |
| `baseUrl` via `process.env` in page components | Works in all environments | Inconsistent URL construction across pages | Never -- centralize in one utility |
| Blocking SEO tool bots (Ahrefs, Semrush) | Saves bandwidth | Competitors can still see you; you lose your own backlink data | Only if you never use these tools yourself |
| Static `robots.txt` in `/public` | Simple, no code needed | Cannot adapt rules per environment | Acceptable if production is the only environment that matters |

## Integration Gotchas

Common mistakes when connecting SEO tools and services to Next.js + Vercel.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Search Console | Verifying with HTML file upload but Vercel redeploys remove it | Use DNS TXT record verification or meta tag in root layout (persistent across deploys) |
| Vercel preview deployments | Preview URLs get indexed despite `X-Robots-Tag: noindex` because custom preview domains bypass the header | If using custom domains on preview branches, add explicit `noindex` meta tag in `robots` metadata for non-production environments |
| Sitemap + ISR | Sitemap has 24h revalidation but new blog posts need immediate inclusion | Use on-demand revalidation (`revalidateTag`/`revalidatePath`) for sitemap when new content is published |
| Supabase queries in `generateMetadata` | Cold-start latency (80-398s observed per Sentry) causes timeout on first request after deploy | Already mitigated with 5s timeout + ISR caching (good). Ensure the fallback metadata for timeout cases still has valid canonical and title |
| JSON-LD validation | Only testing with Schema.org validator, not Google's Rich Results Test | Schema.org validates syntax; Google's tool validates what actually produces rich results. Always test with both |
| Blog canonical URLs | Using relative paths (`/blog/slug`) in some places, absolute URLs in others | Always use relative paths and let Next.js `metadataBase` resolve them. Consistent pattern prevents environment-specific bugs |

## Performance Traps

Patterns that work at small scale but fail as the site grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Single sitemap file with DB query | Works fine with 20 blog posts | Use `generateSitemaps()` to split by content type (blog, compare, resources, static) | 50,000+ URLs or 50MB file size (Google hard limit) |
| `generateMetadata` fetching full blog post | Metadata includes image, excerpt, etc. | Select only the columns needed for metadata (already done correctly) | High-traffic blog pages where every ms of TTFB matters |
| JSON-LD on every page via root layout | Global schemas (Organization, Software) on all pages including dashboard | Move global schemas to marketing layout only; dashboard pages do not need SEO schemas | When authenticated pages get bloated with unnecessary script tags |
| `currentDate` as `lastModified` on all sitemap entries | Google re-crawls everything daily | Use actual content modification dates | When Google devalues your sitemap signals (starts ignoring lastmod) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| JSON-LD containing user-generated content without sanitization | XSS via structured data script tags | Already using `.replace(/</g, '\\u003c')` pattern (good). Maintain this on all new JSON-LD |
| Exposing internal URL patterns in sitemap | Dashboard/API routes visible to crawlers | Audit sitemap to only include public routes. Current implementation is correct (only public pages listed) |
| `baseUrl` falling back to `localhost:3050` in production structured data | Structured data points to localhost, Google indexes wrong URLs | Use strict env validation: never allow localhost in production. Current pattern uses `process.env.NEXT_PUBLIC_APP_URL` with fallback -- ensure the fallback is production URL, not localhost |
| Blog metadata timeout returns `{ title: 'Blog Post Not Found' }` | Google indexes "Not Found" title for valid blog posts during cold starts | Return HTTP 503 (Service Unavailable) with `Retry-After` header instead of a 200 with "not found" title. This tells Google to come back later rather than indexing the error state |

## UX Pitfalls

Common user experience mistakes when optimizing for SEO.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Keyword-stuffed titles that read unnaturally | Users see "TenantFlow - Property Management Software \| Property Management \| PM Tool" in browser tab | Write titles for humans first: "TenantFlow vs Buildium: Honest Comparison" reads better and performs better |
| Over-long meta descriptions truncated mid-sentence | Google shows "..." cutting off the value proposition | Keep descriptions under 155 characters. Front-load the most important information |
| Comparison pages with biased feature tables (TenantFlow wins everything) | Users distrust the comparison, bounce rate increases | Show genuine strengths of competitors. Acknowledge areas where they excel. Honest comparisons build trust and reduce bounce rate |
| JSON-LD rich results promising features not yet available | Users click expecting "Tenant Screening" (listed in `featureList`) but it does not exist | Only list actually-available features in structured data. Remove aspirational features from the `featureList` array |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **robots.txt:** Appears to block internal routes (good) but also blocks `/_next/` which prevents Googlebot from rendering pages -- verify with Google's URL Inspection tool
- [ ] **Canonical URLs:** Root layout sets canonical but child pages may inherit homepage canonical instead of their own URL -- verify each public page's canonical in View Source
- [ ] **JSON-LD Organization:** Has all required fields but `aggregateRating` is self-serving and will never display -- verify with Rich Results Test (not just Schema.org validator)
- [ ] **Pricing schema:** Has valid Offer markup but `priceValidUntil` dates are expired (2025-12-31) -- verify dates are current
- [ ] **Blog metadata:** Has `generateMetadata` with ISR caching but timeout fallback returns 200 with "Not Found" title instead of signaling temporary unavailability -- verify with `curl -I` during cold start
- [ ] **Sitemap:** Contains all public pages but `lastModified` dates are unreliable (all set to generation time) -- verify by viewing `/sitemap.xml` raw output
- [ ] **FAQ schema:** Validates perfectly in structured data testing tools but will never produce rich results for a SaaS site -- verify understanding of current Google restrictions
- [ ] **Pages without metadata:** Features, help, search, and blog hub pages have no explicit metadata export -- verify they do not inherit only the root defaults
- [ ] **Comparison pages:** Have breadcrumb schema but breadcrumb only has 2 levels (Home > Comparison) -- should include "Compare" as an intermediate level if a /compare hub exists
- [ ] **`Crawl-delay` directive:** Present in robots.txt but Google completely ignores it -- verify understanding that this only affects Bing/Yandex

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Manual action for spammy structured data | MEDIUM (1-2 weeks) | Remove violating markup, request review in Search Console, wait for Google to re-process (typically 2-14 days) |
| `/_next/` blocked causing mass de-indexing | MEDIUM (2-4 weeks) | Fix robots.txt, request re-indexing of key pages in Search Console, wait for Google to re-crawl (gradual, 2-4 weeks for full recovery) |
| Expired `priceValidUntil` losing pricing rich results | LOW (same day) | Update dates, deploy, request re-indexing of pricing page. Rich results typically restore within 1-3 days |
| Canonical URL confusion causing wrong pages indexed | MEDIUM (2-4 weeks) | Fix canonicals on all pages, deploy, wait for Google to re-process. Cannot force immediate re-canonicalization |
| Blog metadata returning "Not Found" title during cold start | LOW (1-2 days) | Fix timeout handling, deploy. Request re-indexing of affected blog posts in Search Console |
| Sitemap `lastmod` trust lost | HIGH (weeks to months) | Fix dates to be accurate, then wait for Google to rebuild trust in your sitemap signals. No way to force this |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `/_next/` blocked in robots.txt | Phase 1: robots.txt audit | Google URL Inspection tool shows page rendered correctly |
| Self-serving AggregateRating | Phase 1: structured data audit | Rich Results Test shows no warnings; no ratings on Organization schema |
| FAQPage not producing rich results | Phase 1: structured data strategy | Team alignment that FAQ schema is for AI, not Google rich results |
| Expired priceValidUntil | Phase 1: structured data audit | Rich Results Test shows valid offers; dates are in the future |
| Canonical URL inconsistency | Phase 2: per-page metadata | View Source on every public page shows unique, correct canonical URL |
| Client-side JSON-LD not in SSR HTML | Phase 2: Article structured data | View Page Source (not inspect) shows JSON-LD in raw HTML |
| Sitemap lastModified inaccuracy | Phase 3: sitemap improvements | Raw `/sitemap.xml` shows varied, accurate dates |
| Blog metadata timeout returning wrong title | Phase 2: blog SEO enrichment | `curl -v` during cold start returns 503 or valid metadata, not "Not Found" |
| Pages missing explicit metadata | Phase 2: per-page metadata audit | Every page in sitemap has unique title and description in View Source |
| Comparison page bias hurting trust | Phase 2: comparison page SEO | Bounce rate monitoring; honest feature acknowledgments added |
| `baseUrl` inconsistency across pages | Phase 1: centralize URL construction | Single `getSiteUrl()` used everywhere; grep confirms no `process.env.NEXT_PUBLIC_APP_URL` in page components |
| SoftwareApplication featureList listing unavailable features | Phase 1: structured data audit | Every feature in `featureList` has a corresponding working page/section |

## Sources

- [Google Structured Data Policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) -- invisible markup rules, manual action triggers (HIGH confidence)
- [Google FAQ/HowTo Rich Results Changes (Aug 2023)](https://developers.google.com/search/blog/2023/08/howto-faq-changes) -- FAQPage restricted to government/health sites (HIGH confidence)
- [Google Review Snippet Documentation](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) -- self-serving review restrictions (HIGH confidence)
- [Google Making Review Rich Results More Helpful (2019)](https://developers.google.com/search/blog/2019/09/making-review-rich-results-more-helpful) -- Organization/LocalBusiness rating restriction (HIGH confidence)
- [Next.js JSON-LD Guide](https://nextjs.org/docs/app/guides/json-ld) -- official recommendation for structured data placement (HIGH confidence)
- [Next.js generateSitemaps Documentation](https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps) -- sitemap splitting for large sites (HIGH confidence)
- [Vercel: Avoiding Duplicate Content with vercel.app URLs](https://vercel.com/kb/guide/avoiding-duplicate-content-with-vercel-app-urls) -- canonical + X-Robots-Tag guidance (HIGH confidence)
- [Vercel: Are Preview Deployments Indexed?](https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines) -- X-Robots-Tag: noindex on previews (HIGH confidence)
- [The Robots.txt Mistake That Cost Me Visitors](https://minasami.com/web-development/seo/2025/12/05/nextjs-seo-robots-txt-mistake.html) -- real-world /_next/ blocking impact (MEDIUM confidence)
- [Google Crawl-delay Not Supported](https://www.stanventures.com/news/google-updates-robots-txt-rules-no-more-crawl-delay-confusion-1014/) -- Googlebot ignores Crawl-delay directive (HIGH confidence)
- [Google Self-Serving Review Snippets Policy](https://www.practicalecommerce.com/google-muzzles-self-serving-review-snippets) -- entity A reviewing itself (MEDIUM confidence)
- [Stop Using FAQ Schema: New Rules 2026](https://greenserp.com/high-impact-schema-seo-guide/) -- current state of FAQ schema effectiveness (MEDIUM confidence)
- [Next.js SEO: _rsc Parameter Issues](https://github.com/vercel/next.js/discussions/61850) -- Google crawling _rsc parameter URLs (MEDIUM confidence)
- [Google Keyword Stuffing Policies](https://www.stanventures.com/news/keyword-stuffing-in-2025-its-impact-and-google-recommendations-1427/) -- over-optimization penalties (MEDIUM confidence)

---
*Pitfalls research for: SEO & Google Indexing Optimization on Next.js 16 + Vercel*
*Researched: 2026-04-08*
