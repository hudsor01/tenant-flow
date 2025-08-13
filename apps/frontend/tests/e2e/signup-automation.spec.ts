import { test, expect } from '@playwright/test';

// Generate a random number for email variation
const getRandomEmailVariation = () => {
  const variations = [
    Math.floor(Math.random() * 1000), // Random 0-999
    Date.now() % 10000, // Last 4 digits of timestamp
    Math.floor(Math.random() * 90) + 10, // Random 10-99
  ];
  return variations[Math.floor(Math.random() * variations.length)];
};

test.describe('Automated Signup Testing', () => {
  test('Fill out signup form with random email variation', async ({ page }) => {
    // Generate unique email variation
    const emailVariation = getRandomEmailVariation();
    const email = `rhudsontspr+${emailVariation}@gmail.com`;
    const password = 'TestPassword123!';
    
    console.log(`\n🚀 Testing signup with email: ${email}\n`);
    
    // Navigate to signup page
    await page.goto('/auth/signup');
    
    // Wait for the form to be ready
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill out the form
    console.log('📝 Filling out signup form...');
    
    // Full Name (now supports numbers in names like "John Smith III" or "Mary Jane 2nd")
    await page.fill('input[name="fullName"]', `Test User ${emailVariation}`);
    
    // Email
    await page.fill('input[name="email"]', email);
    
    // Password
    await page.fill('input[name="password"]', password);
    
    // Confirm Password
    await page.fill('input[name="confirmPassword"]', password);
    
    // Company Name (optional - may not exist on form)
    const companyField = page.locator('input[name="companyName"]');
    if (await companyField.count() > 0) {
      await companyField.fill(`Test Company ${emailVariation}`);
    }
    
    // Check the terms checkbox
    const termsCheckbox = page.locator('input[name="terms"]');
    await termsCheckbox.check();
    
    // Verify checkbox is checked
    await expect(termsCheckbox).toBeChecked();
    
    // Take screenshot before submission
    await page.screenshot({ 
      path: `tests/screenshots/signup-form-${emailVariation}.png`,
      fullPage: true 
    });
    
    console.log('✅ Form filled successfully');
    console.log('📸 Screenshot saved as signup-form-' + emailVariation + '.png');
    
    // Submit the form
    console.log('🔄 Submitting signup form...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or success message
    await page.waitForURL(/\/(auth\/verify-email|dashboard)/, { 
      timeout: 15000,
      waitUntil: 'networkidle' 
    });
    
    const currentUrl = page.url();
    console.log('📍 Redirected to:', currentUrl);
    
    // Check if we're on the verification page
    if (currentUrl.includes('verify-email')) {
      console.log('✅ Successfully redirected to email verification page');
      
      // Verify the email is shown on the page
      const emailDisplay = await page.textContent('text=' + email);
      if (emailDisplay) {
        console.log('✅ Email displayed on verification page');
      }
      
      // Take screenshot of verification page
      await page.screenshot({ 
        path: `tests/screenshots/verify-email-${emailVariation}.png`,
        fullPage: true 
      });
      console.log('📸 Verification page screenshot saved');
    } else if (currentUrl.includes('dashboard')) {
      console.log('✅ Successfully redirected to dashboard (auto-verified)');
      
      // Take screenshot of dashboard
      await page.screenshot({ 
        path: `tests/screenshots/dashboard-${emailVariation}.png`,
        fullPage: true 
      });
      console.log('📸 Dashboard screenshot saved');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SIGNUP TEST COMPLETED SUCCESSFULLY');
    console.log('📧 Email used:', email);
    console.log('🔑 Password used:', password);
    console.log('📍 Final URL:', currentUrl);
    console.log('='.repeat(60) + '\n');
  });

  test('Batch test multiple signups', async ({ page }) => {
    const numberOfTests = 3;
    const results = [];
    
    console.log(`\n🚀 Running ${numberOfTests} signup tests...\n`);
    
    for (let i = 0; i < numberOfTests; i++) {
      const emailVariation = getRandomEmailVariation() + i * 1000; // Ensure uniqueness
      const email = `rhudsontspr+${emailVariation}@gmail.com`;
      const password = 'TestPassword123!';
      
      console.log(`\n--- Test ${i + 1}/${numberOfTests} ---`);
      console.log(`📧 Email: ${email}`);
      
      try {
        // Navigate to signup page
        await page.goto('/auth/signup');
        await page.waitForSelector('form', { timeout: 10000 });
        
        // Fill form (name validation now supports multi-part names with numbers)
        await page.fill('input[name="fullName"]', `Test User ${emailVariation}`);
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', password);
        await page.fill('input[name="confirmPassword"]', password);
        
        // Company name (optional field)
        const companyField = page.locator('input[name="companyName"]');
        if (await companyField.count() > 0) {
          await companyField.fill(`Test Company ${emailVariation}`);
        }
        
        // Check terms
        await page.locator('input[name="terms"]').check();
        
        // Submit
        await page.click('button[type="submit"]');
        
        // Wait for redirect
        await page.waitForURL(/\/(auth\/verify-email|dashboard)/, { 
          timeout: 15000,
          waitUntil: 'networkidle' 
        });
        
        const finalUrl = page.url();
        results.push({
          email,
          success: true,
          finalUrl,
          verificationRequired: finalUrl.includes('verify-email')
        });
        
        console.log(`✅ Success - ${finalUrl.includes('verify-email') ? 'Email verification required' : 'Auto-verified'}`);
        
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error.message
        });
        console.log(`❌ Failed: ${error.message}`);
      }
      
      // Small delay between tests
      if (i < numberOfTests - 1) {
        await page.waitForTimeout(2000);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BATCH TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tests: ${numberOfTests}`);
    console.log(`Successful: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    console.log('\nEmails created:');
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.email} - ${r.success ? '✅' : '❌'}`);
    });
    console.log('='.repeat(60) + '\n');
  });
});

// Helper test to quickly fill the form and stop before submission
test('Fill signup form without submitting (for manual testing)', async ({ page }) => {
  const emailVariation = getRandomEmailVariation();
  const email = `rhudsontspr+${emailVariation}@gmail.com`;
  const password = 'TestPassword123!';
  
  console.log(`\n📝 Pre-filling form with email: ${email}`);
  console.log('⏸️  Form will be filled but NOT submitted\n');
  
  await page.goto('/auth/signup');
  await page.waitForSelector('form', { timeout: 10000 });
  
  // Fill all fields
  await page.fill('input[name="fullName"]', `Test User ${emailVariation}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', password);
  
  // Company name (optional)
  const companyField = page.locator('input[name="companyName"]');
  if (await companyField.count() > 0) {
    await companyField.fill(`Test Company ${emailVariation}`);
  }
  
  await page.locator('input[name="terms"]').check();
  
  console.log('✅ Form filled and ready');
  console.log('📧 Email:', email);
  console.log('🔑 Password:', password);
  console.log('\n⚠️  Form NOT submitted - ready for manual submission\n');
  
  // Keep browser open for manual interaction
  await page.waitForTimeout(60000); // Wait 60 seconds
});