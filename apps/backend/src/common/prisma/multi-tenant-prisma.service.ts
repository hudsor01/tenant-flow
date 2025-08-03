import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { isValidUserId, validateJWTClaims } from '../security/type-guards'
import { AccelerateMiddleware, setupAccelerateMonitoring } from './accelerate-middleware'

@Injectable()
export class MultiTenantPrismaService implements OnModuleDestroy {
    private adminPrisma: PrismaClient
    private readonly logger = new Logger(MultiTenantPrismaService.name)
    private readonly tenantClients = new Map<string, { client: PrismaClient; lastUsed: Date; accelerate: AccelerateMiddleware }>()
    private readonly MAX_POOL_SIZE = 10
    private readonly CLIENT_TTL = 300000 // 5 minutes
    private adminAccelerate?: AccelerateMiddleware
    
    constructor(private prisma: PrismaService) {
        // Admin connection uses the default PrismaService (with BYPASSRLS)
        this.adminPrisma = this.prisma
        
        // Setup Accelerate monitoring for admin client only if available
        try {
            if (this.adminPrisma && typeof this.adminPrisma.$use === 'function') {
                this.adminAccelerate = setupAccelerateMonitoring(this.adminPrisma)
                this.logger.log('✅ Admin Prisma client initialized with Accelerate monitoring')
            } else {
                this.logger.warn('⚠️ Prisma client not ready for Accelerate monitoring, skipping...')
            }
        } catch (error) {
            this.logger.error('Failed to setup Accelerate monitoring:', error)
        }
        
        // Setup cleanup interval for unused tenant clients
        setInterval(() => this.cleanupUnusedClients(), this.CLIENT_TTL)
    }
    
    async onModuleDestroy() {
        // Cleanup all tenant clients on shutdown
        for (const [userId, { client }] of Array.from(this.tenantClients)) {
            try {
                await client.$disconnect()
                this.logger.debug(`Disconnected tenant client for user ${userId}`)
            } catch (error) {
                this.logger.warn(`Failed to disconnect tenant client for user ${userId}:`, error)
            }
        }
        this.tenantClients.clear()
    }
    
    private cleanupUnusedClients() {
        const now = new Date()
        const clientsToRemove: string[] = []
        
        for (const [userId, { lastUsed }] of Array.from(this.tenantClients)) {
            if (now.getTime() - lastUsed.getTime() > this.CLIENT_TTL) {
                clientsToRemove.push(userId)
            }
        }
        
        for (const userId of clientsToRemove) {
            const entry = this.tenantClients.get(userId)
            if (entry) {
                entry.client.$disconnect().catch(error => {
                    this.logger.warn(`Failed to disconnect unused client for user ${userId}:`, error)
                })
                this.tenantClients.delete(userId)
                this.logger.debug(`Cleaned up unused tenant client for user ${userId}`)
            }
        }
    }
    
    /**
     * Get admin Prisma client that bypasses RLS
     * Use for: user sync, billing, cross-tenant operations
     */
    getAdminClient(): PrismaClient {
        return this.adminPrisma
    }
    
    /**
     * Get tenant-scoped Prisma client that respects RLS
     * Use for: all user-facing operations
     * Implements connection pooling for better resource management
     */
    async getTenantClient(userId: string): Promise<PrismaClient> {
        // Enhanced security validation using type guards
        if (!isValidUserId(userId)) {
            this.logger.error('Security validation failed for userId in getTenantClient', {
                userId: String(userId).substring(0, 8) + '...'
            })
            throw new Error('Invalid userId provided - security validation failed')
        }

        // Check if we have an existing client for this user
        const existing = this.tenantClients.get(userId)
        if (existing) {
            existing.lastUsed = new Date()
            this.logger.debug(`Reusing existing tenant client for user ${userId}`)
            return existing.client
        }

        // Check pool size limit
        if (this.tenantClients.size >= this.MAX_POOL_SIZE) {
            // Remove oldest client to make room
            const oldestEntry = Array.from(this.tenantClients.entries())
                .sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime())[0]
            
            if (oldestEntry) {
                const [oldUserId, { client }] = oldestEntry
                await client.$disconnect().catch(error => {
                    this.logger.warn(`Failed to disconnect client for user ${oldUserId}:`, error)
                })
                this.tenantClients.delete(oldUserId)
                this.logger.debug(`Evicted oldest tenant client for user ${oldUserId}`)
            }
        }

