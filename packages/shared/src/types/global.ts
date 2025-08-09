/**
 * Global type declarations and augmentations
 * 
 * This file contains global type declarations that extend the global namespace,
 * window object, and other global interfaces used throughout the application.
 */

declare global {
  /**
   * PostHog analytics integration
   */
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void;
      identify: (distinctId: string, properties?: Record<string, any>) => void;
      alias: (alias: string) => void;
      reset: () => void;
      isFeatureEnabled: (flag: string) => boolean;
      getFeatureFlag: (flag: string) => string | boolean;
      reloadFeatureFlags: () => Promise<void>;
      onFeatureFlags: (callback: () => void) => void;
      group: (groupType: string, groupKey: string, properties?: Record<string, any>) => void;
      register: (properties: Record<string, any>) => void;
      unregister: (property: string) => void;
    };
  }

  /**
   * Environment variables
   */
  namespace NodeJS {
    interface ProcessEnv {
      // PostHog configuration
      NEXT_PUBLIC_POSTHOG_KEY: string;
      NEXT_PUBLIC_POSTHOG_HOST: string;
      
      // API configuration
      NEXT_PUBLIC_API_URL: string;
      
      // Supabase configuration
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      
      // Stripe configuration
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
      
      // Environment
      NODE_ENV: 'development' | 'production' | 'test';
      NEXT_PUBLIC_VERCEL_URL?: string;
      VERCEL_URL?: string;
    }
  }

}

export {};