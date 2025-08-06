/**
 * API Integration E2E Tests
 * Tests that verify frontend-backend integration
 */

import { test, expect, Page } from '@playwright/test'

test.describe('API Integration Tests', () => {
  test('property CRUD operations work end-to-end', async ({ page }) => {
    // Login and navigate to properties
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await page.click('[data-testid="properties-nav-link"]')
    
    // Test Create
    await page.click('[data-testid="add-property-button"]')
    
    const propertyName = `API Test Property ${Date.now()}`
    await page.fill('[data-testid="property-name-input"]', propertyName)
    await page.fill('[data-testid="property-address-input"]', '123 API Test St')
    await page.fill('[data-testid="property-city-input"]', 'Test City')
    await page.selectOption('[data-testid="property-state-select"]', 'TX')
    await page.fill('[data-testid="property-zip-input"]', '12345')
    await page.selectOption('[data-testid="property-type-select"]', 'apartment')
    await page.fill('[data-testid="property-bedrooms-input"]', '2')
    await page.fill('[data-testid="property-bathrooms-input"]', '1.5')
    await page.fill('[data-testid="property-rent-input"]', '1500')
    
    // Intercept API call
    const createResponse = page.waitForResponse(response => 
      response.url().includes('/api/properties') && response.request().method() === 'POST'
    )
    
    await page.click('[data-testid="save-property-button"]')
    
    const response = await createResponse
    expect(response.status()).toBe(201)
    
    const responseBody = await response.json()
    expect(responseBody.name).toBe(propertyName)
    expect(responseBody.address).toBe('123 API Test St')
    
    // Verify property appears in list
    await expect(page.locator('[data-testid="properties-table"]')).toContainText(propertyName)
    
    // Test Read
    await page.click(`[data-testid="view-property-${responseBody.id}"]`)
    
    await expect(page.locator('[data-testid="property-details"]')).toContainText(propertyName)
    await expect(page.locator('[data-testid="property-details"]')).toContainText('$1,500')
    
    // Test Update
    await page.click('[data-testid="edit-property-button"]')
    await page.fill('[data-testid="property-rent-input"]', '1600')
    
    const updateResponse = page.waitForResponse(response => 
      response.url().includes(`/api/properties/${responseBody.id}`) && 
      response.request().method() === 'PUT'
    )
    
    await page.click('[data-testid="save-property-button"]')
    
    const updateResp = await updateResponse
    expect(updateResp.status()).toBe(200)
    
    // Verify update
    await expect(page.locator('[data-testid="property-details"]')).toContainText('$1,600')
    
    // Test Delete
    await page.click('[data-testid="delete-property-button"]')
    await page.click('[data-testid="confirm-delete-button"]')
    
    const deleteResponse = page.waitForResponse(response => 
      response.url().includes(`/api/properties/${responseBody.id}`) && 
      response.request().method() === 'DELETE'
    )
    
    const deleteResp = await deleteResponse
    expect(deleteResp.status()).toBe(204)
    
    // Verify property removed from list
    await expect(page.locator('[data-testid="properties-table"]')).not.toContainText(propertyName)
  })
  
  test('tenant invitation flow with API integration', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // First create a property
    await page.click('[data-testid="properties-nav-link"]')
    await page.click('[data-testid="add-property-button"]')
    
    const propertyName = `Invitation Test Property ${Date.now()}`
    await page.fill('[data-testid="property-name-input"]', propertyName)
    await page.fill('[data-testid="property-address-input"]', '456 Invitation St')
    await page.fill('[data-testid="property-city-input"]', 'Test City')
    await page.selectOption('[data-testid="property-state-select"]', 'TX')
    await page.fill('[data-testid="property-zip-input"]', '12345')
    await page.selectOption('[data-testid="property-type-select"]', 'single_family')
    await page.fill('[data-testid="property-bedrooms-input"]', '3')
    await page.fill('[data-testid="property-bathrooms-input"]', '2')
    await page.fill('[data-testid="property-rent-input"]', '2000')
    
    await page.click('[data-testid="save-property-button"]')
    
    // Navigate to tenants and send invitation
    await page.click('[data-testid="tenants-nav-link"]')
    await page.click('[data-testid="invite-tenant-button"]')
    
    const tenantEmail = `tenant.${Date.now()}@example.com`
    await page.fill('[data-testid="tenant-email-input"]', tenantEmail)
    await page.selectOption('[data-testid="property-select"]', propertyName)
    await page.fill('[data-testid="monthly-rent-input"]', '2000')
    await page.fill('[data-testid="lease-start-input"]', '2024-01-01')
    await page.fill('[data-testid="lease-end-input"]', '2024-12-31')
    
    // Intercept invitation API call
    const invitationResponse = page.waitForResponse(response => 
      response.url().includes('/api/tenants/invite') && 
      response.request().method() === 'POST'
    )
    
    await page.click('[data-testid="send-invitation-button"]')
    
    const inviteResp = await invitationResponse
    expect(inviteResp.status()).toBe(201)
    
    const inviteBody = await inviteResp.json()
    expect(inviteBody.email).toBe(tenantEmail)
    expect(inviteBody.invitationSent).toBe(true)
    
    // Verify invitation appears in tenants list
    await expect(page.locator('[data-testid="pending-invitations"]')).toContainText(tenantEmail)
  })
  
  test('maintenance request workflow with API calls', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await page.click('[data-testid="maintenance-nav-link"]')
    await page.click('[data-testid="add-maintenance-button"]')
    
    await page.fill('[data-testid="maintenance-title-input"]', 'API Test Request')
    await page.fill('[data-testid="maintenance-description-input"]', 'Testing API integration')
    await page.selectOption('[data-testid="maintenance-priority-select"]', 'medium')
    await page.selectOption('[data-testid="maintenance-category-select"]', 'other')
    
    // Intercept create request
    const createRequestResponse = page.waitForResponse(response => 
      response.url().includes('/api/maintenance-requests') && 
      response.request().method() === 'POST'
    )
    
    await page.click('[data-testid="save-maintenance-button"]')
    
    const createResp = await createRequestResponse
    expect(createResp.status()).toBe(201)
    
    const requestBody = await createResp.json()
    expect(requestBody.title).toBe('API Test Request')
    expect(requestBody.priority).toBe('medium')
    
    // Update request status
    await page.click(`[data-testid="update-status-${requestBody.id}"]`)
    await page.selectOption('[data-testid="status-select"]', 'in_progress')
    
    const updateResponse = page.waitForResponse(response => 
      response.url().includes(`/api/maintenance-requests/${requestBody.id}`) && 
      response.request().method() === 'PUT'
    )
    
    await page.click('[data-testid="update-status-button"]')
    
    const updateResp = await updateResponse
    expect(updateResp.status()).toBe(200)
    
    const updatedBody = await updateResp.json()
    expect(updatedBody.status).toBe('in_progress')
  })
  
  test('file upload integration', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    await page.click('[data-testid="documents-nav-link"]')
    await page.click('[data-testid="upload-document-button"]')
    
    // Create a test file
    const fileContent = 'This is a test document for API integration testing'
    const fileName = 'test-document.txt'
    
    // Set up file input
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(fileContent)
    })
    
    await page.fill('[data-testid="document-title-input"]', 'API Test Document')
    await page.selectOption('[data-testid="document-category-select"]', 'lease')
    
    // Intercept upload API call
    const uploadResponse = page.waitForResponse(response => 
      response.url().includes('/api/documents/upload') && 
      response.request().method() === 'POST'
    )
    
    await page.click('[data-testid="upload-button"]')
    
    const uploadResp = await uploadResponse
    expect(uploadResp.status()).toBe(201)
    
    const uploadBody = await uploadResp.json()
    expect(uploadBody.fileName).toBe(fileName)
    expect(uploadBody.title).toBe('API Test Document')
    
    // Verify document appears in list
    await expect(page.locator('[data-testid="documents-list"]')).toContainText('API Test Document')
  })
  
  test('real-time updates via WebSocket/polling', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // Navigate to dashboard
    await page.click('[data-testid="dashboard-nav-link"]')
    
    // Verify initial data load
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible()
    
    // In a separate context, simulate data change (this would be done through admin panel or API call)
    // For testing, we'll trigger a refresh and verify data updates
    
    await page.reload()
    
    // Verify updated data appears
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible()
    
    // Check that activity feed updates
    await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible()
  })
  
  test('error handling and retry mechanisms', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'owner@tenantflow.app')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    
    // Simulate API failure
    await page.route('**/api/properties', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      } else {
        route.continue()
      }
    })
    
    await page.click('[data-testid="properties-nav-link"]')
    await page.click('[data-testid="add-property-button"]')
    
    await page.fill('[data-testid="property-name-input"]', 'Error Test Property')
    await page.fill('[data-testid="property-address-input"]', '789 Error St')
    await page.click('[data-testid="save-property-button"]')
    
    // Verify error handling
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Internal server error')
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    
    // Remove route mock and test retry
    await page.unroute('**/api/properties')
    
    await page.click('[data-testid="retry-button"]')
    
    // Verify success after retry
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Property created successfully')
  })
})