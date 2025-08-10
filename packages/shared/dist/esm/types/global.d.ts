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
            capture: (event: string, properties?: Record<string, unknown>) => void;
            identify: (distinctId: string, properties?: Record<string, unknown>) => void;
            alias: (alias: string) => void;
            reset: () => void;
            isFeatureEnabled: (flag: string) => boolean;
            getFeatureFlag: (flag: string) => string | boolean;
            reloadFeatureFlags: () => Promise<void>;
            onFeatureFlags: (callback: () => void) => void;
            group: (groupType: string, groupKey: string, properties?: Record<string, unknown>) => void;
            register: (properties: Record<string, unknown>) => void;
            unregister: (property: string) => void;
        };
    }
    /**
     * Environment variables
     * Note: NODE_ENV is already declared by Next.js types
     */
    namespace NodeJS {
        interface ProcessEnv {
            NEXT_PUBLIC_POSTHOG_KEY: string;
            NEXT_PUBLIC_POSTHOG_HOST: string;
            NEXT_PUBLIC_API_URL: string;
            NEXT_PUBLIC_SUPABASE_URL: string;
            NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
            NEXT_PUBLIC_VERCEL_URL?: string;
            VERCEL_URL?: string;
        }
    }
}
export {};
//# sourceMappingURL=global.d.ts.map