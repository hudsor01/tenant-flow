import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@repo/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        // Get DATABASE_URL directly from environment to avoid circular dependency
        const datasourceUrl = process.env.DATABASE_URL;
        
        if (!datasourceUrl) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        
        super({
            datasources: {
                db: { url: datasourceUrl }
            },
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
        
        this.logger.log('🔧 PrismaService constructor completed')
        this.logger.log(`🔧 DATABASE_URL configured: ${!!datasourceUrl}`)
    }

    async onModuleInit() {
        this.logger.log('🔄 PrismaService onModuleInit() starting - using non-blocking initialization');
        
        // Make database connection non-blocking to prevent deployment hangs
        setImmediate(() => this.initializeDatabase());
        
        this.logger.log('✅ PrismaService onModuleInit() completed (database connection deferred)');
    }

    private async initializeDatabase() {
        try {
            this.logger.log('🔄 Attempting database connection...');
            
            // Shorter timeout for production deployments
            const connectPromise = this.$connect();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database connection timeout after 5 seconds')), 5000)
            );
            
            await Promise.race([connectPromise, timeoutPromise]);
            this.logger.log('✅ Database connection established');
        } catch (error) {
            this.logger.error('❌ Failed to connect to database:', error);
            // Continue running - health checks will retry connection
            this.logger.warn('⚠️  Application started without database connection - will retry on first request');
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
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