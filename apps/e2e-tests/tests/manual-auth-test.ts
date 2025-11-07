/**
 * Manual Authentication Test
 * Simple test to verify login works and we can access properties
 */

import { test, expect, chromium } from '@playwright/test'

test('manual login and auth verification', async () => {
	const browser = await chromium.launch({ headless: false, slowMo: 500 })
	const context = await browser.newContext()
	const page = await context.newPage()

	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
	const email = process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
	const password =
		process.env.E2E_OWNER_PASSWORD || 'TestPassword123!'

	console.log(`Testing with email: ${email}`)
	console.log(`Base URL: ${baseUrl}`)

	// Monitor auth errors
	const authErrors: string[] = []
	page.on('response', response => {
		if (response.status() === 401 || response.status() === 403) {
			authErrors.push(`${response.status()} - ${response.url()}`)
			console.error(`❌ Auth error: ${response.status()} - ${response.url()}`)
		}
	})

	// Navigate to login
	console.log('1. Navigating to login page...')
	await page.goto(`${baseUrl}/login`)
	await page.waitForLoadState('networkidle')

	// Check if we're already logged in (redirected to dashboard)
	if (page.url().includes('/manage') || page.url().includes('/dashboard')) {
		console.log('✅ Already logged in, going to properties')
	} else {
		// Fill login form
		console.log('2. Filling login form...')
		await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 })
		await page.locator('#email').fill(email)
		await page.locator('#password').fill(password)

		console.log('3. Submitting form...')
		await page.getByRole('button', { name: /sign in|login/i }).click()

		// Wait for navigation
		console.log('4. Waiting for navigation...')
		try {
			await page.waitForURL(/\/(manage|dashboard)/, { timeout: 60000 })
			console.log(`✅ Logged in! Current URL: ${page.url()}`)
		} catch (error) {
			console.error(`❌ Login failed. Current URL: ${page.url()}`)
			throw error
		}
	}

	// Navigate to properties
	console.log('5. Navigating to properties page...')
	await page.goto(`${baseUrl}/manage/properties`)
	await page.waitForLoadState('networkidle')

	// Verify we're on properties page
	console.log(`Current URL: ${page.url()}`)
	await expect(page).toHaveURL(/\/manage\/properties/)

	// Wait for content to load
	await page.waitForTimeout(2000)

	// Check for auth errors
	if (authErrors.length > 0) {
		console.error('❌ Auth errors detected:', authErrors)
		throw new Error(`Authentication errors: ${authErrors.join(', ')}`)
	}

	console.log('✅ All checks passed!')
	console.log(`✅ No 401/403 errors`)

	// Keep browser open for manual inspection
	await page.waitForTimeout(5000)

	await browser.close()
})
