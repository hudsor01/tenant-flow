import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Ensure we're in an isolated environment from Vitest
process.env.NODE_ENV = 'test'

/**
 * Playwright Configuration for TenantFlow E2E Testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Global test timeout */
  timeout: 60000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 10000
  },

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* No global setup needed for CI - keep it simple */

  /* Reporter configuration */
  reporter: [
    /* Use the html reporter for local development */
    ['html', { open: 'never' }],
    
    /* Use list reporter for CI */
    process.env.CI ? ['github'] : ['list'],
    
    /* JSON reporter for test result processing */
    ['json', { outputFile: 'test-results/results.json' }],
    
    /* Allure reporter for detailed reporting */
    ['allure-playwright', { 
      detail: true, 
      outputFolder: 'allure-results',
      suiteTitle: 'TenantFlow E2E Tests'
    }]
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL for the application */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Maximum time for navigation */
    navigationTimeout: 30000,

    /* Maximum time for actions */
    actionTimeout: 10000,

    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,

    /* Test environment configuration */
    extraHTTPHeaders: {
      'Authorization': process.env.E2E_API_TOKEN || ''
    }
  },

  /* Configure projects for major browsers */
  projects: [
    /* Desktop Chrome - simplified for CI */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome']
      }
    }
  ],


  /* Local dev server configuration */
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev --filter=@repo/backend',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
        JWT_SECRET: 'test-secret',
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY_TEST,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET_TEST
      }
    },
    {
      command: 'npm run dev --filter=@repo/frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        VITE_API_BASE_URL: 'http://localhost:8000/api',
        VITE_STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY_TEST
      }
    }
  ],

  /* Test output configuration */
  outputDir: 'test-results/',
  
  /* Test metadata */
  metadata: {
    project: 'TenantFlow',
    environment: process.env.NODE_ENV || 'test',
    version: process.env.npm_package_version || '1.0.0'
  },

})

/* Test patterns and organization */
export const testPatterns = {
  unit: 'src/**/*.{test,spec}.{js,ts}',
  integration: 'tests/integration/**/*.{test,spec}.{js,ts}',
  e2e: 'tests/e2e/**/*.spec.ts',
  performance: 'tests/performance/**/*.spec.ts',
  critical: 'tests/e2e/**/*.critical.spec.ts'
}

/* Environment-specific configurations */
export const environments = {
  development: {
    baseURL: 'http://localhost:3000',
    workers: 1,
    retries: 0
  },
  staging: {
    baseURL: process.env.STAGING_URL,
    workers: 2,
    retries: 1
  },
  production: {
    baseURL: process.env.PRODUCTION_URL,
    workers: 1,
    retries: 2,
    forbidOnly: true
  }
}