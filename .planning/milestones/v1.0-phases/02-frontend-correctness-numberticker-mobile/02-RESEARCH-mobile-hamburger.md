# Phase 2 — Research: Mobile Hero Overflow + Hamburger Drawer (CRIT-04)

**Researched:** 2026-05-09
**Domain:** Next.js 16 marketing surface — TailwindCSS 4 responsive layout + shadcn `Sheet` (Radix Dialog) mobile drawer
**Confidence:** HIGH for diagnoses (verified against source); HIGH for fix recommendations (token-aligned, brownfield-consistent)
**Specialist scope:** CRIT-04 only. NumberTicker is sister-specialist (`02-RESEARCH-numberticker.md`).

## Summary

The audit's "no hamburger menu on mobile" claim is **partially stale**. A mobile drawer (`src/components/layout/navbar/navbar-mobile-menu.tsx`) has existed since commit `76292b08a` (2026-03-08) and is wired through `Navbar` → `NavbarMobileMenu` via `useNavigationStore`. The toggle button is rendered with `md:hidden` at `src/components/layout/navbar.tsx:91`. That component IS deployed.

However, the audit is **fully correct** about the hero overflow + CTA truncation, and the mobile drawer has **fixable accessibility/layout defects** that the audit did not catch:

1. **Hero overflow root cause:** `src/app/marketing-home.tsx:33` uses `text-4xl` at the base breakpoint with `tracking-tight leading-[1.05]` and *no* `text-balance`. At 375px: "Ditch the spreadsheet" renders as ~36px with the long word "spreadsheet" (~190px wide as `hero-highlight` semibold). Combined with the parent `grid grid-cols-1 lg:grid-cols-2` putting the text in a single 1fr column constrained only by `max-w-7xl px-6`, the unbreakable word "spreadsheet" pushes past viewport on narrow phones.
2. **CTA truncation root cause:** `src/components/ui/button.tsx:8` injects `whitespace-nowrap` on every Button, and `src/app/marketing-home.tsx:45` wraps both CTAs in `flex flex-row gap-4` (no `sm:flex-row` — always horizontal). At 375px, "Start Managing Properties" (size `lg` = `px-8`, `min-h-11` = ~280px) + 16px gap + "View Pricing" (~140px) = ~436px, exceeding the 327px content area (375 − 2×24 padding). `whitespace-nowrap` forbids the long label from wrapping; the row overflows the flex container which then clips against `overflow-hidden` ancestors.
3. **Mobile drawer is wired but has 4 polish defects:** (a) toggle button `p-2` (~40px) misses the 44px touch-target floor; (b) Sheet's `SheetClose` X button uses `<span className="sr-only">Close</span>` only — needs explicit `aria-label="Close navigation menu"`; (c) Sheet animation duration is hardcoded `data-[state=closed]:duration-300 data-[state=open]:duration-500` in `sheet.tsx:59` — already token-aligned to `--duration-300/500`, but the drawer width `w-[300px] sm:w-[350px]` in `navbar-mobile-menu.tsx:47` is ad-hoc and ignores shadcn's default `w-3/4 sm:max-w-sm`; (d) the Resources dropdown ChevronDown handler in mobile menu does `e.preventDefault()` on a `Link` — this swallows navigation EVEN when the chevron icon is clicked, but it's nested in the `<Link>` so any click on the row prevents nav anyway.

**Primary recommendation:** Fix hero with a per-Tailwind-breakpoint smaller base size + `text-balance` on the `<h1>`. Fix CTAs by switching the wrapper to `flex flex-col sm:flex-row gap-4 w-full sm:w-auto` and adding `w-full sm:w-auto` on the Buttons. Polish the existing mobile drawer (touch target, Close aria-label, drawer width). DO NOT rewrite the drawer — it works.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Hamburger UI pattern:** shadcn `Sheet` slide-in drawer from right. Already implemented at `src/components/layout/navbar/navbar-mobile-menu.tsx`.
- **Drawer contents:** all 7 desktop nav items (Features, Pricing, Compare, About, Resources, Sign In, Get Started). One CTA pill at the bottom.
- **Trigger button:** lucide-react `Menu` icon, top-right at `<md`. `aria-label="Open navigation menu"`. Already wired at `src/components/layout/navbar.tsx:87-94`.
- **Hero overflow fix:** wrap "spreadsheet" or shrink type at 375px. No new tokens.
- **CTA truncation fix:** must fit within viewport at 375px. No new tokens.
- **Mobile target:** 375px (iPhone SE / mid-range Android).
- **Touch target sizes:** 44×44px minimum. Use `--touch-target-min: 2.75rem` (`globals.css:273`).
- **Drawer animation:** `--duration-300` + `--ease-out-smooth` (already used by shadcn Sheet primitive at `sheet.tsx:59`).

### Claude's Discretion
- Specific test names + structure
- Whether the hero fix touches `<h1>` only or the parent grid as well
- Drawer width tweaks (shadcn defaults `w-3/4 sm:max-w-sm` are fine)
- Sheet close-button position (top-right is shadcn default; keep)

