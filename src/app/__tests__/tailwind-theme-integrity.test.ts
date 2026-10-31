// @vitest-environment node
/**
 * Tailwind theme integrity guards (UIC-03; PLAN.md §6; D-17).
 *
 * This file is the single home of guards G1-G8. Each guard compiles the REAL
 * `src/app/globals.css` with Tailwind's own engine (`#test/utils/tailwind-engine`)
 * instead of reading a regex copy of it, because regex copies (X1/X6) are how
 * the theme defects shipped.
 *
 * ORDER (P4). lefthook runs the whole unit suite on every commit, so a guard
 * can only land in the same commit as its fix: G1-G6 arrive with their fixes
 * in 66.2-04..09, G7 in 66.2-14 and G8 in 66.2-18. No guard is added ahead of
 * its fix. The harness self-tests come first; each guard follows them.
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
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { compile } from "@tailwindcss/node";
import type { AtRule, Node as PostcssNode } from "postcss";
import { twMerge } from "tailwind-merge";
import { describe, expect, it } from "vitest";
import { cn, TAILWIND_MERGE_EXTENSION } from "#lib/utils";
import {
	FIXTURE_CSS_PREFIX,
	fixtureCss,
	GLOBALS_CSS_PATH,
	loadFixtureEngine,
	loadProjectTailwindEngine,
	parseCss,
	REPO_ROOT,
	TAILWIND_BASE,
	type TailwindEngine,
} from "#test/utils/tailwind-engine";
import {
	type CustomMergeKeys,
	checkLightOnlyColorTokens,
	checkMergeKeys,
	checkNonInlineThemeVarRefs,
	checkOklchRange,
	checkSourceGlobs,
	checkSourceRoot,
	checkUtilityShadowing,
	collectCustomPropertiesByContext,
	collectSourceCustomPropertyRefs,
	deriveCustomMergeKeys,
	extensionKeys,
	extractCustomPropertyRefs,
	findMergeConfigDrift,
	findMergeFailures,
	G5_NAMESPACES,
	type G5Namespace,
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
