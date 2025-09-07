import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Chromatic visual testing
 * Integrates with Chromatic for enhanced visual regression testing
 */
export default defineConfig({
  testDir: './tests/chromatic',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report-chromatic' }],
    ['json', { outputFile: 'playwright-report-chromatic/results.json' }],
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:6006',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Chromatic-specific options */
    // Disable automatic snapshots if you want to use targeted snapshots
    // disableAutoSnapshot: true,
    
    // Crop snapshots to viewport height for consistent testing
    cropToViewport: true,
    
    // Set timeout for network idle state
    resourceArchiveTimeout: 10000,
    
    // Specify external asset domains to capture
    assetDomains: ['localhost:6006'],
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chromatic options for this browser
        delay: 500, // Add delay before capturing
        diffThreshold: 0.1, // Set change tolerance
        ignoreSelectors: ['.animate-spin', '[data-testid="loading"]'], // Exclude animations
        pauseAnimationAtEnd: true, // Pause animations for consistent snapshots
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        delay: 500,
        diffThreshold: 0.1,
        ignoreSelectors: ['.animate-spin', '[data-testid="loading"]'],
        pauseAnimationAtEnd: true,
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        delay: 500,
        diffThreshold: 0.1,
        ignoreSelectors: ['.animate-spin', '[data-testid="loading"]'],
        pauseAnimationAtEnd: true,
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        delay: 500,
        diffThreshold: 0.1,
        ignoreSelectors: ['.animate-spin', '[data-testid="loading"]'],
        pauseAnimationAtEnd: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        delay: 500,
        diffThreshold: 0.1,
        ignoreSelectors: ['.animate-spin', '[data-testid="loading"]'],
        pauseAnimationAtEnd: true,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});