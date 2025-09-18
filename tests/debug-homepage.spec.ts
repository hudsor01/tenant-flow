import { test, expect } from '@playwright/test'

test('debug homepage buttons', async ({ page }) => {
	await page.goto('/')
	await page.waitForLoadState('networkidle')

	// Take full page screenshot
	await page.screenshot({ path: 'homepage-debug.png', fullPage: true })

	// Log page info
	console.log('Page title:', await page.title())
	console.log('Page URL:', page.url())

	// Find all buttons
	const buttons = await page.locator('button').all()
	console.log(`Found ${buttons.length} buttons`)

	for (let i = 0; i < Math.min(buttons.length, 10); i++) {
		const button = buttons[i]
		const text = await button.textContent()
		const classes = await button.getAttribute('class')
		const visible = await button.isVisible()
		console.log(`Button ${i}: "${text}" classes: "${classes}" visible: ${visible}`)
	}

	// Also check for links that might be styled as buttons
	const links = await page.locator('a[class*="btn"], a[class*="button"]').all()
	console.log(`Found ${links.length} button-styled links`)

	for (let i = 0; i < Math.min(links.length, 5); i++) {
		const link = links[i]
		const text = await link.textContent()
		const classes = await link.getAttribute('class')
		const visible = await link.isVisible()
		console.log(`Link ${i}: "${text}" classes: "${classes}" visible: ${visible}`)
	}
})