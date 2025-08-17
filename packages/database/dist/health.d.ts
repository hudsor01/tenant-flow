/**
 * Result type for database health check
 */
export interface DatabaseHealthResult {
    healthy: boolean;
    error?: string;
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
 *   console.log('Database is healthy')
 * } else {
 *   console.error('Database check failed:', result.error)
 * }
 * ```
 */
export declare function checkDatabaseConnection(supabaseUrl?: string, supabaseKey?: string): Promise<DatabaseHealthResult>;
//# sourceMappingURL=health.d.ts.map