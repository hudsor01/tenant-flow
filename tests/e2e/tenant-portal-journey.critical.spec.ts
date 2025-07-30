import { test, expect } from '@playwright/test'
import { loginAs, waitForApiResponse, fillForm, waitForToast, navigateToSection, waitForLoadingComplete, uploadTestFile, takeScreenshot, clearSession } from './utils/test-helpers'
import { TestUser } from './utils/test-users'

/**
 * Complete Tenant Portal Journey - Critical End-to-End Flow
 * Tests the entire tenant experience from invitation to daily portal usage
 */
test.describe('Complete Tenant Portal Journey - Critical Flow', () => {
  test('should complete the full tenant journey from invitation to portal management', async ({ page }) => {
    // ========================================
    // PHASE 1: INVITATION ACCEPTANCE
    // ========================================
    
    await test.step('Accept tenant invitation and create account', async () => {
      await clearSession(page)
      
      // Simulate clicking invitation link (with token)
      const invitationToken = 'test-invitation-token-123'
      await page.goto(`/tenant/invitation?token=${invitationToken}`)
      
      // Should show invitation details
      await expect(page.locator('[data-testid="invitation-details"]')).toBeVisible()
      await expect(page.locator('[data-testid="property-name"]')).toContainText('Sunset Apartments')
      await expect(page.locator('[data-testid="unit-number"]')).toContainText('APT101')
      await expect(page.locator('[data-testid="landlord-name"]')).toContainText('John PropertyOwner')
      
      // Accept invitation and create account
      await page.click('[data-testid="accept-invitation"]')
      
      // Should redirect to tenant registration
      await expect(page).toHaveURL(/\/tenant\/register/)
      
      const tenantEmail = `tenant-${Date.now()}@tenantflow.test`
      await fillForm(page, {
        'email': tenantEmail,
        'password': 'TenantPassword123!',
        'confirm-password': 'TenantPassword123!',
        'first-name': 'Alice',
        'last-name': 'Johnson',
        'phone': '+1-555-0101',
        'date-of-birth': '1990-05-15'
      })
      
      // Accept tenant terms
      await page.check('[data-testid="accept-tenant-terms"]')
      await page.check('[data-testid="accept-privacy-policy"]')
      
      await page.click('[data-testid="create-tenant-account"]')
      
      // Should show email verification screen
      await expect(page.locator('[data-testid="email-verification-required"]')).toBeVisible()
      
      // Simulate email verification (in real test, would be automated)
      await page.goto('/tenant/login')
      await fillForm(page, {
        'email': tenantEmail,
        'password': 'TenantPassword123!'
      })
      await page.click('[data-testid="tenant-login-button"]')
      
      // Should redirect to tenant onboarding
      await expect(page).toHaveURL(/\/tenant\/onboarding/)
      await takeScreenshot(page, 'tenant-invitation-accepted')
    })
    
    await test.step('Complete tenant onboarding', async () => {
      // Step 1: Personal Information
      await expect(page.locator('[data-testid="tenant-onboarding-step-1"]')).toBeVisible()
      
      await fillForm(page, {
        'emergency-contact-name': 'Maria Johnson',
        'emergency-contact-phone': '+1-555-0199',
        'emergency-contact-relationship': 'Sister',
        'employer': 'Tech Solutions Inc',
        'job-title': 'Software Engineer',
        'annual-income': '85000',
        'employment-start-date': '2022-01-15'
      })
      
      await page.click('[data-testid="onboarding-next"]')
      
      // Step 2: Preferences & Requirements
      await expect(page.locator('[data-testid="tenant-onboarding-step-2"]')).toBeVisible()
      
      await page.selectOption('[data-testid="communication-preference"]', 'email')
      await page.selectOption('[data-testid="maintenance-access-preference"]', 'advance-notice')
      await page.fill('[data-testid="special-requests"]', 'Prefer morning maintenance appointments')
      
      // Pet information
      await page.check('[data-testid="has-pets"]')
      await fillForm(page, {
        'pet-type': 'Dog',
        'pet-name': 'Max',
        'pet-breed': 'Golden Retriever',
        'pet-weight': '65',
        'pet-vaccinated': 'true'
      })
      
      await page.click('[data-testid="onboarding-next"]')
      
      // Step 3: Document Upload
      await expect(page.locator('[data-testid="tenant-onboarding-step-3"]')).toBeVisible()
      
      // Upload required documents
      await uploadTestFile(page, '[data-testid="upload-id"]', 'drivers-license.jpg')
      await uploadTestFile(page, '[data-testid="upload-income"]', 'pay-stub.pdf')
      await uploadTestFile(page, '[data-testid="upload-employment"]', 'employment-letter.pdf')
      await uploadTestFile(page, '[data-testid="upload-references"]', 'references.pdf')
      
      await page.click('[data-testid="complete-tenant-onboarding"]')
      
      // Should redirect to tenant dashboard
      await expect(page).toHaveURL(/\/tenant\/dashboard/)
      await expect(page.locator('[data-testid="tenant-welcome-message"]')).toContainText('Welcome to your tenant portal')
      await takeScreenshot(page, 'tenant-onboarding-complete')
    })
    
    // ========================================
    // PHASE 2: TENANT SCREENING COMPLETION
    // ========================================
    
    await test.step('Complete tenant screening process', async () => {
      // Should show screening requirements checklist
      await expect(page.locator('[data-testid="screening-checklist"]')).toBeVisible()
      
      // Background check authorization
      await page.click('[data-testid="authorize-background-check"]')
      await expect(page.locator('[data-testid="background-check-modal"]')).toBeVisible()
      
      await page.check('[data-testid="consent-background-check"]')
      await page.fill('[data-testid="ssn-last-four"]', '1234')
      await page.click('[data-testid="submit-background-authorization"]')
      
      await waitForToast(page, 'Background check authorized')
      
      // Income verification
      await page.click('[data-testid="verify-income"]')
      await expect(page.locator('[data-testid="income-verification-modal"]')).toBeVisible()
      
      await fillForm(page, {
        'monthly-income': '7083',
        'other-income': '500',
        'other-income-source': 'Freelance consulting'
      })
      
      await uploadTestFile(page, '[data-testid="upload-bank-statements"]', 'bank-statements.pdf')
      await page.click('[data-testid="submit-income-verification"]')
      
      await waitForToast(page, 'Income verification submitted')
      
      // Reference contacts authorization
      await page.click('[data-testid="authorize-reference-checks"]')
      await expect(page.locator('[data-testid="references-modal"]')).toBeVisible()
      
      // Add references
      await fillForm(page, {
        'ref1-name': 'John Smith',
        'ref1-relationship': 'Previous Landlord',
        'ref1-phone': '+1-555-0201',
        'ref1-email': 'johnsmith@example.com',
        'ref2-name': 'Sarah Wilson',
        'ref2-relationship': 'Manager',
        'ref2-phone': '+1-555-0202',
        'ref2-email': 'sarah.wilson@company.com'
      })
      
      await page.click('[data-testid="submit-references"]')
      await waitForToast(page, 'References submitted for verification')
      
      // Should show screening in progress
      await expect(page.locator('[data-testid="screening-status"]')).toContainText('In Progress')
      await takeScreenshot(page, 'tenant-screening-submitted')
    })
    
    // ========================================
    // PHASE 3: LEASE REVIEW AND SIGNING
    // ========================================
    
    await test.step('Review and sign lease agreement', async () => {
      // Navigate to lease section
      await page.click('[data-testid="tenant-nav-lease"]')
      
      // Should show lease pending signature
      await expect(page.locator('[data-testid="lease-status"]')).toContainText('Pending Signature')
      await expect(page.locator('[data-testid="lease-document-preview"]')).toBeVisible()
      
      // Review lease terms
      await page.click('[data-testid="review-lease-details"]')
      await expect(page.locator('[data-testid="lease-terms-modal"]')).toBeVisible()
      
      // Verify key lease terms
      await expect(page.locator('[data-testid="lease-rent-amount"]')).toContainText('$2,000')
      await expect(page.locator('[data-testid="lease-deposit"]')).toContainText('$2,000')
      await expect(page.locator('[data-testid="lease-start-date"]')).toContainText('February 1, 2024')
      await expect(page.locator('[data-testid="lease-end-date"]')).toContainText('January 31, 2025')
      
      await page.click('[data-testid="close-lease-review"]')
      
      // Download lease for review
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="download-lease"]')
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/lease.*\.pdf$/)
      
      // Sign lease electronically
      await page.click('[data-testid="sign-lease-electronically"]')
      await expect(page.locator('[data-testid="electronic-signature-modal"]')).toBeVisible()
      
      // Review signing terms
      await page.check('[data-testid="agree-to-lease-terms"]')
      await page.check('[data-testid="agree-to-electronic-signature"]')
      
      // Electronic signature
      await page.fill('[data-testid="signature-full-name"]', 'Alice Johnson')
      await page.fill('[data-testid="signature-date"]', '2024-01-20')
      
      // Draw signature (simulate)
      await page.click('[data-testid="signature-canvas"]')
      
      await page.click('[data-testid="submit-electronic-signature"]')
      
      await waitForToast(page, 'Lease signed successfully')
      
      // Should show signed status
      await expect(page.locator('[data-testid="lease-status"]')).toContainText('Signed')
      await expect(page.locator('[data-testid="lease-effective-date"]')).toBeVisible()
      
      await takeScreenshot(page, 'lease-signed')
    })
    
    // ========================================
    // PHASE 4: MOVE-IN PREPARATION
    // ========================================
    
    await test.step('Complete move-in preparation', async () => {
      // Should show move-in checklist
      await expect(page.locator('[data-testid="move-in-checklist"]')).toBeVisible()
      
      // Utility setup
      await page.click('[data-testid="setup-utilities"]')
      await expect(page.locator('[data-testid="utilities-modal"]')).toBeVisible()
      
      await page.check('[data-testid="transfer-electricity"]')
      await page.check('[data-testid="transfer-gas"]')
      await page.check('[data-testid="setup-internet"]')
      
      await fillForm(page, {
        'utility-company-electric': 'Austin Energy',
        'utility-company-gas': 'Texas Gas Service',
        'internet-provider': 'AT&T Fiber'
      })
      
      await page.click('[data-testid="submit-utility-requests"]')
      await waitForToast(page, 'Utility transfer requests submitted')
      
      // Insurance requirement
      await page.click('[data-testid="upload-renters-insurance"]')
      await uploadTestFile(page, '[data-testid="insurance-policy"]', 'renters-insurance.pdf')
      await waitForToast(page, 'Insurance policy uploaded')
      
      // Key pickup scheduling
      await page.click('[data-testid="schedule-key-pickup"]')
      await expect(page.locator('[data-testid="key-pickup-modal"]')).toBeVisible()
      
      await fillForm(page, {
        'pickup-date': '2024-01-31',
        'pickup-time': '10:00',
        'contact-person': 'Alice Johnson',
        'contact-phone': '+1-555-0101'
      })
      
      await page.click('[data-testid="confirm-key-pickup"]')
      await waitForToast(page, 'Key pickup scheduled')
      
      // Move-in inspection scheduling
      await page.click('[data-testid="schedule-move-in-inspection"]')
      await fillForm(page, {
        'inspection-date': '2024-02-01',
        'inspection-time': '14:00'
      })
      
      await page.click('[data-testid="confirm-inspection"]')
      await waitForToast(page, 'Move-in inspection scheduled')
      
      await takeScreenshot(page, 'move-in-preparation-complete')
    })
    
    // ========================================
    // PHASE 5: DAILY TENANT PORTAL USAGE
    // ========================================
    
    await test.step('Use daily tenant portal features', async () => {
      // Navigate to dashboard
      await page.click('[data-testid="tenant-nav-dashboard"]')
      
      // Verify dashboard shows key information
      await expect(page.locator('[data-testid="current-rent"]')).toContainText('$2,000')
      await expect(page.locator('[data-testid="lease-status"]')).toContainText('Active')
      await expect(page.locator('[data-testid="next-payment-due"]')).toBeVisible()
      
      // View lease details
      await page.click('[data-testid="view-lease-details"]')
      await expect(page.locator('[data-testid="lease-summary"]')).toBeVisible()
      await page.click('[data-testid="close-lease-details"]')
      
      // Check payment history
      await page.click('[data-testid="tenant-nav-payments"]')
      await expect(page.locator('[data-testid="payment-history"]')).toBeVisible()
      
      // Should show auto-pay option
      await expect(page.locator('[data-testid="setup-autopay"]')).toBeVisible()
      
      // Set up auto-pay
      await page.click('[data-testid="setup-autopay"]')
      await expect(page.locator('[data-testid="autopay-modal"]')).toBeVisible()
      
      await fillForm(page, {
        'card-number': '4242424242424242',
        'card-expiry': '12/28',
        'card-cvc': '123',
        'cardholder-name': 'Alice Johnson',
        'autopay-day': '1'
      })
      
      await page.check('[data-testid="agree-autopay-terms"]')
      await page.click('[data-testid="setup-autopay-submit"]')
      
      await waitForToast(page, 'Auto-pay setup successfully')
      
      await takeScreenshot(page, 'autopay-setup')
    })
    
    // ========================================
    // PHASE 6: MAINTENANCE REQUEST WORKFLOW
    // ========================================
    
    await test.step('Submit and track maintenance requests', async () => {
      await page.click('[data-testid="tenant-nav-maintenance"]')
      
      // Submit maintenance request
      await page.click('[data-testid="submit-maintenance-request"]')
      await expect(page.locator('[data-testid="maintenance-request-modal"]')).toBeVisible()
      
      await fillForm(page, {
        'request-title': 'Air Conditioning Not Working',
        'request-category': 'HVAC',
        'request-priority': 'HIGH',
        'request-description': 'The AC unit is not cooling properly. Temperature is very warm in the apartment.',
        'preferred-time': 'Morning',
        'tenant-present': 'Yes'
      })
      
      // Upload photos
      await uploadTestFile(page, '[data-testid="upload-maintenance-photos"]', 'ac-thermostat.jpg')
      await uploadTestFile(page, '[data-testid="upload-maintenance-photos"]', 'ac-unit.jpg')
      
      await page.click('[data-testid="submit-maintenance-request"]')
      await waitForToast(page, 'Maintenance request submitted successfully')
      
      // Should show in requests list
      await expect(page.locator('[data-testid="maintenance-request-card"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="request-status"]')).toContainText('Submitted')
      
      // Track request progress
      await page.click('[data-testid="view-request-details"]')
      await expect(page.locator('[data-testid="request-timeline"]')).toBeVisible()
      await expect(page.locator('[data-testid="estimated-resolution"]')).toBeVisible()
      
      // Receive update notification (simulate landlord update)
      await page.click('[data-testid="close-request-details"]')
      
      // Should show updated status
      await page.reload()
      await expect(page.locator('[data-testid="request-status"]')).toContainText('Assigned')
      await expect(page.locator('[data-testid="contractor-info"]')).toBeVisible()
      
      await takeScreenshot(page, 'maintenance-request-submitted')
    })
    
    // ========================================
    // PHASE 7: COMMUNICATION WITH LANDLORD
    // ========================================
    
    await test.step('Communicate with landlord and property management', async () => {
      await page.click('[data-testid="tenant-nav-messages"]')
      
      // Send message to landlord
      await page.click('[data-testid="compose-message"]')
      await expect(page.locator('[data-testid="message-compose-modal"]')).toBeVisible()
      
      await fillForm(page, {
        'message-subject': 'Package Delivery Inquiry',
        'message-recipient': 'Property Manager',
        'message-body': 'Hi, I wanted to ask about the procedure for receiving large packages when I\'m not home. Is there a secure location where they can be left?'
      })
      
      await page.click('[data-testid="send-message"]')
      await waitForToast(page, 'Message sent successfully')
      
      // Should show in sent messages
      await expect(page.locator('[data-testid="message-thread"]')).toHaveCount(1)
      
      // View message thread
      await page.click('[data-testid="message-thread"]:first-child')
      await expect(page.locator('[data-testid="message-conversation"]')).toBeVisible()
      
      // Reply to landlord response (simulate)
      await page.fill('[data-testid="reply-message"]', 'Thank you for the information! That sounds perfect.')
      await page.click('[data-testid="send-reply"]')
      
      await waitForToast(page, 'Reply sent')
      
      await takeScreenshot(page, 'tenant-communication')
    })
    
    // ========================================
    // PHASE 8: DOCUMENT MANAGEMENT
    // ========================================
    
    await test.step('Manage documents and important files', async () => {
      await page.click('[data-testid="tenant-nav-documents"]')
      
      // Should show lease documents
      await expect(page.locator('[data-testid="lease-documents"]')).toBeVisible()
      await expect(page.locator('[data-testid="signed-lease"]')).toBeVisible()
      
      // Upload additional documents
      await page.click('[data-testid="upload-document"]')
      await expect(page.locator('[data-testid="document-upload-modal"]')).toBeVisible()
      
      await page.selectOption('[data-testid="document-type"]', 'insurance')
      await uploadTestFile(page, '[data-testid="document-file"]', 'updated-insurance.pdf')
      await page.fill('[data-testid="document-description"]', 'Updated renters insurance policy')
      
      await page.click('[data-testid="upload-document-submit"]')
      await waitForToast(page, 'Document uploaded successfully')
      
      // Organize documents
      await page.click('[data-testid="create-folder"]')
      await page.fill('[data-testid="folder-name"]', 'Insurance Documents')
      await page.click('[data-testid="create-folder-submit"]')
      
      // Move document to folder
      await page.check('[data-testid="document-checkbox"]:first-child')
      await page.click('[data-testid="move-to-folder"]')
      await page.selectOption('[data-testid="target-folder"]', 'Insurance Documents')
      await page.click('[data-testid="move-documents"]')
      
      await waitForToast(page, 'Documents moved successfully')
      
      await takeScreenshot(page, 'document-management')
    })
    
    // ========================================
    // PHASE 9: PAYMENT PROCESSING
    // ========================================
    
    await test.step('Process rent payment', async () => {
      await page.click('[data-testid="tenant-nav-payments"]')
      
      // Make one-time payment
      await page.click('[data-testid="make-payment"]')
      await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible()
      
      // Should show current rent amount
      await expect(page.locator('[data-testid="amount-due"]')).toContainText('$2,000')
      
      // Add fees if applicable
      await page.check('[data-testid="include-late-fee"]')
      await expect(page.locator('[data-testid="total-amount"]')).toContainText('$2,050')
      
      // Payment method selection
      await page.click('[data-testid="payment-method-card"]')
      
      // Use saved card or enter new
      await page.click('[data-testid="use-saved-card"]')
      await page.selectOption('[data-testid="saved-cards"]', 'card-ending-4242')
      
      // Add memo
      await page.fill('[data-testid="payment-memo"]', 'February 2024 rent payment')
      
      await page.click('[data-testid="process-payment"]')
      
      // Should show processing
      await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible()
      
      // Should show success
      await waitForToast(page, 'Payment processed successfully')
      
      // Should show in payment history
      await expect(page.locator('[data-testid="payment-record"]')).toHaveCount(1)
      await expect(page.locator('[data-testid="payment-status"]')).toContainText('Completed')
      
      // Download receipt
      const downloadPromise = page.waitForEvent('download')
      await page.click('[data-testid="download-receipt"]')
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/receipt.*\.pdf$/)
      
      await takeScreenshot(page, 'payment-processed')
    })
    
    // ========================================
    // PHASE 10: PROFILE MANAGEMENT
    // ========================================
    
    await test.step('Manage tenant profile and preferences', async () => {
      await page.click('[data-testid="tenant-nav-profile"]')
      
      // Update contact information
      await page.click('[data-testid="edit-contact-info"]')
      
      await fillForm(page, {
        'phone-number': '+1-555-0105',
        'emergency-contact-name': 'Maria Johnson-Smith',
        'emergency-contact-phone': '+1-555-0198'
      })
      
      await page.click('[data-testid="save-contact-info"]')
      await waitForToast(page, 'Contact information updated')
      
      // Update communication preferences
      await page.click('[data-testid="communication-preferences"]')
      
      await page.check('[data-testid="email-notifications"]')
      await page.check('[data-testid="sms-urgent-only"]')
      await page.uncheck('[data-testid="promotional-emails"]')
      
      await page.click('[data-testid="save-preferences"]')
      await waitForToast(page, 'Preferences updated')
      
      // Update password
      await page.click('[data-testid="change-password"]')
      await expect(page.locator('[data-testid="password-change-modal"]')).toBeVisible()
      
      await fillForm(page, {
        'current-password': 'TenantPassword123!',
        'new-password': 'NewTenantPassword123!',
        'confirm-new-password': 'NewTenantPassword123!'
      })
      
      await page.click('[data-testid="update-password"]')
      await waitForToast(page, 'Password updated successfully')
      
      await takeScreenshot(page, 'profile-updated')
    })
    
    // ========================================
    // PHASE 11: MOBILE RESPONSIVENESS
    // ========================================
    
    await test.step('Verify mobile tenant portal experience', async () => {
      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]')
      await expect(page.locator('[data-testid="mobile-tenant-nav"]')).toBeVisible()
      
      // Test mobile dashboard
      await page.click('[data-testid="mobile-nav-dashboard"]')
      await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible()
      
      // Test mobile maintenance request
      await page.click('[data-testid="mobile-nav-maintenance"]')
      await expect(page.locator('[data-testid="mobile-maintenance-list"]')).toBeVisible()
      
      // Test mobile payment
      await page.click('[data-testid="mobile-nav-payments"]')
      await expect(page.locator('[data-testid="mobile-payment-history"]')).toBeVisible()
      
      await takeScreenshot(page, 'tenant-mobile-complete')
      
      // Switch back to desktop
      await page.setViewportSize({ width: 1920, height: 1080 })
    })
    
    // ========================================
    // FINAL VERIFICATION
    // ========================================
    
    await test.step('Final tenant portal verification', async () => {
      // Navigate back to dashboard
      await page.click('[data-testid="tenant-nav-dashboard"]')
      
      // Verify all key features are working
      await expect(page.locator('[data-testid="lease-status"]')).toContainText('Active')
      await expect(page.locator('[data-testid="autopay-enabled"]')).toBeVisible()
      await expect(page.locator('[data-testid="maintenance-requests-count"]')).toContainText('1')
      await expect(page.locator('[data-testid="documents-count"]')).toBeVisible()
      
      // Verify tenant portal health
      await expect(page.locator('[data-testid="account-status"]')).toContainText('Good Standing')
      await expect(page.locator('[data-testid="payment-status"]')).toContainText('Current')
      
      // Take final screenshot
      await takeScreenshot(page, 'tenant-journey-complete-final')
      
      // Log completion
      console.log('✅ Complete Tenant Portal Journey completed successfully!')
      console.log('📄 Signed lease, set up auto-pay, submitted maintenance request')
      console.log('💳 Payment processed, documents uploaded, profile updated')
      console.log('📱 Mobile responsiveness verified')
      console.log('🏠 Tenant portal fully functional')
    })
  })
  
  test('should handle tenant-specific edge cases and error scenarios', async ({ page }) => {
    await test.step('Test tenant portal error handling', async () => {
      await loginAs(page, 'TENANT_1')
      
      // Test payment failure handling
      await navigateToSection(page, 'payments')
      await page.click('[data-testid="make-payment"]')
      
      // Use declined test card
      await fillForm(page, {
        'card-number': '4000000000000002',
        'card-expiry': '12/28',
        'card-cvc': '123'
      })
      
      await page.click('[data-testid="process-payment"]')
      
      // Should show payment declined error
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined')
      await page.click('[data-testid="close-payment-modal"]')
      
      // Test maintenance request with missing information
      await navigateToSection(page, 'maintenance')
      await page.click('[data-testid="submit-maintenance-request"]')
      
      // Submit with minimal information
      await page.fill('[data-testid="request-title"]', 'Issue')
      await page.click('[data-testid="submit-maintenance-request"]')
      
      // Should show validation errors
      await expect(page.locator('[data-testid="description-required"]')).toBeVisible()
      await expect(page.locator('[data-testid="category-required"]')).toBeVisible()
      
      await page.click('[data-testid="close-maintenance-modal"]')
      
      // Test document upload size limit
      await navigateToSection(page, 'documents')
      await page.click('[data-testid="upload-document"]')
      
      // Simulate large file upload error
      await page.evaluate(() => {
        const fileInput = document.querySelector('[data-testid="document-file"]')
        if (fileInput) {
          const event = new Event('change')
          fileInput.files = { length: 1, 0: { size: 25 * 1024 * 1024, name: 'large-file.pdf' } }
          fileInput.dispatchEvent(event)
        }
      })
      
      await expect(page.locator('[data-testid="file-too-large-error"]')).toBeVisible()
      
      await takeScreenshot(page, 'tenant-error-handling')
    })
  })
})