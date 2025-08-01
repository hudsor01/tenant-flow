import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
            console.log('✅ Database connected successfully');
        } catch (error) {
            console.error('❌ Failed to connect to database:', error);
            // In production, continue running even if DB is down initially
            // This allows Railway health checks to pass and service to start
            if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
                console.log('⚠️  Continuing in production mode despite DB connection failure');
            } else {
                throw error;
            }
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    
    async cleanDb() {
        if (this.configService.get<string>('NODE_ENV') === 'production') {
            throw new Error('cleanDb is not allowed in production');
        }

        const modelNames = ['property', 'unit', 'tenant', 'lease', 'maintenanceRequest', 'user', 'subscription', 'webhookEvent', 'document'];

        return Promise.all(
            modelNames.map((modelName) => {
                const model = (this as any)[modelName];
                if (model && typeof model.deleteMany === 'function') {
                    return model.deleteMany();
                }
                return Promise.resolve();
            })
        );
    }
}