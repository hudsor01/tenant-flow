# Phase 11: Design-Token Alignment & Resources Page - Research

**Researched:** 2026-05-21
**Domain:** Design-token hygiene — CSS custom-property alignment + a CI-gating drift-guard unit test
**Confidence:** HIGH

## Summary

Phase 11 is a brownfield audit-fix phase with three requirements. The site-wide investigation produced a precise finding: **TOKEN-01 and TOKEN-02's `/resources`-specific portions are already fully shipped** — `src/app/resources/page.tsx` was already rebuilt with canonical tokens (`bg-card`, `bg-muted`, `bg-primary/10`, `text-primary`, `Badge variant="secondary"`, `color-mix(in oklch, var(--color-primary) ...)` gradients). There is no neon pink and no decorative grey/blue/mint/cream card tints on that page. TOKEN-01 and TOKEN-02's `/resources` clauses are verify-and-pin only.

The **real production work is the TOKEN-02 site-wide audit and TOKEN-03 drift-guard test**. The site-wide hex/`rgb`/`bg-white`/`[NNN]ms` audit found that *every hex literal in scope is a legitimate D-03 exception* (third-party brand SVG logos, generated standalone HTML/PDF document templates, `next/og` image, `layout.tsx` browser-chrome meta colors). There are **zero `rgb(`/`rgba(` occurrences** and **`bg-white` appears exactly once** (the 2FA QR-code container, a legitimate exception — QR scanners require true white). The one genuine drift class is **inline millisecond durations** — 19 occurrences across 5 component files, none of which are D-03 exceptions. These are the only tokenization edits the phase requires.

A prior phase-11 burst built a `color-tokens` ESLint plugin; that entire mechanism was deleted when the repo migrated to Biome (commit `dc3365f48`, `fd7c95d91`). The `LINT-RULE.md` describing it was deleted in `816c01e0a`. TOKEN-03 must be rebuilt as a Vitest drift-guard test following the repo's established `readFileSync`/recursive-walk pattern — the closest analog is `src/app/__tests__/marketing-copy-landlord-only.test.ts`, not `sitemap.test.ts`.

**Primary recommendation:** Two-plan phase. Plan A — tokenize the 19 inline-ms durations + verify-and-pin `/resources`. Plan B — author `src/app/__tests__/design-token-drift.test.ts` (a `readdirSync` walker with a scoped exemption map) and `11-LINT-RULE.md`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** TOKEN-03 is a **drift-guard Vitest unit test**, NOT an ESLint plugin and NOT stylelint. The repo lints with **Biome** (`"lint": "biome check"`). There is no ESLint; ESLint will not be added. The fictional `LINT-RULE.md` describing a non-existent `color-tokens` ESLint plugin was deleted.
- **D-02:** The drift-guard test follows the repo's established pattern (`src/app/sitemap.test.ts`, `src/app/robots.test.ts`): it scans `src/components/**` and `src/app/**` for hex literals, `rgb(`/`rgba(`, the `bg-white` class, and arbitrary `[NNN]ms` Tailwind durations, and asserts zero matches outside the documented allowlist. It runs in the `unit` Vitest project → executes in the lefthook pre-commit hook + the CI `checks`/test gate.
- **D-03 (Legitimate exceptions — the drift-guard allowlist):** These usages genuinely cannot consume CSS custom properties and are ALLOWLISTED:
  - `**/opengraph-image.*` — `next/og` `ImageResponse` (satori) renders to a static image; no CSS-variable access.
  - `src/app/layout.tsx` — HTML `<meta>` `themeColor` / `msapplication-TileColor` are browser-chrome colors.
  - Generated standalone-HTML document templates (`**/build-template-html.*`, `**/lease-template.*`, and peers) — self-contained HTML/PDF output, not themed app surfaces.
  - Third-party brand colors: Google (`#4285F4`, `#DB4437`, `#F4B400`, `#0F9D58`), Stripe purple (`#635BFF`).

### Claude's Discretion
- **D-04:** Research enumerates ALL hex/`rgb`/`bg-white`/inline-ms occurrences in scope and classifies each as drift or legitimate-exception. Any occurrence not clearly legitimate is drift and gets tokenized.
- The exact token chosen for each drift occurrence (match design intent — primary/accent/info/muted/surface).
- Whether any drift was already fixed in the earlier v1.0 burst (researcher determines shipped-vs-remaining per requirement).
- **D-05:** Confirm current `/resources` state — `page.tsx` already uses `color-mix(in oklch, var(--color-primary) ...)` gradients, so part of `/resources` may already be aligned.

