import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AccelerateMiddleware } from '../common/prisma/accelerate-middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private accelerateMiddleware!: AccelerateMiddleware;

    constructor(
        @Inject(forwardRef(() => ConfigService))
        private configService: ConfigService
    ) {
        console.log('🔧 PrismaService constructor called');
        const datasourceUrl = configService.get<string>('DATABASE_URL');
        console.log('🔧 DATABASE_URL:', datasourceUrl ? 'SET' : 'NOT SET');
        
        super({
            datasources: {
                db: { url: datasourceUrl }
            },
            log: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
        console.log('🔧 PrismaService constructor completed');
    }

    async onModuleInit() {
        this.logger.log('🔄 PrismaService onModuleInit() starting...');
        
        try {
            // Connect to database
            await this.$connect();
            this.logger.log('✅ Database connection established');
            
            // Initialize Accelerate middleware after connection is established
            this.accelerateMiddleware = new AccelerateMiddleware(this);
            this.logger.log('✅ Accelerate middleware initialized');
            
            this.logger.log('✅ PrismaService onModuleInit() completed successfully');
        } catch (error) {
            this.logger.error('❌ Failed to initialize PrismaService:', error);
            throw error;
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