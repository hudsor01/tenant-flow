/**
 * Dashboard Visual & CSS Validation Test
 * Tests that CSS is correctly applied after React Spring migration
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Visual & CSS Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock dashboard data to ensure consistent visuals
    await page.route('/api/dashboard/stats', async route => {
      await route.fulfill({
        json: {
          revenue: { monthly: 15750, growth: 8.5 },
          properties: { occupancyRate: 94.2 },
          tenants: { active: 127 },
          maintenance: { pending: 5 }
        }
      });
    });

    // Mock properties data
    await page.route('/api/properties', async route => {
      await route.fulfill({
        json: [
          { id: 1, name: 'Sunset Apartments', propertyType: 'Apartment', city: 'Los Angeles', state: 'CA', address: '123 Sunset Blvd', zipCode: '90210' },
          { id: 2, name: 'Oak Tree Complex', propertyType: 'Townhouse', city: 'Austin', state: 'TX', address: '456 Oak Street', zipCode: '73301' }
        ]
      });
    });
  });

  test('Dashboard home page renders with correct styling', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for React Spring animations to settle
    await page.waitForTimeout(1000);
    
    // Check that metric cards are visible and styled
    const revenueCard = page.locator('.border-l-success').first();
    await expect(revenueCard).toBeVisible();
    
    const occupancyCard = page.locator('.border-l-info').first();
    await expect(occupancyCard).toBeVisible();
    
    // Check that CSS classes are applied correctly
    await expect(revenueCard).toHaveClass(/border-l-4/);
    await expect(revenueCard).toHaveClass(/border-l-success/);
    
    // Check that the grid layout is working
    const cardsContainer = page.locator('[class*="grid-cols-1"]');
    await expect(cardsContainer).toBeVisible();
    
    // Take a screenshot for visual comparison
    await expect(page).toHaveScreenshot('dashboard-home.png');
  });

  test('Metric cards have hover effects working', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    const firstCard = page.locator('[class*="border-l-4"]').first();
    await expect(firstCard).toBeVisible();
    
    // Test hover state (React Spring should handle this)
    await firstCard.hover();
    await page.waitForTimeout(500); // Wait for hover animation
    
    // Take screenshot of hover state
    await expect(page).toHaveScreenshot('dashboard-card-hover.png');
  });

  test('Data table renders with correct styling', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1500);
    
    // Check if table exists and has styling
    const table = page.locator('table').first();
    if (await table.isVisible()) {
      await expect(table).toHaveClass(/border-collapse/);
      
      // Check table headers
      const tableHeaders = page.locator('th');
      await expect(tableHeaders.first()).toBeVisible();
      
      // Take screenshot of table
      await expect(page.locator('[class*="dashboard-table"]')).toHaveScreenshot('dashboard-table.png');
    }
  });

  test('Dashboard layout components are styled correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Check main dashboard container
    const dashboardMain = page.locator('[class*="dashboard-main"]');
    if (await dashboardMain.count() > 0) {
      await expect(dashboardMain.first()).toBeVisible();
    }
    
    // Check sidebar if present
    const sidebar = page.locator('[data-sidebar]');
    if (await sidebar.count() > 0) {
      await expect(sidebar.first()).toBeVisible();
    }
    
    // Check overall layout
    await expect(page).toHaveScreenshot('dashboard-layout.png');
  });

  test('Animation utilities are not causing layout issues', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for any layout shift or broken elements
    await page.waitForTimeout(2000); // Let all animations complete
    
    // Ensure no elements are outside viewport due to transform issues
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeGreaterThan(0);
    expect(bodyBox?.height).toBeGreaterThan(0);
    
    // Check that metric cards are in correct positions
    const cards = page.locator('[class*="border-l-4"]');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Verify no CSS errors are causing visual issues
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CSS')) {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    expect(consoleErrors).toHaveLength(0);
  });

  test('Responsive design works correctly', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-tablet.png');
    
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.reload();
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('dashboard-desktop.png');
  });

  test('CSS custom properties are working', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);
    
    // Check that CSS custom properties are defined
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
    });
    
    const radius = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--radius-md');
    });
    
    expect(primaryColor).toBeTruthy();
    expect(radius).toBeTruthy();
    
    // Check that custom properties are applied to elements
    const card = page.locator('[class*="border-l-4"]').first();
    if (await card.isVisible()) {
      const borderRadius = await card.evaluate(el => {
        return getComputedStyle(el).borderRadius;
      });
      expect(borderRadius).toBeTruthy();
    }
  });

  test('No broken images or missing assets', async ({ page }) => {
    await page.goto('/dashboard');
    
    const failedRequests = [];
    page.on('response', response => {
      if (response.status() >= 400 && (
        response.url().includes('.png') || 
        response.url().includes('.jpg') || 
        response.url().includes('.svg') ||
        response.url().includes('.css') ||
        response.url().includes('.js')
      )) {
        failedRequests.push(response.url());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Filter out expected API failures (backend might not be running)
    const assetFailures = failedRequests.filter(url => 
      !url.includes('/api/') && !url.includes('backend')
    );
    
    expect(assetFailures).toHaveLength(0);
  });
});
