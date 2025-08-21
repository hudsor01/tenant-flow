/**
 * Global type declarations and augmentations
 *
 * This file contains global type declarations that extend the global namespace,
 * window object, and other global interfaces used throughout the application.
 */

/**
 * Extend NodeJS ProcessEnv interface
 * Using namespace declaration for global augmentation
 */
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		interface ProcessEnv {
			// PostHog configuration
			NEXT_PUBLIC_POSTHOG_KEY: string
			NEXT_PUBLIC_POSTHOG_HOST: string

			// API configuration
			NEXT_PUBLIC_API_URL: string
			NEXT_PUBLIC_API_KEY?: string

			// Supabase configuration
			NEXT_PUBLIC_SUPABASE_URL: string
			NEXT_PUBLIC_SUPABASE_ANON_KEY: string

			// Stripe configuration
			NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
			STRIPE_SECRET_KEY: string
			STRIPE_WEBHOOK_SECRET: string

			// Other public environment variables
			NEXT_PUBLIC_APP_URL: string
			NEXT_PUBLIC_GITHUB_REPO?: string
			NEXT_PUBLIC_DOCS_URL?: string

			// Build and deployment
			VERCEL?: string
			VERCEL_ENV?: 'production' | 'preview' | 'development'
			VERCEL_URL?: string

			// Testing
			TEST_DEPLOYMENT_URL?: string
			CI?: string
		}
	}
	/**
	 * PostHog analytics integration
	 */
	interface Window {
		posthog?: {
			capture: (
				event: string,
				properties?: Record<string, unknown>
			) => void
			identify: (
				distinctId: string,
				properties?: Record<string, unknown>
			) => void
			alias: (alias: string) => void
			reset: () => void
			group: (
				groupType: string,
				groupKey: string,
				properties?: Record<string, unknown>
			) => void
			register: (properties: Record<string, unknown>) => void
			unregister: (property: string) => void
		}
	}
}

export {}
