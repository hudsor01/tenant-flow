# Phase 11: Design-Token Alignment & Resources Page - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 9 (6 modified components + 1 new test + 1 verify-and-pin page + 1 new doc)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/ui/grid-pattern.tsx` | component (decorative SVG) | transform (presentational) | `src/components/ui/loading-spinner.tsx` (token-correct sibling) | role-match |
| `src/components/ui/blur-fade.tsx` | component (animation wrapper) | transform (presentational) | `src/components/ui/loading-spinner.tsx` | role-match |
| `src/components/ui/loading-spinner.tsx` | component (loading UI) | transform (presentational) | self (already 90% token-correct) | exact |
| `src/components/shared/chart-loading-skeleton.tsx` | component (loading skeleton) | transform (presentational) | `src/components/shared/blog-loading-skeleton.tsx` | exact |
| `src/components/shared/blog-loading-skeleton.tsx` | component (loading skeleton) | transform (presentational) | `src/components/shared/chart-loading-skeleton.tsx` | exact |
| `src/components/shared/blog-empty-state.tsx` | component (empty state) | transform (presentational) | `src/components/shared/blog-loading-skeleton.tsx` | exact |
| `src/app/__tests__/design-token-drift.test.ts` | test (drift-guard) | file-I/O (filesystem scan) | `src/app/__tests__/marketing-copy-landlord-only.test.ts` | exact |
| `src/app/resources/page.tsx` | component (RSC marketing page) | request-response (static render) | self (verify-and-pin only) | exact |
| `.planning/phases/11-token-alignment/11-LINT-RULE.md` | doc | n/a | n/a (new mechanism doc) | no analog |

> The 7 component files are the ONLY production-source edits. `resources/page.tsx` is verify-and-pin (no edit). The test file and the doc are genuinely new.

---

## Critical Token Authority Finding

**The canonical `--duration-*` scale is in `src/app/globals.css` lines 249-258 — these are the tokens to consume:**

```css
/* src/app/globals.css:249-258 */
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
--duration-700: 700ms;
--duration-1000: 1000ms;
--duration-standard: 250ms;
--duration-medium: 350ms;
```

**There is a SECOND, separately-named scale at lines 114-118:**

```css
/* src/app/globals.css:114-118 */
--transition-duration-instant: 150ms;
--transition-duration-fast: 200ms;
--transition-duration-normal: 300ms;
--transition-duration-slow: 500ms;
--transition-duration-slower: 700ms;
```

The `--transition-duration-*` set is what Tailwind v4's named `duration-fast` / `duration-normal` / `duration-slow` / `duration-slower` utilities resolve to (used in `globals.css` `@apply` rules at lines 744-799 and as raw vars at lines 890-1028).

**LANDMINE — `blur-fade.tsx` lines 100-103 reference `var(--duration-instant)` / `var(--duration-fast)` / `var(--duration-normal)` / `var(--duration-slow)` — those bare `--duration-instant`-style variables DO NOT EXIST in `globals.css`. The defined names are `--transition-duration-instant` etc.** This is a pre-existing latent bug (the CSS var resolves to nothing → Tailwind/browser falls back). The planner must decide: (a) leave it untouched as out-of-Phase-11-scope (it is not one of the four drift patterns — no hex/rgb/bg-white/`[NNN]ms`), or (b) opportunistically correct `var(--duration-fast)` → `var(--transition-duration-fast)`. **Recommendation: scope-pure — Phase 11's four drift patterns do not include "broken var name", leave it. But the planner MUST NOT copy `var(--duration-fast)` as the fix pattern for the 19 ms-drift occurrences — use the numeric `--duration-*` scale (lines 249-258), which is real.**

For the inline-ms tokenization, the **numeric `--duration-N` scale** is the correct, verified target: `var(--duration-200)`, `var(--duration-300)`, `var(--duration-500)`, `var(--duration-700)`, `var(--duration-1000)`. Confirmed in active use at `globals.css:467` (`transition: all var(--duration-200) var(--ease-out)`) and `loading-spinner.tsx:245` (`[animation-duration:var(--duration-700)]`).

---

## Pattern Assignments

### `src/components/ui/loading-spinner.tsx` (component, transform) — REFERENCE ANALOG + 3 edits

