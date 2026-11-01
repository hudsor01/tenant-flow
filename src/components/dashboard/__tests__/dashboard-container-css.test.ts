// @vitest-environment node
/**
 * Compile proof for the dashboard's container-keyed trends grid (CP-4
 * follow-up).
 *
 * The Revenue / Occupancy / Quick Actions row used to switch to four columns
 * at the `lg` viewport breakpoint. The dashboard's content width also depends
 * on the sidebar, so at 1024px with the rail expanded a quarter column was
 * 158px and the quick actions overflowed their card. The row now keys on the
 * dashboard's own width through the named `dashboard` container. This file
 * compiles the real `src/app/globals.css` with Tailwind's engine, like
 * quick-actions-dock-css.test.ts, and proves every class is extracted from the
 * dashboard sources, compiles to the container query and is canonical.
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

const CONTAINER_QUERY_CANDIDATES = [
	"@4xl/dashboard:grid-cols-4",
	"@4xl/dashboard:col-span-1",
	"@4xl/dashboard:col-span-2",
	"@4xl/dashboard:col-span-3",
] as const;

describe("dashboard trends grid keys on the dashboard container", () => {
	it(
		"extracts, compiles and keeps every container class canonical",
		async () => {
			const engine = await projectEngine();
			for (const candidate of [
				"@container/dashboard",
				...CONTAINER_QUERY_CANDIDATES,
			]) {
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
		"declares the named inline-size container and the 56rem query",
		async () => {
			const engine = await projectEngine();
			const [container] = engine.designSystem.candidatesToCss([
				"@container/dashboard",
			]);
			expect(container).toContain("container-type: inline-size");
			expect(container).toContain("container-name: dashboard");
			for (const candidate of CONTAINER_QUERY_CANDIDATES) {
				const [css] = engine.designSystem.candidatesToCss([candidate]);
				expect(css).toContain("@container dashboard (width >= 56rem)");
			}
			const [grid] = engine.designSystem.candidatesToCss([
				"@4xl/dashboard:grid-cols-4",
			]);
			expect(grid).toContain(
				"grid-template-columns: repeat(4, minmax(0, 1fr))",
			);
		},
		ENGINE_TIMEOUT_MS,
	);
});
