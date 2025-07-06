require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const testWithRealUser = async () => {
  console.log('=== TESTING WITH REAL USER FROM SUPABASE ===\n');
  
  try {
    // Initialize Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('✓ Supabase connected');
    
    // Get real users from the database
    console.log('\nFetching real users from database...');
    const { data: users, error } = await supabase
      .from('User')
      .select('id, email, firstName, lastName, stripeCustomerId')
      .limit(5);
    
    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    
    if (!users || users.length === 0) {
      throw new Error('No users found in database');
    }
    
    console.log(`✓ Found ${users.length} users`);
    
    // Display users and pick one for testing
    console.log('\nAvailable users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (ID: ${user.id.substring(0, 8)}..., Stripe: ${user.stripeCustomerId || 'none'})`);
    });
    
    // Use the first user for testing
    const testUser = users[0];
    console.log(`\n🎯 Using user for test: ${testUser.email}`);
    console.log(`   User ID: ${testUser.id}`);
    console.log(`   Stripe Customer: ${testUser.stripeCustomerId || 'Will be created'}`);
    
    // Now test the create-subscription API with this real user
    console.log('\n=== TESTING CREATE-SUBSCRIPTION API ===');
    
    // Import and test the API handler
    const handler = require('./api/create-subscription.js').default;
    
    // Test different scenarios
    const testCases = [
      {
        name: 'Free Trial',
        body: {
          planId: 'freeTrial',
          billingPeriod: 'monthly',
          userId: testUser.id,
          paymentMethodCollection: 'always'
        }
      },
      {
        name: 'Starter Monthly (This was failing)',
        body: {
          planId: 'starter',
          billingPeriod: 'monthly', 
          userId: testUser.id,
          paymentMethodCollection: 'always'
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n--- Testing: ${testCase.name} ---`);
      
      // Mock request and response
      const mockReq = {
        method: 'POST',
        body: testCase.body
      };
      
      let responseData = null;
      let responseStatus = 200;
      
      const mockRes = {
        setHeader: () => {},
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseData = data;
              return { status: code, data };
            },
            end: () => ({ status: code })
          };
        },
        json: (data) => {
          responseData = data;
          return { status: 200, data };
        }
      };
      
      try {
        await handler(mockReq, mockRes);
        
        console.log(`✅ Status: ${responseStatus}`);
        console.log(`Response:`, JSON.stringify(responseData, null, 2));
        
        // Check if we got the critical fields
        if (responseData && responseStatus === 200) {
          const { subscriptionId, clientSecret, status } = responseData;
          
          if (subscriptionId) {
            console.log(`✓ Subscription ID: ${subscriptionId}`);
          }
          
          if (clientSecret) {
            console.log(`✓ Client Secret: ${clientSecret.substring(0, 30)}...`);
            console.log('🎉 PAYMENT FLOW WORKING - Frontend can use this!');
          } else if (testCase.body.planId === 'freeTrial') {
            console.log('ℹ️  Free trial - no client secret expected (uses setup intent)');
          } else {
            console.log('❌ Missing client secret - this was the bug!');
          }
          
          if (status) {
            console.log(`✓ Status: ${status}`);
          }
        } else {
          console.log(`❌ API Error: ${JSON.stringify(responseData)}`);
        }
        
      } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
      }
      
      // Wait a moment between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('If the Starter Monthly test shows:');
    console.log('✓ subscriptionId - Subscription was created');  
    console.log('✓ clientSecret - Payment form can be displayed');
    console.log('✓ status - Frontend knows what to do next');
    console.log('\nThen the payment flow is FIXED! 🚀');
    
  } catch (error) {
    console.error('❌ Test with real user failed:', error.message);
    console.error('Full error:', error);
  }
};

testWithRealUser();