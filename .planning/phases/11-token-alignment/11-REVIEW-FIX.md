---
phase: 11-token-alignment
fixed_at: 2026-05-21T00:00:00Z
review_path: .planning/phases/11-token-alignment/11-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-05-21T00:00:00Z
**Source review:** .planning/phases/11-token-alignment/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Token rounding collapsed the blog skeleton stagger — two adjacent lines now animate in lockstep

**Files modified:** `src/components/shared/blog-loading-skeleton.tsx`
**Commit:** 6e6ecf2
**Applied fix:** The two adjacent skeleton bars (lines 4 and 5) both resolved to
`var(--duration-500)`, animating in lockstep. Re-spaced the six animated bars to
a strictly-increasing, all-distinct sequence of existing `--duration-*` rungs:
`0, --duration-100, --duration-200, --duration-300, --duration-500,
--duration-700, --duration-1000`. No two adjacent bars share a token, so the
cascade reads as a sequential left-to-right fade-in (each bar's reveal starts
strictly after the previous bar's). No new tokens were added to `globals.css` —
the fix uses only existing rungs.

`chart-loading-skeleton.tsx` was inspected as part of this finding: its current
stagger is `0, --duration-200, --duration-300, --duration-500, --duration-700`
— already strictly increasing with all tokens distinct and no adjacent
collision. No change was required there; the lockstep defect only existed in
`blog-loading-skeleton.tsx`.

### IN-01: `bgWhite` drift regex over-matches `bg-white`-prefixed identifiers

**Files modified:** `src/app/__tests__/design-token-drift.test.ts`
**Commit:** 34a9311
**Applied fix:** Replaced the trailing `\b` on the `bgWhite` regex with a
`(?![\w-])` negative lookahead so `bg-white-card` and similar prefixed
identifiers no longer match. Regex is now
`/\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?(?![\w-])/g`.

### IN-02: `rgb` drift regex can match hyphen-prefixed `rgb(` tokens

**Files modified:** `src/app/__tests__/design-token-drift.test.ts`
**Commit:** 34a9311
**Applied fix:** Replaced the leading `\b` on the `rgb` regex with a
`(?<![\w-])` negative lookbehind so a hyphen-prefixed `var-rgb(` fragment no
longer matches, making the comment's no-false-positive claim hold. Regex is now
`/(?<![\w-])rgba?\s*\(/gi`. Updated the inline comment accordingly.

### IN-03: Meta-test does not exercise the Tailwind-arbitrary-value branch of `inlineMs`, nor the `HEX_ALIAS_PREFIXES` filter

**Files modified:** `src/app/__tests__/design-token-drift.test.ts`
**Commit:** 34a9311
**Applied fix:** Added two meta-test cases — one asserting the `inlineMs` regex
catches the Tailwind arbitrary-value class `[animation-delay:200ms]` (the exact
drift pattern the production swaps targeted), and one asserting the
`HEX_ALIAS_PREFIXES` filter suppresses a `#components`-style subpath-import
specifier. Both previously-untested load-bearing branches are now pinned.

### IN-04: `resources/page.test.tsx` token assertions are substring `.toContain` checks — brittle to formatting

**Files modified:** `src/app/resources/page.test.tsx`
**Commit:** a6b4bbc
**Applied fix:** Relaxed the `color-mix` assertion from an exact-substring
`.toContain("color-mix(in_oklch,var(--color-primary)")` to a formatting-tolerant
`.toMatch(/color-mix\(\s*in[_ ]oklch\s*,\s*var\(--color-primary\)/)`. This
matches the token reference rather than the Tailwind arbitrary-value underscore
spacing, so a Biome/Prettier reflow or the non-arbitrary `in oklch` (space) form
no longer fails the regression pin — only a genuine loss of the token would.
Added an inline comment explaining the intent.

---

_Fixed: 2026-05-21T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