### Deferred Ideas (OUT OF SCOPE)
None — phase scope is TOKEN-01/02/03 only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support | Shipped vs Remaining |
|----|-------------|------------------|----------------------|
| TOKEN-01 | `/resources` Free Downloads tags ("Checklist", "Spreadsheet", "Guide") use `globals.css` tokens — eliminate neon pink | Tags use `<Badge variant="secondary">` (`bg-secondary text-secondary-foreground`, fully tokenized). No neon pink anywhere on the page. | **ALREADY SHIPPED** — verify-and-pin only |
| TOKEN-02 | `/resources` cards use surface tokens; site-wide audit replaces hex/rgb/`bg-white`/inline-ms with `globals.css` tokens | `/resources` cards already use `bg-card`/`bg-muted`. Site-wide audit: all hex = D-03 exceptions; zero `rgb(`; `bg-white` ×1 = D-03 exception. **Remaining drift: 19 inline-ms durations in 5 files.** | **PARTIALLY SHIPPED** — `/resources` done; 19 inline-ms = real production edits |
| TOKEN-03 | Codify a drift-guard unit test that fails future PRs; document mechanism in `11-LINT-RULE.md` | No drift-guard test exists. Prior ESLint plugin was deleted in the Biome migration. Established pattern: `readFileSync` recursive walker (`marketing-copy-landlord-only.test.ts`). | **NOT STARTED** — genuinely new work |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `/resources` page rendering | Frontend Server (RSC) | — | `resources/page.tsx` is a server component; static marketing surface |
| Design-token definitions | CDN / Static (CSS) | — | `globals.css` `@theme` block — compile-time CSS custom properties consumed by Tailwind v4 |
| Inline-ms tokenization | Frontend (client + RSC components) | — | The 5 drift files are presentational components; the edit is a className/style swap, no tier change |
| Drift-guard test | Build / CI (Vitest `unit` project) | — | Pure filesystem scan; runs in lefthook pre-commit + CI test gate. No runtime tier |
| `11-LINT-RULE.md` | Documentation | — | Planning artifact, not shipped code |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.x `[VERIFIED: vitest.config.ts + CLAUDE.md]` | Test runner for the drift-guard test | Repo standard; `unit` project runs in pre-commit + CI |
| `node:fs` `readdirSync` / `readFileSync` | Node 24 builtin `[VERIFIED: CLAUDE.md]` | Recursive source-file walk + read | Zero new deps; exact pattern used by `marketing-copy-landlord-only.test.ts` |
| `node:path` `join` / `relative` | Node 24 builtin | Path construction for scan + readable test names | Same as the analog test |
| Tailwind CSS v4 | 4.x `[VERIFIED: CLAUDE.md]` | Token consumption (`duration-*` utilities map to `--duration-*`) | The token authority; `@theme` block in `globals.css` |
| Biome | 2.4.15 `[VERIFIED: biome.json $schema]` | The repo linter (`biome check`) | **NOT** an ESLint replacement candidate — TOKEN-03 is a test, not a lint rule |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` `globSync` | Node 24 builtin `[VERIFIED: node -e check]` | Alternative to `readdirSync` recursion | Optional — the `readdirSync({ recursive: true })` walker in the analog test is simpler and already proven |

**Do NOT install any new dependency.** `fast-glob`, `glob`, `tinyglobby` are all present transitively but the analog test uses `readdirSync` recursion — match it for consistency.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `readdirSync` recursive walker | `node:fs` `globSync` | `globSync` is terser but the proven repo pattern (`marketing-copy-landlord-only.test.ts`, 663 lines, battle-tested across 8 review cycles) uses `readdirSync({ recursive: true, withFileTypes: true })`. Match the proven pattern. |
| Vitest drift-guard test | Biome custom plugin / GritQL rule | LOCKED by D-01 against. Biome's plugin API is experimental; the established repo pattern is a unit test. Do not propose this. |
| Biome `noColorInvalidHex`-style rule | — | No Biome rule bans valid hex; LOCKED out by D-01 regardless. |

**Installation:** None. No `npm install` / `bun add` step in this phase.

**Version verification:** No new packages — version verification N/A. Vitest 4.x and Biome 2.4.15 are the existing pinned versions per `vitest.config.ts`, `biome.json`, and `CLAUDE.md`.

## Architecture Patterns

### System Architecture Diagram

```
                       PHASE 11 DATA FLOW

  ┌─────────────────────────────────────────────────────────┐
  │  TOKEN-01 / TOKEN-02 (/resources portion)                │
  │                                                          │
  │   src/app/resources/page.tsx  ──[already tokenized]──┐   │
  │     Badge variant="secondary"                        │   │
  │     bg-card / bg-muted / bg-primary/10               │   │
  │     color-mix(in oklch, var(--color-primary) ...)    ▼   │
  │                                            VERIFY & PIN  │
  │                                            (regression   │
  │                                             test only)   │
  └──────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────┐
  │  TOKEN-02 (site-wide audit portion) — REAL EDITS         │
  │                                                          │
  │  19 inline-ms occurrences across 5 files:                │
  │    grid-pattern.tsx (2)                                  │
  │    blur-fade.tsx (1)                                     │
  │    loading-spinner.tsx (3, arbitrary-value)              │
  │    chart-loading-skeleton.tsx (5)                        │
  │    blog-loading-skeleton.tsx (7)                         │
  │    blog-empty-state.tsx (4)                              │
  │         │                                                │
  │         ▼  replace literal "300ms" / [animation-         │
  │            delay:200ms] with var(--duration-*)           │
  │         │                                                │
  │  globals.css --duration-* scale ◄────────────────────┐  │
  │    75/100/150/200/300/500/700/1000 + standard(250)/   │  │
  │    medium(350)                                        │  │
  └───────────────────────────────────────────────────────┼──┘
                                                          │
  ┌───────────────────────────────────────────────────────┼──┐
  │  TOKEN-03 — DRIFT-GUARD TEST (genuinely new)           │  │
  │                                                        │  │
  │   src/app/__tests__/design-token-drift.test.ts         │  │
  │         │                                              │  │
  │         ▼  readdirSync({recursive:true}) over          │  │
  │            src/components/** + src/app/**              │  │
  │         │                                              │  │
  │         ▼  per file: readFileSync → 4 regex scans      │  │
  │            (hex, rgb(, bg-white, [NNNms])              │  │
  │         │                                              │  │
  │         ▼  EXEMPTION MAP (D-03 allowlist) ─────────────┘  │
  │            opengraph-image.* / layout.tsx /               │
  │            *template-html.* / lease-template.* /          │
  │            logo-cloud.tsx / google-button.tsx /           │
  │            two-factor-setup-steps.tsx (QR) / PDF dialogs  │
  │         │                                                 │
  │         ▼  assert zero non-exempt matches                 │
  │                                                           │
  │   Runs in: vitest `unit` project → lefthook pre-commit    │
  │            + CI `checks` test gate                        │
  └───────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| File | Role in Phase 11 |
|------|------------------|
| `src/app/resources/page.tsx` | TOKEN-01/02 target — already tokenized; verify-and-pin |
| `src/app/globals.css` | Token authority — `--duration-*` scale (lines 249-258), `--color-*` (lines 122-187) |
| `src/components/ui/grid-pattern.tsx` | Drift: 2 inline-ms (`animationDuration: "500ms"` L68, `"200ms"` L112) |
| `src/components/ui/blur-fade.tsx` | Drift: 1 inline-ms (`transitionDelay: "0ms"` / `${delay*80}ms` L116) |
| `src/components/ui/loading-spinner.tsx` | Drift: 3 arbitrary-value (`[animation-delay:0ms\|200ms\|400ms]` L245/251/257) |
| `src/components/shared/chart-loading-skeleton.tsx` | Drift: 5 inline-ms (`animationDelay` stagger L14-30) |
| `src/components/shared/blog-loading-skeleton.tsx` | Drift: 7 inline-ms (`animationDelay` stagger L14-39) |
| `src/components/shared/blog-empty-state.tsx` | Drift: 4 inline-ms (`animationDelay` stagger L29-42) |
| `src/app/__tests__/design-token-drift.test.ts` | NEW — the TOKEN-03 drift-guard test |
| `src/app/__tests__/marketing-copy-landlord-only.test.ts` | Pattern analog — `readdirSync` walker + scoped exemption map |
| `.planning/phases/11-token-alignment/11-LINT-RULE.md` | NEW — documents the drift-guard mechanism |

### Recommended Project Structure
```
src/app/__tests__/
├── marketing-copy-landlord-only.test.ts   # existing analog — copy its shape
└── design-token-drift.test.ts             # NEW (TOKEN-03)
.planning/phases/11-token-alignment/
└── 11-LINT-RULE.md                        # NEW — mechanism doc
```

### Pattern 1: Recursive source walker with scoped exemption map
**What:** A Vitest test that recursively reads every `.ts`/`.tsx` under one or more roots, runs regex scans, and skips a per-file allowlist.
**When to use:** TOKEN-03 — this is the exact shape to follow.
**Example:**
```typescript
// Source: src/app/__tests__/marketing-copy-landlord-only.test.ts (lines 300-315)
function walkSourceFiles(root: string): string[] {
	const entries = readdirSync(root, { recursive: true, withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const parentPath =
			(entry as { parentPath?: string; path?: string }).parentPath ??
			(entry as { path?: string }).path ?? "";
		const absPath = join(parentPath, entry.name);
		if (!/\.(ts|tsx)$/.test(entry.name)) continue;
		if (isTestPath(absPath)) continue;   // skips __tests__/, .test., .spec., .d.ts
		files.push(absPath);
	}
	return files;
}
```

### Pattern 2: `--duration-*` token consumption
**What:** Tailwind v4 maps `duration-N` utilities and `[animation-duration:var(--duration-N)]` arbitrary values to the `@theme` `--duration-*` custom properties.
**When to use:** Replacing the 19 inline-ms drift occurrences.
**Token scale available** (`globals.css` lines 249-258):
```
--duration-75: 75ms      --duration-300: 300ms     --duration-standard: 250ms
--duration-100: 100ms    --duration-500: 500ms     --duration-medium: 350ms
--duration-150: 150ms    --duration-700: 700ms
--duration-200: 200ms    --duration-1000: 1000ms
```
There is also a parallel `--transition-duration-{instant,fast,normal,slow,slower}` set (lines 114-118: 150/200/300/500/700ms) consumed by Tailwind's `duration-fast`/`duration-normal`/`duration-slow` named utilities (used in `globals.css` `@apply` rules and `blur-fade.tsx`).
**Example (arbitrary-value, the loading-spinner pattern that already exists in-repo):**
```typescript
// Source: src/components/ui/loading-spinner.tsx:245 — already token-correct for duration/timing
"[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:0ms]"
//                                                                                    ^^^^^^^^^^^^^^^^^^^^ this part is drift
// Tokenized form:
"[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:var(--duration-200)]"
```
**Nuance — stagger offsets:** Several drift occurrences are *stagger delays* (`0ms`, `200ms`, `400ms`, `600ms`, `300ms`, `450ms`, `750ms`, `900ms`). The `--duration-*` scale covers `0`-ish (use `--duration-75` floor or accept `0ms` as the zero case), `200`, `300`, `500`, `700`, `1000` directly. Values `400`, `450`, `600`, `750`, `800`, `900` have **no exact token**. The planner must decide per-occurrence: (a) snap to the nearest existing token (design-intent-preserving — these are decorative skeleton staggers, exact ms is not load-bearing), or (b) the drift-guard test treats a literal `0ms` specially. **Recommendation:** snap staggers to the nearest existing `--duration-*` token; `0ms` is a legitimate zero and the drift-guard regex should exempt the exact token `[animation-delay:0ms]` / `"0ms"` (or, cleaner, replace `0ms` with `var(--duration-75)`-relative `calc` is overkill — just keep `0` as the documented zero-case exemption, or use a CSS var for it). See Open Questions Q1.

### Anti-Patterns to Avoid
- **Proposing ESLint / stylelint / a Biome plugin for TOKEN-03** — LOCKED out by D-01. The mechanism is a Vitest unit test, full stop.
- **Adding a glob/fast-glob dependency** — `readdirSync({ recursive: true })` is the proven repo pattern; no new dep.
- **Scanning test files** — the walker must skip `__tests__/`, `.test.`, `.spec.`, `.d.ts` (the `isTestPath` helper). The drift-guard test file itself contains regex/string literals that would self-trigger.
- **Tokenizing the `/resources` page** — it is already done. Editing it risks regressions for zero requirement gain. Verify-and-pin only.
- **Treating `bg-black` / `text-white` as TOKEN-02 drift** — D-02 enumerates exactly four drift patterns: hex, `rgb(`/`rgba(`, the `bg-white` class, and `[NNN]ms`. `bg-black/N` overlays (image lightboxes, dialog scrims) and `text-white` are NOT in the four-pattern scope and NOT in this phase. Do not expand scope.
- **Inline `style={{}}` to inject the token** — `style={{ animationDelay: "var(--duration-200)" }}` is acceptable (it is a CSS-variable reference, not a hardcoded value, and CLAUDE.md's "no inline styles" rule targets hardcoded values; the existing skeletons already use `style={{}}` for `width`/`height`). Prefer Tailwind arbitrary values (`[animation-delay:var(--duration-200)]`) where the surrounding code already uses className-based animation, to stay closest to existing style.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recursive source-file enumeration | Custom `fs.readdir` recursion | `readdirSync(root, { recursive: true, withFileTypes: true })` | Node 24 builtin; the analog test already uses it |
| Per-file allowlist | Inline `if (path === ...)` chains | A `Record<string, true>` exemption map keyed by normalized relative path | `marketing-copy-landlord-only.test.ts`'s `BANLIST_EXEMPTIONS` is the proven shape |
| Color/duration token scale | New CSS variables | The existing `--color-*` / `--duration-*` / `--transition-duration-*` tokens in `globals.css` | CONTEXT says "No new design tokens" |
| Linting infrastructure | An ESLint/stylelint/Biome plugin | A Vitest `unit`-project test | D-01 LOCKED; the repo has no ESLint and the test runs in the same CI gate |

**Key insight:** Phase 11's "lint rule" is conceptually a test, not a linter. The repo already proves (`sitemap.test.ts`, `robots.test.ts`, `marketing-copy-landlord-only.test.ts`) that a `readFileSync`-based unit test is the canonical CI-gating drift guard here. Nothing needs to be built from scratch except the regex set and the exemption map.

## Drift Inventory (TOKEN-02 site-wide audit — D-04 deliverable)

This inventory IS the source for the planner's tokenization tasks.

### Category A — HEX LITERALS — all LEGITIMATE EXCEPTIONS (no edits required)

| File:Line | Value | Classification | Reason |
|-----------|-------|----------------|--------|
| `src/components/sections/logo-cloud.tsx:105` | `fill="#635BFF"` | LEGITIMATE | Stripe brand purple — D-03 |
| `src/components/sections/logo-cloud.tsx:130,139` | `fill="#3ECF8E"` | LEGITIMATE | Supabase brand green (logo wordmark) — D-03 third-party brand |
| `src/components/sections/logo-cloud.tsx:152,153` | `stopColor="#249361"`, `"#3ECF8E"` | LEGITIMATE | Supabase logo gradient stops — D-03 |
| `src/components/sections/logo-cloud.tsx:209` | `fill="#4F46E5"` | LEGITIMATE | DocuSeal brand indigo (logo wordmark) — D-03 third-party brand |
| `src/components/auth/google-button.tsx:127,131,135,139` | `#FBBC05`, `#EA4335`, `#34A853`, `#4285F4` | LEGITIMATE | Google brand SVG fills — D-03 explicitly lists `#4285F4` etc. (`#FBBC05`/`#EA4335`/`#34A853` are the Google "G" 4-color set) |
| `src/app/opengraph-image.tsx:15,22,42,93` | `#0D6FFF`, `#FFFFFF` (×3) | LEGITIMATE | `next/og` `ImageResponse` (satori) — D-03 explicitly allowlists `**/opengraph-image.*` |
| `src/app/layout.tsx:42,43,80` | `#2563eb`, `#1e3a8a`, `#2563eb` | LEGITIMATE | `themeColor` / `msapplication-TileColor` `<meta>` values — D-03 |
| `src/components/dashboard/dashboard-filters.tsx:52,61,63,66,67` | `#ccc`, `#222`, `#666`, `#f0f0f0` | LEGITIMATE | Generated standalone HTML export (PDF report template string) — D-03 "generated standalone-HTML document templates" |
| `src/app/(owner)/reports/page.tsx:79,88,90,93,94` | `#ccc`, `#222`, `#666`, `#f0f0f0` | LEGITIMATE | Generated standalone HTML export (PDF report) — D-03 |
| `src/components/leases/rent-increase-notice-dialog.tsx:72-80` | `#222`, `#666`, `#ccc`, `#f4f4f4`, `#444` | LEGITIMATE | Generated standalone HTML legal-notice document — D-03 |
| `src/components/maintenance/detail/work-order-template.ts:67-80` | `#222`, `#666`, `#444`, `#f4f4f4`, `#ddd` | LEGITIMATE | Generated standalone HTML work-order document (`*-template.ts`) — D-03 |
| `src/app/(owner)/documents/templates/components/build-template-html.ts:90-99` | `#222`, `#666`, `#ddd`, `#444`, `#888` | LEGITIMATE | D-03 explicitly allowlists `**/build-template-html.*` |

