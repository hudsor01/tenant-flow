import { chromium, FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Global setup for Playwright tests
 * Handles authentication and stores auth state for reuse across tests
 * See: https://playwright.dev/docs/auth
 */
async function globalSetup(config: FullConfig) {
	const { baseURL, use } = config.projects[0]
	const browser = await chromium.launch()

	try {
		// Create auth directory if it doesn't exist
		const authDir = path.join(__dirname, '../../playwright/.auth')
		if (!fs.existsSync(authDir)) {
			fs.mkdirSync(authDir, { recursive: true })
		}

		// Setup different user roles
		const userRoles = [
			{
				email: process.env.E2E_USER_EMAIL || (() => {
					throw new Error('E2E_USER_EMAIL is required for Playwright global setup')
				})(),
				password: process.env.E2E_USER_PASSWORD || (() => {
					throw new Error('E2E_USER_PASSWORD is required for Playwright global setup')
				})(),
				storageStatePath: 'playwright/.auth/user.json',
				role: 'user'
			},
			{
				email: process.env.E2E_ADMIN_EMAIL || (() => {
					throw new Error('E2E_ADMIN_EMAIL is required for Playwright global setup')
				})(),
				password: process.env.E2E_ADMIN_PASSWORD || (() => {
					throw new Error('E2E_ADMIN_PASSWORD is required for Playwright global setup')
				})(),
				storageStatePath: 'playwright/.auth/admin.json',
				role: 'admin'
			},
			{
				email: process.env.E2E_LANDLORD_EMAIL || (() => {
					throw new Error('E2E_LANDLORD_EMAIL is required for Playwright global setup')
				})(),
				password: process.env.E2E_LANDLORD_PASSWORD || (() => {
					throw new Error('E2E_LANDLORD_PASSWORD is required for Playwright global setup')
				})(),
				storageStatePath: 'playwright/.auth/landlord.json',
				role: 'landlord'
			},
			{
				email: process.env.E2E_TENANT_EMAIL || (() => {
					throw new Error('E2E_TENANT_EMAIL is required for Playwright global setup')
				})(),
				password: process.env.E2E_TENANT_PASSWORD || (() => {
					throw new Error('E2E_TENANT_PASSWORD is required for Playwright global setup')
				})(),
				storageStatePath: 'playwright/.auth/tenant.json',
				role: 'tenant'
			}
		]

		// Authenticate each user role
		for (const userRole of userRoles) {
			console.log(`Setting up auth for ${userRole.role}...`)

			const page = await browser.newPage({
				baseURL: baseURL || use?.baseURL
			})

			try {
				// Navigate to login page
				await page.goto('/login')

				// Fill in login form
				await page.fill('[data-testid="email-input"]', userRole.email)
				await page.fill('[data-testid="password-input"]', userRole.password)

				// Submit login form
				await page.click('[data-testid="login-button"]')

				// Wait for successful login - adjust selector based on your app
				await page.waitForURL('/dashboard', {
					timeout: 30000,
					waitUntil: 'networkidle'
				})

				// Optional: Verify user is logged in
				await page.waitForSelector('[data-testid="user-menu"]', {
					state: 'visible',
					timeout: 10000
				})

				// Save authentication state
				await page.context().storageState({
					path: userRole.storageStatePath
				})

				console.log(`✅ Auth setup complete for ${userRole.role}`)
			} catch (error) {
				console.error(`❌ Failed to setup auth for ${userRole.role}:`, error)

				// Create a minimal auth state if login fails (for dev/testing)
				if (process.env.SKIP_AUTH_SETUP === 'true') {
					console.log(`⚠️  Creating mock auth state for ${userRole.role}`)
					const mockAuthState = {
						cookies: [],
						origins: [
							{
								origin: baseURL || use?.baseURL || 'http://localhost:4500',
								localStorage: [
									{
										name: 'auth-token',
										value: `mock-token-${userRole.role}`
									}
								]
							}
						]
					}
					fs.writeFileSync(
						userRole.storageStatePath,
						JSON.stringify(mockAuthState, null, 2)
					)
				}
			} finally {
				await page.close()
			}
		}

		console.log('✅ Global setup complete')
	} catch (error) {
		console.error('❌ Global setup failed:', error)
		throw error
	} finally {
		await browser.close()
	}
}

export default globalSetup