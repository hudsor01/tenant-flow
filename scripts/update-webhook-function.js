#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the webhook function code
const webhookCode = fs.readFileSync(
  path.join(__dirname, '../supabase/functions/stripe-webhook/index.ts'),
  'utf8'
);

// Supabase project details
const SUPABASE_PROJECT_REF = 'bshjmbshupiibfiewpxb';
const SUPABASE_ACCESS_TOKEN = 'sbp_1d61a4333c2feb335c415d4f956a592d8f8213b3';

async function updateWebhookFunction() {
  try {
    console.log('🚀 Updating Stripe webhook function...');
    
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/functions/stripe-webhook`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: webhookCode,
          verify_jwt: false,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update function: ${response.status} - ${error}`);
    }

    console.log('✅ Webhook function updated successfully!');
    
    // Deploy the function
    console.log('🚀 Deploying webhook function...');
    const deployResponse = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/functions/stripe-webhook/deploy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
      }
    );

    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      throw new Error(`Failed to deploy function: ${deployResponse.status} - ${error}`);
    }

    console.log('✅ Webhook function deployed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating webhook function:', error);
    process.exit(1);
  }
}

// Run the update
updateWebhookFunction();