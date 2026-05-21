/**
 * Design-token drift guard (TOKEN-03).
 *
 * Recursively scans `src/components/**` and `src/app/**` for the four design-token
 * drift patterns — hex color literals, `rgb()`/`rgba()`, the `bg-white` class, and
 * non-zero inline `[NNN]ms` durations — and asserts zero matches outside the
 * documented D-03 allowlist (`DRIFT_EXEMPTIONS`).
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

type DriftPattern = "hex" | "rgb" | "bgWhite" | "inlineMs";

// The four design-token drift patterns (D-02 enumerates exactly these four).
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
	"src/components/dashboard/dashboard-filters.tsx": ["hex"],
	"src/components/leases/rent-increase-notice-dialog.tsx": ["hex"],
	"src/components/maintenance/detail/work-order-template.ts": ["hex"],
	// Third-party brand SVG logos, brand guidelines require exact hex (D-03)
	"src/components/sections/logo-cloud.tsx": ["hex"],
	"src/components/auth/google-button.tsx": ["hex"],
	// QR-code container, QR scanners require literal white regardless of theme.
	// Genuine D-03-class exception surfaced by the Phase 11 audit (11-RESEARCH.md Q2);
	// line 62 of the file carries the in-code justification comment.
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
					it(`no ${pattern} drift`, () => {
						// hex scans string-literal content only (Pitfall-4 false-positive
						// guard); the other three scan the raw file text.
						const scanText = pattern === "hex" ? stringContent : content;
						const rawMatches: readonly string[] =
							scanText.match(DRIFT_PATTERNS[pattern]) ?? [];
						const matches =
							pattern === "hex"
								? rawMatches.filter(
										(m) =>
											!HEX_ALIAS_PREFIXES.some(
												(p) => m === p || m.startsWith(p),
											),
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
});
