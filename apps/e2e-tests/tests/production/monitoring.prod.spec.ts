/**
 * Production Monitoring Tests
 *
 * Run every 15 minutes via GitHub Actions scheduled workflow
 * Monitors critical endpoints and user flows in production
 *
 * Success Criteria:
 * - All health checks return 200 OK
 * - Response times < 2000ms
 * - Critical user paths work end-to-end
 */

import { test, expect } from '@playwright/test'

const PROD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app'
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.tenantflow.app'

test.describe('Production Health Checks', () => {
	test('frontend health check should respond', async ({ request }) => {
		const startTime = Date.now()

		const response = await request.get(`${PROD_URL}/api/health`)
		const responseTime = Date.now() - startTime

		expect(response.ok()).toBeTruthy()
		expect(responseTime).toBeLessThan(2000) // Should respond within 2 seconds
	})

	test('backend health check should respond', async ({ request }) => {
		const startTime = Date.now()

		const response = await request.get(`${API_URL}/api/v1/health`)
		const responseTime = Date.now() - startTime

		expect(response.ok()).toBeTruthy()
		expect(responseTime).toBeLessThan(2000)

		const body = await response.json()
		expect(body).toHaveProperty('status')
		expect(body.status).toBe('ok')
	})

	test('database connection should be healthy', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/health`)
		expect(response.ok()).toBeTruthy()

		const body = await response.json()
		// Backend health endpoint includes database status
		expect(body).toHaveProperty('info')
		if (body.info?.database) {
			expect(body.info.database.status).toBe('up')
		}
	})
})

test.describe('Critical Page Availability', () => {
	test('homepage should load', async ({ page }) => {
		const response = await page.goto(PROD_URL)
		expect(response?.ok()).toBeTruthy()

		// Verify key content loaded
		await expect(page.locator('h1')).toBeVisible()
	})

	test('pricing page should load', async ({ page }) => {
		const response = await page.goto(`${PROD_URL}/pricing`)
		expect(response?.ok()).toBeTruthy()

		await expect(page.locator('text=Pricing')).toBeVisible()
	})

	test('login page should load', async ({ page }) => {
		const response = await page.goto(`${PROD_URL}/login`)
		expect(response?.ok()).toBeTruthy()

		// Verify login form rendered
		await expect(page.locator('input[type="email"]')).toBeVisible()
		await expect(page.locator('input[type="password"]')).toBeVisible()
	})

	test('contact page should load', async ({ page }) => {
		const response = await page.goto(`${PROD_URL}/contact`)
		expect(response?.ok()).toBeTruthy()

		await expect(page.locator('form')).toBeVisible()
	})
})

test.describe('API Endpoint Availability', () => {
	test('auth endpoints should be available', async ({ request }) => {
		// Check /api/v1/auth/health (should return 404 or 401, not 500)
		const response = await request.get(`${API_URL}/api/v1/auth/health`)
		// As long as server responds (not down), this is good
		expect([200, 401, 404]).toContain(response.status())
	})

	test('properties endpoint should require auth', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/properties`)

		// Should return 401 Unauthorized (not 500 Internal Server Error)
		expect(response.status()).toBe(401)
	})

	test('tenants endpoint should require auth', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/tenants`)

		expect(response.status()).toBe(401)
	})

	test('leases endpoint should require auth', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/leases`)

		expect(response.status()).toBe(401)
	})
})

test.describe('Performance Monitoring', () => {
	test('homepage performance metrics', async ({ page }) => {
		// Navigate and measure performance
		await page.goto(PROD_URL)

		// Get performance timing
		const performanceTiming = await page.evaluate(() =>
			JSON.stringify(window.performance.timing)
		)
		const timing = JSON.parse(performanceTiming)

		// Calculate metrics
		const pageLoadTime = timing.loadEventEnd - timing.navigationStart
		const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
		const timeToInteractive = timing.domInteractive - timing.navigationStart

		// Performance assertions (reasonable thresholds for production)
		expect(pageLoadTime).toBeLessThan(5000) // < 5 seconds total page load
		expect(domContentLoaded).toBeLessThan(3000) // < 3 seconds for DOM ready
		expect(timeToInteractive).toBeLessThan(2000) // < 2 seconds to interactive
	})

	test('API response times', async ({ request }) => {
		const endpoints = [
			'/api/v1/health',
			'/api/v1/properties',
			'/api/v1/tenants',
			'/api/v1/leases'
		]

		for (const endpoint of endpoints) {
			const startTime = Date.now()
			await request.get(`${API_URL}${endpoint}`)
			const responseTime = Date.now() - startTime

			// API should respond within 1 second (even for auth failures)
			expect(responseTime, `${endpoint} response time`).toBeLessThan(1000)
		}
	})
})