### Deferred Ideas (OUT OF SCOPE)
- NumberTicker visual polish (separate specialist)
- Hamburger drawer animation polish (custom slide easing) — use shadcn defaults
- Mobile-specific typography scale tweaks
- Tablet breakpoint (768-1023px) — only 375px is the mandate
- Larger phone breakpoint (414+) — fix at 375px first
- Hero copy rewording — Phase 4 owns

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRIT-04 | Mobile layout works at 375px — fix hero text overflow ("spreadsheet" word breaks viewport), CTA button truncation, and add a working hamburger nav using shadcn `Sheet` (slide-in drawer from right). All marketing-page nav links reachable on mobile. | Hero Overflow Diagnosis + CTA Truncation Diagnosis + Hamburger Component Design (polish-only, drawer already exists) sections below. |

## Hero Overflow Diagnosis

### Where it lives

`src/app/marketing-home.tsx:33-36`:

```tsx
<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05]">
  Ditch the{' '}
  <span className="hero-highlight">spreadsheet</span>
</h1>
```

### Why it overflows at 375px

[VERIFIED: source read]
- `text-4xl` = `2.25rem` = 36px (Tailwind 4 default).
- `tracking-tight` = `letter-spacing: -0.025em` — tightens, doesn't help wrapping.
- `leading-[1.05]` = arbitrary tight line-height — tightens vertical rhythm only.
- `hero-highlight` (`globals.css:621-626`) is `display: inline-block` semibold — at 36px it renders "spreadsheet" as a single non-breaking visual block (~190px wide).
- Viewport content width at 375px = 375 − 2 × 24 (`px-6` = 1.5rem each side) = 327px.
- The word "spreadsheet" alone is ~190px (~58% of content area). "Ditch the " (~95px) + "spreadsheet" (~190px) = ~285px on a single line (no overflow yet) — BUT the whitespace `{' '}` between the spans plus tracking can push this near 300px+. The actual overflow risk is highest if Tailwind's font scaling rounds up or if the `hero-highlight::after` underline pseudo (line 628-638) creates layout pressure.

The **deeper structural issue** is: the parent `grid grid-cols-1 lg:grid-cols-2` (line 29) gives the heading a 1fr column. On mobile (`grid-cols-1`), 1fr = `min(content-width, 100%)`, so on phones with viewport-relative ARM browsers slightly < 375px (Android Chrome reports 360px in some configs) the word definitely overflows. **The audit was conducted on tenantflow.app/Chrome at 375px iPhone SE preset, which is the canonical breakpoint for this REQ.**

[VERIFIED: globals.css read] Project DOES define `--text-display-hero: clamp(3rem, 8vw, 5rem)` at line 37 — but `marketing-home.tsx` does NOT use it, opting for raw Tailwind `text-4xl/5xl/6xl/7xl`. That's a brownfield inconsistency vs `landing/hero-section.tsx:15` which uses `text-5xl lg:text-7xl`. Neither file uses `text-balance`.

### Fix

**File:line:** `src/app/marketing-home.tsx:33`

**Recommended diff:**

```diff
-						<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05]">
+						<h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05] text-balance">
 							Ditch the{' '}
 							<span className="hero-highlight">spreadsheet</span>
 						</h1>
```

**Rationale:**
- Drop `text-4xl` → `text-3xl` (1.875rem / 30px) at the base breakpoint. At 30px, "spreadsheet" is ~158px and "Ditch the " is ~80px → ~238px total, fits comfortably in 327px content width with room for the `hero-highlight::after` underline pseudo.
- `sm` (640px+) keeps `text-5xl` (3rem / 48px) — desktop and tablet visual unchanged.
- Add `text-balance` — Tailwind 4 utility that maps to `text-wrap: balance`. Browser distributes line breaks for visually balanced two-line headings. Supported in all evergreen browsers; gracefully degrades on older ones.
- No new tokens introduced. `tracking-tight` and `leading-[1.05]` retained (visual polish only — not the overflow cause).

**Alternative (rejected):** Replace raw Tailwind classes with the project token `text-display-hero` (clamp-based). REJECTED because: (a) cross-cutting refactor outside this phase scope; (b) the existing `landing/hero-section.tsx` and `pricing/page.tsx` use raw Tailwind too — token migration is its own phase (TOKEN-03 sweep, Phase 11).

## CTA Truncation Diagnosis

### Where it lives

`src/app/marketing-home.tsx:45-55`:

```tsx
<div className="flex flex-row gap-4">
  <Button asChild size="lg">
    <Link href="/pricing">
      Start Managing Properties
      <ArrowRight className="ml-2 size-4" />
    </Link>
  </Button>
  <Button asChild variant="outline" size="lg">
    <Link href="/pricing">View Pricing</Link>
  </Button>
</div>
```

### Why CTA cuts off at 375px

[VERIFIED: source read]

