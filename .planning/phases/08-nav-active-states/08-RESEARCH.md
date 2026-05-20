# Phase 8: Nav, Active States & Dead Links - Research

**Researched:** 2026-05-20
**Domain:** Marketing-surface nav chrome (Next.js 16 + React 19, audit-fix phase)
**Confidence:** HIGH

## Summary

Phase 8 is a brownfield audit-fix phase covering three findings — CONS-02 (wrong feature-card
icon), CONS-03 (false `aria-current` on `/`), CONS-11 (Resources dropdown dead link). The
investigation produced a decisive and unusual result: **all three production-code fixes are
already present in `HEAD`**, committed on 2026-05-11 as `7540ebe48` ("feat(phase-08): nav active
states + dead-link fix + dashboard icon"). That commit is a verified ancestor of `HEAD`.

What remains genuinely undone is the **regression-pinning test layer**. The CONTEXT.md Specific
Ideas section and the Phase 7 precedent both call for regression-pinning tests per fix, and the
project's perfect-PR gate expects them. Today:
- `isActiveLink` (the CONS-03 logic) HAS a unit test (`src/lib/__tests__/is-active-link.test.ts`)
  that already pins the root short-circuit — but no test pins that `<NavbarDesktopNav>`/
  `<NavbarMobileMenu>` emit `aria-current` correctly when rendered with `pathname="/"`.
- `features-section.tsx` (CONS-02) has **no test at all** — nothing pins the Multi-Property
  Dashboard card's icon, so a future edit could silently revert `LayoutDashboard` to a wrong icon.
- `navbar/types.ts` (CONS-11) has **no test** — nothing pins that no nav `href` is a placeholder
  (`#` / `/#`).

**Primary recommendation:** Plan this phase as a **test-and-verify phase, not an
implementation phase.** Treat the three production fixes as DONE, verify each is still correct
at plan time, and scope the work to writing three regression-pinning unit tests (Vitest 4 +
jsdom). If verification finds any fix has regressed, the planner adds a one-line restore task —
but current evidence says all three are intact. This must be stated explicitly to the planner so
it does not re-implement already-shipped code.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Feature-card icon rendering (CONS-02) | Browser / Client (`'use client'`-adjacent — `features-section.tsx` is a presentational component) | — | Pure JSX; lucide-react icon imported and rendered as a `ReactNode`. No data, no server logic. |
| Nav active-state computation (CONS-03) | Browser / Client | — | `isActiveLink(href, pathname)` runs client-side; `pathname` comes from `usePathname()` (client hook). `NavbarDesktopNav`/`NavbarMobileMenu` are `'use client'`. |
| Nav dropdown link targets (CONS-11) | Frontend Server (route definitions) + Client (nav config) | — | `DEFAULT_NAV_ITEMS` is a static config object consumed client-side; the *targets* (`/resources`, `/help`, `/faq`, `/contact`) are real Next.js App Router routes under `src/app/`. |

All three findings live entirely in the marketing-chrome client tier. No API, database, or
SSR-server work is involved. This is the simplest possible tier profile.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**CONS-02 — Multi-Property Dashboard icon**
- **D-01:** Replace the back-arrow icon in `src/components/sections/features-section.tsx`
  (Multi-Property Dashboard card) with a lucide-react icon. ROADMAP locks the choice to one of
  `LayoutGrid`, `Building2`, `LayoutDashboard`.
- **D-02 (Claude's discretion):** Prefer `LayoutDashboard` — it literally communicates
  "dashboard," the card's headline noun. Planner may pick `Building2` instead if the surrounding
  feature-card icon set already leans property/building imagery (researcher to check for visual
  consistency with sibling cards).

**CONS-03 — homepage active-nav state**
- **D-03:** Fix the nav active-state matcher so that on `/` no link receives `aria-current="page"`
  incorrectly (specifically "Compare" must not highlight). Root-cause the matcher logic — likely a
  `pathname.startsWith(...)` or loose-prefix match that treats `/` as a prefix of `/compare`. Fix
  is exact-path matching for the home link and correct prefix scoping for others.
- **D-04:** The fix applies to the marketing navbar — `src/components/layout/navbar/navbar-desktop-nav.tsx`
  and `navbar-mobile-menu.tsx` (both reference `aria-current`). Keep `aria-current="page"` correct
  for genuinely-active routes; only the false-positive on `/` is in scope.

**CONS-11 — Resources dropdown dead links**
- **D-05:** Every Resources nav dropdown item must point to a real, existing route (no
  `href="/#"`, no `href="#"`). Researcher must FIRST locate the Resources dropdown definition — a
  `grep` for literal `href="/#"` returned zero matches, so the dead link is either (a) already
  partially fixed, (b) expressed via a nav config/data object rather than literal JSX, or (c) a
  different placeholder pattern. Verify against the live audit finding before planning the fix.
- **D-06:** Dead items resolve to their real destinations (e.g. blog, resources hub, FAQ, support,
  security, legal pages — whichever the dropdown lists). If a dropdown item has no real
  destination yet, remove the item rather than linking to a placeholder.

### Claude's Discretion
- Exact icon (within the 3 ROADMAP-approved options: `LayoutGrid`, `Building2`, `LayoutDashboard`).
- The precise matcher refactor for CONS-03, provided `/` no longer false-highlights and real
  active states still work.
- Whether to remove vs re-point any Resources item that genuinely has no destination.

### Deferred Ideas (OUT OF SCOPE)
- None — phase scope is the 3 audit findings only. Any nav restructure or new dropdown items are
  out of scope for v1.0.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONS-02 | "Multi-Property Dashboard" feature card uses correct `lucide-react` icon (`LayoutGrid` / `Building2` / `LayoutDashboard`) — currently a back-arrow. | **Already implemented.** `features-section.tsx:5,43` imports and renders `<LayoutDashboard />` on the Multi-Property Dashboard card. The wrong `ArrowLeft` icon was removed in commit `7540ebe48`. Remaining work: a regression test pinning the icon. |
| CONS-03 | Active-nav state on homepage stops highlighting "Compare" — fix `aria-current="page"` logic so `/` highlights the appropriate link (or none). | **Already implemented & correct.** Both navbars delegate to `isActiveLink(href, pathname)` in `src/lib/is-active-link.ts`. The function short-circuits `href === '/'` to `pathname === '/'` and otherwise uses exact-match OR trailing-slash-anchored `startsWith`. On `/`, every item ("Compare" included) returns `false`. Remaining work: a regression test pinning `aria-current` output of the navbar components on `pathname="/"`. |
| CONS-11 | Resources nav dropdown items navigate to real URLs — replace `href="/#"` with the actual destination route(s); ensure keyboard navigation activates them. | **Already implemented.** `navbar/types.ts:23-37` — the Resources parent `href` was `'#'`, now `'/resources'` (fixed in `7540ebe48`). All four dropdown items point to real App Router routes: `/resources`, `/help`, `/faq`, `/contact` — all verified to exist under `src/app/`. Keyboard activation works via `<Link>` + `handleKeyDown` (`navbar-desktop-nav.tsx:38-84`). Remaining work: a regression test pinning that no nav href is a placeholder. |
</phase_requirements>

## Investigation Findings (precise file:line answers)

### CONS-02 — Multi-Property Dashboard icon — STATE: ALREADY FIXED

`src/components/sections/features-section.tsx`:
- **Line 5:** `LayoutDashboard` is imported from `lucide-react` (the import block, lines 1-8, no
  longer contains `ArrowLeft`).
- **Lines 40-44:** the Multi-Property Dashboard feature object:
  ```tsx
  {
    title: "Multi-Property Dashboard",
    description: "Manage your entire portfolio from one unified dashboard with revenue, occupancy, and maintenance metrics.",
    icon: <LayoutDashboard />,
  },
  ```
- **Sibling feature-card icons** (line numbers from the verified file):
  | Line | Card | Icon |
  |------|------|------|
  | 25 | Property Management | `<Terminal />` |
  | 31 | Fast Setup | `<Zap />` |
  | 37 | Transparent Pricing | `<DollarSign />` |
  | 43 | Multi-Property Dashboard | `<LayoutDashboard />` |
  | 49 | Email Support | `<HelpCircle />` |
  | 55 | Document Vault | `<FolderArchive />` |

**Visual-consistency verdict (resolves D-02):** The sibling icon set (`Terminal`, `Zap`,
`DollarSign`, `HelpCircle`, `FolderArchive`) is concept/abstract, NOT property/building imagery.
Nothing leans toward `Building2`. `LayoutDashboard` is the correct, on-strategy choice — it
matches the card's headline noun ("Dashboard") and fits the abstract-icon set. The current code
already uses it. No icon change is needed; `Building2` would be a worse fit. `[VERIFIED: codebase]`

**Original bug confirmed:** commit `7540ebe48` diff shows the pre-fix icon was `<ArrowLeft />`
(the "back-arrow" the audit flagged). `[VERIFIED: git show 7540ebe48]`

### CONS-03 — homepage active-nav state — STATE: ALREADY FIXED & CORRECT

The active-state logic is **not** inline in the navbar components. Both navbars delegate to a
shared predicate:

`src/lib/is-active-link.ts` (entire file, verified):
```ts
export function isActiveLink(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

**Why this is correct on `/`:** For `pathname === "/"`, evaluate each nav item:
- `Features` (`/features`): `"/" === "/features"` → false; `"/".startsWith("/features/")` → false → **false** ✓
- `Pricing` (`/pricing`): false → **false** ✓
- `Compare` (`/compare`): `"/" === "/compare"` → false; `"/".startsWith("/compare/")` → false → **false** ✓ (the audit's exact symptom — confirmed not reproducible)
- `About` (`/about`): **false** ✓
- `Resources` (`/resources`): **false** ✓

On `/`, **no** nav item is active. The `href === "/"` short-circuit also means the logo's `/`
link does not false-highlight on `/compare` etc. The trailing-slash anchor (`${href}/`) prevents
`/blogger` from matching `/blog`. `[VERIFIED: codebase + manual trace]`

**Consumers (both call sites use the correct 2-arg form):**
- `navbar-desktop-nav.tsx:98-104` — `aria-current={isActiveLink(item.href, pathname) ? "page" : undefined}`
  on the parent `<Link>`, and `:130-134` on each dropdown `<Link>`.
- `navbar-mobile-menu.tsx:56-63` — `aria-current` on the parent `<Link>`, and `:88-93` on each
  dropdown `<Link>`.

**Note on the original commit `7540ebe48`:** that commit called `isActiveLink(item.href)` with a
single argument. The function was later refactored to require `pathname` explicitly (it no longer
reads `usePathname()` internally), and `pathname` is now threaded down from `navbar.tsx:40`
(`const pathname = usePathname()`) → `<NavbarDesktopNav navItems pathname>` (`navbar.tsx:98`) and
`<NavbarMobileMenu ... pathname>` (`navbar.tsx:150`). The current 2-arg form is the live, correct
state. `[VERIFIED: git log + codebase]`

### CONS-11 — Resources dropdown dead links — STATE: ALREADY FIXED

The reason `grep "href=\"/#\""` returned zero matches: the nav is **config-driven**, not literal
JSX. The dropdown is defined in a data object, `DEFAULT_NAV_ITEMS` in
`src/components/layout/navbar/types.ts:17-39` (verified):

```ts
{
  name: "Resources",
  href: "/resources",          // was '#' pre-fix — CONS-11 target
  hasDropdown: true,
  dropdownItems: [
    { name: "Free Resources", href: "/resources" },
    { name: "Help Center",    href: "/help" },
    { name: "FAQ",            href: "/faq" },
    { name: "Contact",        href: "/contact" },
  ],
}
```

**Route existence — all four targets verified to exist under `src/app/`:** `/resources` ✓,
`/help` ✓, `/faq` ✓, `/contact` ✓. None is a placeholder, hash, or `/#`. `[VERIFIED: ls src/app/]`

**The original dead link:** commit `7540ebe48` diff shows the Resources **parent** `href` was
`'#'` (a hash-only dead link), changed to `/resources`. The dropdown *items* already pointed at
real routes at that time. `[VERIFIED: git show 7540ebe48]`

**Subsequent evolution (post-fix, not in Phase 8 scope but relevant):** a later commit
(blog-deprioritization, `dcc3dfba0`/`485a593bc`) removed the `{ name: "Blog", href: "/blog" }`
dropdown item entirely — see the inline comment at `types.ts:26-31`. The `/blog` route still
exists; it is just no longer promoted in nav chrome. This is consistent with D-06 (remove rather
than placeholder) and is already done. No Phase 8 action.

**Keyboard activation (D-05 requirement):** each dropdown item renders as a Next.js `<Link>`
(`navbar-desktop-nav.tsx:124-139`). `<Link>` produces a real `<a href>`, which is natively
keyboard-activable (Enter follows the link). `handleKeyDown` adds ArrowUp/ArrowDown/Escape
roving-focus on top. Mobile items (`navbar-mobile-menu.tsx:83-97`) are also `<Link>` elements.
Keyboard navigation works. `[VERIFIED: codebase]`

## Standard Stack

No new dependencies. Everything needed is already in the project.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lucide-react` | (installed) | Icon library — `LayoutDashboard` etc. | CLAUDE.md zero-tolerance rule #10: lucide-react is the sole icon library. `[CITED: CLAUDE.md]` |
| `next` | 16.x | `<Link>`, `usePathname()` (App Router) | Project framework. `[CITED: CLAUDE.md]` |
| `vitest` | 4.x | Unit test runner | `[CITED: CLAUDE.md Testing section]` |
| `@testing-library/react` | (installed) | Render React components in jsdom for tests | Used by existing `navbar.test.tsx`. `[VERIFIED: codebase]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jsdom` | (installed) | DOM environment for Vitest `unit` project | Default `environment` for the `unit` project. `[VERIFIED: vitest.config.ts:50]` |

### Alternatives Considered
None. This phase introduces zero new libraries. Any new dependency would be out of scope.

**Installation:** None required.

**Version verification:** Not applicable — no new packages. Existing versions are pinned in
`package.json` and unchanged by this phase.

## Architecture Patterns

### System Architecture Diagram

```
                       Next.js App Router (src/app/)
                                  │
                          usePathname()  ──────────────┐
                                  │                    │
                          src/components/layout/navbar.tsx
                          (Navbar — 'use client')
                                  │
              ┌───────────────────┴───────────────────┐
              │  pathname + navItems                  │  pathname + navItems
              ▼                                       ▼
   NavbarDesktopNav                          NavbarMobileMenu
   (navbar-desktop-nav.tsx)                  (navbar-mobile-menu.tsx)
              │                                       │
              │ for each item / dropdownItem:         │
              │   isActiveLink(href, pathname)        │
              └──────────────┬────────────────────────┘
                             ▼
                  src/lib/is-active-link.ts
              ┌──────────────────────────────────────┐
              │ href === '/'  → pathname === '/'      │
              │ else → pathname === href              │
              │        OR pathname.startsWith(href/)  │
              └──────────────────────────────────────┘
                             │
                             ▼
              aria-current="page" | undefined   (set on each <Link>)

   Nav config (single source of truth for both navbars):
   src/components/layout/navbar/types.ts → DEFAULT_NAV_ITEMS
     ├─ Features /features   Pricing /pricing   Compare /compare   About /about
     └─ Resources /resources  (hasDropdown)
          └─ dropdownItems: Free Resources /resources, Help Center /help,
                            FAQ /faq, Contact /contact

   features-section.tsx (CONS-02): independent presentational component
   on the marketing homepage; renders 6 feature cards each with a
   lucide-react icon ReactNode.
```

### Component Responsibilities
| File | Responsibility |
|------|----------------|
| `src/components/layout/navbar.tsx` | Top-level marketing navbar; calls `usePathname()`, threads `pathname` + `navItems` into both sub-navs. |
| `src/components/layout/navbar/navbar-desktop-nav.tsx` | Desktop nav rendering; sets `aria-current` per `<Link>`; hover dropdown + keyboard roving focus. |
| `src/components/layout/navbar/navbar-mobile-menu.tsx` | Mobile nav (shadcn `Sheet`); sets `aria-current` per `<Link>`; tap-to-expand dropdown. |
| `src/components/layout/navbar/types.ts` | `NavItem` type + `DEFAULT_NAV_ITEMS` config (single source of truth for both navbars). |
| `src/lib/is-active-link.ts` | Pure active-link predicate. Drives both visual classes and `aria-current`. |
| `src/lib/__tests__/is-active-link.test.ts` | Existing unit test pinning the predicate's semantics. |
| `src/components/sections/features-section.tsx` | Homepage feature-card grid; CONS-02 lives here. |

### Pattern 1: Config-driven nav (single source of truth)
**What:** Nav items live in a typed data object (`DEFAULT_NAV_ITEMS`), not inline JSX. Both
desktop and mobile navbars map over the same array.
**When to use:** When the same link set must render in multiple places. Means CONS-11 has exactly
ONE place to verify hrefs, and a regression test asserting "no placeholder hrefs" only needs to
walk one object.
**Example:**
```ts
// Source: src/components/layout/navbar/types.ts (verified)
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { name: "Features", href: "/features" },
  // ...
  { name: "Resources", href: "/resources", hasDropdown: true, dropdownItems: [ /* ... */ ] },
];
```

### Pattern 2: Shared pure predicate for active state
**What:** `isActiveLink(href, pathname)` is a side-effect-free function (no `usePathname()`
inside it). `pathname` is injected by the caller.
**When to use:** Makes the logic trivially unit-testable without rendering a component or mocking
`next/navigation`. The existing `is-active-link.test.ts` exploits exactly this.
**Example:**
```ts
// Source: src/lib/is-active-link.ts (verified)
export function isActiveLink(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

### Anti-Patterns to Avoid
- **Re-implementing already-shipped fixes:** All three CONS fixes are in `HEAD`. The plan must
  NOT re-edit `features-section.tsx`, `is-active-link.ts`, `navbar-desktop-nav.tsx`, or
  `types.ts` to "fix" things that are already fixed. Verify-then-test, do not re-implement.
- **`pathname.startsWith(href)` without the trailing-slash anchor:** Would re-introduce the
  `/blogger`-matches-`/blog` false-positive. The current `${href}/` form is correct — do not
  "simplify" it away.
- **Dropping the `href === "/"` short-circuit:** Without it, every route matches `/`. This is the
  exact CONS-03 bug class. Keep it.
- **Mocking `next/navigation` when a pure-function test suffices:** For CONS-03, prefer testing
  `isActiveLink` directly (or rendering navbar components with an explicit `pathname` prop) over
  mocking `usePathname()`. The navbar sub-components already take `pathname` as a prop, so they
  can be rendered directly with `pathname="/"` — no mock needed.
- **Barrel files / `index.ts` re-exports:** CLAUDE.md zero-tolerance rule #2. Import test
  subjects directly from their defining file.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active-link detection | A new path-matching helper | The existing `isActiveLink` in `src/lib/is-active-link.ts` | Already correct, already tested, already used by both navbars. A second matcher would drift. |
| Icon for the dashboard card | A custom SVG or `@radix-ui/react-icons` import | `lucide-react`'s `LayoutDashboard` (already imported) | CLAUDE.md rule #10 — lucide-react is the only allowed icon library. |
| Keyboard activation for dropdown links | Custom `onKeyDown` Enter handler to "navigate" | Next.js `<Link>` (renders a real `<a href>`) | `<a href>` is natively keyboard-activable; the existing `handleKeyDown` only adds arrow-key roving focus on top. |
| Component rendering in tests | A bespoke render harness | `@testing-library/react` `render` + `screen` | Already the project convention (`navbar.test.tsx`). |

**Key insight:** This phase's entire production surface already exists and is correct. The only
thing to "build" is test coverage — and even there, the tooling (Vitest, Testing Library, the
`isActiveLink` unit-test pattern) is established. There is nothing novel to construct.

## Common Pitfalls

### Pitfall 1: Treating this as an implementation phase
**What goes wrong:** The planner reads "Phase 8: fix CONS-02/03/11" and writes implementation
tasks that re-edit `features-section.tsx`, `is-active-link.ts`, and `types.ts`.
**Why it happens:** The CONTEXT.md and ROADMAP describe the fixes as pending; they predate (or
were unaware of) commit `7540ebe48` which already shipped them.
**How to avoid:** The plan's first task per requirement must be a **verification step** that
confirms the current state matches this research. Implementation tasks are conditional —
"if verification shows a regression, restore X." Current evidence: no regression; all three are
intact.
**Warning signs:** A plan task whose action is "change `<ArrowLeft />` to `<LayoutDashboard />`"
— that change already happened.

### Pitfall 2: Missing the config-driven nav and grepping for literal JSX
**What goes wrong:** Searching for `href="/#"` or `href="#"` in `.tsx` files returns nothing, and
a researcher concludes the dead link doesn't exist or was already fully fixed without locating
the definition.
**Why it happens:** The nav is data-driven (`DEFAULT_NAV_ITEMS` in `types.ts`), so hrefs are
object property values, not JSX attributes.
**How to avoid:** Grep for the nav config object name (`DEFAULT_NAV_ITEMS`, `dropdownItems`) and
read `navbar/types.ts` directly. (Done in this research.)
**Warning signs:** Zero grep matches for a finding the audit explicitly reported.

### Pitfall 3: `isActiveLink` 1-arg vs 2-arg drift
**What goes wrong:** The original Phase 8 commit called `isActiveLink(item.href)` (1 arg). The
function now requires `(href, pathname)`. A test or edit written against the old signature fails
to compile under the project's strict TypeScript.
**Why it happens:** `isActiveLink` was refactored after `7540ebe48` to take `pathname` explicitly
(it no longer calls `usePathname()` internally), making it a pure function.
**How to avoid:** Always use the current 2-arg form. The navbar components receive `pathname` as
a prop — rely on that, never re-introduce an internal `usePathname()` call inside the predicate.
**Warning signs:** TypeScript error "Expected 2 arguments, but got 1."

### Pitfall 4: 80% coverage threshold on a new test file
**What goes wrong:** A new test file for `features-section.tsx` renders the component but
asserts only the icon — the lefthook pre-commit coverage gate (80% lines/functions/branches/
statements) may flag the file or the changeset.
**Why it happens:** CLAUDE.md: 80% coverage is enforced via lefthook pre-commit.
**How to avoid:** When adding a `features-section` test, render the full component and assert
enough (all six card titles + the icon) that the component file's coverage stays above
threshold. Testing Library `render` of the whole section naturally exercises most of the file.
**Warning signs:** `vitest --coverage` reporting `features-section.tsx` below 80%.

## Code Examples

### Render a navbar sub-component with an explicit pathname (CONS-03 test pattern)
The navbar sub-components take `pathname` as a prop — no `next/navigation` mock needed.
```tsx
// Pattern for: src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx
import { render, screen } from "@testing-library/react";
import { NavbarDesktopNav } from "#components/layout/navbar/navbar-desktop-nav";
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

it('emits no aria-current="page" on the homepage', () => {
  render(<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/" />);
  // No nav link — Compare included — should be marked current on `/`.
  for (const item of DEFAULT_NAV_ITEMS) {
    const link = screen.getByRole("link", { name: new RegExp(`^${item.name}`) });
    expect(link).not.toHaveAttribute("aria-current", "page");
  }
});
```
Note: `<Link>` requires no special provider in jsdom; Testing Library renders it as an `<a>`.
A lightweight `vi.mock("next/link", ...)` passthrough is also acceptable if `<Link>` misbehaves
under jsdom — the existing `navbar.test.tsx` mocks `next/navigation` but not `next/link`.

### Assert the feature-card icon (CONS-02 test pattern)
lucide-react icons render an `<svg>` with a stable `class` containing the kebab-case name
(`lucide-layout-dashboard`) and `aria-hidden="true"` by default. Pin via the card's container.
```tsx
// Pattern for: src/components/sections/__tests__/features-section.test.tsx
import { render } from "@testing-library/react";
import FeaturesSectionDemo from "#components/sections/features-section";

it("Multi-Property Dashboard card uses the LayoutDashboard icon", () => {
  const { container } = render(<FeaturesSectionDemo />);
  const heading = [...container.querySelectorAll("h3")]
    .find((h) => h.textContent === "Multi-Property Dashboard");
  const card = heading?.closest("div.group\\/feature");
  // lucide-react emits class "lucide lucide-layout-dashboard" on the <svg>.
  expect(card?.querySelector("svg.lucide-layout-dashboard")).not.toBeNull();
});
```
Verify the exact lucide class string at plan time — render once and inspect, since lucide's
class scheme can change between versions. An alternative robust assertion is to set a
`data-testid` is NOT possible here (icon is `<LayoutDashboard />` with no props) — so either
assert the lucide class, or refactor the icon render to accept a testid (a one-line, low-risk
change if the class-based assertion proves brittle).

### Assert no placeholder hrefs in the nav config (CONS-11 test pattern)
```ts
// Pattern for: src/components/layout/navbar/__tests__/types.test.ts
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

it("no nav item or dropdown item uses a placeholder href", () => {
  const placeholders = new Set(["#", "/#", "", "javascript:void(0)"]);
  for (const item of DEFAULT_NAV_ITEMS) {
    expect(placeholders.has(item.href)).toBe(false);
    for (const sub of item.dropdownItems ?? []) {
      expect(placeholders.has(sub.href)).toBe(false);
      expect(sub.href.startsWith("/")).toBe(true); // real app route
    }
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `isActiveLink(href)` reading `usePathname()` internally | `isActiveLink(href, pathname)` pure function, `pathname` injected | After commit `7540ebe48` | Pure function is unit-testable without mocking `next/navigation`. Use the 2-arg form. |
| Resources parent `href: '#'` (dead) | `href: '/resources'` | Commit `7540ebe48` (2026-05-11) | CONS-11 already resolved. |
| `<ArrowLeft />` on Multi-Property Dashboard card | `<LayoutDashboard />` | Commit `7540ebe48` (2026-05-11) | CONS-02 already resolved. |
| `{ name: "Blog", href: "/blog" }` in dropdown | Item removed (blog deprioritized) | Commits `dcc3dfba0` / `485a593bc` | `/blog` no longer promoted in chrome; route still live. Not Phase 8 scope but consistent with D-06. |

**Deprecated/outdated:**
- The CONTEXT.md / ROADMAP framing of CONS-02/03/11 as "pending implementation" is stale. The
  implementation shipped 2026-05-11. Treat the phase as test-and-verify.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The three production fixes in commit `7540ebe48` have not regressed in any commit between `7540ebe48` and current `HEAD`. | Investigation Findings | LOW — verified each touchpoint file's current content directly; all three are intact in `HEAD`. The plan's verification tasks re-confirm at plan time, eliminating residual risk. |
| A2 | lucide-react emits a class like `lucide-layout-dashboard` on its `<svg>`, usable as a test selector. | Code Examples (CONS-02) | LOW — standard lucide-react behavior; flagged in the example to verify at plan time by rendering once. Fallback: add a `data-testid` to the icon render. |

**Note:** A1 is the load-bearing assumption of this entire research. It was verified by reading
the current content of all four touchpoint files (`features-section.tsx`, `is-active-link.ts`,
`navbar-desktop-nav.tsx`/`navbar-mobile-menu.tsx`, `types.ts`) — not inferred. The plan should
still open with a verification task per requirement so the verifier independently re-confirms.

## Open Questions

1. **Should this phase produce any production-code change at all?**
   - What we know: All three fixes are present and correct in `HEAD`. The genuine gap is
     regression-test coverage.
   - What's unclear: Whether the GSD phase model considers a "tests only, code already shipped"
     phase complete, or expects a production diff.
   - Recommendation: Plan the phase as three regression-pinning unit tests + a verification step
     per requirement. This satisfies CONTEXT.md's Specific Ideas ("expect regression-pinning tests
     for each fix") and the Phase 7 precedent. If a verification step uncovers a regression, the
     plan adds a one-line restore task — but current evidence says none is needed. A "tests only"
     PR is legitimate and matches Phase 7's regression-pin pattern.

2. **CONS-03 — does `aria-current` need a navbar-component test, or does the existing
   `is-active-link.test.ts` suffice?**
   - What we know: `is-active-link.test.ts` already pins the predicate including the `/`
     short-circuit. The navbar components add the `aria-current` *wiring*.
   - What's unclear: Whether pinning the predicate is enough, or the audit symptom (aria-current
     on a rendered navbar) warrants a component-level test.
   - Recommendation: Add ONE navbar component test that renders `<NavbarDesktopNav pathname="/">`
     (and optionally `<NavbarMobileMenu pathname="/">`) and asserts no link has
     `aria-current="page"`. This pins the *wiring*, not just the predicate, and directly
     reproduces the audit's test condition. Keep the existing `is-active-link.test.ts` as-is.

## Environment Availability

Not applicable in the external-tooling sense — this phase is purely client-side code + tests with
no external services, runtimes, or CLIs beyond the already-installed project toolchain.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vitest (`unit` project, jsdom) | All three regression tests | ✓ | 4.x | — |
| `@testing-library/react` | Component-render tests (CONS-02, CONS-03) | ✓ | installed | — |
| lucide-react | CONS-02 icon | ✓ | installed | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x, `unit` project, `jsdom` environment, `pool: threads` |
| Config file | `vitest.config.ts` (root); `unit` project, `include: ["src/**/*.{test,spec}.{ts,tsx}"]` |
| Quick run command | `bun run test:unit -- --run src/<path>/to/test.ts` (single file) |
| Full suite command | `bun run test:unit` (= `vitest --run --project unit`) |

Coverage: 80% lines/functions/branches/statements, enforced via lefthook pre-commit (CLAUDE.md).
Test setup files: `src/test/msw-polyfill.ts`, `src/test/unit-setup.ts`. Globals enabled (no
explicit `import` of `describe/it/expect` strictly required, though existing tests import them).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONS-02 | Multi-Property Dashboard feature card renders the `LayoutDashboard` lucide icon (not a back-arrow). | unit (component render) | `bun run test:unit -- --run src/components/sections/__tests__/features-section.test.tsx` | ❌ Wave 0 |
| CONS-03 | `<NavbarDesktopNav pathname="/">` emits NO `aria-current="page"` on any nav link (Compare included). | unit (component render) | `bun run test:unit -- --run src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx` | ❌ Wave 0 |
| CONS-03 | `isActiveLink` returns `false` for every non-root href when `pathname === "/"`. | unit (pure function) | `bun run test:unit -- --run src/lib/__tests__/is-active-link.test.ts` | ✅ exists — already pins the `/` short-circuit (`it("short-circuits root href...")`). Optionally extend with an explicit "all DEFAULT_NAV_ITEMS hrefs are inactive on `/`" case. |
| CONS-11 | No `DEFAULT_NAV_ITEMS` item or dropdown item uses a placeholder href (`#`, `/#`, empty); every dropdown href is an absolute app route. | unit (data assertion) | `bun run test:unit -- --run src/components/layout/navbar/__tests__/types.test.ts` | ❌ Wave 0 |
| CONS-11 | (optional, stronger) Each Resources dropdown href corresponds to a real route segment under `src/app/`. | unit (filesystem assertion) | same file as above | ❌ Wave 0 — `readdirSync('src/app')` drift-guard, mirrors the existing `robots.test.ts` / `sitemap.test.ts` filesystem-drift-guard pattern in this repo. |

### Sampling Rate
- **Per task commit:** `bun run test:unit -- --run <the single test file added by that task>`
- **Per wave merge:** `bun run test:unit` (full `unit` project) + `bun run typecheck && bun run lint`
- **Phase gate:** Full `unit` suite green + 80% coverage holds before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/components/sections/__tests__/features-section.test.tsx` — covers CONS-02 (icon pin).
      Render the full `<FeaturesSectionDemo />` so the component file stays above 80% coverage.
- [ ] `src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx` — covers CONS-03
      (`aria-current` wiring on `/`). Render with explicit `pathname` prop; no `next/navigation`
      mock needed. Consider also pinning the correct-positive case (e.g. `pathname="/compare"`
      → Compare link IS `aria-current="page"`) so the test guards both directions.
- [ ] `src/components/layout/navbar/__tests__/types.test.ts` — covers CONS-11 (no placeholder
      hrefs in `DEFAULT_NAV_ITEMS`).
- [ ] Optional: extend `src/lib/__tests__/is-active-link.test.ts` with a case iterating
      `DEFAULT_NAV_ITEMS` hrefs against `pathname="/"`. Low effort, directly ties the predicate
      test to the real nav config.
- Framework install: none — Vitest + Testing Library + jsdom already configured.

*(No new framework or fixture infrastructure needed; only new test files.)*

## Project Constraints (from CLAUDE.md)

These directives have locked-decision authority. The plan must comply.

- **Rule #10 — lucide-react only:** Icons must come from `lucide-react`. Never
  `@radix-ui/react-icons`, never emojis. CONS-02's `LayoutDashboard` already satisfies this.
- **Rule #2 — no barrel files / re-exports:** New test files import subjects directly from their
  defining file (`#components/...`, `#lib/...`), never via an `index.ts`.
- **Rule #4 — no commented-out code:** If the plan touches any file, delete dead code rather than
  comment it.
- **Rule #5 — no inline styles; Rule #1 — no `any`:** Applies to any code touched. Tests use
  `unknown` + guards if typing is needed; no `any`.
- **Cross-cutting token rule (REQUIREMENTS.md):** No new hex/rgb/`bg-white`/inline-ms tokens. This
  phase adds tests only — no styling — so the risk surface is near zero. If a verification step
  surfaces a regression and a production edit is needed, that edit must use `globals.css` tokens.
- **Accessibility — `aria-current`:** CLAUDE.md's Accessibility section governs `aria-current` on
  nav. The current navbar correctly emits `aria-current="page"` only for genuinely active routes
  via `isActiveLink`. The CONS-03 test pins this.
- **Testing conventions:**
  - Vitest 4 + chai 6 bug: use `.rejects.toMatchObject({ message: expect.stringContaining(...) })`,
    never `.rejects.toThrow('string')`. (Unlikely to matter here — these tests are synchronous
    assertions — but applies if any async assertion is added.)
  - `vi.hoisted()` for any mock variable referenced inside `vi.mock()`. The existing
    `navbar.test.tsx` demonstrates the pattern; the new navbar test should not need mocks at all
    (props-driven), which is simpler and preferable.
  - 80% coverage threshold enforced via lefthook pre-commit — see Pitfall 4.
  - Never leave `.skip` tests.
- **File naming:** kebab-case test files; tests live in `__tests__/` directories alongside the
  subject (matches `src/lib/__tests__/`, `src/components/layout/__tests__/` in the repo).
- **Git workflow:** feature branch `gsd/phase-8-nav-active-states` → push → `gh pr create`. Never
  push to `main`. Perfect-PR gate: two consecutive zero-finding review cycles.

## Sources

### Primary (HIGH confidence)
- Codebase (verified by direct file reads):
  - `src/components/sections/features-section.tsx` — CONS-02 state
  - `src/lib/is-active-link.ts` + `src/lib/__tests__/is-active-link.test.ts` — CONS-03 logic & test
  - `src/components/layout/navbar/navbar-desktop-nav.tsx`, `navbar-mobile-menu.tsx`,
    `navbar.tsx`, `types.ts` — navbar wiring & nav config
  - `vitest.config.ts` — test framework config
  - `.planning/config.json` — `nyquist_validation: true`
- Git history (`git show 7540ebe48`, `git log`, `git merge-base --is-ancestor`) — confirmed the
  Phase 8 fixes were committed 2026-05-11 and are ancestors of `HEAD`.
- Filesystem (`ls src/app/`) — confirmed `/resources`, `/help`, `/faq`, `/contact` routes exist.
- `CLAUDE.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `08-CONTEXT.md` — phase scope
  & project rules.

### Secondary (MEDIUM confidence)
- None — all findings verified against primary sources.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing toolchain verified in `package.json` /
  `vitest.config.ts`.
- Architecture: HIGH — all touchpoint files read directly; data flow traced end to end.
- Pitfalls: HIGH — the "already implemented" pitfall is the dominant risk and is verified by git
  history + current file contents.
- Investigation findings (CONS-02/03/11): HIGH — each finding's current code state read directly;
  original-bug state confirmed via `git show 7540ebe48`.

**Research date:** 2026-05-20
**Valid until:** 2026-06-19 (stable — marketing chrome; no fast-moving dependencies). Re-verify
the three touchpoint files at plan time in case of intervening commits.
