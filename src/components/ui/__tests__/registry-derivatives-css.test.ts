// @vitest-environment node
/**
 * Regression tests for the vendored magicui derivatives repaired in 66.2-28
 * (C12a, C12b, N1, N3; D-30).
 *
 * The file runs in node, like tailwind-theme-integrity.test.ts (N6): it
 * compiles the real `src/app/globals.css` with Tailwind's own engine through
 * `#test/utils/tailwind-engine`, and compiles small fixtures to prove each
 * check can fail.
 *
 * It lives under the `@source not` rule globals.css applies to test files, so
 * the fixture strings below never reach the compiled CSS.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
	loadFixtureEngine,
	loadProjectTailwindEngine,
	REPO_ROOT,
	type TailwindEngine,
} from "#test/utils/tailwind-engine";

const ENGINE_TIMEOUT_MS = 30_000;

let projectEnginePromise: Promise<TailwindEngine> | undefined;

function projectEngine(): Promise<TailwindEngine> {
	if (projectEnginePromise === undefined) {
		projectEnginePromise = loadProjectTailwindEngine();
	}
	return projectEnginePromise;
}

const BORDER_BEAM_CLASS = "after:animate-border-beam";
const BORDER_BEAM_INLINE_ANIMATION =
	"animation: border-beam calc(var(--duration) * 1s) infinite linear";

/**
 * Checks the CSS Tailwind compiles for `after:animate-border-beam`.
 * `null` means the class compiles to nothing; a `var(--animate-border-beam)`
 * reference means the key sits in a non-inline `@theme`.
 */
function borderBeamAnimationViolations(ruleCss: string | null): string[] {
	if (ruleCss === null) {
		return [
			"C12b: after:animate-border-beam compiles to nothing because --animate-border-beam is missing from the theme",
		];
	}
	if (ruleCss.includes("var(--animate-border-beam)")) {
		return [
			"N3: --animate-border-beam sits in a non-inline @theme, so it resolves at :root, where --duration is unset, and computes animation-name: none",
		];
	}
	if (!ruleCss.includes(BORDER_BEAM_INLINE_ANIMATION)) {
		return [
			`C12b: after:animate-border-beam does not compile to the inline border-beam animation; received: ${ruleCss}`,
		];
	}
	return [];
}

const BORDER_BEAM_DECLARATION =
	"--animate-border-beam: border-beam calc(var(--duration) * 1s) infinite linear;";
const BORDER_BEAM_KEYFRAMES =
	"@keyframes border-beam { 100% { offset-distance: 100%; } }";

const NON_INLINE_THEME_FIXTURE = `@theme { ${BORDER_BEAM_DECLARATION} ${BORDER_BEAM_KEYFRAMES} }`;
const INLINE_THEME_FIXTURE = `@theme inline { ${BORDER_BEAM_DECLARATION} ${BORDER_BEAM_KEYFRAMES} }`;
const MISSING_KEY_FIXTURE = BORDER_BEAM_KEYFRAMES;

const BORDER_BEAM_KEYFRAMES_PATTERN =
	/@keyframes border-beam\s*\{\s*100%\s*\{\s*offset-distance:\s*100%;?\s*\}\s*\}/;

async function fixtureBorderBeamRule(body: string): Promise<string | null> {
	const { designSystem } = await loadFixtureEngine(body);
	return designSystem.candidatesToCss([BORDER_BEAM_CLASS])[0] ?? null;
}

