# Phase 2 — Research Synthesis: Frontend Correctness (NumberTicker + Mobile)

**Synthesized:** 2026-05-09
**Source specialists:**
- `02-RESEARCH-numberticker.md` — CRIT-02 animation lifecycle (HIGH confidence on fix shape)
- `02-RESEARCH-mobile-hamburger.md` — CRIT-04 hero overflow + CTA truncation + drawer polish (HIGH confidence)

**Status:** Ready for `/gsd-plan-phase 2`. Specialist appendices remain in place for deep-detail reference; this file is the planner's primary source-of-truth.

---

## Phase 2 TL;DR

Two visible bugs on the homepage block paid marketing spend. Both are pure-frontend (no DB / no migration / no Stripe). **Plan 02-01** rewrites `src/components/ui/number-ticker.tsx` to fix four compounding rAF/IntersectionObserver defects + adds 5 Vitest 4 fake-timer tests. **Plan 02-02** fixes a hero overflow at 375px (`text-3xl` + `text-balance`), unjams the CTA stack (`flex-col sm:flex-row` + `w-full sm:w-auto`), polishes the **already-shipped** mobile hamburger drawer (touch-target floor + drop ad-hoc width override + tighten Sheet close-button a11y), and adds a 375px Playwright spec. The two plans are parallel-safe (different files). The audit's "no hamburger" claim is **partially stale** — the drawer was wired in commit `76292b08a` (2026-03-08); do NOT rebuild. Live verification at 375px post-deploy is mandatory per Phase 1 lessons.

---

## Standard Stack

Libraries / patterns the plans MUST use:

| Layer | Choice | Source |
|-------|--------|--------|
| React | 19.2.4 + React Compiler 1.0 enabled | `package.json:161,203`, `next.config.ts:16` |
| Animation primitives | Native `requestAnimationFrame` + `IntersectionObserver` (no framer-motion / motion / GSAP) | `package.json` (no animation libs installed) |
| Intersection hook | `useIntersectionObserver` from `#hooks/use-intersection-observer` — already exposes one-shot `hasIntersected` | `src/hooks/use-intersection-observer.ts:25,38-39,57` |
| Drawer primitive | shadcn `Sheet` (Radix Dialog) — installed at `src/components/ui/sheet.tsx` | source-verified |
| Drawer side | `right` (locked in CONTEXT.md) | shadcn default |
| Icons | `lucide-react` only (`Menu`, `X`) | CLAUDE.md zero-tolerance |
| Touch target floor | `min-h-11 min-w-11` = 2.75rem = 44px = `--touch-target-min` | `globals.css:189,273` |
| Animation tokens | `--duration-300`, `--duration-500`, `--duration-fast`, `--ease-out-smooth` | `globals.css:237-238` |
| Test framework (unit) | Vitest 4.x + jsdom + `vi.useFakeTimers()` | codebase precedent (`animated-trend-indicator.test.tsx`) |
| Test framework (e2e) | Playwright `public/` project (no auth) | `tests/e2e/playwright.config.ts:174-181` |
| Test render helper | `render` from `#test/utils/test-render` | codebase convention |
| IntersectionObserver mock | shared `IntersectionObserverMock` in `src/test/unit-setup.ts:120-155` (fires `isIntersecting=true` synchronously inside `observe()`) | source-verified |

---

## Architecture Patterns

Task structure follows these:

1. **One-shot animation triggers** — use `hasIntersected` (latch-once) from `useIntersectionObserver`, never reactive `isIntersecting` in deps.
2. **Effect cleanup is mandatory** for any `setTimeout` / `requestAnimationFrame` chain. Cleanup cancels both. Mounted/`cancelled` guard short-circuits late-arriving frames.
3. **Monotonic time for tweens** — capture `startTime` lazily inside the rAF callback from the rAF `timestamp` argument (equivalent to `performance.now()`); never `Date.now()`.
4. **Responsive-first CTA stacks** — canonical pattern is `flex flex-col sm:flex-row gap-N` with `w-full sm:w-auto` on each Button. Already used by `landing/hero-section.tsx`, `final-cta-section.tsx`, `bento-features-section.tsx`.
5. **Drawer is the consumer of shadcn Sheet** — drawer-specific concerns (width, contents, item-onClick=close) live in the consumer; primitive-level concerns (close-button a11y) live in `sheet.tsx`.
6. **Token-only visual changes** — every spacing/color/duration/radius value resolves to a `globals.css` `@theme` token or a Tailwind 4 utility that compiles to one. No new hex/rgb/`bg-white`/inline ms.
7. **375px is the canonical mobile breakpoint** for verification. iPhone SE / mid-range Android.
8. **Touch target floor is enforced explicitly** — `min-h-11 min-w-11` Tailwind classes, not relying on the `globals.css:1444-1450` mobile media query block.
9. **Tests colocated under `__tests__/`** for unit; `tests/e2e/tests/public/` for marketing-surface e2e (no auth).

---

## Don't Hand-Roll

