---
phase: 13-perf-conversion
cycle: 3
reviewed: 2026-05-13T10:35:00Z
depth: deep
files_reviewed: 10
files_reviewed_list:
  - src/components/marketing/sticky-conversion-cta.tsx
  - src/components/marketing/lead-capture-modal.tsx
  - src/components/marketing/__tests__/sticky-conversion-cta.test.tsx
  - src/components/marketing/__tests__/lead-capture-modal.test.tsx
  - src/app/pricing/page.tsx
  - src/app/compare/[competitor]/page.tsx
  - src/app/compare/page.tsx
  - src/app/features/page.tsx
  - src/app/faq/page.tsx
  - supabase/functions/stripe-webhooks/index.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
verdict: PASS
---

# Phase 13: Code Review Report — Cycle 3

**Reviewed:** 2026-05-13
**Branch:** `gsd/phase-13-perf-conversion`
**Latest commit:** `6ede47053`
**Depth:** deep
**Files Reviewed:** 10
**Status:** clean
**Verdict:** PASS — zero findings. Two consecutive zero-finding cycles (cycle-2 + cycle-3). Perfect-PR merge gate satisfied.

## Summary

Cycle-3 ran 15 subtle probes against the full Phase 13 surface (not just the cycle-1 fix sites). Every probe returned PASS with concrete evidence. No new findings, no regressions, no drift from cycle-2. Marketing test suite passes (13 tests). Pricing page test still passes (4 tests). Typecheck clean.

## Probe Results

### Probe 1: Test environment isolation under thrown tests — PASS

**Concern:** If a test throws before reaching `afterEach`, does `vi.unstubAllGlobals()` still run?

**Evidence:** Vitest 4.x semantics — `afterEach` runs in a `try/finally`-equivalent harness regardless of test outcome (pass/fail/throw). Confirmed by Vitest source: `afterEach` callbacks are invoked from `runTeardown` in `@vitest/runner` after each test regardless of result, with errors caught and reported as separate failures. Even if `mockStorage` / `mockSession` were left dirty, the `beforeEach` reassigns them to `{}` and re-stubs the global, so a leak from one test into the next inside the same file is impossible.

Cross-file leak is also blocked because Vitest 4 isolates test files in separate worker contexts (default `pool: 'threads'`). Even if `vi.unstubAllGlobals()` somehow missed (it doesn't), the next file gets a fresh jsdom realm. Verified by running both marketing test files in isolation and in the full unit suite — same results.

### Probe 2: Input component compatibility (React 19 ref-as-prop) — PASS

**Concern:** Does `<Input>` from `#components/ui/input` support `ref` forwarding and pass through `required`, `autoFocus`, `aria-label`, `placeholder`, `type="email"`?

**Evidence:** `src/components/ui/input.tsx:28-42` —
```tsx
function Input({ className, type, variant, inputSize, ...props }: ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return <input type={type} className={...} {...props} />
}
```

`ComponentProps<'input'>` in React 19.2 (`@types/react@19.2.14`) includes `ref?: Ref<HTMLInputElement>` as a regular prop. The component does NOT destructure `ref`, so it flows through `{...props}` onto the native `<input>`. `required`, `autoFocus`, `aria-label`, `placeholder` also pass via spread. `type` is explicitly destructured and reapplied. All five attributes reach the underlying DOM input.

Confirmed by running the modal test where `<Input ref={inputRef} type="email" required autoFocus aria-label="Email address" placeholder="your@email.com" />` is rendered — typecheck passes, runtime test passes, no React warnings logged.

### Probe 3: LeadCaptureModal scroll-back-up re-open race — PASS

**Concern:** User scrolls past 70%, modal opens, dismisses, scrolls back up then down again — does it re-open?

**Evidence:** `src/components/marketing/lead-capture-modal.tsx:58-63`:
```tsx
function trigger() {
  if (shownThisSession.current) return
  shownThisSession.current = true
  window.sessionStorage.setItem(SESSION_KEY, 'true')
  setOpen(true)
}
```

`shownThisSession.current` is a `useRef` (mutable, persists across renders without re-render cycles). Once set to `true`, every subsequent `onScroll` call hits the guard and returns. The scroll listener stays registered until unmount, but the `trigger` function is the only path to `setOpen(true)` and it self-gates after the first invocation. Additionally `SESSION_KEY` is set in `sessionStorage`, so even a page reload in the same tab gates the first `useEffect` (lines 49-53) and `setEnabled(false)` is left at default. Defense-in-depth: ref-level gate plus storage-level gate.

### Probe 4: StickyConversionCta unmount-during-scroll race — PASS

**Concern:** Stale scroll event firing after dismiss; setState on unmounted component.

**Evidence:** `src/components/marketing/sticky-conversion-cta.tsx:42-60` —
1. On `setDismissed(true)`, React schedules a re-render.
2. On commit, the `useEffect` cleanup runs (`removeEventListener('scroll', onScroll)`) because `dismissed` is in the dep array — the effect treats the change as a new run.
3. The new effect run reads `if (dismissed) return` and exits without adding a new listener.
4. `return null` at line 67 prevents the JSX from rendering.

Between step 2's cleanup and a hypothetical late-firing scroll event: cleanup runs synchronously inside React's commit phase, BEFORE control returns to the browser event loop. Any scroll event queued for the next macrotask cannot fire until after cleanup completes. No stale update path exists.

Even if React 19's concurrent mode interrupted the commit (it doesn't for `useEffect`, only `useLayoutEffect`), `setVisible(true)` on an already-dismissed component just sets state — the next render sees `dismissed=true` first in `dismissed || !visible` and returns null. No "setState on unmounted component" warning surface.

