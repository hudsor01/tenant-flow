/**
 * The pure check functions behind the Tailwind theme guards G1-G9 in
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
 *   - G1 `checkOklchRange`: every oklch color literal in a stylesheet has its
 *     lightness in [0, 1] and its chroma in [0, 0.37] (B1 class: a percent-form
 *     or dropped-digit typo that renders an out-of-gamut color).
 *   - G6 `checkSourceGlobs`: every explicit `@source` entry matches at least
 *     one file, negated entries included (B9 class: a glob that matches
 *     nothing scans nothing, and a negation that matches nothing excludes
 *     nothing), and `checkSourceRoot`: the `source()` root is src/ and
 *     matches files.
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
 *   - G7 every theme-namespace var() reference resolves (D-17):
 *     `checkG7DanglingThemeVars` reports each var() reference in a theme
 *     namespace, in the compiled CSS or a shipped source file, that the
 *     compiled CSS never declares (the `--duration-*` incident class, PR 1024).
 *     `collectG7SourceTexts` reads the sources and `deriveG7RuntimeVars`
 *     derives the variables set at run time rather than by the stylesheet.
 *   - D-23/X4 structure pin `checkInlineColorTokenStructure`: theme color
 *     tokens are aliases, in an inline theme at-rule, of raw tokens declared in
 *     the unlayered `:root` and `.dark` rules (UIC-05, 66.2-16).
 *   - G8 canonical first-party classes (D-25, 66.2-18):
 *     `checkCanonicalCandidates` reports each valid candidate whose
 *     per-candidate canonical form differs, over the scope
 *     `firstPartyScanSources` builds (the project scan minus the vendored
 *     directory).
 *   - G9 class strings emit CSS (66.2-39): `checkDeadClassTokens` reports each
 *     token of a class string in a shipped source that the design system
 *     compiles to nothing and the caller does not list as a hook name (an
 *     undefined custom name, a v3-only or misspelled utility). Sources come
 *     from `collectG7SourceTexts`.
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

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { compile } from "@tailwindcss/node";
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
 * The directory part of a source pattern: its `/`-separated segments before
 * the first one that holds a glob character, joined with `/` (empty when the
 * first segment is already a glob).
 */
