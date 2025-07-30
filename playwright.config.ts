import { defineConfig, devices } from '@playwright/test'
import { TestEnvironment } from './tests/config/test-helpers'
import * as dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

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

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),

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
    /* Setup project for authentication and data seeding */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },

    /* Cleanup project */
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/
    },

    /* Desktop Chrome */
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup']
    },

    /* Desktop Firefox */
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox']
      },
      dependencies: ['setup']
    },

    /* Desktop Safari */
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari']
      },
      dependencies: ['setup']
    },

    /* Mobile Chrome */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5']
      },
      dependencies: ['setup']
    },

    /* Mobile Safari */
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12']
      },
      dependencies: ['setup']
    },

    /* Microsoft Edge */
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge' 
      },
      dependencies: ['setup']
    },

    /* Branded tests - run on specific browsers for critical flows */
    {
      name: 'critical-flows-chrome',
      testMatch: /.*\.critical\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      },
      dependencies: ['setup']
    }
  ],

  /* Test environment setup */
  globalSetup: async () => {
    console.log('🚀 Starting Playwright test environment setup...')
    
    // Setup test database
    await TestEnvironment.setupDatabase()
    
    // Wait for application to be ready
    const maxRetries = 30
    let retries = 0
    const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
    
    while (retries < maxRetries) {
      try {
        const response = await fetch(`${baseURL}/health`)
        if (response.ok) {
          console.log('✅ Application is ready for testing')
          break
        }
      } catch (error) {
        retries++
        if (retries === maxRetries) {
          throw new Error('Application failed to start within timeout period')
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  },

  globalTeardown: async () => {
    console.log('🧹 Cleaning up test environment...')
    await TestEnvironment.teardownDatabase()
  },

  /* Local dev server configuration */
  webServer: process.env.CI ? undefined : [
    {
      command: 'npm run dev --filter=@tenantflow/backend',
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
      command: 'npm run dev --filter=@tenantflow/frontend',
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

  /* Performance testing configuration */
  use: {
    // ... existing use config
    
    /* Performance monitoring */
    extraHTTPHeaders: {
      'Performance-Test': process.env.PERFORMANCE_TEST === 'true' ? 'enabled' : 'disabled'
    }
  }
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