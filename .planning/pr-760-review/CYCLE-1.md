---
pr: 760
branch: feat/seo-redirect-deleted-blog-catalogue
cycle: 1
reviewed: 2026-05-29
depth: deep
files_reviewed: 4
files_reviewed_list:
  - src/lib/seo/blog-redirects.ts
  - src/lib/seo/__tests__/blog-redirects.test.ts
  - next.config.ts
  - .planning/seo-audit/ANALYSIS-2026-05-29.md
findings:
  p0: 0
  p1: 0
  p2: 2
  info: 2
  total: 4
verdict: CLEAN
---

# PR #760 — Cycle 1 Review

**301-redirect the deleted Phase-1 blog catalogue (SEO ranking-equity recovery)**

Adversarial review. Started from the hypothesis that the collision guard is theater and/or the redirect map breaks `next build`. Both disproven against prod + CI. No correctness, security, or data-loss defects found. Two minor SEO-judgment notes and two informational observations.

---

## Highest-stakes verifications (both PASS)

### (a) Collision guard is REAL and correct vs prod — not theater

Fetched prod published slugs live via PostgREST (RLS-scoped publishable key, `status=eq.published`):

```
PUBLISHED_COUNT 9
avail-vs-turbotenant-complete-comparison-for-2026
cozy-vs-resman-complete-comparison-for-2026
hemlane-vs-simplifyem-vs-tenantflow-the-definitive-2025-comparison-for-independent-landlords
hemlane-vs-zillow-rental-manager-complete-comparison-for-2025
innago-vs-doorloop-complete-comparison-for-2025
propertyware-vs-innago-vs-tenantflow-the-definitive-guide-for-small-landlords-in-2025
stessa-vs-innago-complete-comparison-for-2026
the-essential-tenant-screening-checklist-for-first-time-landlords
virtual-tours-that-attract-quality-tenants
```

- **Prod has exactly 9 published blogs** — the PR's central claim, confirmed.
- The test's hardcoded `LIVE_PUBLISHED_SLUGS` set (blog-redirects.test.ts:7-17) is an **exact set-match** to these 9 prod slugs. `comm` diff both directions returned empty (no extras, no missing). The guard is NOT stale — it pins the real prod state.
- **Cross-checked all 9 prod slugs against every redirect `source` in the map: zero collisions.** No working post is 301'd away. This is the single highest risk in the PR, and it is clean.

### (b) `next build` accepts the 126 redirects — CI `checks` PASS

`gh pr checks 760`: **`checks` = pass** (this job runs `next build`, which compiles + validates `redirects()`). `rls-security` = pass. `e2e-smoke` = pending (in-flight, unrelated to this change). Aikido security = pass. `mergeable: MERGEABLE`, `mergeStateStatus: BLOCKED` (blocked only on the pending `e2e-smoke` required check, not on a failure).

Local `bun run typecheck` = clean (tsc exit 0). `biome check` on all 3 source files = no issues.

---

## Redirect map integrity (PASS)

Parsed the map with a wrap-agnostic regex (biome line-wraps long `source:` values onto a second line):

- **126 entries, 126 unique sources, 0 duplicates, 0 self-redirects.** The "126-entry" claim is exact. (Raw `grep -cE '^\s*source:'` undercounts to 104 because of the 2-line wrapping — the entry count is 126.)
- Every source matches `^/blog/[a-z0-9][a-z0-9-]*$`.
- Destination distribution: 94 `/blog`, 20 `/compare`, 5 `/compare/appfolio`, 4 `/compare/rentredi`, 3 `/compare/buildium`.
- **All 5 destinations are real, rendering live routes:**
  - `/blog` → `BlogPage` default export (blog/page.tsx:82).
  - `/compare` → `ComparePage` default export (compare/page.tsx:23).
  - `/compare/{appfolio,rentredi,buildium}` → `generateStaticParams` enumerates `VALID_COMPETITORS = Object.keys(COMPETITORS)` = exactly `{buildium, appfolio, rentredi}` (compare-data.ts:18-369, page.tsx:30-31). All three hub targets are statically generated; `notFound()` only fires for a key not in that set.
- Routing logic is internally consistent with the stated rules: every hub-named slug routes to `/compare/<hub>` (0 mismatches), every non-hub `-vs-` slug routes to `/compare` (0 mismatches).

## next.config.ts wiring (PASS)

- Import `./src/lib/seo/blog-redirects` resolves (typecheck clean; same pattern as the proven `import "./src/env"`).
- The spread `...DELETED_BLOG_REDIRECTS.map((r) => ({ source, destination, permanent: true }))` is appended to the existing array; the pre-existing entries (`/signup`→`/pricing`, legal aliases, `/.well-known/change-password`, `/rss-feed`→`/feed.xml`) are untouched and precede it. No source overlap between the static entries and the blog map.
- `permanent: true` emits 308; Google treats 308 as 301 for ranking/equity transfer. Correct.

## Branch staleness / conflict (PASS)

