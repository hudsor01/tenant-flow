---
phase: 11-token-alignment
cycle: 1
reviewed: 2026-05-11T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - color-tokens.eslint.js
  - eslint.config.js
  - src/components/auth/two-factor-setup-steps.tsx
  - .planning/phases/11-token-alignment/LINT-RULE.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 11: Code Review Report — Cycle 1

**Reviewed:** 2026-05-11
**Depth:** standard
**Files Reviewed:** 4
**Status:** clean

## Summary

Phase 11 codifies the design-token drift guard by extending the existing
`color-tokens` ESLint plugin from 1 rule (`no-hex-colors`) to 4 rules
(`no-hex-colors`, `no-rgba-colors`, `no-bg-white`, `no-inline-ms`). All
four rules are present in the plugin and wired in `eslint.config.js` § 7
at `error` severity.

The PR scope is intentionally surgical: 1 commit, 4 files, +236/-7. No
product surface is touched. The single product-file edit is a paired
`eslint-disable-next-line color-tokens/no-bg-white` + justification comment
on the QR-code container in `two-factor-setup-steps.tsx` (which already had
the justification comment pre-Phase-11; this PR just adds the disable
directive next to it).

`pnpm lint` with a cache-busted run returns zero errors and zero warnings
across the entire codebase. An adversarial probe file containing one
violation per rule was run through `node_modules/.bin/eslint` and produced
exactly four errors (one per rule), confirming each rule fires as designed.

### Verification matrix

| Acceptance gate | Status | Evidence |
|---|---|---|
| All 4 rules present in `color-tokens.eslint.js` | PASS | `plugin.rules` keys: `no-hex-colors`, `no-rgba-colors`, `no-bg-white`, `no-inline-ms` (lines 25, 83, 127, 169) |
| All 4 rules wired in `eslint.config.js` § 7 | PASS | Lines 304-307, all four set to `'error'` |
| Plugin uses ESM (`export default`) | PASS | `color-tokens.eslint.js:219` |
| No `any` types in plugin | PASS | Sole `any` match is the English word inside a comment (line 183) |
| Plugin version bumped (1.0.0 → 2.0.0) | PASS | `color-tokens.eslint.js:22` |
| File-level ignores preserved | PASS | `eslint.config.js:299` — `**/opengraph-image.*`, `**/templates/lease-template.*` |
| Brand-color allowlist preserved in `no-hex-colors` | PASS | Google + Stripe hexes still in `allowedPatterns` (lines 42-50) |
| QR-code disable + justification | PASS | `two-factor-setup-steps.tsx:62-63` — both lines present, justification first, disable second |
| `pnpm lint` (cache-busted) returns zero errors | PASS | Confirmed locally |
| Adversarial probe triggers all 4 rules | PASS | Hex / rgba / bg-white / `[300ms]` each produced 1 error in the probe run |
| Hex codes elsewhere in `src/` properly gated | PASS | Every `src/` hex match (layout.tsx, build-template-html.ts, reports/page.tsx, dashboard-filters.tsx, logo-cloud.tsx, google-button.tsx) has a documented `eslint-disable` block with justification |
| Phase 4/5/2/8/9/10 regression surface | PASS | Plugin change is config-only; no product code modified beyond the QR comment pair |
| `LINT-RULE.md` documents plugin shape, escape hatches, and how to add new rules | PASS | All four rules tabulated; escape-hatch ladder explained; new-rule playbook included |

### Regex correctness (adversarial probe)

Each rule's regex was tested against 7-10 adversarial cases in an
out-of-band Node REPL. Findings:

**`no-hex-colors`** — `/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g`
- Correctly catches: `#ff0000`, `#FFF`, `#FFFFFFFF` (8-digit RGBA), mid-string embeddings
- Correctly rejects: `#zzz`, prose without `#`

**`no-rgba-colors`** — `/\brgba?\s*\(/gi`
- Correctly catches: `rgba(...)`, `RGBA(...)` (uppercase), `Rgb(...)`, `rgb (255, 0, 0)` (whitespace before paren)
- Correctly rejects: `srgba(...)` (the `\b` boundary blocks embeddings), `var(--color-red)` (no `rgb` prefix), prose

**`no-bg-white`** — `/\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?\b/g`
- Correctly catches: `bg-white`, `bg-white/40`, `bg-white/[var(...)]`, `hover:bg-white`, `bg-white` in a class list, `bg-white` followed by anything via tailwind-class word-boundary semantics
- Correctly rejects: `bg-whitey` (no boundary), `bg-whitebox` (no boundary)
- Edge cases that match but are syntactically invalid Tailwind: `bg-white/` (trailing slash, no opacity number) and `bg-white-anything` (hyphen-extended). Neither is a real Tailwind class and neither appears in the codebase (grep `src/` finds zero such usages). Not a false-positive risk in practice — flagging an invalid class as a "violation" is still correct because the developer would need to rewrite it anyway.

**`no-inline-ms`** — `/\[\s*\d+ms\s*\]/g`
- Correctly catches: `duration-[300ms]`, `delay-[150ms]`, `transition-[300ms]`, bare `[300ms]`, `[ 300ms ]` (internal whitespace)
- Correctly rejects: `duration-300` (canonical Tailwind), raw `300ms` outside brackets (CSS files), `[300s]` (seconds not ms)

### Codebase audit

Grep across `src/**/*.{ts,tsx}` (excluding tests, opengraph-image, lease
templates) for the four drift patterns:

- **Hex codes:** 19 matches, all in files with documented file-level
  `eslint-disable color-tokens/no-hex-colors` blocks with rationale
  (PDF inline CSS, brand logos, HTML `<meta>` color attributes).
- **rgb / rgba:** zero matches.
- **`bg-white`:** one match (the QR code in `two-factor-setup-steps.tsx`),
  paired with the disable + justification this PR added.
- **`[Nms]` arbitrary durations:** zero matches.

The token-drift floor for the codebase is clean.

### Phase requirements coverage

- **TOKEN-01** (`/resources` Free Downloads tags → tokens) — verified
  clean in the commit message ("`/resources` already used canonical tokens
  (bg-muted, bg-primary/10, bg-success/10, bg-warning/10) from prior
  Phase 4 cleanup"). Out-of-band grep on `src/app/resources/**` confirms
  no neon-pink tag classes remain.
- **TOKEN-02** (`/resources` cards → consistent surface tokens) — same
  Phase 4 cleanup outcome.
- **TOKEN-03** (sitewide audit + lint rule) — this PR. Lint rule shipped,
  documented in `LINT-RULE.md`, runs at error severity, gated by lefthook
  pre-commit + the `checks` GitHub Actions workflow.

### CLAUDE.md compliance

- Zero `any` types in the plugin file (only English word "any" in a
  comment).
- Plugin file uses ESM (`export default plugin`).
- No barrel files introduced.
- No commented-out code.
- No inline styles modified or added.
- No PostgreSQL changes.
- No `as unknown as` assertions.

## Critical Issues

None.

## Warnings

None.

## Info

None.

---

_Reviewed: 2026-05-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