function staticPrefix(pattern: string): string {
	const segments: string[] = [];
	for (const segment of pattern.split("/")) {
		if (/[*?[{!]/.test(segment)) break;
		segments.push(segment);
	}
	return segments.join("/");
}

/**
 * The compiler keeps the stylesheet directory as `root.base` and carries the
 * `source()` path in `root.pattern`, so the directory the root covers is
 * `root.base` resolved with the pattern's leading literal path. A `null` root is
 * automatic detection of the whole working directory, and `"none"` turns
 * class detection off; both are violations for the project stylesheet.
 */
export function checkSourceRoot(
	root: Awaited<ReturnType<typeof compile>>["root"],
	expectedBase: string,
): GuardResult {
	const violations: string[] = [];
	if (root === null) {
		violations.push(
			'root: no source() on @import "tailwindcss", so auto-detection scans the whole working directory (B9 class)',
		);
	} else if (root === "none") {
		violations.push(
			"root: source(none) disables class detection for the project stylesheet",
		);
	} else {
		const effectiveBase = resolve(root.base, staticPrefix(root.pattern));
		if (effectiveBase !== resolve(expectedBase)) {
			violations.push(`root: base ${effectiveBase} is not ${expectedBase}`);
		}
		let files = 0;
		try {
			const scanner = new Scanner({
				sources: [{ base: root.base, pattern: root.pattern, negated: false }],
			});
			scanner.scan();
			files = scanner.files.length;
		} catch {
			files = 0;
		}
		if (files === 0) {
			violations.push(
				`root: ${root.pattern} (base ${root.base}) matches 0 files`,
			);
		}
	}
	return { checked: 1, violations };
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

/** G7. One file G7 scans: `path` is repo-relative with forward slashes. */
export interface G7SourceText {
	readonly path: string;
	readonly text: string;
}

/**
 * G7. Custom properties a theme namespace holds that are set at run time, not
 * by the stylesheet: inline-style keys, chart config colors and next/font or
 * geist font variables.
 */
export interface G7RuntimeVars {
	readonly inlineStyle: ReadonlySet<string>;
	readonly chartConfig: ReadonlySet<string>;
	readonly fonts: ReadonlySet<string>;
}

/**
 * `duration` counts only as `--duration-*`: Tailwind v4 has no bare `--duration`
 * theme key, and BorderBeam sets a bare `--duration` per element at run time.
 * Every other namespace also matches its bare name (`--spacing`, `--radius`).
 */
const G7_THEME_NAMESPACE =
	/^--(?:(?:color|text|spacing|radius|shadow|font|leading|tracking|ease|transition-duration|animate|container)(?:-|$)|duration-)/;

const G7_GLOBALS_PATH = "src/app/globals.css";

const G7_SOURCE_EXTENSION = /\.(ts|tsx|css)$/;

const G7_TEST_FILE = /\.test\.(ts|tsx)$/;

const G7_TEST_DIR = /(^|\/)__tests__\//;

const G7_INLINE_STYLE_KEY = /["']--([A-Za-z0-9_-]+)["']\s*:/g;

/**
 * An object-valued key at the start of a line, or right after `{` or `,`, so a
 * config written on one line is read the same as one written across lines.
 */
const G7_CHART_CONFIG_KEY =
	/(?:^|[{,])\s*["']?([A-Za-z_$][\w$-]*)["']?\s*:\s*\{/gm;

const G7_FONT_VARIABLE = /variable:\s*"(--[\w-]+)"/g;

const G7_NEXT_FONT_IMPORT = /from\s+["']next\/font\/(google|local)["']/;

const G7_GEIST_IMPORT = /from\s+["']geist\/font\/([\w-]+)["']/g;

const G7_DECLARATION = /(--[A-Za-z0-9_-]+)\s*:/g;

/**
 * The name run is matched greedily and the character after it is captured, so
 * a reference cut short by a template interpolation (a name ending in `-`, or
 * one followed by `$`) is skipped instead of read as a shorter name.
 */
const G7_VAR_REFERENCE = /var\(\s*(--[A-Za-z0-9_-]+)(\$?)/g;

/**
 * Tailwind's variable shorthand in a class name: a utility root, `-(`, an
 * optional data-type hint, the variable, `)`. It compiles to the same var()
 * reference, so a source using it references that variable. The `)` must
 * follow the name directly, so an interpolated name never matches.
 */
const G7_SHORTHAND_REFERENCE =
	/-\(\s*(?:[a-z-]+:)?(--[A-Za-z0-9_-]*[A-Za-z0-9_])\s*\)/g;

/** Every complete variable name `text` references, in either form. */
function g7References(text: string): string[] {
	const names: string[] = [];
	for (const match of text.matchAll(G7_VAR_REFERENCE)) {
		const name = match[1];
		if (name === undefined || match[2] === "$" || name.endsWith("-")) continue;
		names.push(name);
	}
	for (const match of text.matchAll(G7_SHORTHAND_REFERENCE)) {
		if (match[1] !== undefined) names.push(match[1]);
	}
	return names;
}

/**
 * Every shipped `.ts`, `.tsx` and `.css` file under `<repoRoot>/src`, sorted by
 * path. Test files, `__tests__` directories and the `src/test/` harness are
 * left out because they do not ship.
 */
export function collectG7SourceTexts(repoRoot: string): G7SourceText[] {
	const srcDir = resolve(repoRoot, "src");
	const sources: G7SourceText[] = [];
	for (const entry of readdirSync(srcDir, {
		encoding: "utf8",
		recursive: true,
	})) {
		const rel = entry.replaceAll("\\", "/");
		const path = `src/${rel}`;
		if (!G7_SOURCE_EXTENSION.test(path)) continue;
		if (G7_TEST_FILE.test(path) || G7_TEST_DIR.test(path)) continue;
		if (path.startsWith("src/test/")) continue;
		sources.push({ path, text: readFileSync(join(srcDir, rel), "utf8") });
	}
	return sources.sort((a, b) =>
		a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
	);
}

/** Names `text` declares (`--x:`) or references through var(). */
function g7StylesheetNames(text: string): Set<string> {
	const names = new Set<string>();
	for (const match of text.matchAll(G7_DECLARATION)) {
		if (match[1] !== undefined) names.add(match[1]);
	}
	for (const match of text.matchAll(G7_VAR_REFERENCE)) {
		if (match[1] !== undefined) names.add(match[1]);
	}
	return names;
}

/**
 * G7 runtime allow-set, derived from the sources and never hand-listed.
 *   - inlineStyle: each quoted `--name` style key in a `.ts`/`.tsx` source.
 *   - chartConfig: each object-valued key of a source that mentions
 *     ChartConfig, as `--color-<key>`.
 *   - fonts: each `variable` of a source that imports next/font/google or
 *     next/font/local, plus the `variable` of every geist font module a source
 *     imports, read from `<repoRoot>/node_modules/geist/dist/<name>.js`.
 * A name that globals.css declares or references is a theme token, even when a
 * component also sets it locally, so it leaves inlineStyle and chartConfig and
 * stays guarded: exempting it would hide a dangling reference if the token
 * were renamed or deleted.
 */
export function deriveG7RuntimeVars(
	sources: readonly G7SourceText[],
	repoRoot: string,
): G7RuntimeVars {
	const globals = sources.find((source) => source.path === G7_GLOBALS_PATH);
	const themeNames = g7StylesheetNames(globals?.text ?? "");
	const inlineStyle = new Set<string>();
	const chartConfig = new Set<string>();
	const fonts = new Set<string>();
	const geistModules = new Set<string>();
	for (const source of sources) {
		if (/\.(ts|tsx)$/.test(source.path)) {
			for (const match of source.text.matchAll(G7_INLINE_STYLE_KEY)) {
				const name = `--${match[1] ?? ""}`;
				if (match[1] !== undefined && !themeNames.has(name)) {
					inlineStyle.add(name);
				}
			}
		}
		if (source.text.includes("ChartConfig")) {
			for (const match of source.text.matchAll(G7_CHART_CONFIG_KEY)) {
				const name = `--color-${match[1] ?? ""}`;
				if (match[1] !== undefined && !themeNames.has(name)) {
					chartConfig.add(name);
				}
			}
		}
		if (G7_NEXT_FONT_IMPORT.test(source.text)) {
			for (const match of source.text.matchAll(G7_FONT_VARIABLE)) {
				if (match[1] !== undefined) fonts.add(match[1]);
			}
		}
		for (const match of source.text.matchAll(G7_GEIST_IMPORT)) {
			if (match[1] !== undefined) geistModules.add(match[1]);
		}
	}
	for (const name of geistModules) {
		const modulePath = resolve(repoRoot, `node_modules/geist/dist/${name}.js`);
		if (!existsSync(modulePath)) continue;
		for (const match of readFileSync(modulePath, "utf8").matchAll(
			G7_FONT_VARIABLE,
		)) {
			if (match[1] !== undefined) fonts.add(match[1]);
		}
	}
	return { inlineStyle, chartConfig, fonts };
}

/**
 * G7. Collects every var() reference, and every class-name variable
 * shorthand, in `compiledCss` (origin `compiled globals.css`) and in each
 * source text (origin: its path), keeps
 * the names in a theme namespace that no runtime set holds, and reports each
 * kept name the compiled CSS never declares, as
 * `<name> <- <origin>, <origin>` (sorted, origins deduplicated and sorted).
 * `checked` is the number of distinct kept names.
 */
export function checkG7DanglingThemeVars(
	compiledCss: string,
	sources: readonly G7SourceText[],
	runtime: G7RuntimeVars,
): GuardResult {
	const origins = new Map<string, Set<string>>();
	const texts: { origin: string; text: string }[] = [
		{ origin: "compiled globals.css", text: compiledCss },
		...sources.map((source) => ({ origin: source.path, text: source.text })),
	];
	for (const { origin, text } of texts) {
		for (const name of g7References(text)) {
			if (!G7_THEME_NAMESPACE.test(name)) continue;
			if (
				runtime.inlineStyle.has(name) ||
				runtime.chartConfig.has(name) ||
				runtime.fonts.has(name)
			) {
				continue;
			}
			const seen = origins.get(name) ?? new Set<string>();
			seen.add(origin);
			origins.set(name, seen);
		}
	}
	const defined = new Set<string>();
	for (const match of compiledCss.matchAll(G7_DECLARATION)) {
		if (match[1] !== undefined) defined.add(match[1]);
	}
	const violations = [...origins.keys()]
		.filter((name) => !defined.has(name))
		.sort()
		.map(
			(name) =>
				`${name} <- ${[...(origins.get(name) ?? [])].sort().join(", ")}`,
		);
	return { checked: origins.size, violations };
}

// The theme at-rule parameter word that marks a substituted (inline) theme,
// built at run time so the bare word is not a literal in this scanned file.
const INLINE_THEME_WORD = ["in", "line"].join("");
const DARK_VARIANT_PARAMS = "dark (&:where(.dark, .dark *))";
const COLOR_ALIAS_VALUE = /^var\(\s*--([\w-]+)\s*\)$/;
const STRUCTURE_FIX = `declare the raw token in the unlayered :root and .dark rules and alias it as --color-<name>: var(--<name>) from the @theme ${INLINE_THEME_WORD} at-rule (D-23)`;

function nearestAtRule(node: PostcssNode): AtRule | null {
	for (let parent = node.parent; parent; parent = parent.parent) {
		if (isAtRuleNode(parent)) return parent;
	}
	return null;
}

function hasAtRuleAncestor(
	node: PostcssNode,
	names: readonly string[],
): boolean {
	for (let parent = node.parent; parent; parent = parent.parent) {
		if (isAtRuleNode(parent) && names.includes(parent.name)) return true;
	}
	return false;
}

/**
 * D-23/X4 structure pin (UIC-05). Three rules over the stylesheet text:
 *   1. Exactly one `@custom-variant` at-rule declares the dark variant as
 *      `dark (&:where(.dark, .dark *))`.
 *   2. Every `--color-*` declaration of a theme at-rule sits in an inline one,
 *      has the value `var(--<name>)` for its own suffix, and `--<name>` is
 *      declared in an unlayered rule whose selector is exactly `:root`.
 *      `checked` counts these inline declarations.
 *   3. Every custom property declared in a dark-scope rule (outside `@utility`
 *      and `@keyframes`) sits in an unlayered rule whose selector is exactly
 *      `.dark`.
 * Violations are sorted.
 */
export function checkInlineColorTokenStructure(css: string): GuardResult {
	const root = postcss.parse(css);
	const violations: string[] = [];
	let checked = 0;

	let darkVariants = 0;
	root.walkAtRules("custom-variant", (atRule) => {
		if (atRule.params.replace(/\s+/g, " ").trim() === DARK_VARIANT_PARAMS) {
			darkVariants += 1;
		}
	});
	if (darkVariants !== 1) {
		violations.push(
			`@custom-variant ${DARK_VARIANT_PARAMS} is declared ${darkVariants} times; declare it exactly once so the .dark rule drives the dark variant (X4)`,
		);
	}

	const rootDeclared = new Set<string>();
	for (const node of root.nodes) {
		if (node.type !== "rule" || node.selector.trim() !== ":root") continue;
		node.each((child) => {
			if (child.type === "decl" && child.prop.startsWith("--")) {
				rootDeclared.add(child.prop);
			}
		});
	}

	root.walkDecls((decl) => {
		if (!decl.prop.startsWith("--color-")) return;
		const atRule = nearestAtRule(decl);
		if (atRule === null || atRule.name !== "theme") return;
		const words = atRule.params.trim().split(/\s+/);
		if (!words.includes(INLINE_THEME_WORD)) {
			violations.push(
				`${decl.prop}: ${decl.value.trim()} is a literal in a non-${INLINE_THEME_WORD} @theme at-rule; ${STRUCTURE_FIX}`,
			);
			return;
		}
		checked += 1;
		const suffix = decl.prop.slice("--color-".length);
		const target = COLOR_ALIAS_VALUE.exec(decl.value.trim())?.[1];
		if (target === undefined || target !== suffix) {
			violations.push(
				`${decl.prop}: ${decl.value.trim()} in the @theme ${INLINE_THEME_WORD} at-rule is not var(--${suffix}); ${STRUCTURE_FIX}`,
			);
			return;
		}
		if (!rootDeclared.has(`--${suffix}`)) {
			violations.push(
				`${decl.prop}: --${suffix} is not declared in an unlayered :root rule; ${STRUCTURE_FIX}`,
			);
		}
	});

	root.walkRules((rule) => {
		if (hasAtRuleAncestor(rule, ["utility", "keyframes"])) return;
		if (!DARK_SCOPE_SELECTOR.test(rule.selector)) return;
		const plain =
			rule.selector.trim() === ".dark" && rule.parent?.type === "root";
		if (plain) return;
		rule.each((child) => {
			if (child.type !== "decl" || !child.prop.startsWith("--")) return;
			violations.push(
				`${child.prop} is declared in the dark-scope rule "${rule.selector.trim()}"${rule.parent?.type === "root" ? "" : " nested in an at-rule"}; ${STRUCTURE_FIX}`,
			);
		});
	});

	return { checked, violations: violations.sort() };
}

/** The vendored shadcn directory, relative to the repository root. G8 skips it (W5 owns those files, PLAN.md decision 6). */
export const VENDORED_UI_RELATIVE_DIR = "src/components/ui";

/** The root font size the canonicalizer assumes when it maps a px value to a spacing-scale step. */
export const CANONICAL_ROOT_FONT_SIZE_PX = 16;

/**
 * G8 scope (D-25): the project scan sources plus one negated entry for the
 * vendored directory. Test files are already outside the project scan through
 * the `@source not` line for test files in `globals.css`.
 */
export function firstPartyScanSources(
	sources: readonly SourceEntry[],
	repoRoot: string,
): SourceEntry[] {
	return [
		...sources,
		{
			base: resolve(repoRoot, VENDORED_UI_RELATIVE_DIR),
			pattern: "**/*",
			negated: true,
		},
	];
}

/**
 * G8 canonical first-party classes (D-25). `checked` counts the candidates the
 * design system compiles (a scanned token that is not a class is skipped);
 * `violations` lists, sorted, each one whose canonical form differs, as
 * `<candidate> -> <canonical>`. Each candidate is canonicalized on its own,
 * with the 16px root, and `collapse` is deliberately not passed: two classes
 * that a collapse would merge into one shorthand stay valid, so G8, the audit
 * metric M10 and the canonicalize codemod all measure one per-candidate rule.
 */
export function checkCanonicalCandidates(
	designSystem: Pick<
		Awaited<ReturnType<typeof __unstable__loadDesignSystem>>,
		"candidatesToCss" | "canonicalizeCandidates"
	>,
	candidates: readonly string[],
): GuardResult {
	const list = [...candidates];
	const css = designSystem.candidatesToCss(list);
	const violations: string[] = [];
	let checked = 0;
	list.forEach((candidate, index) => {
		if (css[index] === null || css[index] === undefined) return;
		checked += 1;
		const canonical = designSystem.canonicalizeCandidates([candidate], {
			rem: CANONICAL_ROOT_FONT_SIZE_PX,
		})[0];
		if (canonical !== candidate) {
			violations.push(`${candidate} -> ${canonical}`);
		}
	});
	return { checked, violations: violations.sort() };
}

/** G9: a quoted or template-literal string body (template expressions blanked). */
const G9_STRING_LITERAL =
	/(className=\s*\{?\s*)?(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/g;

const G9_TEMPLATE_EXPRESSION = /\$\{[^}]*\}/g;

/** G9: a string compared with `===` / `!==` is a value, not a class. */
const G9_COMPARED_BEFORE = /[=!]==?\s*$/;

const G9_COMPARED_AFTER = /^\s*[=!]==?/;

/** G9: a quoted string inside a template expression. */
const G9_QUOTED_LITERAL = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g;

const G9_BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;

const G9_LINE_COMMENT = /(^|[\s;{}(),])\/\/[^\n]*/g;

/** A compiled token with one of these characters reads as a utility, not a word. */
const G9_UTILITY_SHAPE = /[-:/[]/;

/**
 * G9. Each quoted or template string is read, and so is each quoted string
 * inside a template expression (a ternary picking one class per branch; an
 * operand of an equality comparison is a value and is skipped). A
 * string is a class string when it is a `className=` value (directly or as a
 * `className={`...`}` template, whose expression strings count too), or when it
 * has two or more tokens, at least half of them compile, and one compiled
 * token has a utility shape (a hyphen, colon, slash or bracket), which prose
 * and identifiers do not. Each token of a class string that compiles to no CSS
 * and is not a hook name (`isHook`: group and peer markers, selector hooks
 * another rule or library reads) is reported as `<path>: <token>`, sorted and
 * de-duplicated. `checked` counts the class-string tokens that compile.
 */
export function checkDeadClassTokens(
	designSystem: Pick<
		Awaited<ReturnType<typeof __unstable__loadDesignSystem>>,
		"candidatesToCss"
	>,
	sources: readonly G7SourceText[],
	isHook: (token: string) => boolean,
): GuardResult {
	const strings: { path: string; tokens: string[]; attribute: boolean }[] = [];
	for (const source of sources) {
		if (!/\.(ts|tsx)$/.test(source.path)) continue;
		const code = source.text
			.replace(G9_BLOCK_COMMENT, " ")
			.replace(G9_LINE_COMMENT, "$1");
		for (const match of code.matchAll(G9_STRING_LITERAL)) {
			const template = match[4];
			const bodies: { text: string; attribute: boolean }[] = [
				{
					text: (match[2] ?? match[3] ?? template ?? "").replace(
						G9_TEMPLATE_EXPRESSION,
						" ",
					),
					attribute: match[1] !== undefined,
				},
			];
			for (const expression of template?.match(G9_TEMPLATE_EXPRESSION) ?? []) {
				for (const inner of expression.matchAll(G9_QUOTED_LITERAL)) {
					const start = inner.index ?? 0;
					const before = expression.slice(0, start);
					const after = expression.slice(start + inner[0].length);
					if (
						G9_COMPARED_BEFORE.test(before) ||
						G9_COMPARED_AFTER.test(after)
					) {
						continue;
					}
					bodies.push({
						text: inner[1] ?? inner[2] ?? "",
						attribute: match[1] !== undefined,
					});
				}
			}
			for (const body of bodies) {
				const tokens = body.text.split(/\s+/).filter((token) => token !== "");
				if (tokens.length === 0) continue;
				strings.push({ path: source.path, tokens, attribute: body.attribute });
			}
		}
	}
	const unique = [...new Set(strings.flatMap((entry) => entry.tokens))];
	const css = designSystem.candidatesToCss(unique);
	const compiles = new Map(
		unique.map((token, index) => [token, css[index] != null]),
	);
	let checked = 0;
	const violations = new Set<string>();
	for (const entry of strings) {
		const compiled = entry.tokens.filter((token) => compiles.get(token));
		const classString =
			entry.attribute ||
			(entry.tokens.length >= 2 &&
				compiled.length * 2 >= entry.tokens.length &&
				compiled.some((token) => G9_UTILITY_SHAPE.test(token)));
		if (!classString) continue;
		checked += compiled.length;
		for (const token of entry.tokens) {
			if (compiles.get(token) || isHook(token)) continue;
			violations.add(`${entry.path}: ${token}`);
		}
	}
	return { checked, violations: [...violations].sort() };
}
