/**
 * Simple test script to verify Stripe pricing table functionality
 */

const { chromium } = require('playwright');

async function testStripePricingTable() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing Stripe pricing table functionality...');
    
    // Navigate to pricing page
    await page.goto('http://localhost:3001/pricing');
    console.log('✅ Successfully navigated to pricing page');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded completely');
    
    // Check if pricing plans are displayed
    const plans = ['Free Trial', 'Starter', 'Growth', 'TenantFlow Max'];
    for (const plan of plans) {
      const planElement = await page.getByText(plan).first();
      const isVisible = await planElement.isVisible();
      console.log(`${isVisible ? '✅' : '❌'} Plan "${plan}" visibility: ${isVisible}`);
    }
    
    // Check if interactive pricing table container is present
    const pricingTableContainer = page.locator('[data-testid="pricing-table-container"], .js-only');
    const containerVisible = await pricingTableContainer.first().isVisible();
    console.log(`${containerVisible ? '✅' : '❌'} Interactive pricing table container visible: ${containerVisible}`);
    
    // Check if Stripe script might be loading (check for stripe-pricing-table element)
    await page.waitForTimeout(2000); // Give time for Stripe script to load
    
    const stripeElements = await page.locator('stripe-pricing-table').count();
    console.log(`${stripeElements > 0 ? '✅' : '❌'} Stripe pricing table elements found: ${stripeElements}`);
    
    // Check if static pricing grid is showing as fallback
    const staticGrid = page.locator('.grid.md\\:grid-cols-4').filter({ hasText: 'Free Trial' });
    const staticGridVisible = await staticGrid.isVisible();
    console.log(`${staticGridVisible ? '✅' : '❌'} Static pricing grid visible: ${staticGridVisible}`);
    
    // Take a screenshot for manual verification
    await page.screenshot({ path: 'pricing-page-test.png', fullPage: true });
    console.log('📸 Screenshot saved as pricing-page-test.png');
    
    console.log('\n🎉 Stripe pricing table test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testStripePricingTable();