1. **`flex flex-row gap-4`** forces the two buttons side-by-side at ALL breakpoints, including 375px. There is no `flex-col sm:flex-row` responsive switch.
2. **Button base classes** include `whitespace-nowrap` (`button.tsx:8`) — labels CANNOT wrap.
3. **`size="lg"`** sets `h-11 rounded-md px-8 min-h-11` (`button.tsx:25`) → `px-8` = 2rem each side = 64px horizontal padding. "Start Managing Properties" ≈ 232px text width at 14px font + 64px padding + 4px gap to ArrowRight + 16px ArrowRight icon = ~316px button. Plus "View Pricing" ≈ 140px. Plus 16px gap (`gap-4`). Total: **~472px** vs. 327px available.
4. The buttons render at full width and the row overflows. `Sheet`'s ancestors (`PageLayout` → `<main>`) do NOT have `overflow-hidden` set — but `marketing-home.tsx` line 26 does have `<section className="relative flex-1 flex flex-col">` and the BODY has implicit `overflow-x: hidden` only at the `body` root via `globals.css` if anywhere. Net effect: the CTA visually appears cut off because the right edge extends past the viewport.

### Fix

**File:line:** `src/app/marketing-home.tsx:45-55`

**Recommended diff:**

```diff
-						<div className="flex flex-row gap-4">
-							<Button asChild size="lg">
+						<div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
+							<Button asChild size="lg" className="w-full sm:w-auto">
 								<Link href="/pricing">
 									Start Managing Properties
 									<ArrowRight className="ml-2 size-4" />
 								</Link>
 							</Button>
-							<Button asChild variant="outline" size="lg">
+							<Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
 								<Link href="/pricing">View Pricing</Link>
 							</Button>
 						</div>
```

**Rationale:**
- `flex-col sm:flex-row` stacks the two CTAs vertically below 640px (the SM breakpoint), side-by-side at SM+. Identical to the pattern already used by `src/components/landing/hero-section.tsx:29`: `flex flex-col sm:flex-row gap-6`. Brownfield-consistent.
- `w-full sm:w-auto` on each Button: at 375px the buttons fill the column; at SM+ they shrink to content. No `whitespace-nowrap` removal needed — buttons get wide enough at full width to fit "Start Managing Properties" without wrapping.
- `gap-4` (`1rem`) is unchanged. Vertical gap on mobile = 16px between stacked CTAs; horizontal gap on desktop = 16px. Both within the spacing scale.
- DO NOT touch `button.tsx`'s `whitespace-nowrap` — global change risks regressions in dense table CTAs and dashboard buttons. The wrapper-level fix is sufficient and surgical.

[VERIFIED: pattern grep] `flex flex-col sm:flex-row` is the project-canonical responsive CTA stack — used in `final-cta-section.tsx`, `hero-section.tsx` (under landing/), `bento-features-section.tsx`, etc.

## Existing Nav Architecture

### Files

| File | Role | Lines |
|------|------|-------|
| `src/components/layout/navbar.tsx` | Top-level marketing navbar — desktop logo + nav + CTA + mobile toggle | 1-112 |
| `src/components/layout/navbar/navbar-desktop-nav.tsx` | Desktop nav links + dropdown logic (`hidden md:flex`) | 1-141 |
| `src/components/layout/navbar/navbar-mobile-menu.tsx` | shadcn Sheet drawer with all 7 links + Sign In + CTA | 1-121 |
| `src/components/layout/navbar/types.ts` | `NavItem`, `NavbarProps`, `DEFAULT_NAV_ITEMS` (5 items: Features, Pricing, Compare, About, Resources-with-dropdown) | 1-35 |
| `src/components/layout/page-layout.tsx` | Renders Navbar + page-offset-navbar spacing + Footer | 1-72 |
| `src/stores/navigation-store.ts` | Zustand `useNavigationStore` — `isMobileMenuOpen` + actions | 1-183 |
| `src/hooks/use-navigation.ts` | Re-export hook over store | 1-15 |

### Responsive hiding rules (current)

- `navbar.tsx:74`: Sign In + CTA → `hidden sm:flex` (visible at 640px+, hidden on small phones)
- `navbar.tsx:91`: Mobile toggle button → `md:hidden` (visible below 768px, hidden on tablet+)
- `navbar-desktop-nav.tsx:89`: Desktop nav row → `hidden md:flex` (hidden below 768px, visible at 768px+)

[VERIFIED: source] At **375px** (iPhone SE), expected layout:
- Logo (left): visible
- Desktop nav: HIDDEN (`hidden md:flex`)
- Sign In + CTA pill: HIDDEN (`hidden sm:flex` — 640px gate, so at 375px these ARE hidden)
- Mobile toggle: VISIBLE (`md:hidden`)

So mobile users at 375px get: logo + hamburger only. Tap hamburger → Sheet opens with all 7 nav links + Sign In + Get Started CTA. **The audit's "ZERO navigation" claim is incorrect for current main** — but the audit may have been observing a deploy from before commit `76292b08a` (2026-03-08), or a stale CDN cache, or it scrolled past the toggle.

### Brownfield audit (does anything else exist?)

| Search | Result |
|--------|--------|
| `MobileNav` / `mobile-nav` | `src/components/ui/mobile-nav.tsx` exists but is the **dashboard bottom-tab nav** (Properties / Tenants / etc.), unrelated to marketing. Has its own test at `src/components/ui/__tests__/mobile-nav.test.tsx`. Out of scope. |
| `Sheet` in `src/components/layout` | Only one usage: `navbar/navbar-mobile-menu.tsx:46`. Already wired. |
| `md:hidden` in marketing nav | One match: `navbar.tsx:91` (the toggle button). Correct. |
| `data-testid="mobile-nav-toggle"` | `navbar.tsx:90`. Test hook already in place. |
| Existing mobile-nav tests in e2e | None. `tests/e2e/tests/homepage.spec.ts` only checks `nav` is visible. No 375px viewport test exists for the marketing nav. |

