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
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AtRule, Node as PostcssNode } from "postcss";
import { describe, expect, it } from "vitest";
import {
	FIXTURE_CSS_PREFIX,
	fixtureCss,
	GLOBALS_CSS_PATH,
	loadFixtureEngine,
	loadProjectTailwindEngine,
	parseCss,
	REPO_ROOT,
	type TailwindEngine,
} from "#test/utils/tailwind-engine";
import {
	checkNonInlineThemeVarRefs,
	checkOklchRange,
	checkSourceGlobs,
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
			const [sans, mono, display] = designSystem.candidatesToCss([
				"font-sans",
				"font-mono",
				"font-display",
			]);
			expect(sans).toContain("var(--font-roboto)");
			expect(mono).toContain("var(--font-geist-mono)");
			expect(display).toContain("var(--font-playfair)");
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
