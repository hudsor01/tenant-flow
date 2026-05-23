---
phase: 02-frontend-correctness-numberticker-mobile
reviewed: 2026-05-09T22:00:00Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - tests/e2e/tests/public/mobile-nav-375px.spec.ts
  - src/components/ui/number-ticker.tsx
  - src/components/ui/__tests__/number-ticker.test.tsx
  - src/app/marketing-home.tsx
  - src/components/layout/navbar.tsx
  - src/components/layout/navbar/navbar-mobile-menu.tsx
  - src/components/ui/sheet.tsx
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 02: Code Review Report — Cycle 5

**Reviewed:** 2026-05-09T22:00:00Z
**Depth:** deep
**Files Reviewed:** 7
**Status:** clean

## Summary

Cycle 5 (fresh-eyes adversarial) re-review of PR #686 post-hydration-fix (`8176ac4`). All seven cycle-5 adversarial dimensions examined against the live file contents. No issues found across all 7 files.

### Cycle-5 Adversarial Dimensions

**1. `networkidle` reliability on Vercel preview cold-starts**

Verified via `src/app/layout.tsx` lines 115-120: `<Analytics />` (`@vercel/analytics`) and `<SpeedInsights />` are gated behind `process.env.NODE_ENV === 'production'`. The Playwright webServer command (playwright.config.ts line 218) injects `NODE_ENV='test'`, so neither component loads in E2E runs. Neither fires a beacon or long-poll connection.

Sentry DSN is not present in `.env.test` (file does not define `NEXT_PUBLIC_SENTRY_DSN`). The Sentry tunnel route `/monitoring` is only reached when the SDK is initialized with a DSN. On the test server, Sentry initializes with no DSN and emits no network traffic. The Sentry tunnel cannot block `networkidle`.

`waitUntil: 'networkidle'` therefore resolves promptly once Next.js hydration finishes — no third-party long-poll or beacon prevents it. The `{ timeout: 10_000 }` on `waitForFunction` provides an explicit upper bound beyond the inherited `actionTimeout: 10_000` from playwright.config.ts — consistent, not redundant.

**2. Hydration predicate edge cases**

`offsetParent !== null` — the mobile toggle button (`md:hidden inline-flex ... p-2 rounded-lg`) is a standard in-flow element at 375px viewport. It is not `position: fixed`, `position: absolute`, or a descendant of a `display: none` subtree before hydration. `offsetParent` returns null only for `display:none`, `position:fixed` elements, or the `<body>`/`<html>` itself. None of these apply. The predicate correctly distinguishes pre-hydration (`offsetParent` is null when the button is in a server-rendered but not-yet-mounted state) from post-hydration.

`getBoundingClientRect().width > 0` — confirms actual layout has occurred. A `visibility: hidden` element still has a non-zero rect, which would be a false positive here — but the test's intent is only to guard against `display:none` / not-yet-laid-out. The subsequent `expect.poll(async () => (await toggle.boundingBox())?.height).toBeGreaterThanOrEqual(44)` in test 3 verifies actual layout dimensions. Two-stage guard is appropriate.

**3. `expect.poll` semantics**

`(await toggle.boundingBox())?.width` returns `number | undefined`. When `boundingBox()` returns null (element not laid out), the optional chain short-circuits to `undefined`. `expect(...).toBeGreaterThanOrEqual(44)` against `undefined` fails, and `expect.poll` retries at 100ms intervals up to the 5s `expect.timeout` (playwright.config.ts line 49). The `beforeEach` `waitForFunction` already guarantees width > 0 before any test body runs, so these polls will resolve on the first attempt in practice. They serve as a belt-and-suspenders guard against layout-shift between `beforeEach` completion and test-3 body execution.

**4. Test ordering and state pollution**

Each test starts with `page.goto('/')` in `beforeEach` (lines 6-21), establishing a fresh page context per test. Tests 4-7 open the drawer independently — no test leaves state that bleeds into the next. `fullyParallel: true` in playwright.config.ts means tests can interleave across workers, but the `public` project has no shared `storageState` file (explicitly `{ cookies: [], origins: [] }`), so there is no auth cookie to corrupt. Clean isolation.

**5. Browser targets for the `public` project**

playwright.config.ts lines 174-181 define the `public` project as `devices['Desktop Chrome']` only. The spec sets a 375×667 viewport override at the `describe` level (line 4). Chromium-only execution is correct for this spec — `networkidle` semantics and overlay z-index behavior are well-defined in Chromium. No multi-browser concern. Firefox/Safari are scoped to `owner` tests only (lines 186-194, 199-207). No unexpected multi-browser execution of this spec.

**6. `public` project testMatch alignment**

playwright.config.ts line 180: `testMatch: ['**/public/**/*.spec.ts', '**/*public*.spec.ts']`. The spec is at `tests/e2e/tests/public/mobile-nav-375px.spec.ts`. Matches the first pattern — spec is covered by the `public` project. The spec file does NOT have the string "public" in its name, so only the first pattern matches. Correct.

**7. CLAUDE.md zero-tolerance compliance (fresh sweep)**

All 7 files confirmed clean:
- No `any` types in any production file. Test-file `as unknown as` at line 104 of `number-ticker.test.tsx` is mock class assignment to `window.IntersectionObserver`, not an RPC/PostgREST boundary — rule 8 is scoped to those boundaries.
- No barrel file imports across any of the 7 files.
- No `@radix-ui/react-icons` — icon imports are `lucide-react` only: `Menu`, `X`, `XIcon`, `ArrowRight`, `ChevronDown`.
- No inline `[NNNms]` duration tokens in changed Tailwind classes (`duration-fast`, `duration-normal` are registered design tokens).
- No `bg-white`, hex, or named color values in changed code.
- No commented-out code. JSX `{/* ... */}` comments are structural documentation, not dead code.
- No emojis.
- All icon-only interactive elements carry `aria-label`: mobile toggle (navbar.tsx line 89), sheet close button (sheet.tsx line 74).
- No `console.log`, `debugger`, `TODO`, `FIXME`, `HACK` in any of the 7 files.
- No string literal query key arrays — no TanStack Query usage in these files.
- `noUnusedLocals` / `noUnusedParameters` compliance confirmed: all imports used, no dead parameters.

### Previously Verified Dimensions (cycle 2-4, still correct)

All findings from cycles 2, 3, and 4 were re-spot-checked against the current file contents:

- NumberTicker one-shot guard (`hasIntersectedRef.current`), rAF cleanup (`cancelled` flag + `cancelAnimationFrame` + `clearTimeout`), easing monotonicity (`progress * (2 - progress)` bounded 0-1), deps array stability — unchanged, correct.
- Marketing hero: `text-3xl` base, `text-balance`, `flex-col sm:flex-row`, `w-full sm:w-auto` — unchanged, correct.
- Mobile toggle: `md:hidden inline-flex items-center justify-center min-h-11 min-w-11` — unchanged, correct.
- Sheet close button: `aria-label="Close"` + `inline-flex items-center justify-center min-h-11 min-w-11` — unchanged, correct.
- Drawer width inherits shadcn default (`w-3/4 sm:max-w-sm`) — unchanged, correct.
- Test 6 one-shot guard test: `CapturingObserver` pattern with `capturedCallback` manual re-fire — unchanged, correct.
- Outside-click coordinate `(10, 100)` geometry: at 375px, `w-3/4` ≈ 281px, left edge ≈ 94px, so x:10 lands on `SheetOverlay` — confirmed.
- `expect.poll` + `waitForFunction` hydration fix — unchanged from fix commit `8176ac4`, correct.

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-05-09T22:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
