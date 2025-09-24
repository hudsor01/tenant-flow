import type { Locator, Page } from '@playwright/test'

/**
 * Dashboard Page Object Model
 * Encapsulates dashboard page elements and interactions
 */
export class DashboardPage {
	readonly page: Page
	readonly statsSection: Locator
	readonly propertyCard: Locator
	readonly tenantsList: Locator
	readonly maintenanceSection: Locator
	readonly recentActivityFeed: Locator
	readonly navigationSidebar: Locator
	readonly searchBar: Locator

	constructor(page: Page) {
		this.page = page
		this.statsSection = page.locator('[data-testid="dashboard-stats"]')
		this.propertyCard = page.locator('[data-testid="property-card"]')
		this.tenantsList = page.locator('[data-testid="tenants-list"]')
		this.maintenanceSection = page.locator(
			'[data-testid="maintenance-section"]'
		)
		this.recentActivityFeed = page.locator('[data-testid="activity-feed"]')
		this.navigationSidebar = page.locator('[data-testid="nav-sidebar"]')
		this.searchBar = page.locator('[data-testid="search-bar"]')
	}

	/**
	 * Navigate to dashboard
	 */
	async goto() {
		await this.page.goto('/dashboard')
		await this.page.waitForLoadState('networkidle')
	}

	/**
	 * Verify dashboard loaded successfully
	 */
	async verifyLoaded() {
		// wait for the stats section to be visible instead of using @playwright/test expect
		await this.statsSection.waitFor({ state: 'visible', timeout: 10000 })
		const url = this.page.url()
		if (!/\/dashboard/.test(url)) {
			throw new Error(`Unexpected URL after navigation: ${url}`)
		}
	}

	/**
	 * Get dashboard statistics
	 */
	async getStats() {
		const stats = {
			totalProperties: await this.page
				.locator('[data-testid="stat-total-properties"]')
				.textContent(),
			totalTenants: await this.page
				.locator('[data-testid="stat-total-tenants"]')
				.textContent(),
			occupancyRate: await this.page
				.locator('[data-testid="stat-occupancy-rate"]')
				.textContent(),
			monthlyRevenue: await this.page
				.locator('[data-testid="stat-monthly-revenue"]')
				.textContent()
		}
		return stats
	}

	/**
	 * Search for items in dashboard
	 */
	async search(query: string) {
		await this.searchBar.fill(query)
		await this.searchBar.press('Enter')

		// Wait for search results
		await this.page.waitForResponse(
			resp => resp.url().includes('/api/search') && resp.status() === 200,
			{ timeout: 10000 }
		)
	}

	/**
	 * Navigate to a specific section
	 */
	async navigateTo(
		section: 'properties' | 'tenants' | 'maintenance' | 'reports' | 'settings'
	) {
		await this.navigationSidebar
			.locator(`[data-testid="nav-${section}"]`)
			.click()
		await this.page.waitForURL(`**/${section}`, { timeout: 10000 })
	}

	/**
	 * Get property cards displayed
	 */
	async getPropertyCards() {
		// use count() + nth() to iterate locator items
		const count = await this.propertyCard.count()
		const properties: Array<{
			name?: string
			address?: string
			units?: string
		}> = []

		for (let i = 0; i < count; i++) {
			const card = this.propertyCard.nth(i)
			const name = await card
				.locator('[data-testid="property-name"]')
				.textContent()
			const address = await card
				.locator('[data-testid="property-address"]')
				.textContent()
			const units = await card
				.locator('[data-testid="property-units"]')
				.textContent()

			properties.push({
				name: name?.trim(),
				address: address?.trim(),
				units: units?.trim()
			})
		}

		return properties
	}

	/**
	 * Get recent activity items
	 */
	async getRecentActivity() {
		const itemsLocator = this.recentActivityFeed.locator(
			'[data-testid="activity-item"]'
		)
		const count = await itemsLocator.count()
		const activities: Array<{
			type: string | null
			message?: string
			timestamp?: string
		}> = []

		for (let i = 0; i < count; i++) {
			const item = itemsLocator.nth(i)
			const type = await item.getAttribute('data-activity-type')
			const message = await item
				.locator('[data-testid="activity-message"]')
				.textContent()
			const timestamp = await item
				.locator('[data-testid="activity-timestamp"]')
				.textContent()

			activities.push({
				type,
				message: message?.trim(),
				timestamp: timestamp?.trim()
			})
		}

		return activities
	}

	/**
	 * Filter dashboard by date range
	 */
	async setDateRange(startDate: string, endDate: string) {
		await this.page.click('[data-testid="date-range-picker"]')
		await this.page.fill('[data-testid="start-date"]', startDate)
		await this.page.fill('[data-testid="end-date"]', endDate)
		await this.page.click('[data-testid="apply-date-range"]')

		// Wait for data refresh
		await this.page.waitForResponse(
			resp => resp.url().includes('/api/dashboard') && resp.status() === 200,
			{ timeout: 10000 }
		)
	}

	/**
	 * Verify dashboard data loaded
	 */
	async verifyDataLoaded() {
		// wait for stats value to be visible and not '0'
		const totalPropsText = await this.page
			.locator('[data-testid="stat-total-properties"]')
			.textContent()
		if (totalPropsText?.trim() === '0') {
			throw new Error(
				'Dashboard stats appear to be empty (total properties = 0)'
			)
		}

		// Verify at least one property card is displayed
		await this.propertyCard
			.first()
			.waitFor({ state: 'visible', timeout: 10000 })
	}

	/**
	 * Open quick actions menu
	 */
	async openQuickActions() {
		await this.page.click('[data-testid="quick-actions-button"]')
		await this.page.waitForSelector('[data-testid="quick-actions-menu"]', {
			state: 'visible',
			timeout: 5000
		})
	}

	/**
	 * Perform quick action
	 */
	async performQuickAction(
		action:
			| 'add-property'
			| 'add-tenant'
			| 'create-maintenance'
			| 'generate-report'
	) {
		await this.openQuickActions()
		await this.page.click(`[data-testid="quick-action-${action}"]`)

		// Wait for modal or navigation
		if (action === 'generate-report') {
			await this.page.waitForURL('**/reports/new', { timeout: 10000 })
		} else {
			await this.page.waitForSelector(`[data-testid="${action}-modal"]`, {
				state: 'visible',
				timeout: 10000
			})
		}
	}
}
