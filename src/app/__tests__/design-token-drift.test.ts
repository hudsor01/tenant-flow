/**
 * Design-token drift guard (TOKEN-03).
 *
 * Recursively scans `src/components/**` and `src/app/**` for five design-token
 * drift patterns — hex color literals, `rgb()`/`rgba()`, the `bg-white` class,
 * non-zero inline `[NNN]ms` durations, and modern color functions
 * (`oklch()`/`oklab()`/`lab()`/`lch()`/`color-mix()`) — and asserts zero matches
 * outside the documented D-03 allowlist (`DRIFT_EXEMPTIONS`). The `modernColor`
 * pattern is scoped to the `src/app/api/og/` satori surface (next/og renders
 * those color spaces as solid black) and scanned against string-literal content
 * only, so an OG-route comment mentioning oklch does not self-trigger.
 *
 * This is a Vitest unit-project test (it runs in the lefthook pre-commit hook
 * and the CI test gate). The mechanism is documented for maintainers in
 * `.planning/phases/11-token-alignment/11-LINT-RULE.md`.
 *
 * Test files (`__tests__/`, `.test.`, `.spec.`, `.d.ts`) are skipped via
 * `isTestPath`, so this file's own regex / fixture string literals never
 * self-trigger the scan.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
	contrast,
	over,
	type Theme,
	tokenColor,
} from "#test/utils/oklch-contrast";
import { escapeRegExp } from "#test/utils/regexp-source";
import { vividTextUses } from "#test/utils/vivid-text-elements";

type DriftPattern = "hex" | "rgb" | "bgWhite" | "inlineMs" | "modernColor";

// The five design-token drift patterns (D-02 enumerates the first four; MKT-01
// adds `modernColor`, scoped to the src/app/api/og/ satori surface — see below).
const DRIFT_PATTERNS: Record<DriftPattern, RegExp> = {
	// #RGB / #RGBA / #RRGGBB / #RRGGBBAA at a word boundary
	hex: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
	// (?<![\w-]) blocks srgba( / vargba( AND hyphen-prefixed var-rgb( false positives
	rgb: /(?<![\w-])rgba?\s*\(/gi,
	// covers bg-white, bg-white/50, bg-white/[var(--x)]. The trailing (?![\w-])
	// rejects a following word char or hyphen so `bg-white-card` is NOT matched.
	bgWhite: /\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?(?![\w-])/g,
	// catches BOTH Tailwind arbitrary values [animation-delay:200ms] AND JS string
	// literals animationDelay: "200ms". [1-9]\d* excludes the 0ms zero-case
	// (globals.css has no --duration-0; 0ms is a legitimate no-delay).
	inlineMs: /\[\s*[a-z-]*:?\s*[1-9]\d*ms\s*\]|["'`]\s*[1-9]\d*ms\s*["'`]/g,
	// MKT-01: satori (next/og ImageResponse) renders oklch/oklab/lab/lch/
	// color-mix() as solid black, so these color functions are forbidden inside a
	// quoted style string in an OG/satori route. Scoped to `src/app/api/og/` (see
	// the per-pattern loop) and scanned against string-literal content only, so a
	// browser-CSS oklch/color-mix literal elsewhere — or an OG-route comment
	// mentioning oklch — never triggers it. (?<![\w-]) blocks `--foo-lab(` /
	// `scolor-mix(` word/hyphen-prefixed false positives.
	modernColor: /(?<![\w-])(?:oklch|oklab|lab|lch|color-mix)\s*\(/gi,
};

// String / template-literal extractor. The hex scan runs against string-literal
// content ONLY — a genuine color literal always lives inside a quoted string
// ("#635BFF" SVG fill, style="...color:#222...") whereas non-color #NNNN tokens
// (issue refs like `PR #725`, the `&#8984;` HTML entity) live in comments / JSX
// text, NOT inside string delimiters. Scoping to string content is the precise,
// non-brittle fix for the Pitfall-4 false positives (11-RESEARCH.md Q3).
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

function extractStringContent(content: string): string {
	return (content.match(STRING_LITERAL) ?? []).join("\n");
}

// Issue-reference guard. A `#NNN` / `#NNNN` issue ref (e.g. `PR #725`, `ticket #404`)
// has the SAME shape as a 3/4-digit hex color, so it false-positives the hex regex when
// it lives inside a string literal (a toast message, JSX text, etc.) rather than a
// comment. A genuine color literal is preceded by a CSS/SVG color context
// (`fill="#fff"`, `color:#222`, `: "#abc"`), never by an issue-ref keyword. This regex
// matches a hex-shaped token that is preceded — within the same string — by an issue-ref
// keyword (`PR`, `pull request`, `issue`, `ticket`, `bug`, `fix`) and optional words.
// Such matches are dropped from the hex result set. Genuine 3/4-digit hex colors
// (`fill="#abc"`) are NOT preceded by these keywords and remain caught.
const HEX_ISSUE_REF =
	/\b(?:PR|pull request|issue|ticket|bug|fix(?:ed|es)?)\b[^"'`#]*#(?:[0-9a-fA-F]{3,4})\b/gi;

function isIssueRefMatch(stringContent: string, hexMatch: string): boolean {
	const refs = stringContent.match(HEX_ISSUE_REF) ?? [];
	return refs.some((ref) => ref.endsWith(hexMatch));
}

// Subpath-import aliases (package.json#imports) start with '#' + a word and would
// false-positive the 3-4-digit hex shape. They are never color literals.
const HEX_ALIAS_PREFIXES = [
	"#config",
	"#components",
	"#lib",
	"#hooks",
	"#stores",
	"#types",
	"#providers",
	"#test",
	"#env",
	"#proxy",
	"#app",
];

// D-03 legitimate-exception allowlist — files that genuinely cannot consume a
// CSS custom property. Each entry is scoped PER-PATTERN (not whole-file): a file
// exempt for `hex` is still scanned for `inlineMs`. Every entry carries a
// justification comment (mirrors the BANLIST_EXEMPTIONS discipline in
// marketing-copy-landlord-only.test.ts). Adding an entry is a reviewed change.
const DRIFT_EXEMPTIONS: Record<string, readonly DriftPattern[]> = {
	// next/og ImageResponse (satori) renders a static image, no CSS-variable access (D-03)
	"src/app/opengraph-image.tsx": ["hex"],
	// HTML <meta> themeColor / msapplication-TileColor, browser-chrome colors (D-03)
	"src/app/layout.tsx": ["hex"],
	// Generated standalone HTML/PDF document templates, self-contained output (D-03)
	"src/app/(owner)/documents/templates/components/build-template-html.ts": [
		"hex",
	],
	"src/app/(owner)/reports/page.tsx": ["hex"],
	"src/components/leases/rent-increase-notice-dialog.tsx": ["hex"],
	"src/components/maintenance/detail/work-order-template.ts": ["hex"],
	// Third-party brand SVG logos, brand guidelines require exact hex (D-03)
	"src/components/sections/logo-cloud.tsx": ["hex"],
	"src/components/auth/google-button.tsx": ["hex"],
	// QR-code container, QR scanners require literal white regardless of theme.
	// Genuine D-03-class exception surfaced by the Phase 11 audit (11-RESEARCH.md Q2);
	// line 63 of the file carries the bg-white usage (line 62 is its justification comment).
	"src/components/auth/two-factor-setup-steps.tsx": ["bgWhite"],
} as const;

function isTestPath(relPath: string): boolean {
	return (
		relPath.includes("/__tests__/") ||
		relPath.includes(".test.") ||
		relPath.includes(".spec.") ||
		relPath.endsWith(".d.ts")
	);
}

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

function isExempt(relPath: string, pattern: DriftPattern): boolean {
	const normalized = relPath.replace(/\\/g, "/");
	return DRIFT_EXEMPTIONS[normalized]?.includes(pattern) ?? false;
}

const cwd = process.cwd();
for (const root of ["src/components", "src/app"]) {
	describe(`design-token drift: ${root}`, () => {
		for (const abs of walkSourceFiles(join(cwd, root))) {
			const rel = relative(cwd, abs).replace(/\\/g, "/");
			const content = readFileSync(abs, "utf8");
			const stringContent = extractStringContent(content);
			describe(rel, () => {
				for (const pattern of Object.keys(DRIFT_PATTERNS) as DriftPattern[]) {
					if (isExempt(rel, pattern)) continue;
					// modernColor is scoped to the OG/satori surface only — browser-CSS
					// oklch/color-mix literals elsewhere in src/app + src/components are
					// legitimate (React drives them through a real CSS engine, not satori),
					// and src/app/features/page.test.ts REQUIRES oklch on the marketing page.
					if (pattern === "modernColor" && !rel.startsWith("src/app/api/og/"))
						continue;
					it(`no ${pattern} drift`, () => {
						// hex + modernColor scan string-literal content only (Pitfall-4
						// false-positive guard, and so an OG-route comment mentioning oklch
						// does not self-trigger); the other patterns scan the raw file text.
						const scanText =
							pattern === "hex" || pattern === "modernColor"
								? stringContent
								: content;
						const rawMatches: readonly string[] =
							scanText.match(DRIFT_PATTERNS[pattern]) ?? [];
						const matches =
							pattern === "hex"
								? rawMatches.filter(
										(m) =>
											// drop #config/#components/... subpath-import specifiers
											!HEX_ALIAS_PREFIXES.some(
												(p) => m === p || m.startsWith(p),
											) &&
											// drop #NNN/#NNNN issue refs inside string literals
											!isIssueRefMatch(scanText, m),
									)
								: rawMatches;
						expect(
							matches,
							`${rel}: ${pattern} drift ${JSON.stringify(matches)} -- use a globals.css token or add a justified DRIFT_EXEMPTIONS entry`,
						).toHaveLength(0);
					});
				}
			});
		}
	});
}

// 66.2-39: a chart series and a BorderBeam color reference a theme token, so
// both themes and the measured contrast travel with the token (UI-SPEC VD-51,
// VD-52). A ChartConfig `color` is exactly `var(--color-<token>)`, the form the
// dashboard charts use; a beam color may wrap a token (`oklch(from var(...)
// l c h / 0.3)`, `color-mix(...)`) but never a literal color. The vendored
// primitives under src/components/ui are not callers and are skipped.
const CHART_CONFIG_COLOR = /\bcolor:\s*(["'`])((?:(?!\1).)*)\1/g;
const CHART_TOKEN_REFERENCE = /^var\(--color-[a-z0-9-]+\)$/;
const BEAM_COLOR_PROP = /\bcolor(?:From|To)=(["'])((?:(?!\1).)*)\1/g;
const LITERAL_COLOR_FUNCTION = /(?:oklch|oklab|lab|lch|hsla?|rgba?)\(\s*[\d.]/i;

function chartAndBeamColorViolations(rel: string, content: string): string[] {
	const out: string[] = [];
	if (content.includes("ChartConfig")) {
		for (const m of content.matchAll(CHART_CONFIG_COLOR)) {
			const value = m[2] ?? "";
			if (!CHART_TOKEN_REFERENCE.test(value))
				out.push(`${rel}: color ${value}`);
		}
	}
	for (const m of content.matchAll(BEAM_COLOR_PROP)) {
		const value = m[2] ?? "";
		if (value === "transparent") continue;
		if (!value.includes("var(--color-") || LITERAL_COLOR_FUNCTION.test(value)) {
			out.push(`${rel}: beam ${value}`);
		}
	}
	return out;
}

describe("chart series and BorderBeam colors reference a token (66.2-39)", () => {
	const scanned: string[] = [];
	const violations: string[] = [];
	for (const root of ["src/components", "src/app"]) {
		for (const abs of walkSourceFiles(join(cwd, root))) {
			const rel = relative(cwd, abs).replace(/\\/g, "/");
			if (rel.startsWith("src/components/ui/")) continue;
			const content = readFileSync(abs, "utf8");
			if (!content.includes("ChartConfig") && !content.includes("BorderBeam"))
				continue;
			scanned.push(rel);
			violations.push(...chartAndBeamColorViolations(rel, content));
		}
	}

	it("scans the chart and beam callers", () => {
		expect(scanned).toContain(
			"src/app/(owner)/analytics/financial/revenue-expense-chart.tsx",
		);
		expect(scanned).toContain("src/components/tenants/tenant-stats.tsx");
		expect(scanned.length).toBeGreaterThan(15);
	});

	it("finds no literal chart series or beam color", () => {
		expect(
			violations,
			`Literal chart/beam color(s). Use color: "var(--color-chart-N)" or the semantic token the series means (status series: the -text companions), and a var(--color-...) beam color:\n${violations.join("\n")}`,
		).toEqual([]);
	});

	// A chart token is a fill: as text it fails AA (chart-1 3.61:1 light,
	// chart-5 4.00:1 dark on the card). Text uses an AA companion.
	it("uses no chart token as a text color", () => {
		const textChart: string[] = [];
		for (const root of ["src/components", "src/app"]) {
			for (const abs of walkSourceFiles(join(cwd, root))) {
				const rel = relative(cwd, abs).replace(/\\/g, "/");
				for (const m of readFileSync(abs, "utf8").matchAll(
					/(?<![\w-])(?:[\w-]+:)*text-chart-\d(?![\w-])/g,
				)) {
					textChart.push(`${rel}: ${m[0]}`);
				}
			}
		}
		expect(textChart).toEqual([]);
	});

	it("flags a literal series and beam color and passes the token forms", () => {
		expect(
			chartAndBeamColorViolations(
				"x.tsx",
				[
					'const c = { a: { label: "A", color: "oklch(0.6 0.16 138)" }, b: { color: "var(--color-chart-1)" } } satisfies ChartConfig;',
					'<BorderBeam colorFrom="hsl(142 76% 36%)" colorTo="oklch(from var(--color-success) l c h / 0.3)" />',
					'<BorderBeam colorFrom="var(--color-warning)" colorTo="transparent" />',
				].join("\n"),
			),
		).toEqual([
			"x.tsx: color oklch(0.6 0.16 138)",
			"x.tsx: beam hsl(142 76% 36%)",
		]);
	});
});

// 66.2-39 VD-53: a chart mark is a graphical object (WCAG 1.4.11, 3:1 on the
// card). chart-2 (2.25:1) and chart-3 (2.44:1) fail on the light card, and the
// tokens are not retuned (the satori blog-cover renderers mirror their exact
// values), so no shipped source references either one, in any utility or var()
// form. A chart series or sparkline (any file that builds a ChartConfig) also
// never reads the vivid success (2.62:1) or warning (2.18:1) fill: it takes the
// -text companion. Only string-literal content is scanned, so a comment that
// names a token does not trip it. The satori OG route is out of scope.
const SUB_3_MARK_CHART_TOKEN =
	/(?<![\w-])(?:[\w-]+:)*[a-z]+-chart-[23](?![\w-])|--(?:color-)?chart-[23](?![\w-])/g;
const SUB_3_MARK_STATUS_TOKEN = /--color-(?:success|warning)(?![\w-])/g;
const CODE_STRING_OR_COMMENT =
	/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

function stringLiteralsOutsideComments(content: string): string[] {
	return [...content.matchAll(CODE_STRING_OR_COMMENT)]
		.map((m) => m[0])
		.filter((token) => !token.startsWith("//") && !token.startsWith("/*"));
}

function sub3MarkTokenViolations(rel: string, content: string): string[] {
	const out: string[] = [];
	const strings = stringLiteralsOutsideComments(content);
	const isChartSource = content.includes("ChartConfig");
	for (const literal of strings) {
		for (const m of literal.matchAll(SUB_3_MARK_CHART_TOKEN)) {
			out.push(`${rel}: ${m[0]}`);
		}
		if (!isChartSource) continue;
		for (const m of literal.matchAll(SUB_3_MARK_STATUS_TOKEN)) {
			out.push(`${rel}: ${m[0]}`);
		}
	}
	return out;
}

// 66.2-39 VD-55: the vivid success (2.62:1 on the card) and warning (2.18:1)
// fills fail 3:1 on every light surface, the lightest included (the popover,
// oklch(1 0 0): 2.69:1 and 2.24:1 in Chrome), so as a utility they are only
// ever a tint (/5 to /20) behind -text companion text or icons.
// A solid bg-, fill- or stroke- form (a meter fill, a status dot, a step mark,
// a filled badge) takes the companion: success-text, warning-text.
const SOLID_VIVID_STATUS_FILL =
	/(?<![\w/-])!?(?:bg|fill|stroke)-(?:success|warning)!?(?![\w/-])/g;

function solidVividFillViolations(rel: string, content: string): string[] {
	const out: string[] = [];
	for (const literal of stringLiteralsOutsideComments(content)) {
		for (const m of literal.matchAll(SOLID_VIVID_STATUS_FILL)) {
			out.push(`${rel}: ${m[0]}`);
		}
	}
	return out;
}

// 66.2-39 VD-55: a Progress indicator is a meter fill, a graphical object
// (WCAG 1.4.11): it needs 3:1 against the card it sits on and against its own
// track (the track variant's tint composited over the card), in both themes.
// Both cva maps are read from the primitive's source, so a variant added later
// is measured too; the colors are the globals.css token values.
const PROGRESS_SOURCE = "src/components/ui/progress.tsx";
const GLOBALS_CSS = "src/app/globals.css";
const SINGLE_FILL_CLASS = /^bg-([a-z0-9-]+?)(?:\/(\d+))?$/;

function cvaVariantMap(source: string, name: string): Record<string, string> {
	const block = new RegExp(
		`const ${escapeRegExp(name)} = cva\\([\\s\\S]*?variant:\\s*\\{([\\s\\S]*?)\\}`,
	).exec(source);
	if (!block?.[1])
		throw new Error(`${PROGRESS_SOURCE}: no ${name} variant map`);
	return Object.fromEntries(
		[...block[1].matchAll(/(\w+):\s*"([^"]*)"/g)].map((m) => [
			m[1] ?? "",
			m[2] ?? "",
		]),
	);
}

function fillOf(classes: string): { token: string; alpha: number } {
	for (const cls of classes.split(/\s+/)) {
		const m = SINGLE_FILL_CLASS.exec(cls);
		if (m?.[1]) return { token: m[1], alpha: m[2] ? Number(m[2]) / 100 : 1 };
	}
	throw new Error(`no single bg- fill class in "${classes}"`);
}

function meterFillViolations(progressSource: string, css: string): string[] {
	const tracks = cvaVariantMap(progressSource, "progressVariants");
	const indicators = cvaVariantMap(progressSource, "progressIndicatorVariants");
	const out: string[] = [];
	for (const [variant, indicatorClasses] of Object.entries(indicators)) {
		const trackClasses = tracks[variant];
		if (trackClasses === undefined) {
			out.push(`${variant}: no track variant`);
			continue;
		}
		const indicator = fillOf(indicatorClasses);
		const track = fillOf(trackClasses);
		for (const theme of ["light", "dark"] as Theme[]) {
			const card = tokenColor(css, theme, "card");
			const fill = over(
				tokenColor(css, theme, indicator.token),
				indicator.alpha,
				card,
			);
			const trackColor = over(
				tokenColor(css, theme, track.token),
				track.alpha,
				card,
			);
			const onCard = contrast(fill, card);
			const onTrack = contrast(fill, trackColor);
			if (onCard < 3) {
				out.push(
					`${variant} ${theme}: ${indicatorClasses} on the card ${onCard.toFixed(2)}:1`,
				);
			}
			if (onTrack < 3) {
				out.push(
					`${variant} ${theme}: ${indicatorClasses} on ${trackClasses} ${onTrack.toFixed(2)}:1`,
				);
			}
		}
	}
	return out;
}

describe("no chart or meter mark reads a token under 3:1 on the card (66.2-39 VD-53, VD-55)", () => {
	const scanned: string[] = [];
	const violations: string[] = [];
	for (const abs of walkSourceFiles(join(cwd, "src"))) {
		const rel = relative(cwd, abs).replace(/\\/g, "/");
		if (rel.startsWith("src/test/") || rel.startsWith("src/app/api/og/")) {
			continue;
		}
		scanned.push(rel);
		violations.push(...sub3MarkTokenViolations(rel, readFileSync(abs, "utf8")));
	}

	it("scans the dashboard charts, the units page and the sparkline helper", () => {
		for (const rel of [
			"src/components/dashboard/components/occupancy-donut-chart.tsx",
			"src/components/dashboard/chart-area-interactive.tsx",
			"src/components/dashboard/components/kpi-helpers.ts",
			"src/app/(owner)/analytics/overview/page.tsx",
			"src/app/(owner)/properties/units/page.tsx",
		]) {
			expect(scanned).toContain(rel);
		}
		expect(scanned.length).toBeGreaterThan(500);
	});

	it("finds no chart-2, chart-3 or vivid success/warning chart mark", () => {
		expect(
			violations,
			`Chart mark(s) on a token under 3:1 on the light card. Use chart-1 or chart-4 for a neutral series, or the -text companion (success-text, warning-text, primary-text, destructive-text) for a status series:\n${violations.join("\n")}`,
		).toEqual([]);
	});

	it("flags each sub-3:1 form and passes the companions and comments", () => {
		expect(
			sub3MarkTokenViolations(
				"x.tsx",
				[
					"// the old wedge was var(--color-chart-2)",
					'const c = { occupied: { color: "var(--color-chart-2)" }, vacant: { color: "var(--color-primary-text)" } } satisfies ChartConfig;',
					'<span className="size-2 rounded-full bg-chart-3" />',
					'<span className="dark:fill-chart-2 bg-chart-1 bg-chart-4 bg-chart-5 bg-chart-20" />',
					'const t = up ? "--color-success" : "--color-warning-text";',
					"const u = `var(--chart-3)`;",
				].join("\n"),
			),
		).toEqual([
			"x.tsx: --color-chart-2",
			"x.tsx: bg-chart-3",
			"x.tsx: dark:fill-chart-2",
			"x.tsx: --color-success",
			"x.tsx: --chart-3",
		]);
		expect(
			sub3MarkTokenViolations(
				"y.tsx",
				'<BorderBeam colorFrom="var(--color-success)" />',
			),
		).toEqual([]);
	});

	it("draws no meter, dot or step mark in the vivid success or warning fill (VD-55)", () => {
		const fills: string[] = [];
		for (const abs of walkSourceFiles(join(cwd, "src"))) {
			const rel = relative(cwd, abs).replace(/\\/g, "/");
			if (rel.startsWith("src/test/") || rel.startsWith("src/app/api/og/")) {
				continue;
			}
			fills.push(...solidVividFillViolations(rel, readFileSync(abs, "utf8")));
		}
		expect(
			fills,
			`Solid vivid success/warning fill(s), under 3:1 on the light card. Use bg-success-text / bg-warning-text for a mark, or a /5-/20 tint behind -text companion text:\n${fills.join("\n")}`,
		).toEqual([]);
	});

	it("draws every Progress indicator 3:1 against the card and its track in both themes (VD-55)", () => {
		const violations = meterFillViolations(
			readFileSync(join(cwd, PROGRESS_SOURCE), "utf8"),
			readFileSync(join(cwd, GLOBALS_CSS), "utf8"),
		);
		expect(
			violations,
			`Progress indicator(s) under 3:1 (WCAG 1.4.11). Use the -text companion fill:\n${violations.join("\n")}`,
		).toEqual([]);
	});

	it("flags the solid vivid fills and a sub-3:1 meter, and passes tints and companions (VD-55)", () => {
		expect(
			solidVividFillViolations(
				"x.tsx",
				[
					"// a comment naming bg-success is not a mark",
					'<span className="size-3 rounded-full bg-success" />',
					'cn("data-[state=completed]:bg-warning", "!fill-success stroke-warning!")',
					'<Badge className="bg-success/10 text-success-text bg-success-text border-success/20 bg-warning-foreground" />',
				].join("\n"),
			),
		).toEqual([
			"x.tsx: bg-success",
			"x.tsx: bg-warning",
			"x.tsx: !fill-success",
			"x.tsx: stroke-warning!",
		]);
		const css = readFileSync(join(cwd, GLOBALS_CSS), "utf8");
		const meter = (success: string) =>
			[
				'const progressVariants = cva("x", { variants: { variant: {',
				'default: "bg-primary/20", success: "bg-success/20",',
				"} } });",
				'const progressIndicatorVariants = cva("y", { variants: { variant: {',
				`default: "bg-primary", success: "${success}",`,
				"} } });",
			].join("\n");
		expect(meterFillViolations(meter("bg-success"), css)).toEqual([
			"success light: bg-success on the card 2.62:1",
			"success light: bg-success on bg-success/20 2.15:1",
		]);
		expect(meterFillViolations(meter("bg-success-text"), css)).toEqual([]);
	});
});

// 66.2-39 VD-56: the brand `--accent` is an emerald fill. Under the default
// text it reads 2.19:1 in dark, and under muted text 1.85:1 light and 1.07:1
// dark, so outside the vendored primitives it is never a surface behind text
// the state does not recolor: a state-prefixed accent surface
// (`hover:bg-accent`, `focus:bg-accent`, `data-[state=open]:bg-accent`) sets
// `text-accent-foreground` under the same prefix, and an unprefixed one carries
// no other text color. A row or addon takes the neutral `bg-muted` instead.
// (The pair itself, accent-foreground on accent, reads 4.66:1 in light since
// VD-59 darkened --accent-foreground to oklch(0.24 0.01 160); it is
// state-fill-contrast.test.ts's to measure, not this block's.) A literal with
// the fill alone is a mark (the password-strength segments, decorative dots).
const ACCENT_SURFACE = /(?<![\w/-])((?:[^\s"'`]*:)?)!?bg-accent!?(?![\w/-])/g;
const TEXT_COLOR_CLASS =
	/(?<![\w:/-])text-(?!(?:xs|sm|base|lg|[2-9]?xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip|accent-foreground)(?![\w-]))[a-z][\w-]*/;

