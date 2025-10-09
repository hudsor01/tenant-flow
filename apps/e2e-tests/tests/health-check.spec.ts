import { test, expect } from '@playwright/test'

test.describe('TenantFlow Health Check', () => {
  test('Frontend should be accessible', async ({ page }) => {
    await page.goto('/')
    
    // Check if page loads
    await expect(page).toHaveTitle(/TenantFlow/)
    
    // Check for main navigation
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

	test('Backend API should respond', async ({ request }) => {
		const backendHealthUrl =
			process.env.PLAYWRIGHT_BACKEND_HEALTH_URL ||
			process.env.BACKEND_HEALTH_URL

		if (!backendHealthUrl) {
			test.skip('BACKEND health URL not configured for smoke test')
		}

		const response = await request.get(backendHealthUrl!)

		expect(response.ok()).toBeTruthy()

		const data = await response.json()
		expect(data).toHaveProperty('status')
	})

	test('Supabase connection should work', async ({ page }) => {
		if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
			test.skip('Supabase URL not configured for smoke test')
		}

		// Test if Supabase connection works via frontend page
		await page.goto('/')

    // Check if page loads without Supabase errors
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Wait for page to stabilize
    await page.waitForTimeout(1000)

    // Verify no Supabase-related errors
		const hasSupabaseError = errors.some((err) =>
			err.toLowerCase().includes('supabase') ||
			err.toLowerCase().includes('auth')
		)

		expect(hasSupabaseError).toBe(false)
	})
})
