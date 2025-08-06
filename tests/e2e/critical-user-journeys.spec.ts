/**
 * Critical User Journeys E2E Tests
 * Complete workflow testing for essential property management operations
 */

import { test, expect, Page } from '@playwright/test'

// Test data factories
const createPropertyData = () => ({
  name: `Test Property ${Date.now()}`,
  address: '123 Test Street',
  city: 'Test City',
  state: 'TX',
  zipCode: '12345',
  propertyType: 'single_family',
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1500,
  rentAmount: 2000
})

const createTenantData = () => ({
  firstName: 'John',
  lastName: 'Doe',
  email: `john.doe.${Date.now()}@example.com`,
  phone: '555-0123',
  dateOfBirth: '1990-01-01'
})

// Helper functions
async function loginAsOwner(page: Page) {
  await page.goto('/auth/login')
  await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
  await page.fill('[data-testid="password-input"]', 'testpassword')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/dashboard')
}

async function createProperty(page: Page, propertyData = createPropertyData()) {
  await page.click('[data-testid="add-property-button"]')
  
  await page.fill('[data-testid="property-name-input"]', propertyData.name)
  await page.fill('[data-testid="property-address-input"]', propertyData.address)
  await page.fill('[data-testid="property-city-input"]', propertyData.city)
  await page.selectOption('[data-testid="property-state-select"]', propertyData.state)
  await page.fill('[data-testid="property-zip-input"]', propertyData.zipCode)
  await page.selectOption('[data-testid="property-type-select"]', propertyData.propertyType)
  await page.fill('[data-testid="property-bedrooms-input"]', propertyData.bedrooms.toString())
  await page.fill('[data-testid="property-bathrooms-input"]', propertyData.bathrooms.toString())
  await page.fill('[data-testid="property-sqft-input"]', propertyData.squareFeet.toString())
  await page.fill('[data-testid="property-rent-input"]', propertyData.rentAmount.toString())
  
  await page.click('[data-testid="save-property-button"]')
  
  await expect(page.locator('[data-testid="success-message"]')).toContainText('Property created successfully')
  return propertyData
}

async function inviteTenant(page: Page, tenantData = createTenantData(), propertyId: string) {
  await page.click('[data-testid="invite-tenant-button"]')
  
  await page.fill('[data-testid="tenant-email-input"]', tenantData.email)
  await page.selectOption('[data-testid="property-select"]', propertyId)
  await page.fill('[data-testid="monthly-rent-input"]', '2000')
  await page.fill('[data-testid="lease-start-input"]', '2024-01-01')
  await page.fill('[data-testid="lease-end-input"]', '2024-12-31')
  
  await page.click('[data-testid="send-invitation-button"]')
  
  await expect(page.locator('[data-testid="success-message"]')).toContainText('Invitation sent successfully')
  return tenantData
}