function accentSurfaceViolations(rel: string, content: string): string[] {
	const out: string[] = [];
	for (const literal of stringLiteralsOutsideComments(content)) {
		for (const m of literal.matchAll(ACCENT_SURFACE)) {
			const prefix = m[1] ?? "";
			const unpaired =
				prefix === ""
					? TEXT_COLOR_CLASS.test(literal)
					: !literal.includes(`${prefix}text-accent-foreground`);
			if (unpaired) out.push(`${rel}: ${m[0]}`);
		}
	}
	return out;
}

describe("no row hover or addon reads text on the emerald accent fill (66.2-39 VD-56)", () => {
	const violations: string[] = [];
	const scanned: string[] = [];
	for (const abs of walkSourceFiles(join(cwd, "src"))) {
		const rel = relative(cwd, abs).replace(/\\/g, "/");
		if (
			rel.startsWith("src/test/") ||
			rel.startsWith("src/app/api/og/") ||
			rel.startsWith("src/components/ui/")
		) {
			continue;
		}
		scanned.push(rel);
		violations.push(...accentSurfaceViolations(rel, readFileSync(abs, "utf8")));
	}

	it("scans the first-party rows and data-table addons", () => {
		for (const rel of [
			"src/components/notifications/notification-item.tsx",
			"src/components/data-table/data-table-toolbar.tsx",
			"src/components/auth/password-strength.tsx",
		]) {
			expect(scanned).toContain(rel);
		}
	});

	it("finds no accent surface behind unrecolored text", () => {
		expect(
			violations,
			`Accent surface(s) behind text the state does not recolor. Use hover:bg-muted / bg-muted for a row or addon:\n${violations.join("\n")}`,
		).toEqual([]);
	});

	it("flags an unpaired hover, focus or open accent and an addon with muted text", () => {
		expect(
			accentSurfaceViolations(
				"x.tsx",
				[
					"// hover:bg-accent in a comment is not a surface",
					'<a className="flex px-2 hover:bg-accent text-left" />',
					'<b className="hover:bg-accent focus:bg-accent hover:text-accent-foreground" />',
					'<i className="data-[state=open]:bg-accent [&_svg]:text-muted-foreground" />',
					'<span className="absolute bg-accent px-2 text-muted-foreground text-sm" />',
					'const seg = "bg-accent";',
					'<u className="size-2 rounded-full bg-accent opacity-0" />',
					'<s className="text-sm hover:bg-muted bg-accent-main" />',
				].join("\n"),
			),
		).toEqual([
			"x.tsx: hover:bg-accent",
			"x.tsx: focus:bg-accent",
			"x.tsx: data-[state=open]:bg-accent",
			"x.tsx: bg-accent",
		]);
	});
});

