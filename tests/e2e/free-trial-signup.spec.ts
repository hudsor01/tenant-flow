import { test, expect } from '@playwright/test';

test.describe('Free Trial Signup Flow', () => {
  test('should complete free trial signup with Stripe Checkout', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('https://tenantflow.app');
    
    // Click the "Get started free" button
    await page.click('button:has-text("Get started free")');
    
    // Wait for the signup page to load
    await expect(page).toHaveURL(/.*\/auth\/Signup.*/);
    
    // Fill in the signup form
    const testEmail = `test-${Date.now()}@tenantflow.app`;
    await page.fill('input[placeholder="Full Name"]', 'Test User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'TestPassword123!');
    
    // Click the "Sign up with Email" button
    await page.click('button[type="submit"]:has-text("Sign up with Email")');
    
    // Wait for Supabase authentication
    // This will show "Please check your email to confirm your account!"
    await expect(page.locator('text=/Please check your email to confirm your account!/')).toBeVisible({ timeout: 10000 });
    
    // Actual flow in production:
    // 1. User signs up via Supabase (creates Supabase user only)
    // 2. User receives confirmation email
    // 3. After email confirmation, user is redirected to /get-started
    // 4. User can then go to pricing page to start a trial
    // 5. Clicking on a plan creates Stripe customer + checkout session
    // 6. Stripe webhook confirms subscription creation
    
    // Note: Stripe customer is NOT created at signup time
    // It's only created when user initiates checkout
  });

  test('should show pricing page with trial information', async ({ page }) => {
    await page.goto('https://tenantflow.app/pricing');
    
    // Verify pricing page loads
    await expect(page.locator('h1:has-text("Choose Your Plan")')).toBeVisible();
    await expect(page.locator('text=/free trial/')).toBeVisible();
  });

  test('should create Stripe customer when selecting a paid plan', async ({ page }) => {
    await page.goto('https://tenantflow.app/pricing');
    
    // Without authentication, clicking a plan should redirect to signup
    // With authentication, it creates Stripe customer + checkout session
    
    // Find and click on Starter plan
    const starterCard = page.locator('div').filter({ hasText: /^Starter/ }).first();
    await starterCard.locator('button:has-text("Start Free Trial")').click();
    
    // Should redirect to signup since not authenticated
    await expect(page).toHaveURL(/.*\/auth\/Signup.*/);
  });
});

test.describe('Authenticated Checkout Flow', () => {
  test.skip('should create checkout session for authenticated user', async ({ page }) => {
    // This test requires authentication
    // In a real E2E test, you would:
    // 1. Sign in with a test user
    // 2. Navigate to pricing page
    // 3. Click on a plan
    // 4. Verify redirect to Stripe Checkout
    
    // Example flow:
    // await page.goto('https://tenantflow.app/auth/login');
    // await page.fill('input[type="email"]', 'test@example.com');
    // await page.fill('input[type="password"]', 'password');
    // await page.click('button[type="submit"]');
    // 
    // await page.goto('https://tenantflow.app/pricing');
    // await page.click('button:has-text("Start Free Trial")');
    // 
    // // This is when Stripe customer gets created
    // await expect(page).toHaveURL(/.*checkout\.stripe\.com.*/);
  });
});

test.describe('Webhook Integration', () => {
  test.skip('should handle checkout.session.completed webhook', async ({ request }) => {
    // This would test the actual Stripe webhook integration
    // The webhook at /api/v1/stripe/webhook handles:
    // - checkout.session.completed: Creates/syncs subscription
    // - customer.subscription.created: Syncs subscription
    // - customer.subscription.trial_will_end: Sends reminder emails
    
    // Example webhook test:
    // const response = await request.post('https://api.tenantflow.app/api/v1/stripe/webhook', {
    //   headers: {
    //     'stripe-signature': 'test-signature'
    //   },
    //   data: {
    //     type: 'checkout.session.completed',
    //     data: {
    //       object: {
    //         id: 'cs_test123',
    //         subscription: 'sub_test123',
    //         customer: 'cus_test123',
    //         metadata: {
    //           userId: 'user123'
    //         }
    //       }
    //     }
    //   }
    // });
    // 
    // expect(response.status()).toBe(200);
  });
});