| Don't | Use Instead | Why |
|-------|-------------|-----|
| A new IntersectionObserver inside the ticker | `useIntersectionObserver` — already exposes `hasIntersected` | Already battle-tested; one-shot semantics built in |
| A new mobile drawer component | The existing `src/components/layout/navbar/navbar-mobile-menu.tsx` | Wired since 2026-03-08; audit claim is partially stale |
| A new shadcn Sheet install | `src/components/ui/sheet.tsx` already exists | Verified source-of-truth; full Radix dialog wrapping |
| A custom touch-target sizing token | `min-h-11 min-w-11` = `--touch-target-min` = 2.75rem | Already in spacing scale |
| A hand-rolled fake-timer harness | `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` | Vitest 4 mocks both `setTimeout` and `requestAnimationFrame` by default |
| `Date.now()` in animation timing | rAF `timestamp` argument | Wall-clock jumps; rAF timestamp is monotonic vsync-aligned |
| `flex flex-row` without responsive switch on mobile CTAs | `flex flex-col sm:flex-row gap-4` + `w-full sm:w-auto` on each Button | Brownfield-canonical; 4+ existing components use this exact pattern |
| Removing `whitespace-nowrap` from `button.tsx` globally | Wrapper-level fix only (`w-full sm:w-auto`) | Global change risks regressions in dense table CTAs and dashboard buttons |
| A new `text-display-hero` clamp token migration | Just shrink to `text-3xl` + add `text-balance` at the call site | Token migration is Phase 11 (TOKEN-03); brownfield-consistent here |
| A new typography scale for mobile | Tailwind responsive prefixes (`text-3xl sm:text-5xl`) | No new tokens (CONTEXT.md constraint) |
| A custom slide easing for the Sheet | shadcn default `data-[state=closed]:duration-300 data-[state=open]:duration-500` | Already token-aligned; CONTEXT.md OUT-OF-SCOPE |

---

## Common Pitfalls

Checked at verification time:

1. **rAF chain leaks across effect re-runs.** If the new `useEffect` doesn't return a cleanup that cancels both `rafId` AND `timeoutId`, the old chain races the new one. Cleanup is non-optional.
2. **`isIntersecting` reactive trigger.** Must use `hasIntersected` (one-shot, latch-once). If the planner wires `isIntersecting`, the bug returns.
3. **`Date.now()` reintroduced.** Reviewer must grep for `Date.now()` in `number-ticker.tsx` — it must be absent. Use the rAF `timestamp` argument.
4. **`stats-showcase.tsx` accidentally edited.** Source values (5/7/500/14) are already correct; touching it is a regression vector.
5. **`BlurFade` accidentally edited.** Specialist 1 confirmed BlurFade is NOT the cause; modifying it is out of scope and risks hydration drift.
6. **Drawer rebuild instead of polish.** The drawer EXISTS. Polish three call sites (`navbar.tsx:91`, `navbar-mobile-menu.tsx:47`, `sheet.tsx:73`); do NOT scaffold a new drawer.
7. **Resources dropdown `href="#"` "fix" sneaks in.** That's CONS-11 → Phase 8. Out of scope here.
8. **Removing `whitespace-nowrap` globally on Button.** Site-wide regression risk (dense tables, dashboard CTAs). Wrapper-level fix only.
9. **`text-balance` introduced AS A CHANGE without `text-3xl` shrink.** `text-balance` alone won't save the unbreakable word "spreadsheet" at 36px. Both changes ship together.
10. **New hex/rgb/`bg-white`/inline-ms anywhere.** Cross-cutting design-token gate. PR fails review otherwise.
11. **Audit-claim drift.** Specialist 2 flagged: audit says "no hamburger", source says "drawer wired". Plan must include LIVE post-deploy 375px verification — don't trust source-only checks.
12. **Skipping the e2e overflow assertion.** `bodyScrollWidth <= viewport + 1` locks the regression at the test layer; without it a future change can resurface the bug.
13. **Hardcoded `aria-label="Close navigation menu"` on the site-wide Sheet primitive.** It's a SHARED primitive. Use generic `aria-label="Close"` + `<span className="sr-only">Close dialog</span>` so other drawers (admin panels, etc.) aren't misleading.
14. **Test reliance on real timers.** Without `vi.useFakeTimers()` the rAF chain runs on wall-clock and tests flake.
15. **`waitFor`/sleep loops in the e2e spec.** Playwright auto-waits up to 5s on `expect(...).toBeVisible()`. Don't add `page.waitForTimeout()` unless flake observed.

---

## Code Examples

### Example 1: Battle-tested rAF tween with cleanup (number-ticker.tsx replacement core)

```tsx
useEffect(() => {
    if (!hasIntersected) return

    let rafId = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let startTime: number | undefined
    let cancelled = false

    const change = to - from
    const delayMs = delay * 1000

    const animate = (timestamp: number) => {
        if (cancelled) return
        if (startTime === undefined) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = progress * (2 - progress) // ease-out-quad
        setDisplayValue(from + change * eased)
        if (progress < 1) {
            rafId = requestAnimationFrame(animate)
        } else {
            setDisplayValue(to)
        }
    }

    const start = () => {
        if (cancelled) return
        rafId = requestAnimationFrame(animate)
    }

    if (delayMs > 0) {
        timeoutId = setTimeout(start, delayMs)
    } else {
        start()
    }

    return () => {
        cancelled = true
        if (rafId) cancelAnimationFrame(rafId)
        if (timeoutId) clearTimeout(timeoutId)
    }
}, [hasIntersected, from, to, delay, duration])
```

