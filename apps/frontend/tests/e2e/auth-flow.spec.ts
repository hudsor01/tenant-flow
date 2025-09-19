/**
 * PRODUCTION-CRITICAL E2E TESTS
 * Tests complete user flows to catch real-world bugs
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication Flow - Production Scenarios', () => {
	test('password visibility toggle works correctly', async ({ page }) => {
		await page.goto('/auth/login')
		
		// Wait for the page to be fully loaded
		await page.waitForLoadState('networkidle')
		
		const passwordInput = page.getByRole('textbox', { name: 'Password' })
		
		// Fill password field first
		await passwordInput.fill('TestPassword123!')
		
		// Initially password should be hidden
		await expect(passwordInput).toHaveAttribute('type', 'password')
		
		// Get the password input's bounding box and click on the right side where the toggle should be
		const inputBox = await passwordInput.boundingBox()
		if (inputBox) {
			// Click on the right side of the password input where the eye icon should be
			await page.mouse.click(inputBox.x + inputBox.width - 20, inputBox.y + inputBox.height / 2)
			
			await expect(passwordInput).toHaveAttribute('type', 'text')
			await expect(passwordInput).toHaveValue('TestPassword123!')
			
			// Click again to hide password
			await page.mouse.click(inputBox.x + inputBox.width - 20, inputBox.y + inputBox.height / 2)
			await expect(passwordInput).toHaveAttribute('type', 'password')
			await expect(passwordInput).toHaveValue('TestPassword123!')
		}
	})

	test('protected routes redirect unauthenticated users', async ({ page }) => {
		// Try to access dashboard without authentication
		await page.goto('/dashboard')
		
		// Should redirect to login
		await expect(page).toHaveURL(/.*\/auth\/login/)
		// More specific selector for the Sign In heading, not the button
		await expect(page.locator('h1:has-text("Sign In"), h2:has-text("Sign In")')).toBeVisible()
	})

	test('link between login and signup pages works', async ({ page }) => {
		// Start at login page
		await page.goto('/auth/login')
		
		// Click sign up link - look for the link specifically, not any text
		await page.click('a:has-text("Sign up")')
		await expect(page).toHaveURL(/.*\/auth\/signup/)
		
		// Navigate back to login from signup - look for the link specifically
		await page.click('a:has-text("Sign in")')
		await expect(page).toHaveURL(/.*\/auth\/login/)
	})
})
