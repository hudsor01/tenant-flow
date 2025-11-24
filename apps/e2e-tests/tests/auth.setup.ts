import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '../playwright/.auth/owner.json')

setup('authenticate as owner', async ({ page, baseURL }) => {
	// Validate required environment variables
	const email = process.env.E2E_OWNER_EMAIL
	const password = process.env.E2E_OWNER_PASSWORD

	if (!email) {
		throw new Error('E2E_OWNER_EMAIL environment variable is required')
	}
	if (!password) {
		throw new Error('E2E_OWNER_PASSWORD environment variable is required')
	}

	// Navigate to login page (baseURL is provided by Playwright config)
	await page.goto(`${baseURL}/login`)
	await page.waitForLoadState('domcontentloaded')

	// Wait for the login form to be ready
	await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible' })

	// Fill login form using pressSequentially for React controlled inputs
	// This properly triggers onChange handlers for TanStack Form
	const emailInput = page.locator('[data-testid="email-input"]')
	await emailInput.click()
	await emailInput.clear()
	await emailInput.pressSequentially(email, { delay: 50 })

	const passwordInput = page.locator('[data-testid="password-input"]')
	await passwordInput.click()
	await passwordInput.clear()
	await passwordInput.pressSequentially(password, { delay: 50 })

	// Wait a moment for form validation to process
	await page.waitForTimeout(500)

	// Submit and wait for navigation
	await Promise.all([
		page.waitForURL(`${baseURL}/`, { timeout: 120000 }),
		page.locator('[data-testid="login-button"]').click()
	])

	// Wait for auth to fully initialize (networkidle ensures cookies are set)
	await page.waitForLoadState('networkidle')

	// Verify we're authenticated (owner dashboard is at root)
	await expect(page).toHaveURL(`${baseURL}/`)

	// CRITICAL: Verify auth cookies are present (per Playwright docs)
	// This prevents "fixture not found" errors by ensuring auth state is complete
	const cookies = await page.context().cookies()
	const authCookies = cookies.filter(
		(c) => c.name.includes('sb-') && c.name.includes('-auth-token')
	)

	if (authCookies.length === 0) {
		throw new Error(
			'Authentication failed: No Supabase auth token cookies found. ' +
				'This usually indicates a login failure or session not being persisted.'
		)
	}

	console.log(`✓ Auth setup successful: Found ${authCookies.length} auth cookie(s)`)

	// NEW: Wait for JWT claims to populate (fixes RLS 403 errors)
	// The custom access token hook needs time to add user_type and subscription_status
	await page.waitForTimeout(2000)

	// Verify the page is fully loaded with user data (not showing error states)
	const hasError = await page.locator('text=/error|unauthorized|403/i').count()
	if (hasError > 0) {
		const errorText = await page.locator('text=/error|unauthorized|403/i').first().textContent()
		throw new Error(`Page shows error after login: ${errorText}`)
	}

	console.log('✓ Page loaded successfully without errors')

	// Save authenticated state
	await page.context().storageState({ path: authFile })
	console.log(`✓ Auth state saved to ${authFile}`)
})
