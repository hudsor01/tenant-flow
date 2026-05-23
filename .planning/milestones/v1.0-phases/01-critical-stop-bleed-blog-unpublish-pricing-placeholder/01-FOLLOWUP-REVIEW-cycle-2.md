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

# Phase 1 Follow-up: Code Review Report (Cycle 2)

**Reviewed:** 2026-05-08
**Depth:** deep
**Files Reviewed:** 1 (`src/app/blog/[slug]/page.tsx`)
**Branch:** `gsd/phase-1-followup-soft-404` (fix commit `8204d639c`)
**Status:** clean

---

## Summary

Cycle-2 adversarial sweep of the WR-01 fix. The `.then().catch(() => null)` chain has been replaced with a `try/catch/finally` block that correctly separates three distinct exit paths: PGRST116 genuine-miss (returns null → notFound), other Supabase error (logs + throws → 500 boundary), and timeout rejection (logs + rethrows → 500 boundary). All adversarial dimensions from the cycle-2 mission check out. No new issues found.

The `force-dynamic` export at line 23 is undisturbed. IN-01 is closed by author rebuttal: "100" reflects the live prod count confirmed during pre-flight; the cycle-1 reviewer's "~70" estimate was based on planning artifacts, not the actual DB row count.

---

## Adversarial Dimension Verification

### 1. Promise.race + timeout timer cleanup — PASS

Timer is assigned at line 38 (`timer = setTimeout(..., 5000)`). The `finally` block at lines 72-74 unconditionally calls `clearTimeout(timer)` if `timer` is defined. This block fires on all three exit paths:

- Normal return (line 61): finally clears the pending timer before returning `data`.
- PGRST116 return (line 53): finally clears before returning `null`.
- Supabase error throw (line 59): caught at line 62, rethrown at line 71, finally clears before the error propagates.
- Timeout rejection: caught at line 62, logged, rethrown at line 71, finally calls `clearTimeout` on the already-fired timer — `clearTimeout` on an elapsed timer is a safe no-op per WHATWG spec.

No timer leak possible on any code path.

### 2. TypeScript narrowing on Promise.race result — PASS

`query` resolves to `PostgrestSingleResponse<T>` (a Supabase-typed PromiseLike). `timeout` is typed `Promise<never>` — it can only reject, never resolve to a value. `Promise.race([query, timeout])` therefore resolves to `PostgrestSingleResponse<T>` or rejects. The destructure `const { data, error } = await Promise.race([query, timeout])` is well-typed. After the `if (error)` guard at line 49 exits (error is null), TypeScript narrows `data` to the non-null row type per Supabase's discriminated union contract. `return data` at line 61 is sound.

In the catch block, `err` is typed `unknown` (strict mode default). The `instanceof Error` guard at line 64 narrows it to `Error` before `.message` is accessed. No unsafe casts, no `any`.

### 3. Three-path error handling correctness — PASS

All three paths are verified:

**Path A — PGRST116 (genuine miss):** `error.code === 'PGRST116'` at line 53 returns `null`. Callers (`generateMetadata` line 81, `Page` line 125) call `notFound()` on null. Real HTTP 404 emitted. Correct.

**Path B — Other Supabase error:** Falls through the PGRST116 guard, logs `error.message` + `error.code` at lines 54-58 (with structured metadata — no info loss), then throws `new Error('Blog post query failed')` at line 59. This throw is caught by the catch at line 62. The `instanceof Error && err.message === 'Blog post query timed out'` check at line 64 is false for `'Blog post query failed'`, so the if-body is skipped and the error rethrows at line 71. Finally clears the timer. Next.js error boundary catches it as a 500. The thrown error omits the original DB error message — this is intentional: the detail is already in the log; the thrown message is potentially user-visible via error boundaries, so generic wording prevents internal DB info leakage. Correct.

**Path C — Timeout:** `timeout` rejects with `new Error('Blog post query timed out')`. `Promise.race` rejects. Catch at line 62 fires. `instanceof Error && err.message === 'Blog post query timed out'` is true → logs with `route` context at lines 65-69 → rethrows at line 71. Finally clears the already-fired timer (safe). Next.js error boundary gets 500. Correct.

There is no path that reaches `return data` with `data === null && error === null` (theoretically impossible per Supabase contract; if it happened, null would flow to `notFound()` — acceptable fallback).

### 4. Double-logging audit — PASS

Path B logs at lines 54-58 (before throw), then the catch at line 62 does NOT log again (if-check is false, falls to bare rethrow). One log per error. Path C logs at lines 65-69 only. No double-logging on any path.

### 5. Catch-block condition completeness — PASS

The condition `err instanceof Error && err.message === 'Blog post query timed out'` is specific to the timeout. Any other Error (including the Path B rethrow) falls to bare `throw err` at line 71. Any non-Error throw (e.g. a string thrown by an unexpected code path) also falls to bare `throw err` — rethrown correctly without attempting `.message` access on a non-Error. Correct for all cases.

### 6. `metadata: {}` in timeout log (line 68) — ACCEPTABLE

The logger call already includes `action: 'getBlogPost'` and `route: \`/blog/${slug}\`` as positional context. The empty `metadata: {}` does not include the timeout duration (5000ms), which would add observability value but is not a correctness issue. The timeout duration is a compile-time constant visible in the source (line 38), so omitting it from the log is a minor observability gap, not a bug. Out of v1 review scope (performance/observability, not correctness or security). No finding raised.

### 7. `force-dynamic` export — UNDISTURBED

Line 23: `export const dynamic = 'force-dynamic'` — present and unchanged from cycle-1 fix. The explanatory comment block at lines 11-22 is accurate and unchanged.

### 8. IN-01 (comment says "100" vs "~70") — CLOSED BY REBUTTAL

Author confirmed "100" reflects the actual DB row count from pre-flight, not the planning artifact estimate of "~70". Line 14 reads "100 broken blog rows" — this is accurate per the live data. No change required.

### 9. Slug injection risk — PASS

`slug` is interpolated into the PostgREST query via `.eq('slug', slug)` (line 43). The Supabase JS client parameterizes all filter values before sending to PostgREST — no SQL injection possible. The slug is also interpolated into the logger route string at lines 56/66 and into the metadata/canonical URL strings, all of which are log output, not DB queries. No injection surface.

### 10. RLS-block behavior — PASS

If RLS blocked the query, PostgREST would return an error with code `42501` (insufficient privilege). That is not `PGRST116`, so Path B fires: logs + throws → 500. This is correct: an RLS block on a public blog post would indicate a misconfiguration, and a 500 (rather than a misleading 404) is the appropriate signal.

### 11. CLAUDE.md compliance — PASS

- No `any` types: `err` is `unknown` in catch; narrowed via `instanceof Error` before access.
- No barrel file imports.
- No inline styles, no `bg-white`, no hex/rgb literals.
- No commented-out code (the block comment is explanatory).
- No emoji.
- No deprecated `auth-helpers-nextjs`, no `get`/`set`/`remove` cookie patterns.
- Path aliases (`#lib/*`, `#components/*`) used correctly.

---

## Note on Pre-existing Patterns (Not New Issues)

Lines 127 and 131 use optional chaining (`post?.content`, `post?.category`) after `notFound()` has already narrowed `post` to non-null at line 125. This is redundant but harmless — TypeScript accepts it and it has no runtime effect. This is pre-existing code not touched by either fix commit and is out of scope for this cycle.

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
