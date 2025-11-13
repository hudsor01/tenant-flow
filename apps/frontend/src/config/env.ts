/**
 * Frontend Environment Variables
 * Simple environment variable configuration for Next.js
 */

export const env = {
  // App URLs
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,

  // API
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM: process.env.NEXT_PUBLIC_SUPABASE_JWT_ALGORITHM || 'ES256',
  SUPABASE_JWT_ALGORITHM: process.env.SUPABASE_JWT_ALGORITHM,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_STARTER_MONTHLY_PRICE_ID: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
  STRIPE_STARTER_ANNUAL_PRICE_ID: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
  STRIPE_GROWTH_MONTHLY_PRICE_ID: process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID,
  STRIPE_GROWTH_ANNUAL_PRICE_ID: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID,
  STRIPE_MAX_MONTHLY_PRICE_ID: process.env.STRIPE_MAX_MONTHLY_PRICE_ID,
  STRIPE_MAX_ANNUAL_PRICE_ID: process.env.STRIPE_MAX_ANNUAL_PRICE_ID,

  // Security Monitoring
  SECURITY_MONITORING_WEBHOOK: process.env.SECURITY_MONITORING_WEBHOOK,
  SECURITY_MONITORING_TOKEN: process.env.SECURITY_MONITORING_TOKEN,

  // Feature Flags
  NEXT_PUBLIC_ENABLE_DEBUG_LOGGING: process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGGING === 'true',
  NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',

  // Testing
  RUN_INTEGRATION_TESTS: process.env.RUN_INTEGRATION_TESTS === 'true',
  E2E_OWNER_EMAIL: process.env.E2E_OWNER_EMAIL,
  E2E_OWNER_PASSWORD: process.env.E2E_OWNER_PASSWORD,

  // Node.js
  NODE_ENV: process.env.NODE_ENV || 'development',
}

// Type exports for TypeScript
export type Env = typeof env

// Helper functions
export function isIntegrationTest(): boolean {
  return env.RUN_INTEGRATION_TESTS
}

export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development'
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

export function isTest(): boolean {
  return env.NODE_ENV === 'test'
}