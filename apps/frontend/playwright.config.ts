import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for E2E testing
 * Includes configuration for visual regression and multiple browsers
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
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Setup project for authentication (disabled - using demo route)
    // {
    //   name: 'setup',
    //   testMatch: /.*\.setup\.ts/,
    // },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        // storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'],
    },
    {
      name: 'tablet',
      use: { 
        ...devices['iPad (gen 7)'],
        // storageState: 'playwright/.auth/user.json',
      },
      // dependencies: ['setup'],
    },
  ],

  // webServer: {
  //   command: 'npm run dev',
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
  
  // Visual regression testing configuration
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
})