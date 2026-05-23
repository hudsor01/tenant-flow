---
phase: 03-routing-aliases
verified: 2026-05-09T04:30:00Z
re_verified: 2026-05-22T02:00:00Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
post_deploy_verification:
  - test: "Live curl probes against https://tenantflow.app (run 2026-05-22 during Phase 15 milestone audit polish)"
    expected: "All 5 redirect paths return 308 with correct Location header; /feed.xml returns 200 with XML content-type"
    actual: |
      /signup            → HTTP/2 308 → location: /pricing
      /terms-of-service  → HTTP/2 308 → location: /terms
      /privacy-policy    → HTTP/2 308 → location: /privacy
      /help-center       → HTTP/2 308 → location: /help
      /rss-feed          → HTTP/2 308 → location: /feed.xml
      /feed.xml          → HTTP/2 200 → content-type: application/rss+xml; charset=utf-8
    result: "PASS — all 6 expectations match"
---

# Phase 3: Routing Aliases Verification Report

**Phase Goal:** `/signup` reaches a real destination (or 301s to `/pricing`); long-form legal URLs (`/terms-of-service`, `/privacy-policy`, `/help-center`, `/rss-feed`) 301 to canonical short paths.
**Verified:** 2026-05-09T04:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /signup returns 308 with Location: /pricing (no redirect loop) | VERIFIED | `next.config.ts:72-76` — `source: '/signup'`, `destination: '/pricing'`, `permanent: true`. Commit `99cb78d18`. No `src/app/signup/` directory exists. |
| 2 | GET /terms-of-service returns 308 with Location: /terms | VERIFIED | `next.config.ts:83-87` — exact entry confirmed. Destination `src/app/terms/page.tsx` exists. |
| 3 | GET /privacy-policy returns 308 with Location: /privacy | VERIFIED | `next.config.ts:88-92`. Destination `src/app/privacy/page.tsx` exists. |
| 4 | GET /help-center returns 308 with Location: /help | VERIFIED | `next.config.ts:93-97`. Destination `src/app/help/page.tsx` exists. |
| 5 | GET /rss-feed returns 308 with Location: /feed.xml | VERIFIED | `next.config.ts:98-102`. Destination `src/app/feed.xml/route.ts` exists. |
| 6 | GET /feed.xml returns 200 with XML content-type for anonymous readers (latent bug fix) | VERIFIED | `src/proxy.ts:31` — `'/feed.xml'` in PUBLIC_ROUTES. `src/app/feed.xml/route.ts` confirmed present. Commit `1f47ed98d`. |
| 7 | External long-form URL referrers reach the canonical short-path page in one redirect hop | VERIFIED | All 5 long-form URLs map directly to canonical paths with a single `permanent: true` entry each in `redirects()`. No intermediary hops exist in the config. |
| 8 | Live prod behavior matches config (308 on all 5 paths, 200 on /feed.xml) | NEEDS HUMAN | next.config.ts redirects() only takes effect after Vercel deploy. Cannot verify programmatically from local filesystem. |

**Score:** 7/8 truths verified (the 8th requires post-deploy human curl probes)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `next.config.ts` | 6 entries in redirects() (1 existing + 5 new, all `permanent: true`) | VERIFIED | 5 `permanent: true` entries + 1 `permanent: false` (well-known, unchanged). All 6 source/destination pairs confirmed via grep. Commit `99cb78d18` touches only this file. |
| `src/proxy.ts` | 27 PUBLIC_ROUTES entries (21 pre-existing + 6 new) | VERIFIED | Array grows from 21 to 27 entries. All 6 new entries present: `/help-center`, `/privacy-policy`, `/terms-of-service`, `/signup`, `/feed.xml`, `/rss-feed`. `isPublicRoute()` and `config.matcher` untouched. Commit `1f47ed98d` touches only this file. |
| `tests/e2e/tests/public/routing-aliases.spec.ts` | New file, 6 tests, mirrors seo-smoke.spec.ts style | VERIFIED | 64 lines. 6 `test(` calls. No `storageState`, no `test.use`, no `beforeEach`, no `page.goto`. Uses `page.request.get` + `maxRedirects: 0`. Commit `c08bfbce4` touches only this file. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `next.config.ts redirects()` | Next.js edge pipeline | `permanent: true` | VERIFIED | 5 new entries each have `permanent: true`. Existing `/.well-known` entry `permanent: false` preserved byte-identical. |
| `src/proxy.ts PUBLIC_ROUTES` | `isPublicRoute()` short-circuit | string === or startsWith match | VERIFIED | All 6 new string literals inserted into the array. `isPublicRoute()` function body is unchanged — existing logic covers all new entries. |
| `routing-aliases.spec.ts` | Playwright `public` project | `page.request.get + maxRedirects: 0` | VERIFIED | All 5 redirect tests assert `[301, 308].toContain(status)` (not `.toBe(308)`) and exact Location header. Bonus test asserts `status === 200` and `content-type =~ /xml/i`. |
| `next.config.ts /signup` entry | No `src/app/signup/` page | redirect IS the fix | VERIFIED | `src/app/signup/` directory does not exist. D-02 honored. |

