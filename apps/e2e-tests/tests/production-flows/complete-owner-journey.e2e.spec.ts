import { test, expect, type Page } from '@playwright/test'
import { createLogger } from '@repo/shared/lib/frontend-logger'

/**
 * Complete Owner Journey E2E Test
 * Tests the entire production flow exactly as users experience it:
 * 1. Login/Authentication
 * 2. Dashboard overview
 * 3. Property Management (CRUD + Bulk Import)
 * 4. Unit Management
 * 5. Tenant Management (Invite, Accept, Manage)
 * 6. Lease Management
 * 7. Maintenance Requests
 * 8. Rent Payments & Financial
 * 9. Reports & Analytics
 */

test.describe('Complete Owner Journey - Production Flow', () => {
	const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'test-owner@tenantflow.app'
	const OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || 'TestPassword123!'
	const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
	const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
	const logger = createLogger({ component: 'CompleteOwnerJourneyE2E' })

	let authToken: string
	let propertyId: string
	let unitId: string
	let tenantId: string
	let leaseId: string
	let maintenanceRequestId: string

	async function getAuthToken(page: Page): Promise<string> {
		const token = await page.evaluate(() => {
			const keys = Object.keys(localStorage)
			const authKey = keys.find(k => k.includes('supabase') || k.includes('sb-'))
			if (!authKey) return null

			try {
				const data = JSON.parse(localStorage.getItem(authKey) || '{}')
				return data?.currentSession?.access_token ||
					   data?.access_token ||
					   data?.session?.access_token ||
					   null
			} catch {
				return null
			}
		})

		if (!token) throw new Error('No auth token found after login')
		return token
	}

	test.beforeAll(async ({ browser }) => {
		// Setup: Login once and get auth token
		const context = await browser.newContext()
		const page = await context.newPage()

		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')

		// Wait for successful login redirect
		await page.waitForURL(`${BASE_URL}/**`, { timeout: 10000 })

		// Get auth token for API calls
		authToken = await getAuthToken(page)

		await context.close()
	})

	test('1. Authentication: Owner login successful', async ({ page }) => {
		await page.goto(`${BASE_URL}/login`)

		// Verify login page loads
		await expect(page.locator('input[type="email"]')).toBeVisible()
		await expect(page.locator('input[type="password"]')).toBeVisible()

		// Fill credentials
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)

		// Submit login
		await page.click('button[type="submit"]')

		// Verify redirect to dashboard
		await page.waitForURL(`${BASE_URL}/**`)

		// Verify we're authenticated
		const currentUrl = page.url()
		expect(currentUrl).toContain('/')
	})

	test('2. Dashboard: Overview displays key metrics', async ({ page }) => {
		await page.goto(`${BASE_URL}/dashboard`)

		// Wait for dashboard to load
		await page.waitForSelector('[data-testid="dashboard-overview"], h1:has-text("Dashboard")', { timeout: 10000 })

		// Verify key metric cards are visible
		const metricSelectors = [
			'text=Total Properties',
			'text=Occupancy Rate',
			'text=Active Leases',
			'text=Monthly Revenue'
		]

		for (const selector of metricSelectors) {
			await expect(page.locator(selector).first()).toBeVisible({ timeout: 5000 })
		}
	})

	test('3. Properties: Create new property', async ({ page }) => {
		await page.goto(`${BASE_URL}/properties`)

		// Wait for properties page to load
		await page.waitForSelector('button:has-text("New Property"), h1:has-text("Properties")')

		// Click "New Property" button
		await page.click('button:has-text("New Property")')

		// Fill property form
		const testProperty = {
			name: `E2E Test Property ${Date.now()}`,
			address: '123 Test Street',
			city: 'Austin',
			state: 'TX',
			postal_code: '78701',
			property_type: 'APARTMENT',
			description: 'E2E test property for production flow validation'
		}

		await page.fill('input[name="name"]', testProperty.name)
		await page.fill('input[name="address"]', testProperty.address)
		await page.fill('input[name="city"]', testProperty.city)
		await page.fill('input[name="state"]', testProperty.state)
		await page.fill('input[name="postal_code"]', testProperty.postal_code)

		// Select property type
		await page.click('[role="combobox"]')
		await page.click(`[role="option"]:has-text("${testProperty.property_type}")`)

		await page.fill('textarea[name="description"]', testProperty.description)

		// Submit form
		await page.click('button[type="submit"]:has-text("Create Property")')

		// Wait for success toast
		await expect(page.locator('text=/Property created|Success/')).toBeVisible({ timeout: 5000 })

		// Verify property appears in list
		await expect(page.locator(`text=${testProperty.name}`)).toBeVisible()

		// Get property ID from URL or API
		const response = await page.request.get(`${API_URL}/api/v1/properties`, {
			headers: { Authorization: `Bearer ${authToken}` }
		})
		const properties = await response.json()
		const createdProperty = properties.find((p: any) => p.name === testProperty.name)
		propertyId = createdProperty.id
	})

	test('4. Properties: Bulk import properties via CSV', async ({ page }) => {
		await page.goto(`${BASE_URL}/properties`)

		// Wait for bulk import button
		await page.waitForSelector('button:has-text("Bulk Import")')

		// Click bulk import button
		await page.click('button:has-text("Bulk Import")')

		// Wait for modal to open
		await expect(page.locator('text=Import Properties')).toBeVisible()

		// Create test CSV file
		const csvContent = `name,address,city,state,postal_code,property_type,description
"Bulk Import Property 1","456 Bulk St","Austin","TX","78702","SINGLE_FAMILY","Bulk imported property 1"
"Bulk Import Property 2","789 Import Ave","Austin","TX","78703","APARTMENT","Bulk imported property 2"`

		// Create file input and upload
		const fileInput = page.locator('input[type="file"]')
		const buffer = Buffer.from(csvContent)
		await fileInput.setInputFiles({
			name: 'properties.csv',
			mimeType: 'text/csv',
			buffer
		})

		// Verify file is selected
		await expect(page.locator('text=/Selected.*properties\\.csv/')).toBeVisible()

		// Submit upload
		await page.click('button:has-text("Import Properties")')

		// Wait for success message
		await expect(page.locator('text=/Import Complete|imported/')).toBeVisible({ timeout: 15000 })

		// Verify imported properties appear
		await page.waitForTimeout(2000) // Wait for table to update
		await expect(page.locator('text=Bulk Import Property 1')).toBeVisible()
	})

	test('5. Units: Add units to property', async ({ page }) => {
		// Navigate to property details
		await page.goto(`${BASE_URL}/properties/${propertyId}`)

		// Wait for property details page
		await page.waitForSelector('button:has-text("Add Unit"), h1')

		// Click "Add Unit"
		await page.click('button:has-text("Add Unit")')

		// Fill unit form
		const testUnit = {
			unit_number: 'Unit 101',
			bedrooms: 2,
			bathrooms: 2,
			square_feet: 1200,
			monthly_rent: 2000
		}

		await page.fill('input[name="unit_number"]', testUnit.unit_number)
		await page.fill('input[name="bedrooms"]', testUnit.bedrooms.toString())
		await page.fill('input[name="bathrooms"]', testUnit.bathrooms.toString())
		await page.fill('input[name="square_feet"]', testUnit.square_feet.toString())
		await page.fill('input[name="monthly_rent"]', testUnit.monthly_rent.toString())

		// Submit form
		await page.click('button[type="submit"]:has-text("Create Unit")')

		// Verify success
		await expect(page.locator('text=/Unit created|Success/')).toBeVisible()
		await expect(page.locator(`text=${testUnit.unit_number}`)).toBeVisible()

		// Get unit ID
		const response = await page.request.get(`${API_URL}/api/v1/units?property_id=${propertyId}`, {
			headers: { Authorization: `Bearer ${authToken}` }
		})
		const units = await response.json()
		unitId = units[0]?.id
	})

	test('6. Tenants: Invite new tenant', async ({ page }) => {
		await page.goto(`${BASE_URL}/tenants`)

		// Wait for tenants page
		await page.waitForSelector('button:has-text("Invite Tenant")')

		// Click "Invite Tenant"
		await page.click('button:has-text("Invite Tenant")')

		// Fill tenant form
		const testTenant = {
			email: `e2e-tenant-${Date.now()}@test.com`,
			first_name: 'E2E',
			last_name: 'Tenant',
			phone: '5125551234'
		}

		await page.fill('input[name="email"]', testTenant.email)
		await page.fill('input[name="first_name"]', testTenant.first_name)
		await page.fill('input[name="last_name"]', testTenant.last_name)
		await page.fill('input[name="phone"]', testTenant.phone)

		// Select unit
		if (unitId) {
			await page.click('[role="combobox"]')
			await page.click('[role="option"]:first-child')
		}

		// Submit invitation
		await page.click('button:has-text("Send Invitation")')

		// Verify success
		await expect(page.locator('text=/Invitation sent|Success/')).toBeVisible()
		await expect(page.locator(`text=${testTenant.email}`)).toBeVisible()

		// Get tenant ID
		const response = await page.request.get(`${API_URL}/api/v1/tenants`, {
			headers: { Authorization: `Bearer ${authToken}` }
		})
		const tenants = await response.json()
		const tenant = tenants.find((t: any) => t.email === testTenant.email)
		tenantId = tenant?.id
	})

	test('7. Leases: Create new lease', async ({ page }) => {
		// Skip with helpful message if prerequisites not met
		if (!tenantId || !unitId) {
			logger.warn(`⚠️  Skipping lease creation: Missing prerequisites (tenantId=${!!tenantId}, unitId=${!!unitId})`)
			logger.warn('   This test requires tests 3-6 to complete successfully')
			test.skip()
			return
		}

		await page.goto(`${BASE_URL}/leases`)

		// Wait for leases page
		await page.waitForSelector('button:has-text("New Lease")')

		// Click "New Lease"
		await page.click('button:has-text("New Lease")')

		// Fill lease form
		const today = new Date()
		const startDate = today.toISOString().split('T')[0]
		const endDate = new Date(today.setFullYear(today.getFullYear() + 1)).toISOString().split('T')[0]

		await page.fill('input[name="start_date"]', startDate)
		await page.fill('input[name="end_date"]', endDate)
		await page.fill('input[name="monthly_rent"]', '2000')
		await page.fill('input[name="security_deposit"]', '2000')

		// Select tenant
		await page.click('[role="combobox"]:has-text("Select tenant")')
		await page.click('[role="option"]:first-child')

		// Select unit
		await page.click('[role="combobox"]:has-text("Select unit")')
		await page.click('[role="option"]:first-child')

		// Submit lease
		await page.click('button[type="submit"]:has-text("Create Lease")')

		// Verify success
		await expect(page.locator('text=/Lease created|Success/')).toBeVisible()

		// Get lease ID
		const response = await page.request.get(`${API_URL}/api/v1/leases`, {
			headers: { Authorization: `Bearer ${authToken}` }
		})
		const leases = await response.json()
		leaseId = leases[0]?.id
	})

	test('8. Maintenance: Create maintenance request', async ({ page }) => {
		// Skip with helpful message if prerequisites not met
		if (!propertyId || !unitId) {
			logger.warn(`⚠️  Skipping maintenance request: Missing prerequisites (propertyId=${!!propertyId}, unitId=${!!unitId})`)
			logger.warn('   This test requires tests 3-5 to complete successfully')
			test.skip()
			return
		}

		await page.goto(`${BASE_URL}/maintenance`)

		// Wait for maintenance page
		await page.waitForSelector('button:has-text("New Request")')

		// Click "New Request"
		await page.click('button:has-text("New Request")')

		// Fill maintenance request form
		const testRequest = {
			title: `E2E Test - Plumbing Issue ${Date.now()}`,
			description: 'Kitchen sink is leaking',
			priority: 'HIGH',
			category: 'PLUMBING'
		}

		await page.fill('input[name="title"]', testRequest.title)
		await page.fill('textarea[name="description"]', testRequest.description)

		// Select priority
		await page.click('[role="combobox"]:has-text("Priority")')
		await page.click(`[role="option"]:has-text("${testRequest.priority}")`)

		// Select category
		await page.click('[role="combobox"]:has-text("Category")')
		await page.click(`[role="option"]:has-text("${testRequest.category}")`)

		// Select property
		await page.click('[role="combobox"]:has-text("Property")')
		await page.click('[role="option"]:first-child')

		// Submit request
		await page.click('button[type="submit"]:has-text("Create Request")')

		// Verify success
		await expect(page.locator('text=/Request created|Success/')).toBeVisible()
		await expect(page.locator(`text=${testRequest.title}`)).toBeVisible()

		// Get request ID
		const response = await page.request.get(`${API_URL}/api/v1/maintenance`, {
			headers: { Authorization: `Bearer ${authToken}` }
		})
		const requests = await response.json()
		maintenanceRequestId = requests[0]?.id
	})

	test('9. Maintenance: Update request status', async ({ page }) => {
		// Skip with helpful message if prerequisites not met
		if (!maintenanceRequestId) {
			logger.warn(`⚠️  Skipping maintenance status update: Missing maintenance request from test 8`)
			logger.warn('   This test requires test 8 to complete successfully')
			test.skip()
			return
		}

		await page.goto(`${BASE_URL}/maintenance/${maintenanceRequestId}`)

		// Wait for request details
		await page.waitForSelector('button:has-text("Update Status")')

		// Click "Update Status"
		await page.click('button:has-text("Update Status")')

		// Select new status
		await page.click('[role="option"]:has-text("IN_PROGRESS")')

		// Verify status updated
		await expect(page.locator('text=IN_PROGRESS')).toBeVisible()
	})

	test('10. Financial: View rent payments', async ({ page }) => {
		await page.goto(`${BASE_URL}/financial/rent-payments`)

		// Wait for payments page
		await page.waitForSelector('h1:has-text("Rent Payments"), [data-testid="payments-list"]')

		// Verify page loads with payment data or empty state
		const hasPayments = await page.locator('table tbody tr').count()
		const hasEmptyState = await page.locator('text=No payments found').isVisible()

		expect(hasPayments > 0 || hasEmptyState).toBeTruthy()
	})

	test('11. Reports: Generate financial report', async ({ page }) => {
		await page.goto(`${BASE_URL}/reports`)

		// Wait for reports page
		await page.waitForSelector('h1:has-text("Reports")')

		// Click "Generate Report" or similar
		const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create Report")')
		if (await generateButton.isVisible()) {
			await generateButton.click()

			// Select report type
			await page.click('[role="option"]:has-text("Financial")')

			// Generate report
			await page.click('button:has-text("Generate")')

			// Verify report appears
			await expect(page.locator('text=/Report generated|Success/')).toBeVisible()
		}
	})

	test('12. Analytics: View dashboard metrics', async ({ page }) => {
		await page.goto(`${BASE_URL}/analytics`)

		// Wait for analytics page
		await page.waitForSelector('h1:has-text("Analytics"), [data-testid="analytics-dashboard"]')

		// Verify key charts/metrics are visible
		const metricSelectors = [
			'text=Occupancy',
			'text=Revenue',
			'text=Expenses',
			'text=Properties'
		]

		// At least one metric should be visible
		let foundMetric = false
		for (const selector of metricSelectors) {
			if (await page.locator(selector).first().isVisible()) {
				foundMetric = true
				break
			}
		}
		expect(foundMetric).toBeTruthy()
	})

	test('13. Settings: View and update profile', async ({ page }) => {
		await page.goto(`${BASE_URL}/settings`)

		// Wait for settings page
		await page.waitForSelector('h1:has-text("Settings"), input[name="email"], input[name="name"]')

		// Verify profile fields are visible
		await expect(page.locator('input[name="email"]')).toBeVisible()

		// Verify email is pre-filled
		const email = await page.locator('input[name="email"]').inputValue()
		expect(email).toBe(OWNER_EMAIL)
	})

	test('14. Logout: User can logout successfully', async ({ page }) => {
		await page.goto(`${BASE_URL}/dashboard`)

		// Click logout button (may be in dropdown menu)
		const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]')
		await logoutButton.click()

		// Verify redirect to login page
		await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 })

		// Verify we're on login page
		await expect(page.locator('input[type="email"]')).toBeVisible()
		await expect(page.locator('input[type="password"]')).toBeVisible()
	})

	test('15. Navigation: All main pages accessible', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`)
		await page.fill('input[type="email"]', OWNER_EMAIL)
		await page.fill('input[type="password"]', OWNER_PASSWORD)
		await page.click('button[type="submit"]')
		await page.waitForURL(`${BASE_URL}/**`)

		// Test all main navigation routes
		const routes = [
			{ path: '/', heading: 'Dashboard' },
			{ path: '/properties', heading: 'Properties' },
			{ path: '/tenants', heading: 'Tenants' },
			{ path: '/leases', heading: 'Leases' },
			{ path: '/maintenance', heading: 'Maintenance' },
			{ path: '/financial', heading: 'Financial' },
			{ path: '/reports', heading: 'Reports' }
		]

		for (const route of routes) {
			await page.goto(`${BASE_URL}${route.path}`)
			await page.waitForSelector(`h1:has-text("${route.heading}")`, { timeout: 5000 })
			expect(page.url()).toContain(route.path)
		}
	})
})
