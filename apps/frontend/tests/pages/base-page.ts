import { Page, Locator, expect } from '@playwright/test'

/**
 * Base Page Object Model class for common functionality
 * Provides shared methods and patterns for all page objects
 */
export class BasePage {
	readonly page: Page

	constructor(page: Page) {
		this.page = page
	}

	/**
	 * Navigate to a specific URL
	 */
	async goto(url: string): Promise<void> {
		await this.page.goto(url)
	}

	/**
	 * Wait for page to load completely
	 */
	async waitForLoad(): Promise<void> {
		await this.page.waitForLoadState('networkidle')
	}

	/**
	 * Take a screenshot with optional name
	 */
	async screenshot(name?: string): Promise<Buffer> {
		const screenshotName = name || `screenshot-${Date.now()}`
		return await this.page.screenshot({ 
			path: `test-results/${screenshotName}.png`,
			fullPage: true 
		})
	}

	/**
	 * Wait for element to be visible and return it
	 */
	async waitForElement(selector: string): Promise<Locator> {
		const element = this.page.locator(selector)
		await expect(element).toBeVisible()
		return element
	}

	/**
	 * Fill form field with value
	 */
	async fillField(selector: string, value: string): Promise<void> {
		await this.page.fill(selector, value)
	}

	/**
	 * Click element with retry logic
	 */
	async clickElement(selector: string): Promise<void> {
		const element = this.page.locator(selector)
		await element.click()
	}

	/**
	 * Verify page title
	 */
	async verifyTitle(expectedTitle: string): Promise<void> {
		await expect(this.page).toHaveTitle(expectedTitle)
	}

	/**
	 * Verify URL contains text
	 */
	async verifyUrlContains(urlFragment: string): Promise<void> {
		await expect(this.page).toHaveURL(new RegExp(urlFragment))
	}
}
