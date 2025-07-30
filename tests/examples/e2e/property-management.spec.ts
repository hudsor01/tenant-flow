import { test, expect, Page } from '@playwright/test'
import { TestDataFactory, TestScenarios } from '../../config/test-data-factory'
import { PlaywrightTestHelper, DatabaseTestHelper } from '../../config/test-helpers'

/**
 * Example E2E Test: Property Management Flow
 * Tests complete user workflows for property management features
 */
test.describe('Property Management E2E', () => {
  let testLandlord: any
  let playwrightHelper: PlaywrightTestHelper

  test.beforeEach(async ({ page, browser }) => {
    // Setup test data
    await DatabaseTestHelper.setupDatabase()
    testLandlord = await TestDataFactory.createLandlord({
      email: 'landlord@e2e-test.com'
    })

    // Initialize Playwright helper
    playwrightHelper = new PlaywrightTestHelper(browser)
    await playwrightHelper.createContext()
    
    // Login user
    await playwrightHelper.loginUser(testLandlord.email, 'testPassword123')
  })

  test.afterEach(async () => {
    await playwrightHelper.cleanup()
    await DatabaseTestHelper.teardownDatabase()
  })

  test.describe('Property Creation', () => {
    test('should create new property with complete information', async ({ page }) => {
      // Navigate to properties page
      await page.goto('/dashboard/properties')
      await expect(page.locator('[data-testid="properties-title"]')).toBeVisible()

      // Click create property button
      await page.click('[data-testid="create-property-button"]')
      await expect(page.locator('[data-testid="property-form-modal"]')).toBeVisible()

      // Fill out property form
      await page.fill('[data-testid="property-name"]', 'Sunset Apartments')
      await page.fill('[data-testid="property-address"]', '123 Sunset Boulevard')
      await page.fill('[data-testid="property-city"]', 'Los Angeles')
      await page.selectOption('[data-testid="property-state"]', 'CA')
      await page.fill('[data-testid="property-zip"]', '90210')
      await page.selectOption('[data-testid="property-type"]', 'APARTMENT')
      
      // Property details
      await page.fill('[data-testid="property-bedrooms"]', '2')
      await page.fill('[data-testid="property-bathrooms"]', '2')
      await page.fill('[data-testid="property-sqft"]', '1200')
      await page.fill('[data-testid="property-rent"]', '2500')
      
      // Description and amenities
      await page.fill('[data-testid="property-description"]', 'Beautiful apartment with city views')
      await page.check('[data-testid="amenity-pool"]')
      await page.check('[data-testid="amenity-parking"]')
      await page.check('[data-testid="amenity-gym"]')

      // Submit form
      await page.click('[data-testid="save-property-button"]')

      // Wait for success message and redirection
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="success-toast"]')).toContainText('Property created successfully')

      // Verify property appears in list
      await expect(page.locator('[data-testid="property-item"]:has-text("Sunset Apartments")')).toBeVisible()
      
      // Verify property details
      await page.click('[data-testid="property-item"]:has-text("Sunset Apartments")')
      await expect(page.locator('[data-testid="property-detail-name"]')).toContainText('Sunset Apartments')
      await expect(page.locator('[data-testid="property-detail-address"]')).toContainText('123 Sunset Boulevard')
      await expect(page.locator('[data-testid="property-detail-rent"]')).toContainText('$2,500')
    })

    test('should validate required fields', async ({ page }) => {
      await page.goto('/dashboard/properties')
      await page.click('[data-testid="create-property-button"]')

      // Try to submit empty form
      await page.click('[data-testid="save-property-button"]')

      // Check for validation errors
      await expect(page.locator('[data-testid="error-property-name"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-property-address"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-property-city"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-property-state"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-property-zip"]')).toBeVisible()
    })

    test('should validate zip code format', async ({ page }) => {
      await page.goto('/dashboard/properties')
      await page.click('[data-testid="create-property-button"]')

      // Fill valid fields but invalid zip
      await page.fill('[data-testid="property-name"]', 'Test Property')
      await page.fill('[data-testid="property-address"]', '123 Test St')
      await page.fill('[data-testid="property-city"]', 'Test City')
      await page.selectOption('[data-testid="property-state"]', 'CA')
      await page.fill('[data-testid="property-zip"]', 'invalid-zip')

      await page.click('[data-testid="save-property-button"]')

      await expect(page.locator('[data-testid="error-property-zip"]')).toBeVisible()
      await expect(page.locator('[data-testid="error-property-zip"]')).toContainText('Invalid zip code format')
    })
  })

  test.describe('Property Editing', () => {
    test('should edit existing property', async ({ page }) => {
      // Create test property first
      const property = await TestDataFactory.createProperty(testLandlord.id, {
        name: 'Original Property Name'
      })

      await page.goto('/dashboard/properties')
      
      // Find and edit the property
      await page.click(`[data-testid="property-item-${property.id}"] [data-testid="edit-property-button"]`)
      await expect(page.locator('[data-testid="property-form-modal"]')).toBeVisible()

      // Update property name
      await page.fill('[data-testid="property-name"]', 'Updated Property Name')
      await page.fill('[data-testid="property-rent"]', '3000')

      // Save changes
      await page.click('[data-testid="save-property-button"]')

      // Verify updates
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="property-item"]:has-text("Updated Property Name")')).toBeVisible()
      await expect(page.locator('[data-testid="property-item"]:has-text("$3,000")')).toBeVisible()
    })

    test('should preserve existing data when editing', async ({ page }) => {
      const property = await TestDataFactory.createProperty(testLandlord.id, {
        name: 'Test Property',
        address: '456 Test Avenue',
        monthlyRent: 2000
      })

      await page.goto('/dashboard/properties')
      await page.click(`[data-testid="property-item-${property.id}"] [data-testid="edit-property-button"]`)

      // Verify form is pre-filled
      await expect(page.locator('[data-testid="property-name"]')).toHaveValue('Test Property')
      await expect(page.locator('[data-testid="property-address"]')).toHaveValue('456 Test Avenue')
      await expect(page.locator('[data-testid="property-rent"]')).toHaveValue('2000')

      // Change only one field
      await page.fill('[data-testid="property-name"]', 'Modified Test Property')
      await page.click('[data-testid="save-property-button"]')

      // Verify other fields remain unchanged
      await page.click(`[data-testid="property-item"] [data-testid="edit-property-button"]`)
      await expect(page.locator('[data-testid="property-name"]')).toHaveValue('Modified Test Property')
      await expect(page.locator('[data-testid="property-address"]')).toHaveValue('456 Test Avenue')
      await expect(page.locator('[data-testid="property-rent"]')).toHaveValue('2000')
    })
  })

  test.describe('Property Image Management', () => {
    test('should upload property images', async ({ page }) => {
      const property = await TestDataFactory.createProperty(testLandlord.id)

      await page.goto(`/dashboard/properties/${property.id}`)
      
      // Navigate to images section
      await page.click('[data-testid="property-images-tab"]')
      await expect(page.locator('[data-testid="image-upload-section"]')).toBeVisible()

      // Upload multiple images
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('[data-testid="upload-images-button"]')
      const fileChooser = await fileChooserPromise

      // Simulate file selection (would need actual test images in real implementation)
      await fileChooser.setFiles([
        'tests/fixtures/property-image-1.jpg',
        'tests/fixtures/property-image-2.jpg'
      ])

      // Wait for upload completion
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()

      // Verify images appear in gallery
      await expect(page.locator('[data-testid="property-image"]')).toHaveCount(2)
    })

    test('should set primary image', async ({ page }) => {
      const property = await TestDataFactory.createProperty(testLandlord.id, {
        images: ['image1.jpg', 'image2.jpg', 'image3.jpg']
      })

      await page.goto(`/dashboard/properties/${property.id}`)
      await page.click('[data-testid="property-images-tab"]')

      // Set second image as primary
      await page.hover('[data-testid="property-image"]:nth-child(2)')
      await page.click('[data-testid="property-image"]:nth-child(2) [data-testid="set-primary-button"]')

      // Verify primary image indicator
      await expect(page.locator('[data-testid="property-image"]:nth-child(2) [data-testid="primary-badge"]')).toBeVisible()
      
      // Verify it appears first in property list
      await page.goto('/dashboard/properties')
      const firstImage = page.locator(`[data-testid="property-item-${property.id}"] [data-testid="property-thumbnail"]`)
      await expect(firstImage).toHaveAttribute('src', /image2\.jpg/)
    })

    test('should delete property images', async ({ page }) => {
      const property = await TestDataFactory.createProperty(testLandlord.id, {
        images: ['image1.jpg', 'image2.jpg']
      })

      await page.goto(`/dashboard/properties/${property.id}`)
      await page.click('[data-testid="property-images-tab"]')

      // Delete first image
      await page.hover('[data-testid="property-image"]:first-child')
      await page.click('[data-testid="property-image"]:first-child [data-testid="delete-image-button"]')

      // Confirm deletion
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible()
      await page.click('[data-testid="confirm-delete-button"]')

      // Verify image is removed
      await expect(page.locator('[data-testid="property-image"]')).toHaveCount(1)
    })
  })

  test.describe('Property Search and Filtering', () => {
    test('should search properties by name', async ({ page }) => {
      // Create multiple properties
      await TestDataFactory.createProperty(testLandlord.id, { name: 'Sunset Apartments' })
      await TestDataFactory.createProperty(testLandlord.id, { name: 'Ocean View Condos' })
      await TestDataFactory.createProperty(testLandlord.id, { name: 'Mountain Lodge' })

      await page.goto('/dashboard/properties')

      // Search for specific property
      await page.fill('[data-testid="property-search"]', 'Sunset')
      await page.press('[data-testid="property-search"]', 'Enter')

      // Verify filtered results
      await expect(page.locator('[data-testid="property-item"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="property-item"]:has-text("Sunset Apartments")')).toBeVisible()
    })

    test('should filter properties by type', async ({ page }) => {
      await TestDataFactory.createProperty(testLandlord.id, { type: 'APARTMENT' })
      await TestDataFactory.createProperty(testLandlord.id, { type: 'SINGLE_FAMILY' })
      await TestDataFactory.createProperty(testLandlord.id, { type: 'CONDO' })

      await page.goto('/dashboard/properties')

      // Filter by apartment type
      await page.selectOption('[data-testid="property-type-filter"]', 'APARTMENT')

      // Verify filtered results
      await expect(page.locator('[data-testid="property-item"]')).toHaveCount(1)
    })

    test('should filter properties by rent range', async ({ page }) => {
      await TestDataFactory.createProperty(testLandlord.id, { monthlyRent: 1500 })
      await TestDataFactory.createProperty(testLandlord.id, { monthlyRent: 2500 })
      await TestDataFactory.createProperty(testLandlord.id, { monthlyRent: 3500 })

      await page.goto('/dashboard/properties')

      // Set rent range filter
      await page.fill('[data-testid="rent-min-filter"]', '2000')
      await page.fill('[data-testid="rent-max-filter"]', '3000')
      await page.click('[data-testid="apply-filters-button"]')

      // Verify filtered results
      await expect(page.locator('[data-testid="property-item"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="property-item"]:has-text("$2,500")')).toBeVisible()
    })

    test('should sort properties by different criteria', async ({ page }) => {
      await TestDataFactory.createProperty(testLandlord.id, { 
        name: 'A Property', 
        monthlyRent: 3000,
        createdAt: new Date('2024-01-01')
      })
      await TestDataFactory.createProperty(testLandlord.id, { 
        name: 'B Property', 
        monthlyRent: 1000,
        createdAt: new Date('2024-01-02')
      })

      await page.goto('/dashboard/properties')

      // Sort by rent (high to low)
      await page.selectOption('[data-testid="sort-properties"]', 'rent-desc')

      // Verify order
      const firstProperty = page.locator('[data-testid="property-item"]').first()
      await expect(firstProperty).toContainText('$3,000')

      // Sort by name (A to Z)
      await page.selectOption('[data-testid="sort-properties"]', 'name-asc')
      await expect(page.locator('[data-testid="property-item"]').first()).toContainText('A Property')
    })
  })

  test.describe('Property Deletion', () => {
    test('should delete property with confirmation', async ({ page }) => {
      const property = await TestDataFactory.createProperty(testLandlord.id, {
        name: 'Property To Delete'
      })

      await page.goto('/dashboard/properties')

      // Click delete button
      await page.click(`[data-testid="property-item-${property.id}"] [data-testid="delete-property-button"]`)

      // Confirm deletion in modal
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="delete-warning"]')).toContainText('This action cannot be undone')
      
      await page.fill('[data-testid="delete-confirmation-input"]', 'DELETE')
      await page.click('[data-testid="confirm-delete-button"]')

      // Verify property is removed
      await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
      await expect(page.locator('[data-testid="property-item"]:has-text("Property To Delete")')).not.toBeVisible()
    })

    test('should prevent deletion of property with active leases', async ({ page }) => {
      // Create property with active lease
      const scenario = await TestScenarios.landlordWithProperties()
      const propertyWithLease = scenario.properties[0]

      await page.goto('/dashboard/properties')

      // Try to delete property with active lease
      await page.click(`[data-testid="property-item-${propertyWithLease.id}"] [data-testid="delete-property-button"]`)

      // Should show warning about active leases
      await expect(page.locator('[data-testid="delete-blocked-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="delete-blocked-message"]')).toContainText('active leases')
      
      // Delete button should be disabled
      await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeDisabled()
    })
  })

  test.describe('Property Analytics', () => {
    test('should display property performance metrics', async ({ page }) => {
      const scenario = await TestScenarios.landlordWithProperties()
      const property = scenario.properties[0]

      await page.goto(`/dashboard/properties/${property.id}/analytics`)

      // Verify analytics sections are visible
      await expect(page.locator('[data-testid="occupancy-rate"]')).toBeVisible()
      await expect(page.locator('[data-testid="rental-income"]')).toBeVisible()
      await expect(page.locator('[data-testid="maintenance-costs"]')).toBeVisible()
      await expect(page.locator('[data-testid="vacancy-days"]')).toBeVisible()

      // Verify charts are rendered
      await expect(page.locator('[data-testid="income-chart"]')).toBeVisible()
      await expect(page.locator('[data-testid="occupancy-chart"]')).toBeVisible()
    })

    test('should filter analytics by date range', async ({ page }) => {
      const scenario = await TestScenarios.landlordWithProperties()
      const property = scenario.properties[0]

      await page.goto(`/dashboard/properties/${property.id}/analytics`)

      // Change date range to last 6 months
      await page.selectOption('[data-testid="analytics-date-range"]', '6months')

      // Verify data updates
      await expect(page.locator('[data-testid="loading-analytics"]')).toBeVisible()
      await expect(page.locator('[data-testid="loading-analytics"]')).not.toBeVisible()
      
      // Charts should re-render with new data
      await expect(page.locator('[data-testid="income-chart"]')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async ({ page, browser }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      const property = await TestDataFactory.createProperty(testLandlord.id)
      await page.goto('/dashboard/properties')

      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-property-list"]')).toBeVisible()
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()

      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]')
      await expect(page.locator('[data-testid="mobile-sidebar"]')).toBeVisible()

      // Test property card interaction on mobile
      await page.click('[data-testid="property-item"]')
      await expect(page.locator('[data-testid="property-detail-mobile"]')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should be accessible with keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard/properties')

      // Test keyboard navigation
      await page.press('body', 'Tab') // Focus first element
      await page.press('body', 'Tab') // Navigate to create button
      await page.press('body', 'Enter') // Activate create button

      await expect(page.locator('[data-testid="property-form-modal"]')).toBeVisible()

      // Navigate through form with keyboard
      await page.press('[data-testid="property-name"]', 'Tab')
      await expect(page.locator('[data-testid="property-address"]')).toBeFocused()
    })

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto('/dashboard/properties')

      // Check ARIA attributes
      await expect(page.locator('[data-testid="create-property-button"]')).toHaveAttribute('aria-label', 'Create new property')
      await expect(page.locator('[data-testid="property-search"]')).toHaveAttribute('aria-label', 'Search properties')
      await expect(page.locator('[data-testid="properties-list"]')).toHaveAttribute('role', 'list')
    })
  })
})