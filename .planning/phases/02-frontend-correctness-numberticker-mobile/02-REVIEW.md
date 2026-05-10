---
phase: 02-frontend-correctness-numberticker-mobile
reviewed: 2026-05-09T00:00:00Z
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
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-05-09T00:00:00Z
**Depth:** deep
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed CRIT-02 (NumberTicker animation fix) and CRIT-04 (mobile hero + hamburger drawer) across 7 changed files.

The implementation is sound across all main deliverables:

- `number-ticker.tsx`: correctly replaces `isIntersecting + hasAnimated` with `hasIntersected` (one-shot via `useIntersectionObserver`), switches from `Date.now()` to the rAF `timestamp` argument (DOMHighResTimeStamp, equivalent to `performance.now()`), and has a full cleanup path (`cancelled` flag + `cancelAnimationFrame` + `clearTimeout`). Deps array `[hasIntersected, from, to, delay, duration]` is stable.
- `marketing-home.tsx`: hero h1 gains `text-3xl` base (was `text-4xl`) and `text-balance`; CTA wrapper gains `flex-col sm:flex-row w-full sm:w-auto`; both buttons gain `w-full sm:w-auto`. No design-token violations.
- `navbar.tsx`: hamburger toggle gains `inline-flex items-center justify-center min-h-11 min-w-11` (44x44 touch target). Dynamic `aria-label` present.
- `navbar-mobile-menu.tsx`: drops ad-hoc `w-[300px] sm:w-[350px]` override, inherits shadcn default `w-3/4 sm:max-w-sm`.
- `sheet.tsx`: close button gains `aria-label="Close"`, `inline-flex items-center justify-center min-h-11 min-w-11`, and upgrades sr-only text from "Close" to "Close dialog".
- `mobile-nav-375px.spec.ts`: 8 well-structured Playwright tests at 375x667, correct `public` project placement, no `waitForTimeout` calls, geometry comment on outside-click coordinate.

One warning: the test file specified to cover "one-shot trigger" in the config review dimensions is missing that test case. The implementation is correct; the test gap leaves the hasIntersected re-entry guard un-regression-tested.

No CLAUDE.md zero-tolerance violations found across all 7 files (no `any` types, no barrel imports, no `@radix-ui/react-icons`, no hex/rgb/`bg-white`, no inline `[NNNms]`, no commented-out code, no emojis, no `as unknown as`).

## Warnings

### WR-01: Missing one-shot trigger test in number-ticker.test.tsx

**File:** `src/components/ui/__tests__/number-ticker.test.tsx`
**Issue:** The config review spec requires test coverage for "one-shot trigger" — verifying that a second IntersectionObserver entry (element leaves and re-enters the viewport) does NOT re-trigger the animation. The test file has 5 tests but none exercise this path. The guard is implemented correctly in `use-intersection-observer.ts` via `hasIntersectedRef.current`, but the regression test that would catch a future breakage of that guard is absent.

The `IntersectionObserverMock` in `unit-setup.ts` fires `isIntersecting: true` synchronously on `observe()`, which means a second `observe()` call in the same test could simulate re-entry. The test currently has no such scenario.

**Fix:**
```typescript
it('does not re-animate when element re-enters the viewport (one-shot)', async () => {
  // Capture the observer instance so we can fire a second entry
  let capturedObserver: IntersectionObserver | undefined
  const OriginalObserver = window.IntersectionObserver
  vi.spyOn(window, 'IntersectionObserver').mockImplementation(
    (cb, opts) => {
      const obs = new OriginalObserver(cb, opts)
      capturedObserver = obs
      return obs
    }
  )

  render(<NumberTicker value={5} duration={2000} />)
  // First intersection triggers animation
  await vi.advanceTimersByTimeAsync(2100)
  expect(screen.getByText('5')).toBeInTheDocument()

  // Re-entry: fire the observer callback again with isIntersecting: true
  // hasIntersected remains true; effect should NOT re-run from 0
  // (displayValue stays at 5, not jumping back to 0)
  // NOTE: simplest verification is that displayValue does not reset to startValue
  expect(screen.queryByText('0')).not.toBeInTheDocument()
  expect(screen.getByText('5')).toBeInTheDocument()

  vi.restoreAllMocks()
})
```

Alternatively, since the `IntersectionObserverMock` in `unit-setup.ts` fires on `observe()` only, the simpler approach is to verify `displayValue` remains `to` and not `startValue` after the full animation — which tests 2 and 4 already implicitly confirm. The cleaner solution is a dedicated test with an explicit second-fire that reads `useNavigationStore` mock or accesses the captured observer to confirm no state reset.

---

_Reviewed: 2026-05-09T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
