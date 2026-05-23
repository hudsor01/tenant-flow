# Phase 8: Nav, Active States & Dead Links - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 3 new test files
**Analogs found:** 3 / 3

## Phase Nature

Per `08-RESEARCH.md`, all three production fixes (CONS-02 / CONS-03 / CONS-11) already
shipped in commit `7540ebe48`. This phase creates **3 NEW regression-pinning test files**
only — no source-code edits. Each new test mirrors an existing analog test already in the
repo. The source files under test (`features-section.tsx`, `navbar-desktop-nav.tsx`,
`navbar/types.ts`) are read-only here; their current shapes are documented below so the
planner asserts against the live code.

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `src/components/sections/__tests__/features-section.test.tsx` | test (component render) | transform (props -> JSX) | `src/components/pricing/__tests__/pricing-card-standard.test.tsx` | exact (Phase-7 regression-pin sibling) |
| `src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx` | test (component render) | transform (props -> JSX) | `src/components/pricing/__tests__/pricing-card-standard.test.tsx` (props-driven render) + `src/components/layout/__tests__/navbar.test.tsx` (navbar render harness) | role-match |
| `src/components/layout/navbar/__tests__/types.test.ts` | test (data assertion) | transform (static config validation) | `src/components/sections/__tests__/home-faq.test.tsx` (static-array assertion) + `src/lib/__tests__/is-active-link.test.ts` (pure assertion, no render) | role-match |

## Source Files Under Test (read-only — current shapes)

### `src/components/sections/features-section.tsx` (CONS-02)

- **Default export:** `FeaturesSectionDemo` (default export — import as
  `import FeaturesSectionDemo from "#components/sections/features-section"`).
- **Lines 1-8:** import block — `LayoutDashboard` imported from `lucide-react`. No `ArrowLeft`.
- **Lines 40-44:** the Multi-Property Dashboard feature object with `icon: <LayoutDashboard />`.
- Six feature cards total — titles: `Property Management`, `Fast Setup`,
  `Transparent Pricing`, `Multi-Property Dashboard`, `Email Support`, `Document Vault`.
- **Line 130:** each card title renders in an `<h3>` (`typography-large ...`).
- **Line 105:** each card wrapper `<div>` carries class `group/feature`.
- Renders six `<BlurFade>` wrappers (`#components/ui/blur-fade`) — a `'use client'`
  component using `useEffect` + `window.matchMedia`. jsdom polyfills `matchMedia`
  via `src/test/unit-setup.ts`; no mock needed (verify at plan time — fallback is a
  passthrough `vi.mock("#components/ui/blur-fade", ...)`).

### `src/components/layout/navbar/navbar-desktop-nav.tsx` (CONS-03)

- **Named export:** `NavbarDesktopNav` — `'use client'`.
- **Props (lines 11-14):** `{ navItems: NavItem[]; pathname: string }` — `pathname` is a
  **prop**, NOT read via `usePathname()`. No `next/navigation` mock needed.
- **Lines 95-105:** parent `<Link href={item.href}>` sets
  `aria-current={isActiveLink(item.href, pathname) ? "page" : undefined}`.
- **Lines 124-139:** dropdown items render as `<Link>` with the same `aria-current` wiring
  and `data-dropdown-item={`${item.name}-${index}`}`.
- Dropdowns are hover/keyboard-gated (`openDropdown` state) — dropdown `<Link>` elements
  are NOT in the DOM until the dropdown opens. A `pathname="/"` render only exposes the
  five top-level links; that is sufficient for the CONS-03 assertion.
- Imports `isActiveLink` from `#lib/is-active-link` (the verified-correct 2-arg predicate).

### `src/components/layout/navbar/types.ts` (CONS-11)

- **Named exports:** `NavItem` (interface), `NavbarProps` (interface),
  `DEFAULT_NAV_ITEMS` (`NavItem[]` const).
- **Lines 17-39:** `DEFAULT_NAV_ITEMS` — 5 items. `Resources` (`href: "/resources"`,
  `hasDropdown: true`) has 4 `dropdownItems`: `/resources`, `/help`, `/faq`, `/contact`.
- `NavItem` shape: `{ name: string; href: string; hasDropdown?: boolean;
  dropdownItems?: { name: string; href: string; description?: string }[] }`.
- No item or dropdown item uses a placeholder href — all are absolute app routes.

## Pattern Assignments

### `src/components/sections/__tests__/features-section.test.tsx` (CONS-02)

**Analog:** `src/components/pricing/__tests__/pricing-card-standard.test.tsx`

