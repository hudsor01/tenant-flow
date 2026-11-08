// @vitest-environment node
/**
 * Tailwind theme integrity guards (UIC-03; PLAN.md §6; D-17).
 *
 * This file is the single home of guards G1-G10. Each guard compiles the REAL
 * `src/app/globals.css` with Tailwind's own engine (`#test/utils/tailwind-engine`)
 * instead of reading a regex copy of it, because regex copies (X1/X6) are how
 * the theme defects shipped.
 *
 * ORDER (P4). lefthook runs the whole unit suite on every commit, so a guard
 * can only land in the same commit as its fix: G1-G6 arrive with their fixes
 * in 66.2-04..09, G7 in 66.2-14, G8 in 66.2-18, and G9 and G10 in 66.2-39 (after
 * the dead-class and status-color fixes they pin). No guard is added ahead of its fix. The harness self-tests come first; each guard follows them.
 *
 * ENVIRONMENT (N6). The file runs in node, not jsdom: `src/test/unit-setup.ts`
 * touches the DOM only behind `typeof window !== "undefined"`, so the shared
 * setup is safe here.
 *
 * GUARD CONTRACT, for every downstream guard plan:
 *   - Each guard is one `describe("G<N> <title>", …)`, so `-t "G<N>"` selects
 *     it. It holds a non-vacuity `it`, a positive `it` that runs against
 *     `projectEngine()` and reports an actionable violation list, and a fixture
 *     negative-control `it` that runs through `loadFixtureEngine(...)` and
 *     proves the check CAN fail.
 *   - Pure check functions live in `#test/utils/tailwind-guards` (created by
 *     66.2-04 with G1/G6). Each returns `GuardResult` (or a promise of one)
 *     from CSS text, a source list or engine fields, with project callables
 *     injected as parameters. `#test/utils/tailwind-engine` holds only the
 *     compile/scan/load helpers.
 *   - Fixture CSS and probe class names stay in THIS file. globals.css excludes
 *     test files from the Tailwind scan (its `@source not` rule for
 *     `*.test.{ts,tsx}`), while the helper modules are scanned.
 *   - Every `it` that awaits an engine passes an explicit timeout; the G8 `it`
 *     takes `30_000`.
 *
 * G8 (landed in 66.2-18, D-25). Every class Tailwind compiles in first-party
 * source (the project scan minus `src/components/ui/`, whose vendored files
 * belong to W5) is already in its canonical form. The check is per candidate,
 * with `rem: 16` and without `collapse`, the rule audit.mjs M10 and the
 * `.planning/tailwind-shadcn/audit/canonicalize.mjs` codemod use too.
 * Maintainer note: a future Tailwind release may add canonicalizations. G8
 * then fails in CI's `checks` job on the bump pull request (on main that job
 * runs `bun run test:unit -- --coverage` for every pull request, Dependabot's
 * included) and on the next lefthook commit; Dependabot's own commits skip
 * lefthook. Fix it by re-running the codemod with `--write`.
 *
 * G9 (66.2-39). Every token of a first-party class string emits CSS. G8 skips
 * a token the design system does not compile, so G9 covers that half: a
 * `className=` value (and each string a `className={`...`}` template picks), or
 * a string of two or more tokens at least half of which compile, may hold only
 * compiling tokens and the listed hook names. A one-token string outside
 * `className=` (`cn("x")`) is not classified, and a data-* variant on an
 * attribute nothing sets compiles, so neither is in G9's reach.
 *
 * G10 (66.2-39). No shipped source reaches Tailwind's default color palette:
 * status meaning reads the semantic tokens (`success`, `warning`,
 * `destructive`, `info`, `primary`, `muted`) and their AA `-text` companions,
 * which carry their own dark values. The compiler decides, so every utility
 * type, variant, opacity modifier and arbitrary form is covered, and a raw
 * palette variable name in a chart config or style value is read too.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { compile } from "@tailwindcss/node";
import type { AtRule, Node as PostcssNode, Rule } from "postcss";
import { twMerge } from "tailwind-merge";
import { describe, expect, it } from "vitest";
import { MOBILE_MEDIA_QUERY } from "#hooks/use-mobile";
import { cn, TAILWIND_MERGE_EXTENSION } from "#lib/utils";
import {
	FIXTURE_CSS_PREFIX,
	fixtureCss,
	GLOBALS_CSS_PATH,
	loadFixtureEngine,
	loadProjectTailwindEngine,
	parseCss,
	REPO_ROOT,
	scanSources,
	TAILWIND_BASE,
	type TailwindEngine,
} from "#test/utils/tailwind-engine";
import {
	type CustomMergeKeys,
	checkCanonicalCandidates,
	checkDeadClassTokens,
	checkFractionEquivalents,
	checkG7DanglingThemeVars,
	checkInlineColorTokenStructure,
	checkLightOnlyColorTokens,
	checkMergeKeys,
	checkNonInlineThemeVarRefs,
	checkOklchRange,
	checkRawPaletteColors,
	checkSourceGlobs,
	checkSourceRoot,
	checkUtilityShadowing,
	collectCustomPropertiesByContext,
	collectG7SourceTexts,
	collectSourceCustomPropertyRefs,
	deriveCustomMergeKeys,
	deriveG7RuntimeVars,
	extensionKeys,
	extractCustomPropertyRefs,
	findMergeConfigDrift,
	findMergeFailures,
	firstPartyScanSources,
	G5_NAMESPACES,
	type G5Namespace,
	type G7RuntimeVars,
	type G7SourceText,
	resolveCustomPropertyChain,
} from "#test/utils/tailwind-guards";

const ENGINE_TIMEOUT_MS = 30_000;

let projectEnginePromise: Promise<TailwindEngine> | undefined;

function projectEngine(): Promise<TailwindEngine> {
	if (projectEnginePromise === undefined) {
		projectEnginePromise = loadProjectTailwindEngine();
	}
	return projectEnginePromise;
}

describe("tailwind engine: environment", () => {
	it("runs in the node environment, so no jsdom global exists", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
	});
});

describe("tailwind engine: project build", () => {
	it(
		"scans a non-empty source set that includes a known first-party file",
		async () => {
			const { scannedFiles } = await projectEngine();
			expect(scannedFiles.length).toBeGreaterThan(0);
			expect(scannedFiles).toContain(
				resolve(REPO_ROOT, "src/components/ui/button.tsx"),
			);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"extracts candidates and compiles CSS for a utility the app renders",
		async () => {
			const { candidates, compiledCss } = await projectEngine();
			expect(candidates).toContain("bg-primary");
			expect(compiledCss).toContain(".bg-primary");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"loads the design system with the project theme merged over the defaults",
		async () => {
			const { designSystem } = await projectEngine();
			expect(designSystem.resolveThemeValue("--text-xs")).toBe("0.75rem");
			expect(designSystem.candidatesToCss(["bg-primary"])[0]).not.toBeNull();
			expect(designSystem.candidatesToCss(["bg-probe"])[0]).toBeNull();
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"parses globals.css into a postcss tree that contains @theme at-rules",
		async () => {
			const { ast } = await projectEngine();
			let themeRules = 0;
			ast.walkAtRules("theme", () => {
				themeRules += 1;
			});
			expect(themeRules).toBeGreaterThan(0);
		},
		ENGINE_TIMEOUT_MS,
	);

	it("hands every caller in this file the same engine promise", () => {
		expect(projectEngine()).toBe(projectEngine());
	});
});

describe("tailwind engine: fixture negative-control helpers", () => {
	it("prefixes every fixture with a source(none) import", () => {
		expect(FIXTURE_CSS_PREFIX).toBe('@import "tailwindcss" source(none);\n');
		expect(fixtureCss("@theme {}")).toBe(`${FIXTURE_CSS_PREFIX}@theme {}`);
	});

	it(
		"compiles a fixture without scanning the repository",
		async () => {
			const engine = await loadFixtureEngine("");
			expect(engine.compiler.root).toBe("none");
			expect(engine.sources).toHaveLength(0);
			expect(engine.scannedFiles).toHaveLength(0);
			expect(engine.candidates).toHaveLength(0);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"resolves fixture-only theme keys and none of the project's",
		async () => {
			const { designSystem } = await loadFixtureEngine(
				"@theme { --color-probe: oklch(0.5 0.1 200); }",
			);
			expect(designSystem.candidatesToCss(["bg-probe"])[0]).toContain(
				"var(--color-probe)",
			);
			expect(designSystem.candidatesToCss(["bg-primary"])[0]).toBeNull();
		},
		ENGINE_TIMEOUT_MS,
	);
});

describe("G1 — every oklch() literal in globals.css is in range (B1 class)", () => {
	const projectCss = readFileSync(GLOBALS_CSS_PATH, "utf8");

	it("scans enough oklch() literals that a clean result means something", () => {
		// Non-vacuity floor. The real file held 110 literals at 66.2-04, holds 98
		// once 66.2-07 deletes the 12 label/fill/separator tokens, and fewer after
		// 66.2-13 deletes the dead tokens. The floor sits below every planned
		// count, so no deletion plan has to lower it. A scan that finds fewer
		// literals than this has stopped reading the declarations it guards.
		expect(
			checkOklchRange(projectCss).checked,
			"G1 scanned too few oklch() literals in globals.css: the scan is vacuous",
		).toBeGreaterThanOrEqual(50);
	});

	it("finds no oklch() literal outside the lightness and chroma ranges", () => {
		const { violations } = checkOklchRange(projectCss);
		expect(
			violations,
			[
				"oklch() literal(s) outside L∈[0,1], C∈[0,0.37]: a percent-form or dropped-digit typo renders as an out-of-gamut color (B1 class). Fix the literal:",
				...violations,
			].join("\n"),
		).toEqual([]);
	});

	it("flags a percent lightness with a dropped-digit chroma (the B1 defect)", () => {
		const { violations } = checkOklchRange(
			"@theme { --color-x: oklch(95.46% 3.51 246.58); }",
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("--color-x");
	});

	it("accepts the corrected decimal literal", () => {
		expect(
			checkOklchRange("@theme { --color-x: oklch(0.9546 0.0351 246.58); }")
				.violations,
		).toEqual([]);
	});

	it("normalizes a percent lightness before comparing it", () => {
		expect(
			checkOklchRange("@theme { --color-x: oklch(95.46% 0.0351 246.58); }")
				.violations,
		).toEqual([]);
	});

	it("reads a percent chroma as a fraction of 0.4", () => {
		expect(
			checkOklchRange("@theme { --color-x: oklch(0.5 100% 0); }").violations,
		).toHaveLength(1);
	});

	it("flags a lightness above 1", () => {
		expect(
			checkOklchRange("@theme { --color-x: oklch(1.2 0.1 0); }").violations,
		).toHaveLength(1);
	});

	it("does not read the alpha channel", () => {
		expect(
			checkOklchRange("@theme { --color-x: oklch(0 0 0 / 85%); }").violations,
		).toEqual([]);
	});
});

describe("G6 — every explicit @source glob in globals.css matches at least one file (B9 class)", () => {
	it(
		"checks at least one explicit @source entry",
		async () => {
			const { compiler } = await projectEngine();
			expect(
				checkSourceGlobs(compiler.sources).checked,
				"G6 found no explicit @source entry in globals.css: the check is vacuous",
			).toBeGreaterThan(0);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"finds no explicit @source glob that matches zero files",
		async () => {
			const { compiler } = await projectEngine();
			const { violations } = checkSourceGlobs(compiler.sources);
			expect(
				violations,
				[
					"Explicit @source glob(s) that match zero files. A glob that matches nothing silently scans nothing (B9 class). Fix or delete:",
					...violations,
				].join("\n"),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags the zero-match glob that globals.css carried (the B9 defect)",
		async () => {
			const { compiler } = await loadFixtureEngine('@source "..*.{ts,tsx}";');
			const { violations } = checkSourceGlobs(compiler.sources);
			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("*.{ts,tsx}");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"accepts a glob that matches a file",
		async () => {
			const { compiler } = await loadFixtureEngine('@source "./layout.tsx";');
			const result = checkSourceGlobs(compiler.sources);
			expect(result.checked).toBe(1);
			expect(result.violations).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"checks a negated entry as a positive glob and accepts it when it matches",
		async () => {
			const { compiler } = await loadFixtureEngine(
				'@source not "./layout.tsx";',
			);
			const result = checkSourceGlobs(compiler.sources);
			expect(result.checked).toBe(1);
			expect(result.violations).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags a negated entry that excludes nothing",
		async () => {
			const { compiler } = await loadFixtureEngine(
				'@source not "./no-such-file-66-2-04.tsx";',
			);
			const { violations } = checkSourceGlobs(compiler.sources);
			expect(violations).toHaveLength(1);
			expect(violations[0]?.startsWith("not ")).toBe(true);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"the source() root of globals.css is src/ and matches files",
		async () => {
			const result = checkSourceRoot(
				(await projectEngine()).compiler.root,
				resolve(REPO_ROOT, "src"),
			);
			expect(result.checked).toBe(1);
			expect(
				result.violations,
				[
					'globals.css must scope class detection with @import "tailwindcss" source("..") (D-18). Fix:',
					...result.violations,
				].join("\n"),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"scans only non-test files under src/",
		async () => {
			const { scannedFiles } = await projectEngine();
			const srcPrefix = resolve(REPO_ROOT, "src") + sep;
			expect(
				scannedFiles.filter((file) => !file.startsWith(srcPrefix)),
				"class detection read files outside src/",
			).toEqual([]);
			expect(
				scannedFiles.filter((file) => /\.test\.tsx?$/.test(file)),
				"class detection read test files",
			).toEqual([]);
			expect(scannedFiles.length).toBeGreaterThan(800);
		},
		ENGINE_TIMEOUT_MS,
	);

	const compileRootFixture = async (css: string) =>
		(
			await compile(css, {
				base: TAILWIND_BASE,
				from: GLOBALS_CSS_PATH,
				onDependency: () => undefined,
			})
		).root;

	it(
		"flags a root without source(), which falls back to auto-detection",
		async () => {
			const root = await compileRootFixture('@import "tailwindcss";');
			const { violations } = checkSourceRoot(root, resolve(REPO_ROOT, "src"));
			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("auto-detection");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags source(none), which turns class detection off",
		async () => {
			const root = await compileRootFixture(
				'@import "tailwindcss" source(none);',
			);
			const { violations } = checkSourceRoot(root, resolve(REPO_ROOT, "src"));
			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("source(none)");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		'accepts source(".."), whose effective base is src/',
		async () => {
			const root = await compileRootFixture(
				'@import "tailwindcss" source("..");',
			);
			expect(root).toEqual({ base: TAILWIND_BASE, pattern: ".." });
			const result = checkSourceRoot(root, resolve(REPO_ROOT, "src"));
			expect(result.checked).toBe(1);
			expect(result.violations).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags a root whose base is not src/",
		async () => {
			const root = await compileRootFixture(
				'@import "tailwindcss" source("../../.github");',
			);
			const { violations } = checkSourceRoot(root, resolve(REPO_ROOT, "src"));
			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("is not");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags a root that matches no file",
		() => {
			const emptyDir = mkdtempSync(join(tmpdir(), "g6-empty-"));
			try {
				mkdirSync(join(emptyDir, "app"));
				const { violations } = checkSourceRoot(
					{ base: join(emptyDir, "app"), pattern: ".." },
					emptyDir,
				);
				expect(violations).toHaveLength(1);
				expect(violations[0]).toContain("matches 0 files");
			} finally {
				rmSync(emptyDir, { recursive: true, force: true });
			}
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"pins that compile() rejects a source() directory that does not exist",
		async () => {
			await expect(
				compileRootFixture(
					'@import "tailwindcss" source("./no-such-dir-66-2-12");',
				),
			).rejects.toMatchObject({
				message: expect.stringContaining(
					"does not exist or is not a directory",
				),
			});
		},
		ENGINE_TIMEOUT_MS,
	);
});

describe("G2 — no non-inline @theme variable references var()", () => {
	const projectCss = readFileSync(GLOBALS_CSS_PATH, "utf8");

	it(
		"checks non-inline @theme declarations and sees an @theme inline block",
		async () => {
			expect(
				checkNonInlineThemeVarRefs(projectCss).checked,
				"G2 found no custom property in a non-inline @theme block of globals.css: the check is vacuous",
			).toBeGreaterThan(0);
			const { ast } = await projectEngine();
			let inlineThemeRules = 0;
			ast.walkAtRules("theme", (atRule) => {
				if (/\binline\b/.test(atRule.params)) inlineThemeRules += 1;
			});
			expect(
				inlineThemeRules,
				"globals.css has no @theme inline block: G2's inline exemption is untested",
			).toBeGreaterThan(0);
		},
		ENGINE_TIMEOUT_MS,
	);

	it("finds no non-inline @theme variable whose value references var()", () => {
		const { violations } = checkNonInlineThemeVarRefs(projectCss);
		expect(
			violations,
			[
				"Non-inline @theme var(s) reference var(); they resolve at :root, not where the variable is set. Move them to `@theme inline` (Tailwind docs §theme):",
				...violations,
			].join("\n"),
		).toEqual([]);
	});

	it("flags a self-referencing font stack in a non-inline @theme (the B3 defect)", () => {
		expect(
			checkNonInlineThemeVarRefs("@theme { --font-sans: var(--font-sans), x; }")
				.violations,
		).toEqual(["--font-sans"]);
	});

	it("exempts the same reference inside @theme inline", () => {
		expect(
			checkNonInlineThemeVarRefs(
				"@theme inline { --font-sans: var(--font-roboto), x; }",
			).violations,
		).toEqual([]);
	});

	it(
		"compiles the font utilities to the next/font variables (engine corroboration)",
		async () => {
			const { designSystem } = await projectEngine();
			const [sans, mono] = designSystem.candidatesToCss([
				"font-sans",
				"font-mono",
			]);
			expect(sans).toContain("var(--font-roboto)");
			expect(mono).toContain("var(--font-geist-mono)");
		},
		ENGINE_TIMEOUT_MS,
	);
});

/**
 * B2 / D-08 regression check, not a G-numbered guard. An unlayered rule beats
 * every cascade layer at any specificity, so an unlayered element selector for
 * a form control overrides every Tailwind utility on that control (the B2
 * defect turned Radix Switch/Checkbox/Radio/Tab buttons into 44x44 padded
 * shapes below 768px). A `:where()` wrapper does not exempt an unlayered rule.
 */
