#!/usr/bin/env node
/**
 * Enhanced Stripe Products Script
 * Adds comprehensive features, images, and branding to TenantFlow products
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Enhanced product configurations with marketing features
const ENHANCED_PRODUCTS = {
  tenantflow_free_trial: {
    name: 'TenantFlow Free Trial',
    description: 'Perfect for property managers just getting started with up to 5 units',
    images: ['https://tenantflow.app/images/plans/free-trial.png'],
    marketing_features: [
      { name: '5 units maximum' },
      { name: 'Basic tenant management' },
      { name: 'Essential maintenance tracking' },
      { name: 'Standard lease templates' },
      { name: 'Email notifications' },
      { name: '14-day free trial' },
      { name: 'Community support' }
    ],
    metadata: {
      tier: 'free_trial',
      max_units: '5',
      support_level: 'community',
      trial_days: '14',
      target_audience: 'First-time property managers',
      key_benefit: 'Risk-free trial with essential features'
    }
  },
  tenantflow_starter: {
    name: 'Starter Plan',
    description: 'Ideal for small property portfolios with comprehensive management tools',
    images: ['https://tenantflow.app/images/plans/starter.png'],
    marketing_features: [
      { name: 'Up to 25 units' },
      { name: 'Complete tenant management' },
      { name: 'Advanced maintenance workflows' },
      { name: 'Custom lease templates' },
      { name: 'Automated rent reminders' },
      { name: 'Financial reporting dashboard' },
      { name: 'Document storage (5GB)' },
      { name: 'Priority email support' },
      { name: 'Mobile app access' }
    ],
    metadata: {
      tier: 'starter',
      max_units: '25',
      support_level: 'email',
      storage_gb: '5',
      target_audience: 'Small property managers (1-25 units)',
      key_benefit: 'Professional tools at affordable price',
      popular: 'true'
    }
  },
  tenantflow_growth: {
    name: 'Growth Plan',
    description: 'Powerful features for growing portfolios with advanced automation',
    images: ['https://tenantflow.app/images/plans/growth.png'],
    marketing_features: [
      { name: 'Up to 100 units' },
      { name: 'Multi-property management' },
      { name: 'Advanced automation rules' },
      { name: 'Custom branded communications' },
      { name: 'Tenant screening integration' },
      { name: 'Advanced financial analytics' },
      { name: 'Bulk operations & imports' },
      { name: 'API access for integrations' },
      { name: 'Document storage (25GB)' },
      { name: 'Priority phone & chat support' },
      { name: 'Advanced reporting suite' }
    ],
    metadata: {
      tier: 'growth',
      max_units: '100',
      support_level: 'phone_chat',
      storage_gb: '25',
      api_access: 'true',
      target_audience: 'Growing property managers (25-100 units)',
      key_benefit: 'Automation and scalability tools'
    }
  },
  tenantflow_max: {
    name: 'TenantFlow Max',
    description: 'Enterprise-grade solution for large portfolios with white-label options',
    images: ['https://tenantflow.app/images/plans/max.png'],
    marketing_features: [
      { name: 'Unlimited units' },
      { name: 'Multi-location management' },
      { name: 'White-label customization' },
      { name: 'Advanced user permissions' },
      { name: 'Custom integrations & webhooks' },
      { name: 'Advanced analytics & BI tools' },
      { name: 'Dedicated account manager' },
      { name: 'Custom onboarding & training' },
      { name: 'Unlimited document storage' },
      { name: '24/7 priority support' },
      { name: 'SLA guarantee (99.9% uptime)' },
      { name: 'Custom reporting & exports' }
    ],
    metadata: {
      tier: 'max',
      max_units: 'unlimited',
      support_level: 'dedicated_24_7',
      storage_gb: 'unlimited',
      white_label: 'true',
      sla_uptime: '99.9',
      target_audience: 'Enterprise property managers (100+ units)',
      key_benefit: 'Enterprise features with white-label options'
    }
  }
};

async function enhanceStripeProducts() {
  console.log('🚀 Starting Stripe product enhancement...\n');

  try {
    // First, fetch all current products
    const { data: products } = await stripe.products.list({ limit: 10 });
    console.log(`Found ${products.length} existing products`);

    for (const product of products) {
      const productId = product.id;
      const enhancement = ENHANCED_PRODUCTS[productId];
      
      if (!enhancement) {
        console.log(`⚠️  No enhancement config found for ${productId}, skipping...`);
        continue;
      }

      console.log(`\n✨ Enhancing product: ${productId}`);
      
      // Update product with enhanced information
      const updatedProduct = await stripe.products.update(productId, {
        name: enhancement.name,
        description: enhancement.description,
        images: enhancement.images,
        marketing_features: enhancement.marketing_features,
        metadata: enhancement.metadata
      });

      console.log(`✅ Enhanced ${updatedProduct.name}`);
      console.log(`   - Added ${enhancement.marketing_features.length} marketing features`);
      console.log(`   - Updated metadata with ${Object.keys(enhancement.metadata).length} keys`);
      console.log(`   - Added product images`);
    }

    console.log('\n🎉 All products enhanced successfully!');
    
    // Display summary of enhancements
    console.log('\n📊 Enhancement Summary:');
    console.log('   • Free Trial: 7 features, community support, 5 units max');
    console.log('   • Starter: 9 features, email support, 25 units max (Popular)');
    console.log('   • Growth: 11 features, phone/chat support, 100 units max');
    console.log('   • TenantFlow Max: 12 features, 24/7 support, unlimited units');

  } catch (error) {
    console.error('❌ Error enhancing products:', error.message);
    process.exit(1);
  }
}

// Run the enhancement script
enhanceStripeProducts();

export { enhanceStripeProducts, ENHANCED_PRODUCTS };