(Full replacement file: see `02-RESEARCH-numberticker.md` § Recommended Fix → "Replacement source (write verbatim)".)

### Example 2: Vitest 4 fake-timer test for rAF tween

```tsx
beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

it('animates to the target value after duration elapses (CRIT-02 regression)', async () => {
    render(<NumberTicker value={5} duration={2000} />)
    await vi.advanceTimersByTimeAsync(2100)
    expect(screen.getByText('5')).toBeInTheDocument()
})
```

### Example 3: Brownfield-canonical responsive CTA stack

```diff
-<div className="flex flex-row gap-4">
-  <Button asChild size="lg">
+<div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
+  <Button asChild size="lg" className="w-full sm:w-auto">
     <Link href="/pricing">
       Start Managing Properties
       <ArrowRight className="ml-2 size-4" />
     </Link>
   </Button>
-  <Button asChild variant="outline" size="lg">
+  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
     <Link href="/pricing">View Pricing</Link>
   </Button>
 </div>
```

### Example 4: 44px touch-target on icon-only mobile toggle

```diff
 <button
   onClick={toggleMobileMenu}
   aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
   data-testid="mobile-nav-toggle"
-  className="md:hidden p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
+  className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
 >
```

### Example 5: 375px Playwright spec skeleton

```typescript
import { expect, test } from '@playwright/test'

test.describe('Mobile nav at 375px viewport', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test.beforeEach(async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' })
    })

    test('hero does not horizontally overflow viewport', async ({ page }) => {
        const overflow = await page.evaluate(() => ({
            bodyScrollWidth: document.body.scrollWidth,
            viewport: window.innerWidth
        }))
        expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1)
    })
})
```

(Full 8-test spec: see `02-RESEARCH-mobile-hamburger.md` § E2E Test Strategy.)

---

## CRIT-02: NumberTicker Animation (Definitive Approach)

### Diagnosis — Four Compounding Defects

`src/components/ui/number-ticker.tsx` has four overlapping issues, any subset of which produces "renders 0":

| # | Defect | Location | Mechanism |
|---|--------|----------|-----------|
| 1 | **Reactive `isIntersecting` trigger** instead of one-shot `hasIntersected` | `number-ticker.tsx:35,47,79` | `isIntersecting` flips during scroll. With it in deps, effect re-runs and orphans the prior rAF chain. The hook ALREADY exposes `hasIntersected` (one-shot) at `src/hooks/use-intersection-observer.ts:57` — it's just not being read. |
| 2 | **No `useEffect` cleanup** | `number-ticker.tsx:46-79` (no `return`) | `setTimeout` and recursive `requestAnimationFrame` chain leak across re-renders + unmount. |
| 3 | **`Date.now()` for tween timing** | `number-ticker.tsx:51,55` | Wall-clock; non-monotonic; `setTimeout`+`Date.now()` arithmetic is brittle compared to the canonical rAF-`timestamp`-arg pattern. |
| 4 | **`from/to/delay/duration` in deps with no cleanup** | `number-ticker.tsx:79` | Benign for stats-showcase static values, but lethal for any caller passing computed primitives (e.g., `value={Math.floor(totalRevenue)}` on `/financials`). New chain races old chain. |

`stats-showcase.tsx` source values (5/7/500/14) are correct. `BlurFade` is NOT the cause (`inView={true}` makes wrapper visible immediately at L86). React Compiler 1.0 + React 19.2.4 are compatible — `useEffect`/`useState` are not removed by the compiler.

### Recommended Fix — Single-File Rewrite

**File:** `src/components/ui/number-ticker.tsx` — full replacement, ~80 lines, public prop API unchanged.

**Shape (verbatim source in `02-RESEARCH-numberticker.md` § Recommended Fix):**
- `'use client'` preserved at top.
- Subscribe to `hasIntersected` (one-shot) instead of `isIntersecting`.
- Drop `hasAnimated` state (one-shot is now hook-provided).
- Capture `startTime` lazily inside rAF callback from the rAF `timestamp` arg. No `Date.now()`.
- Track `rafId`, `timeoutId`, `cancelled` in effect-local closures.
- Return cleanup that cancels both timers and sets `cancelled = true`.
- Deps: `[hasIntersected, from, to, delay, duration]`.

**Why this is sufficient:**
- Hydration safety preserved — server renders `Intl.NumberFormat(...).format(0)` = "0", client mounts with same `displayValue=0`.
- One-shot animation per mount (`hasIntersected` stays true after first intersection).
- Re-target works correctly (cancel old, start new tween) for dashboard pages where `value` changes.
- No new dependencies. No call-site changes (financials pages keep working).

### Test Strategy — `src/components/ui/__tests__/number-ticker.test.tsx` (NEW)

Vitest 4 + jsdom + `vi.useFakeTimers()`. Five tests:

