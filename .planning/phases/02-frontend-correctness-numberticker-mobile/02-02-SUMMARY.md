---
phase: 02-frontend-correctness-numberticker-mobile
plan: 02
subsystem: marketing-frontend
tags:
  - frontend
  - mobile
  - responsive
  - shadcn-sheet
  - accessibility
  - playwright-e2e
dependency_graph:
  requires:
    - "src/app/marketing-home.tsx (existing hero h1 + CTA wrapper)"
    - "src/components/layout/navbar.tsx (existing toggle button at L87-94)"
    - "src/components/layout/navbar/navbar-mobile-menu.tsx (existing SheetContent consumer)"
    - "src/components/ui/sheet.tsx (shadcn primitive — close button at L73-76)"
    - "src/app/globals.css (--touch-target-min token at L273)"
  provides:
    - "375px-overflow-free hero (text-3xl base + text-balance)"
    - "375px-fitting CTAs (flex-col sm:flex-row + w-full sm:w-auto)"
    - "44x44 touch target on mobile toggle (min-h-11 min-w-11)"
    - "44x44 touch target + explicit aria-label='Close' on Sheet primitive close button"
    - "Default-width drawer (drops ad-hoc w-[300px] sm:w-[350px] override)"
    - "8-assertion Playwright spec locking the 375px contract"
  affects:
    - "Every drawer site-wide (sheet.tsx is shared primitive — close button now has aria-label='Close' + 44x44 + 'Close dialog' sr-only)"
tech_stack:
  added: []
  patterns:
    - "Tailwind 4 text-balance utility (CSS text-wrap: balance)"
    - "Brownfield-canonical responsive CTA pattern (flex flex-col sm:flex-row + w-full sm:w-auto), matches landing/hero-section.tsx"
    - "shadcn Sheet primitive defaults (w-3/4 sm:max-w-sm) instead of ad-hoc px values"
    - "Coordinate-only outside-click test (page.mouse.click(10, 100)) avoiding fragile [data-state] locators"
key_files:
  created:
    - "tests/e2e/tests/public/mobile-nav-375px.spec.ts (93 lines, 8 tests)"
  modified:
    - "src/app/marketing-home.tsx (hero h1 + CTA wrapper)"
    - "src/components/layout/navbar.tsx (mobile toggle 44x44)"
    - "src/components/layout/navbar/navbar-mobile-menu.tsx (drop ad-hoc width override)"
    - "src/components/ui/sheet.tsx (close button aria-label + 44x44 + sr-only specificity)"
decisions:
  - "Generic aria-label='Close' on the site-wide Sheet primitive (per-drawer context comes from <SheetTitle>)"
  - "sr-only span text 'Close dialog' for accessibility specificity (AT clarity)"
  - "Drop ad-hoc w-[300px] sm:w-[350px] in favor of shadcn default w-3/4 sm:max-w-sm"
  - "Coordinate-only outside-click in test 8 (page.mouse.click(10, 100)) — drawer left edge ≈94px at 375px, x:10 lands on overlay"
  - "Skip local pre-PR e2e run — sandbox blocks .env.local read for `pnpm dev`; CI runs against Vercel preview per .github/workflows/e2e-smoke.yml"
  - "next build smoke skipped — sandbox/permission denied; partial coverage via successful typecheck + lint + unit tests in lefthook pre-commit"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-05-09"
  tasks_completed: 5
  files_created: 1
  files_modified: 4
  commits: 3
---

# Phase 2 Plan 02: Frontend Correctness — Mobile Hero + Hamburger Drawer Polish Summary

**One-liner:** Hero shrunk to text-3xl base + text-balance, CTA wrapper switched to flex-col sm:flex-row + w-full sm:w-auto, mobile toggle and Sheet close button both gain explicit 44×44 touch targets, drawer width override dropped in favor of shadcn defaults, and 8-test Playwright spec locks the 375×667 contract.

## Tasks Completed

| Task | Status | Commit | Files |
|------|--------|--------|-------|
| 1. Hero overflow + CTA truncation | ✓ | `1635f0bcb` | `src/app/marketing-home.tsx` |
| 2. Drawer polish — toggle 44×44, default width, Sheet close a11y | ✓ | `e819842fc` | `src/components/layout/navbar.tsx`, `src/components/layout/navbar/navbar-mobile-menu.tsx`, `src/components/ui/sheet.tsx` |
| 3. New 8-test Playwright spec at 375×667 | ✓ | `6c334e7eb` | `tests/e2e/tests/public/mobile-nav-375px.spec.ts` |
| 4. Pre-commit verification gates | ✓ | (no commit — verification only) | — |
| 5. Post-deploy live 375px DevTools verification | Auto-approved (auto-mode) | — | manual operator step |

## Verbatim Diffs Applied

### Task 1: `src/app/marketing-home.tsx`

**Hero h1 (L33):**
```diff
-						<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05]">
+						<h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tight leading-[1.05] text-balance">
 							Ditch the{' '}
 							<span className="hero-highlight">spreadsheet</span>
 						</h1>
```

**CTA wrapper (L45-55):**
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

### Task 2: `src/components/layout/navbar.tsx`

