#!/usr/bin/env node

/**
 * Railway Environment Validation Script
 * Helps debug missing environment variables before deployment
 */

const requiredVars = [
  'DATABASE_URL',
  'SUPABASE_URL', 
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'NODE_ENV',
  'PORT'
];

const optionalVars = [
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'FRONTEND_URL',
  'API_URL',
  'CORS_ORIGINS'
];

console.log('=== Railway Environment Validation ===\n');

// Check required variables
console.log('Required Variables:');
const missingRequired = [];
requiredVars.forEach(key => {
  const value = process.env[key];
  const status = value ? '✅' : '❌';
  const display = value ? 
    (key.includes('SECRET') || key.includes('KEY') ? 
      `${value.substring(0, 10)}...` : 
      (value.length > 50 ? `${value.substring(0, 50)}...` : value)
    ) : 'NOT SET';
  
  console.log(`  ${status} ${key}: ${display}`);
  
  if (!value) {
    missingRequired.push(key);
  }
});

// Check optional variables
console.log('\nOptional Variables:');
const missingOptional = [];
optionalVars.forEach(key => {
  const value = process.env[key];
  const status = value ? '✅' : '⚠️';
  const display = value ? 
    (key.includes('SECRET') || key.includes('KEY') ? 
      `${value.substring(0, 10)}...` : 
      (value.length > 50 ? `${value.substring(0, 50)}...` : value)
    ) : 'NOT SET';
  
  console.log(`  ${status} ${key}: ${display}`);
  
  if (!value) {
    missingOptional.push(key);
  }
});

// Summary
console.log('\n=== Summary ===');
console.log(`Required: ${requiredVars.length - missingRequired.length}/${requiredVars.length} configured`);
console.log(`Optional: ${optionalVars.length - missingOptional.length}/${optionalVars.length} configured`);

if (missingRequired.length > 0) {
  console.log('\n❌ CRITICAL: Missing Required Variables:');
  missingRequired.forEach(key => {
    console.log(`  - ${key}`);
  });
  console.log('\nDeployment will fail without these variables!');
  process.exit(1);
} else {
  console.log('\n✅ All required variables are configured');
}

if (missingOptional.length > 0) {
  console.log('\n⚠️  Missing Optional Variables (may affect functionality):');
  missingOptional.forEach(key => {
    console.log(`  - ${key}`);
  });
}

console.log('\n=== Deployment Ready ===');