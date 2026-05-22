import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
					// Phase 15-04 — defensive worker-pool tune. Caps worker fan-out
					// so the full 105k-test parallel run is deterministic on lower-
					// core dev boxes / CI runners. The 3-run baseline on an
					// 18-core machine already passes 0/105,093 (see
					// .planning/phases/15-v1-0-milestone-cleanup-close-all-audit-gaps-doc-drift-tracea/15-04-SUMMARY.md),
					// so this is a regression hedge against the contention symptom
					// captured in .planning/phases/12-seo-metadata-schema-content-cleanup/deferred-items.md
					// returning on smaller hardware. See SUMMARY for the
					// 3-consecutive-zero-flake gate diagnostic data.
					// Vitest 4 removed nested `poolOptions.threads.maxThreads` — `maxWorkers`
					// is the supported top-level replacement (see migration guide).
					maxWorkers: 8,
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
