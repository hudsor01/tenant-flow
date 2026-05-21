---
phase: 11-token-alignment
reviewed: 2026-05-21T16:05:26Z
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
  warning: 0
  info: 2
  total: 2
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-21T16:05:26Z
**Depth:** deep
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Independent second-cycle review of PR #740 (token-alignment). All seven files were
re-verified at deep depth with fresh eyes — the prior cycle's zero-finding verdict was
not assumed.

Verification performed:

- **Token resolution.** Every `var(--duration-*)` reference in the five component files
  (`grid-pattern`, `loading-spinner`, `chart-loading-skeleton`, `blog-loading-skeleton`,
  `blog-empty-state`) resolves to a real rung defined in `src/app/globals.css:249-258`
  (`--duration-100/200/300/500/700/1000`, plus `--duration-medium: 350ms` used by
  `loading-spinner.tsx:176`). No dangling token references.
- **Stagger monotonicity.** All four re-spaced delay sequences are strictly increasing
  with no adjacent-token collisions: `chart` `0,200,300,500,700`; `blog-skeleton`
  `0,100,200,300,500,700,1000`; `blog-empty-state` `0,300,500,1000`; `loading-spinner`
  `LoadingDots` `0,200,300`. The PR diff confirms the deliberate re-spacing flagged in
  the prior cycle's WR-01.
- **Drift-guard correctness.** The four `DRIFT_PATTERNS` regexes were exercised against
  positive and negative fixtures: `inlineMs` correctly excludes the `0ms` zero-case and
  `${...}ms` template expressions; `rgb` correctly rejects `srgb(`/`var-rgb(`; `bgWhite`
  correctly rejects `bg-white-card`. All nine `DRIFT_EXEMPTIONS` files exist on disk and
  each carries a per-pattern scope plus a justification comment.
- **Live test run.** `design-token-drift.test.ts` (2719 generated assertions),
  `resources/page.test.tsx`, `loading-skeleton-tokens.test.tsx`, `grid-pattern.test.tsx`,
  and `blog-empty-state.test.tsx` all pass. The drift scan finds zero genuine drift
  across `src/components/**` and `src/app/**`.
- **Convention compliance.** No `any`, no `as unknown as`, no barrel files. Vitest 4 +
  jsdom patterns observed.

Two Info-level findings — both latent, neither produces a current failure. No Critical
or Warning issues.

## Info

### IN-01: `grid-pattern.tsx` square stagger still emits raw computed milliseconds

**File:** `src/components/ui/grid-pattern.tsx:111`
**Issue:** The PR tokenized `animationDuration` on both animated elements
(`grid-pattern.tsx:68` and `:112`), but the sibling `animationDelay` on the per-square
`<rect>` directly above line 112 was left as a raw computed-ms expression:

```tsx
animationDelay: animated ? `${(x + y) * 100}ms` : undefined,
```

This is the only inline-ms construct surviving in the five components the PR set out to
tokenize. It escapes the `design-token-drift.test.ts` `inlineMs` regex because the regex
requires a literal digit after the quote (`["'`]\s*[1-9]\d*ms`) and a `${...}` template
opens with `$` — so the drift guard cannot catch it. Because `(x + y) * 100` is unbounded
it has no single `--duration-*` rung to map to, so a like-for-like swap is not possible;
the value is also a purely decorative grid-square cascade where the exact delay is
immaterial. Not a correctness defect — noted because it leaves the file partially
tokenized (the `animationDuration` line immediately below it was tokenized in the same
edit) and represents a known blind spot in the drift guard's coverage.

**Fix:** Either accept and document the dynamic case (a one-line comment next to line 111
noting "dynamic per-square cascade — no fixed token rung; intentionally untokenized"), or
clamp the cascade to discrete token rungs, e.g.:

```tsx
// pick the nearest defined rung; caps the cascade and keeps it tokenized
const DELAY_RUNGS = ["0ms", "var(--duration-100)", "var(--duration-200)", "var(--duration-300)"] as const;
// ...
animationDelay: animated ? DELAY_RUNGS[Math.min(x + y, DELAY_RUNGS.length - 1)] : undefined,
```

### IN-02: drift-guard `hex` regex matches 3-4 digit issue references inside string literals

**File:** `src/app/__tests__/design-token-drift.test.ts:26`
**Issue:** The `hex` pattern `#(?:...|[0-9a-fA-F]{3,4})\b` matches `#NNN`/`#NNNN` issue
references (e.g. `#725`, `#404`). The current mitigation — scanning string-literal
content only via `extractStringContent` — neutralizes refs in *comments* (the common
case, and the one the meta-test on line 179 pins). It does **not** cover a `#NNN` ref
that lives inside a *string literal*, e.g. a toast message `toast("see ticket #725")` or
JSX text `{"Fixed in PR #404"}`. Such a string would false-positive as a 3-digit hex
color, and the `HEX_ALIAS_PREFIXES` allowlist only suppresses `#`-prefixed import
specifiers, not arbitrary issue refs. This is latent, not active: a grep of the scanned
tree found no `#NNN` issue ref inside a string literal today, and all 2719 generated
assertions pass. Flagged so a future maintainer who adds such a string knows the failure
will be a guard false-positive, not real drift.

**Fix:** Either narrow the hex pattern, or extend the post-match filter on lines 142-148
to drop matches that are not plausible color literals, or add a documented note in the
file header that `#NNN` issue refs must live in comments, never string literals. A
lightweight defensive option: keep the comment-only mitigation but add one meta-test
asserting the known limitation so the boundary is explicit.

Separately, the `two-factor-setup-steps.tsx` exemption comment in `DRIFT_EXEMPTIONS`
(line 89) says the justification comment is on "line 62"; the actual `bg-white` usage is
on line 63 (line 62 is the justification comment itself). Trivial off-by-one in a doc
comment — fix opportunistically alongside IN-02.

---

_Reviewed: 2026-05-21T16:05:26Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