| # | Test name | What it locks |
|---|-----------|---------------|
| 1 | renders the start value on mount before animation completes | Initial render = 0 (hydration parity) |
| 2 | animates to the target value after duration elapses (CRIT-02 regression) | Direct bug-surface assertion |
| 3 | honors delay before starting the tween (mirrors stats-showcase usage) | Delayed-start path |
| 4 | renders all four production stat values to completion (5/7/500/14) | Pins per-counter regression |
| 5 | cancels the rAF chain on unmount (no setState-after-unmount warning) | Cleanup pattern |

(Full source in `02-RESEARCH-numberticker.md` § Test Strategy.)

**Vitest 4 mocks `requestAnimationFrame` by default with `useFakeTimers()`.** Fallback if needed: `vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] })`.

**Shared `IntersectionObserverMock`** at `src/test/unit-setup.ts:120-155` fires `isIntersecting=true` synchronously inside `observe()` — tests inherit this; no manual intersection setup needed.

### React Compiler Compatibility

- `'use client'` directive preserved (required for `useEffect`, `useState`, `useRef`, IntersectionObserver, rAF).
- No anti-patterns the compiler chokes on (no prop mutation, no conditional hooks, no early-return-before-hooks).
- `animate` closure defined inside `useEffect` (not at component scope) — compiler does NOT memoize it; each effect run gets a fresh closure, with cleanup preventing leaks.
- `useIntersectionObserver` returns stable `hasIntersected` (latch-once); compiler auto-memoization is safe.
- No `'use no memo'` escape hatch needed.
- Verification gate: `pnpm lint` (exhaustive-deps) + `pnpm typecheck` + `next build`.

---

## CRIT-04: Mobile Hero + Hamburger (Definitive Approach)

### Existing Drawer Audit (CRITICAL — Read First)

The audit's "no hamburger menu on mobile" claim is **partially stale**.

- `src/components/layout/navbar.tsx:87-94` — toggle button with `data-testid="mobile-nav-toggle"`, `aria-label`, `md:hidden`, lucide `Menu`/`X` icons. Wired to `useNavigationStore.toggleMobileMenu`.
- `src/components/layout/navbar/navbar-mobile-menu.tsx:46` — shadcn `<Sheet side="right">` containing all 7 nav items (Features, Pricing, Compare, About, Resources, Sign In, Get Started CTA).
- `src/components/ui/sheet.tsx` — full shadcn Radix Dialog wrapper. Already installed.
- Wired since commit `76292b08a` (2026-03-08) — 2 months before the audit.

**Conclusion:** Do NOT rebuild the drawer. Polish + add a 375px e2e regression lock. **Live verification at 375px post-deploy is mandatory** (CONTEXT.md Phase 1 lesson — Specialist-2 was wrong about framework defaults; trust runtime, not source-only).

### Hero Overflow Fix

**File:** `src/app/marketing-home.tsx:33`

```diff
-<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05]">
+<h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05] text-balance">
   Ditch the{' '}
   <span className="hero-highlight">spreadsheet</span>
 </h1>
```

**Why:** At 375px, `text-4xl` (36px) renders "spreadsheet" as ~190px unbreakable inline-block (`hero-highlight` semibold). Content area is 327px (375 − 2×24 px-6). Drop base to `text-3xl` (30px) → "spreadsheet" is ~158px, "Ditch the " ~80px → ~238px total, fits with room for the underline pseudo. `text-balance` (Tailwind 4 → `text-wrap: balance`) distributes line breaks for visual polish. SM+ (640px+) keeps `text-5xl` — desktop and tablet visual unchanged.

**Rejected alternative:** Migrating to `--text-display-hero` clamp token. Cross-cutting refactor — Phase 11 TOKEN-03 owns it.

### CTA Truncation Fix

**File:** `src/app/marketing-home.tsx:45-55`

```diff
-<div className="flex flex-row gap-4">
-  <Button asChild size="lg">
+<div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
+  <Button asChild size="lg" className="w-full sm:w-auto">
     <Link href="/pricing">
       Start Managing Properties
       <ArrowRight className="ml-2 size-4" />
     </Link>
   </Button>
-  <Button asChild variant="outline" size="lg">
+  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
     <Link href="/pricing">View Pricing</Link>
   </Button>
 </div>
```

**Why:** Current `flex flex-row gap-4` + Button `whitespace-nowrap` (button.tsx:8) + `size="lg"` (`px-8 min-h-11`) → ~316px primary + ~140px secondary + 16px gap = ~472px > 327px viewport content. Switch to `flex-col sm:flex-row`: stacks vertically below 640px, side-by-side at SM+. `w-full sm:w-auto` makes buttons full-width at mobile (long label fits naturally without removing `whitespace-nowrap`). Brownfield-canonical pattern (matches `landing/hero-section.tsx`, `final-cta-section.tsx`, `bento-features-section.tsx`).

**DO NOT** remove `whitespace-nowrap` from `button.tsx` — global change risks regressions in dense table CTAs.

### Drawer Polish (4 items, 1 out-of-scope)

