import { expect, test } from '@playwright/test'

test.describe('Mobile nav at 375px viewport', () => {
	test.use({ viewport: { width: 375, height: 667 } })

	test.beforeEach(async ({ page }) => {
		await page.goto('/', { waitUntil: 'load' })
	})

	test('hero does not horizontally overflow viewport', async ({ page }) => {
		const overflow = await page.evaluate(() => ({
			bodyScrollWidth: document.body.scrollWidth,
			htmlScrollWidth: document.documentElement.scrollWidth,
			viewport: window.innerWidth
		}))
		expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1)
		expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.viewport + 1)
	})

	test('"Start Managing Properties" CTA is fully visible', async ({ page }) => {
		const cta = page.getByRole('link', { name: /Start Managing Properties/i })
		await expect(cta).toBeVisible()
		const box = await cta.boundingBox()
		expect(box).not.toBeNull()
		expect(box!.x).toBeGreaterThanOrEqual(0)
		expect(box!.x + box!.width).toBeLessThanOrEqual(375 + 1)
	})

	test('hamburger toggle is visible top-right with 44x44 hit target', async ({
		page
	}) => {
		const toggle = page.getByTestId('mobile-nav-toggle')
		await expect(toggle).toBeVisible()
		await expect(toggle).toHaveAttribute('aria-label', 'Open navigation menu')
		const box = await toggle.boundingBox()
		expect(box!.width).toBeGreaterThanOrEqual(44)
		expect(box!.height).toBeGreaterThanOrEqual(44)
	})

	test('tapping hamburger opens drawer with all 7 items', async ({ page }) => {
		await page.getByTestId('mobile-nav-toggle').click()
		const drawer = page.getByRole('dialog')
		await expect(drawer).toBeVisible()
		await expect(drawer.getByRole('link', { name: /^Features$/ })).toBeVisible()
		await expect(drawer.getByRole('link', { name: /^Pricing$/ })).toBeVisible()
		await expect(drawer.getByRole('link', { name: /^Compare$/ })).toBeVisible()
		await expect(drawer.getByRole('link', { name: /^About$/ })).toBeVisible()
		await expect(drawer.getByRole('link', { name: /^Resources$/ })).toBeVisible()
		await expect(drawer.getByRole('link', { name: /^Sign In$/ })).toBeVisible()
		await expect(drawer.getByRole('link', { name: /Get Started/i })).toBeVisible()
	})

	test('tapping Pricing link closes drawer and navigates', async ({ page }) => {
		await page.getByTestId('mobile-nav-toggle').click()
		const drawer = page.getByRole('dialog')
		await expect(drawer).toBeVisible()
		await drawer.getByRole('link', { name: /^Pricing$/ }).click()
		await page.waitForURL('**/pricing')
		await expect(drawer).not.toBeVisible()
	})

	test('Escape key closes the drawer and restores focus to trigger', async ({
		page
	}) => {
		await page.getByTestId('mobile-nav-toggle').click()
		const drawer = page.getByRole('dialog')
		await expect(drawer).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(drawer).not.toBeVisible()
		await expect(page.getByTestId('mobile-nav-toggle')).toBeFocused()
	})

	test('clicking close button (X) closes the drawer', async ({ page }) => {
		await page.getByTestId('mobile-nav-toggle').click()
		const drawer = page.getByRole('dialog')
		await expect(drawer).toBeVisible()
		await drawer.getByRole('button', { name: /Close/i }).click()
		await expect(drawer).not.toBeVisible()
	})

	test('clicking outside the drawer closes it', async ({ page }) => {
		await page.getByTestId('mobile-nav-toggle').click()
		const drawer = page.getByRole('dialog')
		await expect(drawer).toBeVisible()
		// Coordinate-only outside-click: at 375px viewport with default SheetContent
		// (right-side drawer, w-3/4 = ~281px wide, left edge at ~94px), x:10 is safely
		// outside the drawer body and falls on the SheetOverlay. No locator needed —
		// avoids fragile [data-state="open"] selectors that match both overlay and content
		// in DOM order that's not guaranteed across Radix versions.
		await page.mouse.click(10, 100)
		await expect(drawer).not.toBeVisible()
	})
})
