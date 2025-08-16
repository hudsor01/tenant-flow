import { test, expect } from '@playwright/test'
import { mockPropertiesAPI, createMockProperty } from '../helpers/mock-data'

test.describe('Properties List View', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await mockPropertiesAPI(page)
    
    // Navigate to properties page
    await page.goto('/properties')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should display properties in a table', async ({ page }) => {
    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Property' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Units' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Tenants' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Occupancy' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible()

    // Check for property rows
    const propertyRows = page.getByRole('row')
    await expect(propertyRows).toHaveCount(4) // 3 properties + header row
    
    // Verify first property details
    const firstRow = propertyRows.nth(1)
    await expect(firstRow.getByText('Sunset Apartments')).toBeVisible()
    await expect(firstRow.getByText('123 Main St')).toBeVisible()
    await expect(firstRow.getByText('RESIDENTIAL')).toBeVisible()
    await expect(firstRow.getByText('85%')).toBeVisible()
  })

  test('should display property statistics cards', async ({ page }) => {
    // Check stats cards
    const statsSection = page.locator('[data-testid="properties-stats"]')
    
    // Total Properties card
    await expect(statsSection.getByText('Total Properties')).toBeVisible()
    await expect(statsSection.getByText('3')).toBeVisible()
    
    // Occupancy Rate card
    await expect(statsSection.getByText('Occupancy Rate')).toBeVisible()
    await expect(statsSection.getByText('85%')).toBeVisible()
    
    // Active Tenants card
    await expect(statsSection.getByText('Active Tenants')).toBeVisible()
    await expect(statsSection.getByText('42')).toBeVisible()
  })

  test('should show empty state when no properties exist', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/v1/properties', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })
    
    await page.reload()
    
    // Check empty state
    await expect(page.getByText('No properties yet')).toBeVisible()
    await expect(page.getByText('Get started by adding your first rental property')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add First Property' })).toBeVisible()
  })

  test('should handle loading state', async ({ page }) => {
    // Delay API response to see loading state
    await page.route('**/api/v1/properties', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([createMockProperty()])
      })
    })
    
    await page.reload()
    
    // Check for loading skeletons
    await expect(page.locator('[data-testid="loading-skeleton"]')).toBeVisible()
    
    // Wait for data to load
    await page.waitForSelector('[data-testid="properties-table"]', { timeout: 5000 })
  })

  test('should handle error state', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/properties', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })
    
    await page.reload()
    
    // Check error state
    await expect(page.getByText('Error loading properties')).toBeVisible()
    await expect(page.getByText('There was a problem loading your properties')).toBeVisible()
  })

  test('should navigate to property details on row click', async ({ page }) => {
    // Click on first property row
    await page.getByText('Sunset Apartments').click()
    
    // Check that details drawer opened
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sunset Apartments' })).toBeVisible()
    await expect(page.getByText('Property Information')).toBeVisible()
  })

  test('should open add property dialog', async ({ page }) => {
    // Click add property button
    await page.getByRole('button', { name: 'Add Property' }).click()
    
    // Check dialog opened
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Add New Property' })).toBeVisible()
    
    // Check form fields
    await expect(page.getByLabel('Property Name')).toBeVisible()
    await expect(page.getByLabel('Street Address')).toBeVisible()
    await expect(page.getByLabel('City')).toBeVisible()
    await expect(page.getByLabel('State')).toBeVisible()
    await expect(page.getByLabel('Zip Code')).toBeVisible()
  })

  test('should show action buttons on hover', async ({ page }) => {
    // Hover over first property row
    const firstRow = page.getByRole('row').nth(1)
    await firstRow.hover()
    
    // Check action buttons are visible
    const viewButton = firstRow.getByRole('button', { name: 'View' })
    const editButton = firstRow.getByRole('button', { name: 'Edit' })
    
    await expect(viewButton).toBeVisible()
    await expect(editButton).toBeVisible()
  })

  test('should handle pagination for large datasets', async ({ page }) => {
    // Mock large dataset
    const manyProperties = Array.from({ length: 25 }, (_, i) => 
      createMockProperty({ 
        id: `prop-${i}`, 
        name: `Property ${i + 1}` 
      })
    )
    
    await page.route('**/api/v1/properties', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(manyProperties)
      })
    })
    
    await page.reload()
    
    // Check pagination controls
    await expect(page.getByRole('button', { name: 'Load more properties' })).toBeVisible()
  })
})