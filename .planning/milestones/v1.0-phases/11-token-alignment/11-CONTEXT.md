# Phase 11: Design-Token Alignment & Resources Page - Context

**Gathered:** 2026-05-21 (via /gsd-discuss-phase 11 --auto)
**Status:** Ready for planning

<domain>
## Phase Boundary

Design-token alignment, scoped by ROADMAP Phase 11 (requirements TOKEN-01, TOKEN-02, TOKEN-03):

1. **TOKEN-01** — `/resources` Free Downloads tags ("Checklist", "Spreadsheet", "Guide") use `globals.css` tokens (`--color-{primary,accent,info}` or muted backgrounds with `text-foreground`) — eliminate neon pink.
2. **TOKEN-02** — `/resources` cards use consistent surface tokens (`bg-card`/`bg-muted`) — no decorative grey/blue/mint/cream tints. Plus a site-wide audit replacing remaining hex/rgb/`bg-white`/inline-`[NNN]ms` references in `src/components/**` and `src/app/**` with `globals.css` tokens.
3. **TOKEN-03** — Codify a drift-guard unit test that fails future PRs introducing non-token color/duration values; document the mechanism in `.planning/phases/11-token-alignment/11-LINT-RULE.md`.

Token-alignment only — NOT a redesign of `/resources` layout. No new design tokens.
</domain>

<decisions>
## Implementation Decisions

### TOKEN-03 — lint mechanism (LOCKED)
- **D-01:** TOKEN-03 is implemented as a **drift-guard Vitest unit test**, NOT an ESLint plugin and NOT stylelint. The repo lints with **Biome** (`"lint": "biome check"`) — there is no ESLint, and ESLint will not be added. The roadmap's original "custom ESLint plugin or stylelint" wording was corrected on 2026-05-21 (the user directed removal of all ESLint references; the fictional `LINT-RULE.md` describing a non-existent `color-tokens` ESLint plugin was deleted).
- **D-02:** The drift-guard test follows the repo's established pattern (`src/app/sitemap.test.ts`, `src/app/robots.test.ts`): it scans `src/components/**` and `src/app/**` for hex literals, `rgb(`/`rgba(`, the `bg-white` class, and arbitrary `[NNN]ms` Tailwind durations, and asserts zero matches outside the documented allowlist. It runs in the `unit` Vitest project → executes in the lefthook pre-commit hook + the CI `checks`/test gate, so it fails future drift-introducing PRs.

### Legitimate exceptions — the drift-guard allowlist (LOCKED)
- **D-03:** These usages genuinely cannot consume CSS custom properties and are ALLOWLISTED in the drift-guard test (not drift):
  - `src/app/opengraph-image.tsx` (and any `**/opengraph-image.*`) — `next/og` `ImageResponse` (satori) renders to a static image and has no access to CSS variables; inline color literals are required.
  - `src/app/layout.tsx` — HTML `<meta>` `themeColor` / `msapplication-TileColor` values are browser-chrome colors, not CSS-var-resolvable.
  - Generated standalone-HTML document templates (e.g. `src/app/(owner)/documents/templates/**/build-template-html.*`, `**/lease-template.*`) — the rendered output is a self-contained HTML/PDF file, not a themed app surface.
  - Third-party brand colors required by brand guidelines: Google (`#4285F4`, `#DB4437`, `#F4B400`, `#0F9D58`), Stripe purple (`#635BFF`).
- **D-04 (Claude's discretion):** Research must enumerate ALL hex/rgb/`bg-white`/inline-ms occurrences in scope and classify each as drift (→ replace with a token) or legitimate-exception (→ allowlist). Any occurrence not clearly legitimate is drift and gets tokenized.

### TOKEN-01 / TOKEN-02 scope
- **D-05:** Replace `/resources` neon-pink download tags + decorative card tints with canonical `globals.css` tokens. Researcher confirms current `/resources` state — note `src/app/resources/page.tsx` already uses `color-mix(in oklch, var(--color-primary) ...)` gradients (token-based), so part of `/resources` may already be aligned.

### Claude's Discretion
- The exact token chosen for each drift occurrence (match the design intent — primary/accent/info/muted/surface).
- Whether any drift was already fixed in the earlier v1.0 burst (researcher determines shipped-vs-remaining per requirement).

</decisions>

<specifics>
## Specific Ideas

- Audit source: external UI audit 2026-05-08 — findings TOKEN-01, TOKEN-02, TOKEN-03.
- Drift-guard test analogs: `src/app/sitemap.test.ts`, `src/app/robots.test.ts` (the repo's established `readFileSync`/grep CI-gating drift-guard pattern).
- Unlike Phases 7-10 (verify-and-pin of already-shipped fixes), Phase 11 likely has REAL production edits (tokenizing drift) plus genuinely-new work (the drift-guard test + `11-LINT-RULE.md`). Researcher flags shipped-vs-remaining per requirement.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Token authority
- `src/app/globals.css` — the canonical design-token source (oklch `--color-*`, `--duration-*`, etc.)
- `CLAUDE.md` — zero-tolerance rules (no inline styles, no hex/rgb, no `bg-white`); the `--duration-*` token scale

### Code touchpoints (verify during research)
- `src/app/resources/page.tsx` — Resources page tags + card backgrounds (TOKEN-01/02)
- `src/components/**`, `src/app/**` — site-wide drift audit scope (TOKEN-02)
- `src/app/sitemap.test.ts`, `src/app/robots.test.ts` — drift-guard test pattern analog (TOKEN-03)
- `biome.json` — the project's linter config (no ESLint)

</canonical_refs>

<deferred>
## Deferred Ideas

None — phase scope is TOKEN-01/02/03 only.

</deferred>

---

*Phase: 11-token-alignment*
*Context gathered: 2026-05-21 via /gsd-discuss-phase 11 --auto*
