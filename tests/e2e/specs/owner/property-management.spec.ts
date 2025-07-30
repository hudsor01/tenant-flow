import { test, expect } from '@playwright/test'
import { PropertyTestHelpers } from '../../helpers/property-helpers'
import { faker } from '@faker-js/faker'

test.describe('Property Management Flow', () => {
  let propertyHelpers: PropertyTestHelpers
  let testPropertyId: string

  test.beforeEach(async ({ page }) => {
    propertyHelpers = new PropertyTestHelpers(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    // Clean up test data
    if (testPropertyId) {
      await propertyHelpers.deleteProperty(testPropertyId)
    }
  })

  test('should complete full property lifecycle', async ({ page }) => {
    // Test data
    const propertyData = {
      name: `Test Property ${faker.location.street()}`,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      propertyType: 'SINGLE_FAMILY',
      bedrooms: '3',
      bathrooms: '2',
      rent: '1500',
      description: faker.lorem.paragraph(),
    }

    // Step 1: Create a new property
    await test.step('Create property', async () => {
      await page.click('[data-testid="add-property-button"]')
      await expect(page.locator('[data-testid="property-form-modal"]')).toBeVisible()

      // Fill property form
      await page.fill('[name="name"]', propertyData.name)
      await page.fill('[name="address"]', propertyData.address)
      await page.fill('[name="city"]', propertyData.city)
      await page.selectOption('[name="state"]', propertyData.state)
      await page.fill('[name="zipCode"]', propertyData.zipCode)
      await page.selectOption('[name="propertyType"]', propertyData.propertyType)
      await page.fill('[name="description"]', propertyData.description)

      // Submit form
      await page.click('[data-testid="submit-property-button"]')
      
      // Wait for success notification
      await expect(page.locator('[data-testid="success-notification"]')).toContainText('Property created successfully')
      
      // Verify property appears in list
      const propertyCard = page.locator(`[data-testid="property-card"]:has-text("${propertyData.name}")`)
      await expect(propertyCard).toBeVisible()
      
      // Get property ID for cleanup
      testPropertyId = await propertyCard.getAttribute('data-property-id') || ''
    })

    // Step 2: Add units to the property
    await test.step('Add units', async () => {
      await page.click(`[data-property-id="${testPropertyId}"]`)
      await page.waitForURL(/\/properties\/.*/)
      
      // Add first unit
      await page.click('[data-testid="add-unit-button"]')
      await expect(page.locator('[data-testid="unit-form-modal"]')).toBeVisible()
      
      await page.fill('[name="unitNumber"]', '101')
      await page.fill('[name="bedrooms"]', propertyData.bedrooms)
      await page.fill('[name="bathrooms"]', propertyData.bathrooms)
      await page.fill('[name="rent"]', propertyData.rent)
      await page.fill('[name="squareFeet"]', '1200')
      
      await page.click('[data-testid="submit-unit-button"]')
      await expect(page.locator('[data-testid="success-notification"]')).toContainText('Unit added successfully')
      
      // Verify unit appears
      await expect(page.locator('[data-testid="unit-card"]:has-text("Unit 101")')).toBeVisible()
    })

    // Step 3: Create a lease
    await test.step('Create lease', async () => {
      // Navigate to unit
      await page.click('[data-testid="unit-card"]:has-text("Unit 101")')
      
      // Start lease creation
      await page.click('[data-testid="create-lease-button"]')
      await expect(page.locator('[data-testid="lease-form-modal"]')).toBeVisible()
      
      // Fill tenant information
      const tenantData = {
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phone: faker.phone.number(),
      }
      
      await page.fill('[name="tenantEmail"]', tenantData.email)
      await page.fill('[name="tenantFirstName"]', tenantData.firstName)
      await page.fill('[name="tenantLastName"]', tenantData.lastName)
      await page.fill('[name="tenantPhone"]', tenantData.phone)
      
      // Fill lease details
      await page.fill('[name="startDate"]', new Date().toISOString().split('T')[0])
      await page.fill('[name="endDate"]', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      await page.fill('[name="rentAmount"]', propertyData.rent)
      await page.fill('[name="securityDeposit"]', propertyData.rent)
      
      await page.click('[data-testid="submit-lease-button"]')
      await expect(page.locator('[data-testid="success-notification"]')).toContainText('Lease created successfully')
    })

    // Step 4: Verify dashboard statistics update
    await test.step('Verify dashboard statistics', async () => {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      // Check property count
      const propertyCount = page.locator('[data-testid="stat-total-properties"]')
      await expect(propertyCount).toContainText(/\d+/)
      
      // Check occupancy rate
      const occupancyRate = page.locator('[data-testid="stat-occupancy-rate"]')
      await expect(occupancyRate).toContainText(/%/)
      
      // Check monthly revenue
      const monthlyRevenue = page.locator('[data-testid="stat-monthly-revenue"]')
      await expect(monthlyRevenue).toContainText('$')
    })

    // Step 5: Test property search and filters
    await test.step('Test search and filters', async () => {
      await page.goto('/properties')
      
      // Search by property name
      await page.fill('[data-testid="property-search"]', propertyData.name)
      await page.waitForTimeout(500) // Debounce delay
      
      // Verify only our property shows
      const propertyCards = page.locator('[data-testid="property-card"]')
      await expect(propertyCards).toHaveCount(1)
      await expect(propertyCards.first()).toContainText(propertyData.name)
      
      // Clear search
      await page.fill('[data-testid="property-search"]', '')
      
      // Filter by property type
      await page.selectOption('[data-testid="property-type-filter"]', 'SINGLE_FAMILY')
      await page.waitForTimeout(500)
      
      // Verify property still shows
      await expect(page.locator(`[data-testid="property-card"]:has-text("${propertyData.name}")`)).toBeVisible()
    })

    // Step 6: Test property update
    await test.step('Update property', async () => {
      await page.click(`[data-property-id="${testPropertyId}"]`)
      await page.click('[data-testid="edit-property-button"]')
      
      const updatedDescription = 'Updated: ' + faker.lorem.paragraph()
      await page.fill('[name="description"]', updatedDescription)
      
      await page.click('[data-testid="submit-property-button"]')
      await expect(page.locator('[data-testid="success-notification"]')).toContainText('Property updated successfully')
      
      // Verify update persisted
      await page.reload()
      await expect(page.locator('[data-testid="property-description"]')).toContainText(updatedDescription)
    })

    // Step 7: Generate and download report
    await test.step('Generate property report', async () => {
      await page.click('[data-testid="generate-report-button"]')
      
      // Wait for download
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="download-report-button"]')
      const download = await downloadPromise
      
      // Verify download
      expect(download.suggestedFilename()).toContain('property-report')
      expect(download.suggestedFilename()).toContain('.pdf')
    })
  })

  test('should handle property deletion with active lease', async ({ page }) => {
    // Create property with active lease using API helper
    const property = await propertyHelpers.createPropertyWithLease()
    testPropertyId = property.id

    await page.goto(`/properties/${property.id}`)
    
    // Attempt to delete property
    await page.click('[data-testid="delete-property-button"]')
    await expect(page.locator('[data-testid="confirm-delete-modal"]')).toBeVisible()
    
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Should show error about active lease
    await expect(page.locator('[data-testid="error-notification"]')).toContainText('Cannot delete property with active leases')
    
    // Property should still exist
    await page.reload()
    await expect(page.locator('[data-testid="property-name"]')).toContainText(property.name)
  })

  test('should calculate metrics correctly', async ({ page }) => {
    // Create multiple properties with different occupancy
    const properties = await Promise.all([
      propertyHelpers.createPropertyWithUnits(3, 3), // 100% occupied
      propertyHelpers.createPropertyWithUnits(4, 2), // 50% occupied
      propertyHelpers.createPropertyWithUnits(2, 0), // 0% occupied
    ])

    // Store IDs for cleanup
    properties.forEach(p => {
      testPropertyId = p.id // Will clean up in afterEach
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Verify calculated metrics
    const totalUnits = page.locator('[data-testid="stat-total-units"]')
    await expect(totalUnits).toContainText('9') // 3 + 4 + 2

    const occupiedUnits = page.locator('[data-testid="stat-occupied-units"]')
    await expect(occupiedUnits).toContainText('5') // 3 + 2 + 0

    const occupancyRate = page.locator('[data-testid="stat-occupancy-rate"]')
    const rateText = await occupancyRate.textContent()
    const rate = parseFloat(rateText?.replace('%', '') || '0')
    expect(rate).toBeCloseTo(55.6, 1) // 5/9 * 100
  })

  test('should handle concurrent property updates', async ({ page, context }) => {
    // Create a property
    const property = await propertyHelpers.createProperty()
    testPropertyId = property.id

    // Open property in two tabs
    const page2 = await context.newPage()
    await page.goto(`/properties/${property.id}/edit`)
    await page2.goto(`/properties/${property.id}/edit`)

    // Make different updates in each tab
    await page.fill('[name="name"]', 'Updated from Tab 1')
    await page2.fill('[name="name"]', 'Updated from Tab 2')

    // Submit both forms
    await page.click('[data-testid="submit-property-button"]')
    await page2.click('[data-testid="submit-property-button"]')

    // One should succeed, one should show conflict
    const notifications = [
      page.locator('[data-testid="success-notification"], [data-testid="error-notification"]'),
      page2.locator('[data-testid="success-notification"], [data-testid="error-notification"]')
    ]

    // Wait for both notifications
    await Promise.all(notifications.map(n => n.waitFor()))

    // Verify at least one succeeded
    const successCount = await page.locator('[data-testid="success-notification"]').count() +
                        await page2.locator('[data-testid="success-notification"]').count()
    expect(successCount).toBeGreaterThan(0)

    await page2.close()
  })
})