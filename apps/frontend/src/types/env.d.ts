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

export interface ImportMetaEnv {
  // ========================================
  // API CONFIGURATION
  // ========================================
  readonly VITE_API_BASE_URL: string
  readonly VITE_BACKEND_URL?: string
  readonly VITE_API_URL?: string
  readonly VITE_API_TIMEOUT?: string

  // ========================================
  // APPLICATION URLS
  // ========================================
  readonly VITE_APP_URL?: string
  readonly VITE_SITE_URL?: string

  // ========================================
  // SERVER CONFIGURATION
  // ========================================
  readonly VITE_HOST?: string
  readonly VITE_PORT?: string
  readonly VITE_PREVIEW_PORT?: string
  readonly VITE_HTTPS?: string

  // ========================================
  // SUPABASE CONFIGURATION
  // ========================================
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // ========================================
  // STRIPE CONFIGURATION
  // ========================================
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string

  // Stripe Price IDs for subscription plans
  readonly VITE_STRIPE_FREE_TRIAL?: string
  readonly VITE_STRIPE_STARTER_MONTHLY?: string
  readonly VITE_STRIPE_STARTER_ANNUAL?: string
  readonly VITE_STRIPE_GROWTH_MONTHLY?: string
  readonly VITE_STRIPE_GROWTH_ANNUAL?: string
  readonly VITE_STRIPE_TENANTFLOW_MAX_MONTHLY?: string
  readonly VITE_STRIPE_TENANTFLOW_MAX_ANNUAL?: string

  // Special feature pricing
  readonly VITE_STRIPE_LEASE_GENERATOR_PRICE_ID?: string

  // ========================================
  // ANALYTICS & TRACKING
  // ========================================
  readonly VITE_POSTHOG_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_GTM_ID?: string
  readonly VITE_FACEBOOK_PIXEL_ID?: string

  // ========================================
  // FEATURE FLAGS
  // ========================================
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_ENABLE_ERROR_REPORTING?: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING?: string

  // ========================================
  // DEVELOPMENT TOOLS
  // ========================================
  readonly VITE_ENABLE_REACT_DEVTOOLS?: string
  readonly VITE_ENABLE_TANSTACK_DEVTOOLS?: string
  readonly VITE_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'

  // ========================================
  // BUILD CONFIGURATION
  // ========================================
  readonly VITE_BUILD_TARGET?: string
  readonly VITE_ANALYZE_BUNDLE?: string
}

export {}
