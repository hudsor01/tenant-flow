---
phase: 02-frontend-correctness-numberticker-mobile
reviewed: 2026-05-09T20:00:00Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - src/components/ui/number-ticker.tsx
  - src/components/ui/__tests__/number-ticker.test.tsx
  - src/app/marketing-home.tsx
  - src/components/layout/navbar.tsx
  - src/components/layout/navbar/navbar-mobile-menu.tsx
  - src/components/ui/sheet.tsx
  - tests/e2e/tests/public/mobile-nav-375px.spec.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 2: Code Review Report — Cycle 2

**Reviewed:** 2026-05-09T20:00:00Z
**Depth:** deep
**Files Reviewed:** 7
**Status:** clean

## Summary

Cycle 2 re-review of PR #686 after the cycle-1 WR-01 fix (commit `9f3ba21`).

### WR-01 Closure — Verified

Test 6 (`'does not re-trigger animation after first IntersectionObserver entry (one-shot guard)'`) is present at line 75 of `number-ticker.test.tsx`. The test:

1. Replaces `window.IntersectionObserver` with a `CapturingObserver` class that forwards to the inner mock and captures the callback reference (direct assignment is correct because `unit-setup.ts` sets the property `writable: true` but not `configurable: true`, making `vi.spyOn` / `vi.stubGlobal` inappropriate).
2. Renders `<NumberTicker value={5} duration={2000} />` and advances fake timers 2100 ms to drive the rAF chain to completion. Asserts `'5'` is present.
3. Manually fires the captured callback with `isIntersecting: false` then `isIntersecting: true` to simulate scroll-out then scroll-back-in.
4. Asserts `queryByText('0')` is absent and `getByText('5')` is present — confirming no reset to `startValue` and no re-animation.

The guard mechanism (`hasIntersectedRef.current` in `use-intersection-observer.ts`) is exercised correctly: the second `isIntersecting: true` entry hits the `if (isCurrentlyIntersecting && !hasIntersectedRef.current)` guard which is already `true`, so `setHasIntersected` is never called again, effect deps in `number-ticker.tsx` are unchanged, and no re-animation fires.

The test is logically sound and uses fake timers consistently with the other 5 tests.

### Re-verification of Cycle-1 Dimensions

**NumberTicker implementation (`number-ticker.tsx`):** Unchanged from cycle 1. `hasIntersected` one-shot guard, `timestamp`-based easing, `cancelled` flag + `cancelAnimationFrame` + `clearTimeout` cleanup, stable deps array `[hasIntersected, from, to, delay, duration]` — all correct.

**Marketing home (`marketing-home.tsx`):** `text-3xl` base + `text-balance` on h1, `flex-col sm:flex-row w-full sm:w-auto` CTA wrapper, both buttons `w-full sm:w-auto`. No overflow issues with other text strings at 375px — subheading has `max-w-lg` and wraps normally; the sub-copy line "Built for property owners. 14-day free trial, no credit card." is short enough at `text-sm` to wrap within any mobile viewport.

**Navbar (`navbar.tsx`):** Mobile toggle `md:hidden inline-flex items-center justify-center min-h-11 min-w-11` correctly scopes the 44x44 touch target to mobile breakpoints only; at `md` and above the element is hidden and contributes no layout space. Dynamic `aria-label` toggles correctly between "Open navigation menu" and "Close navigation menu".

**Navbar mobile menu (`navbar-mobile-menu.tsx`):** No ad-hoc width override; inherits shadcn `w-3/4 sm:max-w-sm`. `SheetTitle` ("Menu") present for Radix Dialog `aria-labelledby` wiring. Icon-only `ChevronDown` inside an `onClick` handler rather than as an independent button — acceptable here because the `<Link>` is the primary interactive element and the chevron prevents the link from navigating via `e.preventDefault()`.