/**
 * 66.2-39 fix round 1, part F (status-colors.md section 8): a vivid status
 * color (`text-success`, `-warning`, `-destructive`, `-info`, `-accent`,
 * `-primary`) never colors an element that shows text. The vivid tokens fail
 * 4.5:1 as text on the light surfaces (success 2.27, warning 1.88, info 2.87,
 * accent 2.95, destructive 3.99, primary 4.33), so text takes the AA `-text`
 * companion. An icon, or an element whose only content is icons, may keep the
 * vivid token (CLAUDE.md), and so may a color map outside JSX that the
 * reviewed list below names with what it colors. `vividTextUses` parses the
 * source, so the element and its children decide, not the class string.
 */
const VIVID_TEXT_REVIEWED: Record<
	string,
	{
		kinds: string[];
		/** When set, the review covers only these tokens of those kinds. */
		tokens?: string[];
		reason: string;
	}
> = {
	"src/components/sections/how-it-works.tsx": {
		kinds: ["config"],
		reason:
			"colors.text tints each step's icon tile and its decorative step number, drawn at opacity-20 beside the step's own heading",
	},
	"src/lib/utils/currency.ts": {
		kinds: ["config"],
		reason:
			"getCollectionRateStatus colors the collection-rate KPI icon, beside the status text it names",
	},
	"src/app/resources/page.tsx": {
		kinds: ["config"],
		reason: "iconColor tints each resource card's icon, beside its title",
	},
	"src/components/leases/table/leases-table-columns.tsx": {
		kinds: ["leaf"],
		reason:
			"a native checkbox: with no forms plugin its text color paints nothing",
	},
	"src/components/leases/table/leases-table.tsx": {
		kinds: ["leaf"],
		reason:
			"a native checkbox: with no forms plugin its text color paints nothing",
	},
	"src/components/tenants/tenant-grid.tsx": {
		kinds: ["leaf"],
		reason:
			"a native checkbox: with no forms plugin its text color paints nothing",
	},
	"src/app/(owner)/leases/leases-stat-cards.tsx": {
		kinds: ["leaf"],
		reason: "<card.icon>, a lucide component held in the card data",
	},
	"src/components/maintenance/maintenance-view.client.tsx": {
		kinds: ["text"],
		tokens: ["text-destructive"],
		reason:
			"the Urgent stat's 32px semibold count: AA-large 3:1, and vivid text-destructive reads 4.62:1 light and 3.21:1 dark on the stat's card in Chrome",
	},
};

