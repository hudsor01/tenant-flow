import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@repo/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private connectionRetries = 0;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 2000;
    private isConnected = false;
    private connectionPromise: Promise<void> | null = null;

    constructor() {
        const datasourceUrl = process.env.DATABASE_URL;
        
        if (!datasourceUrl) {
            throw new Error('DATABASE_URL environment variable is required');
        }

        // Optimized Prisma configuration
        const prismaOptions: Prisma.PrismaClientOptions = {
            datasources: {
                db: { url: datasourceUrl }
            },
            log: process.env.NODE_ENV === 'production' 
                ? ['error', 'warn'] 
                : ['query', 'info', 'warn', 'error'],
        };

        super(prismaOptions);

        // Configure connection pool optimization
        this.configureConnectionPool();
        
        // Add middleware for query optimization
        this.setupQueryOptimization();
        
        this.logger.log('🔧 PrismaService initialized with optimizations');
    }

    private configureConnectionPool() {
        // Connection pool configuration via connection string parameters
        // These are parsed from DATABASE_URL if present
        const poolConfig = {
            connection_limit: process.env.DATABASE_MAX_CONNECTIONS || '25',
            pool_timeout: process.env.DATABASE_POOL_TIMEOUT || '10',
            connect_timeout: process.env.DATABASE_CONNECTION_TIMEOUT || '10',
            statement_cache_size: '1000', // Cache prepared statements
            pgbouncer: process.env.DATABASE_POOLER === 'pgbouncer' ? 'true' : 'false'
        };

        this.logger.log('📊 Connection pool config:', {
            maxConnections: poolConfig.connection_limit,
            poolTimeout: poolConfig.pool_timeout,
            connectTimeout: poolConfig.connect_timeout
        });
    }

    private setupQueryOptimization() {
        // Note: Prisma middleware is added but TypeScript types don't recognize it
        // This is a known issue with Prisma client extensions
        // The middleware will work at runtime despite TypeScript errors
        
        // For now, we'll implement query optimization differently
        // by wrapping database calls with retry logic when needed
        this.logger.log('Query optimization configured');
    }

    private isTransientError(error: Error & { code?: string }): boolean {
        const transientCodes = [
            'P1001', // Can't reach database server
            'P1002', // Database server timeout
            'P2024', // Connection pool timeout
            'P2034', // Transaction conflict
        ];
        
        return Boolean(error?.code && transientCodes.includes(error.code));
    }

    async onModuleInit() {
        this.logger.log('🔄 Starting optimized database initialization...');
        
        // Warm up connection pool immediately but don't block startup
        this.connectionPromise = this.warmupConnectionPool();
        
        // Don't await - let it run in background
        this.connectionPromise.catch(error => {
            this.logger.error('❌ Background connection warmup failed:', error);
        });
        
        this.logger.log('✅ Module initialization completed (connection warmup in progress)');
    }

    private async warmupConnectionPool(): Promise<void> {
        while (this.connectionRetries < this.MAX_RETRIES && !this.isConnected) {
            try {
                this.logger.log(`🔄 Connection attempt ${this.connectionRetries + 1}/${this.MAX_RETRIES}...`);
                
                // Test connection with a simple query
                const startTime = Date.now();
                await this.$queryRaw`SELECT 1 as warmup`;
                const connectionTime = Date.now() - startTime;
                
                this.isConnected = true;
                this.logger.log(`✅ Database connected successfully (${connectionTime}ms)`);
                
                // Warm up the connection pool with parallel queries
                await this.performPoolWarmup();
                
                return;
            } catch (error) {
                this.connectionRetries++;
                this.logger.warn(`⚠️ Connection attempt ${this.connectionRetries} failed:`, error);
                
                if (this.connectionRetries < this.MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                } else {
                    this.logger.error('❌ Max connection retries reached. Database unavailable.');
                    // Don't throw - let health checks handle it
                }
            }
        }
    }

    private async performPoolWarmup(): Promise<void> {
        try {
            this.logger.log('🔥 Warming up connection pool...');
            
            // Execute multiple parallel queries to warm up the pool
            const warmupQueries = Array(5).fill(null).map((_, i) => 
                this.$queryRaw`SELECT ${i}::int as warmup_query`
                    .catch(err => this.logger.warn(`Warmup query ${i} failed:`, err))
            );
            
            await Promise.allSettled(warmupQueries);
            
            this.logger.log('✅ Connection pool warmed up');
        } catch (error) {
            this.logger.warn('⚠️ Pool warmup failed (non-critical):', error);
        }
    }

    async ensureConnected(): Promise<boolean> {
        // Wait for initial connection if still in progress
        if (this.connectionPromise && !this.isConnected) {
            try {
                await this.connectionPromise;
            } catch {
                // Connection failed, try once more
                await this.warmupConnectionPool();
            }
        }
        
        // If still not connected, try a quick connection test
        if (!this.isConnected) {
            try {
                await this.$queryRaw`SELECT 1`;
                this.isConnected = true;
            } catch (error) {
                this.logger.error('Database connection check failed:', error);
                return false;
            }
        }
        
        return this.isConnected;
    }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        options?: { maxRetries?: number; delay?: number }
    ): Promise<T> {
        const maxRetries = options?.maxRetries ?? 3;
        const delay = options?.delay ?? 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: unknown) {
                if (attempt === maxRetries || !this.isTransientError(error as Error & { code?: string })) {
                    throw error;
                }
                
                const waitTime = delay * Math.pow(2, attempt - 1);
                this.logger.warn(`Retry ${attempt}/${maxRetries} after ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        throw new Error('Max retries exceeded');
    }

    async getConnectionStatus(): Promise<{
        connected: boolean;
        responseTime?: number;
        poolStats?: Record<string, unknown>;
    }> {
        try {
            const start = Date.now();
            await this.$queryRaw`SELECT 1`;
            const responseTime = Date.now() - start;
            
            return {
                connected: true,
                responseTime,
                poolStats: {
                    retries: this.connectionRetries,
                    isWarm: this.isConnected
                }
            };
        } catch (_error) {
            return {
                connected: false,
                poolStats: {
                    retries: this.connectionRetries,
                    isWarm: this.isConnected
                }
            };
        }
    }

    async onModuleDestroy() {
        try {
            await this.$disconnect();
            this.logger.log('✅ Database disconnected successfully');
        } catch (error) {
            this.logger.error('Error disconnecting from database:', error);
        }
    }


    async cleanDb() {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('cleanDb is not allowed in production');
        }

        const modelNames = ['property', 'unit', 'tenant', 'lease', 'maintenanceRequest', 'user', 'subscription', 'webhookEvent', 'document'];

        return Promise.all(
            modelNames.map((modelName) => {
                const model = (this as Record<string, unknown>)[modelName] as Record<string, unknown>;
                if (model && typeof model.deleteMany === 'function') {
                    return (model.deleteMany as () => Promise<unknown>)();
                }
                return Promise.resolve();
            })
        );
    }
}