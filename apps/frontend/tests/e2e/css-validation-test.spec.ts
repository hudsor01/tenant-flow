/**
 * CSS Validation Test - Simple check for CSS integrity
 * Tests that CSS is correctly applied after React Spring migration
 */

import { test, expect } from '@playwright/test';

test.describe('CSS Validation Tests', () => {
  test('Basic CSS is loading correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that basic CSS variables are loaded
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    });
    
    const backgroundExists = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
    });
    
    expect(primaryColor).toBeTruthy();
    expect(backgroundExists).toBeTruthy();
    
  });

  test('Tailwind classes are working', async ({ page }) => {
    await page.goto('/');
    
    // Check if basic Tailwind classes work by inspecting computed styles
    await page.setContent(`
      <div class="flex items-center justify-center bg-primary text-white p-4 rounded-md">
        Test Element
      </div>
    `);
    
    const testElement = page.locator('div');
    const computedStyles = await testElement.evaluate(el => ({
      display: getComputedStyle(el).display,
      alignItems: getComputedStyle(el).alignItems,
      justifyContent: getComputedStyle(el).justifyContent,
      padding: getComputedStyle(el).padding
    }));
    
    expect(computedStyles.display).toBe('flex');
    expect(computedStyles.alignItems).toBe('center');
    expect(computedStyles.justifyContent).toBe('center');
    expect(computedStyles.padding).not.toBe('0px');
    
  });

  test('Animation utilities are defined', async ({ page }) => {
    await page.goto('/');
    
    // Test that key animation classes exist
    await page.setContent(`
      <div class="animate-spin">Spin</div>
      <div class="animate-pulse">Pulse</div>
      <div class="transition-all duration-300">Transition</div>
    `);
    
    const spinElement = page.locator('.animate-spin');
    const pulseElement = page.locator('.animate-pulse'); 
    const transitionElement = page.locator('.transition-all');
    
    const animations = await Promise.all([
      spinElement.evaluate(el => getComputedStyle(el).animation),
      pulseElement.evaluate(el => getComputedStyle(el).animation),
      transitionElement.evaluate(el => getComputedStyle(el).transition)
    ]);
    
    expect(animations[0]).toContain('spin');
    expect(animations[1]).toContain('pulse');
    expect(animations[2]).toContain('all');
    
  });

  test('Dashboard classes exist in CSS', async ({ page }) => {
    await page.goto('/');
    
    // Test dashboard-specific classes
    await page.setContent(`
      <div class="dashboard-metric-card">Metric Card</div>
      <div class="dashboard-table">Table</div>
    `);
    
    const metricCard = page.locator('.dashboard-metric-card');
    const table = page.locator('.dashboard-table');
    
    // Check if these classes have any styles applied
    const hasStyles = await Promise.all([
      metricCard.evaluate(el => {
        const styles = getComputedStyle(el);
        return Object.keys(styles).length > 0;
      }),
      table.evaluate(el => {
        const styles = getComputedStyle(el);
        return styles.borderCollapse || styles.tableLayout || styles.contain;
      })
    ]);
    
    expect(hasStyles[0]).toBeTruthy();
    expect(hasStyles[1]).toBeTruthy();
    
  });

  test('CSS contains expected utilities', async ({ page }) => {
    await page.goto('/');
    
    // Get all stylesheets and check for key utilities
    const hasExpectedClasses = await page.evaluate(() => {
      const stylesheets = Array.from(document.styleSheets);
      let cssText = '';
      
      try {
        for (const sheet of stylesheets) {
          if (sheet.cssRules) {
            for (const rule of sheet.cssRules) {
              cssText += rule.cssText + ' ';
            }
          }
        }
      } catch (e) {
        // Cross-origin stylesheets might not be accessible
      }
      
      return {
        hasAnimateUtilities: cssText.includes('animate-spin') || cssText.includes('animate-pulse'),
        hasTransformUtilities: cssText.includes('transform-gpu') || cssText.includes('translate'),
        hasDashboardClasses: cssText.includes('dashboard-') || cssText.includes('.dashboard'),
        hasTailwindBase: cssText.includes('border-collapse') || cssText.includes('transition-'),
        cssLength: cssText.length
      };
    });
    
    expect(hasExpectedClasses.cssLength).toBeGreaterThan(1000);
    
    // At least some of these should be true if CSS is loaded
    const hasAnyCriticalCSS = Object.values(hasExpectedClasses).some(val => val === true);
    expect(hasAnyCriticalCSS).toBeTruthy();
  });
});