**Conclusion:** No need to build a new mobile drawer. Polish the existing one + add a 375px e2e test that locks the contract.

## shadcn Sheet Availability

[VERIFIED: file read] `src/components/ui/sheet.tsx` exists — full shadcn implementation wrapping Radix `@radix-ui/react-dialog`.

### Exported components (from `sheet.tsx:121-130`)

```typescript
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
```

### Key behaviors (verified at `sheet.tsx:46-80`)

- `SheetContent` accepts `side="top" | "right" | "bottom" | "left"`. Default `right` (matches our locked decision).
- Side `right` (line 60-61): `inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm` — full-height drawer from right edge, 75% viewport width on mobile, capped at `--breakpoint-sm` width on larger screens.
- Built-in close button at `sheet.tsx:73-76`: `<SheetPrimitive.Close>` with `<XIcon className="size-4" />` + `<span className="sr-only">Close</span>`. Positioned `absolute top-4 right-4`.
- Built-in overlay (`SheetOverlay`, line 31-44): `bg-black/50` semi-transparent backdrop, fades in/out.
- Animation duration: `data-[state=closed]:duration-300 data-[state=open]:duration-500` — these are **Tailwind v4 arbitrary class compiles to `--duration-300` / `--duration-500`** which DO match `globals.css:237-238`. **Token-aligned. Do NOT change.**
- Default Radix dialog behavior preserved: Escape closes + restores focus to trigger; outside click closes; portal renders to body; `aria-modal=true`.

### Polish items needed (NOT install)

shadcn Sheet primitive is fine. The two issues to fix are in `navbar-mobile-menu.tsx` (its consumer):

1. **Close button has no `aria-label`** (only `sr-only` "Close" text) — per CLAUDE.md icon-only rule we want `aria-label="Close navigation menu"`. **HOWEVER**, the close button is rendered INSIDE `sheet.tsx:73-76` (a primitive shared across the app). We have two options:
   - **Option A (recommended):** Add `showCloseButton={false}` style override in `SheetContent` — render our own `SheetClose` with explicit `aria-label`. But the current primitive doesn't expose that prop. We'd need to either edit `sheet.tsx` to accept it, OR override via a custom Close inside our drawer. Cleanest path: add a `showCloseButton` prop to `sheet.tsx` (default `true` — backward compat).
   - **Option B (less invasive):** Add an explicit `aria-label="Close navigation menu"` to the existing `SheetPrimitive.Close` in `sheet.tsx:73`. Site-wide change but the closest current label says "Close" which is OK for non-nav drawers — the more specific label is fine for nav too. **Pick this — minimal surface change.**
2. **Drawer width** — current `w-[300px] sm:w-[350px]` (`navbar-mobile-menu.tsx:47`) is arbitrary px values. Recommend dropping the `className` width override entirely → fall back to shadcn primitive's `w-3/4 sm:max-w-sm` default. At 375px, `w-3/4` = ~281px, slightly narrower than the current 300px but well within tap-friendly bounds. **No new tokens, drops one ad-hoc px declaration.**

## Hamburger Component Design

The component already exists. Below is the polished spec the planner should target. Three files touched (`navbar.tsx`, `navbar-mobile-menu.tsx`, `sheet.tsx`).

### Trigger button (`src/components/layout/navbar.tsx:87-94`)

**Current:**
```tsx
<button
  onClick={toggleMobileMenu}
  aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
  data-testid="mobile-nav-toggle"
  className="md:hidden p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
>
  {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
</button>
```

**Issues:**
- `p-2` = 8px on each side → 20px icon + 16px padding = 36px box. Below 44px touch-target floor.
- No `min-w-11 min-h-11` (the `--touch-target-min` enforcement). The mobile media query at `globals.css:1444-1450` DOES apply `min-h: var(--touch-target-min); min-w: var(--touch-target-min)` to all `button` elements at `@media (max-width: 768px)`, BUT relying on a media query block is fragile — explicit `min-h-11 min-w-11` Tailwind classes make it deterministic.

**Recommended diff:**
```diff
 					<button
 						onClick={toggleMobileMenu}
 						aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
 						data-testid="mobile-nav-toggle"
-						className="md:hidden p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
+						className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
 					>
 						{isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
 					</button>
```

`min-h-11 min-w-11` = 2.75rem = 44px exact. Aligned to `--touch-target-min` per `globals.css:273` (the Tailwind class compiles to the same value because the spacing scale at `globals.css:189` defines `--spacing-11: 2.75rem`).

### Drawer width (`navbar-mobile-menu.tsx:47`)

**Recommended diff:**
```diff
-			<SheetContent side="right" className="w-[300px] sm:w-[350px]">
+			<SheetContent side="right">
```

Falls back to shadcn primitive default `w-3/4 sm:max-w-sm` (line 61 of `sheet.tsx`). Drops the ad-hoc px override.