**File-header docblock pattern** (analog lines 1-8) — every Phase-7/8 regression-pin test
opens with a docblock naming the CONS finding and the `@vitest-environment`:
```tsx
/**
 * FeaturesSectionDemo component test — Phase 8 CONS-02 regression pin.
 *
 * CONS-02's icon fix shipped in source already (commit 7540ebe48); this test
 * locks the Multi-Property Dashboard card's LayoutDashboard icon so a future
 * edit can't silently revert it to a wrong icon.
 *
 * @vitest-environment jsdom
 */
```

**Imports pattern** (analog lines 10-12, 38) — Testing Library + vitest globals imported
explicitly; subject imported from `#`-alias path (CLAUDE.md rule #2 — direct import,
no barrel):
```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FeaturesSectionDemo from "#components/sections/features-section";
```

**Render + assert pattern** (analog lines 65-79) — `render()` the full component, anchor
the assertion on stable text rather than class-soup. For CONS-02, use the lucide svg class
selector — the repo already uses `svg.lucide-<name>` selectors
(`property-image-dropzone.test.tsx:181` uses `svg.lucide-x`):
```tsx
describe("FeaturesSectionDemo", () => {
  it("Multi-Property Dashboard card renders the LayoutDashboard icon (CONS-02)", () => {
    const { container } = render(<FeaturesSectionDemo />);
    const heading = [...container.querySelectorAll("h3")].find(
      (h) => h.textContent === "Multi-Property Dashboard",
    );
    const card = heading?.closest("div.group\\/feature");
    expect(card?.querySelector("svg.lucide-layout-dashboard")).not.toBeNull();
  });
});
```

**Coverage pattern** (RESEARCH Pitfall 4) — 80% line/branch coverage is enforced via
lefthook pre-commit. `render(<FeaturesSectionDemo />)` exercises the whole file; add a
companion test asserting all six card titles render so `features-section.tsx` stays above
threshold:
```tsx
it("renders all six feature cards", () => {
  render(<FeaturesSectionDemo />);
  for (const title of [
    "Property Management", "Fast Setup", "Transparent Pricing",
    "Multi-Property Dashboard", "Email Support", "Document Vault",
  ]) {
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  }
});
```

---

### `src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx` (CONS-03)

**Analog:** `src/components/pricing/__tests__/pricing-card-standard.test.tsx` (props-driven
render — no `next/navigation` mock) + `src/components/layout/__tests__/navbar.test.tsx`
(navbar render context).

