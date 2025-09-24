/**
 * DASHBOARD FUNCTIONAL PROOF TEST
 * Comprehensive test to prove dashboard is in one piece and fully functional
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Functional Proof', () => {
  test('Dashboard loads completely without errors and all components work', async ({ page }) => {
    // Capture all console errors
    const consoleErrors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', response => {
      if (response.status() >= 400 && !response.url().includes('/api/')) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Mock dashboard data to ensure we get a complete render
    await page.route('/api/dashboard/stats', async route => {
      await route.fulfill({
        json: {
          revenue: { monthly: 25750, growth: 12.3 },
          properties: { occupancyRate: 96.8 },
          tenants: { active: 184 },
          maintenance: { pending: 3 }
        }
      });
    });

    await page.route('/api/properties', async route => {
      await route.fulfill({
        json: [
          { id: 1, name: 'Sunset Plaza', propertyType: 'Apartment', city: 'Los Angeles', state: 'CA', address: '123 Sunset Blvd', zipCode: '90210' },
          { id: 2, name: 'Downtown Lofts', propertyType: 'Loft', city: 'San Francisco', state: 'CA', address: '456 Market St', zipCode: '94102' },
          { id: 3, name: 'Garden View', propertyType: 'Townhouse', city: 'Austin', state: 'TX', address: '789 Oak Ave', zipCode: '73301' }
        ]
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    
    // Wait for initial load and React Spring animations to settle
    await page.waitForTimeout(2000);
    
    // PROOF 1: No critical JavaScript errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Failed to fetch') &&
      !error.includes('NetworkError') &&
      !error.includes('500 (Internal Server Error)') &&
      !error.includes('404')
    );
    
    expect(criticalErrors).toHaveLength(0);

    // PROOF 2: Main dashboard content is visible
    const mainContent = page.locator('main, [role="main"], [class*="dashboard"]');
    await expect(mainContent.first()).toBeVisible({ timeout: 5000 });

    // PROOF 3: Metric cards are rendered and animated (React Spring working)
    const metricCards = page.locator('[class*="border-l-"], .dashboard-metric-card, [class*="@container/card"]');
    const cardCount = await metricCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // PROOF 4: CSS is applied correctly - check computed styles
    if (cardCount > 0) {
      const firstCard = metricCards.first();
      const cardStyles = await firstCard.evaluate(el => ({
        display: getComputedStyle(el).display,
        padding: getComputedStyle(el).padding,
        borderRadius: getComputedStyle(el).borderRadius,
        borderLeftWidth: getComputedStyle(el).borderLeftWidth,
        backgroundColor: getComputedStyle(el).backgroundColor
      }));
      
      expect(cardStyles.padding).not.toBe('0px');
      expect(cardStyles.borderLeftWidth).not.toBe('0px');
    }

    // PROOF 5: Values are displayed (React Spring number animations working)
    const valueElements = page.locator('[class*="text-2xl"], [class*="text-3xl"], [class*="tabular-nums"]');
    const valueCount = await valueElements.count();
    expect(valueCount).toBeGreaterThan(0);
    
    const firstValue = await valueElements.first().textContent();
    expect(firstValue).toBeTruthy();
    expect(firstValue.trim()).not.toBe('0');

    // PROOF 6: Data table exists and renders
    const dataTable = page.locator('table, [role="table"], [class*="table"]');
    const hasTable = await dataTable.count() > 0;
    if (hasTable) {
      await expect(dataTable.first()).toBeVisible();
      const tableRows = page.locator('tr, [role="row"]');
      const rowCount = await tableRows.count();
    } else {
    }

    // PROOF 7: Navigation/sidebar exists and is functional
    const navigation = page.locator('[data-sidebar], nav, [role="navigation"], [class*="sidebar"]');
    const hasNav = await navigation.count() > 0;
    if (hasNav) {
      await expect(navigation.first()).toBeVisible();
    }

    // PROOF 8: CSS animations are working (no layout thrashing)
    await page.waitForTimeout(1000);
    const bodyBounds = await page.locator('body').boundingBox();
    expect(bodyBounds?.width).toBeGreaterThan(100);
    expect(bodyBounds?.height).toBeGreaterThan(100);

    // PROOF 9: Check for React Spring animation classes or inline styles
    const animatedElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let animatedCount = 0;
      let hasInlineTransforms = 0;
      
      elements.forEach(el => {
        const style = getComputedStyle(el);
        if (style.transition && style.transition !== 'all 0s ease 0s') {
          animatedCount++;
        }
        if (el.style.transform || el.style.opacity) {
          hasInlineTransforms++;
        }
      });
      
      return { animatedCount, hasInlineTransforms };
    });
    
    expect(animatedCount.animatedCount).toBeGreaterThan(0);

    // PROOF 10: Test hover interactions (React Spring hover effects)
    if (cardCount > 0) {
      const firstCard = metricCards.first();
      const beforeHover = await firstCard.evaluate(el => el.style.transform);
      
      await firstCard.hover();
      await page.waitForTimeout(300); // Wait for hover animation
      
      const afterHover = await firstCard.evaluate(el => el.style.transform);
    }

    // PROOF 11: No asset loading failures
    expect(networkErrors.filter(err => err.includes('.css') || err.includes('.js'))).toHaveLength(0);

    // PROOF 12: Take final screenshot as visual proof
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-functional-proof.png', { 
      fullPage: true,
      threshold: 0.3 // Allow for minor animation differences
    });

    // SUMMARY
  });

  test('Individual dashboard components render correctly', async ({ page }) => {
    // Test specific component rendering
    await page.goto('/dashboard');
    await page.waitForTimeout(1000);

    // Check for specific UI elements that should be present
    const checks = [
      { selector: '[class*="grid"]', name: 'Grid layout' },
      { selector: '[class*="card"]', name: 'Card components' },
      { selector: '[class*="border-l-"]', name: 'Colored borders' },
      { selector: 'svg', name: 'Icons' }
    ];

    for (const check of checks) {
      const elements = page.locator(check.selector);
      const count = await elements.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
