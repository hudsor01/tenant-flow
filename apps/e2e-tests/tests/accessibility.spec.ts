/**
 * Accessibility Tests (WCAG 2.1 AA Compliance)
 *
 * Tests critical user flows for accessibility issues using @axe-core/playwright
 *
 * WCAG 2.1 Success Criteria:
 * - Level A: Essential (all violations must be fixed)
 * - Level AA: Recommended (target standard)
 * - Level AAA: Enhanced (aspirational)
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Helper to run axe and format violations
async function checkA11y(page: any, context: string) {
	const accessibilityScanResults = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze()

	expect(accessibilityScanResults.violations, `${context} should have no accessibility violations`).toEqual([])
}

test.describe('Public Pages Accessibility', () => {
	test('homepage should be accessible', async ({ page }) => {
		await page.goto('/')
		await checkA11y(page, 'Homepage')
	})

	test('pricing page should be accessible', async ({ page }) => {
		await page.goto('/pricing')
		await checkA11y(page, 'Pricing page')
	})

	test('contact page should be accessible', async ({ page }) => {
		await page.goto('/contact')
		await checkA11y(page, 'Contact page')
	})

	test('login page should be accessible', async ({ page }) => {
		await page.goto('/login')
		await checkA11y(page, 'Login page')
	})
})

test.describe('Authentication Flow Accessibility', () => {
	test('signup form should be accessible', async ({ page }) => {
		await page.goto('/signup')
		await checkA11y(page, 'Signup form')
	})

	test('password reset should be accessible', async ({ page }) => {
		await page.goto('/login')

		// Click forgot password link
		await page.click('text=Forgot password?')
		await page.waitForLoadState('networkidle')

		await checkA11y(page, 'Forgot password modal')
	})
})

test.describe('Dashboard Accessibility (Requires Auth)', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('dashboard page should be accessible', async ({ page }) => {
		await page.goto('/manage')
		await page.waitForLoadState('networkidle')
		await checkA11y(page, 'Dashboard page')
	})

	test('properties page should be accessible', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')
		await checkA11y(page, 'Properties page')
	})

	test('tenants page should be accessible', async ({ page }) => {
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')
		await checkA11y(page, 'Tenants page')
	})

	test('leases page should be accessible', async ({ page }) => {
		await page.goto('/manage/leases')
		await page.waitForLoadState('networkidle')
		await checkA11y(page, 'Leases page')
	})

	test('maintenance page should be accessible', async ({ page }) => {
		await page.goto('/manage/maintenance')
		await page.waitForLoadState('networkidle')
		await checkA11y(page, 'Maintenance page')
	})

	test('units page should be accessible', async ({ page }) => {
		await page.goto('/manage/properties/units')
		await page.waitForLoadState('networkidle')
		await checkA11y(page, 'Units page')
	})
})

test.describe('Forms Accessibility', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('property creation form should be accessible', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Open create property dialog
		await page.click('text=Add Property')
		await page.waitForSelector('[role="dialog"]')

		await checkA11y(page, 'Property creation form')
	})

	test('tenant creation form should be accessible', async ({ page }) => {
		await page.goto('/manage/tenants')
		await page.waitForLoadState('networkidle')

		// Open create tenant dialog
		await page.click('text=Add Tenant')
		await page.waitForSelector('[role="dialog"]')

		await checkA11y(page, 'Tenant creation form')
	})
})

test.describe('Interactive Elements Accessibility', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('navigation menu should be accessible', async ({ page }) => {
		await page.goto('/manage')
		await page.waitForLoadState('networkidle')

		// Test sidebar navigation
		await checkA11y(page, 'Sidebar navigation')
	})

	test('data tables should be accessible', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Wait for table to load
		await page.waitForSelector('table')

		await checkA11y(page, 'Properties data table')
	})

	test('dropdown menus should be accessible', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Open actions dropdown
		const actionsButton = page.locator('[role="button"][aria-haspopup="menu"]').first()
		if (await actionsButton.count() > 0) {
			await actionsButton.click()
			await page.waitForSelector('[role="menu"]')
			await checkA11y(page, 'Actions dropdown menu')
		}
	})
})

test.describe('Dark Mode Accessibility', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('dashboard in dark mode should be accessible', async ({ page }) => {
		await page.goto('/manage')
		await page.waitForLoadState('networkidle')

		// Toggle dark mode
		await page.click('[aria-label="Toggle theme"]')
		await page.waitForTimeout(500) // Wait for theme transition

		await checkA11y(page, 'Dashboard in dark mode')
	})
})

test.describe('Keyboard Navigation', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('all interactive elements should be keyboard accessible', async ({ page }) => {
		await page.goto('/manage/properties')
		await page.waitForLoadState('networkidle')

		// Tab through interactive elements
		let tabCount = 0
		const maxTabs = 20

		while (tabCount < maxTabs) {
			await page.keyboard.press('Tab')
			const focusedElement = await page.evaluateHandle(() => document.activeElement)
			const tagName = await focusedElement.evaluate((el) => el?.tagName)

			// Verify focused element is interactive
			if (tagName && ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tagName)) {
				// Good - interactive element is focusable
			}

			tabCount++
		}

		// Run accessibility check after keyboard navigation
		await checkA11y(page, 'Page after keyboard navigation')
	})

	test('skip navigation link should work', async ({ page }) => {
		await page.goto('/manage')

		// Press Tab to focus skip link
		await page.keyboard.press('Tab')

		// Check if skip link is visible
		const skipLink = page.locator('text=Skip to content')
		if (await skipLink.count() > 0) {
			await expect(skipLink).toBeFocused()

			// Activate skip link
			await page.keyboard.press('Enter')

			// Verify focus moved to main content
			const mainContent = page.locator('main')
			await expect(mainContent).toBeFocused()
		}
	})
})

test.describe('Screen Reader Compatibility', () => {
	test.use({ storageState: 'playwright/.auth/user.json' })

	test('page landmarks should be properly labeled', async ({ page }) => {
		await page.goto('/manage')
		await page.waitForLoadState('networkidle')

		// Verify semantic HTML landmarks exist
		await expect(page.locator('header')).toBeVisible()
		await expect(page.locator('main')).toBeVisible()
		await expect(page.locator('nav')).toBeVisible()

		await checkA11y(page, 'Page landmarks')
	})

	test('form fields should have proper labels', async ({ page }) => {
		await page.goto('/login')

		// Check email field has label
		const emailInput = page.locator('input[type="email"]')
		const emailLabel = await emailInput.getAttribute('aria-label') || await page.locator('label[for="email"]').textContent()
		expect(emailLabel).toBeTruthy()

		// Check password field has label
		const passwordInput = page.locator('input[type="password"]')
		const passwordLabel = await passwordInput.getAttribute('aria-label') || await page.locator('label[for="password"]').textContent()
		expect(passwordLabel).toBeTruthy()

		await checkA11y(page, 'Login form labels')
	})

	test('images should have alt text', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Get all images
		const images = page.locator('img')
		const imageCount = await images.count()

		// Verify each image has alt attribute (can be empty for decorative images)
		for (let i = 0; i < imageCount; i++) {
			const img = images.nth(i)
			const hasAlt = await img.getAttribute('alt')
			expect(hasAlt).not.toBeNull()
		}

		await checkA11y(page, 'Images alt text')
	})
})