> Non-color `#NNNN` false positives confirmed and excluded: PR/issue numbers (`PR #725`, `error #185`), subpath-import aliases (`#config/`, `#components/`, `#lib/`), and the ⌘ HTML entity `&#8984;` in `app-shell-sidebar.tsx`. The drift-guard regex must anchor on color shape (`#` followed by exactly 3/4/6/8 hex digits at a word boundary) and only inspect string/template literals — see TOKEN-03 design below.

**Hex audit result: ZERO drift. All hex in scope is a D-03 legitimate exception.**

### Category B — `rgb(` / `rgba(` — NONE FOUND

`grep -rniE 'rgba?\(' src/components src/app --include='*.ts' --include='*.tsx' --exclude='*.test.*'` returns **zero matches**. No drift, nothing to allowlist.

### Category C — `bg-white` CLASS — one occurrence, LEGITIMATE EXCEPTION

| File:Line | Value | Classification | Reason |
|-----------|-------|----------------|--------|
| `src/components/auth/two-factor-setup-steps.tsx:63` | `className="rounded-lg border bg-white p-4"` | LEGITIMATE | QR-code container — line 62 carries the justification comment "QR codes require true white background for scanning". A QR scanner needs literal white regardless of theme. **This was NOT in CONTEXT D-03's enumerated list but is a genuine exception of the same class — the planner should add it to the allowlist and the `11-LINT-RULE.md` doc should record the rationale.** See Open Questions Q2. |

