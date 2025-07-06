require('dotenv').config();

// Import the create-subscription handler
const testAPIEndpoint = async () => {
  console.log('=== Testing create-subscription API Endpoint ===\n');
  
  try {
    // Simulate different request scenarios
    const testCases = [
      {
        name: 'Free Trial Request',
        body: {
          planId: 'freeTrial',
          billingPeriod: 'monthly',
          userId: 'test-user-free-trial',
          paymentMethodCollection: 'always'
        }
      },
      {
        name: 'Starter Monthly Request',
        body: {
          planId: 'starter',
          billingPeriod: 'monthly',
          userId: 'test-user-starter',
          paymentMethodCollection: 'always'
        }
      },
      {
        name: 'Growth Annual Request',
        body: {
          planId: 'growth',
          billingPeriod: 'annual',
          userId: 'test-user-growth',
          paymentMethodCollection: 'always'
        }
      }
    ];
    
    // Check if the API file exists and can be loaded
    console.log('Checking API endpoint file...');
    const fs = require('fs');
    const path = require('path');
    
    const apiPath = path.join(__dirname, 'api', 'create-subscription.js');
    if (fs.existsSync(apiPath)) {
      console.log('✓ API endpoint file exists');
      
      // Read the file content to check for any obvious issues
      const content = fs.readFileSync(apiPath, 'utf8');
      
      // Check for common issues
      const checks = [
        { name: 'Environment variable usage', regex: /process\.env\.STRIPE_SECRET_KEY/, found: false },
        { name: 'Price ID mapping', regex: /PRICE_IDS/, found: false },
        { name: 'Setup Intent creation', regex: /setupIntents\.create/, found: false },
        { name: 'Subscription creation', regex: /subscriptions\.create/, found: false },
        { name: 'Error handling', regex: /try\s*\{[\s\S]*\}\s*catch/, found: false },
        { name: 'CORS headers', regex: /Access-Control-Allow-Origin/, found: false }
      ];
      
      checks.forEach(check => {
        check.found = check.regex.test(content);
        console.log(`${check.found ? '✓' : '✗'} ${check.name}`);
      });
      
      // Check for specific implementation patterns from best practices
      console.log('\nChecking implementation patterns...');
      
      const patterns = [
        { name: 'Trial period configuration', regex: /trial_period_days:\s*14/, found: false },
        { name: 'Payment method collection', regex: /paymentMethodCollection/, found: false },
        { name: 'Setup intent for trials', regex: /setupIntent.*customer/, found: false },
        { name: 'Payment settings configuration', regex: /payment_settings/, found: false },
        { name: 'Expand payment intent', regex: /expand.*payment_intent/, found: false }
      ];
      
      patterns.forEach(pattern => {
        pattern.found = pattern.regex.test(content);
        console.log(`${pattern.found ? '✓' : '⚠'} ${pattern.name}`);
      });
      
    } else {
      console.log('✗ API endpoint file not found');
    }
    
    // Test payload validation logic
    console.log('\n=== Testing Payload Validation ===');
    
    testCases.forEach(testCase => {
      console.log(`\nTesting: ${testCase.name}`);
      
      // Check required fields
      const required = ['planId', 'userId'];
      const missing = required.filter(field => !testCase.body[field]);
      
      if (missing.length > 0) {
        console.log(`✗ Missing required fields: ${missing.join(', ')}`);
      } else {
        console.log('✓ All required fields present');
      }
      
      // Check valid values
      const validPlans = ['freeTrial', 'starter', 'growth', 'enterprise'];
      const validPeriods = ['monthly', 'annual'];
      
      if (!validPlans.includes(testCase.body.planId)) {
        console.log(`✗ Invalid plan ID: ${testCase.body.planId}`);
      } else {
        console.log(`✓ Valid plan ID: ${testCase.body.planId}`);
      }
      
      if (!validPeriods.includes(testCase.body.billingPeriod)) {
        console.log(`✗ Invalid billing period: ${testCase.body.billingPeriod}`);
      } else {
        console.log(`✓ Valid billing period: ${testCase.body.billingPeriod}`);
      }
      
      console.log(`Payload: ${JSON.stringify(testCase.body)}`);
    });
    
    console.log('\n=== API Endpoint Analysis Complete ===');
    
  } catch (error) {
    console.error('✗ API endpoint test failed:', error.message);
  }
};

testAPIEndpoint();