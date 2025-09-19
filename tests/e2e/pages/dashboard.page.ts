import { Page, Locator, expect } from '@playwright/test'

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
		this.maintenanceSection = page.locator('[data-testid="maintenance-section"]')
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
		await expect(this.statsSection).toBeVisible()
		await expect(this.page).toHaveURL(/\/dashboard/)
	}

	/**
	 * Get dashboard statistics
	 */
	async getStats() {
		const stats = {
			totalProperties: await this.page.locator('[data-testid="stat-total-properties"]').textContent(),
			totalTenants: await this.page.locator('[data-testid="stat-total-tenants"]').textContent(),
			occupancyRate: await this.page.locator('[data-testid="stat-occupancy-rate"]').textContent(),
			monthlyRevenue: await this.page.locator('[data-testid="stat-monthly-revenue"]').textContent()
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
	async navigateTo(section: 'properties' | 'tenants' | 'maintenance' | 'reports' | 'settings') {
		await this.navigationSidebar.locator(`[data-testid="nav-${section}"]`).click()
		await this.page.waitForURL(`**/${section}`, { timeout: 10000 })
	}

	/**
	 * Get property cards displayed
	 */
	async getPropertyCards() {
		const cards = await this.propertyCard.all()
		const properties = []

		for (const card of cards) {
			const name = await card.locator('[data-testid="property-name"]').textContent()
			const address = await card.locator('[data-testid="property-address"]').textContent()
			const units = await card.locator('[data-testid="property-units"]').textContent()

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
		const activityItems = await this.recentActivityFeed.locator('[data-testid="activity-item"]').all()
		const activities = []

		for (const item of activityItems) {
			const type = await item.getAttribute('data-activity-type')
			const message = await item.locator('[data-testid="activity-message"]').textContent()
			const timestamp = await item.locator('[data-testid="activity-timestamp"]').textContent()

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
		// Wait for stats to have non-zero values
		await expect(
			this.page.locator('[data-testid="stat-total-properties"]')
		).not.toHaveText('0')

		// Verify at least one property card is displayed
		await expect(this.propertyCard.first()).toBeVisible()
	}

	/**
	 * Open quick actions menu
	 */
	async openQuickActions() {
		await this.page.click('[data-testid="quick-actions-button"]')
		await expect(this.page.locator('[data-testid="quick-actions-menu"]')).toBeVisible()
	}

	/**
	 * Perform quick action
	 */
	async performQuickAction(action: 'add-property' | 'add-tenant' | 'create-maintenance' | 'generate-report') {
		await this.openQuickActions()
		await this.page.click(`[data-testid="quick-action-${action}"]`)

		// Wait for modal or navigation
		if (action === 'generate-report') {
			await this.page.waitForURL('**/reports/new', { timeout: 10000 })
		} else {
			await expect(
				this.page.locator(`[data-testid="${action}-modal"]`)
			).toBeVisible()
		}
	}
}