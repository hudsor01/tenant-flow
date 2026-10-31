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
 *   - G4 `checkLightOnlyColorTokens`: every used theme color token has a dark
 *     value (B4 class); structure-agnostic resolver (H4).
 *   - G3 `checkUtilityShadowing`: no non-functional `@utility` name is also a
 *     core or theme utility (B8 class: Tailwind applies both rules, so the
 *     custom one silently overrides or merges with the core one).
 *   - G5 `checkMergeKeys`: every custom font-size, line-height, spacing and
 *     transition-duration key in `@theme` is known to the project's
 *     tailwind-merge config, in both directions, and merges with its standard
 *     group (B7 class: an unknown font-size key is read as a text color, so
 *     the merge drops it next to a real one).
 *   Later guard plans add their checks to this file: G7 (66.2-14), G8
 *   (66.2-18).
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

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import type { SourceEntry } from "@tailwindcss/oxide";
import { Scanner } from "@tailwindcss/oxide";
import type { AtRule, Node as PostcssNode, Rule } from "postcss";
import postcss from "postcss";
import type {
	ConfigExtension,
	DefaultClassGroupIds,
	DefaultThemeGroupIds,
} from "tailwind-merge";
import { twMerge } from "tailwind-merge";

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

/**
 * PLAN.md §6 allow-list for G4: theme color tokens whose value is meant to be
 * the same in both modes. The names are built from their suffixes so no full
 * theme variable name sits in this scanned file as a literal. Nothing else may
 * join this set.
 */
export const MODE_INDEPENDENT_TOKENS: ReadonlySet<string> = new Set(
	["white", "black", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5"].map(
		(name) => `--color-${name}`,
	),
);

/**
 * Custom property declarations of one stylesheet, keyed by property name and
 * split by the context that declares them: a `@theme` at-rule (inline or not),
 * a dark-scope rule, or a `:root` rule. A later declaration in the same
 * context overwrites an earlier one, as in the cascade.
 */
export interface CustomPropertyContexts {
	readonly theme: ReadonlyMap<string, string>;
	readonly root: ReadonlyMap<string, string>;
	readonly dark: ReadonlyMap<string, string>;
}

