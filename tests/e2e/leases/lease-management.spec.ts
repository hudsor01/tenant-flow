import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection } from '../utils/test-helpers'
import { TestData } from '../utils/test-users'

test.describe('Lease Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'LANDLORD')
  })

  test('should display leases list', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Should show existing test lease
    await expect(page.locator('[data-testid="lease-card"]')).toHaveCount(1)
    await expect(page.locator('text=Jane Tenant')).toBeVisible()
    await expect(page.locator('text=Test Property 1')).toBeVisible()
    await expect(page.locator('[data-testid="lease-status-active"]')).toBeVisible()
  })

  test('should create a new lease', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Click create lease button
    await page.click('[data-testid="create-lease-button"]')
    await expect(page.locator('[data-testid="lease-form-modal"]')).toBeVisible()
    
    // Select property
    await page.selectOption('[data-testid="lease-property"]', TestData.PROPERTIES.PROPERTY_2.id)
    
    // Wait for units to load
    await page.waitForTimeout(1000)
    
    // Select unit
    await page.selectOption('[data-testid="lease-unit"]', TestData.UNITS.UNIT_2.id)
    
    // Select tenant
    await page.selectOption('[data-testid="lease-tenant"]', TestData.TENANTS.TENANT_2.id)
    
    // Fill lease details
    const startDate = new Date()
    const endDate = new Date()
    endDate.setFullYear(startDate.getFullYear() + 1)
    
    await page.fill('[data-testid="lease-start-date"]', startDate.toISOString().split('T')[0])
    await page.fill('[data-testid="lease-end-date"]', endDate.toISOString().split('T')[0])
    await page.fill('[data-testid="lease-MONTHLY-rent"]', '1500')
    await page.fill('[data-testid="lease-security-deposit"]', '1500')
    await page.fill('[data-testid="lease-terms"]', 'Standard lease agreement terms')
    
    // Submit form
    await page.click('[data-testid="lease-submit"]')
    
    // Should show success toast
    await waitForToast(page, 'Lease created successfully')
    
    // Should close modal and show new lease in list
    await expect(page.locator('[data-testid="lease-form-modal"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="lease-card"]')).toHaveCount(2)
  })

  test('should view lease details', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Click on lease card
    await page.click('[data-testid="lease-card"]:first-child')
    
    // Should navigate to lease detail page (or open modal)
    await expect(page.locator('[data-testid="lease-details-modal"]')).toBeVisible()
    
    // Should show lease information
    await expect(page.locator('[data-testid="lease-tenant-name"]')).toContainText('Jane Tenant')
    await expect(page.locator('[data-testid="lease-property-name"]')).toContainText('Test Property 1')
    await expect(page.locator('[data-testid="lease-MONTHLY-rent"]')).toContainText('$2,000')
    await expect(page.locator('[data-testid="lease-status"]')).toContainText('ACTIVE')
  })

  test('should edit an existing lease', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Click edit button on lease
    await page.click('[data-testid="lease-edit-button"]')
    await expect(page.locator('[data-testid="lease-form-modal"]')).toBeVisible()
    
    // Verify form is pre-filled
    await expect(page.locator('[data-testid="lease-MONTHLY-rent"]')).toHaveValue('2000')
    
    // Update lease details
    await page.fill('[data-testid="lease-MONTHLY-rent"]', '2200')
    await page.fill('[data-testid="lease-terms"]', 'Updated lease terms')
    
    // Submit form
    await page.click('[data-testid="lease-submit"]')
    
    // Should show success toast
    await waitForToast(page, 'Lease updated successfully')
    
    // Should show updated rent in list
    await expect(page.locator('text=$2,200')).toBeVisible()
  })

  test('should generate lease document', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Click on lease card to open details
    await page.click('[data-testid="lease-card"]:first-child')
    
    // Click generate document button
    await page.click('[data-testid="generate-lease-document-button"]')
    
    // Should show document generation modal
    await expect(page.locator('[data-testid="document-generation-modal"]')).toBeVisible()
    
    // Select document template
    await page.selectOption('[data-testid="document-template"]', 'standard-lease')
    
    // Generate document
    await page.click('[data-testid="generate-document-button"]')
    
    // Should show success message
    await waitForToast(page, 'Lease document generated successfully')
    
    // Should show download link
    await expect(page.locator('[data-testid="download-lease-document"]')).toBeVisible()
  })

  test('should renew a lease', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Click renew button on lease
    await page.click('[data-testid="lease-renew-button"]')
    await expect(page.locator('[data-testid="lease-renewal-modal"]')).toBeVisible()
    
    // Fill renewal details
    const newEndDate = new Date()
    newEndDate.setFullYear(newEndDate.getFullYear() + 2)
    
    await page.fill('[data-testid="renewal-end-date"]', newEndDate.toISOString().split('T')[0])
    await page.fill('[data-testid="renewal-MONTHLY-rent"]', '2100')
    await page.fill('[data-testid="renewal-notes"]', 'Lease renewal for another year')
    
    // Submit renewal
    await page.click('[data-testid="confirm-renewal-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Lease renewed successfully')
    
    // Should show updated end date
    await expect(page.locator('[data-testid="lease-end-date"]')).toContainText(newEndDate.getFullYear().toString())
  })

  test('should terminate a lease', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Click terminate button on lease
    await page.click('[data-testid="lease-terminate-button"]')
    
    // Should show termination confirmation dialog
    await expect(page.locator('[data-testid="lease-termination-modal"]')).toBeVisible()
    
    // Fill termination details
    const terminationDate = new Date()
    await page.fill('[data-testid="termination-date"]', terminationDate.toISOString().split('T')[0])
    await page.selectOption('[data-testid="termination-reason"]', 'tenant-request')
    await page.fill('[data-testid="termination-notes"]', 'Tenant requested early termination')
    
    // Confirm termination
    await page.click('[data-testid="confirm-termination-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Lease terminated successfully')
    
    // Should show terminated status
    await expect(page.locator('[data-testid="lease-status-terminated"]')).toBeVisible()
  })

  test('should filter leases by status', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Filter by active leases
    await page.selectOption('[data-testid="lease-status-filter"]', 'ACTIVE')
    
    // Should show only active leases
    await expect(page.locator('[data-testid="lease-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="lease-status-active"]')).toBeVisible()
    
    // Filter by all leases
    await page.selectOption('[data-testid="lease-status-filter"]', 'ALL')
    await expect(page.locator('[data-testid="lease-card"]')).toHaveCount(1)
  })

  test('should filter leases by property', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Filter by specific property
    await page.selectOption('[data-testid="lease-property-filter"]', TestData.PROPERTIES.PROPERTY_1.id)
    
    // Should show only leases for that property
    await expect(page.locator('text=Test Property 1')).toBeVisible()
    await expect(page.locator('text=Test Property 2')).not.toBeVisible()
  })

  test('should search leases by tenant name', async ({ page }) => {
    await navigateToSection(page, 'leases')
    
    // Search for specific tenant
    await page.fill('[data-testid="lease-search"]', 'Jane')
    
    // Should show only matching leases
    await expect(page.locator('[data-testid="lease-card"]')).toHaveCount(1)
    await expect(page.locator('text=Jane Tenant')).toBeVisible()
    
    // Clear search
    await page.fill('[data-testid="lease-search"]', '')
    await expect(page.locator('[data-testid="lease-card"]')).toHaveCount(1)
  })

  test('should handle lease form validation', async ({ page }) => {
    await navigateToSection(page, 'leases')
    await page.click('[data-testid="create-lease-button"]')
    
    // Try to submit empty form
    await page.click('[data-testid="lease-submit"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="lease-property-error"]')).toContainText('Property is required')
    await expect(page.locator('[data-testid="lease-tenant-error"]')).toContainText('Tenant is required')
    await expect(page.locator('[data-testid="lease-start-date-error"]')).toContainText('Start date is required')
    
    // Fill some fields and test date validation
    await page.selectOption('[data-testid="lease-property"]', TestData.PROPERTIES.PROPERTY_1.id)
    await page.selectOption('[data-testid="lease-tenant"]', TestData.TENANTS.TENANT_1.id)
    
    // Set end date before start date
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    await page.fill('[data-testid="lease-start-date"]', today.toISOString().split('T')[0])
    await page.fill('[data-testid="lease-end-date"]', yesterday.toISOString().split('T')[0])
    await page.click('[data-testid="lease-submit"]')
    
    // Should show date validation error
    await expect(page.locator('[data-testid="lease-end-date-error"]')).toContainText('End date must be after start date')
  })

  test('should view lease payment schedule', async ({ page }) => {
    await navigateToSection(page, 'leases')
    await page.click('[data-testid="lease-card"]:first-child')
    
    // Navigate to payment schedule tab
    await page.click('[data-testid="lease-payments-tab"]')
    
    // Should show payment schedule
    await expect(page.locator('[data-testid="payment-schedule-item"]')).toHaveCount(2)
    
    // Should show current and upcoming payments
    await expect(page.locator('[data-testid="payment-status-paid"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-status-pending"]')).toBeVisible()
  })
})