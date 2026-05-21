# Design-Token Drift Guard — Mechanism

Phase 11 deliverable (TOKEN-03). This document describes how design-token drift is
enforced for future maintainers. It replaces a deleted, fictional `LINT-RULE.md` that
described a non-existent `color-tokens` ESLint plugin.

## Mechanism

Design-token drift is enforced by a **Vitest unit-project test**:

```
src/app/__tests__/design-token-drift.test.ts
```

It is **not** an ESLint plugin and **not** stylelint. The repo lints with **Biome**
(`bun run lint` runs `biome check`). There is no ESLint in this repo, and ESLint will
not be added (locked decision D-01).

A prior Phase 11 burst built a `color-tokens` ESLint plugin. That entire ESLint stack
was deleted when the repo migrated to Biome (commits `dc3365f48`, `fd7c95d91`, PR #717),
and the doc describing the plugin was removed in `816c01e0a`. TOKEN-03 was rebuilt as a
Vitest drift-guard test, following the repo's established `readFileSync`-based drift-guard
pattern (`src/app/__tests__/marketing-copy-landlord-only.test.ts`, `src/app/sitemap.test.ts`,
`src/app/robots.test.ts`).

## What it scans

- **Roots:** `src/components` and `src/app` (recursively).
- **File types:** `.ts` and `.tsx`.
- **Skipped:** test files — anything matching `/__tests__/`, `.test.`, `.spec.`, or
  ending in `.d.ts` — via the `isTestPath` helper. This is also why the drift-guard
  test does not self-trigger on its own regex / fixture string literals: it lives under
  `src/app/__tests__/`, so `isTestPath` excludes it from its own walk.

The walk uses `readdirSync(root, { recursive: true, withFileTypes: true })` — a Node
builtin, no new dependency.

## The four drift patterns

D-02 enumerates exactly four drift patterns. `bg-black` and `text-white` are deliberately
**not** in scope (dialog/lightbox scrim overlays are an intentional pattern).

| Pattern | Regex | Catches | Example drift |
|---------|-------|---------|---------------|
| `hex` | `/#(?:[0-9a-fA-F]{8}\|[0-9a-fA-F]{6}\|[0-9a-fA-F]{3,4})\b/g` | `#RGB` / `#RGBA` / `#RRGGBB` / `#RRGGBBAA` hex color literals | `fill="#2563eb"` |
| `rgb` | `/\brgba?\s*\(/gi` | `rgb(` / `rgba(` function calls (the `\b` blocks `srgba(` / `vargba(` false positives) | `background: rgba(0,0,0,.5)` |
| `bgWhite` | `/\bbg-white(?:\/(?:\d{1,3}\|\[[^\]]+\]))?\b/g` | the `bg-white` Tailwind class, including `bg-white/50` and `bg-white/[var(--x)]` | `className="bg-white"` |
| `inlineMs` | `/\[\s*[a-z-]*:?\s*[1-9]\d*ms\s*\]\|["'`+"`"+`]\s*[1-9]\d*ms\s*["'`+"`"+`]/g` | non-zero inline millisecond durations, both Tailwind arbitrary values (`[animation-delay:200ms]`) and JS string literals (`animationDelay: "200ms"`) | `animationDelay: "300ms"` |

### The `0ms` zero-case

The `inlineMs` regex uses `[1-9]\d*` for the millisecond digits, **not** `\d+`. This means
`0ms` is **not** drift and needs no edit. `globals.css` has no `--duration-0` token, and
`0ms` is a legitimate "no delay" — it is the first item of a staggered animation sequence.
A literal `[animation-delay:0ms]` or `animationDelay: "0ms"` passes the guard untouched.

## The D-03 allowlist

Legitimate exceptions are expressed in a per-pattern `DRIFT_EXEMPTIONS` map keyed by the
normalized relative path. Exemptions are scoped **per pattern, not whole-file**: a file
exempt for `hex` is still scanned for `inlineMs`, `rgb`, and `bgWhite`. Adding `logo-cloud.tsx`
to the `hex` exemption does not silence an inline-ms regression in that same file.

| File | Exempt pattern | Rationale |
|------|----------------|-----------|
| `src/app/opengraph-image.tsx` | `hex` | `next/og` `ImageResponse` (satori) renders a static image; satori has no access to CSS custom properties. |
| `src/app/layout.tsx` | `hex` | HTML `<meta>` `themeColor` / `msapplication-TileColor` values are browser-chrome colors, not CSS-variable-resolvable. |
| `src/app/(owner)/documents/templates/components/build-template-html.ts` | `hex` | Generated standalone HTML/PDF document template; the rendered output is a self-contained file, not a themed app surface. |
| `src/app/(owner)/reports/page.tsx` | `hex` | Generated standalone HTML/PDF report export. |
| `src/components/dashboard/dashboard-filters.tsx` | `hex` | Generated standalone HTML/PDF export. |
| `src/components/leases/rent-increase-notice-dialog.tsx` | `hex` | Generated standalone HTML legal-notice document. |
| `src/components/maintenance/detail/work-order-template.ts` | `hex` | Generated standalone HTML work-order document. |
| `src/components/sections/logo-cloud.tsx` | `hex` | Third-party brand SVG logos (Stripe `#635BFF`, Supabase, DocuSeal). Brand guidelines require the exact brand hex. |
| `src/components/auth/google-button.tsx` | `hex` | Google brand SVG logo (the four-color "G" mark). Brand guidelines require the exact brand hex. |
| `src/components/auth/two-factor-setup-steps.tsx` | `bgWhite` | QR-code container. QR scanners require a literal white background regardless of theme; line 62 of the file carries the in-code justification comment. This is the one D-03 extension the Phase 11 audit surfaced — D-03's original enumerated list did not include it, but it is a genuine exception of the same class. |

### A known D-03-class file outside the current scan scope

`src/lib/templates/lease-template.ts` is a generated standalone-HTML document template
of the same class as the exempt template files. It is currently **outside** the scan
scope (`src/components` + `src/app` only). If the scan scope is ever widened to include
`src/lib`, this file will need a `hex` exemption entry.

## How to add a new exemption

1. Open `src/app/__tests__/design-token-drift.test.ts`.
2. Add a line to the `DRIFT_EXEMPTIONS` map, keyed by the normalized relative path
   (forward slashes), with the specific pattern(s) the file is exempt for.
3. Add a justification comment immediately above the entry. The justification must
   describe **why the file genuinely cannot consume a CSS custom property** — for
   example, satori has no CSS-variable access, the output is a self-contained HTML/PDF
   document, or a brand guideline mandates the exact hex. This is the same discipline
   rule as `BANLIST_EXEMPTIONS` in `marketing-copy-landlord-only.test.ts`.

Anything that **can** consume a token must use one. "It is more convenient to hardcode"
is not a valid justification. A non-exempt file with a hardcoded value is drift and the
test will fail.

## Where it runs

The test file lands in the `unit` Vitest project (`vitest.config.ts` `include` glob
`src/**/*.{test,spec}.{ts,tsx}`). It therefore runs in:

- `bun run test:unit` — the local unit-test command.
- The lefthook **pre-commit** `unit-tests` hook — a drift-introducing commit fails locally.
- The CI **`checks`** test gate — a drift-introducing PR fails before merge.

A future PR that introduces a non-exempt hex / `rgb(` / `bg-white` / inline-ms value
fails the drift-guard test in pre-commit and in CI.

## Escape-hatch policy

There is **no** `eslint-disable`-style inline escape comment. The only way to allow a
value the guard would otherwise flag is a reviewed, commented entry in the
`DRIFT_EXEMPTIONS` map. This keeps every exception auditable in one place — a reviewer
sees the full set of exemptions and their justifications in a single map, rather than
scattered inline suppressions. Any change to the allowlist is reviewed under the
perfect-PR merge gate.

## Known limitation

The `hex` scan inspects **string-literal and template-literal content only** — it
extracts the content of `"..."`, `'...'`, and `` `...` `` delimiters before applying the
hex regex. This is the precise fix for the non-color `#NNNN` false-positive problem:
issue references like `PR #725`, `error #185`, and the `&#8984;` HTML entity live in
comments and JSX text, not inside string delimiters, so they are not flagged. Genuine
color literals (`fill="#635BFF"`, `style="...color:#222..."`) always live inside string
literals and are still caught.

Subpath-import aliases (`#config/`, `#components/`, etc.) are additionally filtered via
the `HEX_ALIAS_PREFIXES` list as forward-protection — they are never color literals even
if they appear inside a string.

The residual limitation: a hex-shaped string literal that is genuinely **not** a color
(for example, a fictional `"#222"` used as test data inside a non-test source file) would
be a false positive. No such case exists in the codebase today. If one ever fires, either
move the value or add a scoped `DRIFT_EXEMPTIONS` entry with a justification.

The `rgb`, `bgWhite`, and `inlineMs` patterns scan the raw file text; the audit confirmed
they produce no false positives in the current codebase.

The `inlineMs` pattern only catches **literal** millisecond values (`["'`+"`"+`]\s*[1-9]\d*ms`).
It does **not** — and cannot — catch a computed template expression such as
`` `${(x + y) * 100}ms` `` (the per-square stagger in `src/components/ui/grid-pattern.tsx`).
Such an expression opens with `$`, not a digit, so it never matches. This is a documented,
accepted exception: a computed cascade is keyed off runtime values (here, grid coordinates)
and spans an unbounded millisecond range, so it has no single `--duration-*` rung to map to.
The grid-pattern occurrence carries an in-code comment marking it intentional. A future
maintainer adding a computed `${...}ms` stagger should likewise leave it untokenized with an
in-code comment — the drift-guard will not flag it either way.