const DARK_SCOPE_SELECTOR = /(^|[\s,(])\.dark(?![\w-])/;
const ROOT_SELECTOR = /:root(?![\w-])/;
const SINGLE_VAR_REFERENCE = /^var\(\s*(--[\w-]+)\s*\)$/;
const VAR_REFERENCE = /var\(\s*(--[\w-]+)/g;

type CustomPropertyContext = keyof CustomPropertyContexts;

type PostcssParent = PostcssNode["parent"];

function isAtRuleNode(node: PostcssParent): node is AtRule {
	return node?.type === "atrule";
}

function isRuleNode(node: PostcssParent): node is Rule {
	return node?.type === "rule";
}

function declarationContext(
	parent: PostcssParent,
): CustomPropertyContext | null {
	for (let node = parent; node; node = node.parent) {
		if (isAtRuleNode(node) && node.name === "theme") return "theme";
		if (isRuleNode(node)) {
			if (DARK_SCOPE_SELECTOR.test(node.selector)) return "dark";
			if (ROOT_SELECTOR.test(node.selector)) return "root";
		}
	}
	return null;
}

/**
 * The first matching ancestor decides a declaration's context, so a dark-scope
 * rule nested in `@layer base` counts as dark and a `:root` rule as root.
 * Declarations outside all three contexts are ignored.
 */
export function collectCustomPropertiesByContext(
	css: string,
): CustomPropertyContexts {
	const theme = new Map<string, string>();
	const root = new Map<string, string>();
	const dark = new Map<string, string>();
	const byContext: Record<CustomPropertyContext, Map<string, string>> = {
		theme,
		root,
		dark,
	};
	postcss.parse(css).walkDecls((decl) => {
		if (!decl.prop.startsWith("--")) return;
		const context = declarationContext(decl.parent);
		if (context === null) return;
		byContext[context].set(decl.prop, decl.value);
	});
	return { theme, root, dark };
}

/**
 * Follows a `--a: var(--b)` alias chain through the theme and `:root`
 * declarations, starting at `name`. It stops at the first value that is not a
 * single var() reference, at an undeclared name, or at the first repeated name
 * (a cycle).
 */
export function resolveCustomPropertyChain(
	name: string,
	contexts: CustomPropertyContexts,
): string[] {
	const chain = [name];
	const seen = new Set(chain);
	let current = name;
	for (;;) {
		const value = contexts.theme.get(current) ?? contexts.root.get(current);
		if (value === undefined) break;
		const next = SINGLE_VAR_REFERENCE.exec(value.trim())?.[1];
		if (next === undefined || seen.has(next)) break;
		chain.push(next);
		seen.add(next);
		current = next;
	}
	return chain;
}

/** Every custom property name referenced through var() in `text`. */
export function extractCustomPropertyRefs(text: string): Set<string> {
	const refs = new Set<string>();
	for (const match of text.matchAll(VAR_REFERENCE)) {
		if (match[1] !== undefined) refs.add(match[1]);
	}
	return refs;
}

/**
 * `relPath` is relative to `src/`. Stylesheet references reach G4 through the
 * compiled CSS, so `app/globals.css` is excluded; test files and the
 * `src/test/` harness are excluded because they do not ship.
 */
export function isGuardSourceFile(relPath: string): boolean {
	const path = relPath.replaceAll("\\", "/");
	if (!/\.(ts|tsx|css)$/.test(path)) return false;
	if (path === "app/globals.css") return false;
	if (path.includes("__tests__/")) return false;
	if (path.includes(".test.") || path.includes(".spec.")) return false;
	return !path.startsWith("test/");
}

/** Union of the var() references in every guard source file under `srcDir`. */
export function collectSourceCustomPropertyRefs(srcDir: string): Set<string> {
	const refs = new Set<string>();
	for (const entry of readdirSync(srcDir, {
		encoding: "utf8",
		recursive: true,
	})) {
		const rel = entry.replaceAll("\\", "/");
		if (!isGuardSourceFile(rel)) continue;
		for (const ref of extractCustomPropertyRefs(
			readFileSync(join(srcDir, rel), "utf8"),
		)) {
			refs.add(ref);
		}
	}
	return refs;
}

/**
 * G4. `checked` counts the theme color tokens (minus MODE_INDEPENDENT_TOKENS)
 * that are used: some member of their alias chain is referenced by the
 * compiled CSS or by a source file. Following the chain is what keeps the
 * guard working on the `@theme inline` structure, where a utility compiles to
 * the aliased variable rather than to the theme token. A used token is a
 * violation when no chain member has a dark-scope declaration.
 */
export function checkLightOnlyColorTokens(
	css: string,
	compiledCss: string,
	sourceRefs: ReadonlySet<string>,
): GuardResult {
	const contexts = collectCustomPropertiesByContext(css);
	const refs = extractCustomPropertyRefs(compiledCss);
	for (const ref of sourceRefs) refs.add(ref);
	let checked = 0;
	const violations: string[] = [];
	for (const [key, value] of contexts.theme) {
		if (!key.startsWith("--color-") || MODE_INDEPENDENT_TOKENS.has(key)) {
			continue;
		}
		const chain = resolveCustomPropertyChain(key, contexts);
		if (!chain.some((name) => refs.has(name))) continue;
		checked += 1;
		if (!chain.some((name) => contexts.dark.has(name))) {
			violations.push(
				`${key} (light ${value}) has no dark value; chain ${chain.join(" -> ")}. Give it a dark-scope value or replace its consumers with a semantic token (MODE_INDEPENDENT_TOKENS is only for white, black and chart-1..5)`,
			);
		}
	}
	return { checked, violations: violations.sort() };
}

/**
 * G3. Collects every `@utility` name in the stylesheet, removes every
 * `@utility` at-rule, loads Tailwind's design system for what remains, and
 * reports each non-functional name (no trailing `-*`) that still compiles to
 * CSS: that name is a core or theme utility the custom rule shadows. `checked`
 * counts the non-functional names; violations keep source order.
 */
export async function checkUtilityShadowing(
	css: string,
	base: string,
): Promise<GuardResult> {
	const names: string[] = [];
	const stripped = postcss.parse(css);
	stripped.walkAtRules("utility", (atRule) => {
		const name = atRule.params.trim();
		if (!name.endsWith("-*") && !names.includes(name)) names.push(name);
		atRule.remove();
	});
	const designSystem = await __unstable__loadDesignSystem(stripped.toString(), {
		base,
	});
	const violations = names.filter(
		(name) => designSystem.candidatesToCss([name])[0] != null,
	);
	return { checked: names.length, violations };
}

/**
 * G5 namespaces. `utility` and `standardKey` compose a standard class of the
 * same tailwind-merge group at run time (no complete class name sits in this
 * scanned file); `twMergeKey` is the tailwind-merge theme key, or for
 * transition-duration the class group, that the extension fills.
 */
export const G5_NAMESPACES = {
	text: { utility: "text", standardKey: "sm", twMergeKey: "text" },
	leading: { utility: "leading", standardKey: "tight", twMergeKey: "leading" },
	spacing: { utility: "p", standardKey: "4", twMergeKey: "spacing" },
	"transition-duration": {
		utility: "duration",
		standardKey: "200",
		twMergeKey: "duration",
	},
} as const;

export type G5Namespace = keyof typeof G5_NAMESPACES;

export type CustomMergeKeys = Record<G5Namespace, string[]>;

export type MergeExtension = ConfigExtension<
	DefaultClassGroupIds,
	DefaultThemeGroupIds
>;

export type MergeFunction = (...classLists: string[]) => string;

const G5_NAMESPACE_ORDER: readonly G5Namespace[] = [
	"text",
	"leading",
	"spacing",
	"transition-duration",
];

const G5_THEME_DECL = /^--(text|leading|spacing|transition-duration)-(.+)$/;

function isG5Namespace(value: string): value is G5Namespace {
	return Object.hasOwn(G5_NAMESPACES, value);
}

function g5Class(ns: G5Namespace, key: string): string {
	return `${G5_NAMESPACES[ns].utility}-${key}`;
}

function g5StandardClass(ns: G5Namespace): string {
	return g5Class(ns, G5_NAMESPACES[ns].standardKey);
}

function emptyMergeKeys(): CustomMergeKeys {
	return { text: [], leading: [], spacing: [], "transition-duration": [] };
}

/**
 * Walks every `@theme` at-rule (inline or not) and returns, per namespace and
 * in source order, the keys tailwind-merge's default config does not know: a
 * key is kept when vanilla twMerge does not merge its class with the
 * namespace's standard class. Sub-properties (`--text-x--line-height`) are
 * skipped, and `_` in a key reads as `.` (as Tailwind spells `0_5`).
 */
export function deriveCustomMergeKeys(css: string): CustomMergeKeys {
	const keys = emptyMergeKeys();
	postcss.parse(css).walkAtRules("theme", (atRule) => {
		atRule.walkDecls((decl) => {
			const match = G5_THEME_DECL.exec(decl.prop);
			const ns = match?.[1];
			const rest = match?.[2];
			if (ns === undefined || rest === undefined || !isG5Namespace(ns)) return;
			if (rest.includes("--")) return;
			const key = rest.replaceAll("_", ".");
			const standard = g5StandardClass(ns);
			if (twMerge(`${g5Class(ns, key)} ${standard}`) === standard) return;
			if (!keys[ns].includes(key)) keys[ns].push(key);
		});
	});
	return keys;
}

function stringEntries(group: readonly unknown[] | undefined): string[] {
	return (group ?? []).filter(
		(entry): entry is string => typeof entry === "string",
	);
}

/**
 * The keys a tailwind-merge extension lists for the G5 namespaces. A theme key
 * the extension leaves out reads as `[]`.
 */
export function extensionKeys(ext: MergeExtension): CustomMergeKeys {
	const theme = ext.extend?.theme;
	const durationKey = G5_NAMESPACES["transition-duration"].twMergeKey;
	const durations: string[] = [];
	for (const entry of ext.extend?.classGroups?.[durationKey] ?? []) {
		if (typeof entry !== "object" || entry === null) continue;
		durations.push(...stringEntries(entry[durationKey]));
	}
	return {
		text: stringEntries(theme?.[G5_NAMESPACES.text.twMergeKey]),
		leading: stringEntries(theme?.[G5_NAMESPACES.leading.twMergeKey]),
		spacing: stringEntries(theme?.[G5_NAMESPACES.spacing.twMergeKey]),
		"transition-duration": durations,
	};
}

/**
 * `missing <ns>: <key>` for each expected key the config lacks, then
 * `stale <ns>: <key>` for each configured key the stylesheet no longer has.
 */
export function findMergeConfigDrift(
	expected: CustomMergeKeys,
	configured: CustomMergeKeys,
): string[] {
	const missing: string[] = [];
	const stale: string[] = [];
	for (const ns of G5_NAMESPACE_ORDER) {
		for (const key of expected[ns]) {
			if (!configured[ns].includes(key)) missing.push(`missing ${ns}: ${key}`);
		}
		for (const key of configured[ns]) {
			if (!expected[ns].includes(key)) stale.push(`stale ${ns}: ${key}`);
		}
	}
	return [...missing, ...stale];
}

/**
 * Runs `merge` over every key: its class must yield to the namespace's
 * standard class, and a font-size class must survive next to a text color.
 */
export function findMergeFailures(
	keys: CustomMergeKeys,
	merge: MergeFunction,
): string[] {
	const colorProbe = ["text", "primary"].join("-");
	const failures: string[] = [];
	for (const ns of G5_NAMESPACE_ORDER) {
		const standard = g5StandardClass(ns);
		for (const key of keys[ns]) {
			const cls = g5Class(ns, key);
			if (merge(`${cls} ${standard}`) !== standard) {
				failures.push(`${cls} does not merge with ${standard}`);
			}
			if (
				ns === "text" &&
				merge(`${cls} ${colorProbe}`) !== `${cls} ${colorProbe}`
			) {
				failures.push(`${cls} dropped next to ${colorProbe}`);
			}
		}
	}
	return failures;
}

/**
 * G5. Derives the custom keys from `css`, checks `merge` against each, and
 * (when an extension is given) diffs the extension's keys against them. A
 * tree without an extension export (the baseline) passes `undefined`, so
 * only its merge failures count. `checked` is the number of derived keys.
 */
export function checkMergeKeys(
	css: string,
	extension: MergeExtension | undefined,
	merge: MergeFunction,
): GuardResult {
	const keys = deriveCustomMergeKeys(css);
	const violations = findMergeFailures(keys, merge);
	if (extension !== undefined) {
		violations.push(...findMergeConfigDrift(keys, extensionKeys(extension)));
	}
	const checked = G5_NAMESPACE_ORDER.reduce(
		(total, ns) => total + keys[ns].length,
		0,
	);
	return { checked, violations };
}
