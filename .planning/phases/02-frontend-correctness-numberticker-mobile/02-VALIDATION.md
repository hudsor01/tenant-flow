---
phase: 02-frontend-correctness-numberticker-mobile
phase_number: 2
generated: 2026-05-09
nyquist_validation: true
source: derived from `02-RESEARCH-numberticker.md § Validation Architecture` + `02-RESEARCH-mobile-hamburger.md § E2E Test Strategy`
---

# Phase 2 Validation Strategy

Validation scaffolding for Nyquist gate. Maps each phase requirement to a concrete test + automated command + file location.

## Test Framework Inventory

| Layer | Framework | Config | Quick Command |
|-------|-----------|--------|---------------|
| Unit | Vitest 4.x + jsdom | `vitest.config.ts` | `pnpm test:unit -- --run <path>` |
| E2E | Playwright | `playwright.config.ts` (`public` project) | `pnpm test:e2e -- --project=public --grep "<grep>"` |
| Type | TypeScript 5.x strict | `tsconfig.json` | `pnpm typecheck` |
| Lint | ESLint flat config | `eslint.config.js` | `pnpm lint` |

## Phase Requirements → Test Map

### CRIT-02: NumberTicker animation correctness

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Animates from 0 to target value within `duration + delay` window | unit | `pnpm test:unit -- --run src/components/ui/__tests__/number-ticker.test.tsx -t "animates to the target value after duration elapses"` | `src/components/ui/__tests__/number-ticker.test.tsx` | 1 (Plan 02-01 Task 2) |
| All four production values (5, 7, 500, 14) reach completion | unit | same file, `-t "renders all four production stat values to completion"` | same file | 1 |
| Honors per-stat `delay` prop | unit | same file, `-t "honors delay before starting the tween"` | same file | 1 |
| Uses one-shot `hasIntersected` (no re-trigger on viewport scroll) | unit | same file, `-t "does not re-trigger animation after first IntersectionObserver entry"` | same file | 1 |
| Cancels rAF chain on unmount | unit | same file, `-t "cancels the rAF chain on unmount"` | same file | 1 |
| Live: production homepage shows animated counters at 375px DevTools | manual | DevTools at 375px iPhone SE preset → visit `/` → confirm "5", "7", "500", "14" animate from 0 | n/a (manual checkpoint per Phase 1 lesson) | 1 (Plan 02-01 Task 4) |

### CRIT-04: Mobile hero overflow + CTA + drawer polish

| Behavior | Test Type | Automated Command | Test File | Wave |
|----------|-----------|-------------------|-----------|------|
| Hero text wraps within 375px viewport (no horizontal scroll) | e2e | `pnpm test:e2e -- --project=public --grep "Mobile nav at 375px viewport"` | `tests/e2e/tests/public/mobile-nav-375px.spec.ts` | 1 (Plan 02-02 Task 3) |
| "Start Managing Properties" CTA fully visible (no overflow clipping) | e2e | same spec | same file | 1 |
| Hamburger button visible top-right at `<md` breakpoint | e2e | same spec | same file | 1 |
| Hamburger trigger meets 44×44 touch-target floor | e2e + visual | same spec asserts `min-h-11 min-w-11` rendered dimensions | same file | 1 |
| Tap hamburger opens shadcn `Sheet` drawer | e2e | same spec | same file | 1 |
| Drawer contains all 7 nav items (Features, Pricing, Compare, About, Resources, Sign In, Get Started) | e2e | same spec | same file | 1 |
| Tapping a drawer link closes drawer + navigates | e2e | same spec | same file | 1 |
| Tapping X button closes drawer | e2e | same spec | same file | 1 |
| Pressing Escape closes drawer | e2e | same spec | same file | 1 |
| Outside-click via `page.mouse.click(10, 100)` closes drawer | e2e | same spec | same file | 1 |
| Sheet close button has explicit `aria-label="Close"` | unit + grep | `grep -c 'aria-label="Close"' src/components/ui/sheet.tsx` returns 1 | n/a (file grep) | 1 (Plan 02-02 Task 2) |
| Live: production at 375px DevTools confirms hero + drawer behavior | manual | DevTools at 375px → visit `/` → confirm overflow gone, hamburger taps open drawer, all 7 links visible | n/a (manual checkpoint per Phase 1 lesson) | 1 (Plan 02-02 Task 5) |

