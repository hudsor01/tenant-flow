import { test, expect } from '@playwright/test'
import { mockPropertiesAPI } from '../helpers/mock-data'

test.describe('Property CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await mockPropertiesAPI(page)
    await page.goto('/properties')
    await page.waitForLoadState('networkidle')
  })

  test('should create a new property', async ({ page }) => {
    // Mock successful creation
    await page.route('**/api/v1/properties', async route => {
      if (route.request().method() === 'POST') {
        const data = await route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-prop-1',
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
        })
      } else {
        await route.continue()
      }
    })

    // Click add property button
    await page.getByRole('button', { name: 'Add Property' }).click()
    
    // Fill form
    await page.getByLabel('Property Name').fill('New Test Property')
    await page.getByLabel('Street Address').fill('456 Test Avenue')
    await page.getByLabel('City').fill('Test City')
    await page.getByLabel('State').fill('CA')
    await page.getByLabel('Zip Code').fill('90210')
    
    // Select property type
    await page.getByRole('combobox', { name: 'Property Type' }).click()
    await page.getByRole('option', { name: 'Residential' }).click()
    
    // Optional fields
    await page.getByLabel('Year Built').fill('2020')
    await page.getByLabel('Total Size').fill('5000')
    await page.getByLabel('Description').fill('A beautiful test property')
    
    // Submit form
    await page.getByRole('button', { name: 'Create Property' }).click()
    
    // Check success toast
    await expect(page.getByText('Property created successfully')).toBeVisible()
    
    // Check dialog closed
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Check new property appears in list
    await expect(page.getByText('New Test Property')).toBeVisible()
  })

  test('should validate required fields when creating property', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Property' }).click()
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Create Property' }).click()
    
    // Check validation messages
    await expect(page.getByText('Property name is required')).toBeVisible()
    await expect(page.getByText('Address is required')).toBeVisible()
    await expect(page.getByText('City is required')).toBeVisible()
    await expect(page.getByText('State is required')).toBeVisible()
    await expect(page.getByText('Valid zip code is required')).toBeVisible()
  })

  test('should edit an existing property', async ({ page }) => {
    // Mock successful update
    await page.route('**/api/v1/properties/*', async route => {
      if (route.request().method() === 'PUT') {
        const data = await route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'prop-1',
            ...data,
            updatedAt: new Date().toISOString()
          })
        })
      } else {
        await route.continue()
      }
    })

    // Click edit button on first property
    const firstRow = page.getByRole('row').nth(1)
    await firstRow.getByRole('button', { name: 'Edit' }).click()
    
    // Check form pre-filled
    await expect(page.getByLabel('Property Name')).toHaveValue('Sunset Apartments')
    
    // Edit fields
    await page.getByLabel('Property Name').clear()
    await page.getByLabel('Property Name').fill('Updated Sunset Apartments')
    
    await page.getByLabel('Description').clear()
    await page.getByLabel('Description').fill('Updated description')
    
    // Submit form
    await page.getByRole('button', { name: 'Update Property' }).click()
    
    // Check success toast
    await expect(page.getByText('Property updated successfully')).toBeVisible()
    
    // Check dialog closed
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Check updated property in list
    await expect(page.getByText('Updated Sunset Apartments')).toBeVisible()
  })

  test('should delete a property', async ({ page }) => {
    // Mock successful deletion
    await page.route('**/api/v1/properties/*', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json'
        })
      } else {
        await route.continue()
      }
    })

    // Open property details
    await page.getByText('Sunset Apartments').click()
    
    // Click delete button
    await page.getByRole('button', { name: 'Delete' }).click()
    
    // Confirm deletion dialog
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Delete Property')).toBeVisible()
    await expect(page.getByText('Are you sure you want to delete')).toBeVisible()
    
    // Confirm deletion
    await page.getByRole('button', { name: 'Delete Property' }).last().click()
    
    // Check success toast
    await expect(page.getByText('Property deleted successfully')).toBeVisible()
    
    // Check property removed from list
    await expect(page.getByText('Sunset Apartments')).not.toBeVisible()
  })

  test('should prevent deletion of property with occupied units', async ({ page }) => {
    // Mock property with occupied units
    await page.route('**/api/v1/properties/prop-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'prop-1',
          name: 'Sunset Apartments',
          units: [
            { id: 'unit-1', status: 'OCCUPIED', unitNumber: '101' },
            { id: 'unit-2', status: 'VACANT', unitNumber: '102' }
          ]
        })
      })
    })

    // Open property details
    await page.getByText('Sunset Apartments').click()
    
    // Click delete button
    await page.getByRole('button', { name: 'Delete' }).click()
    
    // Check warning message
    await expect(page.getByText('This property has occupied units')).toBeVisible()
    
    // Delete button should be disabled
    const deleteButton = page.getByRole('button', { name: 'Delete Property' }).last()
    await expect(deleteButton).toBeDisabled()
  })

  test('should handle API errors during creation', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/properties', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid property data' })
        })
      } else {
        await route.continue()
      }
    })

    await page.getByRole('button', { name: 'Add Property' }).click()
    
    // Fill form
    await page.getByLabel('Property Name').fill('Test Property')
    await page.getByLabel('Street Address').fill('123 Test St')
    await page.getByLabel('City').fill('Test City')
    await page.getByLabel('State').fill('CA')
    await page.getByLabel('Zip Code').fill('12345')
    
    // Submit
    await page.getByRole('button', { name: 'Create Property' }).click()
    
    // Check error message
    await expect(page.getByText('Invalid property data')).toBeVisible()
  })

  test('should handle API errors during update', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/properties/*', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        })
      } else {
        await route.continue()
      }
    })

    // Edit first property
    const firstRow = page.getByRole('row').nth(1)
    await firstRow.getByRole('button', { name: 'Edit' }).click()
    
    // Make changes
    await page.getByLabel('Property Name').clear()
    await page.getByLabel('Property Name').fill('Updated Name')
    
    // Submit
    await page.getByRole('button', { name: 'Update Property' }).click()
    
    // Check error message
    await expect(page.getByText('Server error')).toBeVisible()
  })

  test('should cancel property creation', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Property' }).click()
    
    // Fill some fields
    await page.getByLabel('Property Name').fill('Test Property')
    
    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // No new property should be added
    await expect(page.getByText('Test Property')).not.toBeVisible()
  })

  test('should cancel property deletion', async ({ page }) => {
    // Open property details
    await page.getByText('Sunset Apartments').click()
    
    // Click delete button
    await page.getByRole('button', { name: 'Delete' }).click()
    
    // Cancel deletion
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible()
    
    // Property should still exist
    await expect(page.getByText('Sunset Apartments')).toBeVisible()
  })
})