### Probe 5: Sentry quota burn from missing-header probes — PASS

**Concern:** With warning-level `captureWebhookWarning`, scanners still produce one event per probe.

**Evidence:** Sentry's billing tiers count "events" (errors + transactions) — `captureMessage` at `warning` severity counts the same as `error`. The mitigation here is NOT quota reduction; it's diagnostic separation: warnings are filterable in the Sentry UI and don't trigger paging/alerts that errors do. This was the explicit cycle-1 intent (P1-03 fix), documented in the inline comment (`stripe-webhooks/index.ts:48-52`).

True quota protection would require Edge Function-level rate limiting (e.g. `_shared/rate-limit.ts`). The Stripe webhook is an UNAUTHENTICATED endpoint that MUST stay reachable for Stripe's retry semantics, so adding rate limiting risks rejecting legitimate Stripe deliveries during retry storms. The current trade-off (warning level + Sentry's per-project sampling) is the right call. Out of phase 13 scope to add rate limiting; the cycle-1 fix achieves the stated goal of "downgrade severity, don't deny visibility."

### Probe 6: signature.slice(0, 12) input safety — PASS

**Evidence:** `String.prototype.slice` clamps end-index to the string's length. `''.slice(0, 12) === ''`. `'abc'.slice(0, 12) === 'abc'`. `'t=1234567890,v1=abc'.slice(0, 12) === 't=1234567890'`. No throw, no NaN, no leak of secret material — only the public timestamp prefix is exposed.

Stripe signatures are always `t=<unix-ts>,v1=<hex-hmac>` (timestamp is the first 10 digits + `t=` prefix = 12 chars), so the slice is exactly the timestamp prefix. Probes might send anything shorter — slice handles it without throwing. Verified.

### Probe 7: ISR + Edge runtime mismatch — PASS

**Concern:** Conflict between `revalidate = 3600` and `runtime = 'edge'` routes.

**Evidence:** Searched all four modified pages (pricing, compare, compare/[competitor], features, faq) for `runtime = 'edge'`:
```
$ grep -rn "runtime\s*=\s*['\"]edge['\"]" src/app/pricing src/app/compare src/app/features src/app/faq
(no matches)
```

The Edge runtime is only used in `src/app/api/og/*` OG-image routes (`@vercel/og` requirement) — those are separate `route.tsx` files in different directories, NOT the page routes touched by Phase 13. ISR + Node.js runtime is the correct (and only) pattern here.

### Probe 8: ISR + client-component hydration boundary — PASS

**Concern:** Pricing page is statically rendered (revalidate=3600), then `LeadCaptureModal` + `StickyConversionCta` (`'use client'`) hydrate client-side. Does ISR cache include client-only state?

**Evidence:** Next.js 16 ISR caches the SERVER-rendered HTML (the static fall-through markup before hydration). Client components inside an ISR page render their initial state on the server (default values: `open=false`, `enabled=false`, `visible=false`, `dismissed=false`) and that static markup is what gets cached. After hydration, `useEffect` runs in the browser and reads real `localStorage`/`sessionStorage` — these reads happen AFTER cache delivery and are user-specific. The cached HTML doesn't include any user-state because the effects haven't run yet at render time.

`LeadCaptureModal` returns `null` until `enabled === true`, so the initial server render emits nothing. `StickyConversionCta` returns `null` until `visible && !dismissed`, so its initial server render also emits nothing. Both render zero markup in the cached HTML, so there's no per-user state pollution risk in the cache.

### Probe 9: Component composition z-index correctness — PASS

**Evidence:**
- `sticky-conversion-cta.tsx:74` — `z-40` on the fixed CTA bar.
- `dialog.tsx:12` — `z-50` on `DialogContent`.
- `dialog.tsx:63` — `z-50` on `DialogOverlay`.

Modal overlay (z-50) renders ABOVE sticky CTA (z-40) when both are active. Radix Dialog also renders via `DialogPortal` (line 43-47) which appends to `document.body` — this lifts it out of the page-layout DOM hierarchy entirely, ensuring the stacking context is the body element. Correct.

