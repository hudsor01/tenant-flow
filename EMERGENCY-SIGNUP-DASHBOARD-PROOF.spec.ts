import { test, expect } from '@playwright/test';

test.describe('EMERGENCY: Complete Signup to Dashboard Flow', () => {
  test('User can signup and reach dashboard home page', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Test User';

    // Step 1: Navigate to signup page
    console.log('🚀 Step 1: Navigating to signup page...');
    await page.goto('http://localhost:3003/auth/signup');
    await expect(page).toHaveURL(/\/auth\/signup/);
    await page.screenshot({ path: `proof-01-signup-page-loaded-${timestamp}.png`, fullPage: true });
    console.log('✅ Signup page loaded successfully');

    // Step 2: Fill out signup form
    console.log('🚀 Step 2: Filling signup form...');
    await page.fill('input[name="fullName"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Make sure terms checkbox is checked
    const termsCheckbox = page.locator('input[name="terms"]');
    if (!(await termsCheckbox.isChecked())) {
      await termsCheckbox.check();
    }
    await page.screenshot({ path: `proof-02-form-filled-${timestamp}.png`, fullPage: true });
    console.log('✅ Form filled successfully');

    // Step 3: Submit the form
    console.log('🚀 Step 3: Submitting signup form...');
    await page.click('button[type="submit"]');
    
    // Wait for either:
    // 1. Dashboard redirect (auto-login success)
    // 2. Success message (email verification required)
    // 3. Login page redirect
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `proof-03-after-submission-${timestamp}.png`, fullPage: true });
    
    const currentUrl = page.url();
    console.log('📍 Current URL after signup:', currentUrl);

    // Step 4: Handle different post-signup scenarios
    if (currentUrl.includes('/dashboard')) {
      console.log('🎉 SUCCESS: Auto-login worked! User is on dashboard');
      await page.screenshot({ path: `proof-04-DASHBOARD-SUCCESS-${timestamp}.png`, fullPage: true });
      
      // Verify dashboard elements are visible
      await expect(page.locator('h1')).toContainText('Dashboard');
      console.log('✅ Dashboard page confirmed with header');
      
    } else if (currentUrl.includes('/auth/verify-email') || page.locator('text=Check Your Email').isVisible()) {
      console.log('📧 Email verification required, attempting manual login...');
      
      // Navigate to login page
      await page.goto('http://localhost:3003/auth/login');
      await page.screenshot({ path: `proof-05-login-page-${timestamp}.png`, fullPage: true });
      
      // Fill login form
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `proof-06-after-login-${timestamp}.png`, fullPage: true });
      
      // Should now be on dashboard
      if (page.url().includes('/dashboard')) {
        console.log('🎉 SUCCESS: Manual login after signup worked!');
        await page.screenshot({ path: `proof-07-DASHBOARD-SUCCESS-${timestamp}.png`, fullPage: true });
        await expect(page.locator('h1')).toContainText('Dashboard');
      } else {
        console.log('❌ Login failed, current URL:', page.url());
        throw new Error('Login after signup failed');
      }
      
    } else if (currentUrl.includes('/auth/login')) {
      console.log('🔄 Redirected to login page, attempting login...');
      
      // Fill login form
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
      
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: `proof-08-after-redirect-login-${timestamp}.png`, fullPage: true });
      
      // Should now be on dashboard  
      if (page.url().includes('/dashboard')) {
        console.log('🎉 SUCCESS: Login after redirect worked!');
        await page.screenshot({ path: `proof-09-DASHBOARD-SUCCESS-${timestamp}.png`, fullPage: true });
        await expect(page.locator('h1')).toContainText('Dashboard');
      } else {
        console.log('❌ Login failed after redirect, current URL:', page.url());
        throw new Error('Login failed after redirect to login page');
      }
    } else {
      console.log('❌ UNEXPECTED: Unknown state after signup');
      console.log('Current URL:', currentUrl);
      await page.screenshot({ path: `proof-ERROR-unexpected-state-${timestamp}.png`, fullPage: true });
      throw new Error(`Unexpected state after signup. URL: ${currentUrl}`);
    }

    // Final verification: We should be on dashboard with proper content
    console.log('🚀 Final verification...');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Take final proof screenshot
    await page.screenshot({ path: `FINAL-PROOF-DASHBOARD-HOME-${timestamp}.png`, fullPage: true });
    
    console.log('🎊 COMPLETE SUCCESS: User journey from signup to dashboard verified!');
    console.log(`📸 Screenshots saved with timestamp: ${timestamp}`);
  });
});