**This file is the canonical in-repo example of correct `--duration-*` arbitrary-value consumption.** Lines 245/251/257 already use `[animation-duration:var(--duration-700)]` and `[animation-timing-function:var(--ease-out)]` correctly — only the `[animation-delay:Nms]` portion is drift.

**Current state (lines 242-260):**
```typescript
<div
  className={cn(
    dotsVariants({ size, variant }),
    "[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:0ms]",
  )}
/>
<div
  className={cn(
    dotsVariants({ size, variant }),
    "[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:200ms]",
  )}
/>
<div
  className={cn(
    dotsVariants({ size, variant }),
    "[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:400ms]",
  )}
/>
```

**Drift to fix (3 occurrences — Tailwind arbitrary-value form):**
| Line | Current | Tokenized form |
|------|---------|----------------|
| 245 | `[animation-delay:0ms]` | `0ms` is the zero-case — see Shared Pattern: Zero-Case Policy |
| 251 | `[animation-delay:200ms]` | `[animation-delay:var(--duration-200)]` (exact token) |
| 257 | `[animation-delay:400ms]` | no exact 400 token — snap to `[animation-delay:var(--duration-300)]` or `var(--duration-500)`; decorative stagger, planner picks |

**Fix pattern (arbitrary-value, the canonical form for className-driven animation):**
```typescript
// keep duration/timing untouched (already correct), swap only the delay:
"[animation-duration:var(--duration-700)] [animation-timing-function:var(--ease-out)] [animation-delay:var(--duration-200)]"
```

---

### `src/components/ui/grid-pattern.tsx` (component, transform) — 2 edits

**Analog:** `loading-spinner.tsx` (for token form) — but this file uses the `style={{}}` object form, not className arbitrary values.

**Current state (lines 57-69 and 106-114):**
```typescript
// L66-69 — SVG-level animationDuration
style={{
  opacity: finalOpacity,
  animationDuration: animated ? "500ms" : undefined,
}}

// L106-114 — per-square stagger
className={cn(
  "transition-all ease-out",
  animated && "animate-pulse",
)}
style={{
  animationDelay: animated ? `${(x + y) * 100}ms` : undefined,
  animationDuration: animated ? "200ms" : undefined,
}}
```

**Drift to fix:**
| Line | Current | Tokenized form |
|------|---------|----------------|
| 68 | `animationDuration: animated ? "500ms" : undefined` | `animationDuration: animated ? "var(--duration-500)" : undefined` |
| 112 | `animationDuration: animated ? "200ms" : undefined` | `animationDuration: animated ? "var(--duration-200)" : undefined` |

