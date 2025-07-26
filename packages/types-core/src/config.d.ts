/**
 * Type declarations for runtime configuration values
 */

import { PlanType } from './billing'

export interface AppConfigType {
  FRONTEND_URL: string
  API_PORT: string
  API_PREFIX: string
  ALLOWED_ORIGINS: string[]
  DEV_PORTS: {
    FRONTEND: string[]
    BACKEND: string[]
  }
  SUPABASE: {
    URL: string | undefined
    SERVICE_KEY: string | undefined
    ANON_KEY: string | undefined
  }
  STRIPE: {
    SECRET_KEY: string | undefined
    WEBHOOK_SECRET: string | undefined
    PORTAL_RETURN_URL: string
  }
  EMAIL: {
    RESEND_API_KEY: string | undefined
    FROM_ADDRESS: string
    SUPPORT_EMAIL: string
  }
  FEATURES: {
    ENABLE_TELEMETRY: boolean
    ENABLE_DEBUG_LOGGING: boolean
    ENABLE_MAINTENANCE_MODE: boolean
  }
  IS_PRODUCTION: boolean
  IS_DEVELOPMENT: boolean
  IS_TEST: boolean
  DATABASE_URL: string | undefined
  JWT_SECRET: string | undefined
  JWT_EXPIRES_IN: string
  RATE_LIMIT: {
    WINDOW_MS: number
    MAX_REQUESTS: string | number
  }
}

export interface BillingPlan {
  id: PlanType
  name: string
  price: number
  propertyLimit: number
  stripePriceId: string | null
  stripeMonthlyPriceId: string | null
  stripeAnnualPriceId: string | null
}

export declare const APP_CONFIG: AppConfigType
export declare const BILLING_PLANS: Record<PlanType, BillingPlan>
export declare function getFrontendUrl(path?: string): string
export declare function getPlanById(planId: string): BillingPlan | undefined
export declare function validateConfig(): void