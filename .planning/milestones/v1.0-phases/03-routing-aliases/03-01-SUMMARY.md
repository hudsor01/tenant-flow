---
phase: 03-routing-aliases
plan: 01
subsystem: routing
tags: [routing, redirects, next-config, proxy, public-routes, e2e, seo, crit-05, crit-06]
requires:
  - next.config.ts redirects() block existing /.well-known/change-password entry
  - src/proxy.ts existing PUBLIC_ROUTES + isPublicRoute matcher
  - tests/e2e/tests/public/ project (empty storageState)
provides:
  - 5 permanent (308) redirects: /signup, /terms-of-service, /privacy-policy, /help-center, /rss-feed
  - 6 new PUBLIC_ROUTES entries: 5 defense-in-depth aliases + /feed.xml latent bug fix
  - 6-test Playwright spec asserting redirect status + Location and RSS 200 content-type
affects:
  - external referrers to /signup (CRIT-05 loop eliminated)
  - external referrers to long-form legal URLs (CRIT-06 — 1-hop 308 to canonical)
  - anonymous RSS readers / aggregators (latent bug closed: /feed.xml now 200)
tech-stack:
  patterns:
    - Next.js 16 redirects() with permanent: true (emits 308)
    - String literal PUBLIC_ROUTES match in src/proxy.ts isPublicRoute()
    - Playwright public project (empty storageState) + page.request.get + maxRedirects: 0
key-files:
  created:
    - tests/e2e/tests/public/routing-aliases.spec.ts
  modified:
    - next.config.ts
    - src/proxy.ts
decisions:
  - D-01: All 5 new redirects use permanent: true → 308 (Google/browsers treat as 301 for SEO + cache)
  - D-02: No /signup page created — the redirect IS the entire CRIT-05 fix
  - D-03: PUBLIC_ROUTES gets all 5 aliases as defense-in-depth (cost: 5 strings; benefit: zero-cost insurance)
  - D-04: e2e spec lives at tests/e2e/tests/public/routing-aliases.spec.ts (mirror seo-smoke.spec.ts)
  - D-05: 6 tests — 5 redirect assertions + 1 RSS bonus
metrics:
  duration: 2m14s
  completed: "2026-05-09T02:51:31Z"
  tasks_completed: 3
  files_changed: 3
  commits: 3
---

# Phase 3 Plan 01: Routing & Legal-URL Aliases Summary

Eliminated the `/signup → /login → /signup` redirect loop and 308-aliased four long-form legal URLs to their canonical short paths via Next.js `redirects()` config; added 6 PUBLIC_ROUTES entries (5 defense-in-depth + `/feed.xml` latent bug fix); shipped a 6-test Playwright spec covering all five redirects plus the RSS 200 content-type assertion.

## Commits

| Task | Type | Hash | Message |
|------|------|------|---------|
| 1 | feat | `99cb78d18` | feat(03-01): add 5 redirects for CRIT-05 + CRIT-06 |
| 2 | feat | `1f47ed98d` | feat(03-01): add 6 PUBLIC_ROUTES entries (defense-in-depth + /feed.xml fix) |
| 3 | test | `c08bfbce4` | test(03-01): add routing-aliases.spec.ts covering 5 redirects + RSS 200 |

## Final Shape: next.config.ts redirects()

The `redirects()` block now contains 6 entries (1 pre-existing + 5 new). The pre-existing `/.well-known/change-password` entry is byte-identical to its pre-change state (`permanent: false` → 307 preserved intentionally for password-manager method preservation). The 5 new entries:

```typescript
// CRIT-05
{ source: '/signup',           destination: '/pricing',  permanent: true }, // 308
// CRIT-06
{ source: '/terms-of-service', destination: '/terms',    permanent: true }, // 308
{ source: '/privacy-policy',   destination: '/privacy',  permanent: true }, // 308
{ source: '/help-center',      destination: '/help',     permanent: true }, // 308
{ source: '/rss-feed',         destination: '/feed.xml', permanent: true }, // 308
```

Verification: `grep -c "permanent: true" next.config.ts` → 5; `grep -c "source: '/" next.config.ts` → 6.

## Final Shape: src/proxy.ts PUBLIC_ROUTES

Grew from 21 to 27 entries. New entries inserted alphabetically near related existing entries:

| New entry | Inserted after | Purpose |
|-----------|----------------|---------|
| `/help-center` | `/help` | Defense-in-depth alias (CRIT-06) |
| `/privacy-policy` | `/privacy` | Defense-in-depth alias (CRIT-06) |
| `/terms-of-service` | `/terms` | Defense-in-depth alias (CRIT-06) |
| `/signup` | `/resources` | Defense-in-depth alias (CRIT-05) |
| `/feed.xml` | `/search` | Latent bug fix — anon RSS readers (was 307→/login) |
| `/rss-feed` | `/feed.xml` | Defense-in-depth alias (CRIT-06) |

`isPublicRoute()` body and `config.matcher` are byte-identical to pre-change state (no logic changes; only the array literal grew).

## Final Shape: tests/e2e/tests/public/routing-aliases.spec.ts

New file (64 lines, single `test.describe`). 6 tests, all using `page.request.get(path, { maxRedirects: 0 })`:

| # | Path tested | Status assertion | Header assertion |
|---|-------------|------------------|------------------|
| 1 | `/signup` | `[301, 308].toContain(status)` | `location === '/pricing'` |
| 2 | `/terms-of-service` | `[301, 308].toContain(status)` | `location === '/terms'` |
| 3 | `/privacy-policy` | `[301, 308].toContain(status)` | `location === '/privacy'` |
| 4 | `/help-center` | `[301, 308].toContain(status)` | `location === '/help'` |
| 5 | `/rss-feed` | `[301, 308].toContain(status)` | `location === '/feed.xml'` |
| 6 | `/feed.xml` | `status === 200` | `content-type =~ /xml/i` |

