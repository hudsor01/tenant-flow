import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection } from '../utils/test-helpers'
import { TestData } from '../utils/test-users'

test.describe('Property Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'LANDLORD')
  })

  test('should display properties list', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Should show existing test properties
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(2)
    await expect(page.locator('text=Test Property 1')).toBeVisible()
    await expect(page.locator('text=Test Property 2')).toBeVisible()
  })

  test('should create a new property', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click add property button
    await page.click('[data-testid="add-property-button"]')
    await expect(page.locator('[data-testid="property-form-modal"]')).toBeVisible()
    
    // Fill out property form
    const propertyData = {
      'property-name': 'New Test Property',
      'property-address': '789 New Street',
      'property-city': 'New City',
      'property-state': 'CA',
      'property-zip': '90210',
      'property-bedrooms': '4',
      'property-bathrooms': '3',
      'property-square-feet': '2000',
      'property-monthly-rent': '3000',
      'property-description': 'A beautiful new property for testing'
    }
    
    await fillForm(page, propertyData)
    
    // Submit form
    await page.click('[data-testid="property-submit"]')
    
    // Should show success toast
    await waitForToast(page, 'Property created successfully')
    
    // Should close modal and show new property in list
    await expect(page.locator('[data-testid="property-form-modal"]')).not.toBeVisible()
    await expect(page.locator('text=New Test Property')).toBeVisible()
  })

  test('should edit an existing property', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click edit button on first property
    await page.click('[data-testid="property-edit-button"]')
    await expect(page.locator('[data-testid="property-form-modal"]')).toBeVisible()
    
    // Verify form is pre-filled
    await expect(page.locator('[data-testid="property-name"]')).toHaveValue('Test Property 1')
    
    // Update property name
    await page.fill('[data-testid="property-name"]', 'Updated Test Property 1')
    await page.fill('[data-testid="property-monthly-rent"]', '2200')
    
    // Submit form
    await page.click('[data-testid="property-submit"]')
    
    // Should show success toast
    await waitForToast(page, 'Property updated successfully')
    
    // Should show updated property in list
    await expect(page.locator('text=Updated Test Property 1')).toBeVisible()
  })

  test('should view property details', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click on property card
    await page.click('[data-testid="property-card"]:first-child')
    
    // Should navigate to property detail page
    await expect(page).toHaveURL(/\/properties\/test-property-1/)
    
    // Should show property details
    await expect(page.locator('[data-testid="property-header"]')).toContainText('Test Property 1')
    await expect(page.locator('[data-testid="property-address"]')).toContainText('123 Test Street')
    await expect(page.locator('[data-testid="property-rent"]')).toContainText('$2,000')
    
    // Should show tabs for different sections
    await expect(page.locator('[data-testid="property-overview-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="property-units-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="property-tenants-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="property-maintenance-tab"]')).toBeVisible()
  })

  test('should upload property images', async ({ page }) => {
    await navigateToSection(page, 'properties')
    await page.click('[data-testid="property-card"]:first-child')
    
    // Navigate to media section
    await page.click('[data-testid="property-media-tab"]')
    
    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.click('[data-testid="upload-image-button"]')
    const fileChooser = await fileChooserPromise
    
    // Mock file upload
    await fileChooser.setFiles([{
      name: 'property-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('mock image data')
    }])
    
    // Should show upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
    
    // Should show success message
    await waitForToast(page, 'Image uploaded successfully')
    
    // Should show image in gallery
    await expect(page.locator('[data-testid="property-image"]')).toBeVisible()
  })

  test('should delete a property', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Click delete button on property
    await page.click('[data-testid="property-delete-button"]')
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible()
    await expect(page.locator('text=Are you sure you want to delete this property?')).toBeVisible()
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Property deleted successfully')
    
    // Property should be removed from list
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(1)
  })

  test('should filter properties', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Use search filter
    await page.fill('[data-testid="property-search"]', 'Property 1')
    
    // Should filter to only show matching property
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(1)
    await expect(page.locator('text=Test Property 1')).toBeVisible()
    await expect(page.locator('text=Test Property 2')).not.toBeVisible()
    
    // Clear search
    await page.fill('[data-testid="property-search"]', '')
    await expect(page.locator('[data-testid="property-card"]')).toHaveCount(2)
  })

  test('should sort properties', async ({ page }) => {
    await navigateToSection(page, 'properties')
    
    // Sort by rent (high to low)
    await page.selectOption('[data-testid="property-sort"]', 'rent-desc')
    
    // First property should now be the higher rent one
    const firstCard = page.locator('[data-testid="property-card"]').first()
    await expect(firstCard).toContainText('$2,000')
    
    // Sort by name (A-Z)
    await page.selectOption('[data-testid="property-sort"]', 'name-asc')
    
    // Should be sorted alphabetically
    const propertyCards = page.locator('[data-testid="property-card"]')
    await expect(propertyCards.first()).toContainText('Test Property 1')
    await expect(propertyCards.last()).toContainText('Test Property 2')
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
})