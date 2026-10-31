/**
 * The pure check functions behind the Tailwind theme guards G1-G8 in
 * `src/app/__tests__/tailwind-theme-integrity.test.ts` and the git-baseline
 * red-proof runner `.planning/tailwind-shadcn/audit/guard-redproof.ts`.
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * WHY IT EXISTS. D-17. A guard is only as good as the input it checks, so each
 * check here takes the real stylesheet text, the real compiler's source list or
 * real engine fields, and returns the same `GuardResult` shape. The test file
 * runs a check against the current tree and against fixtures that prove it can
 * fail; the runner runs the same check against an older tree (the 754c91802
 * baseline) to prove it fails where the defect existed.
 *
 * GUARDS DECLARED HERE.
 *   - G1 `checkOklchRange`: every oklch() literal in a stylesheet has its
 *     lightness in [0, 1] and its chroma in [0, 0.37] (B1 class: a percent-form
 *     or dropped-digit typo that renders an out-of-gamut color).
 *   - G6 `checkSourceGlobs`: every explicit `@source` entry matches at least
 *     one file, negated entries included (B9 class: a glob that matches
 *     nothing scans nothing, and a negation that matches nothing excludes
 *     nothing).
 *   - G2 `checkNonInlineThemeVarRefs`: no custom property declared in a
 *     non-inline `@theme` at-rule references var() (B3/H1 class: Tailwind emits
 *     non-inline theme values on :root, so a var() inside one resolves at :root
 *     rather than on the element that sets the referenced variable).
 *   Later guard plans add their checks to this file: G4 (66.2-07), G3 (66.2-08),
 *   G5 (66.2-09), G7 (66.2-14), G8 (66.2-18).
 *
 * CONSTRAINTS.
 *   1. Imports are bare packages and `node:*` only: no `#` alias and no
 *      relative import, so the runner can load this file outside Vitest with
 *      Node or Bun type stripping. Project callables a check needs arrive as
 *      parameters, never as imports.
 *   2. Each check returns `GuardResult` or `Promise<GuardResult>`.
 *   3. Only erasable TypeScript, and every type-only import is written
 *      `import type`.
 *   4. No fixture stylesheets and no utility class names in string literals or
 *      comments. Tailwind scans this file as a project source, so anything that
 *      reads as a class would join the build. Fixtures belong in the test file,
 *      which `globals.css` keeps out of the scan.
 */

import type { SourceEntry } from "@tailwindcss/oxide";
import { Scanner } from "@tailwindcss/oxide";
import postcss from "postcss";

export type GuardResult = {
	checked: number;
	violations: string[];
};

/** CSS Color 4: oklch lightness runs from 0 to 1 (0% to 100%). */
export const OKLCH_LIGHTNESS_MAX = 1;

/**
 * CSS Color 4 maps 100% chroma to 0.4. Real sRGB and P3 colors stay below 0.37,
 * so anything above it is a typo rather than a deliberate color.
 */
export const OKLCH_CHROMA_MAX = 0.37;

/** CSS Color 4 reference range: `100%` chroma equals `0.4`. */
const OKLCH_CHROMA_PERCENT_REFERENCE = 0.4;

const OKLCH_LIGHTNESS_CHROMA = /oklch\(\s*(-?[0-9.]+%?)\s+(-?[0-9.]+%?)\s+/g;

function parseOklchComponent(raw: string, percentReference: number): number {
	if (raw.endsWith("%")) {
		return (Number.parseFloat(raw.slice(0, -1)) / 100) * percentReference;
	}
	return Number.parseFloat(raw);
}

export function checkOklchRange(css: string): GuardResult {
	const root = postcss.parse(css);
	let checked = 0;
	const violations: string[] = [];
	root.walkDecls((decl) => {
		for (const match of decl.value.matchAll(OKLCH_LIGHTNESS_CHROMA)) {
			checked += 1;
			const lightness = parseOklchComponent(match[1] ?? "", 1);
			const chroma = parseOklchComponent(
				match[2] ?? "",
				OKLCH_CHROMA_PERCENT_REFERENCE,
			);
			const inRange =
				lightness >= 0 &&
				lightness <= OKLCH_LIGHTNESS_MAX &&
				chroma >= 0 &&
				chroma <= OKLCH_CHROMA_MAX;
			if (!inRange) {
				violations.push(
					`${decl.prop}: ${match[0].trimEnd()} (line ${decl.source?.start?.line ?? "?"})`,
				);
			}
		}
	});
	return { checked, violations };
}

/**
 * Negated entries are scanned as positive globs on purpose: a negation that
 * excludes nothing is the same dead configuration as a positive glob that
 * includes nothing. Pass the compiler's explicit `sources`, not the resolved
 * scan set, which also holds the automatic repository root.
 */
export function checkSourceGlobs(sources: readonly SourceEntry[]): GuardResult {
	let checked = 0;
	const violations: string[] = [];
	for (const entry of sources) {
		checked += 1;
		const scanner = new Scanner({
			sources: [{ base: entry.base, pattern: entry.pattern, negated: false }],
		});
		scanner.scan();
		if (scanner.files.length === 0) {
			violations.push(
				`${entry.negated ? "not " : ""}${entry.pattern} (base ${entry.base})`,
			);
		}
	}
	return { checked, violations };
}

/**
 * `checked` counts every custom property declared inside a non-inline `@theme`
 * at-rule; `violations` lists (sorted) those whose value contains var(). An
 * `@theme inline` at-rule is skipped: inline values are substituted into each
 * utility, so their var() resolves where the utility is used.
 */
export function checkNonInlineThemeVarRefs(css: string): GuardResult {
	const root = postcss.parse(css);
	let checked = 0;
	const violations: string[] = [];
	root.walkAtRules("theme", (atRule) => {
		if (/\binline\b/.test(atRule.params)) return;
		atRule.walkDecls((decl) => {
			if (!decl.prop.startsWith("--")) return;
			checked += 1;
			if (decl.value.includes("var(")) violations.push(decl.prop);
		});
	});
	return { checked, violations: violations.sort() };
}
