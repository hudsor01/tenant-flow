import { z } from 'zod'

const runtimeSchema = z.object({
	supabaseUrl: z.string().min(1, 'SUPABASE_URL must be defined'),
	supabaseAnonKey: z.string().min(1, 'SUPABASE_ANON_KEY must be defined'),
	apiBaseUrl: z.string().min(1).default('https://tenantflow.app/api')
})

let cachedConfig: RuntimeConfig | null = null

export type RuntimeConfig = z.infer<typeof runtimeSchema>

function loadFromEnv(): RuntimeConfig {
	return runtimeSchema.parse({
		supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
		supabaseAnonKey:
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
			process.env.SUPABASE_ANON_KEY ??
			process.env.ANON_KEY,
		apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL
	})
}

/**
 * Reads runtime configuration in a single place with validation. Values are
 * cached after the first lookup to avoid re-parsing in hot paths.
 */
export function getRuntimeConfig(): RuntimeConfig {
	if (cachedConfig) {
		return cachedConfig
	}

	cachedConfig = loadFromEnv()
	return cachedConfig
}
