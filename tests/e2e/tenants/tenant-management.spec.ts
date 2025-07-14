import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection } from '../utils/test-helpers'
import { TestData } from '../utils/test-users'

test.describe('Tenant Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'LANDLORD')
  })

  test('should display tenants list', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    
    // Should show existing test tenants
    await expect(page.locator('[data-testid="tenant-card"]')).toHaveCount(2)
    await expect(page.locator('text=Jane Tenant')).toBeVisible()
    await expect(page.locator('text=Bob Tenant')).toBeVisible()
  })

  test('should invite a new tenant', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    
    // Click invite tenant button
    await page.click('[data-testid="invite-tenant-button"]')
    await expect(page.locator('[data-testid="invite-tenant-modal"]')).toBeVisible()
    
    // Fill out invitation form
    const invitationData = {
      'invite-email': 'newtenant@test.com',
      'invite-first-name': 'New',
      'invite-last-name': 'Tenant',
      'invite-phone': '+1234567893'
    }
    
    await fillForm(page, invitationData)
    
    // Select property and unit
    await page.selectOption('[data-testid="invite-property"]', TestData.PROPERTIES.PROPERTY_1.id)
    await page.selectOption('[data-testid="invite-unit"]', TestData.UNITS.UNIT_2.id)
    
    // Submit invitation
    await page.click('[data-testid="send-invitation-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Invitation sent successfully')
    
    // Should close modal
    await expect(page.locator('[data-testid="invite-tenant-modal"]')).not.toBeVisible()
    
    // Should show pending invitation in list
    await expect(page.locator('text=newtenant@test.com')).toBeVisible()
    await expect(page.locator('[data-testid="tenant-status-pending"]')).toBeVisible()
  })

  test('should view tenant details', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    
    // Click on tenant card
    await page.click('[data-testid="tenant-card"]:first-child')
    
    // Should navigate to tenant detail page
    await expect(page).toHaveURL(/\/tenants\/test-tenant-1/)
    
    // Should show tenant details
    await expect(page.locator('[data-testid="tenant-header"]')).toContainText('Jane Tenant')
    await expect(page.locator('[data-testid="tenant-email"]')).toContainText('tenant@test.com')
    await expect(page.locator('[data-testid="tenant-phone"]')).toContainText('+1234567891')
    
    // Should show tabs for different sections
    await expect(page.locator('[data-testid="tenant-overview-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="tenant-lease-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="tenant-payments-tab"]')).toBeVisible()
    await expect(page.locator('[data-testid="tenant-maintenance-tab"]')).toBeVisible()
  })

  test('should edit tenant information', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    await page.click('[data-testid="tenant-card"]:first-child')
    
    // Click edit button
    await page.click('[data-testid="edit-tenant-button"]')
    await expect(page.locator('[data-testid="edit-tenant-modal"]')).toBeVisible()
    
    // Verify form is pre-filled
    await expect(page.locator('[data-testid="tenant-first-name"]')).toHaveValue('Jane')
    await expect(page.locator('[data-testid="tenant-email"]')).toHaveValue('tenant@test.com')
    
    // Update tenant information
    await page.fill('[data-testid="tenant-phone"]', '+1234567899')
    await page.fill('[data-testid="tenant-emergency-contact-name"]', 'Emergency Contact')
    await page.fill('[data-testid="tenant-emergency-contact-phone"]', '+1234567888')
    
    // Submit form
    await page.click('[data-testid="save-tenant-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Tenant updated successfully')
    
    // Should show updated information
    await expect(page.locator('[data-testid="tenant-phone"]')).toContainText('+1234567899')
  })

  test('should upload tenant documents', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    await page.click('[data-testid="tenant-card"]:first-child')
    
    // Navigate to documents section
    await page.click('[data-testid="tenant-documents-tab"]')
    
    // Upload document
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.click('[data-testid="upload-document-button"]')
    const fileChooser = await fileChooserPromise
    
    // Mock document upload
    await fileChooser.setFiles([{
      name: 'tenant-id.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf data')
    }])
    
    // Select document type
    await page.selectOption('[data-testid="document-type"]', 'ID')
    
    // Add description
    await page.fill('[data-testid="document-description"]', 'Tenant ID document')
    
    // Submit upload
    await page.click('[data-testid="confirm-upload-button"]')
    
    // Should show success message
    await waitForToast(page, 'Document uploaded successfully')
    
    // Should show document in list
    await expect(page.locator('[data-testid="document-item"]')).toBeVisible()
    await expect(page.locator('text=tenant-id.pdf')).toBeVisible()
  })

  test('should view tenant lease information', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    await page.click('[data-testid="tenant-card"]:first-child')
    
    // Navigate to lease tab
    await page.click('[data-testid="tenant-lease-tab"]')
    
    // Should show active lease information
    await expect(page.locator('[data-testid="lease-status"]')).toContainText('ACTIVE')
    await expect(page.locator('[data-testid="lease-property"]')).toContainText('Test Property 1')
    await expect(page.locator('[data-testid="lease-unit"]')).toContainText('Unit A')
    await expect(page.locator('[data-testid="lease-rent"]')).toContainText('$2,000')
    
    // Should show lease actions
    await expect(page.locator('[data-testid="view-lease-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="edit-lease-button"]')).toBeVisible()
  })

  test('should view tenant payment history', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    await page.click('[data-testid="tenant-card"]:first-child')
    
    // Navigate to payments tab
    await page.click('[data-testid="tenant-payments-tab"]')
    
    // Should show payment history
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount(2)
    
    // Should show paid payment
    await expect(page.locator('[data-testid="payment-status-paid"]')).toBeVisible()
    await expect(page.locator('text=$2,000.00')).toBeVisible()
    
    // Should show pending payment
    await expect(page.locator('[data-testid="payment-status-pending"]')).toBeVisible()
  })

  test('should view tenant maintenance requests', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    await page.click('[data-testid="tenant-card"]:first-child')
    
    // Navigate to maintenance tab
    await page.click('[data-testid="tenant-maintenance-tab"]')
    
    // Should show maintenance requests
    await expect(page.locator('[data-testid="maintenance-request"]')).toHaveCount(2)
    await expect(page.locator('text=Leaky Faucet')).toBeVisible()
    await expect(page.locator('text=Broken Light')).toBeVisible()
    
    // Should show request statuses
    await expect(page.locator('[data-testid="maintenance-status-open"]')).toBeVisible()
    await expect(page.locator('[data-testid="maintenance-status-in-progress"]')).toBeVisible()
  })

  test('should deactivate a tenant', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    await page.click('[data-testid="tenant-card"]:first-child')
    
    // Click deactivate button
    await page.click('[data-testid="deactivate-tenant-button"]')
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="deactivate-confirmation-dialog"]')).toBeVisible()
    await expect(page.locator('text=Are you sure you want to deactivate this tenant?')).toBeVisible()
    
    // Confirm deactivation
    await page.click('[data-testid="confirm-deactivate-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Tenant deactivated successfully')
    
    // Should show inactive status
    await expect(page.locator('[data-testid="tenant-status"]')).toContainText('INACTIVE')
  })

  test('should filter tenants', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    
    // Use search filter
    await page.fill('[data-testid="tenant-search"]', 'Jane')
    
    // Should filter to only show matching tenant
    await expect(page.locator('[data-testid="tenant-card"]')).toHaveCount(1)
    await expect(page.locator('text=Jane Tenant')).toBeVisible()
    await expect(page.locator('text=Bob Tenant')).not.toBeVisible()
    
    // Filter by status
    await page.selectOption('[data-testid="tenant-status-filter"]', 'ACTIVE')
    
    // Clear search
    await page.fill('[data-testid="tenant-search"]', '')
    await expect(page.locator('[data-testid="tenant-card"]')).toHaveCount(2)
  })

  test('should handle tenant form validation', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    await page.click('[data-testid="invite-tenant-button"]')
    
    // Try to submit empty form
    await page.click('[data-testid="send-invitation-button"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="invite-email-error"]')).toContainText('Email is required')
    await expect(page.locator('[data-testid="invite-first-name-error"]')).toContainText('First name is required')
    
    // Fill with invalid email
    await page.fill('[data-testid="invite-email"]', 'invalid-email')
    await page.click('[data-testid="send-invitation-button"]')
    
    // Should show email validation error
    await expect(page.locator('[data-testid="invite-email-error"]')).toContainText('Please enter a valid email')
  })

  test('should resend tenant invitation', async ({ page }) => {
    await navigateToSection(page, 'tenants')
    
    // Find pending invitation
    await expect(page.locator('[data-testid="tenant-status-pending"]')).toBeVisible()
    
    // Click resend invitation button
    await page.click('[data-testid="resend-invitation-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Invitation resent successfully')
  })
})