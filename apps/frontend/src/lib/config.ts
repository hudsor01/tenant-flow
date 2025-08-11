/**
 * Application configuration
 * Centralized configuration for the TenantFlow frontend
 */

export const config = {
  api: {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.tenantflow.app',
    timeout: 30000,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },
  analytics: {
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || '',
  },
  app: {
    env: process.env.NEXT_PUBLIC_APP_ENV || 'development',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    name: 'TenantFlow',
  },
  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    errorReporting: process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING === 'true',
  },
} as const;

// Environment validation only in development and only after client hydration
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Delay validation to avoid build-time warnings
  setTimeout(() => {
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_POSTHOG_KEY',
      'NEXT_PUBLIC_POSTHOG_HOST',
    ] as const;

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.warn(`Missing required environment variable: ${envVar}`)
      }
    }
  }, 0);
}