### Data-Flow Trace (Level 4)

Not applicable. Phase 3 modifies only routing config (`next.config.ts`) and middleware (`src/proxy.ts`) plus a test file. No React components render dynamic data.

### Behavioral Spot-Checks

Step 7b: SKIPPED for the production redirect assertions — these require a live Vercel deploy and are routed to human verification. Local filesystem checks substituted where possible.

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `/signup` entry present in redirects() | `grep "source: '/signup'" next.config.ts` | Found at line 73 | PASS |
| 5 permanent:true entries | `grep -c "permanent: true" next.config.ts` | 5 | PASS |
| 6 entries total in redirects() | source count | 6 (1 existing + 5 new) | PASS |
| 27 entries in PUBLIC_ROUTES | array entry count | 26 string literals in array (26 entries — `'/'` not matched by `/[a-z]` grep, verified by visual inspection = 27 total) | PASS |
| feed.xml route handler exists | `ls src/app/feed.xml/route.ts` | Found | PASS |
| canonical destination pages exist | `ls src/app/{terms,privacy,help,pricing}/page.tsx` | All 4 found | PASS |
| No src/app/signup/ directory | `ls src/app/signup/` | Absent | PASS |
| Design token drift | grep hex/rgb/bg-white on 3 files | 0 matches | PASS |
| Test count | `grep -c "test(" routing-aliases.spec.ts` | 6 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CRIT-05 | 03-01-PLAN.md | Eliminate /signup redirect loop | SATISFIED | `/signup` → `/pricing` 308 in `next.config.ts`; no signup page created |
| CRIT-06 | 03-01-PLAN.md | Long-form legal URL aliases 308 to canonical short paths | SATISFIED | 4 entries in `next.config.ts`; all canonical destinations confirmed present |

### Anti-Patterns Found

None. All three modified files contain only config arrays, string literals, and test assertions. No TODOs, no placeholder returns, no hardcoded empty data, no inline styles.

| File | Pattern | Result |
|------|---------|--------|
| `next.config.ts` | TODO/FIXME/placeholder | 0 matches |
| `src/proxy.ts` | TODO/FIXME/placeholder | 0 matches |
| `routing-aliases.spec.ts` | TODO/FIXME/placeholder | 0 matches |
| All 3 files | hex/rgb/bg-white/inline-ms | 0 matches (TOKEN_CHECK_PASSED) |

### Human Verification Required

#### 1. Post-Deploy Live Curl Probes

**Test:** After this branch merges to `main` and Vercel completes the production deploy (~3 min), run:

```bash
# Step 1 — CRIT-05
curl -sI --max-redirs 0 https://tenantflow.app/signup | grep -i -E '(http|location)'
# Expected: HTTP/2 308 + location: /pricing

# Step 2 — CRIT-06 (all four)
for path in terms-of-service privacy-policy help-center rss-feed; do
    echo "=== /${path} ==="
    curl -sI --max-redirs 0 "https://tenantflow.app/${path}" | grep -i -E '(http|location)'
done
# Expected: each emits HTTP/2 308 + correct location header

# Step 3 — /feed.xml latent bug fix
curl -sI --max-redirs 0 https://tenantflow.app/feed.xml | grep -i -E '(http|content-type)'
# Expected: HTTP/2 200 + content-type: text/xml (or application/xml or application/rss+xml)

# Step 4 — end-to-end chains (each must terminate in 200)
for path in signup terms-of-service privacy-policy help-center rss-feed; do
    echo "=== /${path} chain ==="
    curl -sIL "https://tenantflow.app/${path}" | grep -i -E '(http|location)' | tail -4
done
```

**Expected:** All 5 redirects emit `HTTP/2 308` with correct Location. `/feed.xml` emits `HTTP/2 200` with XML content-type. Every chain terminates in `HTTP/2 200`.

**Why human:** `next.config.ts redirects()` is a Next.js build-time config — the entries only activate after a Vercel deploy and `next build`. Grepping the file confirms the config is correct but cannot confirm the runtime behavior. Phase 1+2 lessons mandate live-prod verification; routing changes in particular have shipped with correct config but unexpected Vercel edge behavior before.

**Acceptance:** Type "approved" if all probes match expected. Type "issue: \<description\>" if any probe fails.

### Gaps Summary

No gaps. All programmatically-verifiable must-haves pass. The single human verification item (post-deploy curl probes) is a process gate, not a code gap — the config is correct and complete.

---

_Verified: 2026-05-09T04:30:00Z_
_Verifier: Claude (gsd-verifier)_
