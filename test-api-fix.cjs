require('dotenv').config();

// Import the actual API handler
const handler = require('./api/create-subscription.js').default;

const testAPIFix = async () => {
  console.log('=== TESTING FIXED API ENDPOINT ===\n');
  
  // Mock request and response objects
  const mockReq = {
    method: 'POST',
    body: {
      planId: 'starter',
      billingPeriod: 'monthly',
      userId: 'test-user-fix-123',
      paymentMethodCollection: 'always'
    }
  };
  
  const mockRes = {
    setHeader: () => {},
    status: (code) => ({
      json: (data) => {
        console.log(`Response Status: ${code}`);
        console.log('Response Data:', JSON.stringify(data, null, 2));
        return { status: code, data };
      },
      end: () => ({ status: code })
    }),
    json: (data) => {
      console.log('Response Status: 200');
      console.log('Response Data:', JSON.stringify(data, null, 2));
      return { status: 200, data };
    }
  };
  
  try {
    console.log('Calling create-subscription API with test payload...');
    console.log('Request:', JSON.stringify(mockReq.body, null, 2));
    
    const result = await handler(mockReq, mockRes);
    
    console.log('\n✅ API call completed successfully!');
    
    // Check if we got the expected response structure
    if (result && result.data) {
      const { subscriptionId, clientSecret, status } = result.data;
      
      if (subscriptionId && clientSecret && status) {
        console.log('\n🎉 PAYMENT FLOW FIXED!');
        console.log('✓ Subscription ID present');
        console.log('✓ Client Secret present (frontend can use this)');
        console.log('✓ Status present');
        
        console.log('\n📝 Next Steps:');
        console.log('1. Deploy this fix to production');
        console.log('2. Test with real customers');
        console.log('3. Monitor Stripe Dashboard for successful payments');
        
      } else {
        console.log('\n⚠️ Response missing required fields');
      }
    }
    
  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
    
    if (error.message.includes('Failed to create payment intent')) {
      console.log('\n🔍 This was the original issue - payment intent not created');
      console.log('The fix should resolve this by finalizing the invoice');
    }
  }
};

testAPIFix();