import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const CI = process.env.CI === 'true'

export default defineConfig({
  testDir: './specs',
  fullyParallel: !CI,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list'],
  ],
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Global test settings
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    
    // Authentication state (disabled for visual tests)
    // storageState: 'tests/e2e/.auth/user.json',
  },

  // Visual testing configuration
  expect: {
    // Threshold for visual comparisons (0-1, where 1 = exact match)
    threshold: 0.2,
    timeout: 10_000,
    // Animation handling
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'rgb',
      animations: 'disabled',
    },
    toMatchSnapshot: {
      threshold: 0.2,
      mode: 'rgb',
    },
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // Test different user roles
    {
      name: 'owner-tests',
      use: {
        storageState: 'tests/e2e/.auth/owner.json',
      },
      testMatch: '**/owner/**/*.spec.ts',
    },
    {
      name: 'tenant-tests',
      use: {
        storageState: 'tests/e2e/.auth/tenant.json',
      },
      testMatch: '**/tenant/**/*.spec.ts',
    },
    {
      name: 'admin-tests',
      use: {
        storageState: 'tests/e2e/.auth/admin.json',
      },
      testMatch: '**/admin/**/*.spec.ts',
    },

    // Visual regression testing projects
    {
      name: 'visual-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: '**/visual/**/*.spec.ts',
    },
    {
      name: 'visual-tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 },
      },
      testMatch: '**/visual/**/*.spec.ts',
    },
    {
      name: 'visual-mobile',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 667 },
      },
      testMatch: '**/visual/**/*.spec.ts',
    },
  ],

  // Dev server configuration (disabled for visual tests)
  // webServer: {
  //   command: CI ? 'npm run preview' : 'npm run dev',
  //   port: 3000,
  //   reuseExistingServer: !CI,
  //   timeout: 120_000,
  // },
  
  // Test output configuration
  outputDir: 'test-results',
  
  // Global timeout
  timeout: 60_000,
})