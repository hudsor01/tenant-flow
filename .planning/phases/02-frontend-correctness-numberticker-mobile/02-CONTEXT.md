# Phase 2: Frontend Correctness (NumberTicker + Mobile) — Context

**Gathered:** 2026-05-09
**Status:** Ready for research → planning
**Source:** UI audit `audit-ui-2026-05-08.md` + Q&A round during /gsd-new-project (mobile hamburger pattern locked) + Phase 1 lessons logged

<domain>
## Phase Boundary

Phase 2 fixes two visible-bug regressions on the homepage that block paid marketing spend. Both are pure-frontend; no DB, no migration, no Stripe.

**In scope:**
- **CRIT-02 — NumberTicker animation bug.** Homepage stat counters render "0" for "Entity Branches", "Default Categories", "Bulk-Zip Cap", "Day Free Trial" instead of animating to 5/7/500/14. Source data in `src/components/sections/stats-showcase.tsx` is correct (5, 7, 500, 14 verified). Bug is in the `NumberTicker` component (likely `src/components/ui/number-ticker.tsx`) — IntersectionObserver / animation lifecycle issue.
- **CRIT-04 — Mobile layout broken at 375px.** Hero text overflows viewport ("spreadsheet" word breaks horizontally), primary CTA button cut off on the right, and there is NO hamburger menu — desktop nav (Features, Pricing, Compare, About, Resources, Sign In, Get Started) just disappears, leaving mobile users with zero navigation.

**Out of scope** (deferred to other phases):
- Visual redesign of the bento grid → v2.0+
- Persona word selection → Phase 4 (CONS-01)
- Hero subhead rewording → Phase 4 (COPY-01)
- "Tenants never log in" elevation to badge → Phase 4 (COPY-03)
- Multi-Property Dashboard icon fix → Phase 8 (CONS-02)
- aria-current site-wide audit → Phase 12 (SEO-06)
- Sticky CTA on long pages → Phase 13 (PERF-03)
- Removing the dashboard mockup names ("John Miller" etc.) → Phase 4 (COPY-07)

**Branch:** `gsd/phase-02-frontend-correctness`
**Phase requirement IDs:** CRIT-02, CRIT-04
**Cross-cutting design-token constraint:** No new hex/rgb/`bg-white`/inline-ms tokens introduced. Every color/spacing/typography/radius/shadow/duration value uses a `globals.css` token. Verified at PR review time via the perfect-PR gate.
</domain>

<decisions>
## Implementation Decisions

### CRIT-02: NumberTicker Animation Fix (LOCKED — implementation TBD per research)

- **Symptom:** Stats render "0 Entity Branches", "0 Default Categories", "0 Bulk-Zip Cap", "0 Day Free Trial" on prod.
- **Source values are correct:** verified in `stats-showcase.tsx` lines 17-43 — 5 / 7 / 500 / 14.
- **Likely fault zone:** `src/components/ui/number-ticker.tsx` (the animation component) AND/OR the component's interaction with React Compiler / Server Components / `BlurFade`-wrapped containers in `stats-showcase.tsx`.
- **Suspected root causes** (researcher to confirm via reading the actual component):
  1. IntersectionObserver root margin/threshold preventing trigger on certain viewport heights
  2. `value` prop type mismatch (string vs number) causing animator to start from undefined and never increment
  3. SSR hydration mismatch — animation starts client-side after hydration, but the `delay` prop offsetting onMount causes the ticker to never enter the running state
  4. React 19 + React Compiler optimizing away the `useState`/`useEffect` driving the animation (less likely; React Compiler is generally safe)
  5. Parent `BlurFade`'s opacity transition causing the IntersectionObserver to fire on a 0-height element
- **Fix shape:** depends on root cause. Likely a one-file edit (number-ticker.tsx) plus a test that catches regression.

### CRIT-04: Mobile Hero + Hamburger (LOCKED)