### Sheet primitive Close aria-label (`sheet.tsx:73-76`)

**Recommended diff:**
```diff
-				<SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
+				<SheetPrimitive.Close
+					aria-label="Close"
+					className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 inline-flex items-center justify-center min-h-11 min-w-11 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
+				>
 					<XIcon className="size-4" />
-					<span className="sr-only">Close</span>
+					<span className="sr-only">Close dialog</span>
 				</SheetPrimitive.Close>
```

Why "Close" (not "Close navigation menu"): `sheet.tsx` is a SITE-WIDE primitive used in any drawer (admin panels, mobile nav, etc.). Generic label avoids regressions. The `<span className="sr-only">Close dialog</span>` becomes the accessible name (more specific than just "Close"). The drawer's `<SheetTitle>Menu</SheetTitle>` provides context for the dialog.

[ASSUMED] If the planner wants tighter-context labeling per drawer (e.g. specifically "Close navigation menu"), the cleanest path is to extend `SheetContent` with a `closeLabel?: string` prop that overrides the close button's accessible name. That's a 6-line change to `sheet.tsx`. **Risk-if-wrong:** very low — additive prop, defaults preserve current behavior. Flag to planner; not strictly required by CRIT-04.

### Drawer items (`navbar-mobile-menu.tsx:53-114`)

Already implements the 5 nav items + Sign In + CTA. Each item closes the sheet on click via `onClick={() => onClose()}` (lines 57, 85, 102, 109).

**No changes needed.**

[VERIFIED: source] All 7 items locked in CONTEXT.md ARE present:
1. Features (DEFAULT_NAV_ITEMS[0])
2. Pricing (DEFAULT_NAV_ITEMS[1])
3. Compare (DEFAULT_NAV_ITEMS[2])
4. About (DEFAULT_NAV_ITEMS[3])
5. Resources (DEFAULT_NAV_ITEMS[4] — has nested dropdown of Blog/Free Resources/Help/FAQ/Contact)
6. Sign In (hardcoded `/login` link, line 100-106)
7. Get Started CTA (line 107-114, uses `ctaText` + `ctaHref` props)

### Resources dropdown UX inside drawer

Current: clicking the row opens a Link to `#` (hashtag href since `Resources` is a dropdown parent). The ChevronDown nested inside has `e.preventDefault()` to stop the parent link navigation when toggling. **Latent bug:** the row-Link wraps the entire row, including the chevron — so clicking ANYWHERE on the row triggers the Link's `onClick={() => !item.hasDropdown && onClose()}` (which is a no-op for hasDropdown=true items) AND Link's default navigation to `href="#"` fires, scrolling the page to top.

[VERIFIED: source `navbar-mobile-menu.tsx:55-76`] Yes, the chevron's preventDefault stops it; but if the user taps anywhere ELSE on the row (the text "Resources" or empty padding), the `<Link href="#">` navigates to `#` — which adds a `#` to the URL but otherwise no harm. Annoying UX but not a 375px-overflow blocker.

**Recommend:** Out of scope for Phase 2 (not on CRIT-04). Flag for Phase 8 CONS-11 (which already covers "Resources nav dropdown items navigate to real URLs").

## E2E Test Strategy

### File location

`tests/e2e/tests/public/mobile-nav-375px.spec.ts`

Lives in the `public/` project (no auth, runs against the marketing surface without login). The Playwright config (`tests/e2e/playwright.config.ts:174-181`) routes `**/public/**/*.spec.ts` through the `public` project with `storageState: { cookies: [], origins: [] }`.

### Viewport setup

```typescript
test.use({
  viewport: { width: 375, height: 667 } // iPhone SE 1st gen
})
```

[VERIFIED: existing usage] Pattern matches `tests/e2e/tests/_archived/pricing-premium.spec.ts:61` (`page.setViewportSize({ width: 375, height: 667 })`). Modern usage is `test.use({ viewport })` at the top of a `describe` block.

