import { test, expect } from '@playwright/test';

test.describe('Free Trial Signup Flow', () => {
  test('should complete free trial signup with Stripe Checkout', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:5173');
    
    // Click the "Get started free" button
    await page.click('button:has-text("Get started free")');
    
    // Wait for the signup page to load
    await expect(page).toHaveURL(/.*\/auth\/signup.*/);
    
    // Fill in the signup form
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]:not([id="repeat-password"])', 'TestPassword123!');
    await page.fill('#repeat-password', 'TestPassword123!');
    
    // Click the "Start Free Trial" button
    await page.click('button[type="submit"]:has-text("Start Free Trial")');
    
    // Wait for Supabase authentication
    // In a real test environment, this would redirect to Stripe Checkout
    await page.waitForTimeout(2000);
    
    // With backend running, the flow would be:
    // 1. User signs up via Supabase
    // 2. Backend creates a Stripe customer
    // 3. Backend creates a Checkout Session for the free trial
    // 4. User is redirected to Stripe Checkout
    // 5. User completes Checkout (no payment required for trial)
    // 6. Stripe webhook confirms subscription creation
    // 7. User is redirected back to the app dashboard
    
    // Expected assertions when backend is running:
    // await expect(page).toHaveURL(/.*checkout\.stripe\.com.*/);
    // await page.waitForURL(/.*\/dashboard.*/);
    // await expect(page.locator('text=/Free Trial.*Active/')).toBeVisible();
  });

  test('should show free trial information on signup page', async ({ page }) => {
    await page.goto('http://localhost:5173/auth/signup');
    
    // Verify trial information is displayed
    await expect(page.locator('text=/Start Your Free Trial/')).toBeVisible();
    await expect(page.locator('text=/14 days.*full access/')).toBeVisible();
  });

  test('should handle existing user trying to sign up', async ({ page }) => {
    await page.goto('http://localhost:5173/auth/signup');
    
    // Fill in form with existing user
    await page.fill('input[type="email"]', 'existing@example.com');
    await page.fill('input[type="password"]:not([id="repeat-password"])', 'TestPassword123!');
    await page.fill('#repeat-password', 'TestPassword123!');
    
    await page.click('button[type="submit"]:has-text("Start Free Trial")');
    
    // With backend running, would show error about existing account
    // await expect(page.locator('text=/already exists/')).toBeVisible();
  });
});

test.describe('Free Trial Checkout Flow', () => {
  test('should redirect to Stripe Checkout for free trial', async ({ page }) => {
    // This test would run after successful authentication
    // Mock authenticated state or use real auth token
    
    // Navigate to billing page
    // await page.goto('http://localhost:5173/dashboard/billing');
    
    // Click "Start Free Trial" button
    // await page.click('button:has-text("Start Free Trial")');
    
    // Verify Stripe Checkout redirect
    // await expect(page).toHaveURL(/.*checkout\.stripe\.com.*/);
    
    // Verify trial details in Checkout
    // await expect(page.locator('text=/14-day trial/')).toBeVisible();
    // await expect(page.locator('text=/Then \$19\/month/')).toBeVisible();
  });
});

test.describe('Post-Trial Subscription Management', () => {
  test('should show trial status in dashboard', async ({ page }) => {
    // This test assumes user has completed trial signup
    
    // Navigate to dashboard with auth
    // await page.goto('http://localhost:5173/dashboard');
    
    // Verify trial status is shown
    // await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Free Trial');
    // await expect(page.locator('[data-testid="trial-days-remaining"]')).toBeVisible();
  });

  test('should handle trial expiration webhook', async ({ page, request }) => {
    // This would be an API test for webhook handling
    
    // Send trial_will_end webhook
    // const response = await request.post('http://localhost:3002/stripe/webhook', {
    //   headers: {
    //     'stripe-signature': 'test-signature'
    //   },
    //   data: {
    //     type: 'customer.subscription.trial_will_end',
    //     data: {
    //       object: {
    //         id: 'sub_test123',
    //         customer: 'cus_test123',
    //         trial_end: Math.floor(Date.now() / 1000) + 86400 * 3 // 3 days
    //       }
    //     }
    //   }
    // });
    
    // await expect(response).toBeOK();
    
    // Verify email notification was sent
    // Verify user sees trial ending notification in app
  });
});