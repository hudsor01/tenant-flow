# Design Token Drift Guard — ESLint Plugin

**Plugin file:** `color-tokens.eslint.js` (project root)
**Config integration:** `eslint.config.js` § 7 "frontend/design-system-color-tokens"
**Status:** Active, error-severity, CI-blocking (lefthook + Vercel pre-merge)

## What it blocks

The `color-tokens` plugin ships four rules. All four run at `error` severity on every `src/**/*.{ts,tsx}` file:

| Rule | Blocks | Rationale |
|------|--------|-----------|
| `color-tokens/no-hex-colors` | `#RGB` / `#RRGGBB` / `#RGBA` / `#RRGGBBAA` literals | Use Tailwind tokens (`bg-primary`, `text-muted-foreground`, etc.) so dark mode + theming work. |
| `color-tokens/no-rgba-colors` | `rgb(...)` / `rgba(...)` function calls | Same reason as hex. Use oklch tokens defined in `globals.css`. |
| `color-tokens/no-bg-white` | The Tailwind class `bg-white` (and `bg-white/N` opacity variants) | Use `bg-background` so the surface follows light/dark theme. |
| `color-tokens/no-inline-ms` | Tailwind arbitrary `[Nms]` duration values (e.g. `duration-[300ms]`, `delay-[150ms]`) | Use canonical `--duration-*` tokens (`duration-fast`, `duration-normal`, `duration-slow`). |

## Allowed escape hatches

**File-level ignores** (in `eslint.config.js` § 7):
- `**/opengraph-image.*` — `@vercel/og` `ImageResponse` requires inline color literals (it doesn't have access to CSS variables).
- `**/templates/lease-template.*` — generated print/PDF HTML; the rendered output goes to PDF, not a themed surface.

**In-rule allowlist** (`no-hex-colors` only):
- Google brand colors: `#4285F4`, `#DB4437`, `#F4B400`, `#0F9D58`
- Stripe purple: `#635BFF`

These are required by third-party brand guidelines and can't be tokenized.

**Inline disables** (per occurrence, with justification):

```tsx
{/* bg-white intentional: QR codes require true white background for scanning */}
{/* eslint-disable-next-line color-tokens/no-bg-white */}
<div className="rounded-lg border bg-white p-4">
  <img src={qrCodeDataUrl} alt="QR" />
</div>
```

Every escape hatch MUST be paired with a one-line justification comment. Reviewers will reject silent `eslint-disable` lines.

## How to add a new rule

1. Open `color-tokens.eslint.js`.
2. Add a new entry under `plugin.rules`:
   ```js
   'no-XYZ': {
     meta: { type: 'suggestion', docs: { ... }, messages: { fail: '...' }, schema: [] },
     create(context) {
       const pattern = /.../g
       function check(node, value) { /* ... */ }
       return {
         Literal(node) { if (typeof node.value === 'string') check(node, node.value) },
         TemplateElement(node) { check(node, node.value.raw) }
       }
     }
   }
   ```
3. Wire it in `eslint.config.js` § 7 `rules`: `'color-tokens/no-XYZ': 'error'`.
4. Run `pnpm lint` to see what it catches in the current codebase. Either fix the surfaced violations or add file-level ignores with justifications.
5. Document the new rule in this file.

## Why these specific patterns

Each rule corresponds to one of four observed drift modes during the v1.0 audit:

- **Hex colors** — designer-handoff legacy. Auto-formatters convert `oklch(...)` to `#hex` in some IDEs.
- **rgb()/rgba()** — Tailwind's old way of expressing opacity. Replaced by `bg-primary/40` syntax in v4.
- **`bg-white`** — silently breaks dark mode. The most common drift class because designers reach for it without thinking.
- **`[Nms]` arbitrary durations** — copy-pasted from third-party libraries (Headless UI / Radix examples). The token system defines `--duration-*` to keep motion timing coherent across the site.

## CI integration

The rule runs as part of `pnpm lint` which is in the lefthook `pre-commit` hook (parallel with `pnpm typecheck`, `pnpm test:unit`, `gitleaks`) and the `checks` GitHub Actions workflow. Both gate merges to `main`.

A future PR that introduces a hex code (outside the allowlist) or an inline-ms class will fail locally before commit AND in CI as a blocking check. No silent drift possible.

## See also

- `src/app/globals.css` — canonical token authority. Color, spacing, radius, shadow, typography, duration scales all defined here.
- `CLAUDE.md § Zero Tolerance Rules` rule #5 ("No inline styles") and the design-token cross-cutting constraint that ran on every Phase 1-10 PR diff.
- `.planning/phases/<NN>/<NN>-VALIDATION.md` in earlier phases — each one ends with a "Cross-cutting design-token diff gate" section that ran `git diff main...HEAD | grep ...` checks to catch token drift in PR diffs. Those grep gates are now superseded by this ESLint plugin since the rule runs on every file, every PR, every commit.
