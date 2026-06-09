# Phase 8 Summary — SEO Recovery (SEO-01/02/03)

**Status:** Code-doable scope complete; SEO-01 surfaced as content-dependent
**Branch:** gsd/phase-8-seo-recovery

## Outcomes
| Req | Status | What |
|-----|--------|------|
| SEO-02 | ✅ Verified done | `/pricing` already emits no Product/merchant-listing schema (only FAQ + Breadcrumb; SoftwareApplication+AggregateOffer are sitewide). Regression guard `pricing/__tests__/page.test.ts:97-106` (`schemaTypes === ["FAQPage","BreadcrumbList"]`, `not.toContain("Product")`) passing. The GSC "Merchant listings: invalid item" cause is removed. |
| SEO-03 | ✅ Implemented | Empty valid category pages (`financial-management`, `maintenance`) now `noindex` so they don't bleed crawl signal. `cache()`-deduped `getCategoryPublishedCount` HEAD query drives `noindex: page>1 \|\| count===0`. Self-healing — flips indexable once a post lands. 3 new `generateMetadata` tests. |
| SEO-01 | ⚠ Content-dependent (owner action) | Republishing the top-impression deleted posts requires real article content via the **n8n pipeline** — cannot be fabricated, and removing a redirect entry before content exists would 404. Code-side is ready: 301 map transfers signal today, collision-guard test enforces the reclaim invariant, runbook documented in `blog-redirects.ts`. Reclaim is incremental: publish a post via n8n → delete its entry. |

## Verification
- Full unit suite: **207 files / 106,567 tests** green. Typecheck + biome clean.
- SEO-02 guard + SEO-03 noindex tests + redirect collision-guard all pass (21 tests across the 3 SEO files).

## Why SEO-01 is not code-closed
The requirement explicitly sources content from the n8n pipeline. Authoring fake "ranked-equivalent" articles would be dishonest and SEO-harmful, and prematurely deleting redirect entries (`dynamicParams=false` on `/blog/[slug]`) would replace a 301 with a 404. The correct, honest completion is: keep the signal-transferring 301s + collision guard in place (done) and hand the content step to the owner's pipeline. This is the only v4.0 requirement that cannot close in code.

## Notes
- No DB writes; no migration. The SEO-03 count query is a cheap per-request HEAD count, request-deduped via React `cache()`.
