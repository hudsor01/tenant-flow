import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E testing
 * MVP APPROACH: Single browser, simple setup following CLAUDE.md KISS principles
 * - Chrome only (covers 90% of users)
 * - No over-engineering with multiple browsers
 * - Fast feedback for production confidence
 */
export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		['html'],
		['json', { outputFile: 'test-results/results.json' }],
		['junit', { outputFile: 'test-results/junit.xml' }]
	],

	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.CI 
			? process.env.VERCEL_URL 
				? `https://${process.env.VERCEL_URL}` 
				: 'https://tenantflow.app'
			: 'http://localhost:4500',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},

	projects: [
		{
			name: 'chromium-mvp',
			use: { ...devices['Desktop Chrome'] }
		}
	],

	// webServer disabled - run server manually for MVP approach
	// This prevents port conflicts and gives more control over the dev environment

	// Visual regression testing configuration
	expect: {
		toHaveScreenshot: {
			maxDiffPixels: 100,
			threshold: 0.2,
			animations: 'disabled'
		}
	}
})
