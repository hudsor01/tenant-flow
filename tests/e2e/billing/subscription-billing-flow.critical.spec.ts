import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection, waitForLoadingComplete, takeScreenshot, clearSession } from '../utils/test-helpers'
import { TestUser } from '../utils/test-users'

/**
 * Complete Subscription and Billing Flow - Critical End-to-End Tests
 * Tests the entire billing lifecycle from free trial to subscription management
 */
test.describe('Complete Subscription and Billing Flow - Critical Tests', () => {

  test('should complete the full free trial to paid subscription journey', async ({ page }) => {
    // ========================================
    // PHASE 1: FREETRIAL SIGNUP
    // ========================================

    await test.step('Start free trial with Stripe checkout', async () => {
      await clearSession(page)
      await page.goto('/pricing')

      // Should show pricing plans
      await expect(page.locator('[data-testid="pricing-plans"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-starter"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-professional"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-tenantflow_max"]')).toBeVisible()

      // Should show free trial offer
      await expect(page.locator('[data-testid="free-trial-badge"]')).toContainText('14-day free trial')

      // Start free trial
      await page.click('[data-testid="start-free-trial"]')

      // Should redirect to signup if not authenticated
      await expect(page).toHaveURL(/\/auth\/signup/)

      // Create account for trial
      const userEmail = `trial-user-${Date.now()}@tenantflow.test`
      await fillForm(page, {
        'email': userEmail,
        'password': 'TrialPassword123!',
        'confirm-password': 'TrialPassword123!',
        'first-name': 'Trial',
        'last-name': 'User',
        'company-name': 'Trial Company LLC'
      })

      await page.check('[data-testid="accept-terms"]')
      await page.click('[data-testid="create-account-button"]')

      // Should redirect to Stripe Checkout for trial setup
      await expect(page.locator('[data-testid="stripe-checkout"]')).toBeVisible()

      // Fill payment method for trial (won't be charged)
      await fillForm(page, {
        'card-number': '4242424242424242',
        'card-expiry': '12/28',
        'card-cvc': '123',
        'cardholder-name': 'Trial User',
        'billing-address': '123 Trial Street',
        'billing-city': 'Trial City',
        'billing-zip': '12345'
      })

      await page.click('[data-testid="start-trial-button"]')

      // Should return to app with trial active
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator('[data-testid="trial-banner"]')).toContainText('14 days remaining')
      await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Free Trial')

      await takeScreenshot(page, 'free-trial-started')
    })

    // ========================================
    // PHASE 2: TRIAL USAGE AND FEATURE ACCESS
    // ========================================

    await test.step('Use trial features and monitor limits', async () => {
      // Test feature access during trial
      await navigateToSection(page, 'properties')

      // Should have access to create properties
      await page.click('[data-testid="add-property-button"]')
      await expect(page.locator('[data-testid="property-wizard-modal"]')).toBeVisible()
      await page.click('[data-testid="close-modal"]')

      // Check billing page shows trial info
      await navigateToSection(page, 'billing')

      await expect(page.locator('[data-testid="current-plan"]')).toContainText('Professional (Trial)')
      await expect(page.locator('[data-testid="trial-expires"]')).toBeVisible()
      await expect(page.locator('[data-testid="usage-summary"]')).toBeVisible()

      // Should show usage limits
      await expect(page.locator('[data-testid="properties-used"]')).toContainText('0 / 10')
      await expect(page.locator('[data-testid="units-used"]')).toContainText('0 / 50')

      // Should show upgrade prompts
      await expect(page.locator('[data-testid="upgrade-to-paid"]')).toBeVisible()

      await takeScreenshot(page, 'trial-billing-dashboard')
    })

    // ========================================
    // PHASE 3: PLAN COMPARISON AND SELECTION
    // ========================================

    await test.step('Compare plans and select upgrade', async () => {
      // View plan comparison
      await page.click('[data-testid="compare-plans"]')
      await expect(page.locator('[data-testid="plan-comparison-modal"]')).toBeVisible()

      // Should show detailed feature comparison
      await expect(page.locator('[data-testid="feature-comparison-table"]')).toBeVisible()

      // Check specific features
      await expect(page.locator('[data-testid="starter-properties"]')).toContainText('5 Properties')
      await expect(page.locator('[data-testid="professional-properties"]')).toContainText('25 Properties')
      await expect(page.locator('[data-testid="tenantflow_max-properties"]')).toContainText('Unlimited')

      // Should show pricing
      await expect(page.locator('[data-testid="starter-price"]')).toContainText('$19/month')
      await expect(page.locator('[data-testid="professional-price"]')).toContainText('$49/month')
      await expect(page.locator('[data-testid="tenantflow_max-price"]')).toContainText('$149/month')

      // Select Professional plan
      await page.click('[data-testid="select-professional-plan"]')

      // Should show upgrade confirmation
      await expect(page.locator('[data-testid="upgrade-confirmation-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="selected-plan"]')).toContainText('Professional')
      await expect(page.locator('[data-testid="billing-amount"]')).toContainText('$49.00')

      // Choose billing cycle
      await page.click('[data-testid="billing-cycle-annual"]')
      await expect(page.locator('[data-testid="annual-discount"]')).toContainText('Save 20%')
      await expect(page.locator('[data-testid="billing-amount"]')).toContainText('$470.40')

      // Switch back to monthly
      await page.click('[data-testid="billing-cycle-monthly"]')

      await page.click('[data-testid="proceed-to-payment"]')

      await takeScreenshot(page, 'plan-selection-complete')
    })

    // ========================================
    // PHASE 4: PAYMENT METHOD MANAGEMENT
    // ========================================

    await test.step('Add and manage payment methods', async () => {
      // Should show payment method setup
      await expect(page.locator('[data-testid="payment-method-setup"]')).toBeVisible()

      // Add primary payment method
      await page.click('[data-testid="add-payment-method"]')

      await fillForm(page, {
        'card-number': '4242424242424242',
        'card-expiry': '12/28',
        'card-cvc': '123',
        'cardholder-name': 'Trial User',
        'billing-address': '123 Payment Street',
        'billing-city': 'Payment City',
        'billing-state': 'TX',
        'billing-zip': '78701'
      })

      await page.check('[data-testid="set-as-default"]')
      await page.click('[data-testid="save-payment-method"]')

      await waitForToast(page, 'Payment method added successfully')

      // Add backup payment method
      await page.click('[data-testid="add-backup-payment"]')

      await fillForm(page, {
        'card-number': '5555555555554444',
        'card-expiry': '10/27',
        'card-cvc': '456',
        'cardholder-name': 'Trial User'
      })

      await page.click('[data-testid="save-backup-payment"]')
      await waitForToast(page, 'Backup payment method added')

      // Should show both payment methods
      await expect(page.locator('[data-testid="payment-method-card"]')).toHaveCount(2)
      await expect(page.locator('[data-testid="default-payment-badge"]')).toBeVisible()

      await takeScreenshot(page, 'payment-methods-setup')
    })

    // ========================================
    // PHASE 5: SUBSCRIPTION ACTIVATION
    // ========================================

    await test.step('Complete subscription activation', async () => {
      // Confirm subscription upgrade
      await page.click('[data-testid="confirm-subscription-upgrade"]')

      // Should show processing state
      await expect(page.locator('[data-testid="processing-subscription"]')).toBeVisible()

      // Should redirect to success page
      await expect(page).toHaveURL(/\/billing\/success/)
      await expect(page.locator('[data-testid="subscription-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome to Professional')

      // Should show subscription details
      await expect(page.locator('[data-testid="subscription-summary"]')).toBeVisible()
      await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible()
      await expect(page.locator('[data-testid="billing-amount"]')).toContainText('$49.00')

      // Continue to dashboard
      await page.click('[data-testid="continue-to-dashboard"]')

      // Should show updated subscription status
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Professional')
      await expect(page.locator('[data-testid="trial-banner"]')).not.toBeVisible()

      await takeScreenshot(page, 'subscription-activated')
    })

    // ========================================
    // PHASE 6: BILLING HISTORY AND INVOICES
    // ========================================

    await test.step('View billing history and manage invoices', async () => {
      await navigateToSection(page, 'billing')

      // Should show billing history
      await expect(page.locator('[data-testid="billing-history"]')).toBeVisible()
      await expect(page.locator('[data-testid="invoice-row"]')).toHaveCount(1)

      // View invoice details
      await page.click('[data-testid="view-invoice"]')
      await expect(page.locator('[data-testid="invoice-modal"]')).toBeVisible()

      // Should show invoice details
      await expect(page.locator('[data-testid="invoice-number"]')).toBeVisible()
      await expect(page.locator('[data-testid="invoice-date"]')).toBeVisible()
      await expect(page.locator('[data-testid="invoice-amount"]')).toContainText('$49.00')
      await expect(page.locator('[data-testid="payment-status"]')).toContainText('Paid')

      // Download invoice
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="download-invoice"]')
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf$/)

      await page.click('[data-testid="close-invoice-modal"]')

      // Test invoice email resend
      await page.click('[data-testid="resend-invoice-email"]')
      await waitForToast(page, 'Invoice email sent')

      await takeScreenshot(page, 'billing-history')
    })

    // ========================================
    // PHASE 7: USAGE MONITORING AND LIMITS
    // ========================================

    await test.step('Monitor usage and approach limits', async () => {
      // View usage dashboard
      await page.click('[data-testid="usage-tab"]')

      await expect(page.locator('[data-testid="usage-dashboard"]')).toBeVisible()

      // Should show current usage
      await expect(page.locator('[data-testid="properties-usage"]')).toBeVisible()
      await expect(page.locator('[data-testid="units-usage"]')).toBeVisible()
      await expect(page.locator('[data-testid="tenants-usage"]')).toBeVisible()

      // Should show usage charts
      await expect(page.locator('[data-testid="usage-trend-chart"]')).toBeVisible()

      // Test usage alert configuration
      await page.click('[data-testid="setup-usage-alerts"]')
      await expect(page.locator('[data-testid="usage-alerts-modal"]')).toBeVisible()

      await page.check('[data-testid="alert-80-percent"]')
      await page.check('[data-testid="alert-95-percent"]')
      await page.fill('[data-testid="alert-email"]', 'billing@company.com')

      await page.click('[data-testid="save-usage-alerts"]')
      await waitForToast(page, 'Usage alerts configured')

      // Simulate approaching limits (test data manipulation)
      await page.evaluate(() => {
        // Mock high usage scenario
        window.mockHighUsage = true
      })

      await page.reload()

      // Should show usage warnings
      await expect(page.locator('[data-testid="usage-warning"]')).toBeVisible()
      await expect(page.locator('[data-testid="upgrade-recommendation"]')).toBeVisible()

      await takeScreenshot(page, 'usage-monitoring')
    })

    // ========================================
    // PHASE 8: PLAN UPGRADES AND DOWNGRADES
    // ========================================

    await test.step('Upgrade to Enterprise plan', async () => {
      // Upgrade to Enterprise
      await page.click('[data-testid="upgrade-to-tenantflow_max"]')
      await expect(page.locator('[data-testid="plan-change-modal"]')).toBeVisible()

      // Should show plan comparison
      await expect(page.locator('[data-testid="current-plan-professional"]')).toBeVisible()
      await expect(page.locator('[data-testid="new-plan-tenantflow_max"]')).toBeVisible()

      // Should show proration details
      await expect(page.locator('[data-testid="proration-details"]')).toBeVisible()
      await expect(page.locator('[data-testid="prorated-amount"]')).toBeVisible()

      await page.click('[data-testid="confirm-plan-upgrade"]')

      // Should process upgrade
      await expect(page.locator('[data-testid="processing-upgrade"]')).toBeVisible()
      await waitForToast(page, 'Plan upgraded successfully')

      // Should show updated plan
      await expect(page.locator('[data-testid="current-plan"]')).toContainText('Enterprise')

      await takeScreenshot(page, 'plan-upgraded')
    })

    await test.step('Test plan downgrade with restrictions', async () => {
      // Attempt to downgrade
      await page.click('[data-testid="change-plan"]')
      await page.click('[data-testid="downgrade-to-professional"]')

      // Should show downgrade warning
      await expect(page.locator('[data-testid="downgrade-warning-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="feature-loss-warning"]')).toBeVisible()

      // Should show usage conflicts
      await expect(page.locator('[data-testid="usage-conflicts"]')).toBeVisible()

      // Cancel downgrade
      await page.click('[data-testid="cancel-downgrade"]')

      // Plan should remain Enterprise
      await expect(page.locator('[data-testid="current-plan"]')).toContainText('Enterprise')

      await takeScreenshot(page, 'downgrade-prevented')
    })

    // ========================================
    // PHASE 9: PAYMENT FAILURE HANDLING
    // ========================================

    await test.step('Handle payment failures and recovery', async () => {
      // Simulate payment failure by updating to declined card
      await page.click('[data-testid="payment-methods-tab"]')

      await page.click('[data-testid="edit-payment-method"]')

      // Update to declined test card
      await page.fill('[data-testid="card-number"]', '4000000000000002')
      await page.click('[data-testid="update-payment-method"]')

      await waitForToast(page, 'Payment method updated')

      // Simulate failed payment (would normally be webhook)
      await page.evaluate(() => {
        // Mock payment failure scenario
        window.simulatePaymentFailure = true
      })

      await page.reload()

      // Should show payment failure alert
      await expect(page.locator('[data-testid="payment-failure-alert"]')).toBeVisible()
      await expect(page.locator('[data-testid="update-payment-button"]')).toBeVisible()

      // Should show grace period information
      await expect(page.locator('[data-testid="grace-period-info"]')).toContainText('7 days')

      // Fix payment method
      await page.click('[data-testid="update-payment-button"]')

      await page.fill('[data-testid="card-number"]', '4242424242424242')
      await page.click('[data-testid="retry-payment"]')

      await waitForToast(page, 'Payment updated and retried successfully')

      // Should clear payment failure alert
      await expect(page.locator('[data-testid="payment-failure-alert"]')).not.toBeVisible()

      await takeScreenshot(page, 'payment-failure-resolved')
    })

    // ========================================
    // PHASE 10: SUBSCRIPTION MANAGEMENT
    // ========================================

    await test.step('Manage subscription settings', async () => {
      await page.click('[data-testid="subscription-settings-tab"]')

      // Update billing cycle
      await page.click('[data-testid="change-billing-cycle"]')
      await page.click('[data-testid="switch-to-annual"]')

      // Should show discount calculation
      await expect(page.locator('[data-testid="annual-savings"]')).toContainText('Save $358.80')

      await page.click('[data-testid="confirm-billing-change"]')
      await waitForToast(page, 'Billing cycle updated')

      // Update billing address
      await page.click('[data-testid="edit-billing-address"]')

      await fillForm(page, {
        'billing-company': 'Updated Company LLC',
        'billing-address': '456 New Billing Street',
        'billing-city': 'Austin',
        'billing-state': 'TX',
        'billing-zip': '78701'
      })

      await page.click('[data-testid="save-billing-address"]')
      await waitForToast(page, 'Billing address updated')

      // Configure billing notifications
      await page.click('[data-testid="billing-notifications"]')

      await page.check('[data-testid="invoice-emails"]')
      await page.check('[data-testid="payment-failure-alerts"]')
      await page.check('[data-testid="usage-warnings"]')

      await page.click('[data-testid="save-notification-preferences"]')
      await waitForToast(page, 'Notification preferences saved')

      await takeScreenshot(page, 'subscription-settings-updated')
    })

    // ========================================
    // PHASE 11: CANCELLATION FLOW
    // ========================================

    await test.step('Test subscription cancellation process', async () => {
      // Initiate cancellation
      await page.click('[data-testid="cancel-subscription"]')
      await expect(page.locator('[data-testid="cancellation-modal"]')).toBeVisible()

      // Should show retention offers
      await expect(page.locator('[data-testid="retention-offers"]')).toBeVisible()
      await expect(page.locator('[data-testid="discount-offer"]')).toBeVisible()

      // Decline offers and continue
      await page.click('[data-testid="continue-cancellation"]')

      // Should show feedback form
      await expect(page.locator('[data-testid="cancellation-feedback"]')).toBeVisible()

      await page.selectOption('[data-testid="cancellation-reason"]', 'too-expensive')
      await page.fill('[data-testid="feedback-comments"]', 'Testing cancellation flow')

      // Should show data retention options
      await expect(page.locator('[data-testid="data-retention-options"]')).toBeVisible()

      await page.click('[data-testid="keep-data-90-days"]')

      // Final cancellation confirmation
      await page.fill('[data-testid="confirm-cancellation-text"]', 'CANCEL')
      await page.click('[data-testid="confirm-final-cancellation"]')

      // Should show cancellation success
      await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="subscription-end-date"]')).toBeVisible()

      // Should still have access until period end
      await expect(page.locator('[data-testid="access-until"]')).toBeVisible()

      await takeScreenshot(page, 'subscription-cancelled')
    })

    // ========================================
    // PHASE 12: REACTIVATION FLOW
    // ========================================

    await test.step('Test subscription reactivation', async () => {
      // Should show reactivation option
      await expect(page.locator('[data-testid="reactivate-subscription"]')).toBeVisible()

      // Reactivate subscription
      await page.click('[data-testid="reactivate-subscription"]')

      // Should show reactivation confirmation
      await expect(page.locator('[data-testid="reactivation-modal"]')).toBeVisible()
      await expect(page.locator('[data-testid="previous-plan-details"]')).toContainText('Enterprise')

      await page.click('[data-testid="confirm-reactivation"]')

      await waitForToast(page, 'Subscription reactivated successfully')

      // Should show active status
      await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Active')
      await expect(page.locator('[data-testid="current-plan"]')).toContainText('Enterprise')

      await takeScreenshot(page, 'subscription-reactivated')
    })

    // ========================================
    // FINAL VERIFICATION
    // ========================================

    await test.step('Final billing system verification', async () => {
      // Navigate to dashboard to verify full access
      await navigateToSection(page, 'dashboard')

      // Should have full Enterprise features
      await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Enterprise')
      await expect(page.locator('[data-testid="feature-access-unlimited"]')).toBeVisible()

      // Verify billing integration health
      await navigateToSection(page, 'billing')

      await expect(page.locator('[data-testid="billing-status"]')).toContainText('Active')
      await expect(page.locator('[data-testid="payment-method-status"]')).toContainText('Valid')

      // Take final screenshot
      await takeScreenshot(page, 'billing-journey-complete-final')

      // Log completion
      console.log('✅ Complete Subscription and Billing Journey completed successfully!')
      console.log('💳 Payment methods: Added, updated, and tested failure recovery')
      console.log('📊 Usage monitoring: Configured alerts and tested limits')
      console.log('🔄 Plan changes: Upgraded, attempted downgrade, handled restrictions')
      console.log('❌ Cancellation: Tested full flow with retention and reactivation')
      console.log('🏆 Final status: Enterprise subscription active')
    })
  })

  test('should handle complex billing scenarios and edge cases', async ({ page }) => {
    await test.step('Test multiple payment method failures', async () => {
      await loginAs(page, 'LANDLORD')
      await navigateToSection(page, 'billing')

      // Add multiple declining payment methods
      await page.click('[data-testid="add-payment-method"]')
      await fillForm(page, {
        'card-number': '4000000000000002', // Declined
        'card-expiry': '12/28',
        'card-cvc': '123'
      })
      await page.click('[data-testid="save-payment-method"]')

      // Should show declined status
      await expect(page.locator('[data-testid="payment-method-declined"]')).toBeVisible()

      // Test insufficient funds scenario
      await page.click('[data-testid="add-payment-method"]')
      await fillForm(page, {
        'card-number': '4000000000009995', // Insufficient funds
        'card-expiry': '12/28',
        'card-cvc': '123'
      })
      await page.click('[data-testid="save-payment-method"]')

      // Should handle gracefully
      await expect(page.locator('[data-testid="insufficient-funds-error"]')).toBeVisible()

      await takeScreenshot(page, 'payment-failures-handled')
    })

    await test.step('Test subscription pause and resume', async () => {
      // Some plans might support pausing
      await page.click('[data-testid="pause-subscription"]')

      if (await page.locator('[data-testid="pause-subscription-modal"]').isVisible()) {
        await page.selectOption('[data-testid="pause-duration"]', '30-days')
        await page.fill('[data-testid="pause-reason"]', 'Temporary business closure')

        await page.click('[data-testid="confirm-pause"]')
        await waitForToast(page, 'Subscription paused')

        // Should show paused status
        await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Paused')

        // Resume subscription
        await page.click('[data-testid="resume-subscription"]')
        await page.click('[data-testid="confirm-resume"]')

        await waitForToast(page, 'Subscription resumed')
      }

      await takeScreenshot(page, 'subscription-pause-resume')
    })
  })
})
