---
phase: 11-token-alignment
reviewed: 2026-05-21T00:00:00Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - src/app/__tests__/design-token-drift.test.ts
  - src/app/resources/page.test.tsx
  - src/components/ui/grid-pattern.tsx
  - src/components/ui/loading-spinner.tsx
  - src/components/shared/chart-loading-skeleton.tsx
  - src/components/shared/blog-loading-skeleton.tsx
  - src/components/shared/blog-empty-state.tsx
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-21T00:00:00Z
**Depth:** deep
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed PR #740 (token-alignment) at deep depth: 5 production decorative
components where ~19 inline `[NNN]ms` Tailwind durations were swapped to the
canonical numeric `--duration-*` scale, plus two new test files
(`design-token-drift.test.ts` drift-guard and `resources/page.test.tsx`
regression pin).

Verification baseline: `globals.css` defines exactly `--duration-{75,100,150,
200,300,500,700,1000}` plus `--duration-standard` (250ms) and `--duration-medium`
(350ms). The bare names `--duration-fast/normal/slow/slower/instant` are NOT
defined as `--duration-*` (only `--transition-duration-*` exists). I confirmed
**no swap in this PR introduced a non-existent token** — every `var(--duration-N)`
written resolves. `loading-spinner.tsx:176` uses `var(--duration-medium)` (350ms,
defined) — pre-existing, valid.

All `var(--duration-*)` references in the diff resolve, the zero-cases (`0ms`)
and the computed template stagger (`` `${(x + y) * 100}ms` `` in
`grid-pattern.tsx:111`) were correctly left untouched, and the drift-guard
regexes were exercised against edge cases and behave as documented.

The findings below are about (1) a genuine animation-behavior change where the
token rounding collapsed an evenly-staggered skeleton sequence into one with two
identical adjacent steps, and (2) minor regex over-match edge cases in the
drift-guard. No correctness or security defects.

## Warnings

### WR-01: Token rounding collapsed the blog skeleton stagger — two adjacent lines now animate in lockstep

**File:** `src/components/shared/blog-loading-skeleton.tsx:27,31`
**Issue:** The original `animationDelay` sequence was an even 150ms staircase:
`0, 150, 300, 450, 600, 750, 900`. After tokenization to the nearest defined
`--duration-*` value the sequence became `0, 150, 300, 500, 500, 700, 1000`.
Lines 4 and 5 (the `width: "96%"` and `width: "78%"` bars) **both resolve to
`var(--duration-500)`** — `450ms` rounds up to 500, `600ms` rounds down to 500.
The staircase now has two identical adjacent steps, so those two skeleton bars
animate in perfect lockstep instead of sequentially. The context brief for this
phase explicitly required the animations to "still be functionally equivalent";
a collapsed stagger step is a visible behavior change, and the project standard
is "no known cosmetic issues."

`chart-loading-skeleton.tsx:18-30` has the same class of drift: original
`200,400,600,800` became `200,300,500,700` — the `400ms` tie was broken
*downward* to `--duration-300` (300ms is equidistant from 400 vs `--duration-500`),
compressing the first interval. `blog-empty-state.tsx:33` rounds `600ms` down to
`--duration-500` as well. None of these break the page, but they are not the
"equivalent" swaps the phase brief called for.

**Fix:** The defined scale has no value between 300 and 500, so an exact
preservation of the 150ms staircase is impossible with the numeric tokens.
Either (a) keep the visual stagger distinct by picking non-colliding tokens for
the two bars — e.g. line 4 stays `var(--duration-500)` and line 5 moves to
`var(--duration-700)` (and shift the subsequent bars), accepting that the steps
are no longer uniform; or (b) if a precise, evenly-stepped stagger is a design
requirement, add the missing rungs to the `--duration-*` scale in `globals.css`
(`--duration-450`, `--duration-600`) and use them. Option (a) is the lower-risk
fix. Document the chosen rationale in `11-01-SUMMARY.md` so the non-uniform
stagger is not later mistaken for drift.

```tsx
// blog-loading-skeleton.tsx — option (a): keep adjacent steps distinct
<div ... style={{ width: "96%", animationDelay: "var(--duration-500)" }} />
<div ... style={{ width: "78%", animationDelay: "var(--duration-700)" }} />
<div className="h-6" />
<div ... style={{ width: "88%", animationDelay: "var(--duration-1000)" }} />
```

## Info

### IN-01: `bgWhite` drift regex over-matches `bg-white`-prefixed identifiers

