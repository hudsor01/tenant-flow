import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for authentication E2E testing
 * Designed to test against running frontend on localhost:3001
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/auth-flow-comprehensive.spec.ts',
  fullyParallel: false, // Run auth tests sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for auth tests
  timeout: 60 * 1000, // 60 second timeout per test
  reporter: [
    ['html', { outputFolder: 'test-results/auth-test-report' }],
    ['json', { outputFile: 'test-results/auth-results.json' }],
    ['list']
  ],
  
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false, // Show browser for debugging
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true, // For API calls to production
  },

  projects: [
    {
      name: 'chromium-auth',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No web server - assumes frontend is already running on 3001
  
  expect: {
    timeout: 10 * 1000, // 10 second timeout for assertions
  },
})