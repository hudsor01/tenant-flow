// @vitest-environment node
/**
 * BlurFade class guard (66.2-27, C12c, D-30). The old component built its
 * hidden-state classes from template literals, which Tailwind never generates,
 * so the entrance never existed. Every preset and duration class is now a
 * complete static literal; this guard compiles each token with the REAL
 * `src/app/globals.css` and requires it to be canonical (`rem: 16`, the G8
 * rule), and a fixture proves a template-literal class fails the check.
 */

import { describe, expect, it } from "vitest";
import {
	loadProjectTailwindEngine,
	type TailwindEngine,
} from "#test/utils/tailwind-engine";
import {
	BLUR_FADE_DURATION_CLASSES,
	BLUR_FADE_PRESET_CLASSES,
} from "../blur-fade";

const ENGINE_TIMEOUT_MS = 30_000;

let enginePromise: Promise<TailwindEngine> | undefined;
function projectEngine(): Promise<TailwindEngine> {
	enginePromise ??= loadProjectTailwindEngine();
	return enginePromise;
}

const CLASS_VALUES = [
	...Object.values(BLUR_FADE_PRESET_CLASSES),
	...Object.values(BLUR_FADE_DURATION_CLASSES),
];
const TOKENS = [...new Set(CLASS_VALUES.flatMap((v) => v.split(/\s+/)))];

describe("BlurFade classes", () => {
	it("has tokens to check", () => {
		expect(TOKENS.length).toBeGreaterThan(10);
	});

	it("no class value is a template literal", () => {
		for (const value of CLASS_VALUES) {
			expect(value).not.toContain("${");
		}
	});

	it(
		"every token compiles under globals.css and is canonical",
		async () => {
			const { designSystem } = await projectEngine();
			const failures: string[] = [];
			for (const token of TOKENS) {
				const css = designSystem.candidatesToCss([token])[0];
				if (typeof css !== "string" || css.length === 0) {
					failures.push(`${token}: does not compile`);
					continue;
				}
				const canonical = designSystem.canonicalizeCandidates([token], {
					rem: 16,
				})[0];
				if (canonical !== token) {
					failures.push(`${token}: canonical form is ${canonical}`);
				}
			}
			expect(failures).toEqual([]);
			expect(designSystem.resolveThemeValue("--blur-xs")).toBe("4px");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"negative control: the old template-literal class does not compile",
		async () => {
			const { designSystem } = await projectEngine();
			const oldLiteral = ["translate-y-[$", "{yOffset}px]"].join("");
			expect(designSystem.candidatesToCss([oldLiteral])[0]).toBeNull();
		},
		ENGINE_TIMEOUT_MS,
	);
});