**Sheet (`sheet.tsx`):** PR changes are limited to the close button: `aria-label="Close"` + `inline-flex items-center justify-center min-h-11 min-w-11` + sr-only text upgraded from "Close" to "Close dialog". The `aria-label="Close"` provides the accessible name; the `sr-only` span's text ("Close dialog") is overridden by `aria-label` for accessible name computation — no double-announcement. Pre-existing `bg-black/50` overlay and `data-[state=closed]:duration-300` / `data-[state=open]:duration-500` animation classes are shadcn defaults unchanged by this PR; `--duration-300` and `--duration-500` are registered design tokens in `globals.css` (lines 237–238).

**E2E spec (`mobile-nav-375px.spec.ts`):** 8 tests, viewport correctly overridden at describe level to 375×667. Placed in `tests/e2e/tests/public/` which is matched by the `public` Playwright project (`testMatch: ['**/public/**/*.spec.ts']`). CI workflow (`ci-cd.yml` line 166) runs `--project=public` on every PR — spec is covered. No `waitForTimeout` calls. Outside-click at coordinate `(10, 100)` is safe geometry (drawer is `w-3/4` ≈ 281px, left edge at ≈ 94px, so `x:10` lands on the `SheetOverlay`). Escape key test asserts `mobile-nav-toggle` is focused after close — valid because Radix Dialog in controlled mode restores focus to the last-focused element before open, which is the toggle button (click focuses it in Chrome). Role selectors (`link`, `button`, `dialog`) match actual ARIA roles rendered by the components.

### Adversarial Fresh-Eyes Sweep

**Value-prop change re-animation:** If the `value` prop changes after first animation completes, the effect re-fires (because `to` is in deps) and re-animates from `startValue` (0) to the new `to`. This is deliberate and correct behavior for a prop change. The production usage in `stats-showcase.tsx` passes static values from a fixed array — no re-render will change `value`, so this path is never triggered. Not a bug in the current codebase.

**Other overflow candidates at 375px:** No other strings in `marketing-home.tsx` risk horizontal overflow — the subheading is wrapped with `max-w-lg` and `leading-relaxed`, button labels are short ("Start Managing Properties" / "View Pricing") and each button is `w-full` on mobile, and the sub-copy line is `text-sm`. All safe.

**`min-h-11 min-w-11` on desktop:** The mobile toggle button carries `md:hidden` as the first utility, so the element is `display: none` at `md` and above. The size classes apply only when the element is rendered (mobile). No phantom space at desktop breakpoints.

**`aria-label` + `sr-only` double-announcement:** Confirmed non-issue. `aria-label` takes precedence over element text content for the accessible name computation per ARIA spec. Screen readers announce "Close" (from `aria-label`), not "Close dialog" (from the `sr-only` span). No double-announcement.

**Slow Vercel preview / E2E flakiness:** The spec uses `page.goto('/', { waitUntil: 'load' })` in `beforeEach`. No `waitForTimeout` calls anywhere. Assertions use `await expect(...).toBeVisible()` which retries up to the configured `expect.timeout: 5000`. `maxFailures: 1` and `retries: 2` in CI provide resilience against transient timeouts. No flakiness risk from the test structure itself.

### Design Token Cross-Check

Zero violations across all 7 files:
- No hex/rgb/named color values
- No `bg-white` or `text-white` in changed code
- No inline `[NNNms]` duration values
- Animation token `duration-fast` used consistently in navbar and mobile-menu
- Sheet `bg-black/50` overlay is pre-existing shadcn default, unchanged by this PR

### CLAUDE.md Zero-Tolerance Compliance

- No `any` types in any production file
- No barrel file imports
- No `@radix-ui/react-icons` usage (`lucide-react` only: `Menu`, `X`, `ArrowRight`, `ChevronDown`, `XIcon`)
- No `as unknown as` in production code (test file usage at line 104 is mock setup, not an RPC/PostgREST boundary — rule 8 is scoped to those boundaries)
- No commented-out code (JSX comments are structural, not dead code)
- No emojis
- Icon-only buttons have `aria-label` throughout

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-05-09T20:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