describe("BorderBeam animation compiles inline (C12b, N3)", () => {
	it(
		"flags a non-inline @theme key, which resolves at :root (N3)",
		async () => {
			const violations = borderBeamAnimationViolations(
				await fixtureBorderBeamRule(NON_INLINE_THEME_FIXTURE),
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]).toMatch(/^N3:/);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"flags a theme with no --animate-border-beam key (C12b)",
		async () => {
			const violations = borderBeamAnimationViolations(
				await fixtureBorderBeamRule(MISSING_KEY_FIXTURE),
			);
			expect(violations).toHaveLength(1);
			expect(violations[0]).toMatch(/^C12b:/);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"accepts the key inside @theme inline",
		async () => {
			expect(
				borderBeamAnimationViolations(
					await fixtureBorderBeamRule(INLINE_THEME_FIXTURE),
				),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"compiles the project's after:animate-border-beam to the inline animation",
		async () => {
			const { candidates, designSystem } = await projectEngine();
			expect(candidates).toContain(BORDER_BEAM_CLASS);
			expect(
				borderBeamAnimationViolations(
					designSystem.candidatesToCss([BORDER_BEAM_CLASS])[0] ?? null,
				),
			).toEqual([]);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"emits the border-beam keyframes into the project's compiled CSS",
		async () => {
			const { compiledCss } = await projectEngine();
			expect(compiledCss).toMatch(BORDER_BEAM_KEYFRAMES_PATTERN);
		},
		ENGINE_TIMEOUT_MS,
	);
});

/**
 * A utility followed by a bracketed arbitrary value that holds a literal space
 * or tab. Oxide extracts no candidate from such a class, so it never renders.
 * `[ \t]` keeps every match on one line; a quote or `]` ends the value.
 */
const WHITESPACE_IN_ARBITRARY_VALUE =
	/(?<![\w-])[a-z][\w:!/.-]*-\[[^\]"'`\n]*[ \t][^\]"'`\n]*\]/g;

function findWhitespaceInArbitraryValues(text: string): string[] {
	return [...text.matchAll(WHITESPACE_IN_ARBITRARY_VALUE)].map(
		(match) => match[0],
	);
}

/** Every non-test `.ts`/`.tsx` file under `dir`. */
function collectSourceFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "__tests__" || entry.name === "node_modules") continue;
			files.push(...collectSourceFiles(path));
		} else if (
			/\.(ts|tsx)$/.test(entry.name) &&
			!entry.name.includes(".test.")
		) {
			files.push(path);
		}
	}
	return files;
}

const OLD_BADGE_TOKEN =
	"bg-[color-mix(in oklch,var(--color-primary) 10%,transparent)]";

describe("no arbitrary value contains literal whitespace (C12a, N1 class)", () => {
	it("flags the space-broken badge class", () => {
		expect(
			findWhitespaceInArbitraryValues(
				`className="mx-auto ${OLD_BADGE_TOKEN} p-3"`,
			),
		).toEqual([OLD_BADGE_TOKEN]);
	});

	it("accepts the underscore form", () => {
		expect(
			findWhitespaceInArbitraryValues(
				'"fill-[color-mix(in_oklab,var(--color-foreground)_25%,transparent)]"',
			),
		).toEqual([]);
	});

	it("accepts bracketed variants", () => {
		expect(
			findWhitespaceInArbitraryValues(
				'"[&_svg]:size-4 data-[state=open]:bg-muted has-[>[data-slot=x]]:p-2"',
			),
		).toEqual([]);
	});

	it("flags an interpolation with whitespace inside the brackets", () => {
		expect(
			findWhitespaceInArbitraryValues('"translate-y-[${offset * 2}px]"'),
		).toHaveLength(1);
	});

	it("finds none in the shipped source", () => {
		const files = collectSourceFiles(join(REPO_ROOT, "src"));
		expect(
			files.length,
			"the src/ walk found too few files: the scan is vacuous",
		).toBeGreaterThan(500);
		const violations: string[] = [];
		for (const file of files) {
			const lines = readFileSync(file, "utf8").split("\n");
			lines.forEach((line, index) => {
				for (const token of findWhitespaceInArbitraryValues(line)) {
					violations.push(`${relative(REPO_ROOT, file)}:${index + 1} ${token}`);
				}
			});
		}
		expect(
			violations,
			[
				"Arbitrary value(s) with a literal space: Oxide extracts no candidate, so the class never renders. Write spaces as _ inside the brackets, or use a theme utility (C12a, N1):",
				...violations,
			].join("\n"),
		).toEqual([]);
	});
});

function quotedLiterals(text: string): string[] {
	return [...text.matchAll(/"([^"\n]*)"/g)].map((match) => match[1] ?? "");
}

function classTokens(literal: string): string[] {
	return literal.split(/\s+/).filter((token) => token !== "");
}

describe("GridPattern and update-password badge classes are real candidates (C12a, N1)", () => {
	it(
		"extracts and compiles all 10 GridPattern variant classes",
		async () => {
			const source = readFileSync(
				join(REPO_ROOT, "src/components/ui/grid-pattern.tsx"),
				"utf8",
			);
			const start = source.indexOf("const variantStyles = {");
			expect(start, "grid-pattern.tsx has no variantStyles object").not.toBe(
				-1,
			);
			const block = source.slice(start, source.indexOf("};", start));
			const tokens = quotedLiterals(block).flatMap(classTokens);
			expect(tokens).toHaveLength(10);
			const { candidates, designSystem } = await projectEngine();
			const extracted = new Set(candidates);
			for (const token of tokens) {
				expect(
					extracted.has(token),
					`${token} is not an extracted candidate`,
				).toBe(true);
				const css = designSystem.candidatesToCss([token])[0] ?? null;
				expect(css, `${token} compiles to nothing`).not.toBeNull();
				expect(css).toContain("color-mix(in oklab,");
			}
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"extracts and compiles every token of the update-password Lock badge",
		async () => {
			const source = readFileSync(
				join(REPO_ROOT, "src/components/auth/update-password-form.tsx"),
				"utf8",
			);
			const literal = quotedLiterals(source).find((value) =>
				value.includes("rounded-full w-fit"),
			);
			expect(literal, "the Lock badge literal is missing").toBeDefined();
			const tokens = classTokens(literal ?? "");
			expect(tokens).toContain("bg-primary/10");
			const { candidates, designSystem } = await projectEngine();
			const extracted = new Set(candidates);
			for (const token of tokens) {
				expect(
					extracted.has(token),
					`${token} is not an extracted candidate`,
				).toBe(true);
				expect(
					designSystem.candidatesToCss([token])[0] ?? null,
					`${token} compiles to nothing`,
				).not.toBeNull();
			}
		},
		ENGINE_TIMEOUT_MS,
	);
});
