/**
 * Pins globals.css's reduced-motion rule (66.2-39 fix round 4, Part 8f): a
 * transition is 0s, an animation 0.01ms. An element that declares no
 * transition has the initial `transition-property: all`, so the old 0.01ms
 * gave every such element a live transition of every property, and a value a
 * script wrote read back as the old one until the next frame: Floating UI's
 * size step wrote the available size, read the box back, saw no change and
 * skipped its re-measure (an open combobox resized from 320 to 328 sat 20px
 * above the viewport; a tour step lagged up to 16px). An animation keeps
 * 0.01ms because Radix's and Dice UI's presence wait for its animationend.
 * The rendered effect is held by `owner-reflow-320.spec.ts` ("a positioned
 * overlay keeps its place when the viewport changes").
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

/** The declarations of the reduced-motion block's universal rule. */
function reducedMotionUniversal(): Map<string, string> {
	const blocks = [
		...css.matchAll(
			/@media \(prefers-reduced-motion: reduce\) \{\s*\*,\s*\*::before,\s*\*::after \{([^}]*)\}/g,
		),
	];
	expect(blocks, "one reduced-motion rule for every element").toHaveLength(1);
	return new Map(
		(blocks[0]?.[1] ?? "")
			.split(";")
			.map((declaration) => declaration.trim())
			.filter(Boolean)
			.map((declaration) => {
				const [property = "", ...value] = declaration.split(":");
				return [property.trim(), value.join(":").trim()] as const;
			}),
	);
}

describe("the reduced-motion rule", () => {
	it("makes a transition 0s, so no element transitions a property it never declared", () => {
		expect(reducedMotionUniversal().get("transition-duration")).toBe(
			"0s !important",
		);
	});

	it("keeps an animation at 0.01ms, so animationend still fires", () => {
		const rule = reducedMotionUniversal();
		expect(rule.get("animation-duration")).toBe("0.01ms !important");
		expect(rule.get("animation-iteration-count")).toBe("1 !important");
	});
});