function vividTextViolations(rel: string, content: string): string[] {
	const reviewed = VIVID_TEXT_REVIEWED[rel];
	return vividTextUses(rel, content)
		.filter(
			(use) =>
				use.kind === "text" || use.kind === "leaf" || use.kind === "config",
		)
		.filter(
			(use) =>
				!reviewed?.kinds.includes(use.kind) ||
				(reviewed.tokens !== undefined && !reviewed.tokens.includes(use.token)),
		)
		.map(
			(use) => `${rel}:${use.line}: ${use.token} on ${use.kind} ${use.host}`,
		);
}

describe("no vivid status color on an element that shows text (66.2-39 part F)", () => {
	it("colors text with the AA -text companions in every shipped source", () => {
		const violations: string[] = [];
		const seen = new Set<string>();
		for (const root of ["src"]) {
			for (const file of walkSourceFiles(join(cwd, root))) {
				const rel = relative(cwd, file).replace(/\\/g, "/");
				if (rel.startsWith("src/test/")) continue;
				const content = readFileSync(file, "utf8");
				if (vividTextUses(rel, content).length > 0) seen.add(rel);
				violations.push(...vividTextViolations(rel, content));
			}
		}
		expect(violations).toEqual([]);
		const stale = Object.keys(VIVID_TEXT_REVIEWED).filter(
			(rel) => !seen.has(rel),
		);
		expect(stale).toEqual([]);
	});

	it("tells text from icons by the element and its children (fixture)", () => {
		const fixture = [
			'import { Check } from "lucide-react";',
			"export function X() {",
			"  return (",
			"    <div>",
			'      <span className="text-success">Saved</span>',
			'      <Check className="size-4 text-success" />',
			'      <div className="text-warning"><Check /></div>',
			'      <p className={cn("text-sm", ok ? "text-destructive" : "")}>{label}</p>',
			'      <span className="text-success-text">Saved</span>',
			'      <div className="[&_svg]:text-info">x</div>',
			'      <div className="text-warning"><NumberTicker value={n} /></div>',
			"    </div>",
			"  );",
			"}",
			'const map = { ok: "text-primary" };',
		].join("\n");
		expect(
			vividTextUses("x.tsx", fixture).map(
				(u) => `${u.line} ${u.token} ${u.kind}`,
			),
		).toEqual([
			"5 text-success text",
			"6 text-success icon",
			"7 text-warning icon-container",
			"8 text-destructive text",
			"10 [&_svg]:text-info icon",
			"11 text-warning text",
			"15 text-primary config",
		]);
		expect(vividTextViolations("x.tsx", fixture)).toEqual([
			"x.tsx:5: text-success on text span",
			"x.tsx:8: text-destructive on text p",
			"x.tsx:11: text-warning on text div",
			"x.tsx:15: text-primary on config ok",
		]);
	});
});

