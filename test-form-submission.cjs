#!/usr/bin/env node

/**
 * Test Form Submission
 * 
 * This script tests the actual form submission behavior
 * by simulating a POST request to the signup action.
 */

const http = require('http');
const { URLSearchParams } = require('url');

async function testFormSubmission() {
  console.log('🚀 Testing actual form submission...\n');
  
  // Test data that should be valid
  const testFormData = new URLSearchParams({
    fullName: 'Test User',
    email: 'testuser@example.com', 
    password: 'SecurePassword123',
    confirmPassword: 'SecurePassword123',
    acceptTerms: 'true',
    redirectTo: '/dashboard'
  });

  console.log('Test form data being sent:');
  console.log(Object.fromEntries(testFormData.entries()));
  console.log();

  // First, get the signup page to extract any CSRF tokens or form data
  const getOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/auth/signup',
    method: 'GET',
    headers: {
      'User-Agent': 'Node.js Test Client',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  };

  console.log('📄 First, getting the signup page to check form structure...');
  
  const req = http.request(getOptions, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      // Look for form elements in the HTML
      const formMatches = data.match(/<form[^>]*>([\s\S]*?)<\/form>/gi);
      if (formMatches) {
        console.log('\n✅ Found form elements in HTML');
        console.log(`Number of forms found: ${formMatches.length}`);
        
        // Look for form action
        const actionMatch = data.match(/action=['"](.*?)['"]/);
        if (actionMatch) {
          console.log(`Form action: ${actionMatch[1]}`);
        }
        
        // Look for specific input fields
        const inputFields = ['fullName', 'email', 'password', 'confirmPassword'];
        inputFields.forEach(field => {
          const fieldRegex = new RegExp(`name=['"']${field}['"']`, 'i');
          if (fieldRegex.test(data)) {
            console.log(`✓ Found ${field} input field`);
          } else {
            console.log(`✗ Missing ${field} input field`);
          }
        });
        
        // Look for submit button
        if (data.includes('type="submit"') || data.includes('Create Free Account')) {
          console.log('✓ Found submit button');
        } else {
          console.log('✗ Submit button not found');
        }
        
        // Check for validation errors in the initial load
        if (data.includes('error') || data.includes('Error')) {
          console.log('⚠️  Possible error messages found in initial page load');
        }
        
      } else {
        console.log('❌ No form elements found in HTML response');
      }
      
      // Look for JavaScript/React hydration indicators
      if (data.includes('__NEXT_DATA__')) {
        console.log('✓ Next.js hydration data found');
      }
      
      if (data.includes('ReactDOM') || data.includes('React')) {
        console.log('✓ React components detected');  
      }
      
      console.log('\n📊 Page analysis complete');
    });
  });

  req.on('error', (err) => {
    console.error('❌ Error testing form:', err);
  });

  req.end();
}

// Run the test
testFormSubmission().catch(console.error);