import { PrismaClient, Prisma } from './generated/client'

/**
 * Configuration options for creating a PrismaClient instance
 */
interface PrismaClientConfig {
  /**
   * Database URL with connection parameters
   * If not provided, uses DATABASE_URL from environment
   */
  databaseUrl?: string
  /**
   * Connection pool limit (default: 10)
   */
  connectionLimit?: number
  /**
   * Pool timeout in seconds (default: 20)
   */
  poolTimeout?: number
  /**
   * Enable query logging (overrides NODE_ENV defaults)
   */
  enableLogging?: boolean
}

/**
 * Creates a properly configured PrismaClient instance with connection pooling
 * and environment-appropriate logging settings.
 * 
 * @param config - Configuration options for the PrismaClient
 * @returns Configured PrismaClient instance
 */
export function createPrismaClient(config: PrismaClientConfig = {}): PrismaClient {
  const {
    databaseUrl = process.env.DATABASE_URL,
    connectionLimit = 10,
    poolTimeout = 20,
    enableLogging
  } = config

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required but not provided')
  }

  // Configure connection pooling via URL parameters
  const url = new URL(databaseUrl)
  url.searchParams.set('connection_limit', connectionLimit.toString())
  url.searchParams.set('pool_timeout', poolTimeout.toString())

  // Configure logging based on environment
  const isDevelopment = process.env.NODE_ENV === 'development'
  const shouldLog = enableLogging ?? isDevelopment

  const logConfig: Prisma.LogLevel[] = shouldLog 
    ? isDevelopment 
      ? ['query', 'info', 'warn', 'error']  // Verbose logging in development
      : ['warn', 'error']                   // Minimal logging in other environments
    : []

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url.toString()
      }
    },
    log: logConfig,
    errorFormat: isDevelopment ? 'pretty' : 'minimal'
  })

  // Log connection details in development
  if (isDevelopment && shouldLog) {
    console.log(`🗄️  Prisma Client created with:`)
    console.log(`   Connection limit: ${connectionLimit}`)
    console.log(`   Pool timeout: ${poolTimeout}s`)
    console.log(`   Logging: ${logConfig.join(', ')}`)
  }

  return prisma
}

/**
 * Creates a PrismaClient instance optimized for serverless environments
 * with reduced connection limits and faster timeouts.
 * 
 * @param config - Configuration options
 * @returns Configured PrismaClient for serverless use
 */
export function createServerlessPrismaClient(config: PrismaClientConfig = {}): PrismaClient {
  return createPrismaClient({
    connectionLimit: 5,
    poolTimeout: 10,
    enableLogging: false,
    ...config
  })
}

/**
 * Default PrismaClient instance for convenience.
 * Uses standard configuration with connection pooling.
 */
export const prisma = createPrismaClient()

/**
 * Re-export PrismaClient and Prisma types for convenience
 */
export { PrismaClient, Prisma } from './generated/client'
export type { 
  User, 
  Property, 
  Unit, 
  Tenant, 
  Lease, 
  MaintenanceRequest 
} from './generated/client'