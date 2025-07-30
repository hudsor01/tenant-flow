import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Forms and Modals Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await page.goto('/properties')
    await page.waitForLoadState('networkidle')
    await visualHelpers.setupVisualEnvironment()
  })

  test.describe('Property Form Modal', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="add-property-button"]')
      await page.waitForSelector('[data-testid="property-form-modal"]')
    })

    test('property form initial state', async ({ page }) => {
      const modal = page.locator('[data-testid="property-form-modal"]')
      await expect(modal).toHaveScreenshot('property-form-initial.png')
    })

    test('property form filled state', async ({ page }) => {
      // Fill out the form
      await page.fill('[name="name"]', 'Sunset Villa Apartments')
      await page.fill('[name="address"]', '123 Sunset Boulevard')
      await page.fill('[name="city"]', 'Los Angeles')
      await page.selectOption('[name="state"]', 'CA')
      await page.fill('[name="zipCode"]', '90210')
      await page.selectOption('[name="propertyType"]', 'APARTMENT')
      await page.fill('[name="description"]', 'Beautiful luxury apartments with stunning sunset views')

      const modal = page.locator('[data-testid="property-form-modal"]')
      await expect(modal).toHaveScreenshot('property-form-filled.png')
    })

    test('property form validation errors', async ({ page }) => {
      // Try to submit empty form
      await page.click('[data-testid="submit-property-button"]')
      await page.waitForTimeout(300)

      const modal = page.locator('[data-testid="property-form-modal"]')
      await expect(modal).toHaveScreenshot('property-form-validation-errors.png')
    })

    test('property form loading state', async ({ page }) => {
      // Fill required fields
      await page.fill('[name="name"]', 'Test Property')
      await page.fill('[name="address"]', '123 Test St')
      await page.fill('[name="city"]', 'Test City')
      await page.selectOption('[name="state"]', 'TX')
      await page.fill('[name="zipCode"]', '12345')

      // Mock slow API response
      await page.route('/api/v1/properties', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.continue()
      })

      await page.click('[data-testid="submit-property-button"]')
      await page.waitForTimeout(100)

      const modal = page.locator('[data-testid="property-form-modal"]')
      await expect(modal).toHaveScreenshot('property-form-loading.png')
    })

    test('property form responsive layouts', async ({ page }) => {
      const viewports = [
        { width: 1440, height: 900, name: 'desktop' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' },
      ]

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        const modal = page.locator('[data-testid="property-form-modal"]')
        await expect(modal).toHaveScreenshot(`property-form-${viewport.name}.png`)
      }
    })
  })

  test.describe('Unit Form Modal', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to a property first
      await page.goto('/properties/test-property-id')
      await page.click('[data-testid="add-unit-button"]')
      await page.waitForSelector('[data-testid="unit-form-modal"]')
    })

    test('unit form initial state', async ({ page }) => {
      const modal = page.locator('[data-testid="unit-form-modal"]')
      await expect(modal).toHaveScreenshot('unit-form-initial.png')
    })

    test('unit form with different unit types', async ({ page }) => {
      // Test studio unit
      await page.selectOption('[name="unitType"]', 'STUDIO')
      await page.fill('[name="unitNumber"]', 'S101')
      await page.fill('[name="bedrooms"]', '0')
      await page.fill('[name="bathrooms"]', '1')
      
      const modal = page.locator('[data-testid="unit-form-modal"]')
      await expect(modal).toHaveScreenshot('unit-form-studio.png')

      // Test 3-bedroom unit
      await page.selectOption('[name="unitType"]', 'APARTMENT')
      await page.fill('[name="unitNumber"]', '301')
      await page.fill('[name="bedrooms"]', '3')
      await page.fill('[name="bathrooms"]', '2')
      
      await expect(modal).toHaveScreenshot('unit-form-3bedroom.png')
    })

    test('unit form validation states', async ({ page }) => {
      // Test invalid rent amount
      await page.fill('[name="rent"]', '-500')
      await page.blur('[name="rent"]')
      await page.waitForTimeout(200)

      const modal = page.locator('[data-testid="unit-form-modal"]')
      await expect(modal).toHaveScreenshot('unit-form-invalid-rent.png')
    })
  })

  test.describe('Lease Form Modal', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/units/test-unit-id')
      await page.click('[data-testid="create-lease-button"]')
      await page.waitForSelector('[data-testid="lease-form-modal"]')
    })

    test('lease form tenant selection', async ({ page }) => {
      const modal = page.locator('[data-testid="lease-form-modal"]')
      await expect(modal).toHaveScreenshot('lease-form-initial.png')

      // Test existing tenant selection
      await page.click('[data-testid="existing-tenant-tab"]')
      await expect(modal).toHaveScreenshot('lease-form-existing-tenant.png')

      // Test new tenant form
      await page.click('[data-testid="new-tenant-tab"]')
      await expect(modal).toHaveScreenshot('lease-form-new-tenant.png')
    })

    test('lease form date validation', async ({ page }) => {
      // Set end date before start date
      await page.fill('[name="startDate"]', '2024-06-01')
      await page.fill('[name="endDate"]', '2024-01-01')
      await page.blur('[name="endDate"]')
      await page.waitForTimeout(200)

      const modal = page.locator('[data-testid="lease-form-modal"]')
      await expect(modal).toHaveScreenshot('lease-form-date-validation.png')
    })

    test('lease form with addendums', async ({ page }) => {
      // Add pet addendum
      await page.click('[data-testid="add-addendum-button"]')
      await page.selectOption('[data-testid="addendum-type"]', 'PET')
      await page.fill('[data-testid="pet-deposit"]', '500')
      await page.fill('[data-testid="pet-rent"]', '50')

      const modal = page.locator('[data-testid="lease-form-modal"]')
      await expect(modal).toHaveScreenshot('lease-form-with-addendum.png')
    })
  })

  test.describe('Form Field States', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="add-property-button"]')
      await page.waitForSelector('[data-testid="property-form-modal"]')
    })

    test('input field states', async ({ page }) => {
      const nameField = page.locator('[name="name"]')
      
      // Normal state
      await expect(nameField).toHaveScreenshot('input-field-normal.png')
      
      // Focus state
      await nameField.focus()
      await expect(nameField).toHaveScreenshot('input-field-focus.png')
      
      // Filled state
      await nameField.fill('Test Property Name')
      await expect(nameField).toHaveScreenshot('input-field-filled.png')
      
      // Error state
      await nameField.fill('')
      await page.click('[data-testid="submit-property-button"]')
      await page.waitForTimeout(200)
      await expect(nameField).toHaveScreenshot('input-field-error.png')
    })

    test('select field states', async ({ page }) => {
      const stateField = page.locator('[name="state"]')
      
      // Normal state
      await expect(stateField).toHaveScreenshot('select-field-normal.png')
      
      // Open state
      await stateField.click()
      await page.waitForTimeout(200)
      await expect(page.locator('[data-testid="state-dropdown"]')).toHaveScreenshot('select-field-open.png')
      
      // Selected state
      await page.selectOption('[name="state"]', 'CA')
      await expect(stateField).toHaveScreenshot('select-field-selected.png')
    })

    test('textarea field states', async ({ page }) => {
      const descriptionField = page.locator('[name="description"]')
      
      // Normal state
      await expect(descriptionField).toHaveScreenshot('textarea-field-normal.png')
      
      // Focus state
      await descriptionField.focus()
      await expect(descriptionField).toHaveScreenshot('textarea-field-focus.png')
      
      // Filled state
      await descriptionField.fill('This is a long description that spans multiple lines and tests the textarea field properly.')
      await expect(descriptionField).toHaveScreenshot('textarea-field-filled.png')
    })

    test('checkbox and radio states', async ({ page }) => {
      // Navigate to lease form for more complex form elements
      await page.goto('/units/test-unit-id')
      await page.click('[data-testid="create-lease-button"]')
      
      const checkbox = page.locator('[name="includePets"]')
      
      // Unchecked state
      await expect(checkbox).toHaveScreenshot('checkbox-unchecked.png')
      
      // Checked state
      await checkbox.check()
      await expect(checkbox).toHaveScreenshot('checkbox-checked.png')
      
      // Disabled state
      await page.evaluate(() => {
        const cb = document.querySelector('[name="includePets"]') as HTMLInputElement
        if (cb) cb.disabled = true
      })
      await expect(checkbox).toHaveScreenshot('checkbox-disabled.png')
    })
  })

  test.describe('Form Themes', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="add-property-button"]')
      await page.waitForSelector('[data-testid="property-form-modal"]')
    })

    test('form dark theme', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      const modal = page.locator('[data-testid="property-form-modal"]')
      await expect(modal).toHaveScreenshot('property-form-dark-theme.png')
    })

    test('form high contrast theme', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-contrast', 'high')
      })
      await page.waitForTimeout(300)

      const modal = page.locator('[data-testid="property-form-modal"]')
      await expect(modal).toHaveScreenshot('property-form-high-contrast.png')
    })
  })

  test.describe('Form Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-testid="add-property-button"]')
      await page.waitForSelector('[data-testid="property-form-modal"]')
    })

    test('form focus indicators', async ({ page }) => {
      // Tab through form fields
      await page.keyboard.press('Tab') // First field
      const firstField = page.locator(':focus')
      await expect(firstField).toHaveScreenshot('form-focus-first-field.png')
      
      await page.keyboard.press('Tab') // Second field
      const secondField = page.locator(':focus')
      await expect(secondField).toHaveScreenshot('form-focus-second-field.png')
    })

    test('form error announcements', async ({ page }) => {
      // Submit form to trigger errors
      await page.click('[data-testid="submit-property-button"]')
      await page.waitForTimeout(300)

      // Error messages should be visible
      const errorMessages = page.locator('[data-testid="error-message"]')
      await expect(errorMessages.first()).toHaveScreenshot('form-error-message.png')
    })
  })
})