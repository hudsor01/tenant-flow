import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AccelerateMiddleware, setupAccelerateMonitoring } from '../common/prisma/accelerate-middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private accelerateMiddleware!: AccelerateMiddleware;

    constructor(
        @Inject(forwardRef(() => ConfigService))
        private configService: ConfigService
    ) {
        const datasourceUrl = configService.get<string>('DATABASE_URL');
        
        super({
            datasources: {
                db: { url: datasourceUrl }
            },
            log: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
    }

    async onModuleInit() {
        try {
            await this.$connect();
            
            // Setup Accelerate monitoring for performance tracking
            this.accelerateMiddleware = setupAccelerateMonitoring(this);
            this.logger.log('✅ Database connected successfully with Accelerate monitoring');
        } catch (error) {
            this.logger.error('❌ Failed to connect to database:', error);
            // In production, continue running even if DB is down initially
            // This allows Railway health checks to pass and service to start
            if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
                this.logger.warn('⚠️  Continuing in production mode despite DB connection failure');
            } else {
                throw error;
            }
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Get Accelerate performance metrics
     */
    getPerformanceMetrics() {
        return this.accelerateMiddleware?.getMetrics() || {};
    }

    /**
     * Generate Accelerate performance report
     */
    generatePerformanceReport() {
        return this.accelerateMiddleware?.generateReport() || { 
            error: 'Accelerate middleware not initialized' 
        };
    }

    async cleanDb() {
        if (this.configService.get<string>('NODE_ENV') === 'production') {
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