`[301, 308]` tolerance is intentional (per 03-RESEARCH.md § 308-vs-301 Decision) so a future maintainer who swaps to `statusCode: 301` doesn't break the test.

Verified via `pnpm exec playwright test --config=tests/e2e/playwright.config.ts tests/e2e/tests/public/routing-aliases.spec.ts --project=public --list` → 6 tests in 1 file.

## Test Results (Local Pre-Merge)

- `pnpm typecheck` → exit 0 (run after each task)
- `pnpm lint` → exit 0 on each modified file
- `pnpm test:unit` → 100,029 / 100,029 passing across 128 files (lefthook pre-commit gate, run on each commit)
- `pnpm exec playwright test ... --list` → exactly 6 tests resolved for the new spec
- gitleaks → no leaks
- lockfile-verify → clean
- commitlint → all 3 commit messages conform to conventional commits

CI `e2e-smoke` job picks up the new spec automatically via `**/public/**/*.spec.ts` testMatch glob.

## Cross-cutting Design-Token Check

Trivially passes — routing config + e2e test only, zero visual changes:

```bash
grep -E "(text-muted[^-]|bg-white|#[0-9a-fA-F]{3,6}|rgb\()" next.config.ts src/proxy.ts tests/e2e/tests/public/routing-aliases.spec.ts
# → no matches (TOKEN_CHECK_PASSED)
```

## Phase 1+2 Lessons Applied

- **Live verification mandate honored** — Task 4 (post-deploy curl probes) is the explicit checkpoint for verifying behavior against prod after Vercel deploy. Local-only test passes are not trusted.
- **No `loading.tsx` returning null** — confirmed; this phase touches zero React components.
- **Hydration race patterns** — N/A; routing happens at the edge before any client JS.
- **Specialist contracts can be wrong** — Task 4 curl verification re-checks the framework-behavior claims (`permanent: true` → 308, `/feed.xml` → 200, etc.) against live Vercel.

## Deviations from Plan

None. Plan executed exactly as written. No Rule 1/2/3 auto-fixes triggered. No Rule 4 architectural decisions encountered.

## Threat Flags

None. The threat surface scan turned up no new network endpoints, auth paths, file access patterns, or schema changes beyond what `<threat_model>` already enumerates. All 5 new redirect entries map source-literal → destination-literal with no user-controlled fields (open-redirect surface = zero by construction). `/feed.xml` exposure to anonymous readers was the explicit intent (T-03-03 mitigated).

## Task 4: Post-Deploy Live Curl Verification (Operator Steps)

Status: **CHECKPOINT REACHED — awaiting human verification post-merge + Vercel deploy.**

After this branch merges to `main` and Vercel completes the production deploy (~3 min), an operator must run these probes against `https://tenantflow.app`:

### Step 1 — CRIT-05 redirect

```bash
curl -sI --max-redirs 0 https://tenantflow.app/signup | grep -i -E '(http|location)'
```

Expected: `HTTP/2 308` + `location: /pricing`.

### Step 2 — CRIT-06 redirects (all four)

```bash
for path in terms-of-service privacy-policy help-center rss-feed; do
    echo "=== /${path} ==="
    curl -sI --max-redirs 0 "https://tenantflow.app/${path}" | grep -i -E '(http|location)'
done
```

Expected:
- `/terms-of-service` → `HTTP/2 308` + `location: /terms`
- `/privacy-policy` → `HTTP/2 308` + `location: /privacy`
- `/help-center` → `HTTP/2 308` + `location: /help`
- `/rss-feed` → `HTTP/2 308` + `location: /feed.xml`

### Step 3 — /feed.xml 200 (bonus latent bug fix)

```bash
curl -sI --max-redirs 0 https://tenantflow.app/feed.xml | grep -i -E '(http|content-type)'
```

Expected: `HTTP/2 200` + `content-type: text/xml` OR `application/xml` OR `application/rss+xml`.

### Step 4 — End-to-end follow-the-chain (each ends in 200)

```bash
for path in signup terms-of-service privacy-policy help-center rss-feed; do
    echo "=== /${path} chain ==="
    curl -sIL "https://tenantflow.app/${path}" | grep -i -E '(http|location)' | tail -4
done
```

Expected: each chain terminates in `HTTP/2 200` (or `308 → 200` for trailing-slash variants).

### Step 5 (optional) — Trailing-slash spot-check

```bash
curl -sIL https://tenantflow.app/terms-of-service/ | grep -i -E '(http|location)'
```

Expected: `308` → `/terms-of-service` → `308` → `/terms` → `200` (3-hop is SEO-acceptable per 03-RESEARCH.md § Common Pitfalls).

### Acceptance

All 5 redirects emit 308 with the correct Location, `/feed.xml` emits 200 with XML content-type, and every chain terminates in 200. Any deviation = revert and investigate.

**Resume signal:** Operator types "approved" if all probes pass; "issue: \<description\>" if any probe fails.

## Self-Check: PASSED

**Files exist:**
- `/Users/richard/Developer/tenant-flow/next.config.ts` — FOUND (modified)
- `/Users/richard/Developer/tenant-flow/src/proxy.ts` — FOUND (modified)
- `/Users/richard/Developer/tenant-flow/tests/e2e/tests/public/routing-aliases.spec.ts` — FOUND (created)

**Commits exist:**
- `99cb78d18` — FOUND (Task 1)
- `1f47ed98d` — FOUND (Task 2)
- `c08bfbce4` — FOUND (Task 3)

All artifacts verified.
