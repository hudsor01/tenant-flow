#!/usr/bin/env node

/**
 * Verify that all required environment variables are properly configured
 * for production deployments
 */

const requiredVars = {
  frontend: [
    'VITE_API_BASE_URL',
    'VITE_BACKEND_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'VITE_STRIPE_FREE_TRIAL',
    'VITE_STRIPE_STARTER_MONTHLY',
    'VITE_STRIPE_STARTER_ANNUAL',
    'VITE_STRIPE_GROWTH_MONTHLY',
    'VITE_STRIPE_GROWTH_ANNUAL',
    'VITE_STRIPE_ENTERPRISE_MONTHLY',
    'VITE_STRIPE_ENTERPRISE_ANNUAL',
  ],
  backend: [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'DIRECT_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_CUSTOMER_PORTAL_URL',
  ]
};

function checkEnvVars(service) {
  console.log(`\n🔍 Checking ${service} environment variables...`);
  const vars = requiredVars[service];
  const missing = [];
  const found = [];

  vars.forEach(varName => {
    if (process.env[varName]) {
      found.push(varName);
    } else {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.log(`\n❌ Missing ${missing.length} required variables:`);
    missing.forEach(v => console.log(`   - ${v}`));
  }

  if (found.length > 0) {
    console.log(`\n✅ Found ${found.length} variables`);
  }

  return missing.length === 0;
}

// Main execution
const service = process.argv[2] || 'frontend';

if (!requiredVars[service]) {
  console.error(`Unknown service: ${service}. Use 'frontend' or 'backend'`);
  process.exit(1);
}

console.log(`Environment Variable Verification for ${service.toUpperCase()}`);
console.log('=' .repeat(50));

const isValid = checkEnvVars(service);

if (!isValid) {
  console.log(`\n⚠️  Some required environment variables are missing!`);
  console.log(`Please check your .env files or deployment platform configuration.`);
  process.exit(1);
} else {
  console.log(`\n✅ All required environment variables are configured!`);
}