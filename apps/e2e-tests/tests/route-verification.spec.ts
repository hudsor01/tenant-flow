import { test, expect } from '@playwright/test'

/**
 * Route Verification Tests - Next.js 15 Route Groups
 *
 * Route Structure (per Next.js 15 documentation):
 * - (owner) group → `/` (root) - Owner dashboard and features
 * - (tenant) group → `/tenant` - Tenant portal
 * - (auth) group → `/login`, `/signup` - Authentication
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-groups
 */

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('Route Reorganization Verification', () => {
	test('owner dashboard route should exist at root', async ({ page }) => {
		// Owner dashboard is at root `/` inside (owner) route group
		await page.goto(`${baseUrl}/`)

		// Should not get a 404
		await page.waitForLoadState('networkidle')
		const title = await page.title()
		expect(title).toBeTruthy()

		// Should not show 404 text
		const content = await page.content()
		expect(content.toLowerCase()).not.toContain('404')
		expect(content.toLowerCase()).not.toContain('not found')
	})

	test('owner settings route should be accessible', async ({ page }) => {
		// Owner settings is at `/settings` inside (owner) route group
		await page.goto(`${baseUrl}/settings`)

		// Should not get a 404
		await page.waitForLoadState('networkidle', { timeout: 10000 })
		const content = await page.content()
		expect(content.toLowerCase()).not.toContain('404')
	})

	test('tenant portal route should exist', async ({ page }) => {
		// Tenant portal is at `/tenant` (root of (tenant) route group)
		await page.goto(`${baseUrl}/tenant`)

		// Should load successfully
		await page.waitForLoadState('networkidle')
		const url = page.url()
		expect(url).toContain('/tenant')

		// Should not show 404
		const content = await page.content()
		expect(content.toLowerCase()).not.toContain('404')
	})

	test('tenant settings route should be accessible', async ({ page }) => {
		// Tenant settings at `/tenant/settings`
		await page.goto(`${baseUrl}/tenant/settings`)

		// Should not get a 404
		await page.waitForLoadState('networkidle', { timeout: 10000 })
		const content = await page.content()
		expect(content.toLowerCase()).not.toContain('404')
	})

	test('navigation links point to correct URLs', async ({ page }) => {
		await page.goto(`${baseUrl}/`)

		// Wait for page to load completely
		await page.waitForLoadState('networkidle')

		// Check if navigation uses correct route group URLs
		const content = await page.content()

		// Should use root-level routes (owner group) or /tenant routes
		const hasCorrectRoutes =
			content.includes('href="/properties"') ||
			content.includes('href="/tenants"') ||
			content.includes('href="/settings"') ||
			content.includes('href="/tenant"')

		expect(hasCorrectRoutes).toBeTruthy()
	})
})
