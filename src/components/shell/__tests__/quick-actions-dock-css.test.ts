// @vitest-environment node
/**
 * Compile proof for the QuickActionsDock centering classes (D-39, D-51,
 * VD-37, PATTERNS #6).
 *
 * The dock centers on the main column: offset by half the `--sidebar-width`
 * rail while it is docked and expanded, and at the viewport center when the
 * offcanvas rail is collapsed. This file runs in node, like
 * tailwind-theme-integrity.test.ts, and compiles the real `src/app/globals.css`
 * with Tailwind's own engine through `#test/utils/tailwind-engine`.
 *
 * It lives under the `@source not` rule globals.css applies to test files, so
 * the candidate strings below never reach the compiled CSS themselves; the
 * extraction check therefore proves Oxide found each class in the dock source.
 */
import { describe, expect, it } from "vitest";
import {
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

const DOCK_CENTERING_CANDIDATES = [
	"lg:left-[calc(50%+var(--sidebar-width)/2)]",
	"group-has-data-[collapsible=offcanvas]/sidebar-wrapper:lg:left-1/2",
	"lg:transition-[left]",
	"lg:duration-200",
	"lg:ease-linear",
] as const;

function ruleFor(engine: TailwindEngine, candidate: string): string {
	const css = engine.designSystem.candidatesToCss([candidate])[0] ?? null;
	if (css === null) {
		throw new Error(`${candidate} compiles to nothing`);
	}
	return css;
}

describe("QuickActionsDock centering classes (D-39, D-51)", () => {
	it(
		"extracts, compiles and keeps every new dock class canonical",
		async () => {
			const engine = await projectEngine();
			for (const candidate of DOCK_CENTERING_CANDIDATES) {
				expect(engine.candidates).toContain(candidate);
				expect(
					engine.designSystem.candidatesToCss([candidate])[0] ?? null,
				).not.toBeNull();
				expect(
					engine.designSystem.canonicalizeCandidates([candidate], {
						rem: 16,
					})[0],
				).toBe(candidate);
			}
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"compiles the expanded offset, the collapsed override and the transition",
		async () => {
			const engine = await projectEngine();
			const [expanded, collapsed, property, duration, easing] =
				DOCK_CENTERING_CANDIDATES.map((candidate) =>
					ruleFor(engine, candidate),
				);

			expect(expanded).toContain("64rem");
			expect(expanded).toContain("left: calc(50% + var(--sidebar-width) / 2)");

			expect(collapsed).toContain("64rem");
			expect(collapsed).toContain(".group\\/sidebar-wrapper");
			expect(collapsed).toContain(':has([data-collapsible="offcanvas"])');
			expect(collapsed).toContain("left: calc(1 / 2 * 100%)");

			expect(property).toContain("transition-property: left");
			expect(duration).toContain("transition-duration: 200ms");
			expect(easing).toContain("transition-timing-function: linear");
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"derives the dock offset, panel height, main clearance and root scroll padding from one token set (CP-4 follow-up)",
		async () => {
			const engine = await projectEngine();
			const candidates = [
				"bottom-(--dock-offset)",
				"h-(--dock-height)",
				"lg:pb-(--dock-clearance)",
			] as const;
			for (const candidate of candidates) {
				expect(engine.candidates).toContain(candidate);
				expect(
					engine.designSystem.canonicalizeCandidates([candidate], {
						rem: 16,
					})[0],
				).toBe(candidate);
			}
			const [offset, height, clearance] = candidates.map((candidate) =>
				ruleFor(engine, candidate),
			);
			expect(offset).toContain("bottom: var(--dock-offset)");
			expect(height).toContain("height: var(--dock-height)");
			expect(clearance).toContain("64rem");
			expect(clearance).toContain("padding-bottom: var(--dock-clearance)");

			const css = engine.compiledCss;
			expect(css).toMatch(/--dock-height:\s*calc\(var\(--spacing\) \* 16\.5\)/);
			expect(css).toMatch(/--dock-offset:\s*calc\(var\(--spacing\) \* 6\)/);
			expect(css).toMatch(
				/--dock-clearance:\s*calc\(var\(--dock-height\) \+ var\(--dock-offset\)\)/,
			);
			// The scroll padding is the root's, gated on the mounted dock and on
			// the same lg breakpoint that shows it.
			const scrollRule =
				/@media \(width >= 64rem\)\s*\{\s*html:has\(\[data-slot="quick-actions-dock"\]\)\s*\{\s*scroll-padding-bottom:\s*var\(--dock-clearance\);/;
			expect(css).toMatch(scrollRule);
		},
		ENGINE_TIMEOUT_MS,
	);

	it(
		"declares the 14rem sidebar width token and no 16rem leftover (D-51)",
		async () => {
			const engine = await projectEngine();
			expect(engine.compiledCss).toMatch(/--sidebar-width:\s*14rem/);
			expect(engine.compiledCss).not.toMatch(/--sidebar-width:\s*16rem/);
		},
		ENGINE_TIMEOUT_MS,
	);
});
