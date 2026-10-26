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
 * its fix. Until then this file holds only the harness self-tests below.
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
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	FIXTURE_CSS_PREFIX,
	fixtureCss,
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
