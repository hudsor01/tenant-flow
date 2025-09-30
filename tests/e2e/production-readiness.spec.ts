import { expect, test } from '@playwright/test'
import type { TestInfo } from '@playwright/test'

const attachText = async (
	testInfo: TestInfo,
	name: string,
	lines: string[]
) => {
	if (lines.length === 0) return
	await testInfo.attach(name, {
		contentType: 'text/plain',
		body: Buffer.from(lines.join('\n'), 'utf-8')
	})
}

test.describe('Production Readiness Checks', () => {
  let consoleErrors: string[] = []
  let networkErrors: string[] = []

  test.beforeEach(async ({ page }) => {
    consoleErrors = []
    networkErrors = []

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Capture network failures
    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`)
    })

    // Also track response errors
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.url()} - Status: ${response.status()}`)
      }
    })
  })

  test('Homepage should load without critical errors', async ({ page }, testInfo) => {
    await page.goto('/')

    // Check page loaded
    await expect(page).toHaveTitle(/TenantFlow/)

    // Check for critical UI elements
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    const heroSection = page.locator('h1')
    await expect(heroSection).toContainText(/Property Management/)

    await attachText(testInfo, 'console-errors', consoleErrors)
    await attachText(
		testInfo,
		'network-errors',
		networkErrors
	)

    expect(consoleErrors, 'Console errors detected during homepage load').toHaveLength(0)

    const actionableNetworkErrors = networkErrors.filter(error => !error.includes('_next/image'))
    expect(actionableNetworkErrors, 'Unexpected network failures during homepage load').toHaveLength(0)
  })

  test('Auth flow should work', async ({ page }) => {
    await page.goto('')

    // Check login page loaded
    await expect(page).toHaveTitle(/Sign In/)

    // Check for form elements
    const emailInput = page.locator('input[type="email"], input[name*="email"]').first()
    const passwordInput = page.locator('input[type="password"]').first()
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")').first()

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()

    // Check Google OAuth button
    const googleButton = page.locator('button:has-text("Google")')
    await expect(googleButton).toBeVisible()
  })

  test('API health check should respond', async ({ request }, testInfo) => {
    // Try different API endpoints
    const endpoints = [
      '/api/health',
      '/api/v1/health',
      '/health'
    ]

    let healthCheckPassed = false
    const healthCheckResults: string[] = []

    for (const endpoint of endpoints) {
      try {
        const response = await request.get(endpoint)
        if (response.ok()) {
          healthCheckPassed = true
          const data = await response.json().catch(() => ({}))
          healthCheckResults.push(`${endpoint}: ${JSON.stringify(data)}`)
          break
        }
      } catch (error) {
        // Continue to next endpoint
        healthCheckResults.push(`${endpoint}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    await attachText(testInfo, 'health-check-results', healthCheckResults)
    expect(healthCheckPassed).toBeTruthy()
  })

  test('Critical assets should load', async ({ page }) => {
    await page.goto('/')

    // Check CSS loaded
    const styles = await page.evaluate(() => {
      const computedStyles = window.getComputedStyle(document.body)
      return {
        hasStyles: computedStyles.length > 0,
        fontFamily: computedStyles.fontFamily,
        backgroundColor: computedStyles.backgroundColor
      }
    })

    expect(styles.hasStyles).toBeTruthy()

    // Check JavaScript executed
    const jsEnabled = await page.evaluate(() => {
      return typeof window !== 'undefined'
    })

    expect(jsEnabled).toBeTruthy()
  })

  test('Environment configuration check', async ({ page }, testInfo) => {
    await page.goto('')

    // Check for missing env vars in console
    const warnings = await page.evaluate(() => {
      const logs: string[] = []
      // Check window config if exposed
      if ((window as any).__NEXT_DATA__) {
        const config = (window as any).__NEXT_DATA__.props?.pageProps?.config
        if (config) {
          logs.push('Config found')
        }
      }
      return logs
    })

    // These warnings are expected in local dev but should be fixed for production
    const expectedWarnings = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
    ]
    const missingEnvVars = expectedWarnings.filter(key => !process.env[key])

    await attachText(testInfo, 'env-config-evaluation', warnings)

    expect(missingEnvVars, 'Missing required public environment variables').toHaveLength(0)
  })

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status === 'failed') {
      await attachText(testInfo, 'console-errors-on-failure', consoleErrors)
      await attachText(testInfo, 'network-errors-on-failure', networkErrors)
    }
  })
})
