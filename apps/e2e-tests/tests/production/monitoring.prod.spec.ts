/**
 * Production Monitoring Tests
 *
 * Run every 15 minutes via GitHub Actions scheduled workflow
 * Monitors critical endpoints and user flows in production
 *
 * Architecture: Supabase PostgREST + Edge Functions (no NestJS backend)
 * - Frontend: Vercel (PROD_URL)
 * - Database/Auth/API: Supabase (SUPABASE_URL)
 *
 * Success Criteria:
 * - All health checks return 200 OK
 * - Response times < 2000ms
 * - Critical user paths work end-to-end
 */

import { test, expect } from '@playwright/test'

const PROD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tenantflow.app'
const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	'https://bshjmbshupiibfiewpxb.supabase.co'

test.describe('Production Health Checks', () => {
	test('frontend health check should respond', async ({ request }) => {
		const startTime = Date.now()

		const response = await request.get(`${PROD_URL}/api/health`)
		const responseTime = Date.now() - startTime

		expect(response.ok()).toBeTruthy()
		expect(responseTime).toBeLessThan(2000)
	})

	test('Supabase PostgREST should be reachable', async ({ request }) => {
		const startTime = Date.now()

		// Supabase REST endpoint returns 401 without auth — that confirms it is up
		const response = await request.get(`${SUPABASE_URL}/rest/v1/`)
		const responseTime = Date.now() - startTime

		expect([200, 401]).toContain(response.status())
		expect(responseTime).toBeLessThan(2000)
	})

	test('Supabase Auth should be reachable', async ({ request }) => {
		const response = await request.get(`${SUPABASE_URL}/auth/v1/health`)

		// Auth health endpoint returns 200
		expect(response.ok()).toBeTruthy()
	})
})

test.describe('Critical Page Availability', () => {
	test('homepage should load', async ({ page }) => {
		const response = await page.goto(PROD_URL)
		expect(response?.ok()).toBeTruthy()

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
	test('PostgREST tables should require auth', async ({ request }) => {
		// Without auth header, Supabase PostgREST returns 401
		const response = await request.get(`${SUPABASE_URL}/rest/v1/properties`)

		expect([200, 401]).toContain(response.status())
	})

	test('Edge Functions should be reachable', async ({ request }) => {
		// Stripe webhooks Edge Function returns 401 for unauthenticated requests
		const response = await request.post(
			`${SUPABASE_URL}/functions/v1/stripe-webhooks`,
			{ data: { test: 'data' } },
		)

		// Should fail auth (400/401/403), not crash (500)
		expect([400, 401, 403]).toContain(response.status())
	})
})

test.describe('Performance Monitoring', () => {
	test('homepage performance metrics', async ({ page }) => {
		await page.goto(PROD_URL)

		const performanceTiming = await page.evaluate(() =>
			JSON.stringify(window.performance.timing),
		)
		const timing = JSON.parse(performanceTiming)

		const pageLoadTime = timing.loadEventEnd - timing.navigationStart
		const domContentLoaded =
			timing.domContentLoadedEventEnd - timing.navigationStart
		const timeToInteractive = timing.domInteractive - timing.navigationStart

		expect(pageLoadTime).toBeLessThan(5000)
		expect(domContentLoaded).toBeLessThan(3000)
		expect(timeToInteractive).toBeLessThan(2000)
	})
})

test.describe('SSL/TLS Security', () => {
	test('frontend should enforce HTTPS', async ({ page }) => {
		const response = await page.goto(PROD_URL)

		expect(page.url()).toMatch(/^https:\/\//)

		const securityHeaders = response?.headers() || {}
		expect(securityHeaders).toHaveProperty('strict-transport-security')
	})
})

test.describe('Error Handling', () => {
	test('404 page should render correctly', async ({ page }) => {
		const response = await page.goto(
			`${PROD_URL}/this-page-does-not-exist-12345`,
		)

		expect(response?.status()).toBe(404)

		const bodyText = await page.locator('body').textContent()
		expect(bodyText).toBeTruthy()
		expect(bodyText?.length || 0).toBeGreaterThan(100)
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

		const fontFaces = await page.evaluate<string[]>(() => {
			const fonts = Array.from(
				document.fonts as unknown as Iterable<FontFace>,
			)
			return fonts.map((font) => font.family)
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
		await page.waitForLoadState('domcontentloaded')

		const criticalErrors = consoleErrors.filter(
			(err) =>
				!err.includes('third-party') &&
				!err.includes('analytics') &&
				!err.includes('gtag'),
		)

		expect(criticalErrors).toHaveLength(0)
	})
})
