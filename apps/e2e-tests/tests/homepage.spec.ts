import { expect, test } from '@playwright/test'
import type { TestInfo } from '@playwright/test'

async function attachText(testInfo: TestInfo, name: string, lines: string[]) {
	if (!lines.length) return
	await testInfo.attach(name, {
		contentType: 'text/plain',
		body: Buffer.from(lines.join('\n'), 'utf-8')
	})
}

test.describe('Homepage Smoke', () => {
	let consoleErrors: string[] = []
	let networkErrors: string[] = []

	test.beforeEach(async ({ page }) => {
		consoleErrors = []
		networkErrors = []

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		page.on('requestfailed', (request) => {
			networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`)
		})

		page.on('response', (response) => {
			if (response.status() >= 400) {
				networkErrors.push(`${response.url()} - Status: ${response.status()}`)
			}
		})
	})

	test('renders primary marketing content without errors', async ({ page }, testInfo) => {
		// Use 'load' to avoid waiting for long-running analytics/resources
		await page.goto('/', { waitUntil: 'load', timeout: 60000 })

		await expect(page).toHaveTitle(/TenantFlow/i)
		await expect(page.locator('nav')).toBeVisible()
		const headingText = await page.locator('h1').first().textContent()
		expect(headingText?.trim().length ?? 0).toBeGreaterThan(0)

		await attachText(testInfo, 'console-errors', consoleErrors)
		await attachText(testInfo, 'network-errors', networkErrors)

		const actionableNetworkErrors = networkErrors.filter(
			error => !error.includes('_next/image')
		)
		expect(consoleErrors).toHaveLength(0)
		expect(actionableNetworkErrors).toHaveLength(0)
	})

	test('login form shows required controls', async ({ page }) => {
	await page.goto('/login', { waitUntil: 'load', timeout: 60000 })

		await expect(page).toHaveTitle(/sign in|login|tenantflow/i)
		await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
		await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
		await expect(page.locator('[data-testid="login-button"]').first()).toBeVisible()
	})

	test('critical assets are applied', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' })

		const styles = await page.evaluate(() => {
			const computedStyles = window.getComputedStyle(document.body)
			return {
				hasStyles: computedStyles.length > 0,
				fontFamily: computedStyles.fontFamily
			}
		})

		expect(styles.hasStyles).toBeTruthy()
		expect(styles.fontFamily).not.toEqual('')
	})
})