**Key decision — no `next/navigation` mock.** `NavbarDesktopNav` takes `pathname` as a
prop (verified lines 11-14). The `navbar.test.tsx` analog mocks `usePathname` only because
the top-level `Navbar` calls it; the sub-component does NOT. Pass `pathname` directly. This
is simpler and is the RESEARCH-recommended approach (Anti-Pattern: "Mocking `next/navigation`
when a pure-function test suffices").

**Imports pattern:**
```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavbarDesktopNav } from "#components/layout/navbar/navbar-desktop-nav";
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";
```

**Negative-case assertion (the CONS-03 audit symptom)** — render with `pathname="/"`,
assert NO top-level link is `aria-current="page"`. Use `screen.getByRole("link", ...)` —
the role-query convention from both analogs (`navbar.test.tsx:83-87`,
`pricing-card-standard.test.tsx` uses `getByText`/`getByRole`):
```tsx
it('emits no aria-current="page" on the homepage (CONS-03)', () => {
  render(<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/" />);
  for (const item of DEFAULT_NAV_ITEMS) {
    const link = screen.getByRole("link", { name: new RegExp(`^${item.name}`) });
    expect(link).not.toHaveAttribute("aria-current", "page");
  }
});
```
Note: `getByRole("link", { name: /^Resources/ })` matches the Resources parent link even
though its label includes the `ChevronDown` icon — the icon is `aria-hidden` by lucide
default, so the accessible name is just the text. Anchor the regex with `^` so `Resources`
does not collide with a future link sharing a prefix.

**Positive-case assertion (guard both directions)** — RESEARCH Wave-0 note recommends
pinning the true-positive too, so a future matcher that always returns `false` is also
caught:
```tsx
it('marks the active link aria-current="page" on its own route (CONS-03)', () => {
  render(<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/compare" />);
  const compare = screen.getByRole("link", { name: /^Compare/ });
  expect(compare).toHaveAttribute("aria-current", "page");
});
```

---

### `src/components/layout/navbar/__tests__/types.test.ts` (CONS-11)

**Analog:** `src/components/sections/__tests__/home-faq.test.tsx` (static-array assertion,
`.ts` not `.tsx`, no render) + `src/lib/__tests__/is-active-link.test.ts` (pure data
assertion, no render, no mocks).

**File-header docblock pattern** (home-faq analog lines 1-6):
```ts
/**
 * Pins the navbar nav config so a refactor can't re-introduce a dead/placeholder
 * href (CONS-11). The Resources parent href was '#' pre-fix (commit 7540ebe48);
 * all items now resolve to real App Router routes.
 */
```

**Imports pattern** (home-faq analog lines 8-10 — but no `@testing-library/react` since
this is a non-render data test):
```ts
import { describe, expect, it } from "vitest";

import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";
```

**Static-config assertion pattern** (home-faq analog lines 12-21 — iterate the exported
const, assert shape invariants):
```ts
describe("DEFAULT_NAV_ITEMS", () => {
  it("no nav item or dropdown item uses a placeholder href (CONS-11)", () => {
    const placeholders = new Set(["#", "/#", "", "javascript:void(0)"]);
    for (const item of DEFAULT_NAV_ITEMS) {
      expect(placeholders.has(item.href)).toBe(false);
      expect(item.href.startsWith("/")).toBe(true);
      for (const sub of item.dropdownItems ?? []) {
        expect(placeholders.has(sub.href)).toBe(false);
        expect(sub.href.startsWith("/")).toBe(true);
      }
    }
  });
});
```

**Optional filesystem drift-guard** (RESEARCH Validation Architecture, "stronger" row) —
the repo already uses `readFileSync`/`readdirSync` drift-guards (`robots.test.ts`,
`sitemap.test.ts`). A `node:fs` `readdirSync("src/app")` assertion that each Resources
dropdown route segment is a real directory would pin CONS-11 against route deletion. Lower
priority than the placeholder-href assertion — planner's discretion.

---

## Shared Patterns

### Regression-pin test file structure
**Source:** `src/components/pricing/__tests__/pricing-card-standard.test.tsx`,
`src/components/sections/__tests__/home-faq.test.tsx`
**Apply to:** All 3 new test files
- Open with a docblock naming the CONS finding and stating the fix already shipped.
- Component-render tests add `@vitest-environment jsdom` to the docblock.
- One `describe` block named after the subject; one `it` per assertion, the CONS id in
  the `it` description (e.g. `(CONS-02)`).
- Import `describe, expect, it` (and `vi` only if mocking) from `"vitest"`.
- Import the subject directly via `#`-alias path — never a barrel/`index.ts` (CLAUDE.md
  rule #2).

### Props-driven render — avoid mocking when a prop suffices
**Source:** `src/components/pricing/__tests__/pricing-card-standard.test.tsx` (passes
`plan`/`billingCycle`/`variant` props), contrasted with
`src/components/layout/__tests__/navbar.test.tsx` (mocks `usePathname` because the
top-level `Navbar` reads it internally)
**Apply to:** `navbar-desktop-nav.test.tsx`
- `NavbarDesktopNav` receives `pathname` as a prop — pass it directly, no
  `vi.mock("next/navigation")`. The `navbar.test.tsx` mock stack is the fallback pattern
  only if the sub-component is later changed to read context.

### `vi.hoisted()` for mock variables (fallback only)
**Source:** `src/components/layout/__tests__/navbar.test.tsx` lines 12-33
**Apply to:** None of the 3 new files should need it. Documented as the escape hatch: IF a
test must mock a module (`vi.mock`) and reference a mock fn inside the factory, the fn must
be created via `vi.hoisted()` (CLAUDE.md Testing). The recommended path for all 3 files is
zero mocks — props-driven render (CONS-03), plain render (CONS-02), plain data assertion
(CONS-11).

### Stable-anchor assertions over class-soup
**Source:** `pricing-card-standard.test.tsx:76-78` (anchor on price text, then `.closest`)
and `property-image-dropzone.test.tsx:181` (`svg.lucide-x` selector)
**Apply to:** `features-section.test.tsx`, `navbar-desktop-nav.test.tsx`
- Find an element by its visible text/role, then traverse (`.closest`, `querySelector`)
  to the thing under test. lucide icons are reliably selectable via
  `svg.lucide-<kebab-name>` — the established repo pattern.

## No Analog Found

None. All three new test files have strong existing analogs in the repo.

## Metadata

**Analog search scope:** `src/components/pricing/__tests__/`,
`src/components/layout/__tests__/`, `src/components/layout/navbar/__tests__/`,
`src/components/sections/__tests__/`, `src/lib/__tests__/`,
`src/components/{shell,properties}/__tests__/` (lucide-selector confirmation).
**Files scanned:** ~12 (3 source-under-test, 5 analog tests, vitest config, BlurFade,
2 lucide-selector reference tests).
**Skills checked:** `.claude/skills/` contains `frontend-design`, `rls-policies`,
`sql-migration-rules` — none govern unit-test authoring; no skill rules loaded.
**Pattern extraction date:** 2026-05-20
