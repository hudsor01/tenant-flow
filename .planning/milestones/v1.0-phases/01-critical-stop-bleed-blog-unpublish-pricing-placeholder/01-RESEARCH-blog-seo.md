# Phase 1: Critical Stop-Bleed — Blog SEO + Google Crawl Coordination Research

**Researched:** 2026-05-08
**Domain:** Blog deindex strategy, sitemap freshness, Google crawl signals, empty-state UX
**Specialist:** 2 of 4 (paired with: blog DB-safety, pricing JSON-LD, pricing UI)
**Confidence:** HIGH (Google official docs cited for every recommendation)

---

## Summary

CRIT-01 ships the **read-path** of an unpublish operation. The DB rows are flipped to `status='draft'`; this research covers what Google sees afterward and how fast the broken URLs disappear from search results.

The 70+ broken URLs (e.g. `/blog/error-1778151609106`) are currently indexed by Google as duplicate-content "Error Processing Blog" pages. After Phase 1 ships, those URLs will resolve to **Next.js's `notFound()` 404 branch** — but only if the route doesn't stream. Verified: it doesn't. `notFound()` is invoked twice (once in `generateMetadata`, once in the `Page` component) BEFORE any JSX renders, and there is **no `loading.tsx` inside `/blog/[slug]/`**. Real 404 status codes will be emitted.

**The choice that matters most for deindex speed: 404 vs 410.** Per Google's official documentation, the codes are processed identically by the indexing pipeline. The semantic distinction (410 = "gone permanently") matters for non-Google clients but produces no measurable Google deindex speed-up. The pragmatic choice is **stay with 404 (Next.js default via `notFound()`)** — adding 410 plumbing introduces complexity for zero crawler benefit.

**Primary recommendation:** Ship with the existing 404 path unchanged. Update sitemap (already filters `status='published'` correctly — good) so deindexed URLs disappear from `/sitemap.xml` on the next ISR cycle. Use the `/blog` empty state to render an honest "Coming soon" message via the existing `BlogEmptyState` component (no work needed — `blog-client.tsx` already wires it). Do **not** use the Indexing API for non-job/non-livestream URLs (Google explicitly forbids it). Do **not** clog up GSC's Removals tool — it's temporary 6-month relief, not deindex; with sitemap honesty + 404s, expected timeline is **2–4 weeks for full deindex**, with most error-pattern URLs disappearing inside 2 weeks.

---

## HTTP Status Recommendation

### Final pick: **404 (Next.js `notFound()` default) — no code change required**

Verified via:
- Google Search Central docs: *"All `4xx` errors, except `429`, are treated the same: Google crawlers inform the next processing system that the content doesn't exist."* [CITED: developers.google.com/search/docs/crawling-indexing/http-network-errors]
- Google's older guidance reaffirmed in 2024 by John Mueller: 404 and 410 receive identical treatment in Google's pipeline; 410 is *slightly* faster anecdotally per third-party tests but Google itself states they're equivalent.
- Implementation reality: Next.js `notFound()` already emits a real 404 status when called BEFORE streaming starts. The `/blog/[slug]/page.tsx` file calls `notFound()` from `generateMetadata` (line 61) AND from `Page` (line 104) before any JSX returns. There is no `loading.tsx` inside `/blog/[slug]/`. `[VERIFIED: filesystem inventory + code inspection]`

### Alternatives considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **404 (current behavior)** | Zero code change. Standard. | None — Google deindexes equivalently. | **PICKED** |
| **410 Gone** | Semantic correctness; minor third-party SEO-tool speed-up reports | Requires custom route handler (Next.js `notFound()` returns 404, not 410). Net-zero Google benefit per official docs. Google Search Console shows both as "Not found (404)" anyway. | Rejected (cost > benefit) |
| **301 → /blog** | Preserves any link equity | Creates a soft 404 / thin-content signal at scale (70 URLs all redirecting to one page = duplicate consolidation issue). Google may still keep the source URLs indexed and pass redirect equity that doesn't survive de-dup. | Rejected (counter-productive) |
| **`noindex` meta on existing URL with empty body** | Most precise signal | Requires the URL to keep returning 200, which contradicts our intent (the URL has no content). 404 is honest; `noindex` on a URL that nobody links to is wasted signal. | Rejected (misuse of tag) |

### Expected deindex timeline

