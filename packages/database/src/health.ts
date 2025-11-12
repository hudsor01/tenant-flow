import { createClient } from '@supabase/supabase-js'

// Local interface definition to avoid circular dependency
interface Database {
	public: {
		Tables: {
			User: {
				Row: { id: string }
				Insert: { id?: string }
				Update: { id?: string }
			}
		}
	}
}

/**
 * Result type for database health check
 */
export interface DatabaseHealthResult {
	healthy: boolean
	error?: string
}

/**
 * Checks database connectivity using Supabase client
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Supabase service key
 * @returns Promise resolving to health check result
 *
 * @example
 * ```typescript
 * const result = await checkDatabaseConnection(
 *   process.env.SUPABASE_URL,
 *   process.env.SUPABASE_SERVICE_KEY
 * )
 *
 * if (result.healthy) {
 *   logger.info('Database is healthy')
 * } else {
 *   logger.error('Database check failed', { metadata: { error: result.error } })
 * }
 * ```
 */
export async function checkDatabaseConnection(
	supabaseUrl?: string,
	supabaseKey?: string
): Promise<DatabaseHealthResult> {
	try {
		if (!supabaseUrl || !supabaseKey) {
			return {
				healthy: false,
				error: 'Missing Supabase configuration'
			}
		}

		const supabase = createClient<Database>(supabaseUrl, supabaseKey)

		// Perform a simple query to test connectivity
		const { error } = await supabase.from('User').select('id').limit(1)

		if (error) {
			return {
				healthy: false,
				error: error.message
			}
		}

		return { healthy: true }
	} catch (error) {
		// Extract error message safely, handling various error types
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown database error'

		return {
			healthy: false,
			error: errorMessage
		}
	}
}
