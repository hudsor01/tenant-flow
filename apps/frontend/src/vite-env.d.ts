/// <reference types="vite/client" />
/// <reference types="./types/css-modules" />

interface ImportMetaEnv {
	// ========================================
	// API CONFIGURATION
	// ========================================
	readonly VITE_API_BASE_URL: string
	readonly VITE_BACKEND_URL?: string
	readonly VITE_API_URL?: string

	// ========================================
	// SUPABASE
	// ========================================
	readonly VITE_SUPABASE_URL: string
	readonly VITE_SUPABASE_ANON_KEY: string

	// ========================================
	// STRIPE PAYMENT PROCESSING
	// ========================================
	readonly VITE_STRIPE_PUBLISHABLE_KEY: string

	// Stripe Price IDs
	readonly VITE_STRIPE_FREE_TRIAL: string
	readonly VITE_STRIPE_STARTER_MONTHLY: string
	readonly VITE_STRIPE_STARTER_ANNUAL: string
	readonly VITE_STRIPE_GROWTH_MONTHLY: string
	readonly VITE_STRIPE_GROWTH_ANNUAL: string
	readonly VITE_STRIPE_TENANTFLOW_MAX_MONTHLY: string
	readonly VITE_STRIPE_TENANTFLOW_MAX_ANNUAL: string

	// Special feature pricing
	readonly VITE_STRIPE_LEASE_GENERATOR_PRICE_ID?: string

	// ========================================
	// ANALYTICS & TRACKING (Optional)
	// ========================================
	readonly VITE_POSTHOG_KEY?: string
	readonly VITE_POSTHOG_HOST?: string
	readonly VITE_GTM_ID?: string
	readonly VITE_FACEBOOK_PIXEL_ID?: string

	// ========================================
	// DEVELOPMENT CONFIGURATION (Optional)
	// ========================================
	readonly VITE_HOST?: string
	readonly VITE_PORT?: string
	readonly VITE_APP_URL?: string
	readonly VITE_SITE_URL?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