### Cross-Cutting Constraint: Design Token Compliance

| Behavior | Test Type | Automated Command | Wave |
|----------|-----------|-------------------|------|
| No new hex codes in modified files | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*#[0-9a-fA-F]{3,8}\\b" \| wc -l` returns 0 | post-execution gate |
| No new `rgb(` / `rgba(` introductions | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*rgba?\\(" \| wc -l` returns 0 | post-execution gate |
| No `bg-white` introductions (use `bg-background`) | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*bg-white" \| wc -l` returns 0 | post-execution gate |
| No inline ms durations (use `--duration-*` tokens) | grep | `git diff main...HEAD -- src/ \| grep -E "^\+.*\\b[0-9]+ms\\b" \| wc -l` returns 0 | post-execution gate |

## Sampling Rate

- **Per task commit:** task-specific `<automated>` command from PLAN.md `<verify>` block
- **Per plan merge:** `pnpm typecheck && pnpm lint && pnpm test:unit` (all unit tests, all packages)
- **Wave 1 gate:** all of the above + e2e spec passing locally OR documented CI-only path
- **Phase ship gate:** full suite green + manual 375px DevTools visual verification
- **Post-deploy gate:** Vercel deploy success + curl smoke against `https://tenantflow.app/` (live verification per Phase 1 lessons)

## Wave 0 Gaps

Files that do NOT exist yet — created during Wave 1 execution:

- `src/components/ui/__tests__/number-ticker.test.tsx` — covers CRIT-02 (NEW; Plan 02-01 Task 2)
- `tests/e2e/tests/public/mobile-nav-375px.spec.ts` — covers CRIT-04 (NEW; Plan 02-02 Task 3)

No framework install required:
- Vitest 4 + jsdom + `IntersectionObserverMock` all present
- Playwright `public` project + `pnpm test:e2e` script all present

## Manual Verification Anchors (Phase 1 Lesson Applied)

Each plan ends with a `checkpoint:human-verify` task that requires post-deploy live verification at 375px:

| Plan | Manual Checkpoint Task | What to verify |
|------|----------------------|----------------|
| 02-01 | Task 4 | Stats counters animate 0 → 5/7/500/14 in Chrome DevTools at 375px iPhone SE preset |
| 02-02 | Task 5 | Hero no horizontal scroll; CTA fully visible; hamburger taps open drawer; all 7 nav links visible + tappable; X/outside/Escape close behaviors all work |

The live-verification mandate stems from the Phase 1 lesson where Specialist 2's "framework emits real 404" assumption was wrong against the live Vercel deploy. Source-only checks are insufficient; live HTTP behavior must be confirmed before claiming the phase complete.

## Security Domain

Not applicable for either CRIT. CRIT-02 is a pure-frontend animation correctness bug. CRIT-04 is layout/responsive + Radix primitive consumption. No auth, no input validation, no crypto, no PII handling, no network I/O introduced. ASVS V5 (Input Validation) trivially holds — `value: number` is TypeScript-checked; Sheet props are Radix-typed.

## Confidence

| Area | Level | Reason |
|------|-------|--------|
| Test framework inventory | HIGH | Vitest + Playwright + TypeScript + ESLint all confirmed present in repo |
| CRIT-02 test map | HIGH | Specialist 1 provided full test source; 5 named tests in `02-RESEARCH-numberticker.md` |
| CRIT-04 test map | HIGH | Specialist 2 provided 8-test e2e spec; conventions match `seo-smoke.spec.ts` |
| Manual verification anchors | HIGH | Phase 1 retrospective explicitly mandates this pattern |
| Wave 0 gaps | HIGH | Both new test files do not exist yet; planner correctly assigned creation to Wave 1 |
| Cross-cutting design-token grep gates | HIGH | Standard patterns used elsewhere in the project |

---

*Validation strategy generated: 2026-05-09 — derived from research artifacts after plan-checker iteration 2 surfaced VALIDATION.md scaffolding gap.*
