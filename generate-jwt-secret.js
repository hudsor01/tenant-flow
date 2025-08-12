#!/usr/bin/env node

/**
 * JWT Secret Generator for Railway Deployment
 * Generates a cryptographically secure JWT secret
 */

import crypto from 'crypto';

function generateSecureJwtSecret() {
  // Generate 64-byte (512-bit) random secret
  const secret = crypto.randomBytes(64).toString('hex');
  return secret;
}

function validateJwtSecret(secret) {
  if (!secret) return { valid: false, error: 'Secret is empty' };
  if (secret.length < 32) return { valid: false, error: 'Secret too short (minimum 32 characters)' };
  if (secret.length < 64) return { valid: true, warning: 'Secret could be longer for better security' };
  return { valid: true };
}

// Generate new secret
const newSecret = generateSecureJwtSecret();
const validation = validateJwtSecret(newSecret);

console.log('=== JWT Secret Generator ===\n');
console.log('Generated JWT Secret:');
console.log(newSecret);
console.log('\nValidation:');
console.log(`  Length: ${newSecret.length} characters`);
console.log(`  Status: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
if (validation.warning) console.log(`  Warning: ${validation.warning}`);
if (validation.error) console.log(`  Error: ${validation.error}`);

console.log('\n=== Railway Deployment Instructions ===');
console.log('1. Copy the generated secret above');
console.log('2. In Railway dashboard, go to your project');
console.log('3. Navigate to Variables tab');
console.log('4. Add new variable:');
console.log('   Name: JWT_SECRET');
console.log('   Value: [paste the generated secret]');
console.log('5. Deploy your application');

console.log('\n=== Alternative: Use SUPABASE_JWT_SECRET ===');
console.log('If you prefer to use Supabase JWT secret:');
console.log('1. In Railway variables, add:');
console.log('   Name: JWT_SECRET');
console.log('   Value: ${{ SUPABASE_JWT_SECRET }}');
console.log('2. This will use your existing Supabase JWT secret');

if (process.env.SUPABASE_JWT_SECRET) {
  const supabaseValidation = validateJwtSecret(process.env.SUPABASE_JWT_SECRET);
  console.log('\n=== Current SUPABASE_JWT_SECRET Validation ===');
  console.log(`  Length: ${process.env.SUPABASE_JWT_SECRET.length} characters`);
  console.log(`  Status: ${supabaseValidation.valid ? '✅ Valid' : '❌ Invalid'}`);
  if (supabaseValidation.warning) console.log(`  Warning: ${supabaseValidation.warning}`);
  if (supabaseValidation.error) console.log(`  Error: ${supabaseValidation.error}`);
  
  if (supabaseValidation.valid) {
    console.log('\n✅ You can use SUPABASE_JWT_SECRET as JWT_SECRET');
  }
}

// Test current JWT_SECRET if it exists
if (process.env.JWT_SECRET) {
  const currentValidation = validateJwtSecret(process.env.JWT_SECRET);
  console.log('\n=== Current JWT_SECRET Validation ===');
  console.log(`  Length: ${process.env.JWT_SECRET.length} characters`);
  console.log(`  Status: ${currentValidation.valid ? '✅ Valid' : '❌ Invalid'}`);
  if (currentValidation.warning) console.log(`  Warning: ${currentValidation.warning}`);
  if (currentValidation.error) console.log(`  Error: ${currentValidation.error}`);
}