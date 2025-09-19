/**
 * Simple Dashboard Validation Test
 * Tests that all major dashboard pages load without critical errors
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Pages - Basic Loading', () => {
  test('Dashboard home page loads', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for main content h1 element
    await expect(page.locator('main h1')).toBeVisible();
    
    // Check for no critical JavaScript errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // Wait a bit for any errors to surface
    await page.waitForTimeout(2000);
    
    // Filter out non-critical errors (network errors from missing backend are OK)
    const criticalErrors = logs.filter(log => 
      !log.includes('Failed to load resource') &&
      !log.includes('500 (Internal Server Error)') &&
      !log.includes('NetworkError')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('Properties page loads', async ({ page }) => {
    await page.goto('/dashboard/properties');
    await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Property List' })).toBeVisible();
  });

  test('Tenants page loads', async ({ page }) => {
    await page.goto('/dashboard/tenants');
    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tenant List' })).toBeVisible();
  });

  test('Units page loads', async ({ page }) => {
    await page.goto('/dashboard/units');
    await expect(page.getByRole('heading', { name: 'Units' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Unit List' })).toBeVisible();
  });

  test('Maintenance page loads', async ({ page }) => {
    await page.goto('/dashboard/maintenance');
    await expect(page.getByRole('heading', { name: 'Maintenance Requests' })).toBeVisible();
  });
});