| # | Item | Fix | In/Out scope |
|---|------|-----|--------------|
| (a) | Toggle button `p-2` (~36px box) misses 44px touch-target floor | Add `inline-flex items-center justify-center min-h-11 min-w-11` to `navbar.tsx:91` className | **IN** |
| (b) | Sheet close button has `<span className="sr-only">Close</span>` only — no explicit `aria-label`, no 44×44 hit target | Edit `sheet.tsx:73` to add `aria-label="Close"` + `inline-flex items-center justify-center min-h-11 min-w-11`; change inner sr-only to `Close dialog` | **IN** (site-wide primitive — generic label intentional; per-drawer context comes from `<SheetTitle>`) |
| (c) | Drawer width override `w-[300px] sm:w-[350px]` is ad-hoc px | Drop the `className` width override on `navbar-mobile-menu.tsx:47` → fall back to shadcn default `w-3/4 sm:max-w-sm` | **IN** |
| (d) | Resources dropdown items have `href="#"` (clicking the row navigates to `#`) | Defer to Phase 8 CONS-11 ("Resources nav dropdown items navigate to real URLs") | **OUT** |

**Sheet animations are already token-aligned** — `data-[state=closed]:duration-300 data-[state=open]:duration-500` at `sheet.tsx:59` maps to `--duration-300` / `--duration-500` per Tailwind 4 `@theme`. No change needed.

### shadcn Sheet Availability — CONFIRMED

`src/components/ui/sheet.tsx` exists. Exports: `Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription`. Default `side="right"` matches locked decision. Built-in close button + overlay + escape/outside-click + focus restore (Radix dialog defaults). **No install step needed.**

### E2E Test Layout

**File:** `tests/e2e/tests/public/mobile-nav-375px.spec.ts` (NEW)

Routes through Playwright `public/` project (no auth, marketing surface). Pattern matches `tests/e2e/tests/public/seo-smoke.spec.ts`. 8 tests:

| # | Assertion | What it locks |
|---|-----------|---------------|
| 1 | `bodyScrollWidth <= viewport + 1` | Hero overflow regression — no horizontal scroll |
| 2 | "Start Managing Properties" CTA bbox `x + width <= 375 + 1` | CTA truncation regression |
| 3 | Hamburger toggle bbox ≥ 44×44 + correct aria-label | Touch target + a11y regression |
| 4 | Tap toggle → drawer opens with all 7 items visible | Drawer contents (DEFAULT_NAV_ITEMS + Sign In + CTA) |
| 5 | Tap Pricing link inside drawer → drawer closes + navigates | Auto-close UX |
| 6 | Escape closes drawer + focus returns to trigger | Keyboard a11y (Radix default) |
| 7 | Click X close button → drawer closes | Click-to-close UX |
| 8 | Click outside (overlay) → drawer closes | Click-outside UX |

(Full source in `02-RESEARCH-mobile-hamburger.md` § E2E Test Strategy.)

Viewport setup: `test.use({ viewport: { width: 375, height: 667 } })` (iPhone SE 1st gen).

---

## Cross-Domain Risk Matrix

| Risk | Domain | Likelihood | Severity | Mitigation |
|------|--------|------------|----------|------------|
| Plan 02-01 and 02-02 file-edit conflict | Both | NONE | — | Different files. Plan 02-01: `number-ticker.tsx` + new test file. Plan 02-02: `marketing-home.tsx`, `navbar.tsx`, `navbar-mobile-menu.tsx`, `sheet.tsx`, new e2e file. |
| NumberTicker rewrite breaks dashboard callers (`financials-summary-stats.tsx`, `income-statement-page-stats.tsx`) | Plan 02-01 | LOW | MEDIUM | Public prop API unchanged. New behavior on prop change (cancel-old / start-new) is strictly more correct than old leak. Smoke test `/financials` and `/financials/income-statement` post-deploy. |
| `text-3xl` shrinks heading too aggressively at 375-639px | Plan 02-02 | LOW | LOW | `text-balance` + `tracking-tight` maintain visual weight. Verify in DevTools 375px preset before merge. |
| `text-balance` not supported on old browsers | Plan 02-02 | VERY LOW | NONE | Falls back to default text-wrap. Chrome 114+, Safari 17.5+, Firefox 121+. All evergreen. |
| `flex-col sm:flex-row` breaks desktop CTA layout | Plan 02-02 | LOW | LOW | At SM+ identical to today. Verify at 640px / 1024px before merge. |
| Adding `aria-label="Close"` + min-h/w-11 to site-wide `sheet.tsx` close button affects all drawers | Plan 02-02 | LOW | LOW | Generic label is correct for any modal. Hit-target expansion is invisible (absolute-positioned). No existing drawer test asserts close-button accessible name. |
| Removing drawer width override changes desktop drawer width | Plan 02-02 | LOW | NONE | Today: 350px. New: shadcn `sm:max-w-sm` = 384px. +34px tablet/desktop. Closer to shadcn canon. |
| Audit-claim "no hamburger" was actually true on prod (CDN cache / build issue, not source) | Plan 02-02 | LOW | HIGH | Post-deploy live verification at 375px on real iPhone SE / DevTools is REQUIRED (not optional). |
| New e2e spec flakes on Sheet animation timing | Plan 02-02 | LOW | MEDIUM | Playwright auto-waits 5s on `expect(...).toBeVisible()`. Add `page.waitForTimeout()` ONLY if flake observed. |
| Vitest 4 fake-timers don't drive rAF in jsdom | Plan 02-01 | LOW | MEDIUM | Vitest 4 mocks rAF by default. Fallback: `vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] })`. |
| Hydration mismatch on server | Plan 02-01 | NONE | — | Initial `displayValue=startValue=0` matches server `format(0)="0"`. |

