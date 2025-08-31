import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Visual Regression Testing Configuration for Storybook
 * This config is specifically for visual testing of Storybook components
 */
export default defineConfig({
  testDir: './tests/visual',
  
  /* Global test timeout */
  timeout: 30000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 5000,
    // Visual comparison threshold
    threshold: 0.2,
    // Animation handling
    animation: 'disabled'
  },
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only - important for visual tests */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI for consistent screenshots */
  workers: process.env.CI ? 1 : 3,
  
  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report-visual' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
    ...(process.env.CI ? [['github']] : [['list']])
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL for Storybook */
    baseURL: 'http://localhost:6006',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot for visual comparison */
    screenshot: 'only-on-failure',
    
    /* Maximum time for navigation */
    navigationTimeout: 10000,
    
    /* Maximum time for actions */
    actionTimeout: 5000,
  },
  
  /* Configure projects for visual testing */
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  
  /* Start Storybook dev server before running tests */
  webServer: {
    command: 'npm run storybook',
    port: 6006,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  /* Test output configuration */
  outputDir: 'test-results/visual',
});