**Computed-stagger note (L111):** `animationDelay: animated ? \`${(x + y) * 100}ms\` : undefined` is a *computed dynamic* value, not a literal. It produces strings like `0ms`, `100ms`, `200ms` at runtime. The `inlineMs` drift regex scans **static source text** — a template literal `` `${(x + y) * 100}ms` `` will NOT match `/["'`]\s*\d+ms\s*["'`]/` (no literal digit before `ms`). It is not flagged as drift by the test. The planner can leave L111 as-is (it does not trip the guard) OR convert to a CSS var with `calc()` — recommend leaving it; converting is overkill for a decorative stagger and adds risk.

---

### `src/components/ui/blur-fade.tsx` (component, transform) — 1 occurrence (zero-case + computed)

**Current state (lines 114-117):**
```typescript
style={{
  transitionDelay: shouldReduceMotion ? "0ms" : `${delay * 80}ms`,
}}
```

**Classification:** `"0ms"` is a literal that MATCHES the `inlineMs` regex form `["'`]\s*\d+ms\s*["'`]` — but it is the **zero-case** (see Shared Pattern). `` `${delay * 80}ms` `` is a computed template literal — does NOT match the static-text regex (same reasoning as `grid-pattern.tsx:111`).

**Fix:** Only `"0ms"` needs a decision. Per the Zero-Case Policy (below), the recommended approach is: the `inlineMs` regex excludes `0ms` entirely (`/[1-9]\d*ms/`-style — only non-zero is drift), so **`"0ms"` requires no edit** and the file is clean. The computed `` `${delay * 80}ms` `` is not drift. **Net: blur-fade.tsx likely needs zero edits if the zero-case policy lands as recommended.**

> Do NOT use this file's lines 100-103 `var(--duration-fast)` as a token-form reference — those var names are broken (see Critical Token Authority Finding).

---

### `src/components/shared/blog-loading-skeleton.tsx` (component, transform) — 7 occurrences

**Analog:** `chart-loading-skeleton.tsx` / `blog-empty-state.tsx` — identical sibling pattern (CSS-only skeleton with `style={{ width, animationDelay }}` stagger).

**Current pattern (lines 12-15, repeated 7×):**
```typescript
<div
  className="h-4 rounded bg-muted animate-[text-reveal_1.8s_ease-in-out_infinite]"
  style={{ width: "92%", animationDelay: "0ms" }}
/>
```

**Drift to fix:**
| Line | Current `animationDelay` | Tokenized form |
|------|--------------------------|----------------|
| 14 | `"0ms"` | zero-case — no edit (see policy) |
| 18 | `"150ms"` | `"var(--duration-150)"` (exact) |
| 22 | `"300ms"` | `"var(--duration-300)"` (exact) |
| 26 | `"450ms"` | no 450 token — snap to `"var(--duration-500)"` (nearest) |
| 30 | `"600ms"` | no 600 token — snap to `"var(--duration-500)"` or `"var(--duration-700)"` |
| 35 | `"750ms"` | no 750 token — snap to `"var(--duration-700)"` |
| 39 | `"900ms"` | no 900 token — snap to `"var(--duration-1000)"` |

**Fix pattern (object form — keep `style={{}}`, swap the value to a CSS-var reference):**
```typescript
// BEFORE
style={{ width: "85%", animationDelay: "300ms" }}
// AFTER
style={{ width: "85%", animationDelay: "var(--duration-300)" }}
```
> `style={{ animationDelay: "var(--duration-300)" }}` is a CSS-variable reference, not a hardcoded value — acceptable per CLAUDE.md (RESEARCH §Project Constraints; the skeletons already use `style={{}}` for `width`).

---

### `src/components/shared/chart-loading-skeleton.tsx` (component, transform) — 5 occurrences

**Analog:** `blog-loading-skeleton.tsx` (identical sibling).

**Current pattern (lines 12-15, repeated 5×):**
```typescript
<div
  className="w-8 rounded-t-sm bg-primary/20 animate-[chart-rise_1.4s_ease-in-out_infinite]"
  style={{ height: "40%", animationDelay: "0ms" }}
/>
```

**Drift to fix:**
| Line | Current `animationDelay` | Tokenized form |
|------|--------------------------|----------------|
| 14 | `"0ms"` | zero-case — no edit |
| 18 | `"200ms"` | `"var(--duration-200)"` (exact) |
| 22 | `"400ms"` | no 400 token — snap to `"var(--duration-300)"` or `"var(--duration-500)"` |
| 26 | `"600ms"` | no 600 token — snap to `"var(--duration-500)"`/`"var(--duration-700)"` |
| 30 | `"800ms"` | no 800 token — snap to `"var(--duration-700)"` |

Same object-form fix pattern as `blog-loading-skeleton.tsx`.

---

### `src/components/shared/blog-empty-state.tsx` (component, transform) — 4 occurrences

**Analog:** `blog-loading-skeleton.tsx` (sibling — its own header comment says "Matches the pattern of ChartLoadingSkeleton and BlogLoadingSkeleton").

**Current pattern (lines 27-43):**
```typescript
<div
  className="h-2.5 rounded bg-primary/20 origin-left animate-[typewriter-line_2.4s_ease-in-out_infinite]"
  style={{ width: "100%", animationDelay: "0ms" }}
/>
// ...
<div
  className="h-2.5 rounded bg-primary/30 origin-left animate-[typewriter-line_2.4s_ease-in-out_infinite] flex-1"
  style={{ animationDelay: "900ms" }}
/>
```

**Drift to fix:**
| Line | Current `animationDelay` | Tokenized form |
|------|--------------------------|----------------|
| 29 | `"0ms"` | zero-case — no edit |
| 33 | `"300ms"` | `"var(--duration-300)"` (exact) |
| 37 | `"600ms"` | no 600 token — snap to `"var(--duration-500)"`/`"var(--duration-700)"` |
| 42 | `"900ms"` | no 900 token — snap to `"var(--duration-1000)"` |

Same object-form fix pattern.

---

### `src/app/__tests__/design-token-drift.test.ts` (test, file-I/O) — NEW FILE

**Analog:** `src/app/__tests__/marketing-copy-landlord-only.test.ts` — exact-shape match. A `readdirSync({ recursive: true })` walker + `readFileSync` per file + per-file/per-pattern scoped exemption map. Secondary analog: `src/app/sitemap.test.ts` (its `sitemap legal-page lastmod drift guard` describe is a `readFileSync`-based regex drift guard).

**Walker — copy verbatim (`marketing-copy-landlord-only.test.ts:300-315`):**
```typescript
function walkSourceFiles(root: string): string[] {
	const entries = readdirSync(root, { recursive: true, withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const parentPath =
			(entry as { parentPath?: string; path?: string }).parentPath ??
			(entry as { path?: string }).path ??
			"";
		const absPath = join(parentPath, entry.name);
		if (!/\.(ts|tsx)$/.test(entry.name)) continue;
		if (isTestPath(absPath)) continue;
		files.push(absPath);
	}
	return files;
}
```
> The `(entry as { parentPath?: string; path?: string })` shim is the repo's sanctioned `unknown`-narrowing for the `readdirSync` DirEntry shape (Node version variance between `parentPath` and `path`). It is NOT an `as unknown as` violation — it is a single typed cast on a known-shape value. Copy it exactly.

**`isTestPath` — copy verbatim (`marketing-copy-landlord-only.test.ts:244-251`):**
```typescript
function isTestPath(relPath: string): boolean {
	return (
		relPath.includes("/__tests__/") ||
		relPath.includes(".test.") ||
		relPath.includes(".spec.") ||
		relPath.endsWith(".d.ts")
	);
}
```
This is what makes the drift-guard test self-exempt — it lives under `__tests__/` so its own regex/string literals never self-trigger.

**Exemption-map shape — copy from `BANLIST_EXEMPTIONS` (`marketing-copy-landlord-only.test.ts:278-298`):**
```typescript
// Analog: BANLIST_EXEMPTIONS — Record<normalizedRelPath, readonly Kind[]>
const BANLIST_EXEMPTIONS: Record<string, readonly BanlistKind[]> = {
	"src/app/resources/landlord-tax-deduction-tracker/tax-deduction-data.ts": [
		"numeric",
		"feature",
	],
	"src/lib/templates/lease-template.ts": ["feature"],
	"src/app/security-policy/page.tsx": ["sla"],
	"src/lib/constants/query-config.ts": ["superlative"],
};

function isExemptFromBanlist(relPath: string, kind: BanlistKind): boolean {
	const normalized = relPath.replace(/\\/g, "/");
	return BANLIST_EXEMPTIONS[normalized]?.includes(kind) ?? false;
}
```
**Replicate this exact shape** for `DRIFT_EXEMPTIONS: Record<string, readonly DriftPattern[]>` — per-pattern (not whole-file) exemptions, normalized relative path key, `?.includes() ?? false` lookup. Each entry gets a justification comment, matching the analog's discipline.

**Per (file × pattern) `it()` granularity — copy from `marketing-copy-landlord-only.test.ts:317-330`:**
```typescript
function scanFileForBannedPhrases(absPath: string, relPath: string) {
	if (isExemptFromBanlist(relPath, "phrases")) return;
	const content = readFileSync(absPath, "utf8").toLowerCase();
	describe(relPath, () => {
		for (const phrase of BANNED_PHRASES) {
			it(`must not mention "${phrase}"`, () => {
				expect(
					content,
					`${relPath} contains banned phrase "${phrase}" — ...`,
				).not.toContain(phrase.toLowerCase());
			});
		}
	});
}
```
Mirror this: one `describe(relPath)` per file, one `it()` per drift pattern, an `expect(...).toHaveLength(0)` with a context-message second arg naming the file + pattern + the matched values. The RESEARCH §"Code Examples" skeleton (11-RESEARCH.md lines 414-479) is the proven target shape — follow it.

**Top-level loop driving the walker (`marketing-copy-landlord-only.test.ts:436-442`):**
```typescript
describe("Component copy: landlord-only product (REQ-52-06)", () => {
	const cwd = process.cwd();
	const componentsRoot = join(cwd, "src", "components");
	for (const absPath of walkSourceFiles(componentsRoot)) {
		scanFileForBannedPhrases(absPath, relative(cwd, absPath));
	}
});
```
For Phase 11: roots are `join(cwd, "src", "components")` and `join(cwd, "src", "app")` (D-02 scope). `relative(cwd, absPath).replace(/\\/g, "/")` is the normalized rel-path key into `DRIFT_EXEMPTIONS`.

**Imports — copy exactly:**
```typescript
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
```
No mocks needed (pure filesystem read) — so NO `vi.mock` / `vi.hoisted`, unlike `sitemap.test.ts`.

---

### `src/app/resources/page.tsx` (component, RSC) — VERIFY-AND-PIN ONLY (no edit)

**Confirmed already tokenized — do NOT edit.** Current source verified:
- Download tags: `<Badge variant="secondary">{resource.badge}</Badge>` (line 187) — `badge` values are `"Checklist"` / `"Spreadsheet"` / `"Guide"` (lines 66/74/82). No neon pink.
- Download cards: `className="group rounded-2xl border border-border bg-card p-6 ..."` (line 181) — `bg-card` + `border-border` surface tokens.
- Icon chip: `bg-primary/10 ... text-primary` (line 184).
- Main resource tiles use token tints: `bg-muted border-border`, `bg-success/10 border-success/20`, `bg-warning/10 border-warning/20` (lines 35/45/54).
- Gradients are token-based `color-mix(in oklch, var(--color-primary) ...)` (lines 94, 208).

**No hex / `rgb(` / `bg-white` / `[NNN]ms` literals anywhere in the file.** The drift-guard test will scan it and pass with zero exemption needed.

**Verify-and-pin task (Wave 0 — RESEARCH §Test Map):** add `src/app/resources/__tests__/resources-page-tokens.test.ts` (or co-located `resources/page.test.tsx`) — a pure regression pin. Analog for a `readFileSync`-of-one-page assertion: `sitemap.test.ts`'s `readVisibleDate()` (lines 300-323) reads a `.tsx` as raw text and regex-asserts. Mirror that: `readFileSync` `src/app/resources/page.tsx`, assert it contains `Badge variant="secondary"`, contains `bg-card`, and matches none of the four drift regexes.

---

### `.planning/phases/11-token-alignment/11-LINT-RULE.md` (doc) — NEW FILE

No code analog. Documentation deliverable. Content spec is fully enumerated in 11-RESEARCH.md §"`11-LINT-RULE.md` deliverable" (lines 370-378): mechanism (Vitest unit test, NOT ESLint — the old fictional doc was deleted in `816c01e0a`), the four drift regexes, the D-03 allowlist + per-entry rationale (incl. the QR-code `bg-white`), how to add an exemption, where it runs, and the no-inline-escape-hatch policy.

---

## Shared Patterns

### Pattern: `--duration-*` token consumption (TOKEN-02 fix — applies to all 6 component files)

**Source of truth:** `src/app/globals.css:249-258` (numeric scale) — verified in active use.

Two equivalent fix forms, **match whichever the surrounding code already uses**:

```typescript
// FORM A — Tailwind arbitrary value (use where animation is className-driven, e.g. loading-spinner.tsx)
// Source: src/components/ui/loading-spinner.tsx:245 (already correct for duration/timing)
"[animation-delay:var(--duration-200)]"

// FORM B — style object CSS-var reference (use where the component already uses style={{}}, e.g. the 3 skeletons + grid-pattern.tsx)
// Source: src/components/shared/blog-loading-skeleton.tsx:18 (after fix)
style={{ width: "100%", animationDelay: "var(--duration-150)" }}
```

**Exact-token map (snap drift values):**
| Drift ms | Token | Note |
|----------|-------|------|
| `150ms` | `var(--duration-150)` | exact |
| `200ms` | `var(--duration-200)` | exact |
| `300ms` | `var(--duration-300)` | exact |
| `500ms` | `var(--duration-500)` | exact |
| `400ms` | `var(--duration-300)` or `var(--duration-500)` | no token — snap, decorative |
| `450ms` | `var(--duration-500)` | no token — snap |
| `600ms` | `var(--duration-500)` or `var(--duration-700)` | no token — snap |
| `750ms`, `800ms` | `var(--duration-700)` | no token — snap |
| `900ms` | `var(--duration-1000)` | no token — snap |

> CONTEXT D-04 + Claude's discretion authorize snapping. These are decorative loading-shimmer staggers — exact ms is not load-bearing. **Do NOT add `--duration-400` etc. to `globals.css` (CONTEXT: "No new design tokens").**

### Pattern: Zero-Case Policy (`0ms`)

**Source:** 11-RESEARCH.md Open Question Q1 — recommendation Option (a).

`globals.css` has no `--duration-0`. `0ms` is a legitimate "no delay" (first item of a stagger). **Recommended:** the `inlineMs` drift regex excludes zero (`/\b[1-9]\d*ms\b/`-style — only non-zero values count as drift). Then `"0ms"` / `[animation-delay:0ms]` need NO edit and trip no test. Document the zero-case in `11-LINT-RULE.md`. Affected lines that then need no edit: `loading-spinner.tsx:245`, `blur-fade.tsx:116` (the `"0ms"` branch), `chart-loading-skeleton.tsx:14`, `blog-loading-skeleton.tsx:14`, `blog-empty-state.tsx:29`.

### Pattern: Computed-stagger exemption (template-literal ms)

Template-literal values — `grid-pattern.tsx:111` `` `${(x + y) * 100}ms` ``, `blur-fade.tsx:116` `` `${delay * 80}ms` `` — are NOT static literals. The `inlineMs` regex (`/["'`]\s*\d+ms\s*["'`]/`) requires literal digits adjacent to `ms` inside quotes; `${expr}ms` has no literal digit before `ms`. These do not match and need no edit. Leave them — converting computed staggers to `calc()`-with-vars is out of scope and adds risk.

### Pattern: Drift-guard regex set (TOKEN-03 — proven against the audit)

**Source:** 11-RESEARCH.md §"The four drift regexes" (lines 327-337). Reproduce exactly:
```typescript
const DRIFT_PATTERNS = {
  hex: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
  rgb: /\brgba?\s*\(/gi,
  bgWhite: /\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?\b/g,
  inlineMs: /\[\s*[a-z-]*:?\s*\d+ms\s*\]|["'`]\s*\d+ms\s*["'`]|:\s*["'`]\d+ms["'`]/g,
};
```
> If the zero-case policy lands, narrow `inlineMs` so `\d+` becomes `[1-9]\d*` (excludes `0ms`). The `inlineMs` regex must catch BOTH Tailwind arbitrary values (`[animation-delay:200ms]`) and JS string literals (`animationDelay: "200ms"`) — the deleted ESLint rule only caught the former.

### Pattern: D-03 exemption map (TOKEN-03)

**Source:** 11-RESEARCH.md §"Allowlist expression" (lines 342-362). The 10-entry `DRIFT_EXEMPTIONS` map is fully enumerated there — copy it. Every entry is `hex`-only except `two-factor-setup-steps.tsx` which is `bgWhite`-only. The drift inventory (11-RESEARCH.md §"Drift Inventory" lines 238-312) confirms: 0 hex drift, 0 `rgb(`, 0 `bg-white` drift, 22 inline-ms drift expressions.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.planning/phases/11-token-alignment/11-LINT-RULE.md` | doc | n/a | Planning-artifact markdown; no code analog. Content spec is in 11-RESEARCH.md lines 370-378. |

All production-source and test files have a strong analog. Nothing falls back to RESEARCH-only patterns.

---

## Metadata

**Analog search scope:** `src/components/ui/`, `src/components/shared/`, `src/app/__tests__/`, `src/app/` (resources, sitemap test), `src/app/globals.css`
**Files scanned:** 11 (3 context/instruction docs + 8 source/test files read in full or targeted ranges)
**Pattern extraction date:** 2026-05-21
