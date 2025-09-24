/**
 * AI-Powered Playwright Testing
 * Uses Claude Code to generate and run tests based on natural language descriptions
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test'

export class AITestHelper {
  constructor(private page: Page) {}

  /**
   * Smart element finder using multiple strategies
   */
  async findElement(description: string) {
    const strategies = [
      // Data testid (preferred)
      () => this.page.getByTestId(description.toLowerCase().replace(/\s+/g, '-')),

      // Role-based
      () => this.page.getByRole('button', { name: new RegExp(description, 'i') }),
      () => this.page.getByRole('link', { name: new RegExp(description, 'i') }),
      () => this.page.getByRole('textbox', { name: new RegExp(description, 'i') }),

      // Text content
      () => this.page.getByText(description),
      () => this.page.getByText(new RegExp(description, 'i')),

      // Label
      () => this.page.getByLabel(description),
      () => this.page.getByLabel(new RegExp(description, 'i')),

      // Placeholder
      () => this.page.getByPlaceholder(description),
      () => this.page.getByPlaceholder(new RegExp(description, 'i')),

      // CSS selectors for common patterns
      () => this.page.locator(`button:has-text("${description}")`),
      () => this.page.locator(`a:has-text("${description}")`),
      () => this.page.locator(`[aria-label*="${description}" i]`),
      () => this.page.locator(`[title*="${description}" i]`),
      () => this.page.locator(`[alt*="${description}" i]`)
    ]

    for (const strategy of strategies) {
      try {
        const element = strategy()
        if (await element.isVisible({ timeout: 1000 })) {
          return element
        }
      } catch {
        continue
      }
    }

    throw new Error(`Could not find element: ${description}`)
  }

  /**
   * Natural language actions
   */
  async click(description: string) {
    const element = await this.findElement(description)
    await element.click()
  }

  async fill(fieldDescription: string, value: string) {
    const element = await this.findElement(fieldDescription)
    await element.fill(value)
  }

  async type(fieldDescription: string, value: string) {
    const element = await this.findElement(fieldDescription)
    await element.type(value)
  }

  async expectVisible(description: string) {
    const element = await this.findElement(description)
    await expect(element).toBeVisible()
  }

  async expectText(description: string, expectedText: string) {
    const element = await this.findElement(description)
    await expect(element).toContainText(expectedText)
  }

  async waitFor(description: string, timeout = 10000) {
    const element = await this.findElement(description)
    await element.waitFor({ state: 'visible', timeout })
  }

  /**
   * Complex workflow helpers
   */
  async loginFlow(email: string, password: string) {
    await this.click('login')
    await this.fill('email', email)
    await this.fill('password', password)
    await this.click('submit')
  }

  async createProperty(propertyData: {
    name: string
    address: string
    units?: number
    rent?: number
  }) {
    await this.click('add property')
    await this.fill('property name', propertyData.name)
    await this.fill('address', propertyData.address)

    if (propertyData.units) {
      await this.fill('units', propertyData.units.toString())
    }

    if (propertyData.rent) {
      await this.fill('rent', propertyData.rent.toString())
    }

    await this.click('save')
  }

  async navigateToSection(section: string) {
    const sections = ['dashboard', 'properties', 'tenants', 'maintenance', 'reports']
    if (sections.includes(section.toLowerCase())) {
      await this.click(section)
    } else {
      throw new Error(`Unknown section: ${section}`)
    }
  }

  /**
   * Debugging helpers
   */
  async debugCurrentPage() {
    const title = await this.page.title()
    const url = this.page.url()
    const headings = await this.page.locator('h1, h2, h3').allTextContents()


    return { title, url, headings }
  }

  async getAllButtons() {
    const buttons = await this.page.locator('button, [role="button"], a').allTextContents()
    return buttons.filter(text => text.trim().length > 0)
  }

  async getAllInputs() {
    const inputs = await this.page.locator('input, textarea, select').evaluateAll(elements =>
      elements.map(el => ({
        type: el.tagName.toLowerCase(),
        name: (el as HTMLInputElement).name || '',
        placeholder: (el as HTMLInputElement).placeholder || '',
        id: el.id || '',
        label: el.getAttribute('aria-label') || ''
      }))
    )
    return inputs
  }
}

// Test fixture
export const aiTest = test.extend<{ ai: AITestHelper }>({
  ai: async ({ page }, testUse) => {
    const ai = new AITestHelper(page)
    await testUse(ai)
  }
})

export { expect } from '@playwright/test'