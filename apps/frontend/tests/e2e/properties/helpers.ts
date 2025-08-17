/**
 * Test helpers and utilities for Properties E2E tests
 * Provides mock data, API response helpers, and common test utilities
 */

import { type Page, type APIResponse } from '@playwright/test'
import type { Property, Unit, PropertyStats } from '@repo/shared'

// Mock data generators
export function generateMockProperty(overrides?: Partial<Property>): Property {
	const id =
		overrides?.id ||
		`property-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	return {
		id,
		name: overrides?.name || `Test Property ${id.slice(-8)}`,
		address: overrides?.address || '123 Test Street',
		city: overrides?.city || 'Test City',
		state: overrides?.state || 'CA',
		zipCode: overrides?.zipCode || '90210',
		description: overrides?.description || 'Test property description',
		imageUrl: overrides?.imageUrl || null,
		ownerId: overrides?.ownerId || 'test-owner-id',
		propertyType: overrides?.propertyType || 'RESIDENTIAL',
		createdAt: overrides?.createdAt || new Date(),
		updatedAt: overrides?.updatedAt || new Date(),
		units: overrides?.units || []
	}
}

export function generateMockUnit(
	propertyId: string,
	overrides?: Partial<Unit>
): Unit {
	const id =
		overrides?.id ||
		`unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
	return {
		id,
		unitNumber:
			overrides?.unitNumber ||
			`Unit ${Math.floor(Math.random() * 100) + 1}`,
		propertyId,
		bedrooms: overrides?.bedrooms || Math.floor(Math.random() * 4) + 1,
		bathrooms: overrides?.bathrooms || Math.floor(Math.random() * 3) + 1,
		squareFeet:
			overrides?.squareFeet || Math.floor(Math.random() * 1000) + 500,
		monthlyRent:
			overrides?.monthlyRent || Math.floor(Math.random() * 2000) + 1000,
		securityDeposit:
			overrides?.securityDeposit ||
			Math.floor(Math.random() * 2000) + 500,
		description: overrides?.description || 'Test unit description',
		amenities: overrides?.amenities || [
			'Air Conditioning',
			'In-unit Laundry'
		],
		status: overrides?.status || 'VACANT',
		lastInspectionDate: overrides?.lastInspectionDate || null,
		createdAt: overrides?.createdAt || new Date(),
		updatedAt: overrides?.updatedAt || new Date()
	}
}

export function generateMockProperties(count: number = 5): Property[] {
	return Array.from({ length: count }, (_, index) => {
		const property = generateMockProperty({
			name: `Property ${index + 1}`,
			propertyType: index % 2 === 0 ? 'RESIDENTIAL' : 'COMMERCIAL'
		})

		// Add some units to each property
		const unitCount = Math.floor(Math.random() * 5) + 1
		property.units = Array.from({ length: unitCount }, () => {
			const unit = generateMockUnit(property.id)
			// Some units should be occupied
			if (Math.random() > 0.3) {
				unit.status = 'OCCUPIED'
			}
			return unit
		})

		return property
	})
}

export function generateMockStats(): PropertyStats {
	const totalUnits = Math.floor(Math.random() * 50) + 10
	const occupiedUnits = Math.floor(totalUnits * (0.7 + Math.random() * 0.3))

	return {
		totalUnits,
		occupiedUnits,
		vacantUnits: totalUnits - occupiedUnits,
		occupancyRate: Math.round((occupiedUnits / totalUnits) * 100),
		totalMonthlyRent: Math.floor(Math.random() * 50000) + 10000,
		potentialRent: Math.floor(Math.random() * 60000) + 15000,
		totalProperties: Math.floor(Math.random() * 10) + 5
	}
}

// API response mocking helpers
export class PropertiesApiMocker {
	constructor(private page: Page) {}