const TOUCH_TARGET_SELECTOR_PATTERNS: readonly RegExp[] = [
	/(^|[\s>+~(,])(button|input|select|textarea)(?![\w-])/,
	/\[role=["']?button/,
	/\.btn\b/,
	/\.form-input\b/,
];

function findUnlayeredTouchTargetRules(css: string): string[] {
	const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
	const ancestors: string[] = [];
	const violations: string[] = [];
	let prelude = "";
	for (const char of source) {
		if (char === "{") {
			const text = prelude.trim();
			const isStyleRule = !text.startsWith("@");
			const isLayered = ancestors.some((entry) => entry.startsWith("@layer"));
			if (
				isStyleRule &&
				!isLayered &&
				TOUCH_TARGET_SELECTOR_PATTERNS.some((pattern) => pattern.test(text))
			) {
				violations.push(text.replace(/\s+/g, " "));
			}
			ancestors.push(text);
			prelude = "";
		} else if (char === "}") {
			ancestors.pop();
			prelude = "";
		} else if (char === ";") {
			prelude = "";
		} else {
			prelude += char;
		}
	}
	return violations;
}

const BASELINE_UNLAYERED_TOUCH_BLOCK = `@media (max-width: 768px) {
	.mobile-full-width {
		width: 100vw;
		margin-left: calc(-50vw + 50%);
	}

	.mobile-centered {
		text-align: center;
	}

	.mobile-padded {
		padding: var(--container-padding-mobile);
	}

	.mobile-spaced {
		margin: var(--section-spacing-mobile) 0;
	}

	.btn,
	button,
	[role="button"] {
		min-height: var(--touch-target-min);
		min-width: var(--touch-target-min);
		padding: var(--touch-target-padding);
	}

	.form-input,
	input,
	select,
	textarea {
		min-height: var(--touch-target-min);
		padding: var(--touch-target-padding);
	}

	.mobile-stack > * + * {
		margin-block-start: var(--spacing-responsive-sm);
	}

	.mobile-nav-item {
		padding: var(--touch-target-padding);
		min-height: var(--touch-target-min);
	}
}`;

const LAYERED_TOUCH_RULES = `@layer base {
	@media (max-width: 768px) {
		.btn,
		button,
		[role="button"] {
			min-height: var(--touch-target-min);
			min-width: var(--touch-target-min);
			padding: var(--touch-target-padding);
		}

		.form-input,
		input,
		select,
		textarea {
			min-height: var(--touch-target-min);
			padding: var(--touch-target-padding);
		}
	}
}`;

const TOUCH_TARGET_MEDIA_PARAMS = "(width < 48rem)";

interface TouchTargetRule {
	readonly selector: string;
	readonly declarations: ReadonlyArray<readonly [string, string]>;
}

function isAtRule(node: { type: string } | undefined): node is AtRule {
	return node?.type === "atrule";
}

function isRule(node: { type: string } | undefined): node is Rule {
	return node?.type === "rule";
}

function layeredTouchTargetRules(
	engine: TailwindEngine,
	selectorStart: string,
): TouchTargetRule[] {
	const found: TouchTargetRule[] = [];
	parseCss(engine.compiledCss).walkRules((rule) => {
		if (!rule.selector.replace(/\s+/g, "").startsWith(selectorStart)) return;
		const media = rule.parent;
		if (
			!isAtRule(media) ||
			media.name !== "media" ||
			media.params !== TOUCH_TARGET_MEDIA_PARAMS
		) {
			return;
		}
		let layered = false;
		for (
			let node: PostcssNode["parent"] = media.parent;
			node;
			node = node.parent
		) {
			if (isAtRule(node) && node.name === "layer") {
				layered = node.params === "base";
				break;
			}
		}
		if (!layered) return;
		const declarations: Array<readonly [string, string]> = [];
		rule.walkDecls((decl) => {
			declarations.push([decl.prop, decl.value]);
		});
		found.push({ selector: rule.selector, declarations });
	});
	return found;
}

describe("B2 / D-08: touch-target rule layering", () => {
	it(
		"D-08: the compiled globals.css has no unlayered element touch-target rule",
		async () => {
			const { compiledCss } = await projectEngine();
			const violations = findUnlayeredTouchTargetRules(compiledCss);
			expect(
				violations,
				[
					"Unlayered rule(s) target button/input/select/textarea/[role=button]. An unlayered rule outranks every Tailwind layer, so it overrides the component's own utilities (B2). Move it into @layer base:",
					...violations,
				].join("\n"),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"D-08: the touch-target floor is layered, scoped below 48rem and sets no padding",
		async () => {
			const engine = await projectEngine();
			const buttons = layeredTouchTargetRules(engine, ":where(button:not(");
			const inputs = layeredTouchTargetRules(engine, ":where(input:not(");
			expect(
				buttons,
				`no @layer base > @media ${TOUCH_TARGET_MEDIA_PARAMS} > :where(button:not(…)) rule in the compiled CSS`,
			).toHaveLength(1);
			expect(
				inputs,
				`no @layer base > @media ${TOUCH_TARGET_MEDIA_PARAMS} > :where(input:not(…)) rule in the compiled CSS`,
			).toHaveLength(1);
			expect(buttons[0]?.declarations).toEqual([
				["min-height", "var(--touch-target-min)"],
				["min-width", "var(--touch-target-min)"],
			]);
			expect(inputs[0]?.declarations).toEqual([
				["min-height", "var(--touch-target-min)"],
			]);
			for (const rule of [...buttons, ...inputs]) {
				expect(
					rule.declarations.some(([prop]) => prop.startsWith("padding")),
					`${rule.selector} sets padding`,
				).toBe(false);
			}
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"D-08: flags both selector lists of the pre-phase unlayered block (negative control)",
		async () => {
			const expected = [
				'.btn, button, [role="button"]',
				".form-input, input, select, textarea",
			];
			expect(
				findUnlayeredTouchTargetRules(BASELINE_UNLAYERED_TOUCH_BLOCK),
			).toEqual(expected);
			const { compiledCss } = await loadFixtureEngine(
				BASELINE_UNLAYERED_TOUCH_BLOCK,
			);
			expect(findUnlayeredTouchTargetRules(compiledCss)).toEqual(expected);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"D-08: accepts the same rules once they sit in @layer base (layering control)",
		async () => {
			expect(findUnlayeredTouchTargetRules(LAYERED_TOUCH_RULES)).toEqual([]);
			const { compiledCss } = await loadFixtureEngine(LAYERED_TOUCH_RULES);
			expect(findUnlayeredTouchTargetRules(compiledCss)).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);
});

/**
 * G4 (D-11, D-17). The B4 label/fill/separator family was declared only in the
 * light @theme block, so every consumer kept its light value in dark mode (the
 * Renew Lease dialog measured 1.01:1). A used theme color token needs a dark
 * value, or its consumers move to a semantic token; MODE_INDEPENDENT_TOKENS
 * (white, black, chart-1..5) is the only exemption.
 *
 * H4. The resolver follows `var()` alias chains through @theme, @theme inline
 * and :root to a dark-scope declaration, so the same check holds on the
 * current structure (a dark override of the theme token) and on the inline
 * structure (`--color-x: var(--x)` with `--x` redefined under .dark), where a
 * utility compiles to `var(--x)` rather than to the theme token. F3/F4 prove
 * the inline structure in both directions.
 */
describe("G4 used theme color tokens have a dark value (B4 class)", () => {
	const F1_LIGHT_ONLY = "@theme { --color-q: oklch(0 0 0 / 50%); }";
	const F2_WITH_DARK =
		"@theme { --color-q: oklch(0.5 0 0); } @layer base { :where(.dark, .dark *) { --color-q: oklch(0.9 0 0); } }";
	const F3_INLINE_WITH_DARK =
		":root { --q: oklch(0.5 0 0); } .dark { --q: oklch(0.9 0 0); } @theme inline { --color-q: var(--q); }";
	const F4_INLINE_LIGHT_ONLY =
		":root { --q: oklch(0 0 0 / 50%); } @theme inline { --color-q: var(--q); }";
	const F7_MODE_INDEPENDENT =
		"@theme { --color-chart-1: oklch(0.63 0.22 259); --color-white: oklch(1 0 0); }";
	const F8_CYCLE =
		"@theme inline { --color-a: var(--color-b); --color-b: var(--color-a); }";

	function projectSourceRefs(): Set<string> {
		return collectSourceCustomPropertyRefs(resolve(REPO_ROOT, "src"));
	}

	it(
		"finds theme color tokens, a dark scope and used tokens to check",
		async () => {
			const engine = await projectEngine();
			const contexts = collectCustomPropertiesByContext(engine.css);
			const themeColorKeys = [...contexts.theme.keys()].filter((key) =>
				key.startsWith("--color-"),
			);
			// Non-vacuity floor. The real file holds 59 theme color tokens after
			// 66.2-07, 44 once 66.2-13 drops the Tailwind-default copies (white,
			// black, slate) and the dead ones, and 37 once 66.2-31 deletes the 7
			// zinc sidebar mappings. The floor sits below every planned count, so
			// no deletion plan has to lower it again.
			expect(
				themeColorKeys.length,
				"G4 found too few theme color tokens in globals.css: the context walk is vacuous",
			).toBeGreaterThanOrEqual(30);
			expect(
				contexts.dark.size,
				"G4 found too few dark-scope declarations in globals.css: the dark resolver is vacuous",
			).toBeGreaterThanOrEqual(30);
			expect(
				checkLightOnlyColorTokens(
					engine.css,
					engine.compiledCss,
					projectSourceRefs(),
				).checked,
				"G4 checked too few used theme color tokens: the usage scan is vacuous",
			).toBeGreaterThanOrEqual(25);
			const chain = resolveCustomPropertyChain("--color-background", contexts);
			expect(
				chain.some((name) => contexts.dark.has(name)),
				`--color-background does not reach a dark-scope declaration (chain ${chain.join(" -> ")})`,
			).toBe(true);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"every used theme color token has a dark value",
		async () => {
			const engine = await projectEngine();
			const { violations } = checkLightOnlyColorTokens(
				engine.css,
				engine.compiledCss,
				projectSourceRefs(),
			);
			expect(
				violations,
				[
					"Light-only color token(s) in globals.css (B4 class, D-11):",
					...violations,
				].join("\n"),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"F1: flags a used token declared only in a legacy @theme block",
		async () => {
			const engine = await loadFixtureEngine(F1_LIGHT_ONLY);
			const { checked, violations } = checkLightOnlyColorTokens(
				engine.css,
				engine.compiler.build(["bg-q"]),
				new Set(),
			);
			expect(checked).toBe(1);
			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("--color-q");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"F2: accepts a legacy token with a :where(.dark, .dark *) value",
		async () => {
			const engine = await loadFixtureEngine(F2_WITH_DARK);
			const result = checkLightOnlyColorTokens(
				engine.css,
				engine.compiler.build(["bg-q"]),
				new Set(),
			);
			expect(result.violations).toEqual([]);
			expect(result.checked).toBe(1);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"F3: accepts an inline-structure token whose alias has a .dark value (H4)",
		async () => {
			const engine = await loadFixtureEngine(F3_INLINE_WITH_DARK);
			const compiledCss = engine.compiler.build(["bg-q"]);
			expect(compiledCss).toContain("var(--q)");
			expect(compiledCss).not.toContain("var(--color-q)");
			const result = checkLightOnlyColorTokens(
				engine.css,
				compiledCss,
				new Set(),
			);
			expect(result.violations).toEqual([]);
			expect(result.checked).toBe(1);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"F4: flags an inline-structure token with no dark value (H4)",
		async () => {
			const engine = await loadFixtureEngine(F4_INLINE_LIGHT_ONLY);
			const { violations } = checkLightOnlyColorTokens(
				engine.css,
				engine.compiler.build(["bg-q"]),
				new Set(),
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("--color-q");
			expect(violations[0]).toContain("--color-q -> --q");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"F5: skips a light-only token that nothing uses",
		async () => {
			const engine = await loadFixtureEngine(F1_LIGHT_ONLY);
			const result = checkLightOnlyColorTokens(
				engine.css,
				engine.compiler.build([]),
				new Set(),
			);
			expect(result.violations).toEqual([]);
			expect(result.checked).toBe(0);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"F6: flags a light-only token used only from source text",
		async () => {
			const engine = await loadFixtureEngine(F1_LIGHT_ONLY);
			const sourceRefs = extractCustomPropertyRefs(
				'<div style={{ borderColor: "var(--color-q)" }} />',
			);
			expect([...sourceRefs]).toEqual(["--color-q"]);
			const { violations } = checkLightOnlyColorTokens(
				engine.css,
				engine.compiler.build([]),
				sourceRefs,
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]).toContain("--color-q");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"F7: exempts the mode-independent tokens",
		async () => {
			const engine = await loadFixtureEngine(F7_MODE_INDEPENDENT);
			const compiledCss = engine.compiler.build(["bg-chart-1", "bg-white"]);
			expect(compiledCss).toContain("var(--color-chart-1)");
			expect(compiledCss).toContain("var(--color-white)");
			const result = checkLightOnlyColorTokens(
				engine.css,
				compiledCss,
				new Set(),
			);
			expect(result.violations).toEqual([]);
			expect(result.checked).toBe(0);
		},
		ENGINE_TIMEOUT_MS,
	);

	it("F8: stops at an alias cycle and reports both tokens", () => {
		const contexts = collectCustomPropertiesByContext(F8_CYCLE);
		expect(resolveCustomPropertyChain("--color-a", contexts)).toEqual([
			"--color-a",
			"--color-b",
		]);
		const { violations } = checkLightOnlyColorTokens(
			F8_CYCLE,
			"",
			new Set(["--color-a"]),
		);
		expect(violations).toHaveLength(2);
	});
});

// D-23 / X4 / UIC-05 structure pin (66.2-16). Theme color tokens are inline
// aliases (`@theme inline { --color-<name>: var(--<name>) }`) of raw tokens in
// the unlayered `:root` and plain `.dark` rules, the structure the shadcn CLI
// and registry cssVars write into. Fixtures use the names --color-q, --q and
// --z only.
describe("Inline color token structure (D-23, X4)", () => {
	const DARK_VARIANT = "@custom-variant dark (&:where(.dark, .dark *));";
	const S7_CONFORMING =
		":root { --q: oklch(0.5 0 0); } .dark { --q: oklch(0.9 0 0); } @theme inline { --color-q: var(--q); }";
	const S1_LITERAL = `${DARK_VARIANT} @theme { --color-q: oklch(0.5 0 0); }`;
	const S2_SUFFIX_MISMATCH = `${DARK_VARIANT} :root { --z: oklch(0.5 0 0); } @theme inline { --color-q: var(--z); }`;
	const S3_UNDECLARED = `${DARK_VARIANT} @theme inline { --color-q: var(--q); }`;
	const S4_LAYERED_ROOT = `${DARK_VARIANT} @layer base { :root { --q: oklch(0.5 0 0); } } @theme inline { --color-q: var(--q); }`;
	const S5_LAYERED_DARK = `${DARK_VARIANT} ${S7_CONFORMING.replace(
		".dark { --q: oklch(0.9 0 0); }",
		"@layer base { .dark { --q: oklch(0.9 0 0); } }",
	)}`;
	const S6_WHERE_DARK = `${DARK_VARIANT} ${S7_CONFORMING.replace(
		".dark {",
		":where(.dark, .dark *) {",
	)}`;
	const S7 = `${DARK_VARIANT} ${S7_CONFORMING}`;
	const S8_NO_VARIANT = S7_CONFORMING;

	it("globals.css: every theme color token is an inline alias of an unlayered :root/.dark token", () => {
		const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
		const themeColorKeys = [
			...collectCustomPropertiesByContext(css).theme.keys(),
		].filter((key) => key.startsWith("--color-"));
		const result = checkInlineColorTokenStructure(css);
		expect(
			result.violations,
			`theme color structure violations (D-23/X4):\n${result.violations.join("\n")}`,
		).toEqual([]);
		expect(result.checked).toBe(themeColorKeys.length);
	});

	it("S1: flags a literal --color-* in a non-inline @theme", () => {
		const { violations } = checkInlineColorTokenStructure(S1_LITERAL);
		expect(violations).toHaveLength(1);
		expect(violations[0]).toContain("--color-q");
	});

	it("S2: flags an alias whose raw name does not match its suffix", () => {
		expect(
			checkInlineColorTokenStructure(S2_SUFFIX_MISMATCH).violations,
		).toHaveLength(1);
	});

	it("S3: flags an alias whose raw name is never declared", () => {
		expect(
			checkInlineColorTokenStructure(S3_UNDECLARED).violations,
		).toHaveLength(1);
	});

	it("S4: flags a raw token declared only in a layered :root", () => {
		expect(
			checkInlineColorTokenStructure(S4_LAYERED_ROOT).violations,
		).toHaveLength(1);
	});

	it("S5: flags a dark value declared in a layered .dark rule", () => {
		expect(
			checkInlineColorTokenStructure(S5_LAYERED_DARK).violations,
		).toHaveLength(1);
	});

	it("S6: flags a dark value under a non-plain dark selector", () => {
		expect(
			checkInlineColorTokenStructure(S6_WHERE_DARK).violations,
		).toHaveLength(1);
	});

	it("S7: passes the conforming structure", () => {
		expect(checkInlineColorTokenStructure(S7)).toEqual({
			checked: 1,
			violations: [],
		});
	});

	it("S8: flags a missing dark custom variant", () => {
		expect(
			checkInlineColorTokenStructure(S8_NO_VARIANT).violations,
		).toHaveLength(1);
	});
});

// D-37 / D-51 / UIC-08 sidebar token pin (66.2-31; UI-SPEC T-2 and T-3). The
// sidebar surface tokens alias the brand semantic tokens in one unlayered
// top-level `:root` rule, so they follow the 66.2-16 light and dark values with
// no dark rule of their own; the registry's zinc cssVars are never adopted
// (D-45). The same rule holds the three widths: the desktop rail, the mobile
// sheet and the unused icon mode.
describe("Sidebar tokens (D-37, D-51)", () => {
	const BRAND_ALIASES: Readonly<Record<string, string>> = {
		"--sidebar": "var(--card)",
		"--sidebar-foreground": "var(--card-foreground)",
		"--sidebar-primary": "var(--primary)",
		"--sidebar-primary-foreground": "var(--primary-foreground)",
		"--sidebar-accent": "var(--muted)",
		"--sidebar-accent-foreground": "var(--foreground)",
		"--sidebar-border": "var(--border)",
		"--sidebar-ring": "var(--ring)",
	};
	const WIDTH_TOKENS: Readonly<Record<string, string>> = {
		"--sidebar-width": "14rem",
		"--sidebar-width-mobile": "18rem",
		"--sidebar-width-icon": "3rem",
	};
	const FIX =
		"declare the brand alias or width once in the top-level :root sidebar rule (D-37, D-51)";

	interface SidebarDeclaration {
		readonly prop: string;
		readonly value: string;
		readonly selector: string;
		readonly topLevelRoot: boolean;
	}

	function sidebarDeclarations(css: string): SidebarDeclaration[] {
		const found: SidebarDeclaration[] = [];
		parseCss(css).walkDecls((decl) => {
			if (!decl.prop.startsWith("--sidebar")) return;
			const parent = decl.parent;
			let selector = "";
			let topLevelRoot = false;
			if (isRule(parent)) {
				selector = parent.selector.trim();
				topLevelRoot = selector === ":root" && parent.parent?.type === "root";
			} else if (isAtRule(parent)) {
				selector = `@${parent.name}`;
			}
			found.push({
				prop: decl.prop,
				value: decl.value.trim(),
				selector,
				topLevelRoot,
			});
		});
		return found;
	}

	function aliasTarget(prop: string): string {
		const value = BRAND_ALIASES[prop];
		const target =
			value === undefined ? undefined : /^var\((--[\w-]+)\)$/.exec(value)?.[1];
		if (target === undefined) {
			throw new Error(`${prop} has no brand alias in BRAND_ALIASES`);
		}
		return target;
	}

	function expectSingleTopLevelRoot(
		declarations: readonly SidebarDeclaration[],
		expected: Readonly<Record<string, string>>,
	): void {
		for (const [prop, value] of Object.entries(expected)) {
			const matches = declarations.filter((decl) => decl.prop === prop);
			expect(
				matches.map((decl) => [decl.selector, decl.value]),
				`${prop} is declared ${matches.length} times; ${FIX}`,
			).toHaveLength(1);
			expect(matches[0]?.value, `${prop} value; ${FIX}`).toBe(value);
			expect(
				matches[0]?.topLevelRoot,
				`${prop} sits in "${matches[0]?.selector}", not the top-level :root; ${FIX}`,
			).toBe(true);
		}
	}

	it("declares the eight brand aliases once each in the top-level :root rule (D-37)", () => {
		const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
		expectSingleTopLevelRoot(sidebarDeclarations(css), BRAND_ALIASES);
	});

	it("declares the three width tokens once each in the top-level :root rule (D-37, D-51)", () => {
		const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
		expectSingleTopLevelRoot(sidebarDeclarations(css), WIDTH_TOKENS);
	});

	it("declares no other sidebar custom property (D-51)", () => {
		const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
		const declarations = sidebarDeclarations(css);
		const expected = [
			...Object.keys(BRAND_ALIASES),
			...Object.keys(WIDTH_TOKENS),
		].sort();
		expect(
			[...new Set(declarations.map((decl) => decl.prop))].sort(),
			`unexpected sidebar custom properties; ${FIX}`,
		).toEqual(expected);
		expect(
			declarations.length,
			`sidebar custom property declaration count; ${FIX}`,
		).toBe(expected.length);
	});

	it("bridges each alias through the inline theme (D-37)", () => {
		const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
		const bridge: Array<{ prop: string; value: string; inline: boolean }> = [];
		parseCss(css).walkDecls((decl) => {
			if (!decl.prop.startsWith("--color-sidebar")) return;
			let theme: AtRule | undefined;
			for (
				let node: PostcssNode["parent"] = decl.parent;
				node;
				node = node.parent
			) {
				if (isAtRule(node)) {
					theme = node.name === "theme" ? node : undefined;
					break;
				}
			}
			bridge.push({
				prop: decl.prop,
				value: decl.value.trim(),
				inline: theme?.params.trim().split(/\s+/).includes("inline") ?? false,
			});
		});
		expect(bridge.map((entry) => entry.prop)).toHaveLength(8);
		for (const entry of bridge) {
			const suffix = entry.prop.slice("--color-sidebar".length);
			expect(
				entry.value,
				`${entry.prop} must be var(--sidebar${suffix}) (D-37)`,
			).toBe(`var(--sidebar${suffix})`);
			expect(
				entry.inline,
				`${entry.prop} must sit in an @theme inline at-rule (D-37)`,
			).toBe(true);
		}
	});

	it("resolves every bridge entry to a brand token with light and dark values (D-37, G4 chain)", () => {
		const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
		const contexts = collectCustomPropertiesByContext(css);
		for (const prop of Object.keys(BRAND_ALIASES)) {
			const suffix = prop.slice("--sidebar".length);
			const bridgeProp = `--color-sidebar${suffix}`;
			const target = aliasTarget(prop);
			const chain = resolveCustomPropertyChain(bridgeProp, contexts);
			expect(
				chain.at(-1),
				`${bridgeProp} resolves through ${chain.join(" -> ")}; ${FIX}`,
			).toBe(target);
			expect(
				contexts.root.has(target),
				`${target} has no :root value (D-37)`,
			).toBe(true);
			expect(
				contexts.dark.has(target),
				`${target} has no .dark value (D-37)`,
			).toBe(true);
		}
	});

	it(
		"keeps the lg breakpoint equal to the use-mobile query width (D-33)",
		async () => {
			const { designSystem } = await projectEngine();
			const breakpoint = designSystem.resolveThemeValue("--breakpoint-lg");
			expect(
				breakpoint,
				"--breakpoint-lg drifted; change MOBILE_MEDIA_QUERY in src/hooks/use-mobile.ts with it (D-33)",
			).toBe("64rem");
			expect(MOBILE_MEDIA_QUERY).toBe(`(width < ${breakpoint})`);
		},
		ENGINE_TIMEOUT_MS,
	);
});

describe("G3 — no @utility name shadows a core or theme utility", () => {
	const FIXTURE_STATIC_CORE_SHADOW = "@utility flex { display: grid; }";
	const FIXTURE_THEME_KEY_SHADOW =
		"@theme { --text-caption: 0.6875rem; } @utility text-caption { font-size: 1px; }";
	const FIXTURE_UNIQUE_NAMES =
		"@utility tf-probe-unique { display: grid; } @utility tf-probe-* { width: --value(integer); }";

	it(
		"collects at least one non-functional @utility name from globals.css",
		async () => {
			const { css } = await projectEngine();
			const { checked } = await checkUtilityShadowing(css, TAILWIND_BASE);
			expect(
				checked,
				"G3 found no non-functional @utility in globals.css: the check is vacuous",
			).toBeGreaterThanOrEqual(1);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"finds no @utility name that is also a core or theme utility",
		async () => {
			const { css } = await projectEngine();
			const { violations } = await checkUtilityShadowing(css, TAILWIND_BASE);
			expect(
				violations,
				[
					"@utility name(s) shadow a Tailwind core/theme utility; both rules apply and the custom one silently wins or merges (B8: text-caption with the /75 modifier became line-height 18.75rem). Rename the utility or delete it and use the core class:",
					...violations,
				].join("\n"),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"A: flags an @utility that shadows a static core utility",
		async () => {
			const { checked, violations } = await checkUtilityShadowing(
				fixtureCss(FIXTURE_STATIC_CORE_SHADOW),
				TAILWIND_BASE,
			);
			expect(checked).toBe(1);
			expect(violations).toEqual(["flex"]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"B: flags an @utility that shadows a theme font-size key (the B8 defect)",
		async () => {
			const { checked, violations } = await checkUtilityShadowing(
				fixtureCss(FIXTURE_THEME_KEY_SHADOW),
				TAILWIND_BASE,
			);
			expect(checked).toBe(1);
			expect(violations).toEqual(["text-caption"]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"accepts unique static and functional @utility names",
		async () => {
			const { checked, violations } = await checkUtilityShadowing(
				fixtureCss(FIXTURE_UNIQUE_NAMES),
				TAILWIND_BASE,
			);
			expect(checked).toBe(1);
			expect(violations).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);
});

/**
 * G5 (D-14, D-17). tailwind-merge only knows the theme keys of its default
 * config, so `cn("text-caption", "text-primary")` read the custom font size as
 * a text color and dropped it (B7), and custom leading, spacing and duration
 * keys never merged with their standard group. The expected key list is
 * derived from the real globals.css, so TAILWIND_MERGE_EXTENSION can drift in
 * neither direction.
 */
describe("G5 — tailwind-merge knows every custom theme key (B7, D-14)", () => {
	const FIXTURE_MISSING_KEY = "@theme { --text-g5-fixture: 1rem; }";
	const G5_NAMESPACE_LIST: readonly G5Namespace[] = [
		"text",
		"leading",
		"spacing",
		"transition-duration",
	];

	function keyCount(keys: CustomMergeKeys): number {
		return G5_NAMESPACE_LIST.reduce((total, ns) => total + keys[ns].length, 0);
	}

	it(
		"derives a non-empty key set",
		async () => {
			const keys = deriveCustomMergeKeys((await projectEngine()).css);
			expect(
				keys.text.length,
				"G5 derived no custom --text-* key from globals.css: the walk is vacuous",
			).toBeGreaterThan(0);
			expect(
				keys.leading.length,
				"G5 derived no custom --leading-* key from globals.css: the walk is vacuous",
			).toBeGreaterThan(0);
			expect(
				keys["transition-duration"].length,
				"G5 derived no custom --transition-duration-* key from globals.css: the walk is vacuous",
			).toBeGreaterThan(0);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"every derived class is a real utility",
		async () => {
			const { css, designSystem } = await projectEngine();
			const keys = deriveCustomMergeKeys(css);
			const unresolved: string[] = [];
			for (const ns of G5_NAMESPACE_LIST) {
				for (const key of keys[ns]) {
					const cls = `${G5_NAMESPACES[ns].utility}-${key}`;
					if (designSystem.candidatesToCss([cls])[0] == null) {
						unresolved.push(cls);
					}
				}
			}
			expect(
				unresolved,
				[
					"G5 derived key(s) that Tailwind does not compile to a utility: the derivation reads a declaration that is not a theme key:",
					...unresolved,
				].join("\n"),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"config == derived keys (bidirectional)",
		async () => {
			const derived = deriveCustomMergeKeys((await projectEngine()).css);
			const drift = findMergeConfigDrift(
				derived,
				extensionKeys(TAILWIND_MERGE_EXTENSION),
			);
			expect(
				drift,
				[
					"TAILWIND_MERGE_EXTENSION in src/lib/utils.ts is out of sync with the @theme keys in globals.css. For a missing key, add the key to TAILWIND_MERGE_EXTENSION in src/lib/utils.ts; for a stale key, remove the stale key:",
					...drift,
				].join("\n"),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"project cn merges every custom key",
		async () => {
			const { css } = await projectEngine();
			const failures = findMergeFailures(deriveCustomMergeKeys(css), cn);
			expect(
				failures,
				[
					"The project cn mis-merges custom theme key(s) (B7): it drops a font size next to a text color or keeps two classes of one group. Add the key to TAILWIND_MERGE_EXTENSION in src/lib/utils.ts:",
					...failures,
				].join("\n"),
			).toEqual([]);
			expect(
				checkMergeKeys(css, TAILWIND_MERGE_EXTENSION, cn).violations,
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"baseline cn fails (negative control: vanilla twMerge, no extension)",
		async () => {
			const { css } = await projectEngine();
			const keys = deriveCustomMergeKeys(css);
			const result = checkMergeKeys(css, undefined, twMerge);
			expect(result.checked).toBe(keyCount(keys));
			expect(result.violations).toHaveLength(
				2 * keys.text.length +
					keys.leading.length +
					keys.spacing.length +
					keys["transition-duration"].length,
			);
			expect(result.violations).toContain(
				"text-caption dropped next to text-primary",
			);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"missing key: a fixture @theme key absent from the config is reported",
		async () => {
			const engine = await loadFixtureEngine(FIXTURE_MISSING_KEY);
			expect(
				engine.designSystem.candidatesToCss(["text-g5-fixture"])[0],
			).not.toBeNull();
			const drift = findMergeConfigDrift(
				deriveCustomMergeKeys(engine.css),
				extensionKeys(TAILWIND_MERGE_EXTENSION),
			);
			expect(drift).toContain("missing text: g5-fixture");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"stale key: a config key absent from globals.css is reported",
		async () => {
			const derived = deriveCustomMergeKeys((await projectEngine()).css);
			const configured = extensionKeys(TAILWIND_MERGE_EXTENSION);
			expect(
				findMergeConfigDrift(derived, {
					...configured,
					text: [...configured.text, "g5-stale"],
				}),
			).toEqual(["stale text: g5-stale"]);
		},
		ENGINE_TIMEOUT_MS,
	);
});

describe("G7 — every theme-namespace var() reference resolves in the compiled theme", () => {
	const NO_RUNTIME: G7RuntimeVars = {
		inlineStyle: new Set(),
		chartConfig: new Set(),
		fonts: new Set(),
	};
	const GLOBALS_WITH_TOKEN: G7SourceText = {
		path: "src/app/globals.css",
		text: "@theme { --color-tok: oklch(0.5 0.1 200); } .x { color: var(--color-tok); }",
	};

	function projectSources(): G7SourceText[] {
		return collectG7SourceTexts(REPO_ROOT);
	}

	async function emptyCompiledCss(): Promise<string> {
		return (await loadFixtureEngine("")).compiledCss;
	}

	/** Theme-namespace names an empty fixture build already references (preflight). */
	async function emptyBuildChecked(): Promise<number> {
		return checkG7DanglingThemeVars(await emptyCompiledCss(), [], NO_RUNTIME)
			.checked;
	}

	it(
		"reads the shipped sources, compiled references and every runtime source",
		async () => {
			const sources = projectSources();
			expect(
				sources.length,
				"G7 collected too few source texts: the src/ walk is vacuous",
			).toBeGreaterThan(100);
			expect(sources.map((source) => source.path)).toContain(
				"src/app/globals.css",
			);
			expect(
				sources.some(
					(source) =>
						source.path.includes("__tests__/") ||
						/\.test\.(ts|tsx)$/.test(source.path) ||
						source.path.startsWith("src/test/"),
				),
				"G7 collected a test file or the test harness",
			).toBe(false);
			const compiled = checkG7DanglingThemeVars(
				(await projectEngine()).compiledCss,
				[],
				NO_RUNTIME,
			);
			expect(
				compiled.checked,
				"G7 found no theme-namespace var() reference in the compiled CSS",
			).toBeGreaterThan(0);
			const runtime = deriveG7RuntimeVars(sources, REPO_ROOT);
			expect(runtime.inlineStyle.size).toBeGreaterThanOrEqual(1);
			expect(runtime.chartConfig.size).toBeGreaterThanOrEqual(1);
			expect(runtime.fonts.size).toBeGreaterThanOrEqual(1);
			expect(runtime.fonts).toContain("--font-geist-mono");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"finds no dangling theme-namespace variable on the real tree",
		async () => {
			const sources = projectSources();
			const result = checkG7DanglingThemeVars(
				(await projectEngine()).compiledCss,
				sources,
				deriveG7RuntimeVars(sources, REPO_ROOT),
			);
			expect(result.checked).toBeGreaterThan(0);
			expect(
				result.violations,
				[
					"Dangling theme variable(s): a var() reference in a theme namespace has no declaration in the compiled CSS. Rewrite the reference to a defined token, or restore the token if it is not a Tailwind default (D-20, G7):",
					...result.violations,
				].join("\n"),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags a compiled reference to an undeclared spacing variable",
		async () => {
			const { compiledCss } = await loadFixtureEngine(
				".g7-probe { margin-top: var(--spacing-99); }",
			);
			const { violations } = checkG7DanglingThemeVars(
				compiledCss,
				[],
				NO_RUNTIME,
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]?.startsWith("--spacing-99 ")).toBe(true);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags an arbitrary-value class over an undeclared color variable",
		async () => {
			const { violations } = checkG7DanglingThemeVars(
				await emptyCompiledCss(),
				[{ path: "src/x.tsx", text: 'className="mt-[var(--color-nope)]"' }],
				NO_RUNTIME,
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]?.startsWith("--color-nope ")).toBe(true);
			expect(violations[0]).toContain("src/x.tsx");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags the variable shorthand class C12d removed",
		async () => {
			const { violations } = checkG7DanglingThemeVars(
				await emptyCompiledCss(),
				[{ path: "src/x.tsx", text: 'className="text-(--font-body)"' }],
				NO_RUNTIME,
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]?.startsWith("--font-body ")).toBe(true);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"accepts a reference to a token the fixture theme declares",
		async () => {
			const { compiledCss } = await loadFixtureEngine(
				"@theme { --color-ok: oklch(0.5 0.1 200); } .g7-ok { color: var(--color-ok); }",
			);
			const result = checkG7DanglingThemeVars(compiledCss, [], NO_RUNTIME);
			expect(result.checked).toBe((await emptyBuildChecked()) + 1);
			expect(result.violations).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"does not read a bare --duration reference as a theme key",
		async () => {
			const result = checkG7DanglingThemeVars(
				await emptyCompiledCss(),
				[
					{
						path: "src/app/globals.css",
						text: "@theme inline { --animate-g7-probe: g7-probe calc(var(--duration) * 1s) linear; }",
					},
				],
				NO_RUNTIME,
			);
			expect(result.checked).toBe(await emptyBuildChecked());
			expect(result.violations).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"still flags an undeclared --duration-* reference",
		async () => {
			const { violations } = checkG7DanglingThemeVars(
				await emptyCompiledCss(),
				[
					{
						path: "src/app/globals.css",
						text: "@theme inline { --animate-g7-probe: g7-probe var(--duration-fast) linear; }",
					},
				],
				NO_RUNTIME,
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]?.startsWith("--duration-fast ")).toBe(true);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"exempts a variable an inline style sets at run time",
		async () => {
			const sources: G7SourceText[] = [
				{
					path: "src/x.tsx",
					text: 'style={{ "--color-from": x }} className="bg-[var(--color-from)]"',
				},
			];
			const runtime = deriveG7RuntimeVars(sources, REPO_ROOT);
			expect(runtime.inlineStyle).toContain("--color-from");
			expect(
				checkG7DanglingThemeVars(await emptyCompiledCss(), sources, runtime)
					.violations,
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"exempts a chart config color",
		async () => {
			const sources: G7SourceText[] = [
				{
					path: "src/c.tsx",
					text: 'const c = { revenue: { label: "R" } } satisfies ChartConfig; const f = "var(--color-revenue)";',
				},
			];
			const runtime = deriveG7RuntimeVars(sources, REPO_ROOT);
			expect(runtime.chartConfig).toContain("--color-revenue");
			expect(
				checkG7DanglingThemeVars(await emptyCompiledCss(), sources, runtime)
					.violations,
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"ignores variables outside the theme namespaces",
		async () => {
			const result = checkG7DanglingThemeVars(
				await emptyCompiledCss(),
				[
					{
						path: "src/x.tsx",
						text: 'w-[var(--radix-popover-trigger-width)] "var(--tw-shadow)"',
					},
				],
				NO_RUNTIME,
			);
			expect(result.checked).toBe(await emptyBuildChecked());
			expect(result.violations).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"skips an interpolated name instead of reading a shorter one",
		async () => {
			const result = checkG7DanglingThemeVars(
				await emptyCompiledCss(),
				[
					{
						path: "src/x.tsx",
						text: "`var(--color-${key})` `fill-(--color-${key})`",
					},
				],
				NO_RUNTIME,
			);
			expect(result.checked).toBe(await emptyBuildChecked());
			expect(result.violations).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it("derives a geist font variable from the installed geist package", () => {
		const runtime = deriveG7RuntimeVars(
			[
				{
					path: "src/f.ts",
					text: 'import { GeistMono } from "geist/font/mono";',
				},
			],
			REPO_ROOT,
		);
		expect(runtime.fonts).toContain("--font-geist-mono");
		expect(
			deriveG7RuntimeVars(
				[{ path: "src/f.ts", text: 'const x = { variable: "--font-x" };' }],
				REPO_ROOT,
			).fonts.size,
			"a variable outside a next/font source is not a font variable",
		).toBe(0);
	});

	it(
		"keeps a theme token an inline style overrides locally under guard",
		async () => {
			const sources: G7SourceText[] = [
				GLOBALS_WITH_TOKEN,
				{ path: "src/x.tsx", text: 'style={{ "--color-tok": v }}' },
			];
			const runtime = deriveG7RuntimeVars(sources, REPO_ROOT);
			expect(runtime.inlineStyle.has("--color-tok")).toBe(false);
			const { compiledCss } = await loadFixtureEngine(
				".g7-tok { color: var(--color-tok); }",
			);
			const { violations } = checkG7DanglingThemeVars(compiledCss, [], runtime);
			expect(violations).toHaveLength(1);
			expect(violations[0]?.startsWith("--color-tok ")).toBe(true);
		},
		ENGINE_TIMEOUT_MS,
	);

	it("keeps a theme token a chart config key shares under guard", () => {
		const runtime = deriveG7RuntimeVars(
			[
				GLOBALS_WITH_TOKEN,
				{
					path: "src/c.tsx",
					text: 'const c = { tok: { label: "T" }, extra: { label: "E" } } satisfies ChartConfig;',
				},
			],
			REPO_ROOT,
		);
		expect(runtime.chartConfig.has("--color-tok")).toBe(false);
		expect(runtime.chartConfig).toContain("--color-extra");
	});
});

describe("G8 every first-party class is canonical (D-25, PLAN.md §4.4 class)", () => {
	let firstPartyScanPromise:
		| Promise<{
				engine: TailwindEngine;
				candidates: string[];
				files: string[];
		  }>
		| undefined;

	function firstPartyScan() {
		if (firstPartyScanPromise === undefined) {
			firstPartyScanPromise = projectEngine().then((engine) => {
				const { candidates, files } = scanSources(
					firstPartyScanSources(engine.sources, REPO_ROOT),
				);
				return { engine, candidates, files };
			});
		}
		return firstPartyScanPromise;
	}

	it("scans first-party source only, and enough of it that a clean result means something", async () => {
		const { engine, candidates, files } = await firstPartyScan();
		const relative = files.map((f) =>
			f.slice(REPO_ROOT.length + 1).replaceAll(sep, "/"),
		);
		expect(relative).toContain("src/components/shell/app-shell-header.tsx");
		expect(relative.filter((f) => f.startsWith("src/components/ui/"))).toEqual(
			[],
		);
		expect(relative.filter((f) => /\.test\.tsx?$/.test(f))).toEqual([]);
		const { checked } = checkCanonicalCandidates(
			engine.designSystem,
			candidates,
		);
		expect(checked).toBeGreaterThan(1000);
	}, 30_000);

	it("finds no non-canonical class in first-party code", async () => {
		const { engine, candidates } = await firstPartyScan();
		const { violations } = checkCanonicalCandidates(
			engine.designSystem,
			candidates,
		);
		expect(
			violations,
			`Non-canonical Tailwind class(es) in first-party code (src/ outside src/components/ui/). Write the canonical form, or run \`node .planning/tailwind-shadcn/audit/canonicalize.mjs --write\` (after W3 only, N10):\n${violations.join("\n")}`,
		).toEqual([]);
	}, 30_000);

	it("flags each deprecated form with its canonical replacement", async () => {
		const { designSystem } = await loadFixtureEngine("");
		const result = checkCanonicalCandidates(designSystem, [
			"flex-shrink-0",
			"bg-gradient-to-r",
			"!font-bold",
			"data-[open]:flex",
			"[grid-column:1/-1]",
		]);
		expect(result.checked).toBe(5);
		expect(result.violations).toEqual([
			"!font-bold -> font-bold!",
			"[grid-column:1/-1] -> col-span-full",
			"bg-gradient-to-r -> bg-linear-to-r",
			"data-[open]:flex -> data-open:flex",
			"flex-shrink-0 -> shrink-0",
		]);
	}, 30_000);

	it("maps a px value that equals a spacing step at the 16px root", async () => {
		const { designSystem } = await loadFixtureEngine("");
		expect(
			checkCanonicalCandidates(designSystem, ["w-[130px]"]).violations,
		).toEqual(["w-[130px] -> w-32.5"]);
	}, 30_000);

	it("does not collapse two classes into a shorthand", async () => {
		const { designSystem } = await loadFixtureEngine("");
		expect(
			checkCanonicalCandidates(designSystem, ["w-4", "h-4"]).violations,
		).toEqual([]);
	}, 30_000);

	it("accepts the canonical forms", async () => {
		const { designSystem } = await loadFixtureEngine("");
		const result = checkCanonicalCandidates(designSystem, [
			"shrink-0",
			"bg-linear-to-r",
			"font-bold!",
			"data-open:flex",
			"col-span-full",
			"w-32.5",
		]);
		expect(result.checked).toBe(6);
		expect(result.violations).toEqual([]);
	}, 30_000);

	it("skips a token the design system does not compile", async () => {
		const { designSystem } = await loadFixtureEngine("");
		const result = checkCanonicalCandidates(designSystem, ["not-a-class-xyz"]);
		expect(result.checked).toBe(0);
		expect(result.violations).toEqual([]);
	}, 30_000);

	// 66.2-39: the canonicalizer keeps `translate-y-[-50%]` and `h-[40%]`, so
	// G8 also asks whether a fraction utility spells the same percentage.
	it("finds no arbitrary percentage a fraction utility spells", async () => {
		const { engine, candidates } = await firstPartyScan();
		const result = checkFractionEquivalents(engine.designSystem, candidates);
		expect(result.checked).toBeGreaterThan(5);
		expect(
			result.violations,
			`Arbitrary percentage(s) with a fraction utility. Write the fraction:\n${result.violations.join("\n")}`,
		).toEqual([]);
	}, 30_000);

	it("reports a percentage that is a fraction and keeps one that is not", async () => {
		const { designSystem } = await loadFixtureEngine("");
		const result = checkFractionEquivalents(designSystem, [
			"translate-y-[-50%]",
			"md:h-[40%]",
			"-top-[25%]",
			"h-[35%]",
			"w-[100%]",
		]);
		expect(result.violations).toEqual([
			"-top-[25%] -> -top-1/4",
			"md:h-[40%] -> md:h-2/5",
			"translate-y-[-50%] -> -translate-y-1/2",
		]);
		expect(result.checked).toBe(5);
	}, 30_000);
});

/**
 * G9 (66.2-39): every token of a first-party class string compiles to CSS. The
 * cycle-1 review found classes that render nothing: an undefined custom name
 * (`input`, `form-container`), an undefined token (`text-error-main`,
 * `bg-chart-7`, `bg-overlay`), and a utility size v4 does not have
 * (`hover:shadow-3xl`, `blur-0`). The hook names below are the only no-CSS
 * tokens a class string may carry, each read by something other than Tailwind.
 * Run against 1294dc80f's tracked sources (before 66.2-39 part B) the check
 * reports 18 violations in 10 files.
 */
describe("G9 every first-party class string token emits CSS (66.2-39)", () => {
	/**
	 * group/peer markers, the typography plugin's opt-out, a page-local print
	 * rule, a button-group selector, and the theme scope class that the
	 * `globals.css` `.dark` rule keys the dark token values on (next-themes sets
	 * it on <html>; the image-upload overlay sets it on its always-dark scrim).
	 */
	const HOOK_NAMES = new Set([
		"group",
		"peer",
		"not-prose",
		"page-break",
		"select-trigger",
		"dark",
	]);
	const isHook = (token: string) =>
		HOOK_NAMES.has(token) || /^(group|peer)\/[\w-]+$/.test(token);

	it(
		"finds no token that compiles to nothing in a shipped class string",
		async () => {
			const { designSystem } = await projectEngine();
			const result = checkDeadClassTokens(
				designSystem,
				collectG7SourceTexts(REPO_ROOT),
				isHook,
			);
			expect(result.checked).toBeGreaterThan(10_000);
			expect(
				result.violations,
				`Class-string token(s) that emit no CSS. Use a defined utility or token, or delete the class:\n${result.violations.join("\n")}`,
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it("reports a dead token in a className value and in a multi-class string", async () => {
		const { designSystem } = await loadFixtureEngine("");
		const result = checkDeadClassTokens(
			designSystem,
			[
				{ path: "src/a.tsx", text: '<i className="g9-dead" />' },
				{ path: "src/b.ts", text: 'const x = cn("flex px-4 g9-gone", y);' },
				{
					path: "src/c.tsx",
					text: '<p className={`flex ${on ? "g9-on" : "px-4"}`} />',
				},
			],
			() => false,
		);
		expect(result.violations).toEqual([
			"src/a.tsx: g9-dead",
			"src/b.ts: g9-gone",
			"src/c.tsx: g9-on",
		]);
	}, 30_000);

	it("skips prose, comparison operands, comments, hook names and non-ts sources", async () => {
		const { designSystem } = await loadFixtureEngine("");
		const result = checkDeadClassTokens(
			designSystem,
			[
				{ path: "src/a.ts", text: 'const msg = "Save the lease and close";' },
				{
					path: "src/b.tsx",
					text: '<p className={`flex ${s === "g9-state" ? "px-4" : ""}`} />',
				},
				{ path: "src/c.ts", text: '// "flex px-4 g9-comment"\nconst a = 1;' },
				{ path: "src/d.tsx", text: '<div className="group px-4" />' },
				{ path: "src/e.css", text: '.x { content: "flex px-4 g9-css"; }' },
			],
			(token) => token === "group",
		);
		expect(result.violations).toEqual([]);
		expect(result.checked).toBeGreaterThan(0);
	}, 30_000);
});

/**
 * G10 (66.2-39): status color goes through the token layer. The cycle-1 review
 * found raw palette classes carrying status meaning across settings, billing,
 * maintenance, leases, tenants, properties, reports and analytics, many with a
 * hand-written dark pair and some with none. Run against d0cc141b5 (before
 * 66.2-39 part C) the check reports 374 violations in 44 files, the same set a
 * regex walk of `src/` over every palette family and color utility finds.
 * The scope is every shipped source under `src/` (a superset of `src/app` and
 * `src/components`); test files and the `src/test/` harness do not ship.
 */
describe("G10 no shipped source reaches the default color palette (66.2-39)", () => {
	/**
	 * `<path>` -> hits that may stay. Empty: every palette use found had a token
	 * with the same meaning. An entry needs a reason the token layer cannot
	 * serve (a renderer without CSS variables, a third-party brand color).
	 */
	const PALETTE_EXEMPTIONS: ReadonlyMap<string, readonly string[]> = new Map();
	const isExempt = (path: string, hit: string) =>
		PALETTE_EXEMPTIONS.get(path)?.includes(hit) ?? false;

	it(
		"finds no default-palette color in a shipped source",
		async () => {
			const { designSystem } = await projectEngine();
			const sources = collectG7SourceTexts(REPO_ROOT);
			const result = checkRawPaletteColors(designSystem, sources, isExempt);
			expect(sources.length).toBeGreaterThan(500);
			expect(result.checked).toBeGreaterThan(10_000);
			expect(
				result.violations,
				`Default-palette color(s) in shipped source. Status text uses the AA companions (text-success-text, text-warning-text, text-destructive-text, text-info-text, text-primary-text, text-muted-foreground); tints, fills and borders use the token (bg-success/10, border-warning/30); a chart series uses var(--color-chart-N) or a semantic token:\n${result.violations.join("\n")}`,
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it("reports each utility, variant, modifier and arbitrary form, and a raw variable", async () => {
		const { designSystem } = await loadFixtureEngine("");
		const result = checkRawPaletteColors(
			designSystem,
			[
				{
					path: "src/a.tsx",
					text: '<p className="flex text-emerald-600 dark:text-emerald-400" />',
				},
				{
					path: "src/b.ts",
					text: 'const c = cn("bg-red-500/10", "hover:border-amber-300");',
				},
				{
					path: "src/c.tsx",
					text: '<i className="shadow-sky-500/20 bg-[var(--color-rose-50)] [color:var(--color-stone-600)]" />',
				},
				{
					path: "src/d.ts",
					text: 'const config = {\n\tpaid: { label: "Paid", color: "var(--color-green-600)" },\n};',
				},
			],
			() => false,
		);
		expect(result.violations).toEqual([
			"src/a.tsx:1: dark:text-emerald-400",
			"src/a.tsx:1: text-emerald-600",
			"src/b.ts:1: bg-red-500/10",
			"src/b.ts:1: hover:border-amber-300",
			"src/c.tsx:1: [color:var(--color-stone-600)]",
			"src/c.tsx:1: bg-[var(--color-rose-50)]",
			"src/c.tsx:1: shadow-sky-500/20",
			"src/d.ts:2: --color-green-600",
		]);
	}, 30_000);

	it("passes the token forms and honors an exemption", async () => {
		const { designSystem } = await loadFixtureEngine(
			"@theme inline { --color-success: oklch(0.66 0.2 160); --color-success-text: oklch(0.5 0.15 158); --color-chart-1: oklch(0.63 0.22 259); }",
		);
		const result = checkRawPaletteColors(
			designSystem,
			[
				{
					path: "src/a.tsx",
					text: '<p className="bg-success/10 text-success-text bg-black/75 text-white fill-chart-1" />',
				},
				{
					path: "src/b.ts",
					text: 'const config = { revenue: { color: "var(--color-chart-1)" } };',
				},
				{ path: "src/c.tsx", text: '<p className="text-blue-600" />' },
			],
			(path, hit) => path === "src/c.tsx" && hit === "text-blue-600",
		);
		expect(result.violations).toEqual([]);
		expect(result.checked).toBeGreaterThanOrEqual(6);
	}, 30_000);
});