---

## Audit Stale Observations

The audit (`audit-ui-2026-05-08.md` item #4) claimed: *"there is NO hamburger menu — desktop nav (Features, Pricing, Compare, About, Resources, Sign In, Get Started) just disappears, leaving mobile users with zero navigation."*

**Source state (verified 2026-05-09):**
- Toggle button wired at `navbar.tsx:87-94` with `md:hidden`, `data-testid="mobile-nav-toggle"`, lucide `Menu`/`X` icons.
- `Sheet` drawer wired at `navbar/navbar-mobile-menu.tsx:46` with all 7 nav items.
- Wired since commit `76292b08a` (2026-03-08) — 2 months before the audit.
- Brownfield grep for additional mobile nav patterns: only one `Sheet` consumer in `src/components/layout/`; only one `md:hidden` in marketing nav (the toggle).

**Possible explanations for the audit observation:**
1. Auditor scrolled past the toggle (top-right of nav at 375px).
2. Stale CDN cache served pre-`76292b08a` build at audit time.
3. Auditor was looking at a different deployment (preview branch / rollback / etc.).

**Action:** Phase 2 plan execution **MUST** include a post-deploy live-verification step at `https://tenantflow.app/` in Chrome DevTools 375px iPhone SE preset, confirming:
- Hero text wraps within viewport (no horizontal scroll).
- "Start Managing Properties" CTA fully visible.
- Hamburger toggle visible top-right.
- Tap toggle → drawer opens with all 7 nav items + Sign In + Get Started CTA.
- All four stat counters animate from 0 → 5/7/500/14.

This is the Phase 1 lesson made concrete: source-only checks failed once already (`loading.tsx` returning null swallowed Specialist-2's "framework emits real 404" claim). Don't repeat.

---

## Verification Checklist

### Pre-flight (during plan execution, before commit)

**CRIT-02:**
- [ ] `pnpm test:unit -- --run src/components/ui/__tests__/number-ticker.test.tsx` — all 5 tests pass
- [ ] `pnpm typecheck` — no errors in `number-ticker.tsx`
- [ ] `pnpm lint` — no `react-hooks/exhaustive-deps` warning in `number-ticker.tsx`
- [ ] `grep -n 'Date.now' src/components/ui/number-ticker.tsx` — returns nothing
- [ ] `grep -n 'isIntersecting' src/components/ui/number-ticker.tsx` — returns nothing (only `hasIntersected`)
- [ ] `grep -c 'cancelAnimationFrame\|clearTimeout' src/components/ui/number-ticker.tsx` — returns ≥ 1 each
- [ ] `next build` succeeds (React Compiler smoke)

**CRIT-04:**
- [ ] `grep -n 'text-balance' src/app/marketing-home.tsx` — present on `<h1>`
- [ ] `grep -n 'flex-col sm:flex-row' src/app/marketing-home.tsx` — present on CTA wrapper
- [ ] `grep -n 'min-h-11 min-w-11' src/components/layout/navbar.tsx` — present on toggle
- [ ] `grep -n 'aria-label="Close"' src/components/ui/sheet.tsx` — present on `SheetPrimitive.Close`
- [ ] `grep -n 'w-\[3' src/components/layout/navbar/navbar-mobile-menu.tsx` — returns nothing (ad-hoc width override removed)
- [ ] `pnpm test:e2e -- tests/e2e/tests/public/mobile-nav-375px.spec.ts` — all 8 tests pass
- [ ] `pnpm typecheck && pnpm lint` clean
- [ ] No new hex/rgb/`bg-white`/inline-ms anywhere in the diff (cross-cutting design-token gate)

### Post-deploy live verification (REQUIRED — Phase 1 lesson)

Run at `https://tenantflow.app/` in Chrome DevTools 375px iPhone SE preset AFTER vercel deploy lands:

```bash
# 1. Confirm stats animate (CRIT-02)
curl -s https://tenantflow.app/ | grep -E "(Entity Branches|Default Categories|Bulk-Zip Cap|Day Free Trial)"
# Expected: each phrase appears in markup (with surrounding NumberTicker spans).
# Visual check in DevTools: scroll to stats section, observe 0 → 5/7/500/14 animation.
```

- [ ] All 4 stat counters animate from 0 → target value (5, 7, 500, 14)
- [ ] Hero text wraps within viewport at 375px (no horizontal scroll bar)
- [ ] "Start Managing Properties" CTA fully visible, tappable
- [ ] "View Pricing" CTA stacked below at 375px, side-by-side at 640px+
- [ ] Hamburger toggle visible top-right at 375px (tap target ≥ 44×44)
- [ ] Tap toggle → Sheet slides in from right
- [ ] Drawer contains: Features, Pricing, Compare, About, Resources, Sign In, Get Started CTA
- [ ] Tapping any link closes drawer and navigates
- [ ] Escape closes drawer, focus returns to toggle
- [ ] Tap outside drawer (overlay) closes it
- [ ] Tap X close button (top-right of drawer) closes it
- [ ] No DevTools console errors during any of the above

---

## Confidence Levels

### Overall

| Domain | Confidence | Notes |
|--------|------------|-------|
| CRIT-02 fix shape | HIGH | Battle-tested rAF pattern; all 4 defects addressed; public API unchanged |
| CRIT-02 root-cause pinpoint | MEDIUM | Static analysis cannot rule out a fifth cause without runtime debug; rewrite is robust regardless |
| CRIT-02 React Compiler compatibility | HIGH | Verified against React docs + reactwg discussion #18 |
| CRIT-04 hero overflow fix | HIGH | Source-verified, brownfield-consistent with `landing/hero-section.tsx` |
| CRIT-04 CTA truncation fix | HIGH | Brownfield-canonical pattern; verified in 4+ existing components |
| CRIT-04 drawer existence | HIGH | Source-verified in commit `76292b08a` |
| CRIT-04 audit-claim interpretation | MEDIUM | Source clearly contains wired toggle; auditor observation uncorroborated. Plan MUST include live verification. |
| Test coverage adequacy (unit + e2e) | HIGH | 5 unit + 8 e2e tests directly assert each regression vector |
| Cross-domain parallel-safety | HIGH | No file overlap between Plans 02-01 and 02-02 |

### Per-recommendation

| Recommendation | Confidence |
|---------------|-----------|
| `hasIntersected` swap (Defect 1 fix) | HIGH |
| Effect cleanup with `rafId`/`timeoutId`/`cancelled` (Defect 2 fix) | HIGH |
| rAF `timestamp` arg replacing `Date.now()` (Defect 3 fix) | HIGH |
| `from/to/delay/duration` in deps + cleanup handles re-target (Defect 4 fix) | HIGH |
| `text-3xl` + `text-balance` on hero `<h1>` | HIGH |
| `flex-col sm:flex-row` + `w-full sm:w-auto` on CTAs | HIGH |
| `min-h-11 min-w-11` on toggle | HIGH |
| Generic `aria-label="Close"` + min-h/w-11 on Sheet primitive | HIGH |
| Drop `w-[300px] sm:w-[350px]` drawer width override | HIGH |
| 8-test 375px Playwright spec | HIGH |
| Resources `href="#"` deferred to Phase 8 | HIGH (CONTEXT.md OUT-OF-SCOPE) |

### Gaps requiring attention during planning

1. **Live verification step is non-optional.** Plan tasks must explicitly include the post-deploy 375px DevTools walkthrough as an action — not just an aspirational success criterion.
2. **`stats-showcase.tsx` and `blur-fade.tsx` must NOT appear in Plan 02-01's diff scope.** Source values are correct; touching these is a regression vector. Plan should declare them out-of-scope with rationale.
3. **`button.tsx` `whitespace-nowrap` must NOT be removed.** Plan 02-02 should explicitly exclude `button.tsx` from edit scope.
4. **Vitest 4 rAF fake-timer fallback documented.** If tests fail on the assumption that `useFakeTimers()` mocks rAF by default, planner needs an explicit fallback path: `vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] })`.

---

## Plan Decomposition Suggestion

Two parallel-eligible plans (no file overlap):

### Plan 02-01: NumberTicker Animation Fix + Regression Test

- **Files edited:** `src/components/ui/number-ticker.tsx` (full rewrite, ~80 lines)
- **Files added:** `src/components/ui/__tests__/number-ticker.test.tsx` (5 tests, ~80 lines)
- **Files explicitly NOT touched:** `src/components/sections/stats-showcase.tsx`, `src/components/ui/blur-fade.tsx`, `src/hooks/use-intersection-observer.ts`
- **Requirements:** CRIT-02
- **Verification:** unit tests + `next build` + post-deploy live check (4 counters animate from 0 → 5/7/500/14)

### Plan 02-02: Mobile Hero + CTA + Drawer Polish + E2E

- **Files edited (4):**
  - `src/app/marketing-home.tsx` (hero `<h1>` + CTA wrapper + per-Button width)
  - `src/components/layout/navbar.tsx` (toggle button — add `min-h-11 min-w-11 inline-flex items-center justify-center`)
  - `src/components/layout/navbar/navbar-mobile-menu.tsx` (drop `w-[300px] sm:w-[350px]` className)
  - `src/components/ui/sheet.tsx` (close button — add `aria-label="Close"` + `min-h-11 min-w-11 inline-flex items-center justify-center`; change sr-only to `Close dialog`)
- **Files added:** `tests/e2e/tests/public/mobile-nav-375px.spec.ts` (8 tests)
- **Files explicitly NOT touched:** `src/components/ui/button.tsx` (no global `whitespace-nowrap` removal), `src/components/layout/navbar/navbar-desktop-nav.tsx`, `src/components/layout/page-layout.tsx`, `src/stores/navigation-store.ts`
- **Requirements:** CRIT-04
- **Verification:** Playwright e2e + post-deploy live check (375px DevTools — all 11 checklist items)

---

## Sources

### Primary (HIGH confidence — source-of-truth)

**Specialist appendices (deep detail):**
- `02-RESEARCH-numberticker.md` (520 lines) — full diagnosis, replacement source, 5-test suite, React Compiler analysis, risk matrix
- `02-RESEARCH-mobile-hamburger.md` (591 lines) — full hero/CTA/drawer audit, 8-test e2e suite, design-token mapping, risk matrix

**Code references:**
- `src/components/ui/number-ticker.tsx` (current 95-line broken impl)
- `src/components/sections/stats-showcase.tsx` (correct values 5/7/500/14 verified L17-43)
- `src/components/ui/blur-fade.tsx` (ruled out as cause)
- `src/hooks/use-intersection-observer.ts` (exposes one-shot `hasIntersected` at L57)
- `src/test/unit-setup.ts:120-155` (IntersectionObserverMock)
- `src/components/ui/__tests__/animated-trend-indicator.test.tsx` (test pattern reference)
- `src/app/marketing-home.tsx` (hero L33, CTA L45-55)
- `src/components/layout/navbar.tsx` (toggle L87-94)
- `src/components/layout/navbar/navbar-mobile-menu.tsx` (Sheet L46, items L53-114)
- `src/components/layout/navbar/navbar-desktop-nav.tsx` (`hidden md:flex` L89)
- `src/components/layout/navbar/types.ts` (`DEFAULT_NAV_ITEMS`)
- `src/components/ui/sheet.tsx` (close L73-76, animation L59, side-right L60-61)
- `src/components/ui/button.tsx` (`whitespace-nowrap` L8, size scale L25)
- `src/stores/navigation-store.ts` (mobile menu state)
- `src/app/globals.css` (token authority — `--touch-target-min` L273, `--spacing-11` L189, `--duration-300/500` L237-238, `hero-highlight` L621-626)
- `tests/e2e/playwright.config.ts:174-181` (`public/` project routing)
- `tests/e2e/tests/public/seo-smoke.spec.ts` (e2e pattern reference)
- `tests/e2e/tests/_archived/pricing-premium.spec.ts:61` (375×667 viewport precedent)
- `package.json:157,161,163,203` (Next 16.2.4, React 19.2.4, react-dom 19.2.4, babel-plugin-react-compiler 1.0)
- `next.config.ts:16` (`reactCompiler: true`)
- `git log` commit `76292b08a` (2026-03-08 — drawer wired)

**Phase + project context:**
- `.planning/phases/02-frontend-correctness-numberticker-mobile/02-CONTEXT.md` (locked decisions)
- `.planning/REQUIREMENTS.md § Critical (CRIT-02, CRIT-04 + cross-cutting design-token constraint)`
- `.planning/ROADMAP.md § Phase 2` (4 success criteria)
- `audit-ui-2026-05-08.md` items #2 and #4 (regression baselines)
- `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-VERIFICATION.md` (Phase 1 live-verification lessons)
- `CLAUDE.md` (zero-tolerance rules, design tokens, accessibility rules)

### Secondary (HIGH-MEDIUM — official docs)

- React Compiler official docs ([react.dev/learn/react-compiler](https://react.dev/learn/react-compiler)) — `useEffect`/`useState` not removed
- reactwg/react-compiler discussion #18 — `eslint-plugin-react-hooks` interaction
- shadcn Sheet docs ([ui.shadcn.com/docs/components/sheet](https://ui.shadcn.com/docs/components/sheet)) — primitive behavior
- Radix Dialog docs — keyboard / focus-restore behavior
- Magic UI NumberTicker docs ([magicui.design/docs/components/number-ticker](https://magicui.design/docs/components/number-ticker)) — public API parity reference

### Tertiary (LOW — needs validation post-deploy)

- Exact mechanism producing "0" in production (vs partial values) — three plausible mechanisms documented; rewrite eliminates all three
- Whether the audit's "no hamburger" claim was a stale CDN cache, auditor oversight, or different deployment — resolved by post-deploy live verification

---

## Metadata

**Synthesized:** 2026-05-09
**Valid until:** 2026-06-08 (30 days; stable React 19 + React Compiler 1.0 + Next 16 ecosystem)
**Specialist appendices kept:** `02-RESEARCH-numberticker.md`, `02-RESEARCH-mobile-hamburger.md` (deep-detail reference for the planner)

**Confidence breakdown:**
- Phase decomposition (2 parallel plans): HIGH
- CRIT-02 fix shape: HIGH
- CRIT-04 fixes (hero + CTA + polish): HIGH
- Test strategy adequacy: HIGH
- Audit-claim staleness interpretation: MEDIUM (resolved by mandatory post-deploy live verification)

**Next action:** `/gsd-plan-phase 2` consumes this file to produce `02-01-PLAN.md` (NumberTicker) and `02-02-PLAN.md` (Mobile + Drawer Polish + E2E).
