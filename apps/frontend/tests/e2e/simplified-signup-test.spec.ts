import { test, expect } from '@playwright/test'

test.describe('Simplified Signup Form', () => {
	test('submit button enables when form is valid', async ({ page }) => {
		// Navigate to signup page
		await page.goto('http://localhost:3000/auth/signup')

		// Wait for form to be visible
		await page.waitForSelector('form', { timeout: 10000 })

		// Initially button should be disabled
		const submitButton = page.getByRole('button', {
			name: /Start Free Trial/i
		})
		await expect(submitButton).toBeDisabled()

		// Fill in minimal required fields
		await page.fill('input[name="fullName"]', 'Test User')
		await page.fill('input[name="email"]', 'test@example.com')
		await page.fill('input[name="password"]', 'password123')

		// Button should now be enabled
		await expect(submitButton).toBeEnabled()

		// Test company flow
		await page.check('input#isCompany')

		// Button should be disabled until company name is filled
		await expect(submitButton).toBeDisabled()

		await page.fill('input[name="companyName"]', 'Test Company')

		// Button should be enabled again
		await expect(submitButton).toBeEnabled()

		// Take screenshot of completed form
		await page.screenshot({
			path: 'simplified-signup-form.png',
			fullPage: true
		})

		console.log('✅ Simplified signup form validation works correctly!')
	})

	test('handles individual vs company signup', async ({ page }) => {
		await page.goto('http://localhost:3000/auth/signup')

		// Company field should not be visible initially
		await expect(
			page.locator('input[name="companyName"]')
		).not.toBeVisible()

		// Check company checkbox
		await page.check('input#isCompany')

		// Company field should appear with animation
		await expect(page.locator('input[name="companyName"]')).toBeVisible()

		// Uncheck to hide it again
		await page.uncheck('input#isCompany')
		await expect(
			page.locator('input[name="companyName"]')
		).not.toBeVisible()

		console.log('✅ Individual/Company toggle works correctly!')
	})
})
