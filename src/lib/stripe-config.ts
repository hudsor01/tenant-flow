// Stripe Configuration - Single source of truth for all Stripe settings
// All price IDs are loaded from environment variables

export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  priceIds: {
    starter: {
      monthly: import.meta.env.VITE_STRIPE_STARTER_MONTHLY,
      annual: import.meta.env.VITE_STRIPE_STARTER_ANNUAL,
    },
    growth: {
      monthly: import.meta.env.VITE_STRIPE_GROWTH_MONTHLY,
      annual: import.meta.env.VITE_STRIPE_GROWTH_ANNUAL,
    },
    enterprise: {
      monthly: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY,
      annual: import.meta.env.VITE_STRIPE_ENTERPRISE_ANNUAL,
    },
  },
} as const;

// Validation helper to ensure all required price IDs are set
export function validateStripeConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!STRIPE_CONFIG.publishableKey) {
    missing.push('VITE_STRIPE_PUBLISHABLE_KEY');
  }
  
  Object.entries(STRIPE_CONFIG.priceIds).forEach(([plan, periods]) => {
    Object.entries(periods).forEach(([period, priceId]) => {
      if (!priceId) {
        missing.push(`VITE_STRIPE_${plan.toUpperCase()}_${period.toUpperCase()}`);
      }
    });
  });
  
  return {
    isValid: missing.length === 0,
    missing,
  };
}

// Helper to get price ID for a specific plan and billing period
export function getPriceId(planId: 'starter' | 'growth' | 'enterprise', billingPeriod: 'monthly' | 'annual'): string {
  const priceId = STRIPE_CONFIG.priceIds[planId]?.[billingPeriod];
  
  if (!priceId) {
    throw new Error(`Price ID not found for plan: ${planId}, period: ${billingPeriod}`);
  }
  
  return priceId;
}

// Development helper to check if Stripe is properly configured
export function logStripeConfigStatus() {
  if (import.meta.env.DEV) {
    const validation = validateStripeConfig();
    
    if (validation.isValid) {
      console.log('✅ Stripe configuration is complete');
    } else {
      console.warn('⚠️ Missing Stripe environment variables:', validation.missing);
      console.warn('Please set these in your .env.local file');
    }
  }
}