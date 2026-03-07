/**
 * Comprehensive Tenant Management E2E Tests
 * Generated from actual UI exploration using Playwright MCP
 * Tests empty states, modals, forms, and navigation flows
 */

import { expect, test } from '@playwright/test'

test.describe('Tenant Management - Empty State and UI', () => {
	test.use({ storageState: 'playwright/.auth/owner.json' })

	test('tenant page loads with empty state and stats', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

		await test.step('Navigate to tenants page', async () => {
			await page.goto(`${baseUrl}/tenants`)
			await page.waitForLoadState('domcontentloaded')
		})

		await test.step('Verify page title and breadcrumbs', async () => {
			await expect(page).toHaveTitle(/Tenants.*TenantFlow/)
			await expect(
				page.getByRole('heading', { name: 'Tenants', level: 1 })
			).toBeVisible()
		})

		await test.step('Verify empty state stats', async () => {
			// Total Tenants
			await expect(page.getByText('Total Tenants')).toBeVisible()
			await expect(
				page.locator('text=/Total Tenants/').locator('..').getByText('0')
			).toBeVisible()

			// Active Tenants
			await expect(page.getByText('Active Tenants')).toBeVisible()
			await expect(
				page.locator('text=/Active Tenants/').locator('..').getByText('0')
			).toBeVisible()

			// Financial Stats
			await expect(page.getByText('Overdue Balance')).toBeVisible()
			await expect(page.getByText('$0.00')).toBeVisible()
		})

		await test.step('Verify empty directory table', async () => {
			await expect(
				page.getByRole('heading', { name: 'Tenant Directory', level: 2 })
			).toBeVisible()
			await expect(page.getByText('No results.')).toBeVisible()
		})

		await test.step('Verify action buttons present', async () => {
			await expect(
				page.getByRole('link', { name: /Invite Tenant/i })
			).toBeVisible()
			await expect(
				page.getByPlaceholder(/Filter by tenant name/i)
			).toBeVisible()
		})
	})

	test('invite tenant modal opens and displays form', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

		await test.step('Navigate to tenants page', async () => {
			await page.goto(`${baseUrl}/tenants`)
			await page.waitForLoadState('domcontentloaded')
		})

		await test.step('Click Invite Tenant button', async () => {
			await page.getByRole('link', { name: /Invite Tenant/i }).click()
			await page.waitForURL(/.*\/tenants\/new/)
		})

		await test.step('Verify modal opened with correct URL', async () => {
			expect(page.url()).toContain('/tenants/new')
		})

		await test.step('Verify Tenant Information section', async () => {
			// Section heading
			await expect(page.getByText('Tenant Information')).toBeVisible()

			// Required fields
			await expect(page.getByPlaceholder(/John/i).first()).toBeVisible() // First Name
			await expect(page.getByPlaceholder(/Smith/i)).toBeVisible() // Last Name
			await expect(
				page.getByPlaceholder(/john\.smith@example\.com/i)
			).toBeVisible() // Email

			// Optional fields
			await expect(page.getByPlaceholder(/\(555\) 123-4567/i)).toBeVisible() // Phone
			await expect(
				page.getByPlaceholder(/Emergency contact name/i)
			).toBeVisible() // Emergency Contact
		})

		await test.step('Verify Lease Assignment section', async () => {
			// Section heading
			await expect(page.getByText('Lease Assignment')).toBeVisible()

			// Property dropdown
			await expect(
				page.getByRole('combobox', { name: /Property/i })
			).toBeVisible()
			await expect(page.getByText('Select a property')).toBeVisible()

			// Disabled Unit dropdown (no properties exist)
			const unitCombobox = page.getByRole('combobox', {
				name: /Unit.*Optional/i
			})
			await expect(unitCombobox).toBeDisabled()

			// Financial fields
			await expect(
				page.getByRole('spinbutton', { name: /Monthly Rent/i })
			).toBeVisible()
			await expect(
				page.getByRole('spinbutton', { name: /Security Deposit/i })
			).toBeVisible()

			// Date fields
			await expect(
				page.getByRole('textbox', { name: /Lease Start Date/i })
			).toBeVisible()
			await expect(
				page.getByRole('textbox', { name: /Lease End Date/i })
			).toBeVisible()
		})

		await test.step('Verify action buttons', async () => {
			await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible()
			await expect(
				page.getByRole('button', { name: /Create & Invite Tenant/i })
			).toBeVisible()
		})

		await test.step('Close modal with Escape key', async () => {
			await page.keyboard.press('Escape')
			await page.waitForURL(/.*\/tenants$/)
			expect(page.url()).not.toContain('/new')
		})
	})

	test('property dropdown shows empty state', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

		await test.step('Open invite tenant modal', async () => {
			await page.goto(`${baseUrl}/tenants/new`)
			await page.waitForLoadState('domcontentloaded')
		})

		await test.step('Click property dropdown', async () => {
			const propertyDropdown = page
				.getByRole('combobox', { name: /Property/i })
				.first()
			await propertyDropdown.click()
		})

		await test.step('Verify property dropdown is expanded', async () => {
			// The dropdown should be expanded (will show empty list or no properties message)
			const propertyDropdown = page
				.getByRole('combobox', { name: /Property/i })
				.first()
			await expect(propertyDropdown).toHaveAttribute('aria-expanded', 'true')
		})
	})

	test('tenant search filter is functional', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

		await test.step('Navigate to tenants page', async () => {
			await page.goto(`${baseUrl}/tenants`)
			await page.waitForLoadState('domcontentloaded')
		})

		await test.step('Type in search filter', async () => {
			const searchInput = page.getByPlaceholder(/Filter by tenant name/i)
			await searchInput.fill('John Doe')
			await expect(searchInput).toHaveValue('John Doe')
		})

		await test.step('Clear search filter', async () => {
			const searchInput = page.getByPlaceholder(/Filter by tenant name/i)
			await searchInput.clear()
			await expect(searchInput).toHaveValue('')
		})
	})
})

