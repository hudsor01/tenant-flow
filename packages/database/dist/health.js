<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js';
=======
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = checkDatabaseConnection;
const supabase_js_1 = require("@supabase/supabase-js");
>>>>>>> origin/main
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
<<<<<<< HEAD
export async function checkDatabaseConnection(supabaseUrl, supabaseKey) {
=======
async function checkDatabaseConnection(supabaseUrl, supabaseKey) {
>>>>>>> origin/main
    try {
        if (!supabaseUrl || !supabaseKey) {
            return {
                healthy: false,
                error: 'Missing Supabase configuration'
            };
        }
<<<<<<< HEAD
        const supabase = createClient(supabaseUrl, supabaseKey);
=======
        const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
>>>>>>> origin/main
        // Perform a simple query to test connectivity
        const { error } = await supabase.from('User').select('id').limit(1);
        if (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
        return { healthy: true };
    }
    catch (error) {
        // Extract error message safely, handling various error types
        const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
        return {
            healthy: false,
            error: errorMessage
        };
    }
}
//# sourceMappingURL=health.js.map