        try {
            // Create a new client for this tenant
            const tenantPrisma = new PrismaClient({
                datasources: {
                    db: {
                        url: process.env.DATABASE_URL
                    }
                },
                log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
            })
            
            // Use a transaction to set the JWT claims for RLS
            await tenantPrisma.$transaction(async (tx) => {
                // Create and validate JWT claims object
                const claims = { sub: userId }
                const validatedClaims = validateJWTClaims(claims)
                
                if (!validatedClaims) {
                    throw new Error('JWT claims validation failed for RLS context')
                }
                
                // Set the user context for RLS policies using parameterized query
                const jwtClaims = JSON.stringify(validatedClaims)
                await tx.$executeRaw`SET LOCAL request.jwt.claims = ${jwtClaims}::jsonb`
                
                // Log successful context setting for security audit
                this.logger.debug('RLS context set successfully with validated claims', { 
                    userId: userId.substring(0, 8) + '...',
                    claimsLength: jwtClaims.length 
                })
            })
            
            // Setup Accelerate monitoring for this tenant client
            let accelerateMiddleware: AccelerateMiddleware | undefined
            try {
                if (tenantPrisma && typeof tenantPrisma.$use === 'function') {
                    accelerateMiddleware = setupAccelerateMonitoring(tenantPrisma)
                }
            } catch (error) {
                this.logger.warn('Failed to setup Accelerate monitoring for tenant client:', error)
            }
            
            // Store in pool
            this.tenantClients.set(userId, {
                client: tenantPrisma,
                lastUsed: new Date(),
                accelerate: accelerateMiddleware as AccelerateMiddleware
            })
            
            this.logger.debug(`Created new tenant client with Accelerate monitoring for user ${userId}`)
            return tenantPrisma
        } catch (error) {
            this.logger.error(`Failed to create tenant client for user ${userId}:`, error)
            throw new Error(`Failed to initialize tenant database connection: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
    
    /**
     * Execute a query with tenant context
     * Automatically handles setting and clearing the context
     * Uses pooled connections for better performance
     */
    async withTenantContext<T>(
        userId: string,
        callback: (prisma: PrismaClient) => Promise<T>
    ): Promise<T> {
        // Enhanced security validation using type guards
        if (!isValidUserId(userId)) {
            this.logger.error('Security validation failed for userId in withTenantContext', {
                userId: String(userId).substring(0, 8) + '...'
            })
            throw new Error('Invalid userId provided - security validation failed')
        }

        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function')
        }

        try {
            // Get a pooled tenant client
            const tenantPrisma = await this.getTenantClient(userId)
            
            // Execute the callback within a transaction that maintains the RLS context
            const result = await tenantPrisma.$transaction(async (tx) => {
                // The RLS context is already set when the client was created
                // Just execute the callback
                return callback(tx as PrismaClient)
            }, {
                timeout: 30000, // 30 second timeout
                isolationLevel: 'ReadCommitted'
            })
            
            return result
        } catch (error) {
            this.logger.error(`Error in withTenantContext for user ${userId}:`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                userId
            })

            // Re-throw with additional context
            if (error instanceof Error) {
                throw new Error(`Tenant operation failed: ${error.message}`)
            }
            throw new Error('Tenant operation failed with unknown error')
        }
    }

    /**
     * Manually disconnect a specific tenant client
     * Useful for cleanup after errors or explicit resource management
     */
    async disconnectTenantClient(userId: string): Promise<void> {
        const entry = this.tenantClients.get(userId)
        if (entry) {
            try {
                await entry.client.$disconnect()
                this.tenantClients.delete(userId)
                this.logger.debug(`Manually disconnected tenant client for user ${userId}`)
            } catch (error) {
                this.logger.warn(`Failed to disconnect tenant client for user ${userId}:`, error)
                // Still remove from pool even if disconnect failed
                this.tenantClients.delete(userId)
            }
        }
    }

    /**
     * Get connection pool statistics for monitoring
     */
    getPoolStats() {
        return {
            activeConnections: this.tenantClients.size,
            maxPoolSize: this.MAX_POOL_SIZE,
            clientTTL: this.CLIENT_TTL,
            clients: Array.from(this.tenantClients.entries()).map(([userId, { lastUsed }]) => ({
                userId: userId.substring(0, 8) + '...', // Partial ID for privacy
                lastUsed: lastUsed.toISOString(),
                ageMinutes: Math.round((Date.now() - lastUsed.getTime()) / 60000)
            }))
        }
    }

    /**
     * Get admin client Accelerate performance metrics
     */
    getAdminPerformanceMetrics() {
        return this.adminAccelerate?.getMetrics() || {};
    }

    /**
     * Get performance metrics for a specific tenant client
     */
    getTenantPerformanceMetrics(userId: string) {
        const entry = this.tenantClients.get(userId)
        return entry?.accelerate?.getMetrics() || {};
    }

    /**
     * Generate comprehensive performance report for all clients
     */
    generatePerformanceReport() {
        const adminMetrics = this.adminAccelerate?.generateReport()
        const tenantMetrics = Array.from(this.tenantClients.entries()).map(([userId, { accelerate }]) => ({
            userId: userId.substring(0, 8) + '...',
            metrics: accelerate?.generateReport() || { error: 'Accelerate not initialized' }
        }))

        return {
            timestamp: new Date().toISOString(),
            adminClient: adminMetrics || { error: 'Admin accelerate not initialized' },
            tenantClients: tenantMetrics,
            poolStats: this.getPoolStats()
        }
    }
}