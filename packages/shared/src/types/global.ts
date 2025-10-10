/**
 * Global type declarations and augmentations
 *
 * This file contains global type declarations that extend the global namespace,
 * window object, and other global interfaces used throughout the application.
 */

// PostHog types removed to avoid unused import warnings

/**
 * Extend NodeJS ProcessEnv interface
 * Using namespace declaration for global augmentation (TypeScript recommended pattern)
 */
declare global {
	// Augment process.env typing
	interface ProcessEnv {
		NEXT_PUBLIC_POSTHOG_KEY: string
		NEXT_PUBLIC_POSTHOG_HOST: string

		NEXT_PUBLIC_API_URL: string
		NEXT_PUBLIC_API_KEY?: string

		NEXT_PUBLIC_SUPABASE_URL: string
		NEXT_PUBLIC_SUPABASE_ANON_KEY: string

		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
		STRIPE_SECRET_KEY: string
		STRIPE_WEBHOOK_SECRET: string

		NEXT_PUBLIC_APP_URL: string
		NEXT_PUBLIC_GITHUB_REPO?: string
		NEXT_PUBLIC_DOCS_URL?: string

		VERCEL?: string
		VERCEL_ENV?: 'production' | 'preview' | 'development'
		VERCEL_URL?: string

		TEST_DEPLOYMENT_URL?: string
		CI?: string
	}

	// Minimal PostHog window typing
	interface Window {
		posthog?: {
			capture: (event: string, properties?: Record<string, unknown>) => void
			identify: (
				distinctId: string,
				properties?: Record<string, unknown>
			) => void
			reset: () => void
		}
	}
}

export {}
