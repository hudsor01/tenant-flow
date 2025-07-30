import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection, waitForLoadingComplete, setMobileViewport, setDesktopViewport, takeScreenshot, uploadTestFile } from '../utils/test-helpers'
import { TestData } from '../utils/test-users'

test.describe('Enhanced Property Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'LANDLORD')
    await waitForLoadingComplete(page)
    
    // Wait for initial data to load
    await waitForApiResponse(page, '/properties')
  })

  test('should display properties with enhanced cards and analytics', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Should show existing test properties
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(2)
    
    // Verify each property card contains essential information
    const firstCard = page.locator('[data-testid="property-card"]').first()
    await expect(firstCard.locator('[data-testid="property-name"]')).toContainText('Test Property 1')
    await expect(firstCard.locator('[data-testid="property-address"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="property-rent"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="property-status"]')).toBeVisible()
    
    // Should show key metrics on cards
    await expect(firstCard.locator('[data-testid="occupancy-rate"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="monthly-revenue"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="unit-count"]')).toBeVisible()
    
    // Should show property images
    await expect(firstCard.locator('[data-testid="property-image"]')).toBeVisible()
    
    // Test card hover interactions
    await firstCard.hover()
    await expect(firstCard.locator('[data-testid="quick-actions"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="quick-edit"]')).toBeVisible()
    await expect(firstCard.locator('[data-testid="quick-view"]')).toBeVisible()
    
    // Test view toggles
    await page.click('[data-testid="view-toggle-list"]')
    await expect(page.locator('[data-testid="property-list-view"]')).toBeVisible()
    
    await page.click('[data-testid="view-toggle-grid"]')
    await expect(page.locator('[data-testid="property-grid-view"]')).toBeVisible()
    
    // Test property summary statistics
    await expect(page.locator('[data-testid="total-properties"]')).toContainText('2')
    await expect(page.locator('[data-testid="total-units"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="average-occupancy"]')).toBeVisible()
  })

  test('should create a new property with enhanced wizard', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click add property button
    await page.click('[data-testid="add-property-button"]')
    await expect(page.locator('[data-testid="property-wizard-modal"]')).toBeVisible()
    
    // Step 1: Basic Information
    await expect(page.locator('[data-testid="wizard-step-1"]')).toHaveClass(/active/)
    
    const basicInfo = {
      'property-name': 'Luxury Downtown Apartments',
      'property-type': 'APARTMENT',
      'property-address': '789 Premium Boulevard',
      'property-city': 'Austin',
      'property-state': 'TX',
      'property-zip': '78701'
    }
    
    await fillForm(page, basicInfo)
    await page.click('[data-testid="next-step"]')
    
    // Step 2: Property Details
    await expect(page.locator('[data-testid="wizard-step-2"]')).toHaveClass(/active/)
    
    const propertyDetails = {
      'property-bedrooms': '2',
      'property-bathrooms': '2',
      'property-square-feet': '1200',
      'property-monthly-rent': '2500',
      'property-description': 'Modern luxury apartments in the heart of downtown Austin'
    }
    
    await fillForm(page, propertyDetails)
    
    // Add amenities
    await page.check('[data-testid="amenity-pool"]')
    await page.check('[data-testid="amenity-gym"]')
    await page.check('[data-testid="amenity-parking"]')
    
    await page.click('[data-testid="next-step"]')
    
    // Step 3: Media Upload
    await expect(page.locator('[data-testid="wizard-step-3"]')).toHaveClass(/active/)
    
    // Upload property images
    await uploadTestFile(page, '[data-testid="upload-exterior"]', 'building-exterior.jpg')
    await uploadTestFile(page, '[data-testid="upload-interior"]', 'apartment-interior.jpg')
    
    await page.click('[data-testid="next-step"]')
    
    // Step 4: Review & Submit
    await expect(page.locator('[data-testid="wizard-step-4"]')).toHaveClass(/active/)
    
    // Verify all information is displayed correctly
    await expect(page.locator('[data-testid="review-name"]')).toContainText('Luxury Downtown Apartments')
    await expect(page.locator('[data-testid="review-address"]')).toContainText('789 Premium Boulevard')
    await expect(page.locator('[data-testid="review-rent"]')).toContainText('$2,500')
    
    // Submit property
    await page.click('[data-testid="create-property"]')
    
    // Should show success toast
    await waitForToast(page, 'Property created successfully')
    
    // Should close modal and show new property in list
    await expect(page.locator('[data-testid="property-wizard-modal"]')).not.toBeVisible()
    await expect(page.locator('text=Luxury Downtown Apartments')).toBeVisible()
    
    // Should automatically navigate to property detail page
    await expect(page).toHaveURL(/\/properties\/[a-zA-Z0-9-]+/)
  })

  test('should edit an existing property with change tracking', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click edit button on first property
    await page.click('[data-testid="property-edit-button"]')
    await expect(page.locator('[data-testid="property-edit-modal"]')).toBeVisible()
    
    // Verify form is pre-filled with current values
    await expect(page.locator('[data-testid="property-name"]')).toHaveValue('Test Property 1')
    await expect(page.locator('[data-testid="property-address"]')).toHaveValue('123 Test Street')
    
    // Update multiple fields
    await page.fill('[data-testid="property-name"]', 'Updated Luxury Property 1')
    await page.fill('[data-testid="property-monthly-rent"]', '2200')
    await page.fill('[data-testid="property-description"]', 'Recently renovated luxury property with modern amenities')
    
    // Add new amenities
    await page.check('[data-testid="amenity-dishwasher"]')
    await page.check('[data-testid="amenity-washer-dryer"]')
    
    // Should show unsaved changes indicator
    await expect(page.locator('[data-testid="unsaved-changes-indicator"]')).toBeVisible()
    
    // Test form validation during edit
    await page.fill('[data-testid="property-monthly-rent"]', '')
    await expect(page.locator('[data-testid="rent-required-error"]')).toBeVisible()
    await page.fill('[data-testid="property-monthly-rent"]', '2200')
    
    // Preview changes before saving
    await page.click('[data-testid="preview-changes"]')
    await expect(page.locator('[data-testid="changes-preview-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="change-summary"]')).toContainText('3 changes will be made')
    
    await page.click('[data-testid="confirm-changes"]')
    
    // Submit form
    await page.click('[data-testid="save-property-changes"]')
    
    // Should show success toast with change summary
    await waitForToast(page, 'Property updated successfully')
    
    // Should show updated property in list
    await expect(page.locator('text=Updated Luxury Property 1')).toBeVisible()
    
    // Verify changes were applied by viewing property details
    await page.click('[data-testid="property-card"]:first-child')
    await expect(page.locator('[data-testid="property-header"]')).toContainText('Updated Luxury Property 1')
    await expect(page.locator('[data-testid="property-rent"]')).toContainText('$2,200')
  })

  test('should view comprehensive property details', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click on property card
    await page.click('[data-testid="property-card"]:first-child')
    
    // Should navigate to property detail page
    await expect(page).toHaveURL(/\/properties\/test-property-1/)
    
    // Should show property header with key info
    await expect(page.locator('[data-testid="property-header"]')).toContainText('Test Property 1')
    await expect(page.locator('[data-testid="property-address"]')).toContainText('123 Test Street')
    await expect(page.locator('[data-testid="property-rent"]')).toContainText('$2,000')
    
    // Should show property status indicators
    await expect(page.locator('[data-testid="occupancy-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="revenue-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="maintenance-status"]')).toBeVisible()
    
    // Test Overview Tab
    await page.click('[data-testid="property-overview-tab"]')
    await expect(page.locator('[data-testid="property-description"]')).toBeVisible()
    await expect(page.locator('[data-testid="property-amenities"]')).toBeVisible()
    await expect(page.locator('[data-testid="property-images"]')).toBeVisible()
    
    // Test Units Tab
    await page.click('[data-testid="property-units-tab"]')
    await expect(page.locator('[data-testid="units-summary"]')).toBeVisible()
    await expect(page.locator('[data-testid="add-unit-button"]')).toBeVisible()
    
    // Should show unit list or add first unit prompt
    const unitExists = await page.locator('[data-testid="unit-card"]').count()
    if (unitExists > 0) {
      await expect(page.locator('[data-testid="unit-card"]')).toBeVisible()
    } else {
      await expect(page.locator('[data-testid="no-units-message"]')).toBeVisible()
    }
    
    // Test Tenants Tab
    await page.click('[data-testid="property-tenants-tab"]')
    await expect(page.locator('[data-testid="tenants-summary"]')).toBeVisible()
    
    // Test Maintenance Tab
    await page.click('[data-testid="property-maintenance-tab"]')
    await expect(page.locator('[data-testid="maintenance-summary"]')).toBeVisible()
    await expect(page.locator('[data-testid="create-maintenance-request"]')).toBeVisible()
    
    // Test Financials Tab
    await page.click('[data-testid="property-financials-tab"]')
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="expense-breakdown"]')).toBeVisible()
    
    // Test Documents Tab
    await page.click('[data-testid="property-documents-tab"]')
    await expect(page.locator('[data-testid="document-upload-area"]')).toBeVisible()
    
    // Test Settings Tab
    await page.click('[data-testid="property-settings-tab"]')
    await expect(page.locator('[data-testid="property-settings-form"]')).toBeVisible()
  })

  test('should upload and manage property images', async ({ page }) => {
    await navigateToSection(page, 'properties')
    await page.click('[data-testid="property-card"]:first-child')
    
    // Navigate to media section
    await page.click('[data-testid="property-media-tab"]')
    
    // Upload multiple images
    await uploadTestFile(page, '[data-testid="upload-image-button"]', 'property-exterior.jpg')
    await uploadTestFile(page, '[data-testid="upload-image-button"]', 'property-interior.jpg')
    await uploadTestFile(page, '[data-testid="upload-image-button"]', 'property-kitchen.jpg')
    
    // Should show all uploaded images
    await expect(page.locator('[data-testid="property-image"]')).toHaveCount(3)
    
    // Test image reordering
    await page.dragAndDrop(
      '[data-testid="property-image"]:first-child',
      '[data-testid="property-image"]:last-child'
    )
    
    await waitForToast(page, 'Image order updated')
    
    // Test image deletion
    await page.hover('[data-testid="property-image"]:first-child')
    await page.click('[data-testid="delete-image-button"]')
    await page.click('[data-testid="confirm-delete"]')
    
    await waitForToast(page, 'Image deleted successfully')
    await expect(page.locator('[data-testid="property-image"]')).toHaveCount(2)
    
    // Test image zoom/lightbox
    await page.click('[data-testid="property-image"]:first-child')
    await expect(page.locator('[data-testid="image-lightbox"]')).toBeVisible()
    
    // Navigate between images in lightbox
    await page.click('[data-testid="next-image"]')
    await page.click('[data-testid="previous-image"]')
    
    // Close lightbox
    await page.click('[data-testid="close-lightbox"]')
    await expect(page.locator('[data-testid="image-lightbox"]')).not.toBeVisible()
  })

  test('should delete a property with safety checks', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click delete button on property
    await page.click('[data-testid="property-delete-button"]')
    
    // Should show comprehensive confirmation dialog
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible()
    await expect(page.locator('text=Are you sure you want to delete this property?')).toBeVisible()
    
    // Should show impact warnings
    await expect(page.locator('[data-testid="deletion-impact-warning"]')).toBeVisible()
    await expect(page.locator('text=This will also delete')).toBeVisible()
    
    // Should require typing property name for confirmation
    await expect(page.locator('[data-testid="property-name-confirmation"]')).toBeVisible()
    await page.fill('[data-testid="property-name-confirmation"]', 'Test Property 1')
    
    // Confirm deletion button should be enabled only after typing name
    await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeEnabled()
    
    // Test cancellation first
    await page.click('[data-testid="cancel-delete-button"]')
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible()
    
    // Try deletion again
    await page.click('[data-testid="property-delete-button"]')
    await page.fill('[data-testid="property-name-confirmation"]', 'Test Property 1')
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Should show loading state during deletion
    await expect(page.locator('[data-testid="deleting-spinner"]')).toBeVisible()
    
    // Should show success toast
    await waitForToast(page, 'Property deleted successfully')
    
    // Property should be removed from list
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(1)
    
    // Should redirect to properties list if we were on the deleted property's page
    await expect(page).toHaveURL(/\/properties$/)
  })

  test('should filter and search properties comprehensively', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Test text search
    await page.fill('[data-testid="property-search"]', 'Property 1')
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(1)
    await expect(page.locator('text=Test Property 1')).toBeVisible()
    
    // Clear search and test advanced filters
    await page.fill('[data-testid="property-search"]', '')
    await page.click('[data-testid="advanced-filters-toggle"]')
    await expect(page.locator('[data-testid="advanced-filters-panel"]')).toBeVisible()
    
    // Filter by property type
    await page.selectOption('[data-testid="property-type-filter"]', 'APARTMENT')
    await waitForApiResponse(page, '/properties')
    
    // Filter by rent range
    await page.fill('[data-testid="min-rent-filter"]', '1500')
    await page.fill('[data-testid="max-rent-filter"]', '2500')
    await page.click('[data-testid="apply-filters"]')
    
    // Should show filtered results
    await expect(page.locator('[data-testid="filter-results-count"]')).toBeVisible()
    
    // Filter by occupancy status
    await page.check('[data-testid="filter-vacant-units"]')
    await page.click('[data-testid="apply-filters"]')
    
    // Filter by location
    await page.fill('[data-testid="location-filter"]', 'Test City')
    await page.click('[data-testid="apply-filters"]')
    
    // Test saved filters
    await page.click('[data-testid="save-filter-preset"]')
    await page.fill('[data-testid="filter-preset-name"]', 'Available Apartments')
    await page.click('[data-testid="save-preset"]')
    
    // Clear all filters
    await page.click('[data-testid="clear-all-filters"]')
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(2)
    
    // Apply saved filter preset
    await page.selectOption('[data-testid="filter-presets"]', 'Available Apartments')
    
    // Test filter persistence across page refreshes
    await page.reload()
    await expect(page.locator('[data-testid="min-rent-filter"]')).toHaveValue('1500')
  })

  test('should sort properties with multiple criteria', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Test basic sorting options
    await page.selectOption('[data-testid="property-sort"]', 'rent-desc')
    await waitForLoadingComplete(page)
    
    // Verify sort order - first property should have higher rent
    const firstCard = page.locator('[data-testid="property-card"]').first()
    const lastCard = page.locator('[data-testid="property-card"]').last()
    
    const firstRent = await firstCard.locator('[data-testid="property-rent"]').textContent()
    const lastRent = await lastCard.locator('[data-testid="property-rent"]').textContent()
    
    // Extract numeric values and compare
    const firstRentValue = parseInt(firstRent?.replace(/[^0-9]/g, '') || '0')
    const lastRentValue = parseInt(lastRent?.replace(/[^0-9]/g, '') || '0')
    expect(firstRentValue).toBeGreaterThanOrEqual(lastRentValue)
    
    // Test multiple sort criteria
    await page.selectOption('[data-testid="property-sort"]', 'occupancy-rate-desc')
    await waitForLoadingComplete(page)
    
    // Test custom sort builder
    await page.click('[data-testid="custom-sort-builder"]')
    await expect(page.locator('[data-testid="sort-builder-modal"]')).toBeVisible()
    
    // Add multiple sort criteria
    await page.selectOption('[data-testid="sort-field-1"]', 'type')
    await page.selectOption('[data-testid="sort-direction-1"]', 'asc')
    
    await page.click('[data-testid="add-sort-criteria"]')
    await page.selectOption('[data-testid="sort-field-2"]', 'rent')
    await page.selectOption('[data-testid="sort-direction-2"]', 'desc')
    
    await page.click('[data-testid="apply-custom-sort"]')
    
    // Save custom sort for future use
    await page.click('[data-testid="save-sort-preset"]')
    await page.fill('[data-testid="sort-preset-name"]', 'Type then Rent')
    await page.click('[data-testid="save-preset"]')
    
    // Test sort direction toggle
    await page.click('[data-testid="reverse-sort-order"]')
    await waitForLoadingComplete(page)
    
    // Verify sort persistence
    await page.reload()
    await expect(page.locator('[data-testid="property-sort"]')).toHaveValue('custom')
  })

  test('should handle property form validation', async ({ page }) => {
    await navigateToSection(page, 'properties')
    await page.click('[data-testid="add-property-button"]')
    
    // Try to submit empty form
    await page.click('[data-testid="property-submit"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="property-name-error"]')).toContainText('Name is required')
    await expect(page.locator('[data-testid="property-address-error"]')).toContainText('Address is required')
    
    // Fill required fields
    await page.fill('[data-testid="property-name"]', 'Valid Property')
    await page.fill('[data-testid="property-address"]', '123 Valid Street')
    await page.fill('[data-testid="property-city"]', 'Valid City')
    await page.fill('[data-testid="property-state"]', 'TX')
    await page.fill('[data-testid="property-zip"]', '12345')
    
    // Try invalid rent amount
    await page.fill('[data-testid="property-monthly-rent"]', '-100')
    await page.click('[data-testid="property-submit"]')
    
    // Should show rent validation error
    await expect(page.locator('[data-testid="property-rent-error"]')).toContainText('Rent must be positive')
  })

  test('should handle bulk property operations', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Select multiple properties
    await page.check('[data-testid="property-checkbox"]:nth-child(1)')
    await page.check('[data-testid="property-checkbox"]:nth-child(2)')
    
    // Should show bulk actions toolbar
    await expect(page.locator('[data-testid="bulk-actions-toolbar"]')).toBeVisible()
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 selected')
    
    // Test bulk status update
    await page.click('[data-testid="bulk-status-update"]')
    await page.selectOption('[data-testid="status-select"]', 'MAINTENANCE')
    await page.click('[data-testid="apply-bulk-update"]')
    
    await waitForToast(page, 'Properties updated successfully')
  })

  test('should export property data', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click export button
    await page.click('[data-testid="export-properties-button"]')
    
    // Should show export options modal
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
    
    // Select export format
    await page.check('[data-testid="export-format-csv"]')
    await page.check('[data-testid="include-units"]')
    await page.check('[data-testid="include-tenants"]')
    
    // Start export
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="start-export"]')
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/properties.*\.csv$/)
  })

  test('should handle property performance metrics', async ({ page }) => {
    await navigateToSection(page, 'properties')
    await page.click('[data-testid="property-card"]:first-child')
    
    // Navigate to analytics tab
    await page.click('[data-testid="property-analytics-tab"]')
    
    // Should show key metrics
    await expect(page.locator('[data-testid="occupancy-rate"]')).toBeVisible()
    await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="maintenance-costs"]')).toBeVisible()
    
    // Should show charts
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="occupancy-chart"]')).toBeVisible()
    
    // Test date range filter
    await page.click('[data-testid="date-range-picker"]')
    await page.click('[data-testid="last-6-months"]')
    
    // Should update charts
    await waitForApiResponse(page, '/properties/analytics')
  })

  test('should work on mobile devices', async ({ page }) => {
    await setMobileViewport(page)
    await navigateToSection(page, 'properties')
    
    // Should show mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-property-list"]')).toBeVisible()
    
    // Should have mobile navigation
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
    
    // Property cards should be stacked vertically
    const propertyCards = page.locator('[data-testid="property-card"]')
    const firstCard = propertyCards.first()
    const secondCard = propertyCards.nth(1)
    
    const firstCardBox = await firstCard.boundingBox()
    const secondCardBox = await secondCard.boundingBox()
    
    // Second card should be below first card (mobile stack layout)
    expect(secondCardBox?.y).toBeGreaterThan(firstCardBox?.y + firstCardBox?.height)
    
    await takeScreenshot(page, 'property-management-mobile')
  })

  test('should handle offline state gracefully', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Simulate offline state
    await page.context().setOffline(true)
    
    // Try to create a property
    await page.click('[data-testid="add-property-button"]')
    await fillForm(page, {
      'property-name': 'Offline Property',
      'property-address': '123 Offline Street',
      'property-city': 'Offline City',
      'property-state': 'TX',
      'property-zip': '12345'
    })
    
    await page.click('[data-testid="property-submit"]')
    
    // Should show offline error
    await expect(page.locator('[data-testid="offline-error"]')).toBeVisible()
    
    // Go back online
    await page.context().setOffline(false)
    
    // Retry button should work
    await page.click('[data-testid="retry-button"]')
    await waitForToast(page, 'Property created successfully')
  })

  test('should validate property address with geocoding', async ({ page }) => {
    await navigateToSection(page, 'properties')
    await page.click('[data-testid="add-property-button"]')
    
    // Fill in property form with invalid address
    await fillForm(page, {
      'property-name': 'Test Property',
      'property-address': 'Invalid Address That Does Not Exist',
      'property-city': 'Nonexistent City',
      'property-state': 'XX',
      'property-zip': '00000'
    })
    
    // Trigger address validation
    await page.click('[data-testid="validate-address"]')
    
    // Should show address validation warning
    await expect(page.locator('[data-testid="address-validation-warning"]')).toBeVisible()
    await expect(page.locator('text=Address could not be verified')).toBeVisible()
    
    // Should still allow submission with confirmation
    await page.check('[data-testid="confirm-unverified-address"]')
    await page.click('[data-testid="property-submit"]')
    
    await waitForToast(page, 'Property created successfully')
  })
})