**File:** `src/app/__tests__/design-token-drift.test.ts:30`
**Issue:** `/\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?\b/g` matches `bg-white` inside
`bg-white-ish` because `-` is a non-word character, so `\b` is satisfied
immediately after `bg-white`. There is no real Tailwind class `bg-white-ish`, so
this is a theoretical false-positive only — but it means the regex would also
match `bg-white` inside a hypothetical custom utility or a string like
`"bg-white-card"`. The risk is a spurious failure, not missed drift, so this is
informational.
**Fix:** Anchor the trailing edge to a class-terminating context, e.g. require
the match be followed by whitespace, quote, end-of-string, or `/`:
`/\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?(?![\w-])/g`. The `(?![\w-])` negative
lookahead rejects a following `-` or word char.

### IN-02: `rgb` drift regex can match hyphen-prefixed `rgb(` tokens

**File:** `src/app/__tests__/design-token-drift.test.ts:28`
**Issue:** The comment states `\b` "blocks `srgba(` / `vargba(` false positives."
It does block `srgb(` (no word boundary between `s` and `r`), but it does NOT
block a hyphen-prefixed occurrence such as `var-rgb(` or a CSS custom property
fragment `--my-rgb(` — `-` is a non-word char so `\b` matches between it and `r`.
This is an extremely unlikely false-positive in this codebase (no such
identifier exists today), so it is informational, not blocking. Detection of
genuine `rgb()`/`rgba()` color literals is unaffected.
**Fix:** If tightening is desired, use a negative lookbehind for word/hyphen
chars: `/(?<![\w-])rgba?\s*\(/gi`. Node's V8 supports lookbehind. Otherwise,
leave as-is and note the limitation in `11-LINT-RULE.md`.

### IN-03: Meta-test does not exercise the Tailwind-arbitrary-value branch of `inlineMs`, nor the `HEX_ALIAS_PREFIXES` filter

**File:** `src/app/__tests__/design-token-drift.test.ts:159-180`
**Issue:** The meta-test (`drift regexes catch known drift`) is a sound idea and
covers the JS-string-literal `inlineMs` branch (`"200ms"`), the `0ms` zero-case
exclusion, and both hex-string-scoping cases. However it never asserts the
*Tailwind arbitrary-value* branch of the `inlineMs` alternation
(`\[\s*[a-z-]*:?\s*[1-9]\d*ms\s*\]`) catches a real `[animation-delay:200ms]` —
which is precisely the drift pattern this PR's production swaps targeted in
`loading-spinner.tsx`. It also never asserts that `HEX_ALIAS_PREFIXES` actually
suppresses a `#components`-style subpath-import false-positive. Both code paths
are load-bearing for the guard's correctness; an untested branch is
false-confidence surface — a future regex edit could silently break the
arbitrary-value branch and the meta-test would still pass.
**Fix:** Add two meta-test cases:
```ts
it("inlineMs regex catches a Tailwind arbitrary-value ms class", () =>
  expect("[animation-delay:200ms]".match(DRIFT_PATTERNS.inlineMs)).not.toBeNull());
it("hex scan ignores a #components subpath-import specifier", () => {
  const m = extractStringContent('import x from "#components/ui/button";')
    .match(DRIFT_PATTERNS.hex) ?? [];
  expect(m.filter((s) => !HEX_ALIAS_PREFIXES.some((p) => s === p || s.startsWith(p))))
    .toHaveLength(0);
});
```

### IN-04: `resources/page.test.tsx` token assertions are substring `.toContain` checks — narrowly scoped but brittle to formatting

**File:** `src/app/resources/page.test.tsx:23,31,67`
**Issue:** Three assertions pin exact substrings: `'<Badge variant="secondary">'`,
`"bg-card"`, and `"color-mix(in_oklch,var(--color-primary)"`. I verified all
three currently match `src/app/resources/page.tsx` (lines 187, 136/181, 94/208).
They are correct today. The brittleness note: `color-mix(in_oklch,...)` is the
Tailwind-arbitrary-value form with a literal underscore (no spaces). A
maintainer who rewrites that gradient as a non-arbitrary value, or Biome/Prettier
reflowing it, would fail the test even if the page remains fully tokenized — the
test pins a *formatting* detail, not a *semantic* property. This is acceptable
for a regression pin (its stated purpose) but worth a comment so a future
failure is diagnosed as "formatting changed" rather than "drift introduced."
**Fix:** Optional. Add an inline comment at line 67 noting the assertion pins the
Tailwind arbitrary-value underscore form, or relax to a tolerant regex:
`expect(SOURCE).toMatch(/color-mix\(\s*in[_ ]oklch\s*,\s*var\(--color-primary\)/)`.
Negative assertions (no hex / no rgb / no bg-white / no inline-ms) are sound and
need no change.

---

_Reviewed: 2026-05-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
