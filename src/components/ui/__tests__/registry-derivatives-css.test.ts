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
import { describe, expect, it } from "vitest";
import {
	loadFixtureEngine,
	loadProjectTailwindEngine,
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
