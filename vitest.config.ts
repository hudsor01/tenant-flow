import { readFileSync } from "node:fs";
import { cpus } from "node:os";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Phase 15-04 — derive the worker-pool cap from host capacity. The literal
// `8` ceiling matched the 18-core dev box where the baseline reproduced 0
// failures, but `8` does not constrain anything on a 4-core CI runner where
// the original symptom (vitest "Failed to start threads worker" + ~15
// unrelated failures, recorded in
// .planning/phases/12-seo-metadata-schema-content-cleanup/deferred-items.md)
// would actually surface. Deriving from `cpus().length - 1` keeps one core
// for the orchestrator and stays at-or-below host capacity. Minimum 2 so
// single-core environments still parallelize the suite.
//
// WR-03 fix per 15-REVIEW.md cycle 1: this is a defensive hedge, NOT an
// empirically reproduced fix on lower-core hardware. See 15-04-SUMMARY.md
// for the 0/3 baseline on 18 cores.
const UNIT_MAX_WORKERS = Math.max(2, Math.min(8, cpus().length - 1));

const loadEnvFile = (fileName: string) => {
	const path = resolve(__dirname, fileName);
	try {
		const raw = readFileSync(path, "utf8");
		for (const line of raw.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const equalsIndex = trimmed.indexOf("=");
			if (equalsIndex === -1) continue;
			const key = trimmed.slice(0, equalsIndex);
			const value = trimmed.slice(equalsIndex + 1);
			if (process.env[key] === undefined) {
				process.env[key] = value;
			}
		}
	} catch {
		// Missing env file is acceptable; other mechanisms may provide values
	}
};

loadEnvFile(".env.test");
loadEnvFile(".env.local");