**Mobile toggle button (L91):**
```diff
 					<button
 						onClick={toggleMobileMenu}
 						aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
 						data-testid="mobile-nav-toggle"
-						className="md:hidden p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
+						className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
 					>
```

### Task 2: `src/components/layout/navbar/navbar-mobile-menu.tsx`

**SheetContent (L47):**
```diff
-			<SheetContent side="right" className="w-[300px] sm:w-[350px]">
+			<SheetContent side="right">
```

### Task 2: `src/components/ui/sheet.tsx`

**SheetPrimitive.Close (L73-76):**
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

### Task 3: `tests/e2e/tests/public/mobile-nav-375px.spec.ts` (NEW — 93 lines)

8 tests at `viewport: { width: 375, height: 667 }`:

1. `hero does not horizontally overflow viewport` — body/html scrollWidth ≤ 376
2. `"Start Managing Properties" CTA is fully visible` — bbox.x + bbox.width ≤ 376
3. `hamburger toggle is visible top-right with 44x44 hit target` — bbox.width ≥ 44, bbox.height ≥ 44
4. `tapping hamburger opens drawer with all 7 items` — Features/Pricing/Compare/About/Resources/Sign In/Get Started visible
5. `tapping Pricing link closes drawer and navigates` — `**/pricing` URL match
6. `Escape key closes the drawer and restores focus to trigger` — focus assert on toggle
7. `clicking close button (X) closes the drawer` — `getByRole('button', { name: /Close/i })`
8. `clicking outside the drawer closes it` — `page.mouse.click(10, 100)` (coordinate-only, geometry comment)

## Pre-flight Verification Results

### File-level greps (Task 4)

| Grep | Expected | Actual | Pass |
|------|----------|--------|------|
| `text-balance` in marketing-home.tsx | ≥1 | 1 | ✓ |
| `flex flex-col sm:flex-row` in marketing-home.tsx | ≥1 | 1 | ✓ |
| `min-h-11 min-w-11` in navbar.tsx | ≥1 | 1 | ✓ |
| `aria-label="Close"` in sheet.tsx | ≥1 | 1 | ✓ |
| `min-h-11 min-w-11` in sheet.tsx | ≥1 | 1 | ✓ |
| `w-\[3[0-9]+px\]` in navbar-mobile-menu.tsx | 0 | 0 | ✓ |

### Cross-cutting design-token grep (Phase 2 SC-4)

```
$ grep -nE '(#[0-9a-fA-F]{3,8}|rgb\(|bg-white|\[[0-9]+ms\])' \
    src/app/marketing-home.tsx \
    src/components/layout/navbar.tsx \
    src/components/layout/navbar/navbar-mobile-menu.tsx \
    src/components/ui/sheet.tsx \
    tests/e2e/tests/public/mobile-nav-375px.spec.ts
(no output — 0 matches)
```

**Result: 0 hits across all 5 touched files** — no new hex/rgb/`bg-white`/inline-ms drift.

### Quality gates

| Gate | Result | Output |
|------|--------|--------|
| `pnpm typecheck` | PASS | Run via lefthook on each commit (1.91-1.94s) |
| `pnpm lint -- <touched files>` | PASS | Run via lefthook on each commit (1.16-1.20s) |
| `pnpm test:unit` | PASS | 128 test files, 100,028 tests pass (~14s) |
| `pnpm test:unit -- src/components/ui/__tests__/` | PASS | 128/128 files, 100,028/100,028 tests |
| `next build` (React Compiler smoke) | SKIPPED | Sandbox/permission denied; partial coverage via typecheck + unit tests. CI re-runs build per `.github/workflows/e2e-smoke.yml` |
| Local e2e (`pnpm test:e2e -- --project=public --grep "Mobile nav at 375px viewport"`) | SKIPPED | Local `pnpm dev` requires `.env.local` (denied in sandbox). CI runs spec against Vercel preview. |

### Commit-level verification (lefthook pre-commit on each commit)

All 3 task commits passed lefthook (`gitleaks`, `lockfile-verify`, `lint`, `typecheck`, `unit-tests`, `commitlint`):
- `1635f0bcb` — Task 1
- `e819842fc` — Task 2
- `6c334e7eb` — Task 3

100,028 unit tests passed on each commit. No regressions.

## E2E Spec Status

- **Local pre-PR run:** SKIPPED. The sandbox in this execution context denies reads of `.env.*` files, so `pnpm dev` (which loads Supabase keys, Stripe keys, Sentry config from `.env.local`) cannot start. Documented in SUMMARY.
- **CI fallback:** When the PR is raised, `.github/workflows/e2e-smoke.yml` runs the full Playwright `public` project against the Vercel preview deployment. The 8 new assertions in `mobile-nav-375px.spec.ts` will be exercised there.
- **Post-deploy verification:** Task 5 walkthrough below covers manual 375px DevTools sanity check after Vercel main deploy.

## Out-of-Scope Items NOT Touched

