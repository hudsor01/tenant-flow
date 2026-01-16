import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Server-side environment variables (not exposed to client)
   */
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    // Stripe price IDs (server-only for checkout sessions)
    STRIPE_STARTER_MONTHLY: z.string().min(1),
    STRIPE_STARTER_ANNUAL: z.string().min(1),
    STRIPE_GROWTH_MONTHLY: z.string().min(1),
    STRIPE_GROWTH_ANNUAL: z.string().min(1),
    STRIPE_MAX_MONTHLY: z.string().min(1),
    STRIPE_MAX_ANNUAL: z.string().min(1),
    // Vercel auto-injected (optional in development)
    VERCEL_URL: z.string().optional(),
  },

  /**
   * Client-side environment variables (exposed to browser)
   * Must be prefixed with NEXT_PUBLIC_
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_API_BASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
    NEXT_PUBLIC_JWT_ALGORITHM: z
      .enum(['ES256', 'RS256', 'HS256'])
      .default('ES256'),
  },

  /**
   * Runtime environment variables
   * Destructure from process.env to enable tree-shaking
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    // Server
    STRIPE_STARTER_MONTHLY: process.env.STRIPE_STARTER_MONTHLY,
    STRIPE_STARTER_ANNUAL: process.env.STRIPE_STARTER_ANNUAL,
    STRIPE_GROWTH_MONTHLY: process.env.STRIPE_GROWTH_MONTHLY,
    STRIPE_GROWTH_ANNUAL: process.env.STRIPE_GROWTH_ANNUAL,
    STRIPE_MAX_MONTHLY: process.env.STRIPE_MAX_MONTHLY,
    STRIPE_MAX_ANNUAL: process.env.STRIPE_MAX_ANNUAL,
    VERCEL_URL: process.env.VERCEL_URL,
    // Client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_JWT_ALGORITHM: process.env.NEXT_PUBLIC_JWT_ALGORITHM,
  },

  /**
   * Skip validation in test environment or when explicitly requested
   */
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',

  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
})
