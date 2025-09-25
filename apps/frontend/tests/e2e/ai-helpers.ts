/**
 * AI-like helpers for Playwright without requiring API keys
 * These utilities provide natural language-style test automation
 */

import { Locator, Page } from '@playwright/test'

export class AIHelpers {
	constructor(private page: Page) {}

	/**
	 * Common UI element patterns with semantic selectors
	 */
	private readonly patterns = {
		// Buttons
		'login button': [
			'button:has-text("Login")',
			'button:has-text("Sign In")',
			'[data-testid="login-button"]',
			'a:has-text("Login")'
		],
		'submit button': [
			'button[type="submit"]',
			'button:has-text("Submit")',
			'[data-testid="submit"]'
		],
		'save button': [
			'button:has-text("Save")',
			'[data-testid="save-button"]',
			'button[type="submit"]:has-text("Save")'
		],
		'cancel button': [
			'button:has-text("Cancel")',
			'[data-testid="cancel-button"]',
			'button:has-text("Close")'
		],
		'add button': [
			'button:has-text("Add")',
			'button:has-text("Create")',
			'[data-testid="add-button"]'
		],

		// Forms
		'email field': [
			'input[type="email"]',
			'input[name="email"]',
			'[data-testid="email-input"]',
			'input[placeholder*="email" i]'
		],
		'password field': [
			'input[type="password"]',
			'input[name="password"]',
			'[data-testid="password-input"]'
		],
		'search box': [
			'input[type="search"]',
			'input[placeholder*="search" i]',
			'[data-testid="search-input"]',
			'input[role="searchbox"]'
		],
		'name field': [
			'input[name="name"]',
			'input[placeholder*="name" i]',
			'[data-testid="name-input"]'
		],

		// Navigation
		dashboard: [
			'[data-testid="dashboard"]',
			'nav:has-text("Dashboard")',
			'a:has-text("Dashboard")'
		],
		'properties section': [
			'a:has-text("Properties")',
			'[data-testid="properties-link"]',
			'nav:has-text("Properties")'
		],
		'tenants section': [
			'a:has-text("Tenants")',
			'[data-testid="tenants-link"]',
			'nav:has-text("Tenants")'
		],

		// Common elements
		'loading spinner': [
			'.spinner',
			'[data-testid="loading"]',
			'[role="status"]',
			'.loading'
		],
		'error message': [
			'.error',
			'[role="alert"]',
			'[data-testid="error-message"]',
			'.text-\\[var\\(--color-error\\)\\]'
		],
		'success message': [
			'.success',
			'[data-testid="success-message"]',
			'.text-primary'
		],
		modal: ['[role="dialog"]', '[data-testid="modal"]', '.modal'],
		dropdown: ['select', '[role="combobox"]', '[data-testid*="select"]']
	}

	/**
	 * Find element using natural language
	 */
	async findElement(description: string): Promise<Locator | null> {
		const normalizedDesc = description.toLowerCase().trim()

		// Check predefined patterns
		for (const [pattern, selectors] of Object.entries(this.patterns)) {
			if (normalizedDesc.includes(pattern)) {
				for (const selector of selectors) {
					const element = this.page.locator(selector).first()
					if (await element.isVisible().catch(() => false)) {
						return element
					}
				}
			}
		}

		// Try to find by text content
		const textElement = this.page
			.getByText(description, { exact: false })
			.first()
		if (await textElement.isVisible().catch(() => false)) {
			return textElement
		}

		// Try role-based selection
		if (normalizedDesc.includes('button')) {
			return this.page
				.getByRole('button', { name: new RegExp(description, 'i') })
				.first()
		}
		if (normalizedDesc.includes('link')) {
			return this.page
				.getByRole('link', { name: new RegExp(description, 'i') })
				.first()
		}
		if (
			normalizedDesc.includes('textbox') ||
			normalizedDesc.includes('input')
		) {
			return this.page.getByRole('textbox').first()
		}

		return null
	}

