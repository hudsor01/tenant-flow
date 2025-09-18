import { defineConfig, devices } from '@playwright/test'

/**
 * Standalone Playwright configuration for Media Stack Services testing
 * This config is independent of the main application and doesn't require
 * environment variables or authentication setup.
 */
export default defineConfig({
	testDir: '.',
	testMatch: '**/media-stack-services.spec.ts',
	fullyParallel: false, // Run tests sequentially for better reporting
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1, // Single worker for media stack tests
	timeout: 60000, // 60 seconds per test
	
	reporter: [
		['list'],
		['html', { outputFolder: 'test-results/media-stack-report' }],
		['json', { outputFile: 'test-results/media-stack-results.json' }]
	],

	use: {
		// Basic configuration for media stack testing
		headless: true,
		viewport: { width: 1280, height: 720 },
		
		// Network and timeout settings optimized for media services
		actionTimeout: 10000,
		navigationTimeout: 30000,
		
		// Screenshot and video settings
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		trace: 'retain-on-failure',
		
		// Media services often use self-signed certificates
		ignoreHTTPSErrors: true,
		acceptDownloads: false,
		
		// Extra HTTP headers for better compatibility
		extraHTTPHeaders: {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.5',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		}
	},

	projects: [
		{
			name: 'media-stack-chrome',
			use: {
				...devices['Desktop Chrome'],
				headless: true
			}
		}
	],

	// No global setup/teardown to avoid dependencies
	globalSetup: undefined,
	globalTeardown: undefined,
	
	// Test output settings
	outputDir: 'test-results/media-stack',
	
	// Enhanced assertion settings
	expect: {
		timeout: 10000,
		toHaveScreenshot: {
			maxDiffPixels: 100,
			threshold: 0.2,
			animations: 'disabled',
			mode: 'strict'
		}
	}
})
