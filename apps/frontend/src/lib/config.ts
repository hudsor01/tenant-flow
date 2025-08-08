/**
 * Application configuration
 * Centralized configuration for the TenantFlow frontend
 */

export const config = {
  api: {
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.tenantflow.app/api/v1',
    timeout: 30000,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
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

// Environment validation
if (typeof window !== 'undefined') {
  if (!config.supabase.url || !config.supabase.anonKey) {
    console.error('Missing required Supabase configuration');
  }
}