	async mockGetProperties(properties: Property[] = generateMockProperties()) {
		await this.page.route('**/api/properties', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(properties)
			})
		})
		return properties
	}

	async mockGetProperty(property: Property) {
		await this.page.route(
			`**/api/properties/${property.id}`,
			async route => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(property)
				})
			}
		)
	}

	async mockCreateProperty(newProperty: Property) {
		await this.page.route('**/api/properties', async route => {
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify(newProperty)
				})
			}
		})
	}

	async mockUpdateProperty(updatedProperty: Property) {
		await this.page.route(
			`**/api/properties/${updatedProperty.id}`,
			async route => {
				if (route.request().method() === 'PUT') {
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(updatedProperty)
					})
				}
			}
		)
	}

	async mockDeleteProperty(propertyId: string) {
		await this.page.route(
			`**/api/properties/${propertyId}`,
			async route => {
				if (route.request().method() === 'DELETE') {
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({ success: true })
					})
				}
			}
		)
	}

	async mockGetStats(stats: PropertyStats = generateMockStats()) {
		await this.page.route('**/api/properties/stats', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(stats)
			})
		})
		return stats
	}

	async mockApiError(
		endpoint: string,
		status: number = 500,
		message: string = 'Internal Server Error'
	) {
		await this.page.route(endpoint, async route => {
			await route.fulfill({
				status,
				contentType: 'application/json',
				body: JSON.stringify({ error: message })
			})
		})
	}

	async clearMocks() {
		await this.page.unroute('**/api/properties**')
	}
}

// Page object helpers
export class PropertiesPageHelpers {
	constructor(private page: Page) {}

	// Navigation helpers
	async goToPropertiesPage() {
		await this.page.goto('/properties')
		await this.page.waitForLoadState('networkidle')
	}

	// Search and filter helpers
	async searchProperties(query: string) {
		const searchInput = this.page.locator(
			'input[placeholder*="Search properties"]'
		)
		await searchInput.fill(query)
		await this.page.waitForTimeout(500) // Debounce
	}

	async filterByPropertyType(type: string) {
		const filterButton = this.page.getByRole('button', { name: /filters/i })
		await filterButton.click()

		const typeSelect = this.page.locator('select')
		await typeSelect.selectOption(type)
		await this.page.waitForTimeout(500)
	}

	async clearFilters() {
		const filterButton = this.page.getByRole('button', { name: /filters/i })
		await filterButton.click()

		const typeSelect = this.page.locator('select')
		await typeSelect.selectOption('')
	}

	// CRUD operation helpers
	async clickAddProperty() {
		const addButton = this.page.getByRole('button', {
			name: /add property/i
		})
		await addButton.click()
	}

	async clickViewProperty(propertyName: string) {
		const propertyRow = this.page
			.locator(`text=${propertyName}`)
			.locator('..')
		const viewButton = propertyRow.getByRole('button').first()
		await viewButton.click()
	}

	async clickEditProperty(propertyName: string) {
		const propertyRow = this.page
			.locator(`text=${propertyName}`)
			.locator('..')
		const editButton = propertyRow.getByRole('button').nth(1)
		await editButton.click()
	}

	// Form helpers
	async fillPropertyForm(property: Partial<Property>) {
		if (property.name) {
			await this.page.fill('input[name="name"]', property.name)
		}
		if (property.address) {
			await this.page.fill('input[name="address"]', property.address)
		}
		if (property.city) {
			await this.page.fill('input[name="city"]', property.city)
		}
		if (property.state) {
			await this.page.fill('input[name="state"]', property.state)
		}
		if (property.zipCode) {
			await this.page.fill('input[name="zipCode"]', property.zipCode)
		}
		if (property.description) {
			await this.page.fill(
				'textarea[name="description"]',
				property.description
			)
		}
		if (property.propertyType) {
			await this.page.selectOption(
				'select[name="propertyType"]',
				property.propertyType
			)
		}
	}

	async submitForm() {
		const submitButton = this.page.getByRole('button', {
			name: /save|create|update/i
		})
		await submitButton.click()
	}

	async cancelForm() {
		const cancelButton = this.page.getByRole('button', { name: /cancel/i })
		await cancelButton.click()
	}

