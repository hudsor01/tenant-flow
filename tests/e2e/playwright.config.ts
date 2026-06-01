import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Playwright Configuration - TenantFlow E2E Tests
 *
 * Following official Playwright documentation patterns:
 * @see https://playwright.dev/docs/test-configuration
 * @see https://playwright.dev/docs/auth
 * @see https://playwright.dev/docs/test-webserver
 *
 * Environment Variables:
 * This config loads .env.test for local Supabase configuration.
 * @see https://nextjs.org/docs/pages/guides/environment-variables
 */

// ESM-compatible __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.test for test environment variables
// Use override: true to ensure local Supabase URLs
dotenv.config({ path: path.join(__dirname, ".env.test"), override: true });

// Dedicated test port to avoid conflicts with development servers
const TEST_FRONTEND_PORT = 3050;
const TEST_FRONTEND_URL = `http://localhost:${TEST_FRONTEND_PORT}`;

// Local Supabase configuration (from .env.test)
const LOCAL_SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const LOCAL_SUPABASE_PUBLISHABLE_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const OWNER_AUTH_FILE = path.join(__dirname, "playwright/.auth/owner.json");

export default defineConfig({
	// ===================
	// Test Organization
	// ===================
	testDir: "./tests",
	testMatch: ["**/*.e2e.spec.ts", "**/*.spec.ts"],
	testIgnore: [
		"**/staging/**",
		"**/production/**",
		"**/fixtures/**",
		"**/_archived/**",
	],

	// ===================
	// Timeouts
	// ===================
	timeout: 30_000, // 30s per test
	expect: {
		timeout: 5_000, // 5s for assertions
		toHaveScreenshot: {
			maxDiffPixels: 100,
			animations: "disabled",
		},
	},

	// ===================
	// Execution Strategy
	// ===================
	fullyParallel: true,
	maxFailures: 1, // Stop on first failure for debugging
	workers: process.env.CI ? 2 : 1, // Single worker locally for sequential debugging
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,

	// ===================
	// Reporters
	// @see https://playwright.dev/docs/test-reporters
	// ===================
	reporter: process.env.CI
		? [
				["github"],
				["html", { open: "never", outputFolder: "playwright-report" }],
				["json", { outputFile: "test-results/results.json" }],
				["junit", { outputFile: "test-results/junit.xml" }],
			]
		: [
				["list", { printSteps: true }],
				["html", { open: "on-failure", outputFolder: "playwright-report" }],
			],

	// ===================
	// Global Settings
	// @see https://playwright.dev/docs/api/class-testoptions
	// ===================
	use: {
		// Base URL - all page.goto() calls will be relative to this
		baseURL: TEST_FRONTEND_URL,

		// Bypass CSP to allow test scripts to run
		// @see https://playwright.dev/docs/api/class-browser#browser-new-context-option-bypass-csp
		bypassCSP: true,

		// Recording options
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",

		// Action timeouts
		actionTimeout: 10_000,
		navigationTimeout: 30_000,

		// Consistency across runs
		locale: "en-US",
		timezoneId: "America/Chicago",
		viewport: { width: 1280, height: 720 },

		// Always headless (use --headed flag to override)
		headless: true,

		// Note: Removed x-playwright-test header - not in CORS allowed headers
	},

	// ===================
	// Projects
	// @see https://playwright.dev/docs/auth
	// @see https://playwright.dev/docs/test-projects
	// ===================
	projects: [
		// ─────────────────────────────────────────
		// SETUP: Authenticate owner via API (runs first)
		//
		// LEGACY / NON-FUNCTIONAL: testMatch /auth-api\.setup\.ts/ matches no
		// file — the storageState owner-auth path was abandoned in commit
		// e760cd1aa (the @supabase/ssr session lives in localStorage, which
		// storageState could not reliably capture). The owner / firefox /
		// chromium / mobile-chrome projects below still reference it but are NOT
		// run in CI. CI authenticates the dashboard a11y sweep via the
		// `owner-axe` project (in-test loginAsOwner, no storageState). Removing
		// this dead path entirely requires a verifiable local E2E run across the
		// dependent projects — tracked as follow-up E2E-auth cleanup debt.
		// ─────────────────────────────────────────
		{
			name: "setup-owner",
			testMatch: /auth-api\.setup\.ts/,
			retries: 2,
		},

		// ─────────────────────────────────────────
		// OWNER: Owner dashboard tests (authenticated)
		// ─────────────────────────────────────────
		{
			name: "owner",
			use: {
				...devices["Desktop Chrome"],
				storageState: OWNER_AUTH_FILE,
			},
			dependencies: ["setup-owner"],
			testMatch: ["**/owner/**/*.spec.ts"],
			// dashboard-a11y self-authenticates via loginAsOwner (no storageState).
			testIgnore: ["**/owner/dashboard-a11y.e2e.spec.ts"],
		},

		// ─────────────────────────────────────────
		// OWNER-AXE: dashboard a11y + 375px sweep (CI: --project=owner-axe).
		// NO storageState — authenticates in-test via loginAsOwner, because the
		// @supabase/ssr session lives in localStorage, which storageState cannot
		// reliably capture (see commit e760cd1aa). No setup-owner dependency.
		// ─────────────────────────────────────────
		{
			name: "owner-axe",
			use: {
				...devices["Desktop Chrome"],
			},
			testMatch: ["**/owner/dashboard-a11y.e2e.spec.ts"],
		},

		// ─────────────────────────────────────────
		// CHROMIUM: Other authenticated tests
		// ─────────────────────────────────────────
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				storageState: OWNER_AUTH_FILE,
			},
			dependencies: ["setup-owner"],
			testIgnore: ["**/*.setup.ts", "**/public/**", "**/owner/**"],
		},

		// ─────────────────────────────────────────
		// SMOKE: Critical path tests (no auth - tests login flow)
		// ─────────────────────────────────────────
		{
			name: "smoke",
			use: {
				...devices["Desktop Chrome"],
				storageState: { cookies: [], origins: [] }, // No auth - tests login flow
			},
			testMatch: ["**/smoke/**/*.spec.ts"],
			testIgnore: ["**/minimal.smoke.spec.ts"], // This test requires pre-auth, runs in chromium project
		},

		// ─────────────────────────────────────────
		// PUBLIC: No auth required
		// ─────────────────────────────────────────
		{
			name: "public",
			use: {
				...devices["Desktop Chrome"],
				storageState: { cookies: [], origins: [] }, // Explicitly no auth
			},
			testMatch: ["**/public/**/*.spec.ts", "**/*public*.spec.ts"],
		},

		// ─────────────────────────────────────────
		// FIREFOX: Cross-browser testing (owner tests only)
		// ─────────────────────────────────────────
		{
			name: "firefox",
			use: {
				...devices["Desktop Firefox"],
				storageState: OWNER_AUTH_FILE,
			},
			dependencies: ["setup-owner"],
			testMatch: ["**/owner/**/*.spec.ts"], // Owner tests for cross-browser
			// dashboard-a11y self-authenticates via loginAsOwner (no storageState).
			testIgnore: ["**/owner/dashboard-a11y.e2e.spec.ts"],
		},

		// ─────────────────────────────────────────
		// MOBILE: Responsive testing (owner tests only)
		// ─────────────────────────────────────────
		{
			name: "mobile-chrome",
			use: {
				...devices["Pixel 5"],
				storageState: OWNER_AUTH_FILE,
			},
			dependencies: ["setup-owner"],
			testMatch: ["**/owner/**/*.spec.ts"], // Owner tests for responsive
			// dashboard-a11y self-authenticates via loginAsOwner (no storageState).
			testIgnore: ["**/owner/dashboard-a11y.e2e.spec.ts"],
		},
	],

	// ===================
	// Web Server
	// @see https://playwright.dev/docs/test-webserver
	// ===================
	// Local: `next dev --turbopack` (fast incremental rebuilds).
	// CI:    `next build && next start` (pre-compiled, sub-second page
	//        loads). PR #725 cycle-5 review traced ERR_ABORTED flakes
	//        across persona-consistency + critical-paths to JIT-compile
	//        contention — every route compiled on first request, 2-10s
	//        per route, 2 parallel workers serialized on the compiler.
	//        Switching CI to a production build eliminated the
	//        compile-time variability that was eating test budgets.
	webServer: [
		(() => {
			const sharedEnv = `export NODE_ENV='${process.env.CI ? "production" : "test"}' && export SKIP_ENV_VALIDATION='true' && export NEXT_PUBLIC_SUPABASE_URL='${LOCAL_SUPABASE_URL}' && export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='${LOCAL_SUPABASE_PUBLISHABLE_KEY}' && export NEXT_PUBLIC_APP_URL='${TEST_FRONTEND_URL}' && export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_placeholder'`;
			const command = process.env.CI
				? `rm -rf .next && rm -f .env.local && bash -c "${sharedEnv} && npx next build && exec npx next start --port ${TEST_FRONTEND_PORT}"`
				: `rm -rf .next && rm -f .env.local && bash -c "${sharedEnv} && exec npx next dev --turbopack --port ${TEST_FRONTEND_PORT}"`;
			return {
				command,
				url: TEST_FRONTEND_URL,
				// CI needs longer warm-up — `next build` runs once before serve.
				timeout: process.env.CI ? 240_000 : 120_000,
				reuseExistingServer: !process.env.CI,
				stdout: "pipe" as const,
				stderr: "pipe" as const,
				cwd: path.resolve(__dirname, "../.."),
				env: {
					NEXT_PUBLIC_SUPABASE_URL: LOCAL_SUPABASE_URL,
					NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: LOCAL_SUPABASE_PUBLISHABLE_KEY,
					NEXT_PUBLIC_APP_URL: TEST_FRONTEND_URL,
					NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder",
				},
			};
		})(),
	],

	// ===================
	// Output
	// ===================
	outputDir: "test-results/",
});