### Assertions

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
      htmlScrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth
    }))
    // Allow 1px tolerance for sub-pixel rounding
    expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1)
    expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1)
  })

  test('"Start Managing Properties" CTA is fully visible', async ({ page }) => {
    const cta = page.getByRole('link', { name: /Start Managing Properties/i })
    await expect(cta).toBeVisible()
    const box = await cta.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 1) // sub-pixel tolerance
  })

  test('hamburger toggle is visible top-right', async ({ page }) => {
    const toggle = page.getByTestId('mobile-nav-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-label', 'Open navigation menu')
    const box = await toggle.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })

  test('tapping hamburger opens drawer with all 7 items', async ({ page }) => {
    await page.getByTestId('mobile-nav-toggle').click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    // 5 desktop nav items + Sign In + Get Started CTA
    await expect(drawer.getByRole('link', { name: /^Features$/ })).toBeVisible()
    await expect(drawer.getByRole('link', { name: /^Pricing$/ })).toBeVisible()
    await expect(drawer.getByRole('link', { name: /^Compare$/ })).toBeVisible()
    await expect(drawer.getByRole('link', { name: /^About$/ })).toBeVisible()
    await expect(drawer.getByRole('link', { name: /^Resources$/ })).toBeVisible()
    await expect(drawer.getByRole('link', { name: /^Sign In$/ })).toBeVisible()
    await expect(drawer.getByRole('link', { name: /Get Started/i })).toBeVisible()
  })

  test('tapping Pricing link closes drawer and navigates', async ({ page }) => {
    await page.getByTestId('mobile-nav-toggle').click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await drawer.getByRole('link', { name: /^Pricing$/ }).click()
    await page.waitForURL('**/pricing')
    await expect(drawer).not.toBeVisible()
  })

  test('Escape key closes the drawer', async ({ page }) => {
    await page.getByTestId('mobile-nav-toggle').click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeVisible()
    // Focus restored to the trigger
    await expect(page.getByTestId('mobile-nav-toggle')).toBeFocused()
  })

  test('clicking close button (X) closes the drawer', async ({ page }) => {
    await page.getByTestId('mobile-nav-toggle').click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    // Sheet primitive renders a close button with sr-only "Close dialog"
    await drawer.getByRole('button', { name: /Close/i }).click()
    await expect(drawer).not.toBeVisible()
  })

  test('clicking outside the drawer closes it', async ({ page }) => {
    await page.getByTestId('mobile-nav-toggle').click()
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    // Click on the overlay (the visible backdrop, not the drawer itself)
    await page.locator('[data-state="open"]').first().click({
      position: { x: 10, y: 100 } // top-left of overlay
    })
    await expect(drawer).not.toBeVisible()
  })
})
```

### Test invariants

| # | Assertion | What it locks |
|---|-----------|---------------|
| 1 | `bodyScrollWidth <= viewport + 1` | Hero overflow regression — proves no horizontal scroll |
| 2 | CTA bounding box `x + width <= 375 + 1` | CTA truncation regression — proves the button fits |
| 3 | Toggle bbox ≥ 44×44 | Touch target regression — locks the `min-h-11 min-w-11` class |
| 4 | All 7 items visible in drawer | Drawer contents regression — locks DEFAULT_NAV_ITEMS |
| 5 | Link click closes drawer + navigates | Auto-close UX |
| 6 | Escape closes + focus returns to trigger | Keyboard accessibility (Radix default) |
| 7 | Close button (X) closes drawer | Click-to-close X UX |
| 8 | Outside-click closes | Click-outside UX |

### Wave-0 considerations (per nyquist_validation)

- **No new framework install** — Playwright + project pattern already in place.
- **No fixtures needed** — public route, no auth.
- Existing `tests/e2e/tests/public/seo-smoke.spec.ts` confirms the pattern.

## Design-Token Mapping

Every visual choice in the planned diffs maps to an existing `globals.css` token or Tailwind utility that compiles to one. **No new hex/rgb/inline-ms introduced.**

| Choice | Token / utility | Source |
|--------|-----------------|--------|
| Hero `<h1>` base size `text-3xl` | `--text-3xl` (Tailwind 4 default scale) | Tailwind 4 default theme |
| Hero `<h1>` `text-balance` | CSS `text-wrap: balance` | Native CSS, no token |
| `tracking-tight` | `letter-spacing: -0.025em` | Tailwind 4 default |
| `leading-[1.05]` (kept) | Arbitrary line-height — pre-existing | Pre-existing in code |
| CTA wrapper `flex flex-col sm:flex-row gap-4` | `--spacing-4` = 1rem | `globals.css:182` |
| Button width `w-full sm:w-auto` | Tailwind utility | — |
| Toggle `min-h-11 min-w-11` | `--spacing-11` = 2.75rem = 44px = `--touch-target-min` | `globals.css:189, 273` |
| Toggle `inline-flex items-center justify-center` | Tailwind utility | — |
| Toggle `p-2` (kept) | `--spacing-2` = 0.5rem | `globals.css:178` |
| Toggle `rounded-lg` | `--radius-lg` (Tailwind compiles via `@theme`) | `globals.css` (Tailwind 4 maps) |
| Toggle `transition-colors duration-fast` (kept) | `--duration-fast` (custom token in `globals.css`) | `globals.css` (Tailwind 4 mapping) |
| Toggle text colors `text-foreground/70` `hover:bg-muted/50` | `--color-foreground` `--color-muted` | `globals.css @theme` |
| Sheet width `w-3/4 sm:max-w-sm` (kept default) | Tailwind utility — `sm:max-w-sm` = `--breakpoint-sm` | Tailwind 4 default |
| Sheet animation `data-[state=closed]:duration-300 data-[state=open]:duration-500` | `--duration-300` `--duration-500` | `globals.css:237-238` |
| Sheet overlay `bg-black/50` | Native + Tailwind opacity — same primitive site-wide | Pre-existing in `sheet.tsx` |
| Sheet close button `min-h-11 min-w-11` | `--touch-target-min` | `globals.css:273` |
| Hamburger icon | `lucide-react` `Menu` / `X` | Already imported `navbar.tsx:8` |

[VERIFIED: globals.css read for every cited line] No new tokens. No `bg-white`. No hex. No inline ms. No emoji.

## Risk Matrix

| Risk | Likelihood | Severity | Mitigation |
|------|------------|----------|------------|
| Hero `text-3xl` shrinks heading too aggressively at 375-639px | LOW | LOW (cosmetic) | `text-balance` + tight tracking maintain visual weight; verify in Chrome DevTools 375px preset before merge per CONTEXT.md "live verification matters" lesson |
| `text-balance` not supported on old browsers | VERY LOW | NONE | Falls back to default text-wrap. Evergreen Chrome/Safari/Firefox all support since 2023. No regression. |
| `flex-col sm:flex-row` change breaks desktop CTA layout | LOW | LOW | At SM+ (640px+) layout returns to `flex-row` identical to today. Verify in DevTools at 640px and 1024px before merge. |
| `w-full sm:w-auto` makes buttons too wide on landscape mobile | MEDIUM | LOW | At SM+ (640px) reverts to `auto`. Landscape iPhone SE = 667×375 (height 375), unaffected. |
| Touch-target change to `min-h-11 min-w-11` breaks toggle visual at desktop sizes | NONE | NONE | Toggle is `md:hidden` — never visible at md+. Change is mobile-only by class scope. |
| Adding `aria-label="Close"` to `sheet.tsx` close button affects all drawers site-wide | LOW | LOW | Generic label is correct for any modal. The `<SheetTitle>` provides per-drawer context. No existing drawer test breaks (verified — no e2e test asserts the close button's accessible name today). |
| Removing `w-[300px] sm:w-[350px]` from drawer changes desktop drawer width | LOW | NONE | Desktop will use `w-3/4 sm:max-w-sm` = at SM+ caps at 384px (`max-w-sm` = 24rem). Today it's 350px. Difference: 34px wider on tablet/desktop. Acceptable — closer to shadcn canon. |
| Audit was right and the live deploy genuinely lacks the toggle (CDN cache or build-time issue) | LOW (verified the toggle exists in source main) | HIGH | After deploy, manually verify in Chrome DevTools at 375px AND on a real iPhone SE per CONTEXT.md "live verification matters" lesson from Phase 1. |
| New e2e spec flakes on Sheet animation timing | LOW | MEDIUM | Test relies on `expect(...).toBeVisible()` / `not.toBeVisible()` — Playwright auto-waits up to 5s (`expect.timeout` from config). If flake observed, add `await page.waitForTimeout(500)` after toggle click. **Avoid hard-coded waits** unless confirmed flaky. |
| Changing close button style adds visible 44×44 button where today it's smaller | LOW | LOW (visual) | The close button is `absolute top-4 right-4` so increasing its hit-target box doesn't reflow content. The X icon stays `size-4`; the button just expands invisible padding. Verify visual at 375px. |

## Open Questions (RESOLVED)

1. **Should we add `showCloseButton` and `closeLabel` props to `sheet.tsx`?**
   - What we know: minimal change, additive, defaults preserve behavior.
   - What's unclear: whether the planner wants per-drawer label customization or accepts generic "Close dialog" sr-only label.
   - Recommendation: ship the generic label change (Option B above). If a future drawer needs a custom label, add the prop then. Don't preemptively widen the API.

2. **Should the hero typography migrate to the project's `--text-display-hero` clamp token?**
   - What we know: `globals.css:37` defines `--text-display-hero: clamp(3rem, 8vw, 5rem)` but no marketing page uses it. Inconsistent with the cross-cutting design-token constraint.
   - What's unclear: whether v1.0 wants this consolidation now vs deferred.
   - Recommendation: DEFER. The CONTEXT.md scope is overflow fix only. TOKEN-03 (Phase 11) is the proper place for typography token consolidation.

3. **Does the audit's "no hamburger" mean the deploy is genuinely broken, or just that the auditor scrolled past it?**
   - What we know: Source main has the toggle wired since 2026-03-08. No subsequent commits removed it.
   - What's unclear: what the auditor actually saw on prod.
   - Recommendation: Phase 2 plan must include a **post-deploy live-Chrome-DevTools-at-375px verification step** (per CONTEXT.md Phase 1 lessons), confirming: toggle visible, drawer opens, all 7 links work. If the auditor's claim was a stale cache, this lock-in test eliminates the risk going forward.

## Confidence Levels

| Recommendation | Confidence | Rationale |
|---------------|-----------|-----------|
| Hero `text-3xl` + `text-balance` fix | HIGH | Source-verified; brownfield-consistent with `landing/hero-section.tsx` |
| CTA `flex-col sm:flex-row` + `w-full sm:w-auto` fix | HIGH | Brownfield-canonical pattern; verified in 4+ existing components |
| Toggle button `min-h-11 min-w-11` | HIGH | Token-aligned to `--touch-target-min` |
| Sheet close `aria-label="Close"` + `min-h-11 min-w-11` | HIGH | Site-wide primitive change is low risk; aria-label is additive |
| Drop drawer width override `w-[300px] sm:w-[350px]` | HIGH | Falls back to shadcn canon; no functional regression |
| E2E spec at 375px in `tests/e2e/tests/public/` | HIGH | Pattern-matches existing `seo-smoke.spec.ts` |
| Audit-claim "no hamburger" interpretation | MEDIUM | Source clearly contains a wired toggle; auditor observation is uncorroborated. Plan must include live verification. |
| `text-balance` browser support | HIGH | Evergreen browser support since 2023 (verified via [CITED: caniuse.com/css-text-wrap-balance]) |

## Sources

### Primary (HIGH confidence — source-of-truth in this repo)
- `src/app/marketing-home.tsx` (hero + CTA)
- `src/components/layout/navbar.tsx` (toggle button + responsive hiding)
- `src/components/layout/navbar/navbar-mobile-menu.tsx` (existing Sheet drawer)
- `src/components/layout/navbar/navbar-desktop-nav.tsx` (desktop hidden md:flex)
- `src/components/layout/navbar/types.ts` (`DEFAULT_NAV_ITEMS`)
- `src/components/ui/sheet.tsx` (shadcn primitive — exists, fully wired)
- `src/components/ui/button.tsx` (`whitespace-nowrap` + size scale)
- `src/components/layout/page-layout.tsx` (page-offset-navbar wrapper)
- `src/stores/navigation-store.ts` + `src/hooks/use-navigation.ts` (mobile menu state)
- `src/app/globals.css` (token authority — verified `--touch-target-min`, `--spacing-*`, `--duration-*`, `--ease-*`, `hero-highlight` utility)
- `tests/e2e/playwright.config.ts` (project routing for `public/` specs)
- `tests/e2e/tests/public/seo-smoke.spec.ts` (test pattern reference)
- `tests/e2e/tests/_archived/pricing-premium.spec.ts:61` (375×667 viewport precedent)
- `git log src/components/layout/navbar.tsx` (commit `76292b08a` 2026-03-08 added the responsive mobile navbar — existing not new)

### Secondary (HIGH-MEDIUM confidence — official docs)
- shadcn Sheet docs: https://ui.shadcn.com/docs/components/sheet [CITED]
- Radix Dialog docs: https://www.radix-ui.com/primitives/docs/components/dialog [CITED] — keyboard / focus-restore behavior

### Tertiary
- `caniuse.com/css-text-wrap-balance` [ASSUMED — based on training, not verified this session]: `text-wrap: balance` is supported in Chrome 114+, Safari 17.5+, Firefox 121+. All evergreen.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `text-wrap: balance` supported by all evergreen browsers since 2023 | Hero Overflow Diagnosis | LOW — falls back to default wrapping; no regression |
| A2 | Generic `aria-label="Close"` on the site-wide `sheet.tsx` close button is correct for all current drawers | Hamburger Component Design | LOW — the `<SheetTitle>` provides per-drawer context; no current drawer test asserts a different label |
| A3 | Audit's "no hamburger" claim is stale, not a current-prod regression | Existing Nav Architecture | MEDIUM — if the live deploy genuinely lacks the toggle (CDN cache / build issue), the plan must include a live-verification step before claiming complete. Recommended in Open Questions #3. |
| A4 | "Start Managing Properties" CTA character width measurement (~232px at 14px) is approximate | CTA Truncation Diagnosis | LOW — directional argument is correct (lg button + lg button + gap > viewport); precise px is irrelevant |

## Project Constraints (from CLAUDE.md)

These rules MUST be honored in the planned diffs:

- ✅ No `any` types — diffs introduce no new types
- ✅ No barrel files / re-exports — no new files create indexes
- ✅ No commented-out code
- ✅ No inline styles — all changes use Tailwind utilities or `globals.css` custom properties
- ✅ No hex / rgb / `bg-white` — all colors via `--color-*` tokens
- ✅ No emojis in code — only Lucide icons (`Menu`, `X` already imported)
- ✅ No `as unknown as` type assertions — diffs introduce no type assertions
- ✅ Icon-only buttons get `aria-label` — toggle has `aria-label`; sheet close button gets explicit `aria-label="Close"`
- ✅ `bg-background` / `bg-card` / `bg-muted` — diffs touch only existing `bg-muted/50`, `bg-background`
- ✅ `text-muted-foreground` — diffs touch only existing `text-foreground/70`, `text-foreground`
- ✅ `lucide-react` only — no other icon library
- ✅ Max 300 lines per component — `navbar.tsx` 112 lines, `navbar-mobile-menu.tsx` 121 lines, `sheet.tsx` 131 lines, all unchanged in scope
- ✅ Server Components by default — drawer components correctly marked `'use client'`
- ✅ Touch target ≥44×44px on mobile — explicitly added via `min-h-11 min-w-11`

## Metadata

**Confidence breakdown:**
- Hero overflow diagnosis: HIGH — source-verified, root cause clear
- CTA truncation diagnosis: HIGH — source-verified `whitespace-nowrap` + `flex flex-row` (no responsive)
- Hamburger architecture: HIGH — drawer EXISTS in source, audit claim is partially stale
- Polish recommendations: HIGH — additive changes, brownfield-consistent
- E2E test design: HIGH — matches existing project patterns

**Research date:** 2026-05-09
**Valid until:** 2026-06-08 (30 days for stable visual REQ; re-verify if marketing-home.tsx or navbar files churn)

---

*Phase 2 Specialist 2 of 2 — Mobile hero + hamburger drawer*
*Specialist 1 of 2 covers NumberTicker animation in `02-RESEARCH-numberticker.md`*
