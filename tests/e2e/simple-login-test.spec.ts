import { test, expect } from '@playwright/test'

const isSuccessToast = (text: string | null): boolean => {
	if (!text) return false
	const normalized = text.toLowerCase()
	return normalized.includes('welcome') || normalized.includes('success')
}

test.describe('Login Flow', () => {
  test('should successfully login and navigate to dashboard', async ({ page }, testInfo) => {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error('NEXT_PUBLIC_APP_URL is required for login flow tests')
    }
    // Navigate to login page
    await page.goto(`${process.env.NEXT_PUBLIC_APP_URL}/login`)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check we're on the login page
    await expect(page).toHaveURL(/.*\/login/)

    // Fill in login form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123456!')

    // Click login button
    await page.click('button[type="submit"]')

    const toastLocator = page.locator('[role="alert"]').first()

    const [toastText, navigatedToDashboard] = await Promise.all([
		toastLocator.textContent({ timeout: 5000 }).catch(() => null),
		page.waitForURL('**/dashboard', { timeout: 5000 }).then(() => true).catch(() => false)
	])

    if (toastText && !isSuccessToast(toastText)) {
		throw new Error(`Unexpected toast content after login attempt: ${toastText}`)
    }

    if (!navigatedToDashboard) {
		await expect(page).toHaveURL(/\/dashboard/, {
			message: 'Expected dashboard navigation after login'
		})
    }

    const screenshot = await page.screenshot({ fullPage: true })
    await testInfo.attach('login-flow-result', {
		contentType: 'image/png',
		body: screenshot
    })
  })
})