**`bg-white` audit result: ZERO drift. The single occurrence is a legitimate exception.**

### Category D — INLINE MILLISECOND DURATIONS — 19 occurrences, ALL DRIFT (the only real production edits)

| File:Line | Current value | Classification | Suggested token |
|-----------|---------------|----------------|-----------------|
| `src/components/ui/grid-pattern.tsx:68` | `animationDuration: animated ? "500ms" : undefined` | DRIFT | `var(--duration-500)` |
| `src/components/ui/grid-pattern.tsx:112` | `animationDuration: animated ? "200ms" : undefined` | DRIFT | `var(--duration-200)` |
| `src/components/ui/blur-fade.tsx:116` | `transitionDelay: shouldReduceMotion ? "0ms" : \`${delay * 80}ms\`` | DRIFT (computed) | `0ms`→zero-case; `${delay*80}ms` is a *computed* dynamic stagger — see Q1. Likely keep computed or snap; flag for planner |
| `src/components/ui/loading-spinner.tsx:245` | `[animation-delay:0ms]` (arbitrary value) | DRIFT | `0ms` zero-case OR `var(--duration-*)` — see Q1 |
| `src/components/ui/loading-spinner.tsx:251` | `[animation-delay:200ms]` | DRIFT | `[animation-delay:var(--duration-200)]` |
| `src/components/ui/loading-spinner.tsx:257` | `[animation-delay:400ms]` | DRIFT | no exact token (400) — snap to `--duration-300` or `--duration-500` |
| `src/components/shared/chart-loading-skeleton.tsx:14` | `animationDelay: "0ms"` | DRIFT | `0ms` zero-case — see Q1 |
| `src/components/shared/chart-loading-skeleton.tsx:18` | `animationDelay: "200ms"` | DRIFT | `var(--duration-200)` |
| `src/components/shared/chart-loading-skeleton.tsx:22` | `animationDelay: "400ms"` | DRIFT | no exact token — snap |
| `src/components/shared/chart-loading-skeleton.tsx:26` | `animationDelay: "600ms"` | DRIFT | no exact token — snap to `--duration-500`/`--duration-700` |
| `src/components/shared/chart-loading-skeleton.tsx:30` | `animationDelay: "800ms"` | DRIFT | no exact token — snap to `--duration-700` |
| `src/components/shared/blog-loading-skeleton.tsx:14` | `animationDelay: "0ms"` | DRIFT | `0ms` zero-case |
| `src/components/shared/blog-loading-skeleton.tsx:18` | `animationDelay: "150ms"` | DRIFT | `var(--duration-150)` |
| `src/components/shared/blog-loading-skeleton.tsx:22` | `animationDelay: "300ms"` | DRIFT | `var(--duration-300)` |
| `src/components/shared/blog-loading-skeleton.tsx:26` | `animationDelay: "450ms"` | DRIFT | no exact token — snap |
| `src/components/shared/blog-loading-skeleton.tsx:30` | `animationDelay: "600ms"` | DRIFT | no exact token — snap |
| `src/components/shared/blog-loading-skeleton.tsx:35` | `animationDelay: "750ms"` | DRIFT | no exact token — snap to `--duration-700` |
| `src/components/shared/blog-loading-skeleton.tsx:39` | `animationDelay: "900ms"` | DRIFT | no exact token — snap to `--duration-1000` |
| `src/components/shared/blog-empty-state.tsx:29` | `animationDelay: "0ms"` | DRIFT | `0ms` zero-case |
| `src/components/shared/blog-empty-state.tsx:33` | `animationDelay: "300ms"` | DRIFT | `var(--duration-300)` |
| `src/components/shared/blog-empty-state.tsx:37` | `animationDelay: "600ms"` | DRIFT | no exact token — snap |
| `src/components/shared/blog-empty-state.tsx:42` | `animationDelay: "900ms"` | DRIFT | no exact token — snap to `--duration-1000` |

