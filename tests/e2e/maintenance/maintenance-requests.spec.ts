import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection, uploadTestFile } from '../utils/test-helpers'
import { TestData } from '../utils/test-users'

test.describe('Maintenance Requests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'LANDLORD')
  })

  test('should display maintenance requests list', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Should show existing test maintenance requests
    await expect(page.locator('[data-testid="maintenance-request-card"]')).toHaveCount(2)
    await expect(page.locator('text=Leaky Faucet')).toBeVisible()
    await expect(page.locator('text=Broken Light')).toBeVisible()
    
    // Should show different statuses
    await expect(page.locator('[data-testid="maintenance-status-open"]')).toBeVisible()
    await expect(page.locator('[data-testid="maintenance-status-in-progress"]')).toBeVisible()
  })

  test('should create a new maintenance request (landlord)', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Click create request button
    await page.click('[data-testid="create-maintenance-request-button"]')
    await expect(page.locator('[data-testid="maintenance-request-modal"]')).toBeVisible()
    
    // Fill maintenance request form
    const requestData = {
      'maintenance-title': 'HVAC System Not Working',
      'maintenance-description': 'The heating system is not turning on properly',
      'maintenance-category': 'HVAC',
      'maintenance-priority': 'HIGH'
    }
    
    await page.fill('[data-testid="maintenance-title"]', requestData['maintenance-title'])
    await page.fill('[data-testid="maintenance-description"]', requestData['maintenance-description'])
    await page.selectOption('[data-testid="maintenance-category"]', requestData['maintenance-category'])
    await page.selectOption('[data-testid="maintenance-priority"]', requestData['maintenance-priority'])
    
    // Select property and unit
    await page.selectOption('[data-testid="maintenance-property"]', TestData.PROPERTIES.PROPERTY_1.id)
    await page.selectOption('[data-testid="maintenance-unit"]', TestData.UNITS.UNIT_1.id)
    
    // Submit request
    await page.click('[data-testid="maintenance-submit"]')
    
    // Should show success toast
    await waitForToast(page, 'Maintenance request created successfully')
    
    // Should close modal and show new request in list
    await expect(page.locator('[data-testid="maintenance-request-modal"]')).not.toBeVisible()
    await expect(page.locator('text=HVAC System Not Working')).toBeVisible()
  })

  test('should view maintenance request details', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Click on maintenance request card
    await page.click('[data-testid="maintenance-request-card"]:first-child')
    
    // Should open request details modal
    await expect(page.locator('[data-testid="maintenance-details-modal"]')).toBeVisible()
    
    // Should show request information
    await expect(page.locator('[data-testid="maintenance-title"]')).toContainText('Leaky Faucet')
    await expect(page.locator('[data-testid="maintenance-description"]')).toContainText('Kitchen faucet is leaking')
    await expect(page.locator('[data-testid="maintenance-property"]')).toContainText('Test Property 1')
    await expect(page.locator('[data-testid="maintenance-priority"]')).toContainText('MEDIUM')
    await expect(page.locator('[data-testid="maintenance-status"]')).toContainText('OPEN')
  })

  test('should update maintenance request status', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Click on maintenance request
    await page.click('[data-testid="maintenance-request-card"]:first-child')
    
    // Update status
    await page.selectOption('[data-testid="maintenance-status-select"]', 'IN_PROGRESS')
    await page.click('[data-testid="update-status-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Status updated successfully')
    
    // Should show updated status
    await expect(page.locator('[data-testid="maintenance-status"]')).toContainText('IN_PROGRESS')
  })

  test('should assign contractor to maintenance request', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    await page.click('[data-testid="maintenance-request-card"]:first-child')
    
    // Click assign contractor button
    await page.click('[data-testid="assign-contractor-button"]')
    await expect(page.locator('[data-testid="assign-contractor-modal"]')).toBeVisible()
    
    // Fill contractor information
    await page.fill('[data-testid="contractor-name"]', 'John Plumber')
    await page.fill('[data-testid="contractor-phone"]', '+1234567890')
    await page.fill('[data-testid="contractor-email"]', 'john@plumbingservice.com')
    await page.fill('[data-testid="contractor-company"]', 'Best Plumbing Services')
    
    // Set estimated completion date
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + 3)
    await page.fill('[data-testid="estimated-completion"]', completionDate.toISOString().split('T')[0])
    
    // Assign contractor
    await page.click('[data-testid="assign-contractor-submit"]')
    
    // Should show success toast
    await waitForToast(page, 'Contractor assigned successfully')
    
    // Should show contractor information
    await expect(page.locator('[data-testid="assigned-contractor"]')).toContainText('John Plumber')
  })

  test('should add work notes to maintenance request', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    await page.click('[data-testid="maintenance-request-card"]:first-child')
    
    // Navigate to work notes section
    await page.click('[data-testid="work-notes-tab"]')
    
    // Add work note
    await page.fill('[data-testid="work-note-input"]', 'Identified the source of the leak. Need to replace faucet cartridge.')
    await page.click('[data-testid="add-work-note-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Work note added successfully')
    
    // Should show work note in list
    await expect(page.locator('[data-testid="work-note-item"]')).toBeVisible()
    await expect(page.locator('text=Identified the source of the leak')).toBeVisible()
  })

  test('should upload photos to maintenance request', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    await page.click('[data-testid="maintenance-request-card"]:first-child')
    
    // Navigate to photos section
    await page.click('[data-testid="photos-tab"]')
    
    // Upload photo
    await uploadTestFile(page, '[data-testid="upload-photo-button"]', 'maintenance-photo.jpg')
    
    // Should show upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
    
    // Should show success message
    await waitForToast(page, 'Photo uploaded successfully')
    
    // Should show photo in gallery
    await expect(page.locator('[data-testid="maintenance-photo"]')).toBeVisible()
  })

  test('should complete maintenance request', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    await page.click('[data-testid="maintenance-request-card"]:first-child')
    
    // Click complete request button
    await page.click('[data-testid="complete-request-button"]')
    
    // Should show completion modal
    await expect(page.locator('[data-testid="complete-request-modal"]')).toBeVisible()
    
    // Fill completion details
    await page.fill('[data-testid="completion-notes"]', 'Faucet cartridge replaced. Issue resolved.')
    await page.fill('[data-testid="total-cost"]', '125.50')
    
    // Mark as completed
    await page.click('[data-testid="confirm-completion-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Maintenance request completed successfully')
    
    // Should show completed status
    await expect(page.locator('[data-testid="maintenance-status"]')).toContainText('COMPLETED')
  })

  test('should filter maintenance requests by status', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Filter by open requests
    await page.selectOption('[data-testid="maintenance-status-filter"]', 'OPEN')
    
    // Should show only open requests
    await expect(page.locator('[data-testid="maintenance-request-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="maintenance-status-open"]')).toBeVisible()
    
    // Filter by in-progress requests
    await page.selectOption('[data-testid="maintenance-status-filter"]', 'IN_PROGRESS')
    await expect(page.locator('[data-testid="maintenance-request-card"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="maintenance-status-in-progress"]')).toBeVisible()
  })

  test('should filter maintenance requests by priority', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Filter by medium priority
    await page.selectOption('[data-testid="maintenance-priority-filter"]', 'MEDIUM')
    
    // Should show only medium priority requests
    await expect(page.locator('[data-testid="maintenance-priority-medium"]')).toBeVisible()
  })

  test('should filter maintenance requests by property', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Filter by specific property
    await page.selectOption('[data-testid="maintenance-property-filter"]', TestData.PROPERTIES.PROPERTY_1.id)
    
    // Should show only requests for that property
    await expect(page.locator('text=Test Property 1')).toBeVisible()
  })

  test('should search maintenance requests', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Search for specific request
    await page.fill('[data-testid="maintenance-search"]', 'faucet')
    
    // Should show only matching requests
    await expect(page.locator('[data-testid="maintenance-request-card"]')).toHaveCount(1)
    await expect(page.locator('text=Leaky Faucet')).toBeVisible()
    
    // Clear search
    await page.fill('[data-testid="maintenance-search"]', '')
    await expect(page.locator('[data-testid="maintenance-request-card"]')).toHaveCount(2)
  })

  test('should sort maintenance requests', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    
    // Sort by priority (high to low)
    await page.selectOption('[data-testid="maintenance-sort"]', 'priority-desc')
    
    // Should be sorted by priority
    const firstCard = page.locator('[data-testid="maintenance-request-card"]').first()
    // Note: This would need actual high priority requests to test properly
    
    // Sort by date created (newest first)
    await page.selectOption('[data-testid="maintenance-sort"]', 'created-desc')
    
    // Should be sorted by creation date
    await expect(page.locator('[data-testid="maintenance-request-card"]')).toHaveCount(2)
  })

  test('should handle maintenance request form validation', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    await page.click('[data-testid="create-maintenance-request-button"]')
    
    // Try to submit empty form
    await page.click('[data-testid="maintenance-submit"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="maintenance-title-error"]')).toContainText('Title is required')
    await expect(page.locator('[data-testid="maintenance-description-error"]')).toContainText('Description is required')
    await expect(page.locator('[data-testid="maintenance-property-error"]')).toContainText('Property is required')
    
    // Fill with invalid data
    await page.fill('[data-testid="maintenance-title"]', 'A') // Too short
    await page.click('[data-testid="maintenance-submit"]')
    
    // Should show title validation error
    await expect(page.locator('[data-testid="maintenance-title-error"]')).toContainText('Title must be at least 3 characters')
  })

  test('should allow tenant to view their maintenance requests', async ({ page }) => {
    // Login as tenant
    await loginAs(page, 'TENANT_1')
    await navigateToSection(page, 'maintenance')
    
    // Should show only tenant's requests
    await expect(page.locator('[data-testid="maintenance-request-card"]')).toHaveCount(2)
    
    // Tenant should not see create button for other properties
    await expect(page.locator('[data-testid="create-maintenance-request-button"]')).toBeVisible()
    
    // But should not see admin functions
    await expect(page.locator('[data-testid="assign-contractor-button"]')).not.toBeVisible()
  })

  test('should send maintenance request notifications', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    await page.click('[data-testid="maintenance-request-card"]:first-child')
    
    // Send notification to tenant
    await page.click('[data-testid="notify-tenant-button"]')
    
    // Should show notification modal
    await expect(page.locator('[data-testid="notification-modal"]')).toBeVisible()
    
    // Fill notification details
    await page.fill('[data-testid="notification-subject"]', 'Maintenance Update')
    await page.fill('[data-testid="notification-message"]', 'Your maintenance request has been assigned to a contractor.')
    
    // Send notification
    await page.click('[data-testid="send-notification-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Notification sent successfully')
  })

  test('should schedule maintenance appointment', async ({ page }) => {
    await navigateToSection(page, 'maintenance')
    await page.click('[data-testid="maintenance-request-card"]:first-child')
    
    // Click schedule appointment button
    await page.click('[data-testid="schedule-appointment-button"]')
    
    // Should show scheduling modal
    await expect(page.locator('[data-testid="schedule-appointment-modal"]')).toBeVisible()
    
    // Fill appointment details
    const appointmentDate = new Date()
    appointmentDate.setDate(appointmentDate.getDate() + 2)
    
    await page.fill('[data-testid="appointment-date"]', appointmentDate.toISOString().split('T')[0])
    await page.fill('[data-testid="appointment-time"]', '10:00')
    await page.fill('[data-testid="appointment-notes"]', 'Contractor will arrive between 10-12 PM')
    
    // Schedule appointment
    await page.click('[data-testid="confirm-appointment-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Appointment scheduled successfully')
    
    // Should show appointment details
    await expect(page.locator('[data-testid="scheduled-appointment"]')).toBeVisible()
  })
})