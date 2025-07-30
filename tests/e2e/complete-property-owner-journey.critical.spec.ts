import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection, waitForLoadingComplete, uploadTestFile, takeScreenshot, clearSession } from './utils/test-helpers'
import { TestData } from './utils/test-users'

/**
 * Complete Property Owner Journey - Critical End-to-End Flow
 * Tests the entire user experience from onboarding to daily management
 */
test.describe('Complete Property Owner Journey - Critical Flow', () => {
  test('should complete the full property owner journey from registration to management', async ({ page }) => {
    // ========================================
    // PHASE 1: USER REGISTRATION & ONBOARDING
    // ========================================
    
    await test.step('New user registration and email verification', async () => {
      await clearSession(page)
      await page.goto('/auth/signup')
      
      // Fill registration form
      const userEmail = `test-owner-${Date.now()}@tenantflow.test`
      await fillForm(page, {
        'email': userEmail,
        'password': 'SecurePassword123!',
        'confirm-password': 'SecurePassword123!',
        'first-name': 'John',
        'last-name': 'PropertyOwner',
        'company-name': 'PropertyOwner LLC'
      })
      
      // Accept terms and conditions
      await page.check('[data-testid="accept-terms"]')
      await page.check('[data-testid="accept-privacy"]')
      
      // Submit registration
      await page.click('[data-testid="create-account-button"]')
      
      // Should show email verification prompt
      await expect(page.locator('[data-testid="email-verification-prompt"]')).toBeVisible()
      await expect(page.locator('text=Check your email')).toBeVisible()
      
      // Simulate email verification (in real test, this would be automated)
      // For now, we'll simulate successful verification by directly logging in
      await page.goto('/auth/login')
      await fillForm(page, {
        'email': userEmail,
        'password': 'SecurePassword123!'
      })
      await page.click('[data-testid="login-button"]')
      
      // Should redirect to onboarding wizard
      await expect(page).toHaveURL(/\/get-started/)
      await takeScreenshot(page, 'onboarding-wizard-start')
    })
    
    await test.step('Complete onboarding wizard', async () => {
      // Step 1: Business Information
      await expect(page.locator('[data-testid="onboarding-step-1"]')).toBeVisible()
      
      await fillForm(page, {
        'business-type': 'individual',
        'property-count-range': '1-5',
        'experience-level': 'beginner',
        'primary-goal': 'maximize-income'
      })
      
      await page.click('[data-testid="onboarding-next"]')
      
      // Step 2: Property Focus
      await expect(page.locator('[data-testid="onboarding-step-2"]')).toBeVisible()
      
      await page.check('[data-testid="property-type-apartment"]')
      await page.check('[data-testid="property-type-single-family"]')
      await page.selectOption('[data-testid="target-market"]', 'young-professionals')
      
      await page.click('[data-testid="onboarding-next"]')
      
      // Step 3: Features Priority
      await expect(page.locator('[data-testid="onboarding-step-3"]')).toBeVisible()
      
      // Rank features by importance
      await page.click('[data-testid="priority-tenant-screening"]')
      await page.click('[data-testid="priority-maintenance-tracking"]')
      await page.click('[data-testid="priority-rent-collection"]')
      
      await page.click('[data-testid="complete-onboarding"]')
      
      // Should redirect to dashboard with welcome message
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome to TenantFlow')
      await takeScreenshot(page, 'onboarding-complete-dashboard')
    })
    
    // ========================================
    // PHASE 2: SUBSCRIPTION SETUP
    // ========================================
    
    await test.step('Start free trial and upgrade subscription', async () => {
      // Should show free trial banner
      await expect(page.locator('[data-testid="trial-banner"]')).toBeVisible()
      await expect(page.locator('[data-testid="days-remaining"]')).toContainText('14 days')
      
      // Access billing settings
      await page.click('[data-testid="upgrade-subscription"]')
      await expect(page).toHaveURL(/\/billing/)
      
      // Review available plans
      await expect(page.locator('[data-testid="plan-starter"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-professional"]')).toBeVisible()
      await expect(page.locator('[data-testid="plan-enterprise"]')).toBeVisible()
      
      // Select Professional plan
      await page.click('[data-testid="select-professional-plan"]')
      
      // Should redirect to Stripe Checkout
      await expect(page).toHaveURL(/checkout\.stripe\.com|stripe-checkout/)
      
      // Fill payment information (test mode)
      await page.fill('[data-testid="card-number"]', '4242424242424242')
      await page.fill('[data-testid="card-expiry"]', '12/28')
      await page.fill('[data-testid="card-cvc"]', '123')
      await page.fill('[data-testid="billing-name"]', 'John PropertyOwner')
      
      // Complete payment
      await page.click('[data-testid="submit-payment"]')
      
      // Should return to app with success message
      await expect(page).toHaveURL(/\/dashboard/)
      await waitForToast(page, 'Subscription activated successfully')
      
      // Verify subscription status
      await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Professional')
      await takeScreenshot(page, 'subscription-activated')
    })
    
    // ========================================
    // PHASE 3: PROPERTY SETUP & CONFIGURATION
    // ========================================
    
    await test.step('Create first property with complete setup', async () => {
      await navigateToSection(page, 'properties')
      
      // Should show empty state with setup guidance
      await expect(page.locator('[data-testid="empty-properties-state"]')).toBeVisible()
      await expect(page.locator('[data-testid="add-first-property-guide"]')).toBeVisible()
      
      // Start property creation wizard
      await page.click('[data-testid="create-first-property"]')
      
      // Property Basic Info
      await fillForm(page, {
        'property-name': 'Sunset Apartments',
        'property-type': 'APARTMENT',
        'property-address': '123 Sunset Boulevard',
        'property-city': 'Austin',
        'property-state': 'TX',
        'property-zip': '78701',
        'property-description': 'Modern apartment complex in downtown Austin'
      })
      
      await page.click('[data-testid="next-step"]')
      
      // Property Details
      await fillForm(page, {
        'year-built': '2020',
        'total-units': '12',
        'parking-spaces': '24',
        'square-footage': '15000'
      })
      
      // Add amenities
      await page.check('[data-testid="amenity-pool"]')
      await page.check('[data-testid="amenity-gym"]')
      await page.check('[data-testid="amenity-parking"]')
      await page.check('[data-testid="amenity-laundry"]')
      
      await page.click('[data-testid="next-step"]')
      
      // Upload property images
      await uploadTestFile(page, '[data-testid="upload-exterior"]', 'property-exterior.jpg')
      await uploadTestFile(page, '[data-testid="upload-lobby"]', 'property-lobby.jpg')
      await uploadTestFile(page, '[data-testid="upload-amenities"]', 'property-pool.jpg')
      
      await page.click('[data-testid="next-step"]')
      
      // Financial Settings
      await fillForm(page, {
        'base-rent': '1800',
        'security-deposit': '1800',
        'pet-fee': '50',
        'application-fee': '100'
      })
      
      await page.click('[data-testid="create-property"]')
      
      await waitForToast(page, 'Property created successfully')
      await expect(page).toHaveURL(/\/properties\/[a-zA-Z0-9-]+/)
      await takeScreenshot(page, 'first-property-created')
    })
    
    await test.step('Setup property units', async () => {
      // Navigate to units tab
      await page.click('[data-testid="property-units-tab"]')
      
      // Should show unit setup wizard
      await expect(page.locator('[data-testid="unit-setup-wizard"]')).toBeVisible()
      
      // Create units in bulk
      await page.click('[data-testid="bulk-create-units"]')
      
      await fillForm(page, {
        'unit-count': '12',
        'unit-prefix': 'APT',
        'starting-number': '101',
        'floor-count': '3',
        'units-per-floor': '4'
      })
      
      // Set default unit configuration
      await fillForm(page, {
        'default-bedrooms': '2',
        'default-bathrooms': '2',
        'default-sqft': '1200',
        'default-rent': '1800'
      })
      
      await page.click('[data-testid="create-bulk-units"]')
      
      await waitForToast(page, '12 units created successfully')
      
      // Verify units were created
      await expect(page.locator('[data-testid="unit-card"]')).toHaveCount(12)
      
      // Customize specific units
      await page.click('[data-testid="unit-card"]:first-child [data-testid="edit-unit"]')
      
      await fillForm(page, {
        'unit-bedrooms': '3',
        'unit-bathrooms': '2.5',
        'unit-sqft': '1400',
        'unit-rent': '2000',
        'unit-features': 'Corner unit, city view, balcony'
      })
      
      await page.click('[data-testid="save-unit"]')
      await waitForToast(page, 'Unit updated successfully')
      
      await takeScreenshot(page, 'units-setup-complete')
    })
    
    // ========================================
    // PHASE 4: TENANT MANAGEMENT
    // ========================================
    
    await test.step('Add and manage tenants', async () => {
      await navigateToSection(page, 'tenants')
      
      // Create first tenant invitation
      await page.click('[data-testid="invite-tenant-button"]')
      
      await fillForm(page, {
        'tenant-email': 'tenant1@example.com',
        'tenant-name': 'Alice Johnson',
        'tenant-phone': '+1-555-0101',
        'move-in-date': '2024-02-01',
        'lease-term': '12'
      })
      
      // Assign to unit
      await page.selectOption('[data-testid="assign-unit"]', 'APT101')
      
      // Set screening requirements
      await page.check('[data-testid="require-background-check"]')
      await page.check('[data-testid="require-income-verification"]')
      await page.check('[data-testid="require-references"]')
      
      await page.click('[data-testid="send-invitation"]')
      
      await waitForToast(page, 'Tenant invitation sent successfully')
      
      // Verify tenant appears in list
      await expect(page.locator('[data-testid="tenant-card"]')).toHaveCount(1)
      await expect(page.locator('text=Alice Johnson')).toBeVisible()
      await expect(page.locator('[data-testid="invitation-status"]')).toContainText('Pending')
      
      // Add second tenant
      await page.click('[data-testid="invite-tenant-button"]')
      
      await fillForm(page, {
        'tenant-email': 'tenant2@example.com',
        'tenant-name': 'Bob Smith',
        'tenant-phone': '+1-555-0102',
        'move-in-date': '2024-02-15',
        'lease-term': '12'
      })
      
      await page.selectOption('[data-testid="assign-unit"]', 'APT102')
      await page.click('[data-testid="send-invitation"]')
      
      await waitForToast(page, 'Tenant invitation sent successfully')
      await expect(page.locator('[data-testid="tenant-card"]')).toHaveCount(2)
      
      await takeScreenshot(page, 'tenants-invited')
    })
    
    // ========================================
    // PHASE 5: LEASE MANAGEMENT
    // ========================================
    
    await test.step('Create and manage leases', async () => {
      await navigateToSection(page, 'leases')
      
      // Create lease for first tenant
      await page.click('[data-testid="create-lease-button"]')
      
      // Select tenant and unit
      await page.selectOption('[data-testid="lease-tenant"]', 'Alice Johnson')
      await page.selectOption('[data-testid="lease-unit"]', 'APT101')
      
      // Set lease terms
      await fillForm(page, {
        'lease-start-date': '2024-02-01',
        'lease-end-date': '2025-01-31',
        'monthly-rent': '2000',
        'security-deposit': '2000',
        'pet-deposit': '500'
      })
      
      // Add lease clauses
      await page.check('[data-testid="clause-no-smoking"]')
      await page.check('[data-testid="clause-pets-allowed"]')
      await page.fill('[data-testid="additional-terms"]', 'Maximum 2 pets allowed. Monthly pet rent of $50 per pet.')
      
      // Generate lease document
      await page.click('[data-testid="generate-lease"]')
      
      // Should show lease preview
      await expect(page.locator('[data-testid="lease-preview"]')).toBeVisible()
      await expect(page.locator('[data-testid="lease-pdf-viewer"]')).toBeVisible()
      
      // Send for signature
      await page.click('[data-testid="send-for-signature"]')
      
      await waitForToast(page, 'Lease sent for signature')
      
      // Verify lease appears in list
      await expect(page.locator('[data-testid="lease-card"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="lease-status"]')).toContainText('Pending Signature')
      
      await takeScreenshot(page, 'lease-created')
    })
    
    // ========================================
    // PHASE 6: MAINTENANCE MANAGEMENT
    // ========================================
    
    await test.step('Handle maintenance requests', async () => {
      await navigateToSection(page, 'maintenance')
      
      // Create maintenance request (simulating tenant submission)
      await page.click('[data-testid="create-maintenance-request"]')
      
      await fillForm(page, {
        'request-title': 'Kitchen Faucet Leak',
        'request-description': 'The kitchen faucet is leaking and needs immediate attention',
        'request-priority': 'HIGH',
        'request-category': 'PLUMBING'
      })
      
      await page.selectOption('[data-testid="request-unit"]', 'APT101')
      
      // Upload photos
      await uploadTestFile(page, '[data-testid="upload-photos"]', 'faucet-leak.jpg')
      
      await page.click('[data-testid="submit-request"]')
      
      await waitForToast(page, 'Maintenance request created')
      
      // Assign to contractor
      await page.click('[data-testid="assign-contractor"]')
      await page.selectOption('[data-testid="contractor-select"]', 'Premium Plumbing Services')
      
      await fillForm(page, {
        'estimated-cost': '150',
        'scheduled-date': '2024-01-25',
        'special-instructions': 'Tenant prefers morning appointments'
      })
      
      await page.click('[data-testid="assign-and-notify"]')
      
      await waitForToast(page, 'Contractor assigned and notified')
      
      // Update request status
      await expect(page.locator('[data-testid="request-status"]')).toContainText('Assigned')
      
      await takeScreenshot(page, 'maintenance-assigned')
    })
    
    // ========================================
    // PHASE 7: FINANCIAL TRACKING
    // ========================================
    
    await test.step('Track finances and generate reports', async () => {
      await navigateToSection(page, 'reports')
      
      // View financial dashboard
      await expect(page.locator('[data-testid="financial-summary"]')).toBeVisible()
      await expect(page.locator('[data-testid="monthly-revenue"]')).toBeVisible()
      await expect(page.locator('[data-testid="expenses-summary"]')).toBeVisible()
      await expect(page.locator('[data-testid="net-income"]')).toBeVisible()
      
      // Generate rent roll report
      await page.click('[data-testid="generate-rent-roll"]')
      
      await page.selectOption('[data-testid="report-period"]', 'current-month')
      await page.check('[data-testid="include-vacant-units"]')
      await page.check('[data-testid="include-payment-history"]')
      
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="download-report"]')
      
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/rent-roll.*\.pdf$/)
      
      // View payment tracking
      await page.click('[data-testid="payment-tracking-tab"]')
      
      await expect(page.locator('[data-testid="payment-calendar"]')).toBeVisible()
      await expect(page.locator('[data-testid="overdue-payments"]')).toBeVisible()
      
      await takeScreenshot(page, 'financial-dashboard')
    })
    
    // ========================================
    // PHASE 8: DAILY MANAGEMENT DASHBOARD
    // ========================================
    
    await test.step('Use daily management dashboard', async () => {
      await navigateToSection(page, 'dashboard')
      
      // Verify dashboard shows comprehensive overview
      await expect(page.locator('[data-testid="properties-summary"]')).toContainText('1 Property')
      await expect(page.locator('[data-testid="units-summary"]')).toContainText('12 Units')
      await expect(page.locator('[data-testid="tenants-summary"]')).toContainText('2 Tenants')
      
      // Check critical alerts
      await expect(page.locator('[data-testid="critical-alerts"]')).toBeVisible()
      
      // View recent activity
      await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible()
      await expect(page.locator('[data-testid="activity-item"]')).toHaveCount.greaterThan(0)
      
      // Check upcoming tasks
      await expect(page.locator('[data-testid="upcoming-tasks"]')).toBeVisible()
      
      // Verify quick actions are available
      await expect(page.locator('[data-testid="quick-add-tenant"]')).toBeVisible()
      await expect(page.locator('[data-testid="quick-maintenance"]')).toBeVisible()
      await expect(page.locator('[data-testid="quick-rent-reminder"]')).toBeVisible()
      
      await takeScreenshot(page, 'dashboard-complete')
    })
    
    // ========================================
    // PHASE 9: MOBILE RESPONSIVENESS CHECK
    // ========================================
    
    await test.step('Verify mobile responsiveness', async () => {
      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]')
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
      
      // Test mobile dashboard
      await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible()
      
      // Test mobile property cards
      await navigateToSection(page, 'properties')
      await expect(page.locator('[data-testid="mobile-property-card"]')).toBeVisible()
      
      await takeScreenshot(page, 'mobile-responsive-complete')
      
      // Switch back to desktop
      await page.setViewportSize({ width: 1920, height: 1080 })
    })
    
    // ========================================
    // PHASE 10: PROFILE & SETTINGS
    // ========================================
    
    await test.step('Configure profile and preferences', async () => {
      await navigateToSection(page, 'profile')
      
      // Update profile information
      await page.click('[data-testid="edit-profile"]')
      
      await fillForm(page, {
        'display-name': 'John PropertyOwner',
        'business-name': 'PropertyOwner LLC',
        'phone': '+1-555-123-4567',
        'timezone': 'America/Chicago',
        'bio': 'Professional property manager with 5+ years experience'
      })
      
      // Upload profile avatar
      await uploadTestFile(page, '[data-testid="upload-avatar"]', 'profile-photo.jpg')
      
      await page.click('[data-testid="save-profile"]')
      await waitForToast(page, 'Profile updated successfully')
      
      // Configure notification preferences
      await page.click('[data-testid="notification-settings"]')
      
      await page.check('[data-testid="email-maintenance-requests"]')
      await page.check('[data-testid="sms-urgent-issues"]')
      await page.check('[data-testid="email-payment-reminders"]')
      
      await page.click('[data-testid="save-notifications"]')
      await waitForToast(page, 'Notification preferences saved')
      
      await takeScreenshot(page, 'profile-complete')
    })
    
    // ========================================
    // FINAL VERIFICATION
    // ========================================
    
    await test.step('Final system verification', async () => {
      // Navigate back to dashboard
      await navigateToSection(page, 'dashboard')
      
      // Verify all key metrics are populated
      await expect(page.locator('[data-testid="total-revenue"]')).not.toContainText('$0')
      await expect(page.locator('[data-testid="occupancy-rate"]')).toBeVisible()
      await expect(page.locator('[data-testid="maintenance-requests"]')).toContainText('1')
      
      // Verify user is in good standing
      await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Professional')
      await expect(page.locator('[data-testid="account-status"]')).toContainText('Active')
      
      // Take final screenshot
      await takeScreenshot(page, 'journey-complete-final')
      
      // Log completion
      console.log('✅ Complete Property Owner Journey completed successfully!')
      console.log('📊 Created: 1 Property, 12 Units, 2 Tenants, 1 Lease, 1 Maintenance Request')
      console.log('💳 Subscription: Professional Plan Active')
      console.log('📱 Mobile Responsiveness: Verified')
    })
  })
})