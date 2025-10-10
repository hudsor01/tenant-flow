
import { test, expect } from '@playwright/test';

test.describe('Stripe Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForSelector('[data-testid="pricing-section"]', { timeout: 10000 });
  });

  test('should allow a user to purchase a subscription', async ({ page }) => {
    // 1. Select a pricing plan
    await page.locator('[data-testid="pricing-cta"]').first().click();

    // 2. Wait for the Stripe checkout page to load
    await page.waitForURL('**/checkout.stripe.com/**', { timeout: 15000 });

    // 3. Fill out the Stripe checkout form
    // IMPORTANT: These are dummy values and should be replaced with your own
    // test data. You can use environment variables to store this data securely.
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.locator('input[name="cardnumber"]').fill('4242 4242 4242 4242');
    await page.locator('input[name="exp-date"]').fill('12/25');
    await page.locator('input[name="cvc"]').fill('123');
    await page.locator('input[name="billingName"]').fill('Test User');

    // 4. Submit the form
    await page.locator('button[type="submit"]').click();

    // 5. Verify the payment was successful
    // This will depend on your app's success page
    await page.waitForURL('**/payment-success', { timeout: 15000 });
    await expect(page.locator('h1')).toHaveText('Payment Successful!');
  });
});