- ✓ `src/components/ui/button.tsx` — `whitespace-nowrap` retained (no global change)
- ✓ Resources `href="#"` placeholder — Phase 8 CONS-11 owns
- ✓ `loading.tsx` — not added or modified (Phase 1 lesson honored)
- ✓ `src/components/layout/navbar/navbar-desktop-nav.tsx` — out of scope
- ✓ `src/components/layout/page-layout.tsx` — out of scope
- ✓ `src/stores/navigation-store.ts` — out of scope
- ✓ `src/components/ui/number-ticker.tsx` — sister Plan 02-01 owns
- ✓ Persona/copy strings — Phase 4 owns

## Deviations from Plan

**None for code logic** — plan executed verbatim per the diff specs in `02-RESEARCH-mobile-hamburger.md`.

**Two execution-environment notes (not deviations):**

1. **Local e2e run skipped.** Plan acceptance criteria for Task 3 mention "RUN LOCALLY BEFORE RAISING PR" with explicit fallback to CI-only documentation. Sandbox denies `.env.*` reads → cannot start `pnpm dev`. CI on PR will run the spec against Vercel preview. Documented per Task 3 done-criterion explicit fallback path.
2. **`next build` smoke skipped.** Sandbox denied the command (likely `.next/` write or env). Quality coverage is provided by `pnpm typecheck` (passed) + `pnpm test:unit` (100,028/100,028 passed). CI runs the full build per `.github/workflows/e2e-smoke.yml`.

## Task 5 — Manual 375px DevTools Verification Steps (auto-approved per auto-mode)

Auto-mode is active (`workflow.auto_advance = true`, `workflow._auto_chain_active = true`); per the executor checkpoint protocol the `checkpoint:human-verify` is auto-approved. The manual walkthrough below is the recommended post-deploy step the operator should run **after** Vercel main deploy lands the changes.

**Steps (per plan `<how-to-verify>`):**

1. Open Chrome → DevTools → Toggle device toolbar (Cmd+Shift+M).
2. Set device preset to "iPhone SE" (375×667) OR custom 375×667.
3. Navigate to `https://tenantflow.app/`.
4. **Hero overflow check (CRIT-04 part 1):** "Ditch the spreadsheet" wraps within viewport — no horizontal scroll bar.
5. **CTA truncation check (CRIT-04 part 2):** "Start Managing Properties" right edge ≤ 375px; "View Pricing" stacks BELOW at 375px; resize to 640px+ → side-by-side.
6. **Hamburger drawer check (CRIT-04 part 3):**
   - Toggle visible top-right of nav bar.
   - Tap → Sheet drawer slides in from right.
   - All 7 nav items visible: Features, Pricing, Compare, About, Resources, Sign In, Get Started.
   - Tap Pricing link → drawer closes + page navigates to `/pricing`.
   - Re-open → press Escape → drawer closes + focus returns to hamburger trigger.
   - Re-open → tap X close button (top-right of drawer) → drawer closes.
   - Re-open → tap dimmed area outside drawer → drawer closes.
7. **Touch target check:** Inspect hamburger toggle in DevTools Elements panel — `min-height` and `min-width` resolve to 44px (computed style). Same for Sheet close button.
8. **Console check:** zero errors / zero React hydration mismatch warnings.
9. **Cross-breakpoint sanity:** 640px → CTAs side-by-side, hero `text-5xl`, hamburger HIDDEN. 1024px → desktop nav VISIBLE, hamburger HIDDEN.

**WHY non-optional:** Phase 1 lesson — Specialist-2 source claims must be corroborated by live verification. The audit's "no hamburger" claim was uncorroborated by source (drawer wired since `76292b08a`, 2026-03-08); live 375px verification eliminates source-only-trust failure mode.

**Auto-mode log entry:** `Auto-approved: hero overflow + CTA + drawer polish + 8-test e2e at 375px (Phase 2 Plan 02 Task 5).`

## Self-Check: PASSED

- ✓ `src/app/marketing-home.tsx` modified with text-balance + flex-col sm:flex-row (greps confirm)
- ✓ `src/components/layout/navbar.tsx` modified with min-h-11 min-w-11 (grep confirms)
- ✓ `src/components/layout/navbar/navbar-mobile-menu.tsx` ad-hoc width removed (grep confirms 0 matches)
- ✓ `src/components/ui/sheet.tsx` aria-label="Close" + min-h-11 min-w-11 + sr-only "Close dialog" (greps confirm)
- ✓ `tests/e2e/tests/public/mobile-nav-375px.spec.ts` created (93 lines, 8 tests, file existence confirmed)
- ✓ Commits in git log: `1635f0bcb`, `e819842fc`, `6c334e7eb` (verified via `git log --oneline`)

## Files

- `src/app/marketing-home.tsx` — modified
- `src/components/layout/navbar.tsx` — modified
- `src/components/layout/navbar/navbar-mobile-menu.tsx` — modified
- `src/components/ui/sheet.tsx` — modified (site-wide primitive)
- `tests/e2e/tests/public/mobile-nav-375px.spec.ts` — NEW

---

*Phase 2 Plan 02 — Frontend Correctness (Mobile Hero + Hamburger Drawer Polish)*
*Completed 2026-05-09 — auto-mode auto-approved Task 5 checkpoint*