test.describe('Property Management - Empty State and UI', () => {
	test.use({ storageState: 'playwright/.auth/owner.json' })

	test('properties page loads with empty state and stats', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

		await test.step('Navigate to properties page', async () => {
			await page.goto(`${baseUrl}/properties`)
			await page.waitForLoadState('domcontentloaded')
		})

		await test.step('Verify page title and heading', async () => {
			await expect(page).toHaveTitle(/Properties.*TenantFlow/)
			await expect(
				page.getByRole('heading', { name: 'Properties', level: 1 })
			).toBeVisible()
		})

		await test.step('Verify empty state stats', async () => {
			// Total Properties
			await expect(page.getByText('Total Properties')).toBeVisible()
			await expect(
				page.locator('text=/Total Properties/').locator('..').getByText('0')
			).toBeVisible()

			// Occupancy Rate
			await expect(page.getByText('Occupancy Rate')).toBeVisible()
			await expect(page.getByText('0.0%')).toBeVisible()

			// Vacant Units
			await expect(page.getByText('Vacant Units')).toBeVisible()

			// Total Monthly Rent
			await expect(page.getByText('Total Monthly Rent')).toBeVisible()
			await expect(page.getByText('$0')).toBeVisible()
		})

		await test.step('Verify empty portfolio state', async () => {
			await expect(
				page.getByRole('heading', { name: 'Portfolio', level: 2 })
			).toBeVisible()
			await expect(
				page.getByRole('heading', { name: 'No properties yet', level: 3 })
			).toBeVisible()
			await expect(
				page.getByText(/Get started by adding your first property/i)
			).toBeVisible()
		})

		await test.step('Verify action buttons', async () => {
			await expect(
				page.getByRole('button', { name: /Bulk Import/i })
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: /New Property/i })
			).toBeVisible()
		})

		await test.step('Verify view switcher', async () => {
			const gridView = page.getByRole('radio', { name: /Grid/i })
			const tableView = page.getByRole('radio', { name: /Table/i })

			await expect(gridView).toBeVisible()
			await expect(tableView).toBeVisible()
			await expect(gridView).toBeChecked()
		})
	})

	test('new property modal opens and displays form', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

		await test.step('Navigate to properties page', async () => {
			await page.goto(`${baseUrl}/properties`)
			await page.waitForLoadState('domcontentloaded')
		})

		await test.step('Click New Property button', async () => {
			await page.getByRole('link', { name: /New Property/i }).click()
			await page.waitForURL(/.*\/properties\/new/)
		})

		await test.step('Verify modal opened', async () => {
			expect(page.url()).toContain('/properties/new')
		})

		await test.step('Verify property form fields', async () => {
			// Property Name (required)
			const nameInput = page.getByPlaceholder(/e\.g\. Sunset Apartments/i)
			await expect(nameInput).toBeVisible()
			await expect(nameInput).toHaveAttribute(
				'placeholder',
				'e.g. Sunset Apartments'
			)

			// Property Type (required dropdown)
			await expect(page.getByText('Single Family')).toBeVisible()

			// Address fields
			await expect(page.getByPlaceholder('123 Main St')).toBeVisible()
			await expect(page.getByPlaceholder(/Apt, Suite, Unit/i)).toBeVisible()

			// City, State, ZIP
			await expect(page.getByPlaceholder('City')).toBeVisible()
			await expect(page.getByPlaceholder('CA')).toBeVisible()
			await expect(page.getByPlaceholder('12345')).toBeVisible()

			// Country dropdown
			await expect(page.getByText('United States')).toBeVisible()
		})

		await test.step('Verify image upload notice', async () => {
			await expect(
				page.getByText(/Save property first to upload images/i)
			).toBeVisible()
		})

		await test.step('Verify action buttons', async () => {
			await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible()
			await expect(
				page.getByRole('button', { name: /Create Property/i })
			).toBeVisible()
		})

		await test.step('Close modal with Close button', async () => {
			await page.getByRole('button', { name: /Close/i }).click()
			await page.waitForURL(/.*\/properties$/)
			expect(page.url()).not.toContain('/new')
		})
	})

	test('property type dropdown is functional', async ({ page }) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

		await test.step('Open new property modal', async () => {
			await page.goto(`${baseUrl}/properties/new`)
			await page.waitForLoadState('domcontentloaded')
		})

		await test.step('Verify property type dropdown default', async () => {
			await expect(page.getByText('Single Family')).toBeVisible()
		})

		await test.step('Click property type dropdown', async () => {
			const propertyTypeDropdown = page
				.getByRole('combobox')
				.filter({ hasText: 'Single Family' })
				.first()
			await propertyTypeDropdown.click()
		})
	})
})

