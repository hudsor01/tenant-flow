import { Page, Locator } from '@playwright/test'
import { BasePage } from './base-page'

/**
 * Page Object Model for the main Dashboard page
 * Encapsulates elements and actions for the TailAdmin dashboard
 */
export class DashboardPage extends BasePage {
	// Navigation elements
	readonly sidebar: Locator
	readonly propertiesLink: Locator
	readonly tenantsLink: Locator
	readonly leasesLink: Locator
	readonly maintenanceLink: Locator
	readonly paymentsLink: Locator

	// Header elements
	readonly userDropdown: Locator
	readonly notificationDropdown: Locator
	readonly themeToggle: Locator

	// Main content
	readonly pageTitle: Locator
	readonly breadcrumb: Locator
	readonly statsCards: Locator

	constructor(page: Page) {
		super(page)
		
		// Sidebar navigation
		this.sidebar = this.page.locator('aside')
		this.propertiesLink = this.page.locator('a[href="/dashboard/properties"]')
		this.tenantsLink = this.page.locator('a[href="/dashboard/tenants"]')
		this.leasesLink = this.page.locator('a[href="/dashboard/leases"]')
		this.maintenanceLink = this.page.locator('a[href="/dashboard/maintenance"]')
		this.paymentsLink = this.page.locator('a[href="/dashboard/payments"]')

		// Header elements
		this.userDropdown = this.page.locator('[data-testid="user-dropdown"]')
		this.notificationDropdown = this.page.locator('[data-testid="notification-dropdown"]')
		this.themeToggle = this.page.locator('[data-testid="theme-toggle"]')

		// Main content
		this.pageTitle = this.page.locator('h1, h2').first()
		this.breadcrumb = this.page.locator('nav ol')
		this.statsCards = this.page.locator('[data-testid="stats-card"]')
	}

	/**
	 * Navigate to the dashboard
	 */
	async goto(): Promise<void> {
		await super.goto('/dashboard')
		await this.waitForLoad()
	}

	/**
	 * Navigate to Properties section
	 */
	async goToProperties(): Promise<void> {
		await this.propertiesLink.click()
		await this.verifyUrlContains('/dashboard/properties')
	}

	/**
	 * Navigate to Tenants section
	 */
	async goToTenants(): Promise<void> {
		await this.tenantsLink.click()
		await this.verifyUrlContains('/dashboard/tenants')
	}

	/**
	 * Navigate to Leases section
	 */
	async goToLeases(): Promise<void> {
		await this.leasesLink.click()
		await this.verifyUrlContains('/dashboard/leases')
	}

	/**
	 * Navigate to Maintenance section
	 */
	async goToMaintenance(): Promise<void> {
		await this.maintenanceLink.click()
		await this.verifyUrlContains('/dashboard/maintenance')
	}

	/**
	 * Navigate to Payments section
	 */
	async goToPayments(): Promise<void> {
		await this.paymentsLink.click()
		await this.verifyUrlContains('/dashboard/payments')
	}

	/**
	 * Verify dashboard has loaded correctly
	 */
	async verifyDashboardLoaded(): Promise<void> {
		await this.waitForElement('aside')
		await this.waitForElement('[data-testid="stats-card"]')
	}
}
