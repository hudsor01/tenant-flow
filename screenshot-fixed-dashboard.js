import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3004/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000); // Wait for charts to load
    await page.screenshot({ 
      path: 'dashboard-fixed.png', 
      fullPage: true 
    });
    console.log('Fixed dashboard screenshot saved as dashboard-fixed.png');
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();