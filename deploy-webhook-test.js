#!/usr/bin/env node

// Quick deployment script for webhook testing
import { execSync } from 'child_process';

console.log('🚀 Deploying webhook test to Vercel...');

try {
  // Deploy just the API functions to avoid frontend build issues
  const output = execSync('vercel --prod --confirm', { 
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  
  console.log('✅ Deployment successful!');
  console.log(output);
  
  // Extract deployment URL
  const urlMatch = output.match(/https:\/\/[^\s]+/);
  if (urlMatch) {
    const deploymentUrl = urlMatch[0];
    console.log(`\n🔗 Test your webhook at: ${deploymentUrl}/api/webhook-minimal-test`);
    console.log(`\n📋 Use this command to test with HTTPie:`);
    console.log(`echo '{"test": "data"}' | http POST ${deploymentUrl}/api/webhook-minimal-test stripe-signature:"t=123,v1=test"`);
  }
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n🔧 Try manual deployment with: vercel --prod');
}