`git diff origin/main...HEAD` = exactly the 4 expected files. Most recent main commit is #759 (`8115e01b4 chore(db): finish rent-payment / tenant-portal demolition`) which touched only DB/migration files — **zero overlap** with this PR's 4 files. `mergeable: MERGEABLE`. The merge is conflict-free and does not revert #759.

---

## P2 (judgment — non-blocking)

### P2-01: Two high-equity ghosts route to a generic hub when the analysis itself identified a better live target

**Files:** `src/lib/seo/blog-redirects.ts:330-331`, `:228-231` vs `ANALYSIS-2026-05-29.md:32,34`

The analysis P0 table explicitly argued for a topically-closest **live** target on two of the highest-impression comparison ghosts, but the shipped map sends both to a generic hub:

| Ghost (source) | Analysis P0 recommendation (line) | Shipped destination |
|---|---|---|
| `stessa-vs-turbotenant-complete-comparison-for-2026` (325 impr) | `/blog/avail-vs-turbotenant-…` "live, topically closest" (L32) | `/compare` |
| `propertyware-vs-zillow-rental-manager-…` (128 impr) | `/blog/hemlane-vs-zillow-rental-manager-…` "live" (L34) | `/compare` |

Both proposed live targets exist in prod's 9 published slugs (verified), so they are valid. A redirect to a specific live comparison preserves more topical ranking relevance than a generic hub. The doc is internally inconsistent (its own implementation table at L89 also lists `/compare`), so this is arguably a documentation-vs-implementation drift rather than a bug. **Not a blocker** — the hub is a defensible target and the equity still transfers. Flagging because the PR's own analysis named a stronger option for these two slugs.

**Fix (optional):** point those two sources at the named live posts:
```ts
{ source: "/blog/stessa-vs-turbotenant-complete-comparison-for-2026",
  destination: "/blog/avail-vs-turbotenant-complete-comparison-for-2026" },
{ source: "/blog/propertyware-vs-zillow-rental-manager-complete-comparison-for-2026",
  destination: "/blog/hemlane-vs-zillow-rental-manager-complete-comparison-for-2025" },
```
Note: if adopted, `VALID_DESTINATIONS` in the test must be widened to include those two live slugs, or the "every destination is a known live path" test will fail.

### P2-02: 94 distinct URLs collapse to `/blog` — soft-404 redirect risk

**File:** `src/lib/seo/blog-redirects.ts` (94 `destination: "/blog"` entries)

Mass-redirecting 94 distinct ghost URLs to one index hub carries a known SEO risk: Google may classify a redirect whose target is not topically equivalent as a **soft 404** and ignore the equity transfer (the same behavior it applies to "redirect to homepage" patterns). The analysis explicitly offered the alternative (410 Gone for the irrelevant guides, L40/L48) and chose blanket-301 (Option A) as the recommended floor. This is a deliberate, documented trade-off — **not a defect**. The 32 comparison ghosts going to `/compare*` hubs are topically aligned and low-risk; the soft-404 concern applies only to the generic-guide bucket, where the downside is "Google ignores the redirect" (i.e., no worse than the current bare 404), not a regression. Noting so cycle 2 / future GSC monitoring can watch for soft-404 reports on the `/blog`-targeted set and selectively switch to 410 if they materialize.

---

## INFO

### INFO-01: `source.includes(h)` hub matching is substring-based (currently safe)

**File:** `src/lib/seo/__tests__/blog-redirects.test.ts:62,71`

The hub-targeting assertions use `source.includes("appfolio"|"rentredi"|"buildium")`. Substring matching would misfire if a future slug contained a hub name incidentally (e.g., a slug about a different topic that happens to embed "buildium"). Across the current 126 entries there is no such false positive (verified: all hub-named entries are legitimately about that hub). No action needed now; just a latent brittleness if the map grows. A word-boundary match (`-buildium-`/`buildium-`/`-buildium`) would be marginally more precise.

### INFO-02: Republish-reclaim coupling is documented but unenforced

**File:** `src/lib/seo/blog-redirects.ts:11-14`, `ANALYSIS-2026-05-29.md:75-90`

The Hybrid plan requires deleting a map entry when a quality replacement is published at that slug, otherwise the 301 shadows the new live post (the exact collision class the guard protects against). The collision test (`LIVE_PUBLISHED_SLUGS`) is the safety net, but it is a **hardcoded** set — when the top-10 are republished, whoever adds them must also update `LIVE_PUBLISHED_SLUGS` or the guard silently stops covering them. Acceptable for now (9 slugs, low churn), but a future improvement would be to drive the test's live-slug set from prod at test time rather than hardcoding. Noting for the reclaim phase, not this PR.

---

## Counts

- **P0:** 0
- **P1:** 0
- **P2:** 2 (both judgment / non-blocking SEO trade-offs)
- **INFO:** 2

## Verdict: CLEAN

First clean cycle — cycle 2 closes the gate.

The two highest-stakes items are both verified against ground truth: (a) the collision guard's hardcoded live-slug set is an exact match to prod's 9 published slugs and no live slug appears as a redirect source, and (b) CI `checks` (`next build`) passes with the 126 redirects. The P2 items are documented SEO trade-offs the analysis already weighed, not defects, and require no fix to merge.
