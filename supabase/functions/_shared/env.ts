// Shared environment variable validation for Supabase Edge Functions.
// Call validateEnv() inside the Deno.serve handler on first request, not at module level.

/** Module-level cache for warm-isolate optimization (harmless if isolate is cold). */
let cachedEnv: Record<string, string> | null = null

/**
 * Validate environment variables and return a typed config object.
 * Throws if any required vars are missing or empty.
 * Logs console.warn for optional vars that are unset.
 */
export function validateEnv(config: {
  required: string[]
  optional?: string[]
}): Record<string, string> {
  if (cachedEnv) return cachedEnv

  const env: Record<string, string> = {}
  const missing: string[] = []

  for (const key of config.required) {
    const value = Deno.env.get(key)
    if (!value) {
      missing.push(key)
    } else {
      env[key] = value
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  if (config.optional) {
    for (const key of config.optional) {
      const value = Deno.env.get(key)
      if (!value) {
        console.warn(`Optional environment variable not set: ${key}`)
      } else {
        env[key] = value
      }
    }
  }

  cachedEnv = env
  return env
}