describe("drift regexes catch known drift (meta-test)", () => {
	it("hex regex catches a 6-digit hex", () =>
		expect("#2563eb".match(DRIFT_PATTERNS.hex)).not.toBeNull());
	it("rgb regex catches rgba(", () =>
		expect("rgba(0,0,0,.5)".match(DRIFT_PATTERNS.rgb)).not.toBeNull());
	it("bgWhite regex catches bg-white/50", () =>
		expect("bg-white/50".match(DRIFT_PATTERNS.bgWhite)).not.toBeNull());
	it("inlineMs regex catches a non-zero ms literal", () =>
		expect('"200ms"'.match(DRIFT_PATTERNS.inlineMs)).not.toBeNull());
	it("inlineMs regex catches a Tailwind arbitrary-value ms class", () =>
		expect(
			"[animation-delay:200ms]".match(DRIFT_PATTERNS.inlineMs),
		).not.toBeNull());
	it("inlineMs regex IGNORES the 0ms zero-case", () =>
		expect('"0ms"'.match(DRIFT_PATTERNS.inlineMs)).toBeNull());
	it("modernColor regex catches oklch(", () =>
		expect(
			"oklch(0.62 0.18 250)".match(DRIFT_PATTERNS.modernColor),
		).not.toBeNull());
	it("modernColor regex catches oklab(", () =>
		expect(
			"oklab(0.4 0.1 0.1)".match(DRIFT_PATTERNS.modernColor),
		).not.toBeNull());
	it("modernColor regex catches color-mix(", () =>
		expect(
			"color-mix(in oklch, white 50%, black)".match(DRIFT_PATTERNS.modernColor),
		).not.toBeNull());
	it("modernColor regex catches lab( and lch(", () => {
		expect("lab(50% 40 59.5)".match(DRIFT_PATTERNS.modernColor)).not.toBeNull();
		expect(
			"lch(52.2% 72.2 50)".match(DRIFT_PATTERNS.modernColor),
		).not.toBeNull();
	});
	it("modernColor regex IGNORES a bare word oklch with no paren", () =>
		expect(
			"renders oklch as black".match(DRIFT_PATTERNS.modernColor),
		).toBeNull());
	it("modernColor regex IGNORES word/hyphen-prefixed lab(/color-mix(", () => {
		expect("--foo-lab(".match(DRIFT_PATTERNS.modernColor)).toBeNull();
		expect("scolor-mix(".match(DRIFT_PATTERNS.modernColor)).toBeNull();
	});
	it("modernColor scan (string-literal only) ignores an oklch mention in a comment", () =>
		expect(
			extractStringContent("// satori renders oklch as black; use hsl").match(
				DRIFT_PATTERNS.modernColor,
			),
		).toBeNull());
	it("modernColor scan flags a quoted oklch color string", () =>
		expect(
			extractStringContent('const c = "oklch(1 0 0)";').match(
				DRIFT_PATTERNS.modernColor,
			),
		).not.toBeNull());
	it("hex scan keeps a hex inside a string literal", () =>
		expect(
			extractStringContent('const fill = "#2563eb";').match(DRIFT_PATTERNS.hex),
		).not.toBeNull());
	it("hex scan ignores a non-color #NNN issue ref in a comment", () =>
		expect(
			extractStringContent("// fixed in PR #725 cycle-1").match(
				DRIFT_PATTERNS.hex,
			),
		).toBeNull());
	it("HEX_ALIAS_PREFIXES filter suppresses a #components subpath-import specifier", () => {
		const matches =
			extractStringContent('import x from "#components/ui/button";').match(
				DRIFT_PATTERNS.hex,
			) ?? [];
		expect(
			matches.filter(
				(m) => !HEX_ALIAS_PREFIXES.some((p) => m === p || m.startsWith(p)),
			),
		).toHaveLength(0);
	});
	it("issue-ref filter drops a #NNN issue ref inside a string literal", () => {
		// `toast("see ticket #725")` — the hex regex matches `#725`, but the
		// issue-ref guard drops it. Without the guard this would be a false positive.
		const scan = extractStringContent('toast("see ticket #725")');
		const matches = (scan.match(DRIFT_PATTERNS.hex) ?? []).filter(
			(m) => !isIssueRefMatch(scan, m),
		);
		expect(matches).toHaveLength(0);
	});
	it("issue-ref filter drops a #NNNN issue ref (e.g. PR #4040) inside a string literal", () => {
		const scan = extractStringContent('const msg = "Fixed in PR #4040";');
		const matches = (scan.match(DRIFT_PATTERNS.hex) ?? []).filter(
			(m) => !isIssueRefMatch(scan, m),
		);
		expect(matches).toHaveLength(0);
	});
	it("issue-ref filter still catches a genuine 3-digit hex color in the same string", () => {
		// `#abc` has no issue-ref keyword preceding it — it must survive the filter.
		const scan = extractStringContent('const fill = "#abc";');
		const matches = (scan.match(DRIFT_PATTERNS.hex) ?? []).filter(
			(m) => !isIssueRefMatch(scan, m),
		);
		expect(matches).toEqual(["#abc"]);
	});
	it("issue-ref filter still catches a genuine 6-digit hex color, not an issue ref", () => {
		const scan = extractStringContent('const fill = "#2563eb";');
		const matches = (scan.match(DRIFT_PATTERNS.hex) ?? []).filter(
			(m) => !isIssueRefMatch(scan, m),
		);
		expect(matches).toEqual(["#2563eb"]);
	});
});