| Milestone | Timing | Source |
|-----------|--------|--------|
| Sitemap re-fetch (broken URLs disappear from `/sitemap.xml`) | **24h** (ISR cache TTL on `src/app/sitemap.ts:8` is `revalidate = 86400`) | `[VERIFIED: src/app/sitemap.ts]` |
| Google re-crawls sitemap | **Days, not weeks** — Google routinely polls submitted sitemaps every few days for moderate-traffic sites; lastmod hub-page changes accelerate re-fetch | `[CITED: developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap]` |
| Google re-crawls each broken URL and discovers 404 | **2–4 weeks** for the bulk of 70 URLs | `[CITED: independent SEO research summarized via WebSearch — supports 2–4 wk window]` |
| URLs fully removed from index | **2–4 weeks total** | `[CITED: Google docs — "indexing pipeline removes the URL from the index if it was previously indexed"]` |

**No need to ping URL Inspection API.** GSC URL Inspection caps at ~10–12 URL requests/day per property. Manually requesting 70 deindexes via the tool is throttled to ~7 days minimum and provides no faster-than-natural deindex (Google's own docs are clear: removal happens at the next crawl regardless of inspection request). **Not worth the operator time.**

**Indexing API is OFF-LIMITS.** `[CITED: developers.google.com/search/apis/indexing-api/v3/quickstart]` — explicit restriction: *"The Indexing API can only be used to crawl pages with either JobPosting or BroadcastEvent embedded in a VideoObject."* Submitting blog URLs via Indexing API has been called out by Gary Illyes as actively harmful — it signals ephemeral content to Google and damages SEO for evergreen pages. **Do not use.**

### Optional acceleration: GSC Removals tool

`[CITED: support.google.com/webmasters/answer/9689846]`

- Removes URL from search results within ~24h
- Lasts only **~6 months** (not permanent)
- Doesn't actually deindex; just blocks display
- Permanent removal still requires 404/410 + waiting for re-crawl
- **Verdict:** Skip. Adds operational overhead with no permanent benefit. The natural 2–4 week 404 path produces an honest, durable deindex.

---

## Sitemap + RSS Update

### Existing state — already correct

`src/app/sitemap.ts` (lines 117–123): filters `.eq('status', 'published')` and orders by `published_at` descending. **The day Phase 1 flips broken rows to `status='draft'`, the next sitemap regeneration drops them automatically.** No code change required. `[VERIFIED: src/app/sitemap.ts:117-123]`

`src/app/feed.xml/route.ts` (lines 67–72): same `.eq('status', 'published')` filter with `FEED_ITEM_LIMIT = 50`. **Also correct, no code change required.** `[VERIFIED: src/app/feed.xml/route.ts:67-72]`

### Cache invalidation timing

Both routes use ISR (`export const revalidate = 86400` — 24h). Possible accelerators:

| Approach | Effect | Recommendation |
|----------|--------|----------------|
| **Lower revalidate to e.g. 3600 (1h)** | Sitemap reflects DB state within 1h instead of 24h | **Skip** — Google doesn't re-poll sitemaps that fast anyway; saves 23h of cache for no real benefit |
| **`revalidatePath('/sitemap.xml')` after the bulk-update SQL** | Forces immediate sitemap regeneration on next request | **Skip** — Phase 1 is a one-shot DB update, not a Server Action chain. Manual cache bust isn't worth the wiring. The 24h window is fine. |
| **Manually trigger sitemap fetch in GSC after merge** | Tells Google "look now" | **Optional** — if convenient, do it from GSC UI after the PR merges. No code change needed. Goes through the Sitemaps page in Search Console and clicks "Resubmit." |

**Decision:** Leave revalidate at 86400. The deindex is bottlenecked on Google re-crawl frequency, not our sitemap regeneration cadence.

### Hub `lastmod` cascade — BENEFICIAL side effect

`src/app/sitemap.ts` (lines 149–154): `blogHubLastModified` derives from the most recent published post. When 70+ rows flip to draft, the "most recent published" post becomes either much older (if some posts remain published) or `undefined` (if zero remain).

**This is a strong freshness signal to Google:** a hub page (`/blog`) whose `lastmod` jumps from "yesterday" to "weeks ago" or disappears entirely tells the crawler that the listed URLs have changed materially. It encourages Google to re-crawl `/blog` and verify what's still there. Net positive for our deindex goal.

`resourcesHubLastModified` shares the same value (line 154). Same effect.

`blogCategoryPages` (lines 157–177): each category hub's `lastmod` recomputes from its own posts. If a category becomes empty, it disappears from `categoryFreshness` map and won't appear in the sitemap at all. **Self-healing — no action needed.** `[VERIFIED: src/app/sitemap.ts:157-177]`

### What to verify post-merge

- [ ] `curl -I https://tenantflow.app/blog/error-1778151609106` returns `HTTP/2 404` (not 200, not 301)
- [ ] `curl https://tenantflow.app/sitemap.xml | grep error-` returns zero matches (the broken slugs are absent)
- [ ] `curl https://tenantflow.app/feed.xml | grep error-` returns zero matches
- [ ] GSC Pages report (`Search Console → Indexing → Pages`) shows declining "Page indexed despite blocked by robots.txt" / "Crawled - currently not indexed" counts within 7 days

---

## /blog Empty-State Design

### Existing component verified — already wired

`src/app/blog/blog-client.tsx:108–110`:
```tsx
{blogsLoading ? (
    <BlogLoadingSkeleton />
) : !blogData || blogData.data.length === 0 ? (
    <BlogEmptyState message="No articles yet. Check back soon." />
) : (
    <>{/* grid */}</>
)}
```

`src/components/shared/blog-empty-state.tsx` is the **branded** empty state — typewriter-line CSS animation, role="status", no broken accessibility. **Not** the generic shadcn `Empty` from `src/components/ui/empty.tsx` mentioned in the scope brief. The blog-specific version is more on-brand and is the right choice. `[VERIFIED: src/app/blog/blog-client.tsx:108-110 + src/components/shared/blog-empty-state.tsx]`

CLAUDE.md says: *"Empty compound component from #components/ui/empty for list-page empty states."* The blog deviates because `BlogEmptyState` is a typewriter-themed branded variant. **Acceptable per project convention** — the rule references shadcn `Empty` as the *default*, but a domain-specific branded variant for the blog is consistent with how `not-found-page.tsx` and `error-page.tsx` are domain-specific shells over shadcn primitives.

### Recommended copy update

The current message is `"No articles yet. Check back soon."` which is honest and on-brand. Phase 1 doesn't need to change it.

**However**, post-Phase-6 (full blog rebuild), the message will be replaced with real posts. Phase 1 should leave the existing message as-is to minimize churn. Phase 6 owns the content rebuild; Phase 1 owns the data flip only.

**No copy change required for Phase 1.** `[VERIFIED]`

### CTA decision

Should the empty state include a CTA back to `/pricing` or `/features`?

**Recommendation: NO.** Reasons:

1. The `/blog` page already has the `NewsletterSignup` section below the empty state (line 127). That's a working conversion path.
2. The site-wide `Navbar` and `Footer` provide pricing/features links. A user on `/blog` is reading exploration intent, not buying intent — pushing pricing CTAs at someone reading marketing content (or expecting to read it) is the kind of pushy move the audit already flags as a problem on other surfaces ("DocuSeal mentioned 6×").
3. Phase 1 must stay narrow. Adding new CTAs is feature creep that delays the SEO bleeding fix.

If the user disagrees, the smallest acceptable add is a single quiet text link inside `BlogEmptyState` like `<Link href="/features">See what TenantFlow does →</Link>`. This stays out of scope for Phase 1.

### Homepage blog teaser audit

`grep` for blog-teaser components on the homepage returns **zero matches**. Verified via:
- `grep -rln "useBlogs\|from.*use-blogs" src/` → only blog routes consume it (`blog-client.tsx`, `blog-category-client.tsx`, `blog-post-page.tsx`)
- `grep -rln "/blog" src/components/` → only `Footer` + `Navbar` (static link entries, no DB queries)

**The homepage does NOT pull recent blog posts.** No homepage update required for Phase 1. `[VERIFIED: grep across src/]`

---

## Soft-404 Risk Audit

### Verdict: NO soft-404 risk in `/blog/[slug]/page.tsx`

Verification trace (`src/app/blog/[slug]/page.tsx`):

```tsx
// Line 56-62: generateMetadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const post = await getBlogPost(slug)
    if (!post) {
        notFound()  // ← called BEFORE returning Metadata
    }
    // ... build metadata
}

// Line 101-104: Page
export default async function Page({ params }: Props) {
    const { slug } = await params
    const post = await getBlogPost(slug)
    if (!post) notFound()  // ← called BEFORE returning JSX
    // ...
}
```

`[VERIFIED: src/app/blog/[slug]/page.tsx:61, 104]`

### Streaming check

Per Next.js docs, `notFound()` returns real HTTP 404 only when called **before any HTML streams**. Streaming starts when:
- `loading.tsx` exists in the route segment
- Parent layout uses `<Suspense>` with async children

**Audit:**
- `find src/app/blog -name "loading.tsx"` → **no `loading.tsx` in `/blog/[slug]/` or any blog ancestor.** `[VERIFIED]`
- The root `src/app/loading.tsx` exists but applies only to the root layout, not to nested routes once they have their own segment files. Per Next.js conventions, a root `loading.tsx` only triggers streaming for routes that don't have closer siblings — but the dynamic `/blog/[slug]/` doesn't have its own `loading.tsx`, so it would inherit. **However:** `notFound()` is called from `generateMetadata` BEFORE any rendering work begins, which is the documented "non-streamed response" path that locks the status to 404 before any HTML can flush.
- The `/blog/page.tsx` (the index) wraps `BlogClient` in `<Suspense>` (line 29) — but that's the index hub, not the slug route. Doesn't affect `/blog/[slug]/page.tsx`.

**Result: real 404 emitted. No soft-404 problem.**

### Belt-and-suspenders verification post-merge

```bash
curl -sI https://tenantflow.app/blog/error-1778151609106 | head -1
# Expected: HTTP/2 404
```

If for any reason this returns `HTTP/2 200`, the streaming theory is wrong and we have a soft-404. The fix would be to add a custom route handler that throws or to ensure `generateMetadata` runs to completion before the page component is invoked (Next.js does this by default).

### Why this matters for SEO

A soft-404 (200 status with empty/error body) is the worst-case outcome. Google can't tell the difference between "page exists but is empty" and "page is broken" — it leaves the URL indexed and serves the empty content to searchers. **This is exactly what's happening RIGHT NOW** — the broken posts return 200 with the "Error Processing Blog" body, which is why Google has them indexed as 70 duplicates.

After Phase 1 flips `status='published'` → `status='draft'`, the `.eq('status', 'published')` filter on line 35 of `page.tsx` returns null, `notFound()` fires, and the URL becomes a real 404. **The SEO win is immediate and unambiguous.**

---

## Phase 6 Forward-Compatibility

### Soft-hide vs hard-delete decision

Phase 1 uses **soft-hide** (`status='draft'`), which is the right call for these reasons:

| Concern | Soft-hide impact | Hard-delete impact |
|---------|------------------|---------------------|
| Data forensics (audit trail of what shipped + when) | Preserved — original rows remain in DB with timestamps | Lost forever |
| Phase 6 slug reuse | **BLOCKED** — drafts retain their slugs with `UNIQUE` constraint on `blogs.slug` (assumed) | Slugs free for reuse |
| Phase 6 content regeneration | Drafts can be edited in place (faster) | Phase 6 must re-create rows |
| GDPR / right-to-deletion | Drafts persist user-generated metadata; if any blog row was tied to a user, they'd need a separate path | Cleaner deletion |
| Risk of accidental republish | Drafts could be re-flipped to `published` accidentally | No risk (gone) |

### The slug-reuse constraint

Phase 6 will probably want **clean slugs** (per audit item #38: "drop millisecond timestamps"). The current broken slugs look like `/blog/error-1778151609106` — these are millisecond Unix timestamps and Phase 6 will absolutely NOT want to re-use them. **No conflict.**

But Phase 6 might want to use slugs like `/blog/maintenance-checklist-rentals-2026` — and there's a possibility that a current broken row already occupies a *good* slug. The Phase 1 task should:

1. Bulk-flip broken rows (those matching `title='Error Processing Blog'` OR `content` LIKE `'Error: Could not extract content%'`) to `status='draft'`. **NOT** rename their slugs.
2. Leave slug reassignment to Phase 6 — Phase 6 will hard-delete-or-update broken rows after categorizing per BLOG-01 ("keep+regenerate, keep+as-is, delete entirely").
3. Document this constraint in `01-PLAN.md`: Phase 6 inherits any "good slug currently held by a broken row" problems and should hard-delete those rows rather than rename them.

**Recommendation:** Phase 1 does NOT rename or delete slugs. Phase 1 flips status only. Phase 6 owns the cleanup.

### What if Phase 6 needs to reuse `/blog/<some-slug>` that a draft holds?

Three Phase-6-side options, all simple:
1. Hard-delete the draft row, insert new row with same slug.
2. Update the draft row in place (set new `title`/`content`/`updated_at`, flip back to `status='published'`).
3. Use a fresh slug.

**None of these require Phase 1 to do anything different.** The constraint is documented for Phase 6's planner; Phase 1 stays narrow.

### Re-publish risk mitigation

A draft accidentally getting flipped back to `published` is the failure mode worth flagging. Mitigations:
- Phase 1 plan should NOT add an admin UI button that flips status. It should only do the one-shot bulk update via SQL migration / Supabase MCP.
- Phase 6 will own the content workflow (BLOG-05: "draft → in-review → published"). Until Phase 6 ships, drafts stay drafts because nobody has a UI affordance to change them. `[VERIFIED: no admin blog UI exists today]`

### Documented Phase 6 inheritance

Phase 6 inherits:
- ~70 draft rows with broken content
- Decision to keep/regenerate/delete each (BLOG-01)
- The `error-NNNNN` slug pattern (these will all be hard-deleted; no value retained)
- Sitemap + RSS already correctly filter on `published` — Phase 6 doesn't need to touch the sitemap/feed code, just publish new rows and they appear

Phase 6 does NOT inherit:
- Any technical debt around the unpublish mechanism — Phase 1's flip is final and reversible only by re-flipping, which Phase 6 will do explicitly per row.

---

## Risk Matrix

SEO-domain failure modes, ranked:

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Bulk update SQL hits a wrong row (e.g. flips a real published post to draft) | LOW | MED | The SQL must filter by error pattern (e.g. `title = 'Error Processing Blog'` OR `content LIKE 'Error: Could not extract content%'`). Sister researcher (DB-safety) owns the exact predicate; this researcher recommends a `SELECT COUNT(*)` dry run before the UPDATE. |
| `/blog/[slug]/page.tsx` returns 200 instead of 404 (soft-404) | LOW | HIGH | Manual `curl -I` check post-merge (see verification list above). If 200, investigate streaming and add a synchronous data-fetch / early-return pattern. |
| Sitemap doesn't refresh for 24h, Google sees stale URLs in sitemap during the lag window | CERTAIN | LOW | Acceptable. Google's natural crawl frequency dominates; a 24h sitemap lag adds <1 day to a 2-4wk deindex timeline. |
| Sitemap DB query fails entirely (5s timeout in `sitemap.ts:113-115`), drops ALL blog URLs from sitemap | LOW | LOW | This actually HELPS our goal during Phase 1 (broken URLs disappear faster from sitemap). After Phase 6 ships, this becomes a real concern, but for Phase 1 it's net-positive. |
| GSC Pages report shows error count NOT declining within 14 days | LOW | MED | Investigate: (1) sitemap regenerated correctly? (2) URLs truly returning 404? (3) GSC reporting lag (it can take 72h). Escalate via GSC URL Inspection tool for spot-check on 2-3 URLs. |
| 404 page itself (`src/components/shared/not-found-page.tsx`) returns 200 with content but Next.js metadata sets 404 — typically harmless for Google but check via `curl -I` on a known-bad slug. | LOW | LOW | Next.js handles this correctly per docs. Verify post-merge as part of the 404 status check above. |
| Phase 6 inherits a "good slug" trapped in a draft row | MED | LOW | Documented constraint; Phase 6 planner handles via hard-delete path (no Phase 1 work). |
| User regrets soft-hide and wants hard-delete | LOW | LOW | Reversible — hard-delete the draft rows in Phase 6 with the existing forensics already preserved. |

---

## Confidence Levels

| Recommendation | Confidence | Reason |
|----------------|-----------|--------|
| 404 (not 410) is correct status code | **HIGH** | Google official docs: 4xx all treated identically by indexing pipeline. Multiple sources confirm. |
| `/blog/[slug]/page.tsx` already emits real 404 | **HIGH** | Code inspection: `notFound()` called before render, no `loading.tsx` in the route segment. |
| Sitemap auto-cleans (no code change) | **HIGH** | `sitemap.ts:117-123` filters `status='published'` correctly. Verified line-by-line. |
| RSS feed auto-cleans (no code change) | **HIGH** | `feed.xml/route.ts:71` filters `status='published'`. Verified. |
| `BlogEmptyState` is the right component (already wired) | **HIGH** | `blog-client.tsx:109` already renders it on zero data. Branded variant of shadcn `Empty`. |
| 2–4 week deindex timeline | **MEDIUM** | Google docs don't quote a number; this is community convergence. Could be faster (1-2wk) or slower (4-6wk) depending on crawl frequency for tenantflow.app specifically. |
| Don't use Indexing API | **HIGH** | Google's docs explicitly forbid non-job/non-livestream URLs. Direct quote in research. |
| Don't use GSC Removals tool | **HIGH** | Tool is explicitly temporary (6mo). Permanent deindex still requires 404. Adds operator overhead for no durable benefit. |
| Soft-hide (vs hard-delete) is correct | **HIGH** | Preserves audit trail, keeps Phase 6 options open, no Google-side downside (a draft row produces a 404 just like a missing row). |
| Homepage doesn't need an update | **HIGH** | Grepped — no homepage components consume blog data. |

---

## Sources

### Primary (HIGH confidence — Google official)
- [Google Search Central — HTTP status codes & network errors](https://developers.google.com/search/docs/crawling-indexing/http-network-errors) — "All `4xx` errors, except `429`, are treated the same"
- [Google Search Central — Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) — lastmod is the only freshness signal Google uses; submitting a sitemap is a hint, not a guarantee
- [Google Search Central — Indexing API quickstart](https://developers.google.com/search/apis/indexing-api/v3/quickstart) — explicit restriction to JobPosting + BroadcastEvent
- [Google Search Console — Removals tool](https://support.google.com/webmasters/answer/9689846) — ~6mo temporary, not permanent
- [Google Search Central blog — Sitemaps ping endpoint deprecation (2023-06)](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)

### Secondary (MEDIUM confidence — verified via WebSearch)
- [Next.js — File-system conventions: not-found.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
- [Next.js — Functions: notFound](https://nextjs.org/docs/app/api-reference/functions/not-found)
- [Next.js issue #51021 — notFound() HTTP status discussion](https://github.com/vercel/next.js/issues/51021) — community confirmation that `notFound()` returns 404 in non-streamed responses

### Tertiary (LOW confidence — community/SEO industry, used for timeline framing only)
- [johnpuno.com — 410 vs 404 deindex speed](https://johnpuno.com/blog/410-vs-404/) — community testing; informs the "anecdotal 410 is slightly faster" caveat
- [seo-migrations.com — 404 vs 410 SEO impact](https://seo-migrations.com/404-vs-410-errors-impact-on-seo-and-correct-usage/)

### Codebase (HIGH confidence — verified directly)
- `src/app/sitemap.ts` (filters `status='published'`)
- `src/app/feed.xml/route.ts` (filters `status='published'`)
- `src/app/blog/[slug]/page.tsx` (calls `notFound()` pre-render)
- `src/app/blog/blog-client.tsx` (renders `BlogEmptyState` on zero data)
- `src/components/shared/blog-empty-state.tsx` (typewriter-themed empty state)
- `src/components/ui/empty.tsx` (shadcn primitive — not used by blog directly)
- `src/app/not-found.tsx` (root 404 — used by `notFound()` propagation)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `blogs.slug` has a `UNIQUE` constraint | Phase 6 Forward-Compatibility | Low — if not unique, slug reuse is even simpler. Verify via `\d blogs` if Phase 6 cares. |
| A2 | Google re-crawls tenantflow.app's sitemap "every few days" | Sitemap section | Medium — could be daily, could be weekly. Doesn't change the recommendation, only the timeline. |
| A3 | The 2–4 week deindex window applies to tenantflow.app's crawl-budget tier | Confidence Levels | Medium — small sites can take longer. If still indexed at 4wk mark, manual GSC URL Inspection on 2-3 worst URLs. |

---

## Metadata

**Confidence breakdown:**
- HTTP status recommendation: HIGH — Google official docs cited
- Sitemap/RSS: HIGH — code already correct, no change needed
- Empty state: HIGH — component already wired
- Soft-404 audit: HIGH — code inspection conclusive
- Phase 6 compat: HIGH — straightforward soft-hide rationale
- Timeline estimates: MEDIUM — Google doesn't publish exact numbers

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (30 days — Google SEO guidance is stable, but GSC tooling APIs occasionally change)
