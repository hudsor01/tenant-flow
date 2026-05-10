import { expect, test } from '@playwright/test'

test.describe('Routing aliases — Phase 3 (CRIT-05 + CRIT-06)', () => {
	// Each redirect rule is asserted with two checks:
	//  1. status code is 301 or 308 (Next.js permanent: true emits 308; we
	//     accept either to avoid lock-in to one specific code if a future
	//     maintainer ever swaps to statusCode: 301)
	//  2. Location header matches the canonical destination exactly
	//
	// maxRedirects: 0 stops Playwright from auto-following — we want to
	// inspect the redirect response itself, not the final destination.

	test('CRIT-05: /signup 301/308s to /pricing', async ({ page }) => {
		const response = await page.request.get('/signup', { maxRedirects: 0 })
		expect([301, 308]).toContain(response.status())
		expect(response.headers().location).toBe('/pricing')
	})

	test('CRIT-06: /terms-of-service 301/308s to /terms', async ({ page }) => {
		const response = await page.request.get('/terms-of-service', {
			maxRedirects: 0,
		})
		expect([301, 308]).toContain(response.status())
		expect(response.headers().location).toBe('/terms')
	})

	test('CRIT-06: /privacy-policy 301/308s to /privacy', async ({ page }) => {
		const response = await page.request.get('/privacy-policy', {
			maxRedirects: 0,
		})
		expect([301, 308]).toContain(response.status())
		expect(response.headers().location).toBe('/privacy')
	})

	test('CRIT-06: /help-center 301/308s to /help', async ({ page }) => {
		const response = await page.request.get('/help-center', {
			maxRedirects: 0,
		})
		expect([301, 308]).toContain(response.status())
		expect(response.headers().location).toBe('/help')
	})

	test('CRIT-06: /rss-feed 301/308s to /feed.xml', async ({ page }) => {
		const response = await page.request.get('/rss-feed', {
			maxRedirects: 0,
		})
		expect([301, 308]).toContain(response.status())
		expect(response.headers().location).toBe('/feed.xml')
	})

	test('Bonus: /feed.xml returns 200 with RSS content-type for anonymous readers', async ({
		page,
	}) => {
		// Pre-fix: anon GET /feed.xml fell through PUBLIC_ROUTES and 307'd
		// to /login. Post-fix: PUBLIC_ROUTES contains /feed.xml so the
		// route handler renders directly. This assertion catches the
		// latent bug forever.
		const response = await page.request.get('/feed.xml', {
			maxRedirects: 0,
		})
		expect(response.status()).toBe(200)
		expect(response.headers()['content-type']).toMatch(/xml/i)
	})
})