export default defineConfig({
	resolve: {
		// Native tsconfig `paths` resolution — replaces the deprecated
		// `vite-tsconfig-paths` plugin. Vite (7+) reads tsconfig.json and
		// resolves the `#env`, `#components/*`, etc. aliases itself.
		tsconfigPaths: true,
		alias: {
			recharts: resolve(__dirname, "src/test/mocks/recharts.tsx"),
			"recharts/types/component/DefaultTooltipContent": resolve(
				__dirname,
				"src/test/mocks/recharts-tooltip.ts",
			),
		},
	},
	plugins: [react()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					environment: "jsdom",
					pool: "threads",
					// Phase 15-04 — host-derived worker-pool cap (see UNIT_MAX_WORKERS
					// computation at module top). Vitest 4 removed nested
					// `poolOptions.threads.maxThreads`; `maxWorkers` is the supported
					// top-level replacement (migration guide). Defensive hedge —
					// 0/3 baseline on 18-core machine; not empirically reproduced on
					// lower-core hardware in this branch (15-04-SUMMARY.md).
					maxWorkers: UNIT_MAX_WORKERS,
					globals: true,
					setupFiles: [
						"./src/test/msw-polyfill.ts",
						"./src/test/unit-setup.ts",
					],
					include: [
						"src/**/*.{test,spec}.{ts,tsx}",
						"scripts/**/*.{test,spec}.{ts,tsx}",
						// Node-side guards over the Deno edge functions. The edge
						// functions themselves are NOT importable from Vitest (explicit
						// `.ts` specifiers + `Deno.serve`), so these tests read their
						// source from disk. `supabase/functions/tests/` is the separate
						// Deno test directory and stays out of this pattern.
						"supabase/functions/__tests__/**/*.{test,spec}.ts",
						// Node-side guards over the Playwright SUPPORT modules — the
						// measurement helpers and the production seeder in
						// `tests/e2e/lib/`. Those modules carry real invariants (every
						// geometry read polls; the seeder must not march an
						// un-resettable production counter) that nothing else can
						// assert: the Playwright specs cannot check them without a
						// browser and a production sign-in, so the invariants shipped
						// broken and stayed broken. The `.spec.ts` files themselves stay
						// OUT — they import `@playwright/test` and are not runnable here.
						"tests/e2e/lib/__tests__/**/*.test.ts",
						// The same argument one level over: pure, network-free decision
						// helpers used by the RLS integration suite. The one that lives
						// here decides which retention window R7 may install against
						// PRODUCTION, and it is the part that can be wrong — but it
						// cannot be exercised by running the global, irreversible sweep
						// it exists to bound. It runs here, off-network, with no
						// credentials, so the decision is proved without invoking the
						// thing it guards. `_helpers/__tests__` only; every test that
						// actually touches production stays excluded below.
						"tests/integration/**/_helpers/__tests__/**/*.test.ts",
					],
					exclude: [
						"node_modules",
						"dist",
						".next",
						"out",
						"build",
						"coverage",
						// Narrower than the previous blanket `tests/**`, which also
						// swallowed the `tests/e2e/lib/__tests__` include above (a
						// Vitest exclude always beats an include). The two things that
						// blanket existed to keep out are named explicitly instead: the
						// Playwright specs, which need a browser, and the RLS
						// integration suite, which has its own project below.
						//
						// `tests/integration/**` was itself a blanket for the same
						// reason, and swallowed the `_helpers/__tests__` include above.
						// The suites that actually sign in to production are enumerated
						// by their real depth instead — one file at the root, and the
						// `rls/` directory — so a helper test nested deeper is reachable
						// while nothing that touches production ever is.
						"tests/**/*.spec.ts",
						"tests/integration/*.test.ts",
						"tests/integration/rls/*.test.ts",
						"tests/integration/setup/**",
						"e2e/**",
						"src/**/*.component.test.tsx",
					],
					// NO `coverage` KEY HERE. It lived at this depth and did nothing —
					// see the root-level block at the foot of this file for what that
					// cost and how it was found.
					testTimeout: 10000,
					hookTimeout: 10000,
				},
			},
			{
				extends: true,
				test: {
					name: "component",
					environment: "jsdom",
					pool: "threads",
					globals: true,
					setupFiles: [
						"./src/test/msw-polyfill.ts",
						"./src/test/unit-setup.ts",
					],
					include: ["src/**/*.component.test.{ts,tsx}"],
					testTimeout: 10000,
					hookTimeout: 10000,
				},
			},
			{
				test: {
					name: "integration",
					environment: "node",
					pool: "forks",
					fileParallelism: false,
					globals: true,
					testTimeout: 30000,
					include: ["tests/integration/**/*.test.ts"],
					// The pure decision helpers belong to the unit project. Running them
					// here too would put a network-free test behind a production
					// sign-in and make it ambiguous which project owns them.
					exclude: ["tests/integration/**/_helpers/__tests__/**"],
					setupFiles: ["./tests/integration/setup/env-loader.ts"],
					// One-time auth sign-in for the whole suite. Caches sessions to
					// a tmp file so each test file's `createTestClient` restores
					// via setSession (zero auth API calls) — drops the suite from
					// ~62 sign-ins to 2, well under Supabase's ~45/min rate limit.
					globalSetup: ["./tests/integration/setup/global-auth-setup.ts"],
				},
			},
		],

		// =====================================================================
		// COVERAGE. ROOT LEVEL, AND THAT PLACEMENT IS THE WHOLE POINT.
		//
		// This block previously sat INSIDE `projects[0].test`, where Vitest
		// silently discards it: `coverage` is a member of Vitest's
		// `NonProjectOptions`, and `ProjectConfig = Omit<InlineConfig,
		// NonProjectOptions | ...>` (vitest 4, reporters.d.ts:3571,3596), so a
		// `coverage` key at project depth is not a config error — it is simply
		// not read. TypeScript did flag it ("'coverage' does not exist in type
		// 'ProjectConfig'"), but `vitest.config.ts` is in no tsconfig project,
		// so `bun run typecheck` never saw it.
		//
		// The consequence: the 80% threshold this repo believed it enforced on
		// every commit was never applied. Measured at the moment it was found,
		// the suite reported 64.19% statements and EXITED 0. CLAUDE.md said
		// "80% coverage threshold (enforced via lefthook pre-commit)"; lefthook
		// did run `--coverage`, the report printed, and nothing was gated. Every
		// "the full suite passes" claim in this repo was measured against a gate
		// that was not running.
		//
		// THE NUMBERS BELOW ARE THE MEASURED TRUTH, NOT AN ASPIRATION.
		// Restoring the block at 80% would have failed instantly at 64% and
		// blocked every commit in the repo, so the thresholds are set to the
		// real floor (measured values rounded DOWN to whole percent, which also
		// stops sub-point noise from flapping the gate):
		//
		//     statements 64.19 -> 64      branches  56.10 -> 56
		//     functions  63.62 -> 63      lines     66.28 -> 66
		//
		// This is a RATCHET, not a target. It cannot rise on its own — raising
		// it is a deliberate act, and the 80% goal is a real one that is now
		// honestly recorded as unmet rather than falsely recorded as enforced.
		// What it buys immediately is that coverage can no longer SILENTLY
		// regress, which is the property the repo thought it had all along.
		//
		// Do not move this key back inside `projects[]`.
		// =====================================================================
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			exclude: [
				"node_modules/",
				"src/test/",
				"**/*.d.ts",
				"**/*.config.{ts,js}",
				"**/generated/**",
				"**/__mocks__/**",
				"src/types/**",
				"tests/**",
				"scripts/**",
			],
			thresholds: {
				statements: 64,
				branches: 56,
				functions: 63,
				lines: 66,
			},
		},
	},
});
