/**
 * Environment Variable Type Definitions
 * 
 * This file provides type safety for environment variables used in Vite configuration
 * and throughout the application.
 */

/// <reference types="vite/client" />

declare global {
  const __APP_VERSION__: string
  const __BUILD_TIME__: string
}

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  
  // Server Configuration
  readonly VITE_HOST: string
  readonly VITE_PORT: string
  readonly VITE_PREVIEW_PORT: string
  readonly VITE_HTTPS: string
  
  // Supabase Configuration
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  
  // Stripe Configuration
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  
  // Feature Flags
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_ERROR_REPORTING: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string
  
  // Development Tools
  readonly VITE_ENABLE_REACT_DEVTOOLS: string
  readonly VITE_ENABLE_TANSTACK_DEVTOOLS: string
  readonly VITE_LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'
  
  // Build Configuration
  readonly VITE_BUILD_TARGET: string
  readonly VITE_ANALYZE_BUNDLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}