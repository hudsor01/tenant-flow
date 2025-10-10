import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const resolveBaseUrl = () => {
	const explicitBase = process.env.PLAYWRIGHT_TEST_BASE_URL
	if (explicitBase) return explicitBase

	const nextPublic = process.env.NEXT_PUBLIC_APP_URL
	if (nextPublic) return nextPublic

	return 'http://localhost:3000'
}

const RESULTS_DIR = 'test-results'
const PRICING_DIR = join(RESULTS_DIR, 'pricing')
mkdirSync(PRICING_DIR, { recursive: true })

interface PricingAssessmentSummary {
	pageTitle: string
	hasNavbar: boolean
	hasPricingSection: boolean
	buttonCount: number
	headingCount: number
	imageCount: number
	containsPricingCopy: boolean
	containsPlanCopy: boolean
}

test.describe('Pricing Page Quality Assessment', () => {
	test('captures current pricing page baseline', async ({ page }, testInfo) => {
		const baseUrl = resolveBaseUrl()
		const targetUrl = `${baseUrl.replace(/\/$/, '')}/pricing`

		await page.goto(targetUrl)
		await page.waitForLoadState('networkidle')

		const pageTitle = await page.title()

		const [
			hasNavbar,
			hasPricingSection,
			buttonCount,
			imageCount,
			headingCount,
			pageText
		] = await Promise.all([
			page
				.locator('nav')
				.count()
				.then(count => count > 0),
			page
				.locator('section')
				.count()
				.then(count => count > 0),
			page.locator('button').count(),
			page.locator('img').count(),
			page.locator('h1, h2, h3').count(),
			page.locator('body').innerText()
		])

		const summary: PricingAssessmentSummary = {
			pageTitle,
			hasNavbar,
			hasPricingSection,
			buttonCount,
			headingCount,
			imageCount,
			containsPricingCopy: pageText.toLowerCase().includes('pricing'),
			containsPlanCopy: pageText.toLowerCase().includes('plan')
		}

		const summaryPath = join(PRICING_DIR, 'pricing-summary.json')
		writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

		await testInfo.attach('pricing-summary', {
			contentType: 'application/json',
			body: Buffer.from(JSON.stringify(summary, null, 2))
		})

		const desktopScreenshot = await page.screenshot({
			path: join(PRICING_DIR, 'pricing-desktop.png'),
			fullPage: true
		})

		await testInfo.attach('pricing-desktop', {
			contentType: 'image/png',
			body: desktopScreenshot
		})

		await page.setViewportSize({ width: 375, height: 667 })
		const mobileScreenshot = await page.screenshot({
			path: join(PRICING_DIR, 'pricing-mobile.png'),
			fullPage: true
		})

		await testInfo.attach('pricing-mobile', {
			contentType: 'image/png',
			body: mobileScreenshot
		})

		await page.setViewportSize({ width: 1920, height: 1080 })

		expect(
			summary.hasPricingSection || summary.containsPricingCopy
		).toBeTruthy()
	})
})
