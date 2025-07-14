import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection } from '../utils/test-helpers'
import { TestData } from '../utils/test-users'

test.describe('Payment Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'LANDLORD')
  })

  test('should display payments dashboard', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Should show payment overview cards
    await expect(page.locator('[data-testid="total-collected-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-payments-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="overdue-payments-card"]')).toBeVisible()
    
    // Should show payments list
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount(2)
    
    // Should show payment statuses
    await expect(page.locator('[data-testid="payment-status-paid"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-status-pending"]')).toBeVisible()
  })

  test('should record a manual payment', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Click record payment button
    await page.click('[data-testid="record-payment-button"]')
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible()
    
    // Fill payment form
    const paymentData = {
      'payment-lease': TestData.LEASES.LEASE_1.id,
      'payment-amount': '2000',
      'payment-type': 'RENT',
      'payment-method': 'CHECK',
      'payment-description': 'Monthly rent payment - manual entry',
      'payment-reference': 'CHECK-001'
    }
    
    await page.selectOption('[data-testid="payment-lease"]', paymentData['payment-lease'])
    await page.fill('[data-testid="payment-amount"]', paymentData['payment-amount'])
    await page.selectOption('[data-testid="payment-type"]', paymentData['payment-type'])
    await page.selectOption('[data-testid="payment-method"]', paymentData['payment-method'])
    await page.fill('[data-testid="payment-description"]', paymentData['payment-description'])
    await page.fill('[data-testid="payment-reference"]', paymentData['payment-reference'])
    
    // Set payment date
    const today = new Date()
    await page.fill('[data-testid="payment-date"]', today.toISOString().split('T')[0])
    
    // Submit payment
    await page.click('[data-testid="payment-submit"]')
    
    // Should show success toast
    await waitForToast(page, 'Payment recorded successfully')
    
    // Should close modal and show new payment in list
    await expect(page.locator('[data-testid="payment-form-modal"]')).not.toBeVisible()
    await expect(page.locator('text=CHECK-001')).toBeVisible()
  })

  test('should view payment details', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Click on payment item
    await page.click('[data-testid="payment-item"]:first-child')
    
    // Should open payment details modal
    await expect(page.locator('[data-testid="payment-details-modal"]')).toBeVisible()
    
    // Should show payment information
    await expect(page.locator('[data-testid="payment-amount"]')).toContainText('$2,000.00')
    await expect(page.locator('[data-testid="payment-tenant"]')).toContainText('Jane Tenant')
    await expect(page.locator('[data-testid="payment-property"]')).toContainText('Test Property 1')
    await expect(page.locator('[data-testid="payment-status"]')).toContainText('PAID')
  })

  test('should edit a payment', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Click edit button on payment
    await page.click('[data-testid="payment-edit-button"]')
    await expect(page.locator('[data-testid="payment-form-modal"]')).toBeVisible()
    
    // Verify form is pre-filled
    await expect(page.locator('[data-testid="payment-amount"]')).toHaveValue('2000')
    
    // Update payment details
    await page.fill('[data-testid="payment-amount"]', '2050')
    await page.fill('[data-testid="payment-description"]', 'Updated payment description')
    
    // Submit form
    await page.click('[data-testid="payment-submit"]')
    
    // Should show success toast
    await waitForToast(page, 'Payment updated successfully')
    
    // Should show updated amount
    await expect(page.locator('text=$2,050.00')).toBeVisible()
  })

  test('should mark payment as paid', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Find pending payment and mark as paid
    await page.click('[data-testid="mark-paid-button"]')
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="mark-paid-modal"]')).toBeVisible()
    
    // Fill payment details
    await page.selectOption('[data-testid="payment-method"]', 'BANK_TRANSFER')
    await page.fill('[data-testid="payment-reference"]', 'TXN-12345')
    await page.fill('[data-testid="payment-notes"]', 'Received via bank transfer')
    
    // Confirm payment
    await page.click('[data-testid="confirm-payment-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Payment marked as paid')
    
    // Should update status to paid
    await expect(page.locator('[data-testid="payment-status-paid"]')).toHaveCount(2)
  })

  test('should filter payments by status', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Filter by paid payments
    await page.selectOption('[data-testid="payment-status-filter"]', 'PAID')
    
    // Should show only paid payments
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="payment-status-paid"]')).toBeVisible()
    
    // Filter by pending payments
    await page.selectOption('[data-testid="payment-status-filter"]', 'PENDING')
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="payment-status-pending"]')).toBeVisible()
    
    // Show all payments
    await page.selectOption('[data-testid="payment-status-filter"]', 'ALL')
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount(2)
  })

  test('should filter payments by date range', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Set date range filter
    const today = new Date()
    const lastMonth = new Date(today)
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    await page.fill('[data-testid="date-from"]', lastMonth.toISOString().split('T')[0])
    await page.fill('[data-testid="date-to"]', today.toISOString().split('T')[0])
    
    // Apply filter
    await page.click('[data-testid="apply-date-filter"]')
    
    // Should show payments in date range
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount(2)
  })

  test('should filter payments by property', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Filter by specific property
    await page.selectOption('[data-testid="payment-property-filter"]', TestData.PROPERTIES.PROPERTY_1.id)
    
    // Should show only payments for that property
    await expect(page.locator('text=Test Property 1')).toBeVisible()
  })

  test('should search payments by tenant name', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Search for specific tenant
    await page.fill('[data-testid="payment-search"]', 'Jane')
    
    // Should show only payments for that tenant
    await expect(page.locator('text=Jane Tenant')).toBeVisible()
    
    // Clear search
    await page.fill('[data-testid="payment-search"]', '')
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount(2)
  })

  test('should export payments report', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Click export button
    await page.click('[data-testid="export-payments-button"]')
    
    // Should show export options
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible()
    
    // Select export format
    await page.selectOption('[data-testid="export-format"]', 'CSV')
    
    // Set date range
    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    
    await page.fill('[data-testid="export-date-from"]', startOfYear.toISOString().split('T')[0])
    await page.fill('[data-testid="export-date-to"]', today.toISOString().split('T')[0])
    
    // Start export
    await page.click('[data-testid="start-export-button"]')
    
    // Should show success message
    await waitForToast(page, 'Export started successfully')
  })

  test('should send payment reminder', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Find pending payment and send reminder
    await page.click('[data-testid="send-reminder-button"]')
    
    // Should show reminder modal
    await expect(page.locator('[data-testid="payment-reminder-modal"]')).toBeVisible()
    
    // Customize reminder message
    await page.fill('[data-testid="reminder-subject"]', 'Payment Reminder - Rent Due')
    await page.fill('[data-testid="reminder-message"]', 'This is a friendly reminder that your rent payment is due.')
    
    // Send reminder
    await page.click('[data-testid="send-reminder-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Payment reminder sent successfully')
  })

  test('should handle late payment fee', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Add late fee to overdue payment
    await page.click('[data-testid="add-late-fee-button"]')
    
    // Should show late fee modal
    await expect(page.locator('[data-testid="late-fee-modal"]')).toBeVisible()
    
    // Fill late fee details
    await page.fill('[data-testid="late-fee-amount"]', '50')
    await page.fill('[data-testid="late-fee-reason"]', 'Payment received after due date')
    
    // Apply late fee
    await page.click('[data-testid="apply-late-fee-button"]')
    
    // Should show success toast
    await waitForToast(page, 'Late fee added successfully')
    
    // Should update payment amount
    await expect(page.locator('text=$2,050.00')).toBeVisible()
  })

  test('should view payment analytics', async ({ page }) => {
    await navigateToSection(page, 'payments')
    
    // Navigate to analytics tab
    await page.click('[data-testid="payment-analytics-tab"]')
    
    // Should show analytics charts
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="collection-rate-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-trends-chart"]')).toBeVisible()
    
    // Should show key metrics
    await expect(page.locator('[data-testid="collection-rate-metric"]')).toBeVisible()
    await expect(page.locator('[data-testid="average-payment-time-metric"]')).toBeVisible()
  })

  test('should handle payment form validation', async ({ page }) => {
    await navigateToSection(page, 'payments')
    await page.click('[data-testid="record-payment-button"]')
    
    // Try to submit empty form
    await page.click('[data-testid="payment-submit"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="payment-lease-error"]')).toContainText('Lease is required')
    await expect(page.locator('[data-testid="payment-amount-error"]')).toContainText('Amount is required')
    
    // Fill with invalid amount
    await page.fill('[data-testid="payment-amount"]', '-100')
    await page.click('[data-testid="payment-submit"]')
    
    // Should show amount validation error
    await expect(page.locator('[data-testid="payment-amount-error"]')).toContainText('Amount must be positive')
    
    // Fill with valid amount but invalid date
    await page.fill('[data-testid="payment-amount"]', '1000')
    
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10)
    
    await page.fill('[data-testid="payment-date"]', futureDate.toISOString().split('T')[0])
    await page.click('[data-testid="payment-submit"]')
    
    // Should show date validation error
    await expect(page.locator('[data-testid="payment-date-error"]')).toContainText('Payment date cannot be in the future')
  })
})