> Count note: 22 rows above; `loading-spinner.tsx` lines 245/251/257's `animation-duration`/`animation-timing-function` portions are already token-correct (`var(--duration-700)`, `var(--ease-out)`) — only the `[animation-delay:Nms]` portion is drift. The "19" headline counts unique drift *expressions*; the planner should treat the table above as the authoritative line list. `grid-pattern.tsx` `animationDelay: \`${(x+y)*100}ms\`` (L111) is also a computed stagger — same class as `blur-fade.tsx` L116.

**Decorative-stagger note:** Every Category-D occurrence is a *decorative skeleton/animation stagger offset*. The exact millisecond value is not load-bearing — these are loading-state shimmer effects. Snapping to the nearest `--duration-*` token preserves design intent (D-04 + Claude's discretion explicitly cover "match the design intent"). This makes Plan A low-risk: cosmetic-equivalent edits.

### Audit Summary
| Pattern | Total occurrences in scope | Drift (needs edit) | Legitimate exception (allowlist) |
|---------|---------------------------|--------------------|---------------------------------|
| Hex literal | 38 (color-shaped) | 0 | 38 |
| `rgb(`/`rgba(` | 0 | 0 | 0 |
| `bg-white` | 1 | 0 | 1 |
| Inline `[NNN]ms` | 22 expressions / ~19 unique | 22 | 0 |

## TOKEN-03 Drift-Guard Test Design

### File location
`src/app/__tests__/design-token-drift.test.ts` — sits in the `unit` Vitest project (`include: ["src/**/*.{test,spec}.{ts,tsx}"]` in `vitest.config.ts`). This makes it run in `bun run test:unit`, the lefthook pre-commit `unit-tests` hook, and the CI `checks` test gate.

> Placement rationale: `src/app/__tests__/` mirrors `marketing-copy-landlord-only.test.ts`. Alternative `src/test/__tests__/design-token-drift.test.ts` (next to `design-tokens.test.ts`) also works — both globs match. Prefer `src/app/__tests__/` to co-locate with the marketing-copy walker it is modeled on.

### Scan approach
1. `walkSourceFiles(root)` — copy verbatim from `marketing-copy-landlord-only.test.ts:300-315`. Recursive `readdirSync`, `.ts`/`.tsx` only, skips test files via `isTestPath` (`__tests__/`, `.test.`, `.spec.`, `.d.ts`).
2. Roots: `join(cwd, "src", "components")` and `join(cwd, "src", "app")` (D-02 scope).
3. For each non-exempt file, `readFileSync(absPath, "utf8")` and run the four drift regexes.
4. Generate one `it()` per (file × pattern) so failures name the exact file and pattern — matches the analog's `describe(relPath)` / `it("must not mention ...")` granularity.

### The four drift regexes (proven against this audit — see prior cycle-2 review evidence)
```typescript
const DRIFT_PATTERNS = {
  // #RGB / #RGBA / #RRGGBB / #RRGGBBAA at a word boundary
  hex: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
  rgb: /\brgba?\s*\(/gi,                              // \b blocks `srgba(` / `vargba(`
  bgWhite: /\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?\b/g,  // covers bg-white, bg-white/50, bg-white/[var(--x)]
  inlineMs: /\[\s*[a-z-]*:?\s*\d+ms\s*\]|["'`]\s*\d+ms\s*["'`]|:\s*["'`]\d+ms["'`]/g,
};
```
> The `inlineMs` regex must catch both Tailwind arbitrary values (`[animation-delay:200ms]`) AND JS string literals (`animationDelay: "200ms"`). The analog ESLint rule (now deleted) used `/\[\s*\d+ms\s*\]/g` — that only caught arbitrary values. The Vitest test scans raw file text, so it must also catch the `"200ms"` string form. **Decision needed on the `0ms` zero-case** — see Q1.

### Allowlist expression
A `Record<string, readonly DriftPattern[]>` exemption map keyed by **normalized relative path**, scoped per-pattern (so a file exempt for `hex` is still scanned for `inlineMs`). This is the `BANLIST_EXEMPTIONS` shape from `marketing-copy-landlord-only.test.ts:278-298`.

```typescript
type DriftPattern = "hex" | "rgb" | "bgWhite" | "inlineMs";

const DRIFT_EXEMPTIONS: Record<string, readonly DriftPattern[]> = {
  // next/og ImageResponse — satori has no CSS-variable access (D-03)
  "src/app/opengraph-image.tsx": ["hex"],
  // HTML <meta> themeColor / msapplication-TileColor — browser chrome (D-03)
  "src/app/layout.tsx": ["hex"],
  // Generated standalone HTML/PDF document templates (D-03)
  "src/app/(owner)/documents/templates/components/build-template-html.ts": ["hex"],
  "src/app/(owner)/reports/page.tsx": ["hex"],
  "src/components/dashboard/dashboard-filters.tsx": ["hex"],
  "src/components/leases/rent-increase-notice-dialog.tsx": ["hex"],
  "src/components/maintenance/detail/work-order-template.ts": ["hex"],
  // Third-party brand SVG logos (D-03)
  "src/components/sections/logo-cloud.tsx": ["hex"],
  "src/components/auth/google-button.tsx": ["hex"],
  // QR-code container — scanners require literal white (Q2 — confirm with planner)
  "src/components/auth/two-factor-setup-steps.tsx": ["bgWhite"],
} as const;
```
- The exemption is **per-pattern**, not whole-file — `logo-cloud.tsx` is exempt for `hex` only; if someone adds an inline-ms to it the test still fails.
- If D-03's "and any `**/opengraph-image.*`" / "`**/lease-template.*`" wildcard intent is preferred over an explicit per-file list, the planner can add a small glob-prefix check. The explicit-list approach (analog pattern) is recommended for auditability — every exemption is a visible line with a comment.
- `src/lib/templates/lease-template.ts` is **outside** the D-02 scan scope (`src/components/**` + `src/app/**` only) so it does not need an exemption entry — but `11-LINT-RULE.md` should note it as a known D-03-class file in case scope ever widens.

### Drift-guard test must self-exempt
The test file lives under `__tests__/` so `isTestPath` excludes it from its own walk — the regex/string literals inside it (`"#FFFFFF"`, `"200ms"`, etc. used in any inline fixtures) cannot self-trigger. Confirmed: the analog test relies on exactly this.

### `11-LINT-RULE.md` deliverable
The phase must produce `.planning/phases/11-token-alignment/11-LINT-RULE.md` documenting:
- **Mechanism:** a Vitest `unit`-project drift-guard test (NOT an ESLint plugin — the old fictional `LINT-RULE.md` describing `color-tokens` was deleted in `816c01e0a`).
- The four drift patterns and their regexes.
- The D-03 allowlist and the rationale for each entry (including the QR-code `bg-white` per Q2).
- How to add a new exemption (add a line to `DRIFT_EXEMPTIONS` with a justification comment — same discipline rule as `BANLIST_EXEMPTIONS`).
- Where it runs (lefthook pre-commit `unit-tests` + CI `checks` test gate).
- The escape-hatch policy: there is no `eslint-disable`-style inline escape; an exemption is a reviewed, commented entry in the map.

## Common Pitfalls

### Pitfall 1: Re-proposing the deleted ESLint plugin
**What goes wrong:** A plan resurrects `color-tokens.eslint.js` / `eslint.config.js`. The earlier phase-11 burst (commits `51b007724`, `a52ab33a1`) built exactly this; the entire ESLint stack was then deleted in the Biome migration (`dc3365f48`, `fd7c95d91`) and the describing `LINT-RULE.md` removed in `816c01e0a`.
**Why it happens:** Stale ROADMAP/REQUIREMENTS wording ("custom ESLint plugin or stylelint") and the prior review docs (`11-REVIEW-cycle-1/2.md`) still reference the ESLint plugin.
**How to avoid:** D-01 is LOCKED. The review docs `11-REVIEW-cycle-1.md` / `11-REVIEW-cycle-2.md` describe the *superseded* approach — ignore them. The mechanism is a Vitest test.
**Warning signs:** Any task mentioning `eslint`, `stylelint`, `.eslintrc`, `eslint-disable`, or a plugin package.

### Pitfall 2: Tokenizing the already-done `/resources` page
**What goes wrong:** A plan edits `resources/page.tsx` to "fix" neon pink that no longer exists, risking regressions.
**Why it happens:** REQUIREMENTS TOKEN-01/02 describe the *original* audit state; the page was rebuilt in the interim (commits `b8bb43cd7`, `638b837af`, `057de10d3`).
**How to avoid:** TOKEN-01/02's `/resources` portions are verify-and-pin. The download tags use `<Badge variant="secondary">`; cards use `bg-card`/`bg-muted border-border`/`bg-primary/10`. No production edit to this file.
**Warning signs:** A task description that says "replace neon pink in resources/page.tsx".

### Pitfall 3: Scope creep into `bg-black` / `text-white` / named colors
**What goes wrong:** The audit finds 11 files with `bg-black/N` overlays and 6 with `text-white`; a plan tries to tokenize them.
**Why it happens:** They look like color drift.
**How to avoid:** D-02 enumerates exactly four drift patterns: hex, `rgb(`, `bg-white` class, `[NNN]ms`. `bg-black` and `text-white` are not among them and not in this phase. The lightbox/dialog scrim overlays (`bg-black/50`, `bg-black/95`) are a deliberate pattern. Do not expand scope.
**Warning signs:** A drift-inventory task listing `image-lightbox.tsx` or `dialog.tsx`.

### Pitfall 4: Drift-guard regex false positives on non-color `#NNNN`
**What goes wrong:** The hex regex flags `PR #725`, `error #185`, `#config/pricing`, or the `&#8984;` ⌘ entity.
**Why it happens:** `#` + 3-4 digits matches issue numbers and entity codes.
**How to avoid:** Anchor on `\b` and the exact hex-digit-count alternation; the cycle-2 review confirmed `/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g` is correct. Since the Vitest test scans raw text (not an AST), it WILL see `PR #725` — so either (a) the regex's `\b` plus hex-digit constraint is tuned to minimize this (`#725` would still match as a 3-digit hex), OR (b) scope the scan to inspect only string/template literals / className attributes. **Recommendation:** restrict matches to within quotes/backticks/JSX attribute values, OR add a small set of known-safe-substring guards. The marketing-copy test scans full lowercased text and accepts that tradeoff; the hex case is noisier. The planner should decide — see Q3.
**Warning signs:** The new test failing on comment lines containing `PR #` or `#hooks/`.

### Pitfall 5: No exact `--duration-*` token for stagger values
**What goes wrong:** 400/450/600/750/800/900ms staggers have no exact token; a plan invents `--duration-400` etc.
**Why it happens:** The scale has gaps.
**How to avoid:** CONTEXT says "No new design tokens." Snap each stagger to the nearest existing token — these are decorative loading-shimmer offsets, exact ms is not load-bearing. D-04 + Claude's discretion explicitly authorize matching design intent.
**Warning signs:** A migration adding `--duration-400` to `globals.css`.

## Code Examples

### Drift-guard test skeleton (TOKEN-03)
```typescript
// Source: pattern from src/app/__tests__/marketing-copy-landlord-only.test.ts
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

type DriftPattern = "hex" | "rgb" | "bgWhite" | "inlineMs";

const DRIFT_PATTERNS: Record<DriftPattern, RegExp> = {
	hex: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
	rgb: /\brgba?\s*\(/gi,
	bgWhite: /\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?\b/g,
	inlineMs: /\[\s*[a-z-]*:?\s*\d+ms\s*\]|["'`]\s*\d+ms\s*["'`]/g,
};

const DRIFT_EXEMPTIONS: Record<string, readonly DriftPattern[]> = {
	"src/app/opengraph-image.tsx": ["hex"],
	"src/app/layout.tsx": ["hex"],
	"src/app/(owner)/documents/templates/components/build-template-html.ts": ["hex"],
	"src/app/(owner)/reports/page.tsx": ["hex"],
	"src/components/dashboard/dashboard-filters.tsx": ["hex"],
	"src/components/leases/rent-increase-notice-dialog.tsx": ["hex"],
	"src/components/maintenance/detail/work-order-template.ts": ["hex"],
	"src/components/sections/logo-cloud.tsx": ["hex"],
	"src/components/auth/google-button.tsx": ["hex"],
	"src/components/auth/two-factor-setup-steps.tsx": ["bgWhite"],
} as const;

function isTestPath(p: string): boolean {
	return p.includes("/__tests__/") || p.includes(".test.") ||
		p.includes(".spec.") || p.endsWith(".d.ts");
}

function walkSourceFiles(root: string): string[] {
	const entries = readdirSync(root, { recursive: true, withFileTypes: true });
	const out: string[] = [];
	for (const e of entries) {
		if (!e.isFile()) continue;
		const parent = (e as { parentPath?: string; path?: string }).parentPath ??
			(e as { path?: string }).path ?? "";
		const abs = join(parent, e.name);
		if (!/\.(ts|tsx)$/.test(e.name)) continue;
		if (isTestPath(abs)) continue;
		out.push(abs);
	}
	return out;
}

const cwd = process.cwd();
for (const root of ["src/components", "src/app"]) {
	describe(`design-token drift: ${root}`, () => {
		for (const abs of walkSourceFiles(join(cwd, root))) {
			const rel = relative(cwd, abs).replace(/\\/g, "/");
			const content = readFileSync(abs, "utf8");
			const exempt = DRIFT_EXEMPTIONS[rel] ?? [];
			for (const [name, rx] of Object.entries(DRIFT_PATTERNS) as [DriftPattern, RegExp][]) {
				if (exempt.includes(name)) continue;
				it(`${rel} — no ${name} drift`, () => {
					const matches = content.match(rx) ?? [];
					expect(matches, `${rel}: ${name} drift ${JSON.stringify(matches)}`)
						.toHaveLength(0);
				});
			}
		}
	});
}
```

### `--duration-*` token consumption (TOKEN-02 fix)
```typescript
// BEFORE (drift) — src/components/shared/blog-loading-skeleton.tsx:22
<div style={{ width: "85%", animationDelay: "300ms" }} />
// AFTER (tokenized)
<div style={{ width: "85%", animationDelay: "var(--duration-300)" }} />

// BEFORE (drift, arbitrary value) — src/components/ui/loading-spinner.tsx:251
"...[animation-delay:200ms]"
// AFTER
"...[animation-delay:var(--duration-200)]"
```

## Runtime State Inventory

> Phase 11 is a code/config-only change (token swaps + a new test file + a markdown doc). No databases, no live-service config, no OS-registered state, no secrets/env vars, no build artifacts are affected.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified: phase touches only `.tsx`/`.ts` source + one `.md` | None |
| Live service config | None — no n8n / Stripe / Supabase config involved | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — no package rename; Tailwind v4 recompiles `globals.css` automatically on next build (no new tokens added) | None |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `color-tokens` ESLint plugin (`color-tokens.eslint.js` + `eslint.config.js`) | Biome (`biome check`); design-token drift enforced by a Vitest unit test | ESLint→Biome migration, commits `dc3365f48` / `fd7c95d91` (PR #717), 2026-05 | The prior phase-11 ESLint work is fully obsolete; TOKEN-03 is rebuilt as a test |
| `LINT-RULE.md` describing the ESLint plugin | `11-LINT-RULE.md` describing the Vitest drift-guard test | `816c01e0a`, 2026-05-21 | Old doc deleted; new doc is a phase deliverable |
| Inline ms in component animations | `var(--duration-*)` tokens | Ongoing token-alignment effort | The 19 remaining occurrences are the last drift cluster |

**Deprecated/outdated:**
- `11-REVIEW-cycle-1.md` and `11-REVIEW-cycle-2.md` — review the *superseded ESLint-plugin* implementation. They are historical; do not treat their "PASS" verdict as covering the current phase scope.
- ROADMAP/REQUIREMENTS original "custom ESLint plugin or stylelint" wording — corrected per `816c01e0a`; REQUIREMENTS.md TOKEN-03 now reads "drift-guard unit test ... No ESLint."

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `#FBBC05`/`#EA4335`/`#34A853` in `google-button.tsx` are Google brand colors (D-03 explicitly lists only `#4285F4`, `#DB4437`, `#F4B400`, `#0F9D58`) | Drift Inventory Cat. A | LOW — they are the Google "G" 4-color logo set; same brand-color class as the listed hexes. The cycle-2 review already treated `google-button.tsx` as a brand-color exception. Planner should confirm the file is allowlisted for `hex`. |
| A2 | Stagger-delay millisecond values are decorative and may be snapped to the nearest `--duration-*` token without design review | Drift Inventory Cat. D, Pitfall 5 | LOW — they are loading-skeleton shimmer offsets; CONTEXT D-04 + Claude's discretion authorize matching design intent. |
| A3 | `bg-black/N` and `text-white` are out of scope (D-02 lists only four patterns) | Pitfall 3 | LOW — D-02 is explicit about the four drift patterns; `bg-black` is a deliberate scrim pattern. |
| A4 | The drift-guard test belongs in the `unit` Vitest project (not `component`) | TOKEN-03 design | LOW — it is a pure filesystem scan with no DOM; `unit` project's `include` glob matches `src/**/*.test.ts`. |

## Open Questions (RESOLVED)

1. **How should the `0ms` zero-case be handled in both the fix and the drift-guard regex?**
   - What we know: Several occurrences are `0ms` (the first item in a stagger sequence — a legitimate "no delay"). `globals.css` has no `--duration-0` token.
   - What's unclear: Whether to (a) leave literal `0ms` and have the drift-guard regex exempt the exact tokens `"0ms"` / `[animation-delay:0ms]`, or (b) replace `0ms` with `var(--duration-75)` (visually negligible) so the regex needs no special case.
   - Recommendation: Option (a) — the drift-guard `inlineMs` regex excludes `0ms` (`/\b[1-9]\d*ms\b/`-style: only non-zero values are drift). `0` is the documented zero-case. Cleaner than faking a delay. Document in `11-LINT-RULE.md`.

2. **Should `two-factor-setup-steps.tsx`'s QR-code `bg-white` be added to the D-03 allowlist?**
   - What we know: It is the only `bg-white` in scope; line 62 carries a justification comment; QR scanners need literal white. CONTEXT D-03's enumerated list does not mention it (D-03 listed opengraph/layout/templates/brand-colors).
   - What's unclear: D-03 is "LOCKED" — adding an allowlist entry not in D-03 is technically a scope decision.
   - Recommendation: Add it. It is a genuine exception of the same class D-03 describes ("genuinely cannot consume CSS custom properties"). The phase cannot ship a passing drift-guard test otherwise (the alternative — removing `bg-white` from the QR container — would break scanning). The planner should record this in `11-LINT-RULE.md` with the QR-scanning rationale. This is the one D-03 extension the audit surfaced.

3. **Should the hex-drift scan inspect raw file text or only string/JSX-attribute literals?**
   - What we know: Raw-text scan (the `marketing-copy` analog approach) will see `PR #725`, `#config/`, `&#8984;`. The `\b`+hex-count regex still matches `#725` as a 3-digit hex.
   - What's unclear: Whether to accept that all in-scope files happen to be exempt or non-matching today (so raw scan passes now) but risks future false positives, vs. a literal-aware scan.
   - Recommendation: Raw-text scan is acceptable for the *initial* ship because the audit confirms every current hex match is either exempt or absent. To harden against future false positives on comments, the regex can require the `#hex` to be inside a quote/backtick or a `=` attribute context, OR the `11-LINT-RULE.md` can document that comment-only `#NNNN` is a known limitation. Lowest-risk: keep raw scan + a short `KNOWN_SAFE` substring guard list for `#config|#components|#lib|#hooks|#stores|#types|#providers|#test|#env|#proxy|#app`. Planner decides.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vitest | TOKEN-03 test execution | ✓ | 4.x | — |
| Node `readdirSync`/`readFileSync` | TOKEN-03 walker | ✓ | Node 24 builtin | — |
| Biome | repo lint (`biome check`) — unchanged by this phase | ✓ | 2.4.15 | — |
| Tailwind v4 | `--duration-*` utility compilation | ✓ | 4.x | — |
| `bun` | `bun run test:unit` / `validate:quick` | ✓ | 1.3.x | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None. Phase 11 introduces no new dependency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x + jsdom |
| Config file | `vitest.config.ts` (projects: `unit`, `component`, `integration`) |
| Quick run command | `bun run test:unit -- --run src/app/__tests__/design-token-drift.test.ts` |
| Full suite command | `bun run validate:quick` (typecheck + lint + unit tests) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TOKEN-01 | `/resources` download tags use token-based `Badge variant="secondary"` (no neon pink) | unit (regression pin) | `bun run test:unit -- --run src/app/resources/` | ❌ Wave 0 — add a regression test asserting the three `downloadResources[].badge` render via `Badge` and the page contains no hex/neon class |
| TOKEN-02 (`/resources`) | `/resources` cards use `bg-card`/`bg-muted` surface tokens | unit (regression pin) | same as above | ❌ Wave 0 — same regression test asserts card `className` uses `bg-card` and contains no hex/`rgb`/`bg-white` |
| TOKEN-02 (site-wide) | Zero inline-ms drift remains in `src/components/**` + `src/app/**` | unit (drift guard) | `bun run test:unit -- --run src/app/__tests__/design-token-drift.test.ts` | ❌ Wave 0 — the new drift-guard test IS the verification; it goes green only after the 19 fixes land |
| TOKEN-03 | Drift-guard test fails a PR that introduces a non-exempt hex/`rgb`/`bg-white`/`[NNN]ms` | unit (drift guard, self-verifying) | `bun run test:unit -- --run src/app/__tests__/design-token-drift.test.ts` | ❌ Wave 0 — the test file itself; optionally add a meta-test feeding a known-drift fixture string to the regexes to prove they catch drift |

### Sampling Rate
- **Per task commit:** `bun run test:unit -- --run src/app/__tests__/design-token-drift.test.ts` (and the `/resources` regression file once it exists)
- **Per wave merge:** `bun run validate:quick`
- **Phase gate:** Full unit suite green before `/gsd-verify-work`; the drift-guard test green confirms TOKEN-02 site-wide + TOKEN-03 simultaneously.

### Wave 0 Gaps
- [ ] `src/app/__tests__/design-token-drift.test.ts` — the TOKEN-03 drift-guard test (covers TOKEN-02 site-wide + TOKEN-03). Author it FIRST; it will be red until the 19 inline-ms fixes land, which is the correct red→green signal.
- [ ] `src/app/resources/__tests__/resources-page-tokens.test.ts` (or co-located `resources/page.test.tsx`) — TOKEN-01/02 `/resources` regression pin: asserts download tags use `Badge variant="secondary"`, cards use `bg-card`, and the page source contains no hex/`rgb`/`bg-white`. Pure regression pin (page is already correct).
- [ ] `11-LINT-RULE.md` — not a test, but a required phase deliverable documenting the drift-guard mechanism.
- Framework install: none — Vitest already configured.

## Sources

### Primary (HIGH confidence)
- `src/app/resources/page.tsx` — direct read; confirms TOKEN-01/02 `/resources` already tokenized
- `src/app/__tests__/marketing-copy-landlord-only.test.ts` — the `readdirSync` walker + `BANLIST_EXEMPTIONS` pattern analog
- `src/app/sitemap.test.ts`, `src/app/robots.test.ts` — CONTEXT-cited drift-guard analogs (`readFileSync` pattern)
- `src/app/globals.css` lines 114-118, 122-187, 249-266 — `--duration-*` / `--transition-duration-*` / `--color-*` / `--ease-*` token authority
- `biome.json` — confirms Biome is the linter; no ESLint
- `vitest.config.ts` — `unit` project glob + CI gating
- `git log` / `git show 816c01e0a` / `git show dc3365f48` — confirms ESLint stack + `LINT-RULE.md` deletion
- `.planning/phases/11-token-alignment/11-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`
- Site-wide `grep` audit (hex / `rgb` / `bg-white` / `[NNN]ms`) over `src/components/**` + `src/app/**` excluding tests — the Drift Inventory
- `CLAUDE.md` — zero-tolerance rules, Vitest 4 + chai 6 conventions

### Secondary (MEDIUM confidence)
- `.planning/phases/11-token-alignment/11-REVIEW-cycle-2.md` — describes the *superseded* ESLint-plugin implementation; used only to confirm the prior approach and the brand-color allowlist rationale

### Tertiary (LOW confidence)
- None.

## Project Constraints (from CLAUDE.md)

- **No `any` types** — drift-guard test uses `unknown` + narrowing for the `readdirSync` `parentPath`/`path` shim (the analog test does exactly this).
- **No barrel files / re-exports** — import `Badge`, helpers directly from defining files.
- **No inline styles** — interpreted as no *hardcoded* values. `style={{ animationDelay: "var(--duration-300)" }}` is a CSS-variable reference, not a hardcoded value, and the existing skeletons already use `style={{}}` for layout — acceptable. Prefer Tailwind arbitrary values where the code already uses className-based animation.
- **No emojis in code** — Lucide icons only (no icon work in this phase).
- **Vitest 4 + chai 6 bug** — use `.rejects.toMatchObject({ message: expect.stringContaining(...) })` not `.rejects.toThrow('string')`. The drift-guard test uses `expect(matches).toHaveLength(0)` — no throw assertions, unaffected.
- **`vi.hoisted()`** for any mock variable referenced in `vi.mock()` — the drift-guard test needs no mocks (pure filesystem read).
- **80% coverage threshold** enforced via lefthook pre-commit — the drift-guard test is mostly executed top-level code; coverage is naturally high.
- **Files kebab-case**, types PascalCase, constants UPPER_SNAKE_CASE.
- **Git workflow** — feature branch `gsd/phase-11-token-alignment` → PR; never push to main; perfect-PR gate (2 zero-finding cycles).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Vitest 4 / Biome / Tailwind v4 / Node 24 all verified against repo config files
- Drift inventory: HIGH — exhaustive `grep` audit over the exact D-02 scope, every match classified against D-03
- Architecture (drift-guard test): HIGH — a working, battle-tested analog exists (`marketing-copy-landlord-only.test.ts`)
- Shipped-vs-remaining: HIGH — `resources/page.tsx` read directly; git history confirms ESLint deletion
- Pitfalls: HIGH — derived from the actual cycle-2 review evidence + the Biome-migration commits

**Research date:** 2026-05-21
**Valid until:** 2026-06-20 (stable — token scale and test infrastructure are not fast-moving; the only volatility is if new components add fresh drift before the phase ships)