- **Hamburger UI pattern:** **shadcn `Sheet` slide-in drawer from right** (locked in PROJECT.md Key Decisions during Q&A round).
- **Drawer contents:** all 7 desktop nav items (Features, Pricing, Compare, About, Resources, Sign In, Get Started). One CTA pill at the bottom of the drawer ("Get Started" — currently exists in desktop nav).
- **Trigger button:** lucide-react `Menu` icon, top-right of the nav bar at `<md` breakpoint. `aria-label="Open navigation menu"` (icon-only button — accessibility per CLAUDE.md rules).
- **Hero overflow fix:** the word "spreadsheet" must wrap or use `text-balance` so it doesn't horizontally overflow at 375px. Solution will likely be a Tailwind class + responsive font sizing tweak (no new design tokens).
- **CTA truncation fix:** the primary "Start Managing Properties" button must fit within viewport at 375px. Likely a max-width or padding adjustment.
- **Mobile target:** 375px (iPhone SE / mid-range Android). Verify in Chrome DevTools device toolbar before merge.
- **Touch target sizes:** 44×44px minimum (WCAG / iOS HIG). globals.css already has `--touch-target-min: 2.75rem` (44px).
- **Drawer animation:** use `--duration-300` + `--ease-out-smooth` from globals.css (no inline ms).

### Out of Scope Reminders (don't accidentally fix in Phase 2)

- DO NOT touch persona language (Phase 4 owns)
- DO NOT touch hero copy beyond fixing overflow (Phase 4 owns rewording)
- DO NOT add new icons beyond `Menu` for the hamburger
- DO NOT modify `pricing-card-standard.tsx` (Phase 1 already shipped its work; Phase 5 owns next)
- DO NOT add a `not-found.tsx` or modify `loading.tsx` (Phase 1 lessons logged — those changes broke Phase 1 attempt 2; Phase 6 BLOG-02 owns the proper fix)
- DO NOT modify `next.config.ts` redirects (Phase 3 owns routing aliases)

### Cross-Cutting Design-Token Constraint (LOCKED — applies to ALL phases)

Every visual fix must use canonical tokens defined in `src/app/globals.css`:
- Color: `--color-*` tokens only (oklch); never hex/rgb/named colors
- Surfaces: `bg-background`, `bg-card`, `bg-muted` — never `bg-white`
- Text: `text-foreground`, `text-muted-foreground`
- Spacing/Radius/Shadow/Typography/Animation: only the scales defined in `globals.css @theme`
- Icons: `lucide-react` only (`Menu` for hamburger; no other new icons in Phase 2)

A PR introducing a hex/rgb/`bg-white`/inline-ms FAILS the perfect-PR review gate.

### Phase 1 Lessons Carried Forward (don't repeat)

- **Soft-404 deferral:** real HTTP 404 on `/blog/[slug]` is deferred to Phase 6 BLOG-02 via `generateStaticParams`. Don't try to fix this in Phase 2.
- **`loading.tsx` returning null is an anti-pattern:** it eliminates the not-found.tsx render path. If Phase 2 adds any loading.tsx, return real content (skeleton) — never null.
- **Live verification matters:** Specialist-2 promised "framework emits real 404" and was wrong. For Phase 2, run live curl/visual checks AFTER deploy (not just unit tests + verifier reading docs).

### Claude's Discretion

- Specific test names + structure for any new tests
- Whether the NumberTicker fix touches only `number-ticker.tsx` or also `stats-showcase.tsx`
- Hamburger drawer width (per shadcn defaults: `sm:max-w-sm` is fine; tweak only if research recommends)
- Sheet close-button position (top-right is shadcn default; keep)
- Plan file decomposition (planner picks; suggested 2-plan split below)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 research artifacts (specialists will produce)
- `.planning/phases/02-frontend-correctness-numberticker-mobile/02-RESEARCH.md` — canonical synthesis (read FIRST after research completes)
- `.planning/phases/02-frontend-correctness-numberticker-mobile/02-RESEARCH-numberticker.md` — animation diagnosis appendix
- `.planning/phases/02-frontend-correctness-numberticker-mobile/02-RESEARCH-mobile-hamburger.md` — mobile responsive + Sheet appendix

