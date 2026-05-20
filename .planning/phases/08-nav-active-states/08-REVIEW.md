---
phase: 08-nav-active-states
reviewed: 2026-05-20T23:51:20Z
depth: deep
files_reviewed: 3
files_reviewed_list:
  - src/components/sections/__tests__/features-section.test.tsx
  - src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx
  - src/components/layout/navbar/__tests__/types.test.ts
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-20T23:51:20Z
**Depth:** deep
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed three newly created Vitest 4 + jsdom regression-guard test files pinning the
already-shipped CONS-02/03/11 fixes (Multi-Property Dashboard icon, homepage `aria-current`
active-state wiring, Resources dropdown real URLs). No production components were modified.

All 9 tests pass against current source. Cross-referencing each assertion against the actual
production DOM/config output, and exercising real reversion scenarios, confirms the suites are
genuinely load-bearing — they are NOT false-confidence tests:

- **CONS-02 (features-section.test.tsx):** Reverting the icon to `Terminal` fails the positive
  assertion; reverting to `ArrowLeft` (the exact audit symptom) fails BOTH the positive and the
  negative assertions. Both branches verified by mutation.
- **CONS-03 (navbar-desktop-nav.test.tsx):** Reverting `isActiveLink` to the swapped-argument
  bug (`href.startsWith(pathname)` — the form that produces the audited "Compare false-highlights
  on the homepage" symptom) fails the homepage test. Verified by mutation.
- **CONS-11 (types.test.ts):** Reverting the Resources parent href to the pre-fix `'#'`
  placeholder fails two assertions. Verified by mutation.

No `any`, no `as unknown as`, no `as` assertions, no mocks (so `vi.hoisted()` is N/A). The
`@vitest-environment jsdom` doc-block is present on the two `.tsx` DOM tests and absent on the
pure-data `.ts` test, exactly as specified. Selectors are stable: `closest("div.group\\/feature")`
correctly CSS-escapes the Tailwind `/` variant; `getByRole` name regexes are anchored and the
five `DEFAULT_NAV_ITEMS` names share no common prefix; the dropdown is unmounted on initial render
so no duplicate-link ambiguity arises.

Two Info-level findings below — both are coverage/precision observations, not correctness defects.
Neither blocks merge.

## Info

### IN-01: Navbar suite never exercises `isActiveLink`'s prefix-match branch

**File:** `src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx:18-47`
**Issue:** Every `pathname` used in the three test cases (`/`, `/compare`, `/pricing`) is an
*exact* match for a `DEFAULT_NAV_ITEMS` href. The production matcher
`src/lib/is-active-link.ts` has three branches: the `href === '/'` short-circuit, the
`pathname === href` exact match, and the `pathname.startsWith(\`${href}/\`)` descendant-route
prefix match. Mutation-testing confirms the suite still passes when `isActiveLink` is reverted
to a pure exact-match (`return pathname === href`) — the descendant-route branch is the one
piece of CONS-03's matcher logic this suite does NOT pin. A future refactor that drops the
`startsWith` branch (so e.g. `/compare/yardi` no longer highlights "Compare") would not be caught.
Note this is a coverage gap, not false confidence: the suite still genuinely fails for the actual
audited symptom (homepage false-highlight).
**Fix:** Add one case for a descendant route, e.g.:
```tsx
it("marks Compare aria-current=page on a /compare child route (CONS-03)", () => {
	render(
		<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/compare/yardi" />,
	);
	expect(screen.getByRole("link", { name: /^Compare/ })).toHaveAttribute(
		"aria-current",
		"page",
	);
});
```
Pairing it with a `/compareXYZ`-style negative case would also pin the trailing-slash guard that
`is-active-link.ts`'s own doc comment calls "critical."

### IN-02: `arrow-left` negative assertion is symptom-specific, not generic

**File:** `src/components/sections/__tests__/features-section.test.tsx:29-36`
**Issue:** The second test asserts the Multi-Property Dashboard card does NOT render
`svg.lucide-arrow-left`. Mutation-testing confirms it correctly fails when the icon is reverted
to `ArrowLeft` (the exact audit symptom), but it does NOT fire for any other wrong icon — e.g.
swapping `LayoutDashboard` for `Terminal` passes this test (the positive test IN test 1 is what
catches that). This is acceptable as a deliberate symptom pin and the doc comment is honest about
it ("the audit flagged a back-arrow"), so this is purely informational. The positive assertion in
test 1 already provides full coverage for any wrong-icon regression.
**Fix:** No change required. Optionally, if a stricter generic guard is wanted, assert the card
contains exactly one `svg` and that it carries `.lucide-layout-dashboard` — but the current
positive test already covers the generic case, so this is optional.

---

_Reviewed: 2026-05-20T23:51:20Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
