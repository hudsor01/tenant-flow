import { PrismaClient, type Prisma } from './generated/client';
/**
 * Configuration options for creating a PrismaClient instance
 */
interface PrismaClientConfig {
    /**
     * Database URL with connection parameters
     * If not provided, uses DATABASE_URL from environment
     */
    databaseUrl?: string;
    /**
     * Connection pool limit (default: 10)
     */
    connectionLimit?: number;
    /**
     * Pool timeout in seconds (default: 20)
     */
    poolTimeout?: number;
    /**
     * Enable query logging (overrides NODE_ENV defaults)
     */
    enableLogging?: boolean;
}
/**
 * Creates a properly configured PrismaClient instance with connection pooling
 * and environment-appropriate logging settings.
 *
 * @param config - Configuration options for the PrismaClient
 * @returns Configured PrismaClient instance
 */
export declare function createPrismaClient(config?: PrismaClientConfig): PrismaClient;
/**
 * Creates a PrismaClient instance optimized for serverless environments
 * with reduced connection limits and faster timeouts.
 *
 * @param config - Configuration options
 * @returns Configured PrismaClient for serverless use
 */
export declare function createServerlessPrismaClient(config?: PrismaClientConfig): PrismaClient;
/**
 * Default PrismaClient instance for convenience.
 * Uses standard configuration with connection pooling.
 */
export declare const prisma: PrismaClient<Prisma.PrismaClientOptions, never, import("./generated/client/runtime/library").DefaultArgs>;
/**
 * Re-export PrismaClient and Prisma types for convenience
 */
export { PrismaClient, Prisma } from './generated/client';
export type { User, Property, Unit, Tenant, Lease, MaintenanceRequest } from './generated/client';
//# sourceMappingURL=client.d.ts.map