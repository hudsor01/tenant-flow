/**
 * Environment variables for client-side usage
 * Safe defaults provided for build-time compatibility
 */
export const env = {
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
	NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.tenantflow.app/api',
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
	NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
	NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
}

// Individual exports for backward compatibility
export const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
export const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
