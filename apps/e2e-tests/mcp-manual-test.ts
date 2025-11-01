/**
 * Manual E2E Test - Simulating Playwright MCP Interaction
 * This demonstrates what Playwright MCP would do
 */

import { chromium } from '@playwright/test'

async function main() {
	const browser = await chromium.launch({
		headless: false, // Show browser like MCP does
		slowMo: 500 // Slow down actions for visibility
	})

	const context = await browser.newContext({
		viewport: { width: 1280, height: 720 }
	})

	const page = await context.newPage()

	try {
		console.log('📍 Step 1: Navigate to login page')
		await page.goto('http://localhost:3000/login', {
			waitUntil: 'networkidle'
		})

		console.log('📸 Taking screenshot of login page...')
		await page.screenshot({ path: 'apps/e2e-tests/mcp-output/01-login-page.png' })

		console.log('🔑 Step 2: Fill login credentials')
		const email = process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
		const password = process.env.E2E_OWNER_PASSWORD || 'TestPassword123!'

		await page.locator('#email').fill(email)
		await page.locator('#password').fill(password)

		console.log('📸 Taking screenshot with filled credentials...')
		await page.screenshot({
			path: 'apps/e2e-tests/mcp-output/02-credentials-filled.png'
		})

		console.log('🚀 Step 3: Submit login form')
		await Promise.all([
			page.waitForURL(/\/(manage|dashboard)/, { timeout: 30000 }),
			page.getByRole('button', { name: /sign in|login|submit/i }).click()
		])

		console.log('✅ Step 4: Login successful! Current URL:', page.url())
		await page.screenshot({
			path: 'apps/e2e-tests/mcp-output/03-logged-in.png'
		})

		// Check localStorage for Supabase session
		console.log('🔍 Step 5: Verify Supabase session in localStorage')
		const storageKeys = await page.evaluate(() => {
			const keys = Object.keys(localStorage)
			const supabaseKey = keys.find(k => k.includes('auth-token'))
			if (supabaseKey) {
				const session = localStorage.getItem(supabaseKey)
				return {
					key: supabaseKey,
					hasSession: !!session,
					sessionPreview: session
						? JSON.parse(session).access_token?.substring(0, 20) + '...'
						: null
				}
			}
			return { key: null, hasSession: false }
		})

		console.log('Session info:', storageKeys)

		console.log('📍 Step 6: Navigate to /manage/tenants')
		await page.goto('http://localhost:3000/manage/tenants', {
			waitUntil: 'networkidle'
		})

		console.log('📸 Taking screenshot of tenants page...')
		await page.screenshot({
			path: 'apps/e2e-tests/mcp-output/04-tenants-page.png'
		})

		// Check for API requests
		console.log('🌐 Step 7: Monitor API requests')
		const requests: string[] = []
		page.on('request', request => {
			if (request.url().includes('/api/v1/')) {
				const headers = request.headers()
				requests.push(
					`${request.method()} ${request.url()}\nAuthorization: ${headers.authorization || 'MISSING'}`
				)
			}
		})

		// Trigger a refresh to capture API calls
		await page.reload({ waitUntil: 'networkidle' })

		console.log('📋 Captured API requests:')
		requests.forEach(req => console.log(req))

		console.log('\n✅ Test completed successfully!')
		console.log('📂 Screenshots saved to: apps/e2e-tests/mcp-output/')

		// Keep browser open for 5 seconds for manual inspection
		await page.waitForTimeout(5000)
	} catch (error) {
		console.error('❌ Error during test:', error)
		await page.screenshot({
			path: 'apps/e2e-tests/mcp-output/error-screenshot.png'
		})
	} finally {
		await browser.close()
	}
}

main()