	/**
	 * Perform action based on natural language instruction
	 */
	async action(instruction: string) {
		const lower = instruction.toLowerCase()

		// Click actions
		if (lower.includes('click')) {
			const target = instruction.replace(/click (on )?/i, '')
			const element = await this.findElement(target)
			if (element) {
				await element.click()
				return
			}
			throw new Error(`Could not find element: ${target}`)
		}

		// Type/fill actions
		if (
			lower.includes('type') ||
			lower.includes('fill') ||
			lower.includes('enter')
		) {
			const match = instruction.match(
				/(?:type|fill|enter)\s+"([^"]+)"\s+(?:in|into)?\s+(.+)/i
			)
			if (match) {
				const [, text, field] = match
				const element = await this.findElement(field)
				if (element) {
					await element.fill(text)
					return
				}
				throw new Error(`Could not find field: ${field}`)
			}
		}

		// Navigation
		if (lower.includes('go to') || lower.includes('navigate to')) {
			const target = instruction.replace(/(?:go|navigate)\s+to\s+/i, '')
			const element = await this.findElement(target)
			if (element) {
				await element.click()
				return
			}
		}

		// Submit form
		if (lower.includes('submit')) {
			await this.page.keyboard.press('Enter')
			return
		}

		// Press key
		if (lower.includes('press')) {
			const key = instruction.match(/press\s+(\w+)/i)?.[1]
			if (key) {
				await this.page.keyboard.press(key)
				return
			}
		}

		throw new Error(`Could not understand instruction: ${instruction}`)
	}

	/**
	 * Wait for condition using natural language
	 */
	async waitFor(condition: string, timeout = 10000) {
		const lower = condition.toLowerCase()

		// Wait for visibility
		if (lower.includes('visible') || lower.includes('appear')) {
			const target = condition
				.replace(/(?:is|are|becomes?)\s+(?:visible|appears?)/i, '')
				.trim()
			const element = await this.findElement(target)
			if (element) {
				await element.waitFor({ state: 'visible', timeout })
				return
			}
		}

		// Wait for invisibility
		if (lower.includes('disappear') || lower.includes('hidden')) {
			const target = condition
				.replace(/(?:disappears?|is hidden|becomes? hidden)/i, '')
				.trim()
			const element = await this.findElement(target)
			if (element) {
				await element.waitFor({ state: 'hidden', timeout })
				return
			}
		}

		// Wait for page load
		if (lower.includes('page') && lower.includes('load')) {
			await this.page.waitForLoadState('domcontentloaded')
			return
		}

		// Wait for network idle
		if (lower.includes('network') || lower.includes('requests')) {
			await this.page.waitForLoadState('networkidle')
			return
		}

		// Default: wait for element
		const element = await this.findElement(condition)
		if (element) {
			await element.waitFor({ state: 'visible', timeout })
			return
		}

		throw new Error(`Could not wait for: ${condition}`)
	}

	/**
	 * Extract data from page
	 */
	async query<T = any>(description: string): Promise<T> {
		const lower = description.toLowerCase()

		// Get text content
		if (lower.includes('text') || lower.includes('content')) {
			const target = description.replace(
				/(?:get|extract|find)\s+(?:text|content)\s+(?:of|from)?\s*/i,
				''
			)
			const element = await this.findElement(target)
			if (element) {
				return (await element.textContent()) as T
			}
		}

		// Get count
		if (lower.includes('count') || lower.includes('number')) {
			const target = description.replace(/(?:count|number)\s+(?:of)?\s*/i, '')
			const elements = await this.page.locator(target).all()
			return elements.length as T
		}

		// Get attribute
		if (lower.includes('attribute')) {
			const match = description.match(
				/attribute\s+"([^"]+)"\s+(?:of|from)\s+(.+)/i
			)
			if (match) {
				const [, attr, target] = match
				const element = await this.findElement(target)
				if (element) {
					return (await element.getAttribute(attr)) as T
				}
			}
		}

		// Get page title
		if (lower.includes('page title') || lower.includes('title')) {
			return (await this.page.title()) as T
		}

		// Get URL
		if (lower.includes('url') || lower.includes('address')) {
			return this.page.url() as T
		}

		throw new Error(`Could not query: ${description}`)
	}

	/**
	 * Assert condition
	 */
	async assert(assertion: string): Promise<boolean> {
		const lower = assertion.toLowerCase()

		// Check visibility
		if (lower.includes('visible') || lower.includes('shows')) {
			const target = assertion
				.replace(/(?:is|are|shows?)\s+(?:visible)?/i, '')
				.trim()
			const element = await this.findElement(target)
			if (element) {
				return await element.isVisible()
			}
			return false
		}

		// Check text content
		if (lower.includes('contains') || lower.includes('has text')) {
			const match = assertion.match(/(?:contains?|has text)\s+"([^"]+)"/i)
			if (match) {
				const text = match[1]
				const content = await this.page.textContent('body')
				return content?.includes(text) || false
			}
		}

		// Check element exists
		if (lower.includes('exists')) {
			const target = assertion.replace(/exists?/i, '').trim()
			const element = await this.findElement(target)
			return element !== null
		}

		return false
	}
}
