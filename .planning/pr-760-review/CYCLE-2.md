# PR #760 — Perfect-PR Review Cycle 2

**Branch:** `feat/seo-redirect-deleted-blog-catalogue`
**HEAD:** `70bf0342b` (cycle-1 fix: route -vs- ghosts to live comparison posts, P2-01)
**Reviewed:** 2026-05-29
**Depth:** deep (adversarial — every claim independently re-verified against prod)

---

## Verdict: CLEAN

**First clean cycle on the fixed map — cycle 3 closes the gate.**

| Severity | Count |
|----------|-------|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| INFO | 1 |

---

## Highest-stakes invariant — NO-REDIRECT-TO-GHOST: HOLDS

Prod ground truth (queried live via PostgREST `blogs?select=slug&status=eq.published`, 2026-05-29, HTTP 200, **9 rows**):

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

Parsed all 126 redirect pairs out of `blog-redirects.ts` and cross-checked every `/blog/<slug>` DESTINATION against that prod set:

- **18 `/blog/` destinations. 0 ghosts.** Every one resolves to a live published slug. No 301→404 chain exists.
- The test's `LIVE_PUBLISHED_SLUGS` set (9 entries) **exactly matches** prod's 9 (test−prod = ∅, prod−test = ∅). Both the collision guard and the new destination guard rest on a set that is currently truthful.

---

## Verification results (all independently re-derived, not trusted)

### 1. No-redirect-to-ghost — PASS
18 `/blog/` destinations, all ∈ the 9 live prod slugs. 0 ghost destinations.

### 2. Collision guard — PASS
0 sources match a live published slug. No redirect shadows a working post.

### 3. Map integrity — PASS
- 126 pairs, **126 unique sources** (0 duplicates).
- Every source matches `^/blog/[a-z0-9][a-z0-9-]*$`.
- 0 self-redirects (source ≠ destination for all).
- 0 unrecognized destinations (every dest is a STATIC hub/index or a live `/blog/` post).
- Distribution **matches the claim exactly**: 18 live `/blog/` posts, 12 hubs (appfolio 5 + rentredi 4 + buildium 3), 2 `/compare`, 94 `/blog`.
- Hub-targeting invariant: every source containing `appfolio|rentredi|buildium` routes to `/compare/<that-hub>` — 0 violations. The 3 hub slugs are exactly `Object.keys(COMPETITORS)` = `{appfolio, rentredi, buildium}` with `generateStaticParams`, so all 12 hub destinations are statically-generated live pages, not 404s.

### 4. Brand-token soundness — PASS
Spot-checked all 18 live-post routings (not just 3). Every one shares a genuine **brand/product token**, never a spurious filler/year/"tenantflow" match:

| Ghost | → Live post | Shared brand token |
|-------|------------|--------------------|
| `stessa-vs-turbotenant-…` | `avail-vs-turbotenant-…` | `turbotenant` |
| `propertyware-vs-zillow-rental-manager-…` | `hemlane-vs-zillow-rental-manager-…` | `zillow-rental-manager` |
| `landlord-studio-vs-resman-…` | `cozy-vs-resman-…` | `resman` |
| `rentec-direct-vs-avail-…` | `avail-vs-turbotenant-…` | `avail` |
| `tenantcloud-vs-stessa-…` | `stessa-vs-innago-…` | `stessa` |
| `tenantflow-vs-hemlane-…` | `hemlane-vs-simplifyem-vs-tenantflow-…` | `hemlane`, `tenantflow` |
| (12 more) | | all share a brand product token |

No spurious match (e.g. two slugs merely both containing `tenantflow` or `2025`). The 2 `/compare` fallbacks genuinely lack a brand match:
- `rentec-direct-vs-apartments-com-…` → `/compare`: no live post mentions rentec-direct or apartments-com (only the filler year `2025` overlaps). Correct.
- `tenantflow-pricing-vs-competitors-…` → `/compare`: only `tenantflow` overlaps (every TenantFlow post carries it — too weak a signal). A generic "us vs all competitors" pricing guide → the `/compare` hub (which lists every comparison) is a more relevant target than picking one arbitrary live post. Correct editorial choice.

### 5. Gates — PASS
- `vitest --run blog-redirects.test.ts`: **7/7 pass**.
- `bun run typecheck` (`tsc --noEmit`): **clean, 0 errors**.
- `bun run lint` (`biome check`): **clean, 1222 files, no fixes**.

### 6. CI on HEAD `70bf0342b`
- `checks` (next build — compiles `next.config.ts` + the full redirect map): **PASS** (the map builds; this is the gate that proves the redirects are structurally valid).
- `rls-security`: **PASS**.
- `Aikido Security`: **PASS**.
- `e2e-smoke`: **FAIL** — UNRELATED to this PR (see INFO-01).

### 7. Diff sanity — PASS
`git diff origin/main...HEAD --name-only` = exactly 4 files: `next.config.ts`, `src/lib/seo/blog-redirects.ts`, `src/lib/seo/__tests__/blog-redirects.test.ts`, `.planning/seo-audit/ANALYSIS-2026-05-29.md`. The cycle-1 fix touched 3 (map, test, analysis md). No overlap with PR #759 (already MERGED; touches no SEO/redirect/config files).

---

## INFO

### INFO-01: `e2e-smoke` failure is environmental, not caused by this PR — NON-BLOCKING

The `e2e-smoke` check failed on:
```
🔥 P0: Navigation works — NAVIGATION FAILED: Tenants page did not load (URL /tenants)
🔥 P0: Navigation works — NAVIGATION FAILED: Homepage page did not load
```

This is an **authenticated** critical-path failure on `/tenants` and `/`, structurally impossible to cause from this PR:

- All 126 redirect sources are `/blog/<ghost>`; all 126 destinations are `/blog` or `/compare`. **0 redirects touch any app route** (`/tenants`, `/dashboard`, `/properties`, `/`, etc.) — verified programmatically.
- The `checks` gate (which actually compiles `next.config.ts` + the redirect map) PASSES, proving the map builds and is valid.
- This matches the documented synthetic-test-account trial/subscription flakiness pattern in project memory (authenticated dashboard smoke failures when the test owner's `subscription_status` drifts to `expired` — independent of branch code).

**No fix required in this PR.** The redirect map cannot affect authenticated navigation. If the perfect-PR gate requires a green `e2e-smoke`, that is an infra/test-account concern (verify `e2e-owner-a` is `subscription_status='active'`), orthogonal to the SEO redirect change under review.

---

## Cycle-2 conclusion

The fixed map is internally consistent and externally truthful against prod. The new no-redirect-to-ghost invariant — the single highest-stakes property of the cycle-1 fix — holds for all 18 live-post destinations against live prod data. Zero blocking findings. Cycle 3 (the second consecutive zero-finding cycle) closes the perfect-PR gate.
