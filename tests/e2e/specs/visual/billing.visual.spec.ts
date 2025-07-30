import { test, expect } from '@playwright/test'
import { VisualTestHelpers } from '../../helpers/visual-helpers'

test.describe('Billing and Payment Visual Regression', () => {
  let visualHelpers: VisualTestHelpers

  test.beforeEach(async ({ page }) => {
    visualHelpers = new VisualTestHelpers(page)
    await visualHelpers.setupVisualEnvironment()
  })

  test.describe('Billing Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/billing')
      await page.waitForLoadState('networkidle')
    })

    test('billing dashboard overview', async ({ page }) => {
      await expect(page).toHaveScreenshot('billing-dashboard-overview.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="current-date"]'),
          page.locator('[data-testid="last-updated"]'),
        ],
      })
    })

    test('revenue statistics cards', async ({ page }) => {
      const statsContainer = page.locator('[data-testid="revenue-stats"]')
      await expect(statsContainer).toHaveScreenshot('revenue-stats-cards.png')
    })

    test('payment status indicators', async ({ page }) => {
      const statusContainer = page.locator('[data-testid="payment-status-indicators"]')
      await expect(statusContainer).toHaveScreenshot('payment-status-indicators.png')
    })

    test('recent transactions list', async ({ page }) => {
      const transactionsList = page.locator('[data-testid="recent-transactions"]')
      await expect(transactionsList).toHaveScreenshot('recent-transactions-list.png')
    })

    test('revenue chart', async ({ page }) => {
      const revenueChart = page.locator('[data-testid="revenue-chart"]')
      await expect(revenueChart).toHaveScreenshot('revenue-chart.png')
    })
  })

  test.describe('Invoice Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/billing/invoices')
      await page.waitForLoadState('networkidle')
    })

    test('invoices list view', async ({ page }) => {
      await expect(page).toHaveScreenshot('invoices-list-view.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="invoice-date"]'),
          page.locator('[data-testid="due-date"]'),
        ],
      })
    })

    test('invoice status badges', async ({ page }) => {
      const invoiceItems = page.locator('[data-testid="invoice-item"]')
      const count = await invoiceItems.count()

      for (let i = 0; i < Math.min(4, count); i++) {
        const invoice = invoiceItems.nth(i)
        const status = await invoice.getAttribute('data-status')
        await expect(invoice).toHaveScreenshot(`invoice-status-${status}-${i}.png`)
      }
    })

    test('create invoice modal', async ({ page }) => {
      await page.click('[data-testid="create-invoice-button"]')
      await page.waitForSelector('[data-testid="invoice-form-modal"]')

      const modal = page.locator('[data-testid="invoice-form-modal"]')
      await expect(modal).toHaveScreenshot('create-invoice-modal.png')
    })

    test('invoice line items', async ({ page }) => {
      await page.click('[data-testid="create-invoice-button"]')
      await page.waitForSelector('[data-testid="invoice-form-modal"]')

      const lineItemsSection = page.locator('[data-testid="invoice-line-items"]')
      
      // Empty state
      await expect(lineItemsSection).toHaveScreenshot('invoice-line-items-empty.png')

      // Add line items
      await page.click('[data-testid="add-line-item-button"]')
      await page.fill('[name="description"]', 'Monthly Rent - Unit 101')
      await page.fill('[name="amount"]', '1200.00')
      await page.waitForTimeout(200)

      await expect(lineItemsSection).toHaveScreenshot('invoice-line-items-filled.png')
    })

    test('invoice tax and discount options', async ({ page }) => {
      await page.click('[data-testid="create-invoice-button"]')
      await page.waitForSelector('[data-testid="invoice-form-modal"]')

      const taxDiscountSection = page.locator('[data-testid="tax-discount-section"]')
      
      // Enable tax
      await page.check('[data-testid="apply-tax-checkbox"]')
      await page.fill('[name="taxRate"]', '8.25')
      
      // Enable discount
      await page.check('[data-testid="apply-discount-checkbox"]')
      await page.fill('[name="discountAmount"]', '50.00')
      await page.waitForTimeout(200)

      await expect(taxDiscountSection).toHaveScreenshot('invoice-tax-discount.png')
    })

    test('invoice preview', async ({ page }) => {
      await page.click('[data-testid="invoice-item"]')
      await page.waitForSelector('[data-testid="invoice-preview-modal"]')

      const preview = page.locator('[data-testid="invoice-preview-modal"]')
      await expect(preview).toHaveScreenshot('invoice-preview-modal.png')
    })

    test('invoice payment tracking', async ({ page }) => {
      await page.click('[data-testid="invoice-item"]')
      await page.waitForSelector('[data-testid="invoice-preview-modal"]')

      const paymentTracking = page.locator('[data-testid="payment-tracking-section"]')
      await expect(paymentTracking).toHaveScreenshot('invoice-payment-tracking.png')
    })

    test('send invoice modal', async ({ page }) => {
      await page.click('[data-testid="invoice-item"]')
      await page.click('[data-testid="send-invoice-button"]')
      await page.waitForSelector('[data-testid="send-invoice-modal"]')

      const modal = page.locator('[data-testid="send-invoice-modal"]')
      await expect(modal).toHaveScreenshot('send-invoice-modal.png')
    })
  })

  test.describe('Payment Processing', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/billing/payments')
      await page.waitForLoadState('networkidle')
    })

    test('payments list view', async ({ page }) => {
      await expect(page).toHaveScreenshot('payments-list-view.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="payment-date"]'),
          page.locator('[data-testid="transaction-id"]'),
        ],
      })
    })

    test('payment method indicators', async ({ page }) => {
      const paymentItems = page.locator('[data-testid="payment-item"]')
      const count = await paymentItems.count()

      for (let i = 0; i < Math.min(3, count); i++) {
        const payment = paymentItems.nth(i)
        const method = await payment.getAttribute('data-payment-method')
        await expect(payment).toHaveScreenshot(`payment-method-${method}-${i}.png`)
      }
    })

    test('process payment modal', async ({ page }) => {
      await page.click('[data-testid="process-payment-button"]')
      await page.waitForSelector('[data-testid="payment-processing-modal"]')

      const modal = page.locator('[data-testid="payment-processing-modal"]')
      await expect(modal).toHaveScreenshot('process-payment-modal.png')
    })

    test('payment method selection', async ({ page }) => {
      await page.click('[data-testid="process-payment-button"]')
      await page.waitForSelector('[data-testid="payment-processing-modal"]')

      const paymentMethods = page.locator('[data-testid="payment-methods"]')
      await expect(paymentMethods).toHaveScreenshot('payment-methods-selection.png')

      // Test credit card form
      await page.click('[data-testid="method-credit-card"]')
      await page.waitForTimeout(200)
      const cardForm = page.locator('[data-testid="credit-card-form"]')
      await expect(cardForm).toHaveScreenshot('credit-card-form.png')

      // Test ACH form
      await page.click('[data-testid="method-ach"]')
      await page.waitForTimeout(200)
      const achForm = page.locator('[data-testid="ach-form"]')
      await expect(achForm).toHaveScreenshot('ach-form.png')
    })

    test('payment validation errors', async ({ page }) => {
      await page.click('[data-testid="process-payment-button"]')
      await page.waitForSelector('[data-testid="payment-processing-modal"]')

      // Try to submit empty form
      await page.click('[data-testid="submit-payment-button"]')
      await page.waitForTimeout(300)

      const modal = page.locator('[data-testid="payment-processing-modal"]')
      await expect(modal).toHaveScreenshot('payment-validation-errors.png')
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
            confirmation_code: 'CONF-ABC123',
          }),
        })
      })

      await page.click('[data-testid="process-payment-button"]')
      await page.waitForSelector('[data-testid="payment-processing-modal"]')
      
      // Fill payment form
      await page.click('[data-testid="method-credit-card"]')
      await page.fill('[name="cardNumber"]', '4242424242424242')
      await page.fill('[name="expiryDate"]', '12/25')
      await page.fill('[name="cvv"]', '123')
      await page.fill('[name="amount"]', '1200')
      
      await page.click('[data-testid="submit-payment-button"]')
      await page.waitForSelector('[data-testid="payment-confirmation"]')

      await expect(page.locator('[data-testid="payment-confirmation"]')).toHaveScreenshot('payment-confirmation.png')
    })

    test('payment refund modal', async ({ page }) => {
      await page.click('[data-testid="payment-item"]')
      await page.click('[data-testid="refund-payment-button"]')
      await page.waitForSelector('[data-testid="refund-modal"]')

      const modal = page.locator('[data-testid="refund-modal"]')
      await expect(modal).toHaveScreenshot('payment-refund-modal.png')
    })
  })

  test.describe('Subscription Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/billing/subscriptions')
      await page.waitForLoadState('networkidle')
    })

    test('subscriptions overview', async ({ page }) => {
      await expect(page).toHaveScreenshot('subscriptions-overview.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="subscription-date"]'),
          page.locator('[data-testid="next-billing-date"]'),
        ],
      })
    })

    test('subscription plan cards', async ({ page }) => {
      const planCards = page.locator('[data-testid="subscription-plan-card"]')
      const count = await planCards.count()

      for (let i = 0; i < Math.min(3, count); i++) {
        const card = planCards.nth(i)
        const planType = await card.getAttribute('data-plan-type')
        await expect(card).toHaveScreenshot(`subscription-plan-${planType}.png`)
      }
    })

    test('upgrade subscription modal', async ({ page }) => {
      await page.click('[data-testid="upgrade-subscription-button"]')
      await page.waitForSelector('[data-testid="upgrade-modal"]')

      const modal = page.locator('[data-testid="upgrade-modal"]')
      await expect(modal).toHaveScreenshot('upgrade-subscription-modal.png')
    })

    test('plan comparison table', async ({ page }) => {
      await page.click('[data-testid="upgrade-subscription-button"]')
      await page.waitForSelector('[data-testid="upgrade-modal"]')

      const comparisonTable = page.locator('[data-testid="plan-comparison-table"]')
      await expect(comparisonTable).toHaveScreenshot('plan-comparison-table.png')
    })

    test('billing cycle options', async ({ page }) => {
      await page.click('[data-testid="upgrade-subscription-button"]')
      await page.waitForSelector('[data-testid="upgrade-modal"]')

      const billingCycle = page.locator('[data-testid="billing-cycle-options"]')
      
      // Monthly billing
      await page.click('[data-testid="billing-monthly"]')
      await expect(billingCycle).toHaveScreenshot('billing-cycle-monthly.png')

      // Annual billing
      await page.click('[data-testid="billing-annual"]')
      await expect(billingCycle).toHaveScreenshot('billing-cycle-annual.png')
    })

    test('subscription usage metrics', async ({ page }) => {
      const usageMetrics = page.locator('[data-testid="usage-metrics"]')
      await expect(usageMetrics).toHaveScreenshot('subscription-usage-metrics.png')
    })

    test('usage limit warnings', async ({ page }) => {
      // Mock near-limit usage
      await page.route('/api/v1/subscriptions/usage', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            properties: { used: 48, limit: 50 },
            units: { used: 190, limit: 200 },
            users: { used: 8, limit: 10 },
          }),
        })
      })

      await page.reload()
      await page.waitForLoadState('networkidle')

      const warningBanner = page.locator('[data-testid="usage-warning-banner"]')
      await expect(warningBanner).toHaveScreenshot('usage-limit-warning.png')
    })

    test('cancel subscription modal', async ({ page }) => {
      await page.click('[data-testid="cancel-subscription-button"]')
      await page.waitForSelector('[data-testid="cancel-subscription-modal"]')

      const modal = page.locator('[data-testid="cancel-subscription-modal"]')
      await expect(modal).toHaveScreenshot('cancel-subscription-modal.png')
    })
  })

  test.describe('Billing Reports', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/billing/reports')
      await page.waitForLoadState('networkidle')
    })

    test('billing reports dashboard', async ({ page }) => {
      await expect(page).toHaveScreenshot('billing-reports-dashboard.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="report-generated-date"]'),
        ],
      })
    })

    test('revenue analysis chart', async ({ page }) => {
      const revenueChart = page.locator('[data-testid="revenue-analysis-chart"]')
      await expect(revenueChart).toHaveScreenshot('revenue-analysis-chart.png')
    })

    test('payment trends chart', async ({ page }) => {
      const trendsChart = page.locator('[data-testid="payment-trends-chart"]')
      await expect(trendsChart).toHaveScreenshot('payment-trends-chart.png')
    })

    test('delinquency report', async ({ page }) => {
      const delinquencyReport = page.locator('[data-testid="delinquency-report"]')
      await expect(delinquencyReport).toHaveScreenshot('delinquency-report.png')
    })

    test('generate report modal', async ({ page }) => {
      await page.click('[data-testid="generate-report-button"]')
      await page.waitForSelector('[data-testid="generate-report-modal"]')

      const modal = page.locator('[data-testid="generate-report-modal"]')
      await expect(modal).toHaveScreenshot('generate-report-modal.png')
    })

    test('report date range picker', async ({ page }) => {
      await page.click('[data-testid="generate-report-button"]')
      await page.waitForSelector('[data-testid="generate-report-modal"]')

      await page.click('[data-testid="date-range-picker"]')
      await page.waitForTimeout(200)

      const datePicker = page.locator('[data-testid="date-picker-dropdown"]')
      await expect(datePicker).toHaveScreenshot('report-date-range-picker.png')
    })

    test('export report options', async ({ page }) => {
      await page.click('[data-testid="export-report-dropdown"]')
      await page.waitForTimeout(200)

      const exportOptions = page.locator('[data-testid="export-options-dropdown"]')
      await expect(exportOptions).toHaveScreenshot('export-report-options.png')
    })
  })

  test.describe('Payment Gateway Integration', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/billing/settings/payment-gateway')
      await page.waitForLoadState('networkidle')
    })

    test('payment gateway settings', async ({ page }) => {
      await expect(page).toHaveScreenshot('payment-gateway-settings.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })

    test('stripe configuration', async ({ page }) => {
      const stripeConfig = page.locator('[data-testid="stripe-configuration"]')
      await expect(stripeConfig).toHaveScreenshot('stripe-configuration.png')
    })

    test('webhook endpoints list', async ({ page }) => {
      const webhooksList = page.locator('[data-testid="webhook-endpoints"]')
      await expect(webhooksList).toHaveScreenshot('webhook-endpoints-list.png')
    })

    test('add webhook endpoint modal', async ({ page }) => {
      await page.click('[data-testid="add-webhook-button"]')
      await page.waitForSelector('[data-testid="webhook-form-modal"]')

      const modal = page.locator('[data-testid="webhook-form-modal"]')
      await expect(modal).toHaveScreenshot('add-webhook-modal.png')
    })

    test('webhook event types selection', async ({ page }) => {
      await page.click('[data-testid="add-webhook-button"]')
      await page.waitForSelector('[data-testid="webhook-form-modal"]')

      const eventTypes = page.locator('[data-testid="webhook-event-types"]')
      await expect(eventTypes).toHaveScreenshot('webhook-event-types.png')
    })

    test('payment gateway test mode', async ({ page }) => {
      await page.click('[data-testid="test-mode-toggle"]')
      await page.waitForTimeout(300)

      const testModeSection = page.locator('[data-testid="test-mode-section"]')
      await expect(testModeSection).toHaveScreenshot('payment-gateway-test-mode.png')
    })
  })

  test.describe('Billing Responsive Design', () => {
    const viewports = [
      { width: 1440, height: 900, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' },
    ]

    test('billing dashboard responsive', async ({ page }) => {
      await page.goto('/billing')
      await page.waitForLoadState('networkidle')

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        await expect(page).toHaveScreenshot(`billing-dashboard-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled',
          mask: [
            page.locator('[data-testid="current-date"]'),
          ],
        })
      }
    })

    test('invoice modal responsive', async ({ page }) => {
      await page.goto('/billing/invoices')
      await page.click('[data-testid="create-invoice-button"]')
      await page.waitForSelector('[data-testid="invoice-form-modal"]')

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(300)

        const modal = page.locator('[data-testid="invoice-form-modal"]')
        await expect(modal).toHaveScreenshot(`invoice-modal-${viewport.name}.png`)
      }
    })
  })

  test.describe('Billing Themes', () => {
    test('billing dashboard dark theme', async ({ page }) => {
      await page.goto('/billing')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('billing-dashboard-dark.png', {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="current-date"]'),
        ],
      })
    })

    test('payment modal dark theme', async ({ page }) => {
      await page.goto('/billing/payments')
      await page.click('[data-testid="process-payment-button"]')
      await page.waitForSelector('[data-testid="payment-processing-modal"]')
      
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
      })
      await page.waitForTimeout(300)

      const modal = page.locator('[data-testid="payment-processing-modal"]')
      await expect(modal).toHaveScreenshot('payment-modal-dark-theme.png')
    })

    test('billing high contrast theme', async ({ page }) => {
      await page.goto('/billing')
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-contrast', 'high')
      })
      await page.waitForTimeout(300)

      await expect(page).toHaveScreenshot('billing-high-contrast.png', {
        fullPage: true,
        animations: 'disabled',
      })
    })
  })
})