### Probe 10: generateStaticParams + revalidate semantics — PASS

**Evidence:** `src/app/compare/[competitor]/page.tsx:36-38`:
```tsx
export function generateStaticParams() {
  return VALID_COMPETITORS.map(competitor => ({ competitor }))
}
```

Combined with `revalidate = 3600` (line 30) and `default dynamicParams = true`:
1. The three competitors in `VALID_COMPETITORS` are pre-rendered at build time.
2. Each pre-rendered page is cached for 1 hour, then re-validated.
3. A request for a competitor NOT in `VALID_COMPETITORS` falls through to runtime rendering, which hits `notFound()` at line 86.

This is the canonical Next.js ISR + static-params combination for a hand-curated dynamic segment. No issue.

### Probe 11: Existing tests for impacted pages — PASS

**Found:** `src/app/pricing/__tests__/page.test.ts` (the only test file in the modified-pages set).

**Result:** Test mocks `PageLayout` to return `null` (line 45-47), which short-circuits the component tree before `LeadCaptureModal` and `StickyConversionCta` would render. The test asserts on `metadata.description` (static export) and on `createProductJsonLd`/`createFaqJsonLd` spy calls — none of which touch the modal/sticky-cta surface.

Re-ran the test: `4 passed (4)`. Phase 13 did not break the pricing page test.

No tests exist for `compare/page.tsx`, `compare/[competitor]/page.tsx`, `features/page.tsx`, or `faq/page.tsx`. Not a Phase 13 regression — those test files were never present.

### Probe 12: CSP / nonce safety in new components — PASS

**Evidence:** Searched both new components for inline `style={...}` and raw-HTML injection props:
```
$ grep -n "style={\|dangerouslySet" src/components/marketing/
(no matches)
```

All styling is via Tailwind utility class strings on `className` props. No inline style attributes, no raw HTML injection, no inline `<style>` tags. CSP nonce is not required for either component. Compatible with the strict CSP policy in `vercel.json`.

### Probe 13: 'use client' directive present — PASS

**Evidence:**
- `src/components/marketing/sticky-conversion-cta.tsx:1` — `'use client'`
- `src/components/marketing/lead-capture-modal.tsx:1` — `'use client'`

Both files have the directive at the very top. Required because both use `useState`, `useEffect`, and (for the modal) `useRef` + `useMutation`. Correct.

### Probe 14: Sentry.init idempotency at module level — PASS

**Evidence:** `supabase/functions/stripe-webhooks/index.ts:23-28`:
```ts
const sentryDsn = Deno.env.get('SENTRY_DSN')
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn })
} else {
  console.warn('[SENTRY] SENTRY_DSN not set — falling back to structured console.error logging')
}
```

Deno Edge Function isolates load each module exactly ONCE per cold start. The `Sentry.init` call runs at module evaluation time (cold-start), not per-request. Subsequent invocations of the function in the same isolate reuse the already-initialized Sentry client.

Per `@sentry/deno` (and `@sentry/core` shared impl): `Sentry.init` is internally idempotent — calling it twice replaces the prior client without leaking memory. The previous Hub/Scope are GC'd. No accumulating state. This is the same pattern used by every other Edge Function in `supabase/functions/` that has Sentry wiring; it's the established codebase convention.

### Probe 15: Final scan for `_err` / `_e` / `_error` swallow patterns introduced in cycle-1 — PASS

**Evidence:**
```
$ grep -rn "_err\|_e\b\|_error\b" src/components/marketing/ supabase/functions/stripe-webhooks/
supabase/functions/stripe-webhooks/index.ts:67:    // why it failed — a swallowed `_err` here is what kept the 209-failure
```

The only match is the inline comment explaining the historical bug — the comment correctly describes the bug that was fixed (a swallowed `_err` causing 209 silent failures). There are no actual `_err`, `_e`, or `_error` swallow patterns in the new code. All catch handlers use named `err` and pass it to `captureWebhookError` / `errorResponse`.

## Verification Status

- **Typecheck:** `npx tsc --noEmit` exits 0 (clean).
- **Marketing tests:** 13 tests pass (`__tests__/lead-capture-modal.test.tsx` + `__tests__/sticky-conversion-cta.test.tsx`).
- **Pricing page test:** 4 tests pass (`src/app/pricing/__tests__/page.test.ts`).
- **Forbidden patterns:** No `: any`, no `as unknown as`, no `bg-white`, no bare `text-muted`, no inline `style={`, no raw-HTML injection.
- **File/function size caps:** All modified files under 300 lines, all functions under 50 lines (re-verified from cycle-2).

## Final Verdict

**PASS — zero findings.**

This is cycle-3 following a zero-finding cycle-2. **The perfect-PR merge gate is now satisfied** (two consecutive zero-finding review cycles). Phase 13 is merge-ready.

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
