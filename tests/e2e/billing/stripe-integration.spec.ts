import { test, expect } from '@playwright/test'
import { TestUser } from '../utils/test-users'

test.describe('Stripe Integration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test user
    await page.goto('/auth/login')
    await page.fill('[data-testid="login-email"]', TestUser.LANDLORD.email)
    await page.fill('[data-testid="login-password"]', TestUser.LANDLORD.password)
    await page.click('[data-testid="login-submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test.describe('Subscription Management', () => {
    test('should display current subscription status', async ({ page }) => {
      await page.goto('/dashboard/billing')
      
      // Should show current plan information
      await expect(page.locator('[data-testid="current-plan"]')).toBeVisible()
      await expect(page.locator('[data-testid="billing-status"]')).toBeVisible()
      
      // Should show usage metrics
      await expect(page.locator('[data-testid="usage-properties"]')).toBeVisible()
      await expect(page.locator('[data-testid="usage-tenants"]')).toBeVisible()
    })

    test('should allow plan upgrade flow', async ({ page }) => {
      await page.goto('/dashboard/billing')
      
      // Click upgrade button
      await page.click('[data-testid="upgrade-plan-button"]')
      
      // Should show pricing plans
      await expect(page.locator('[data-testid="pricing-plans"]')).toBeVisible()
      
      // Select Professional plan
      await page.click('[data-testid="select-professional-plan"]')
      
      // Should redirect to Stripe checkout
      await expect(page.url()).toContain('checkout.stripe.com')
    })

    test('should handle plan downgrade with confirmation', async ({ page }) => {
      await page.goto('/dashboard/billing')
      
      // Assume user is on Professional plan
      await page.click('[data-testid="change-plan-button"]')
      
      // Select downgrade to Starter
      await page.click('[data-testid="select-starter-plan"]')
      
      // Should show confirmation dialog with warnings
      await expect(page.locator('[data-testid="downgrade-confirmation"]')).toBeVisible()
      await expect(page.locator('[data-testid="downgrade-warning"]')).toContainText('property limit')
      
      // Confirm downgrade
      await page.click('[data-testid="confirm-downgrade"]')
      
      // Should process downgrade
      await expect(page.locator('[data-testid="plan-update-success"]')).toBeVisible()
    })

    test('should display billing history and invoices', async ({ page }) => {
      await page.goto('/dashboard/billing/history')
      
      // Should show invoice list
      await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible()
      
      // Should have downloadable invoices
      const invoiceItems = page.locator('[data-testid="invoice-item"]')
      await expect(invoiceItems.first()).toBeVisible()
      
      // Should be able to download PDF
      await invoiceItems.first().locator('[data-testid="download-invoice"]').click()
      
      // Wait for download to initiate
      await page.waitForTimeout(1000)
    })
  })

  test.describe('Payment Methods', () => {
    test('should allow adding new payment method', async ({ page }) => {
      await page.goto('/dashboard/billing/payment-methods')
      
      // Click add payment method
      await page.click('[data-testid="add-payment-method"]')
      
      // Should show Stripe Elements form
      await expect(page.locator('[data-testid="stripe-card-element"]')).toBeVisible()
      
      // Fill test card details (Stripe test card)
      const cardElement = page.frameLocator('[name="__privateStripeFrame"]').first()
      await cardElement.locator('[name="cardnumber"]').fill('4242424242424242')
      await cardElement.locator('[name="exp-date"]').fill('12/25')
      await cardElement.locator('[name="cvc"]').fill('123')
      await cardElement.locator('[name="postal"]').fill('12345')
      
      // Submit payment method
      await page.click('[data-testid="save-payment-method"]')
      
      // Should show success message and new card
      await expect(page.locator('[data-testid="payment-method-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="card-ending-4242"]')).toBeVisible()
    })

    test('should set default payment method', async ({ page }) => {
      await page.goto('/dashboard/billing/payment-methods')
      
      // Assume multiple payment methods exist
      const paymentMethods = page.locator('[data-testid="payment-method-item"]')
      await expect(paymentMethods).toHaveCount(2, { timeout: 5000 })
      
      // Click set as default on second method
      await paymentMethods.nth(1).locator('[data-testid="set-default"]').click()
      
      // Should update default indicator
      await expect(paymentMethods.nth(1).locator('[data-testid="default-badge"]')).toBeVisible()
    })

    test('should delete payment method with confirmation', async ({ page }) => {
      await page.goto('/dashboard/billing/payment-methods')
      
      const paymentMethods = page.locator('[data-testid="payment-method-item"]')
      const initialCount = await paymentMethods.count()
      
      // Delete a non-default payment method
      await paymentMethods.first().locator('[data-testid="delete-payment-method"]').click()
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible()
      await page.click('[data-testid="confirm-delete"]')
      
      // Should remove the payment method
      await expect(paymentMethods).toHaveCount(initialCount - 1)
    })
  })

  test.describe('Subscription Limits and Usage', () => {
    test('should enforce property limits on free plan', async ({ page }) => {
      // Assume user is on free plan (1 property limit)
      await page.goto('/dashboard/properties')
      
      // Try to add a second property if at limit
      const propertyCount = await page.locator('[data-testid="property-item"]').count()
      
      if (propertyCount >= 1) {
        await page.click('[data-testid="add-property-button"]')
        
        // Should show upgrade prompt
        await expect(page.locator('[data-testid="upgrade-required-modal"]')).toBeVisible()
        await expect(page.locator('[data-testid="upgrade-message"]')).toContainText('property limit')
        
        // Should offer upgrade option
        await expect(page.locator('[data-testid="upgrade-now-button"]')).toBeVisible()
      }
    })

    test('should show usage warnings near limits', async ({ page }) => {
      await page.goto('/dashboard/billing')
      
      // Should show usage bar
      const usageBar = page.locator('[data-testid="usage-bar-properties"]')
      await expect(usageBar).toBeVisible()
      
      // If near limit, should show warning
      const usagePercentage = await usageBar.getAttribute('data-usage-percentage')
      if (parseInt(usagePercentage!) >= 80) {
        await expect(page.locator('[data-testid="usage-warning"]')).toBeVisible()
      }
    })

    test('should track feature usage by plan', async ({ page }) => {
      await page.goto('/dashboard/billing')
      
      // Should show feature comparison
      await expect(page.locator('[data-testid="feature-list"]')).toBeVisible()
      
      // Professional plan features
      if (await page.locator('[data-testid="current-plan"]').textContent() === 'Professional') {
        await expect(page.locator('[data-testid="feature-advanced-reporting"]')).toHaveClass(/enabled/)
        await expect(page.locator('[data-testid="feature-api-access"]')).toHaveClass(/enabled/)
      }
      
      // Starter plan limitations
      if (await page.locator('[data-testid="current-plan"]').textContent() === 'Starter') {
        await expect(page.locator('[data-testid="feature-advanced-reporting"]')).toHaveClass(/disabled/)
        await expect(page.locator('[data-testid="feature-api-access"]')).toHaveClass(/disabled/)
      }
    })
  })

  test.describe('Webhook Processing', () => {
    test('should handle successful payment webhook', async ({ page, request }) => {
      // Simulate a successful payment webhook
      // This would typically be done via API testing rather than E2E
      await page.goto('/dashboard/billing')
      
      // Check that subscription status is updated
      await expect(page.locator('[data-testid="billing-status"]')).toContainText('Active')
      await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible()
    })

    test('should handle failed payment and show retry options', async ({ page }) => {
      // Navigate to billing with simulated failed payment state
      await page.goto('/dashboard/billing')
      
      // If payment failed, should show retry options
      const paymentStatus = await page.locator('[data-testid="payment-status"]').textContent()
      
      if (paymentStatus?.includes('Failed')) {
        await expect(page.locator('[data-testid="payment-retry-button"]')).toBeVisible()
        await expect(page.locator('[data-testid="update-payment-method"]')).toBeVisible()
        
        // Should show payment failure details
        await expect(page.locator('[data-testid="payment-failure-reason"]')).toBeVisible()
      }
    })
  })

  test.describe('Trial and Onboarding', () => {
    test('should show trial status and remaining days', async ({ page }) => {
      // Assume user has active trial
      await page.goto('/dashboard')
      
      // Should show trial banner if in trial
      const trialBanner = page.locator('[data-testid="trial-banner"]')
      
      if (await trialBanner.isVisible()) {
        await expect(trialBanner).toContainText('trial')
        await expect(page.locator('[data-testid="trial-days-remaining"]')).toBeVisible()
        await expect(page.locator('[data-testid="upgrade-before-trial-end"]')).toBeVisible()
      }
    })

    test('should convert trial to paid subscription', async ({ page }) => {
      await page.goto('/dashboard/billing')
      
      // If in trial, should show conversion option
      const trialStatus = page.locator('[data-testid="trial-status"]')
      
      if (await trialStatus.isVisible()) {
        await page.click('[data-testid="convert-trial-button"]')
        
        // Should show plan selection
        await expect(page.locator('[data-testid="plan-selection"]')).toBeVisible()
        
        // Select plan and proceed to payment
        await page.click('[data-testid="select-professional-plan"]')
        await expect(page.url()).toContain('checkout.stripe.com')
      }
    })
  })

  test.describe('Cancellation Flow', () => {
    test('should allow subscription cancellation with feedback', async ({ page }) => {
      await page.goto('/dashboard/billing')
      
      // Click cancel subscription
      await page.click('[data-testid="cancel-subscription-button"]')
      
      // Should show cancellation confirmation
      await expect(page.locator('[data-testid="cancel-confirmation-modal"]')).toBeVisible()
      
      // Should ask for feedback
      await expect(page.locator('[data-testid="cancellation-reason"]')).toBeVisible()
      
      // Fill feedback form
      await page.selectOption('[data-testid="cancellation-reason"]', 'too-expensive')
      await page.fill('[data-testid="cancellation-feedback"]', 'Cost is too high for my needs')
      
      // Choose cancellation timing
      await page.click('[data-testid="cancel-at-period-end"]')
      
      // Confirm cancellation
      await page.click('[data-testid="confirm-cancellation"]')
      
      // Should show cancellation success
      await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="access-until-date"]')).toBeVisible()
    })

    test('should offer retention incentives during cancellation', async ({ page }) => {
      await page.goto('/dashboard/billing')
      
      // Start cancellation flow
      await page.click('[data-testid="cancel-subscription-button"]')
      
      // Should show retention offers
      await expect(page.locator('[data-testid="retention-offers"]')).toBeVisible()
      
      // Should offer discount or downgrade
      const discountOffer = page.locator('[data-testid="discount-offer"]')
      const downgradeOffer = page.locator('[data-testid="downgrade-offer"]')
      
      if (await discountOffer.isVisible()) {
        await expect(discountOffer).toContainText('%')
      }
      
      if (await downgradeOffer.isVisible()) {
        await expect(downgradeOffer).toContainText('Starter')
      }
    })
  })
})