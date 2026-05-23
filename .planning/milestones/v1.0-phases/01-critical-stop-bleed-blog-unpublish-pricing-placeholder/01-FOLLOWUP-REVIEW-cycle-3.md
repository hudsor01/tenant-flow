---
phase: 01-critical-stop-bleed-blog-unpublish-pricing-placeholder
reviewed: 2026-05-08T00:00:00Z
depth: deep
files_reviewed: 1
files_reviewed_list:
  - src/app/blog/[slug]/page.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 1 Follow-up: Code Review Report (Cycle 3)

**Reviewed:** 2026-05-08
**Depth:** deep
**Files Reviewed:** 1 (`src/app/blog/[slug]/page.tsx`)
**Branch:** `gsd/phase-1-followup-soft-404` (no commits since cycle 2 — `8204d639c`)
**Status:** clean

---

## Summary

Fresh-eyes adversarial pass over the post-fix code. All eight cycle-3 adversarial dimensions cleared. The `try/catch/finally` structure introduced in `8204d639c` is correct across all error shapes: PGRST116 genuine-miss (null → notFound → HTTP 404), other Supabase error (log + throw → HTTP 500), timeout rejection (log + rethrow → HTTP 500), and raw network errors (silent rethrow → HTTP 500). The last case has no log entry, but: (a) the user-facing behavior is correct — 500 not 404, (b) it is strictly better than the pre-fix `.catch(() => null)` which swallowed the error entirely, and (c) it is an observability gap, not a correctness or security issue — out of v1 scope. No finding raised.

All reviewed files meet quality standards. No issues found.

---

## Adversarial Dimension Verification

### 1. Concurrent requests during failure — PASS

`cache(getBlogPost)` is React's request-scoped deduplication cache. It does not share state across concurrent incoming requests — each request gets its own scope. A DB timeout burst does not cascade between requests. Next.js error boundary handles per-request failures independently. No amplification risk.

### 2. Supabase error shape completeness — PASS

The Supabase JS client resolves all PostgREST responses as `{ data, error }` where `error: PostgrestError | null`. `PostgrestError` always has `.code`. If `error` is somehow a generic `Error` (would require a non-Supabase injection into the chain, which cannot happen here), `error.code` would be `undefined`, not `'PGRST116'`, and the code falls through to logger + throw — a correct, safe fallback. All reachable error shapes are handled.

### 3. Throw + Next.js error boundary contract — PASS

Throws from async server components propagate to the nearest `error.tsx` boundary. Confirmed in cycle-1: `src/app/blog/error.tsx` exists as a `'use client'` boundary using `<ErrorPage>`. Next.js emits HTTP 500 when an error boundary is triggered. The `generateMetadata` function calls `notFound()` (not throw) for the null/PGRST116 case, which emits HTTP 404 before any streaming begins — correct under `force-dynamic`. No blank-screen risk.

### 4. Double-logging audit — PASS

Path B (Supabase error): logs at lines 54-58 (before throw). The rethrown `new Error('Blog post query failed')` enters the catch at line 62. The `instanceof Error && err.message === 'Blog post query timed out'` check at line 64 is FALSE — the if-body is skipped. Bare `throw err` at line 71. One log per Path B error.

Path C (timeout): `timeout` rejects with `new Error('Blog post query timed out')`. Catch at line 62 fires. Check at line 64 is TRUE → logs at lines 65-69 → rethrows. One log per Path C error.

No path produces two log entries for the same request.

### 5. TypeScript `Promise.race` inference — PASS

`query` resolves to `PostgrestSingleResponse<T>`. `timeout` is typed `Promise<never>` — it can only reject, never resolve to a value. `Promise.race` of a union with `never` resolves to `PostgrestSingleResponse<T>`. The destructure `const { data, error } = await Promise.race([query, timeout])` is sound. After the `if (error)` guard, TypeScript narrows `data` to the non-null row type per the Supabase discriminated union. `err` in the catch is typed `unknown` (strict mode); `.message` is accessed only after `instanceof Error` narrows it. No unsafe casts, no `any`.

### 6. Network partition (unlogged rethrow) — ASSESSED, NO FINDING

If the Supabase host is unreachable, the underlying `fetch` throws (typically a `TypeError: fetch failed`) rather than resolving with `{ error }`. This means `await Promise.race([query, timeout])` itself rejects before the destructure. The catch at line 62 fires. `err instanceof Error` is true. `err.message === 'Blog post query timed out'` is false (fetch error message is not that string). The if-body is skipped. Bare `throw err` at line 71 rethrows — no log entry is written for this case.

Assessment: this is an observability gap, not a correctness or security issue. User-facing behavior is correct (500, not a misleading 404). The error propagates correctly to Next.js error boundary. This is strictly better than the pre-fix `.catch(() => null)` which silently returned null and caused a misleading `notFound()` on DB unreachability. Per review scope, observability gaps are out of v1 scope. No finding raised.

### 7. Comment accuracy post-Phase-6 — PASS

The comment at lines 20-22 ("Phase 6 (BLOG-02 server-rendered rebuild) restores ISR with `generateStaticParams`...") was noted as slightly outdated in cycle-2 but acceptable for v1 — the description of end-state behavior is technically accurate. No change warranted.

### 8. HTTP 404 contract delivery — PASS

The full "real HTTP 404" contract is satisfied:
- PGRST116 → `return null` → caller calls `notFound()` → Next.js emits HTTP 404. `force-dynamic` ensures this fires on every request, not just cache misses.
- Other DB errors → throw → HTTP 500. Correct signal for infrastructure problems.
- `generateMetadata` calls `notFound()` (line 82) before any HTML is streamed — status header set to 404 before first byte. No soft-404 possible.

### 9. Security scan — PASS

`slug` from route params is interpolated into PostgREST filter via `.eq('slug', slug)` — Supabase JS parameterizes all filter values, no SQL injection surface. The slug is also written to log strings (`route: \`/blog/${slug}\``) — log output, not executed, no injection surface. No user-controlled value reaches HTML output or eval in this file.

### 10. CLAUDE.md compliance — PASS

- No `any` types: `err` is `unknown`, narrowed via `instanceof Error` before `.message` access.
- No barrel file imports.
- No `as unknown as` type assertions.
- No `auth-helpers-nextjs`, no `get`/`set`/`remove` cookie patterns.
- Path aliases (`#lib/*`, `#components/*`) used correctly per `tsconfig.json` and `package.json#imports`.
- No commented-out code (the block comment is explanatory prose, not disabled code).
- No emojis.
- No inline styles.

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