test.describe('Complete Property Owner Journey', () => {
  test('property owner can manage entire rental workflow', async ({ page }) => {
    // Step 1: Login as property owner
    await loginAsOwner(page)
    
    // Step 2: Create a new property
    const propertyData = await createProperty(page)
    
    // Verify property appears in dashboard
    await expect(page.locator('[data-testid="property-card"]')).toContainText(propertyData.name)
    
    // Step 3: Navigate to properties page
    await page.click('[data-testid="properties-nav-link"]')
    await expect(page).toHaveURL('/properties')
    
    // Verify property is listed
    await expect(page.locator('[data-testid="properties-table"]')).toContainText(propertyData.name)
    
    // Step 4: Edit property details
    await page.click(`[data-testid="edit-property-${propertyData.name}"]`)
    await page.fill('[data-testid="property-rent-input"]', '2200')
    await page.click('[data-testid="save-property-button"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property updated successfully')
    
    // Step 5: Invite a tenant
    const tenantData = await inviteTenant(page, createTenantData(), propertyData.name)
    
    // Step 6: Navigate to tenants page
    await page.click('[data-testid="tenants-nav-link"]')
    await expect(page).toHaveURL('/tenants')
    
    // Verify pending invitation
    await expect(page.locator('[data-testid="tenant-invitation"]')).toContainText(tenantData.email)
    
    // Step 7: Create maintenance request
    await page.click('[data-testid="maintenance-nav-link"]')
    await page.click('[data-testid="add-maintenance-button"]')
    
    await page.fill('[data-testid="maintenance-title-input"]', 'Leaky faucet')
    await page.fill('[data-testid="maintenance-description-input"]', 'Kitchen faucet is dripping')
    await page.selectOption('[data-testid="maintenance-priority-select"]', 'medium')
    await page.selectOption('[data-testid="maintenance-category-select"]', 'plumbing')
    await page.selectOption('[data-testid="maintenance-property-select"]', propertyData.name)
    
    await page.click('[data-testid="save-maintenance-button"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Maintenance request created')
    
    // Step 8: Generate reports
    await page.click('[data-testid="reports-nav-link"]')
    await page.click('[data-testid="generate-report-button"]')
    
    await page.selectOption('[data-testid="report-type-select"]', 'financial')
    await page.selectOption('[data-testid="report-period-select"]', 'monthly')
    
    await page.click('[data-testid="generate-button"]')
    
    await expect(page.locator('[data-testid="report-download-link"]')).toBeVisible()
    
    // Step 9: View financial dashboard
    await page.click('[data-testid="dashboard-nav-link"]')
    
    // Verify statistics are updated
    await expect(page.locator('[data-testid="total-properties"]')).toContainText('1')
    await expect(page.locator('[data-testid="total-revenue"]')).toContainText('$2,200')
  })
  
  test('handles property workflow with multiple tenants', async ({ page }) => {
    await loginAsOwner(page)
    
    // Create property with multiple units
    const propertyData = await createProperty(page)
    
    // Add multiple units to property
    await page.click(`[data-testid="manage-units-${propertyData.name}"]`)
    
    for (let i = 1; i <= 3; i++) {
      await page.click('[data-testid="add-unit-button"]')
      await page.fill('[data-testid="unit-number-input"]', `Unit ${i}`)
      await page.fill('[data-testid="unit-rent-input"]', '1800')
      await page.click('[data-testid="save-unit-button"]')
    }
    
    // Invite tenants for each unit
    for (let i = 1; i <= 3; i++) {
      const tenantData = createTenantData()
      tenantData.email = `tenant${i}.${Date.now()}@example.com`
      
      await inviteTenant(page, tenantData, `${propertyData.name} - Unit ${i}`)
    }
    
    // Verify all invitations sent
    await page.click('[data-testid="tenants-nav-link"]')
    await expect(page.locator('[data-testid="pending-invitations"]')).toContainText('3 pending')
  })
})

test.describe('Tenant Portal Journey', () => {
  test('tenant can accept invitation and manage profile', async ({ page }) => {
    // This would typically involve email processing
    // For testing, we'll simulate the invitation acceptance flow
    
    await page.goto('/tenant/accept-invitation?token=mock-invitation-token')
    
    // Fill out tenant acceptance form
    await page.fill('[data-testid="first-name-input"]', 'Jane')
    await page.fill('[data-testid="last-name-input"]', 'Smith')
    await page.fill('[data-testid="phone-input"]', '555-0124')
    await page.fill('[data-testid="date-of-birth-input"]', '1985-05-15')
    await page.fill('[data-testid="emergency-contact-name-input"]', 'John Smith')
    await page.fill('[data-testid="emergency-contact-phone-input"]', '555-0125')
    
    await page.click('[data-testid="accept-invitation-button"]')
    
    await expect(page).toHaveURL('/tenant/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome, Jane!')
    
    // View lease details
    await page.click('[data-testid="view-lease-button"]')
    await expect(page.locator('[data-testid="lease-details"]')).toBeVisible()
    
    // Submit maintenance request
    await page.click('[data-testid="request-maintenance-button"]')
    await page.fill('[data-testid="maintenance-title-input"]', 'AC not working')
    await page.fill('[data-testid="maintenance-description-input"]', 'Air conditioning stopped cooling')
    await page.selectOption('[data-testid="maintenance-priority-select"]', 'high')
    
    await page.click('[data-testid="submit-request-button"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Request submitted successfully')
    
    // Make rent payment
    await page.click('[data-testid="pay-rent-button"]')
    await page.fill('[data-testid="payment-amount-input"]', '2000')
    await page.selectOption('[data-testid="payment-method-select"]', 'bank_transfer')
    
    await page.click('[data-testid="process-payment-button"]')
    
    await expect(page.locator('[data-testid="payment-confirmation"]')).toContainText('Payment processed')
  })
})

