import type { PrismaClient } from './generated/client';
/**
 * Result type for database health check
 */
export interface DatabaseHealthResult {
    healthy: boolean;
    error?: string;
}
/**
 * Checks database connectivity by performing a simple SELECT 1 query
 *
 * @param prisma - PrismaClient instance to use for the health check
 * @returns Promise resolving to health check result
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@repo/database'
 * import { checkDatabaseConnection } from '@repo/database/health'
 *
 * const prisma = new PrismaClient()
 * const result = await checkDatabaseConnection(prisma)
 *
 * if (result.healthy) {
 *   console.log('Database is healthy')
 * } else {
 *   console.error('Database check failed:', result.error)
 * }
 * ```
 */
export declare function checkDatabaseConnection(prisma: PrismaClient): Promise<DatabaseHealthResult>;
//# sourceMappingURL=health.d.ts.map