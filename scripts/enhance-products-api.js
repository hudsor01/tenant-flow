#!/usr/bin/env node
/**
 * Enhance TenantFlow Stripe Products with Marketing Features via API
 * Run this to add professional marketing features to your products
 */

// Use Node.js built-in modules for the API calls
import https from 'https';

// Your Stripe Secret Key - make sure this is set
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable not set');
  process.exit(1);
}

// Enhanced product configurations
const PRODUCT_ENHANCEMENTS = {
  tenantflow_free_trial: {
    marketing_features: [
      { name: '1 property maximum' },
      { name: 'Up to 5 units' },
      { name: 'Basic tenant management' },
      { name: 'Essential maintenance tracking' },
      { name: 'Email support' },
      { name: '14-day free trial' },
      { name: 'Mobile app access' }
    ]
  },
  tenantflow_starter: {
    marketing_features: [
      { name: 'Up to 5 properties' },
      { name: 'Up to 25 units' },
      { name: 'Full maintenance tracking' },
      { name: 'Tenant portal access' },
      { name: 'Lease management' },
      { name: 'Financial reporting' },
      { name: '10GB document storage' },
      { name: 'Priority email support' },
      { name: 'Mobile app access' }
    ]
  },
  tenantflow_growth: {
    marketing_features: [
      { name: 'Up to 20 properties' },
      { name: 'Up to 100 units' },
      { name: 'Advanced analytics' },
      { name: 'Automated rent collection' },
      { name: 'Vendor network access' },
      { name: 'Custom templates' },
      { name: '50GB storage' },
      { name: 'Phone & email support' },
      { name: 'API access' },
      { name: 'Team collaboration (3 users)' },
      { name: 'Bulk operations' }
    ]
  },
  tenantflow_max: {
    marketing_features: [
      { name: 'Unlimited properties' },
      { name: 'Unlimited units' },
      { name: 'White-label portal' },
      { name: 'Full automation suite' },
      { name: 'Custom integrations' },
      { name: 'Dedicated account manager' },
      { name: 'Unlimited storage' },
      { name: '24/7 priority support' },
      { name: 'Full API access' },
      { name: 'Unlimited team members' },
      { name: 'SLA guarantee' },
      { name: 'Custom onboarding' }
    ]
  }
};

// Function to make Stripe API calls
function makeStripeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: `/v1/${endpoint}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`Stripe API Error: ${parsed.error?.message || body}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function enhanceProducts() {
  console.log('🚀 Enhancing TenantFlow Stripe Products...\n');

  try {
    for (const [productId, enhancements] of Object.entries(PRODUCT_ENHANCEMENTS)) {
      console.log(`✨ Enhancing ${productId}...`);
      
      await makeStripeRequest('POST', `products/${productId}`, {
        marketing_features: enhancements.marketing_features
      });
      
      console.log(`✅ Added ${enhancements.marketing_features.length} marketing features to ${productId}`);
    }

    console.log('\n🎉 All products enhanced successfully!');
    console.log('\nNext steps:');
    console.log('1. Go to Stripe Dashboard → Product catalog → Pricing tables');
    console.log('2. Create a new pricing table with your enhanced products');
    console.log('3. Copy the pricing table ID');
    console.log('4. Update your app with the new pricing table ID');

  } catch (error) {
    console.error('❌ Enhancement failed:', error.message);
    process.exit(1);
  }
}

enhanceProducts();