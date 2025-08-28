import { defineConfig, devices } from '@playwright/test'

/**
 * MVP Playwright Configuration
 * Simple, fast E2E testing focused on Chrome only
 * Following CLAUDE.md: No over-engineering, just test the product works
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Keep simple for MVP
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Minimal retries
  workers: 1, // Single worker for MVP simplicity
  reporter: 'list', // Simple output
  timeout: 30000, // 30 second timeout

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4500',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true
  },

  projects: [
    {
      name: 'chromium-mvp',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Skip webServer for now - test against running instance or production
  // webServer: process.env.CI ? undefined : {
  //   command: 'npm run dev',
  //   port: 3000,
  //   reuseExistingServer: true,
  //   timeout: 60 * 1000
  // }
})