---
pr: 760
branch: feat/seo-redirect-deleted-blog-catalogue
head: 70bf0342b3bf1308289f772bdc722c7505c76eeb
cycle: 3
reviewed: 2026-05-29T21:56:00Z
depth: deep
files_reviewed: 4
files_reviewed_list:
  - next.config.ts
  - src/lib/seo/blog-redirects.ts
  - src/lib/seo/__tests__/blog-redirects.test.ts
  - .planning/seo-audit/ANALYSIS-2026-05-29.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# PR #760 — Gate-Closing Review (Cycle 3)

**Reviewed:** 2026-05-29T21:56:00Z
**Depth:** deep (independent re-verification — did not trust cycles 1/2)
**Files Reviewed:** 4
**Status:** CLEAN

## Summary

Static 301 redirect map (`src/lib/seo/blog-redirects.ts`, 126 entries) spread into `next.config.ts` `redirects()`, routing ~100 hard-deleted Phase-1 ghost blog slugs to their closest live equivalents. Every load-bearing invariant was re-derived from prod ground truth this cycle — not inherited from prior cycles. **Zero findings at any severity.**

The single thing that could block — a `/blog/<slug>` destination that is not a live published post (a 301→404 chain) — was checked exhaustively against a fresh prod query. **Zero ghost destinations.**

## Independent Verification Results

### 1. CI fully green at HEAD `70bf0342b`
`gh pr checks 760`:
- `checks` — pass (3s)
- `e2e-smoke` — pass (2m51s) — the cycle-2 transient flake is gone; re-run is green
- `rls-security` — pass (1m18s)
- `Aikido Security` — pass (22s)
- `auto-merge` — skipping (expected; gated)

Mergeability: `MERGEABLE` / `CLEAN`.

### 2. No-redirect-to-ghost (the load-bearing invariant)
Prod ground truth pulled live this cycle (PostgREST `blogs?status=eq.published`, 2026-05-29) — **exactly 9 published slugs**:
```
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

Extracted every `/blog/<slug>` DESTINATION from the map and cross-checked each against those 9:
- **18 entries** point to a live `/blog` post (matches the spec's expected "18 live-blog destinations").
- Those 18 entries resolve to **5 distinct** live slugs: `avail-vs-turbotenant…`, `cozy-vs-resman…`, `hemlane-vs-simplifyem-vs-tenantflow…`, `hemlane-vs-zillow-rental-manager…`, `stessa-vs-innago…`. All 5 ∈ the live 9.
- **Ghost destinations: 0.** No 301→404 chain exists.

### 3. Collision guard
No `source` equals a live published slug. Checked all 126 sources against the live-9 set: **0 collisions.** No redirect shadows a live post.

### 4. Map integrity
- 126 entries, **126 unique sources** (no duplicates).
- All 126 sources match `^/blog/<slug>$` (exactly 3 path segments; no `/blog/category/…`, no deeper paths).
- **0 self-redirects.**
- Destination breakdown (every destination ∈ allowed set `{/blog, /compare, /compare/{appfolio,rentredi,buildium}} ∪ {/blog/<live-9>}`):
  - 94 → `/blog`
  - 12 → `/compare/{appfolio:5, rentredi:4, buildium:3}`
  - 2 → `/compare`
  - 18 → live `/blog` comparison posts
  - Total 126. No destination outside the allowed set.

### 5. Test ↔ prod parity
The test's hardcoded `LIVE_PUBLISHED_SLUGS` (9 entries) matches the live prod query **exactly** in both directions (no prod slug missing from the test list; no test slug absent from prod). Both the collision guard and the destination guard rest on this list — and it is faithful.

### 6. Gates
- `bunx vitest --run --project unit src/lib/seo/__tests__/blog-redirects.test.ts` → **7 passed** (327ms).
- `bun run typecheck` → clean (`tsc --noEmit`, no output).
- `bun run lint` → clean (biome, 1222 files, no fixes).

### 7. Diff
`git diff origin/main...HEAD --stat` → only the 4 SEO files (`+707` insertions, no deletions):
```
.planning/seo-audit/ANALYSIS-2026-05-29.md
next.config.ts                  (+12)
src/lib/seo/__tests__/blog-redirects.test.ts
src/lib/seo/blog-redirects.ts
```
**No overlap with #759** (which touches `supabase/*`, `src/types/supabase.ts`, `.planning/repo-audit/*`, `tests/integration/rls/*` — disjoint set). Mergeable independently.

### 8. Subtle-issue scan
- **App-route collision:** every source is `/blog/<single-slug>`. None equals `/blog`, `/blog/category`, or matches `/blog/category/<x>` (the only real app routes under `/blog` are `/blog`, `/blog/[slug]`, `/blog/category`, `/blog/category/[category]`). A source can only ever shadow a `[slug]` dynamic route — which is precisely the intent, and only for deleted slugs (collision guard confirms no live slug is shadowed). **No real app route is intercepted.**
- **`next.config` spread integrity:** the `...DELETED_BLOG_REDIRECTS.map(...)` spread is appended after the 5 pre-existing redirects (`/.well-known/change-password`, `/signup`, `/terms-of-service`, `/privacy-policy`, `/help-center`, `/rss-feed`). None of those sources collide with any `/blog/<slug>`. Existing redirects intact.
- **`permanent` correctness:** all 126 blog entries hardcode `permanent: true` (308, treated as 301 by Google). The lone `permanent: false` in the file (line 72) is the pre-existing `/.well-known/change-password` → `/auth/update-password` 307, intentional and unrelated to this PR. **No `permanent` mistakes in the blog spread.**

## Findings

None. P0: 0 — P1: 0 — P2: 0 — INFO: 0.

---

## Final Summary

**Counts:** P0: 0 / P1: 0 / P2: 0 / INFO: 0

**Verdict: CLEAN**

Second consecutive clean cycle — perfect-PR gate CLOSED. PR #760 is ready to merge.

---

_Reviewed: 2026-05-29T21:56:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
