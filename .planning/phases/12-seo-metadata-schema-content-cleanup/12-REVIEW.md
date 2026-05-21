---
phase: 12-seo-metadata-schema-content-cleanup
reviewed: 2026-05-21T21:35:00Z
depth: deep
files_reviewed: 9
files_reviewed_list:
  - src/app/api/og/features/route.tsx
  - src/app/api/og/pricing/route.tsx
  - src/app/features/page.tsx
  - src/lib/generate-metadata.ts
  - src/app/__tests__/seo-title-separator-drift.test.ts
  - src/app/features/__tests__/page.test.ts
  - src/lib/__tests__/generate-metadata.test.ts
  - src/components/layout/__tests__/footer.test.tsx
  - src/app/__tests__/seo-aria-current-audit.test.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase 12: Code Review Report (Re-Review — Cycle 2 Post-Fix Round 2)

**Reviewed:** 2026-05-21T21:35:00Z
**Depth:** deep
**Files Reviewed:** 9
**Status:** issues_found (1 Info)

## Summary

Re-review covering the second cycle-2 fix pass (PR #741, Phase 12). Both prior
Info findings (IN-01 misleading comment, IN-02 `NavHref` widening to `string`)
were targeted in one commit. Verification:

- `bun run typecheck` is clean (exit 0).
- `seo-aria-current-audit.test.ts` — 8/8 cases pass.
- 279 tests across the other three reviewed test files pass.
- No `any`, no `as unknown as`, no inline styles outside the documented
  `@vercel/og` exception, no emojis, no `@radix-ui/react-icons`.
- Prior IN-01 (misleading "single `aria-current`" comment) is correctly
  resolved: the rewritten comment on `seo-aria-current-audit.test.ts:52-59`
  honestly states the rendered DOM emits TWO `aria-current="page"` attributes
  on `/resources` (parent `<Link>` + dropdown `<Link>`, same href), and that
  the audit models the UNIQUE-URL invariant instead. Verified against
  `navbar-desktop-nav.tsx:98,130` and `navbar-mobile-menu.tsx:56,88` — both
  surfaces unconditionally emit `aria-current` from `isActiveLink(href,
  pathname)` on parent and dropdown alike.
- Dedup logic traced manually for all 5 routes — `/resources` filters to a
  single `['/resources']` after the `Set` dedup, matching
  `EXPECTED_ACTIVE['/resources']`.
- The CONS-03 regression pin (`isActiveLink('/compare', '/') === false`),
  breadcrumb-leaf cardinality, footer absence-of-aria-current, sitemap
  external-link contract, E.164 phone format, OG-route shape (1200x630,
  oklch-only, edge runtime, revalidate=3600), title-separator drift guard
  (regex + meta-test cases) — all confirmed intact.
- Cross-file integrity: `getSiteUrl()` is the single canonical site-URL
  source consumed by `createDefaultMetadata`, `getJsonLd`, and
  `page-metadata.createPageMetadata`. No drift between
  `generate-metadata.ts` and the page metadata helper.

One Info finding remains: the prior IN-02 fix attempt does NOT actually
restore the literal-union narrowing of `NavHref`. The mechanism stated in
the new comment (lines 62-63) — "literal-union narrowing is preserved by
deduping a `const` tuple at the value level" — is contradicted by an
independent isolated TypeScript 6 strict-mode compilation: a deliberately
typo'd `EXPECTED_ACTIVE` value (e.g. `"/features": "/feauters"`) compiles
with exit code 0. `NavHref` resolves to `string`, not a literal union.

The runtime safety net still catches typos (filter empty + non-null
expected → `expect(expected).toBeNull()` fails), so this is a documentation
accuracy issue, not a functional regression. But cycle-2's stated goal —
"EXPECTED_ACTIVE's typecheck guard now catches typos again" — is not met.

## Info

### IN-01: `NavHref` resolves to `string`, not a literal union — typecheck guard claim is false

**File:** `src/app/__tests__/seo-aria-current-audit.test.ts:60-71`

**Issue:** The new comment on lines 62-63 reads:

> The literal-union narrowing is preserved by deduping a `const` tuple at
> the value level instead of widening to `string[]` via cast.

This describes an invariant that does not actually hold. `DEFAULT_NAV_ITEMS`
in `src/components/layout/navbar/types.ts:17` is typed
`export const DEFAULT_NAV_ITEMS: NavItem[]`, with `NavItem.href: string`.
The spread `...DEFAULT_NAV_ITEMS.flatMap((item) => [item.href, ...])`
therefore widens to `string[]` at the source — `item.href` is already
`string`, not a literal. The outer `as const` on `RAW_HREFS` cannot narrow
elements the source produced as `string`.

Concretely:

- `RAW_HREFS`'s type is approximately `readonly ["/", ...string[]]`.
- `(typeof RAW_HREFS)[number]` resolves to `string`.
- `NavHref = string`.
- `Readonly<Record<Route, NavHref | null>>` accepts ANY string value, so a
  typo in `EXPECTED_ACTIVE` (e.g. `"/feauters"`) typechecks fine.

Independently reproduced under TypeScript 6 strict mode in an isolated
project: a `EXPECTED_ACTIVE` mapping a `Route` to `"/feauters"` compiles
with exit code 0. The same pattern applied to a hand-crafted const tuple
(no spread from a `NavItem[]` source) DOES narrow correctly — the issue is
specifically the source-side widening, not the dedup style.

Runtime safety still applies. The audit's per-route assertion is
`expect(active.length).toBeLessThanOrEqual(1)` followed by either
`expect(active[0]).toBe(expected)` (when `active.length === 1`) or
`expect(expected).toBeNull()` (when `active.length === 0`). A typo in
`EXPECTED_ACTIVE` would land in the `expected non-null but active empty`
branch and fail the `.toBeNull()` assertion. The regression is caught — it
just fails with a less specific diagnostic than a typecheck error would
give.

The previous review's IN-02 (the fix being acted on) stated:

> "Both `DEFAULT_NAV_ITEMS[i].href` and the dropdown hrefs are string
> literals in `types.ts`, so the `as const` chain narrows correctly."

That claim was incorrect. `types.ts` types the export as `NavItem[]`, so
the literal values get widened to `string` at the declaration site before
they ever reach the audit's spread. Acting on the incorrect claim with the
current commit produces code that LOOKS like it preserves narrowing (the
`as const` is there, `RAW_HREFS` is a const tuple) but doesn't.

**Fix:** Either tighten types at the SOURCE to actually narrow, or drop the
misleading claim. Option A is the higher-leverage choice because it also
benefits any future caller that wants type-safe href routing (not just this
audit).

Option A — genuine literal-union narrowing (recommended):
```typescript
// In src/components/layout/navbar/types.ts — replace the existing
// DEFAULT_NAV_ITEMS export.
export const DEFAULT_NAV_ITEMS = [
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
  { name: "Compare", href: "/compare" },
  { name: "About", href: "/about" },
  {
    name: "Resources",
    href: "/resources",
    hasDropdown: true,
    dropdownItems: [
      { name: "Free Resources", href: "/resources" },
      { name: "Help Center", href: "/help" },
      { name: "FAQ", href: "/faq" },
      { name: "Contact", href: "/contact" },
    ],
  },
] as const satisfies readonly NavItem[];
```
With `as const satisfies readonly NavItem[]`, every `href` becomes a literal
type while structurally still matching `NavItem`. The audit's `NavHref`
then resolves to the real literal union, and a typo in `EXPECTED_ACTIVE`
fails at compile time. Existing consumers that destructure
`name`/`href`/`hasDropdown`/`dropdownItems` should be unaffected (literal
types are assignable to `string`/`boolean`).

Option B — keep current shape, tell the truth:
```typescript
// Replace lines 60-71 in seo-aria-current-audit.test.ts:
// Marketing-nav hrefs derived from `DEFAULT_NAV_ITEMS`. `DEFAULT_NAV_ITEMS`
// is typed `NavItem[]` (href: string), so the spread elements widen and
// `(typeof RAW_HREFS)[number]` resolves to `string`. `EXPECTED_ACTIVE`'s
// value type does NOT catch typos at compile time — the runtime filter +
// `expect(active[0]).toBe(expected)` / `expect(expected).toBeNull()` flow
// is the regression net.
const NAV_HREFS = Array.from(
  new Set([
    "/",
    ...DEFAULT_NAV_ITEMS.flatMap((item) => [
      item.href,
      ...(item.dropdownItems?.map((d) => d.href) ?? []),
    ]),
  ]),
);
type NavHref = string;
```
This drops the dead `as const` and `RAW_HREFS` aliasing so the code stops
implying a guarantee it doesn't deliver. The `RAW_HREFS` const-tuple form
in the current code is load-bearing for nothing else once narrowing is
gone.

---

_Reviewed: 2026-05-21T21:35:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
