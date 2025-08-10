"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prisma = exports.PrismaClient = exports.prisma = void 0;
exports.createPrismaClient = createPrismaClient;
exports.createServerlessPrismaClient = createServerlessPrismaClient;
const client_1 = require("./generated/client");
/**
 * Creates a properly configured PrismaClient instance with connection pooling
 * and environment-appropriate logging settings.
 *
 * @param config - Configuration options for the PrismaClient
 * @returns Configured PrismaClient instance
 */
function createPrismaClient(config = {}) {
    const { databaseUrl = process.env.DATABASE_URL, connectionLimit = 10, poolTimeout = 20, enableLogging } = config;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required but not provided');
    }
    // Configure connection pooling via URL parameters
    const url = new URL(databaseUrl);
    url.searchParams.set('connection_limit', connectionLimit.toString());
    url.searchParams.set('pool_timeout', poolTimeout.toString());
    // Configure logging based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    const shouldLog = enableLogging ?? isDevelopment;
    const logConfig = shouldLog
        ? isDevelopment
            ? ['query', 'info', 'warn', 'error'] // Verbose logging in development
            : ['warn', 'error'] // Minimal logging in other environments
        : [];
    const prisma = new client_1.PrismaClient({
        datasources: {
            db: {
                url: url.toString()
            }
        },
        log: logConfig,
        errorFormat: isDevelopment ? 'pretty' : 'minimal'
    });
    // Log connection details in development
    if (isDevelopment && shouldLog) {
        console.warn(`🗄️  Prisma Client created with:`);
        console.warn(`   Connection limit: ${connectionLimit}`);
        console.warn(`   Pool timeout: ${poolTimeout}s`);
        console.warn(`   Logging: ${logConfig.join(', ')}`);
    }
    return prisma;
}
/**
 * Creates a PrismaClient instance optimized for serverless environments
 * with reduced connection limits and faster timeouts.
 *
 * @param config - Configuration options
 * @returns Configured PrismaClient for serverless use
 */
function createServerlessPrismaClient(config = {}) {
    return createPrismaClient({
        connectionLimit: 5,
        poolTimeout: 10,
        enableLogging: false,
        ...config
    });
}
/**
 * Default PrismaClient instance for convenience.
 * Uses standard configuration with connection pooling.
 */
exports.prisma = createPrismaClient();
/**
 * Re-export PrismaClient and Prisma types for convenience
 */
var client_2 = require("./generated/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_2.PrismaClient; } });
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_2.Prisma; } });
//# sourceMappingURL=client.js.map