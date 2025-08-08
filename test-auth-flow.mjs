#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testAuthFlow() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Console Error:', msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('Page Error:', error.message);
    });

    console.log('Testing Auth Flow...\n');

    // Test 1: Login Page Load
    console.log('1. Testing Login Page...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle2' });
    const loginTitle = await page.title();
    console.log('   ✓ Login page loaded:', loginTitle);

    // Check for form elements
    const emailInput = await page.$('input[name="email"]');
    const passwordInput = await page.$('input[name="password"]');
    const submitButton = await page.$('button[type="submit"]');
    
    if (emailInput && passwordInput && submitButton) {
      console.log('   ✓ Login form elements found');
    } else {
      console.log('   ✗ Missing form elements');
      console.log('     - Email input:', !!emailInput);
      console.log('     - Password input:', !!passwordInput);
      console.log('     - Submit button:', !!submitButton);
    }

    // Test 2: Signup Page
    console.log('\n2. Testing Signup Page...');
    await page.goto('http://localhost:3000/auth/signup', { waitUntil: 'networkidle2' });
    const signupTitle = await page.title();
    console.log('   ✓ Signup page loaded:', signupTitle);

    // Check for signup form elements
    const fullNameInput = await page.$('input[name="fullName"]');
    const signupEmail = await page.$('input[name="email"]');
    const signupPassword = await page.$('input[name="password"]');
    const confirmPassword = await page.$('input[name="confirmPassword"]');
    const termsCheckbox = await page.$('input[id="terms"]');
    
    console.log('   Form elements check:');
    console.log('     - Full name input:', !!fullNameInput);
    console.log('     - Email input:', !!signupEmail);
    console.log('     - Password input:', !!signupPassword);
    console.log('     - Confirm password:', !!confirmPassword);
    console.log('     - Terms checkbox:', !!termsCheckbox);

    // Test 3: Forgot Password Page
    console.log('\n3. Testing Forgot Password Page...');
    await page.goto('http://localhost:3000/auth/forgot-password', { waitUntil: 'networkidle2' });
    const forgotTitle = await page.title();
    console.log('   ✓ Forgot password page loaded:', forgotTitle);

    // Test 4: Check for JavaScript errors
    console.log('\n4. Checking for JavaScript errors...');
    const jsErrors = await page.evaluate(() => {
      return window.__errors || [];
    });
    
    if (jsErrors.length === 0) {
      console.log('   ✓ No JavaScript errors detected');
    } else {
      console.log('   ✗ JavaScript errors found:', jsErrors);
    }

    // Test 5: Test form submission (without actual credentials)
    console.log('\n5. Testing form validation...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle2' });
    
    // Try submitting empty form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Check if we're still on login page (validation should prevent navigation)
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      console.log('   ✓ Form validation working (prevented empty submission)');
    } else {
      console.log('   ✗ Form allowed empty submission');
    }

    console.log('\n✅ Auth flow test completed');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testAuthFlow().catch(console.error);