	// Delete confirmation helpers
	async confirmDelete() {
		const deleteButton = this.page.getByRole('button', {
			name: /delete|confirm/i
		})
		await deleteButton.click()
	}

	async cancelDelete() {
		const cancelButton = this.page.getByRole('button', { name: /cancel/i })
		await cancelButton.click()
	}

	// Assertion helpers
	async expectPropertyInTable(propertyName: string) {
		const propertyRow = this.page.locator(`text=${propertyName}`)
		await propertyRow.waitFor({ state: 'visible' })
		return propertyRow
	}

	async expectPropertyNotInTable(propertyName: string) {
		const propertyRow = this.page.locator(`text=${propertyName}`)
		await propertyRow.waitFor({ state: 'hidden' })
	}

	async expectEmptyState() {
		const emptyState = this.page.locator('text=No properties yet')
		await emptyState.waitFor({ state: 'visible' })
		return emptyState
	}

	async expectLoadingState() {
		const skeleton = this.page.locator('[data-testid="skeleton"]').first()
		await skeleton.waitFor({ state: 'visible' })
		return skeleton
	}

	async expectErrorState() {
		const errorAlert = this.page.locator('[role="alert"]')
		await errorAlert.waitFor({ state: 'visible' })
		return errorAlert
	}
}

// Wait helpers for async operations
export class WaitHelpers {
	constructor(private page: Page) {}

	async waitForPropertiesLoad() {
		// Wait for either properties to load or empty state
		await this.page.waitForFunction(
			() => {
				const hasProperties = document.querySelector(
					'[data-testid="property-row"]'
				)
				const hasEmptyState = document.querySelector(
					'text=No properties yet'
				)
				const hasError = document.querySelector('[role="alert"]')
				return hasProperties || hasEmptyState || hasError
			},
			{ timeout: 10000 }
		)
	}

	async waitForDialogOpen(title: string) {
		const dialog = this.page.locator(`[role="dialog"]`)
		await dialog.waitFor({ state: 'visible' })
		const dialogTitle = dialog.locator(`text=${title}`)
		await dialogTitle.waitFor({ state: 'visible' })
	}

	async waitForDialogClose() {
		const dialog = this.page.locator(`[role="dialog"]`)
		await dialog.waitFor({ state: 'hidden' })
	}

	async waitForToast(message: string) {
		const toast = this.page.locator(`text=${message}`)
		await toast.waitFor({ state: 'visible' })
		return toast
	}
}

// Accessibility test helpers
export class AccessibilityHelpers {
	constructor(private page: Page) {}

	async testKeyboardNavigation() {
		// Test Tab navigation through interactive elements
		const interactiveElements = [
			'button:visible',
			'input:visible',
			'select:visible',
			'textarea:visible',
			'a:visible'
		]

		for (const selector of interactiveElements) {
			const elements = await this.page.locator(selector).all()
			for (const element of elements) {
				await element.focus()
				await this.page.waitForTimeout(100)
			}
		}
	}

	async testAriaLabels() {
		const results = await this.page.evaluate(() => {
			const inputs = document.querySelectorAll('input, select, textarea')
			const missing: string[] = []

			inputs.forEach(input => {
				const hasLabel = document.querySelector(
					`label[for="${input.id}"]`
				)
				const hasAriaLabel = input.getAttribute('aria-label')
				const hasAriaLabelledby = input.getAttribute('aria-labelledby')

				if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby) {
					missing.push(input.outerHTML)
				}
			})

			return missing
		})

		return results
	}

	async testFocusManagement() {
		// Test that focus is properly managed in modals and drawers
		const focusableElements = await this.page
			.locator(
				'button:visible, input:visible, select:visible, textarea:visible, a:visible'
			)
			.all()

		for (const element of focusableElements) {
			await element.focus()
			const focused = await this.page.evaluate(
				() => document.activeElement?.tagName
			)
			if (!focused) {
				throw new Error(
					`Element ${await element.textContent()} is not focusable`
				)
			}
		}
	}
}