### Project context
- `.planning/PROJECT.md § Key Decisions` — locked v1.0 decisions (mobile hamburger pattern: shadcn Sheet right-slide)
- `.planning/REQUIREMENTS.md § Critical — Block Marketing Spend (CRIT)` — CRIT-02 + CRIT-04 + cross-cutting design-token constraint
- `.planning/ROADMAP.md § Phase 2` — phase goal + 4 success criteria
- `audit-ui-2026-05-08.md` (project root) — original audit; items #2 and #4
- `.planning/phases/01-critical-stop-bleed-blog-unpublish-pricing-placeholder/01-VERIFICATION.md` — Phase 1 lessons (live-verification matters)

### Codebase conventions
- `CLAUDE.md` — zero-tolerance rules, design tokens, query-key factories, RPC patterns, accessibility rules (icon-only buttons need `aria-label`), components rules (use shadcn `Sheet` for drawers, lucide-react for icons)
- `src/app/globals.css` — canonical design token authority

### Existing-pattern references (read; understand current state before editing)
- `src/components/sections/stats-showcase.tsx` — the homepage stats section (correct values; bug is in the ticker child component, not here)
- `src/components/ui/number-ticker.tsx` — likely fault zone for CRIT-02 (researcher reads + diagnoses)
- `src/components/ui/blur-fade.tsx` — wraps each stat; relevant if BlurFade's opacity transition is interfering with IntersectionObserver
- The current homepage hero component (researcher locates via grep — likely `src/components/landing/` or `src/app/page.tsx`)
- The current desktop nav component (researcher locates — likely `src/components/layout/nav-header.tsx` or similar)
- `src/components/ui/sheet.tsx` (shadcn primitive — should already exist since the design system uses shadcn)
- Any existing mobile responsive patterns in `src/components/landing/` to copy

### Memory references
- `feedback_perfect_pr_gate.md` — 2 zero-finding cycles required for merge
- (No specific memory for NumberTicker or Sheet — research will surface patterns)

</canonical_refs>

<specifics>
## Specific Ideas

- **Suggested plan decomposition:** 2 plans, parallel-eligible (no overlap):
  - **Plan 02-01:** NumberTicker animation fix + regression test (touches `src/components/ui/number-ticker.tsx` and a new unit test file).
  - **Plan 02-02:** Mobile hero + hamburger drawer (touches the homepage hero component, the nav header component, possibly a new `mobile-nav-drawer.tsx`, and an e2e Playwright test at 375px viewport).
- **Test additions:**
  - NEW: `src/components/ui/__tests__/number-ticker.test.tsx` — render the ticker with `value=5`, fire IntersectionObserver entry, assert text content reaches "5" within reasonable timeout.
  - NEW: `tests/e2e/mobile-nav-375px.spec.ts` — Playwright test at 375×667 viewport, asserts hero doesn't horizontal-scroll, hamburger button visible, tap opens drawer with all 7 nav links visible.
- **Audit verification (post-deploy live checks):**
  - Visit `https://tenantflow.app/` in Chrome DevTools at 375px iPhone SE preset.
  - Confirm stats animate from 0 → 5/7/500/14 (NOT stay at 0).
  - Confirm hero no horizontal scroll, "Start Managing Properties" CTA fully visible.
  - Confirm hamburger icon top-right; tap opens drawer; all 7 nav links visible + tappable.

</specifics>

<deferred>
## Deferred Ideas

These came up during planning but explicitly belong to other phases:

- **NumberTicker visual polish** (e.g., adjusting the animation duration/easing for "feel") → out of scope; only fix the bug, don't redesign
- **Stats section background changes** → if any were on the audit list, they're Phase 3+ (this phase only fixes the count bug)
- **Hamburger drawer animation polish** (custom slide easing) → out of scope; use shadcn Sheet defaults
- **Mobile-specific typography scale tweaks** → only fix the overflow at 375px; don't redesign the type scale
- **Tablet breakpoint (768-1023px)** → not part of CRIT-04 scope; only 375px is the mandate
- **Larger phone breakpoint (414-430px iPhone Pro Max)** → fix at 375px first; if 414+ has issues, file as Phase 3+ work

</deferred>

---

*Phase: 02-frontend-correctness-numberticker-mobile*
*Context gathered: 2026-05-09 — pre-research lock-in*