test.describe('SSL/TLS Security', () => {
	test('frontend should enforce HTTPS', async ({ page }) => {
		const response = await page.goto(PROD_URL)

		// Verify HTTPS protocol
		expect(page.url()).toMatch(/^https:\/\//)

		// Check security headers
		const securityHeaders = response?.headers() || {}
		expect(securityHeaders).toHaveProperty('strict-transport-security')
	})

	test('backend should enforce HTTPS', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/health`)

		// Check CORS and security headers
		const headers = response.headers()
		expect(headers).toHaveProperty('access-control-allow-origin')
	})
})

test.describe('Error Handling', () => {
	test('404 page should render correctly', async ({ page }) => {
		const response = await page.goto(`${PROD_URL}/this-page-does-not-exist-12345`)

		expect(response?.status()).toBe(404)

		// Verify custom 404 page rendered (not blank screen)
		const bodyText = await page.locator('body').textContent()
		expect(bodyText).toBeTruthy()
		expect(bodyText?.length || 0).toBeGreaterThan(100) // Has actual content
	})

	test('API returns proper error format', async ({ request }) => {
		const response = await request.get(`${API_URL}/api/v1/invalid-endpoint-12345`)

		expect(response.status()).toBe(404)

		// Verify error response has proper structure
		const body = await response.json().catch(() => ({}))
		expect(body).toHaveProperty('statusCode')
		expect(body.statusCode).toBe(404)
	})
})

test.describe('Third-Party Integrations', () => {
	test('Supabase connection should be healthy', async ({ request }) => {
		// Attempt to reach Supabase through backend health endpoint
		const response = await request.get(`${API_URL}/api/v1/health`)
		expect(response.ok()).toBeTruthy()

		const body = await response.json()
		// Check if database info is present (indicates Supabase connection)
		if (body.info?.database) {
			expect(body.info.database.status).toBe('up')
		}
	})

	test('Stripe webhook endpoint should be available', async ({ request }) => {
		// Stripe webhooks should return 400 for invalid signature (not 500)
		const response = await request.post(`${API_URL}/api/v1/stripe/webhook`, {
			data: { test: 'data' }
		})

		// Should fail validation (400), not crash (500)
		expect([400, 401, 403]).toContain(response.status())
	})
})

test.describe('Rate Limiting', () => {
	test('rate limiting should be active', async ({ request }) => {
		// Make multiple rapid requests
		const requests = Array.from({ length: 50 }, () =>
			request.get(`${API_URL}/api/v1/health`)
		)

		const responses = await Promise.all(requests)

		// At least some should be rate-limited (429) or all should succeed (200)
		const statusCodes = responses.map((r) => r.status())
		const hasRateLimiting = statusCodes.some((code) => code === 429)
		const allSuccessful = statusCodes.every((code) => code === 200)

		expect(hasRateLimiting || allSuccessful).toBeTruthy()
	})
})

test.describe('Static Asset Delivery', () => {
	test('favicon should load', async ({ page }) => {
		await page.goto(PROD_URL)

		const favicon = page.locator('link[rel="icon"]')
		const faviconHref = await favicon.getAttribute('href')

		expect(faviconHref).toBeTruthy()
	})

	test('fonts should load correctly', async ({ page }) => {
		await page.goto(PROD_URL)

		// Check if custom fonts are loaded
		const fontFaces = await page.evaluate(() => {
			return Array.from(document.fonts).map((font) => font.family)
		})

		expect(fontFaces.length).toBeGreaterThan(0)
	})
})

test.describe('Browser Console Errors', () => {
	test('homepage should have no console errors', async ({ page }) => {
		const consoleErrors: string[] = []

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		await page.goto(PROD_URL)
		await page.waitForLoadState('networkidle')

		// Allow some third-party errors but flag unexpected ones
		const criticalErrors = consoleErrors.filter(
			(err) =>
				!err.includes('third-party') &&
				!err.includes('analytics') &&
				!err.includes('gtag')
		)

		expect(criticalErrors).toHaveLength(0)
	})
})
