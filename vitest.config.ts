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
					include: ["src/**/*.{test,spec}.{ts,tsx}"],
					exclude: [
						"node_modules",
						"dist",
						".next",
						"out",
						"build",
						"coverage",
						"tests/**",
						"e2e/**",
						"src/**/*.component.test.tsx",
					],
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
						],
						thresholds: {
							lines: 80,
							functions: 80,
							branches: 80,
							statements: 80,
						},
					},
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
					setupFiles: ["./tests/integration/setup/env-loader.ts"],
					// One-time auth sign-in for the whole suite. Caches sessions to
					// a tmp file so each test file's `createTestClient` restores
					// via setSession (zero auth API calls) — drops the suite from
					// ~62 sign-ins to 2, well under Supabase's ~45/min rate limit.
					globalSetup: ["./tests/integration/setup/global-auth-setup.ts"],
				},
			},
		],
	},
});