test.describe('Property Management Workflows', () => {
  test('complete lease lifecycle management', async ({ page }) => {
    await loginAsOwner(page)
    
    // Create property and tenant
    const propertyData = await createProperty(page)
    const tenantData = await inviteTenant(page, createTenantData(), propertyData.name)
    
    // Navigate to leases
    await page.click('[data-testid="leases-nav-link"]')
    
    // Create new lease
    await page.click('[data-testid="create-lease-button"]')
    
    await page.selectOption('[data-testid="lease-property-select"]', propertyData.name)
    await page.selectOption('[data-testid="lease-tenant-select"]', tenantData.email)
    await page.fill('[data-testid="lease-start-date-input"]', '2024-01-01')
    await page.fill('[data-testid="lease-end-date-input"]', '2024-12-31')
    await page.fill('[data-testid="lease-monthly-rent-input"]', '2000')
    await page.fill('[data-testid="lease-security-deposit-input"]', '4000')
    
    // Configure lease terms
    await page.check('[data-testid="pets-allowed-checkbox"]')
    await page.fill('[data-testid="parking-spaces-input"]', '1')
    await page.fill('[data-testid="late-fee-input"]', '50')
    
    await page.click('[data-testid="create-lease-button"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Lease created successfully')
    
    // Generate lease document
    await page.click('[data-testid="generate-document-button"]')
    await expect(page.locator('[data-testid="document-download-link"]')).toBeVisible()
    
    // Renew lease
    await page.click('[data-testid="renew-lease-button"]')
    
    await page.fill('[data-testid="new-start-date-input"]', '2025-01-01')
    await page.fill('[data-testid="new-end-date-input"]', '2025-12-31')
    await page.fill('[data-testid="new-monthly-rent-input"]', '2100')
    
    await page.click('[data-testid="confirm-renewal-button"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Lease renewed successfully')
  })
  
  test('maintenance request workflow', async ({ page }) => {
    await loginAsOwner(page)
    
    // Create property
    const propertyData = await createProperty(page)
    
    // Navigate to maintenance
    await page.click('[data-testid="maintenance-nav-link"]')
    
    // Create maintenance request
    await page.click('[data-testid="add-maintenance-button"]')
    
    await page.fill('[data-testid="maintenance-title-input"]', 'Broken window')
    await page.fill('[data-testid="maintenance-description-input"]', 'Living room window has a crack')
    await page.selectOption('[data-testid="maintenance-priority-select"]', 'high')
    await page.selectOption('[data-testid="maintenance-category-select"]', 'other')
    await page.selectOption('[data-testid="maintenance-property-select"]', propertyData.name)
    
    await page.click('[data-testid="save-maintenance-button"]')
    
    // Assign contractor
    await page.click('[data-testid="assign-contractor-button"]')
    await page.fill('[data-testid="contractor-name-input"]', 'ABC Repair Services')
    await page.fill('[data-testid="contractor-phone-input"]', '555-REPAIR')
    await page.fill('[data-testid="estimated-cost-input"]', '250')
    await page.fill('[data-testid="scheduled-date-input"]', '2024-01-15')
    
    await page.click('[data-testid="confirm-assignment-button"]')
    
    // Mark as completed
    await page.click('[data-testid="mark-completed-button"]')
    await page.fill('[data-testid="actual-cost-input"]', '275')
    await page.fill('[data-testid="completion-notes-input"]', 'Window replaced successfully')
    
    await page.click('[data-testid="confirm-completion-button"]')
    
    await expect(page.locator('[data-testid="maintenance-status"]')).toContainText('Completed')
  })
})

test.describe('Financial Management', () => {
  test('payment tracking and reporting', async ({ page }) => {
    await loginAsOwner(page)
    
    // Navigate to payments
    await page.click('[data-testid="payments-nav-link"]')
    
    // Record manual payment
    await page.click('[data-testid="record-payment-button"]')
    
    await page.selectOption('[data-testid="payment-tenant-select"]', 'John Doe')
    await page.fill('[data-testid="payment-amount-input"]', '2000')
    await page.selectOption('[data-testid="payment-method-select"]', 'check')
    await page.fill('[data-testid="payment-date-input"]', '2024-01-01')
    
    await page.click('[data-testid="record-payment-button"]')
    
    // Generate financial report
    await page.click('[data-testid="generate-report-button"]')
    
    await page.selectOption('[data-testid="report-type-select"]', 'rent-roll')
    await page.fill('[data-testid="report-start-date-input"]', '2024-01-01')
    await page.fill('[data-testid="report-end-date-input"]', '2024-01-31')
    
    await page.click('[data-testid="generate-button"]')
    
    await expect(page.locator('[data-testid="report-results"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-collected"]')).toContainText('$2,000')
  })
})

test.describe('Error Handling and Edge Cases', () => {
  test('handles network errors gracefully', async ({ page }) => {
    await loginAsOwner(page)
    
    // Simulate network failure
    await page.route('**/api/**', route => route.abort())
    
    await page.click('[data-testid="add-property-button"]')
    await page.fill('[data-testid="property-name-input"]', 'Test Property')
    await page.click('[data-testid="save-property-button"]')
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Network error')
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })
  
  test('handles validation errors properly', async ({ page }) => {
    await loginAsOwner(page)
    
    await page.click('[data-testid="add-property-button"]')
    await page.click('[data-testid="save-property-button"]') // Submit without filling required fields
    
    await expect(page.locator('[data-testid="field-error-name"]')).toContainText('Property name is required')
    await expect(page.locator('[data-testid="field-error-address"]')).toContainText('Address is required')
  })
})