test.describe('Navigation Between Pages', () => {
	test.use({ storageState: 'playwright/.auth/owner.json' })

	test('navigate between dashboard, tenants, and properties', async ({
		page
	}) => {
		const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'

		await test.step('Start at dashboard', async () => {
			await page.goto(`${baseUrl}/dashboard`)
			await page.waitForLoadState('domcontentloaded')
			await expect(page).toHaveURL(/^\/$/)
		})

		await test.step('Navigate to Tenants via sidebar', async () => {
			await page.getByRole('link', { name: /Tenants/i }).click()
			await page.waitForLoadState('domcontentloaded')
			await expect(page).toHaveURL(/^\/tenants/)
			await expect(
				page.getByRole('heading', { name: 'Tenants', level: 1 })
			).toBeVisible()
		})

		await test.step('Navigate to Properties via sidebar', async () => {
			await page.getByRole('link', { name: /Properties/i }).click()
			await page.waitForLoadState('domcontentloaded')
			await expect(page).toHaveURL(/^\/properties/)
			await expect(
				page.getByRole('heading', { name: 'Properties', level: 1 })
			).toBeVisible()
		})

		await test.step('Navigate back to Dashboard via sidebar', async () => {
			await page.getByRole('link', { name: /Dashboard/i }).click()
			await page.waitForLoadState('domcontentloaded')
			await expect(page).toHaveURL(/^\/$/)
		})

		await test.step('Navigate using breadcrumbs', async () => {
			await page.goto(`${baseUrl}/tenants/new`)
			await page.waitForLoadState('domcontentloaded')

			const tenantsLink = page
				.getByRole('navigation', { name: /breadcrumb/i })
				.getByRole('link', { name: /Tenants/i })
			await tenantsLink.click()
			await page.waitForLoadState('domcontentloaded')
			await expect(page).toHaveURL(/^\/tenants$/)
		})
	})
})
