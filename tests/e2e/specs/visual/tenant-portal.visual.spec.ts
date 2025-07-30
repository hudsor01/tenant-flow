import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Tenant Portal Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
    
    // Mock tenant authentication
    await page.goto('/tenant-portal')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Tenant Dashboard', () => {
    test('tenant dashboard overview', async ({ page }) => {
      await expect(page).toHaveScreenshot('tenant-dashboard-overview.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="current-date"]'),
          page.locator('[data-testid="last-login"]'),
        ],
      })
    })

    test('tenant lease information card', async ({ page }) => {
      const leaseCard = page.locator('[data-testid="lease-info-card"]')
      await expect(leaseCard).toHaveScreenshot('tenant-lease-info-card.png')
    })

    test('tenant payment status card', async ({ page }) => {
      const paymentCard = page.locator('[data-testid="payment-status-card"]')
      await expect(paymentCard).toHaveScreenshot('tenant-payment-status-card.png')
    })

    test('tenant recent activity', async ({ page }) => {
      const activitySection = page.locator('[data-testid="tenant-recent-activity"]')
      await expect(activitySection).toHaveScreenshot('tenant-recent-activity.png')
    })

    test('tenant quick actions', async ({ page }) => {
      const quickActions = page.locator('[data-testid="tenant-quick-actions"]')
      await expect(quickActions).toHaveScreenshot('tenant-quick-actions.png')
    })
  })

  test.describe('Rent Payment', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tenant-portal/payments')
      await page.waitForLoadState('networkidle')
    })

    test('payment history page', async ({ page }) => {
      await expect(page).toHaveScreenshot('tenant-payment-history.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="payment-date"]'),
          page.locator('[data-testid="transaction-id"]'),
        ],
      })
    })

    test('make payment modal', async ({ page }) => {
      await page.click('[data-testid="make-payment-button"]')
      await page.waitForSelector('[data-testid="payment-modal"]')

      const modal = page.locator('[data-testid="payment-modal"]')
      await expect(modal).toHaveScreenshot('tenant-payment-modal.png')
    })

    test('payment method selection', async ({ page }) => {
      await page.click('[data-testid="make-payment-button"]')
      await page.waitForSelector('[data-testid="payment-modal"]')

      // Test different payment methods
      const paymentMethods = ['credit-card', 'bank-account', 'ach']
      
      for (const method of paymentMethods) {
        await page.click(`[data-testid="payment-method-${method}"]`)
        await page.waitForTimeout(200)
        
        const paymentForm = page.locator('[data-testid="payment-form"]')
        await expect(paymentForm).toHaveScreenshot(`tenant-payment-${method}-form.png`)
      }
    })

    test('payment confirmation screen', async ({ page }) => {
      // Mock successful payment
      await page.route('/api/v1/payments', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'payment-12345',
            amount: 1200,
            status: 'completed',
            transaction_id: 'txn_abc123',
          }),
        })
      })

      await page.click('[data-testid="make-payment-button"]')
      await page.waitForSelector('[data-testid="payment-modal"]')
      
      // Fill payment form
      await page.click('[data-testid="payment-method-credit-card"]')
      await page.fill('[name="cardNumber"]', '4242424242424242')
      await page.fill('[name="expiryDate"]', '12/25')
      await page.fill('[name="cvv"]', '123')
      await page.fill('[name="amount"]', '1200')
      
      await page.click('[data-testid="submit-payment-button"]')
      await page.waitForSelector('[data-testid="payment-confirmation"]')

      await expect(page.locator('[data-testid="payment-confirmation"]')).toHaveScreenshot('tenant-payment-confirmation.png')
    })

    test('payment failure screen', async ({ page }) => {
      // Mock failed payment
      await page.route('/api/v1/payments', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'card_declined',
            message: 'Your card was declined',
          }),
        })
      })

      await page.click('[data-testid="make-payment-button"]')
      await page.waitForSelector('[data-testid="payment-modal"]')
      
      // Fill payment form
      await page.click('[data-testid="payment-method-credit-card"]')
      await page.fill('[name="cardNumber"]', '4000000000000002') // Declined card
      await page.fill('[name="expiryDate"]', '12/25')
      await page.fill('[name="cvv"]', '123')
      await page.fill('[name="amount"]', '1200')
      
      await page.click('[data-testid="submit-payment-button"]')
      await page.waitForTimeout(500)

      await expect(page.locator('[data-testid="payment-error"]')).toHaveScreenshot('tenant-payment-failure.png')
    })

    test('payment receipt download', async ({ page }) => {
      const receiptButton = page.locator('[data-testid="download-receipt"]').first()
      
      // Normal state
      await expect(receiptButton).toHaveScreenshot('receipt-download-button.png')
      
      // Hover state
      await receiptButton.hover()
      await page.waitForTimeout(200)
      await expect(receiptButton).toHaveScreenshot('receipt-download-button-hover.png')
    })
  })

  test.describe('Maintenance Requests', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tenant-portal/maintenance')
      await page.waitForLoadState('networkidle')
    })

    test('maintenance requests list', async ({ page }) => {
      await expect(page).toHaveScreenshot('tenant-maintenance-requests.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="request-date"]'),
          page.locator('[data-testid="last-updated"]'),
        ],
      })
    })

    test('create maintenance request modal', async ({ page }) => {
      await page.click('[data-testid="create-request-button"]')
      await page.waitForSelector('[data-testid="maintenance-request-modal"]')

      const modal = page.locator('[data-testid="maintenance-request-modal"]')
      await expect(modal).toHaveScreenshot('tenant-create-maintenance-request.png')
    })

    test('maintenance request categories', async ({ page }) => {
      await page.click('[data-testid="create-request-button"]')
      await page.waitForSelector('[data-testid="maintenance-request-modal"]')

      // Test different categories
      const categories = ['plumbing', 'electrical', 'appliance', 'hvac', 'pest-control', 'other']
      
      for (const category of categories) {
        await page.click(`[data-testid="category-${category}"]`)
        await page.waitForTimeout(200)
        
        const form = page.locator('[data-testid="maintenance-form"]')
        await expect(form).toHaveScreenshot(`maintenance-category-${category}.png`)
      }
    })

    test('maintenance request priority levels', async ({ page }) => {
      await page.click('[data-testid="create-request-button"]')
      await page.waitForSelector('[data-testid="maintenance-request-modal"]')

      // Test priority indicators
      const priorities = ['low', 'medium', 'high', 'emergency']
      
      for (const priority of priorities) {
        await page.click(`[data-testid="priority-${priority}"]`)
        await page.waitForTimeout(200)
        
        const prioritySection = page.locator('[data-testid="priority-selection"]')
        await expect(prioritySection).toHaveScreenshot(`maintenance-priority-${priority}.png`)
      }
    })

    test('maintenance request photo upload', async ({ page }) => {
      await page.click('[data-testid="create-request-button"]')
      await page.waitForSelector('[data-testid="maintenance-request-modal"]')

      const uploadArea = page.locator('[data-testid="photo-upload-area"]')
      
      // Empty state
      await expect(uploadArea).toHaveScreenshot('photo-upload-empty.png')
      
      // Drag over state
      await uploadArea.hover()
      await page.waitForTimeout(200)
      await expect(uploadArea).toHaveScreenshot('photo-upload-hover.png')
      
      // Mock uploaded photos
      await page.evaluate(() => {
        const uploadArea = document.querySelector('[data-testid="photo-upload-area"]')
        if (uploadArea) {
          uploadArea.setAttribute('data-files-count', '2')
        }
      })
      await page.waitForTimeout(200)
      await expect(uploadArea).toHaveScreenshot('photo-upload-with-files.png')
    })

    test('maintenance request status badges', async ({ page }) => {
      const statusBadges = page.locator('[data-testid="status-badge"]')
      const count = await statusBadges.count()
      
      for (let i = 0; i < Math.min(5, count); i++) {
        const badge = statusBadges.nth(i)
        const status = await badge.getAttribute('data-status')
        await expect(badge).toHaveScreenshot(`maintenance-status-${status}.png`)
      }
    })

    test('maintenance request detail view', async ({ page }) => {
      await page.click('[data-testid="maintenance-request-item"]')
      await page.waitForSelector('[data-testid="maintenance-detail-modal"]')

      const modal = page.locator('[data-testid="maintenance-detail-modal"]')
      await expect(modal).toHaveScreenshot('maintenance-request-detail.png')
    })

    test('maintenance request timeline', async ({ page }) => {
      await page.click('[data-testid="maintenance-request-item"]')
      await page.waitForSelector('[data-testid="maintenance-detail-modal"]')

      const timeline = page.locator('[data-testid="maintenance-timeline"]')
      await expect(timeline).toHaveScreenshot('maintenance-request-timeline.png')
    })
  })

  test.describe('Lease Documents', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tenant-portal/documents')
      await page.waitForLoadState('networkidle')
    })

    test('documents page layout', async ({ page }) => {
      await expect(page).toHaveScreenshot('tenant-documents-page.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="upload-date"]'),
          page.locator('[data-testid="file-size"]'),
        ],
      })
    })

    test('document type filters', async ({ page }) => {
      const filtersSection = page.locator('[data-testid="document-filters"]')
      await expect(filtersSection).toHaveScreenshot('document-filters.png')
      
      // Test active filter
      await page.click('[data-testid="filter-lease-agreement"]')
      await page.waitForTimeout(300)
      await expect(filtersSection).toHaveScreenshot('document-filters-active.png')
    })

    test('document preview modal', async ({ page }) => {
      await page.click('[data-testid="document-preview"]')
      await page.waitForSelector('[data-testid="document-preview-modal"]')

      const modal = page.locator('[data-testid="document-preview-modal"]')
      await expect(modal).toHaveScreenshot('document-preview-modal.png')
    })

    test('document download states', async ({ page }) => {
      const downloadButton = page.locator('[data-testid="download-document"]').first()
      
      // Normal state
      await expect(downloadButton).toHaveScreenshot('document-download-normal.png')
      
      // Loading state (mock slow download)
      await page.route('/api/v1/documents/*/download', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        await route.continue()
      })
      
      await downloadButton.click()
      await page.waitForTimeout(200)
      await expect(downloadButton).toHaveScreenshot('document-download-loading.png')
    })

    test('document upload area', async ({ page }) => {
      const uploadArea = page.locator('[data-testid="document-upload-area"]')
      
      // Empty state
      await expect(uploadArea).toHaveScreenshot('document-upload-empty.png')
      
      // Drag over state
      await uploadArea.hover()
      await page.waitForTimeout(200)
      await expect(uploadArea).toHaveScreenshot('document-upload-hover.png')
    })
  })

  test.describe('Contact Property Manager', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tenant-portal/contact')
      await page.waitForLoadState('networkidle')
    })

    test('contact page layout', async ({ page }) => {
      await expect(page).toHaveScreenshot('tenant-contact-page.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('contact form states', async ({ page }) => {
      const contactForm = page.locator('[data-testid="contact-form"]')
      
      // Empty form
      await expect(contactForm).toHaveScreenshot('contact-form-empty.png')
      
      // Filled form
      await page.fill('[name="subject"]', 'Question about lease terms')
      await page.selectOption('[name="category"]', 'lease')
      await page.fill('[name="message"]', 'I have a question about the parking policy in my lease agreement.')
      await expect(contactForm).toHaveScreenshot('contact-form-filled.png')
    })

    test('contact form validation', async ({ page }) => {
      await page.click('[data-testid="submit-contact-form"]')
      await page.waitForTimeout(300)

      await expect(page.locator('[data-testid="contact-form"]')).toHaveScreenshot('contact-form-validation.png')
    })

    test('contact form success state', async ({ page }) => {
      // Mock successful submission
      await page.route('/api/v1/contact', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'contact-123', message: 'Message sent successfully' }),
        })
      })

      await page.fill('[name="subject"]', 'Test Subject')
      await page.selectOption('[name="category"]', 'general')
      await page.fill('[name="message"]', 'Test message')
      await page.click('[data-testid="submit-contact-form"]')
      await page.waitForTimeout(500)

      await expect(page).toHaveScreenshot('contact-form-success.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('property manager contact info', async ({ page }) => {
      const contactInfo = page.locator('[data-testid="property-manager-info"]')
      await expect(contactInfo).toHaveScreenshot('property-manager-info.png')
    })

    test('emergency contact section', async ({ page }) => {
      const emergencyContact = page.locator('[data-testid="emergency-contact"]')
      await expect(emergencyContact).toHaveScreenshot('emergency-contact-section.png')
    })
  })

  test.describe('Tenant Portal Responsive Design', () => {
    const viewports = [
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' },
    ]

    test('tenant dashboard responsive', async ({ page }) => {
      await page.goto('/tenant-portal')
      await page.waitForLoadState('networkidle')

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        await expect(page).toHaveScreenshot(`tenant-dashboard-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            page.locator('[data-testid="current-date"]'),
            page.locator('[data-testid="last-login"]'),
          ],
        })
      }
    })

    test('tenant navigation responsive', async ({ page }) => {
      await page.goto('/tenant-portal')
      await page.waitForLoadState('networkidle')

      // Test mobile navigation
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(300)

      // Closed navigation
      await expect(page.locator('[data-testid="tenant-navigation"]')).toHaveScreenshot('tenant-nav-mobile-closed.png')

      // Open navigation
      await page.click('[data-testid="mobile-nav-toggle"]')
      await page.waitForTimeout(200)
      await expect(page.locator('[data-testid="tenant-navigation"]')).toHaveScreenshot('tenant-nav-mobile-open.png')
    })
  })

  test.describe('Tenant Portal Themes', () => {
    test('tenant portal dark theme', async ({ page }) => {
      await page.goto('/tenant-portal')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('tenant-portal-dark-theme.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="current-date"]'),
          page.locator('[data-testid="last-login"]'),
        ],
      })
    })

    test('tenant portal high contrast', async ({ page }) => {
      await page.goto('/tenant-portal')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-contrast', 'high')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('tenant-portal-high-contrast.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })
})