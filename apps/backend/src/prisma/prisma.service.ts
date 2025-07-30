import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private accelerateClient: PrismaClient | null = null;
    private isAccelerateEnabled = false;
    
    constructor(
        @Inject(forwardRef(() => ConfigService))
        private configService: ConfigService
    ) {
        const accelerateUrl = configService.get<string>('PRISMA_ACCELERATE_URL');
        const enableAccelerate = configService.get<string>('ENABLE_PRISMA_ACCELERATE') === 'true';
        
        // Use Accelerate URL if provided and enabled
        const datasourceUrl = enableAccelerate && accelerateUrl ? accelerateUrl : configService.get<string>('DATABASE_URL');
        
        super({
            datasources: {
                db: { url: datasourceUrl }
            },
            log: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
        
        // If Accelerate is enabled, create an extended client
        if (enableAccelerate && accelerateUrl) {
            this.accelerateClient = this.$extends(withAccelerate()) as unknown as PrismaClient;
            this.isAccelerateEnabled = true;
            console.log('✅ Prisma Accelerate enabled');
        }
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    // Override property accessors to use Accelerate client when available
    override get property() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.property : super.property;
    }
    
    override get unit() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.unit : super.unit;
    }
    
    override get tenant() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.tenant : super.tenant;
    }
    
    override get lease() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.lease : super.lease;
    }
    
    override get maintenanceRequest() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.maintenanceRequest : super.maintenanceRequest;
    }
    
    override get user() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.user : super.user;
    }
    
    // Additional model accessors (from our schema)
    override get subscription() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.subscription : super.subscription;
    }
    
    override get webhookEvent() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.webhookEvent : super.webhookEvent;
    }
    
    override get document() {
        return this.isAccelerateEnabled && this.accelerateClient ? this.accelerateClient.document : super.document;
    }
    
    // Note: Transaction and raw query methods automatically use Accelerate client 
    // when the extended client is used, no override needed
    
    async cleanDb() {
        if (this.configService.get<string>('NODE_ENV') === 'production') {
            throw new Error('cleanDb is not allowed in production');
        }

        const models = Reflect.ownKeys(this).filter(
            (key) => typeof key === 'string' && key[0] !== '_' && key[0] !== '$' && key !== 'constructor'
        );

        return Promise.all(
            models.map((modelKey) => {
                const key = modelKey as string;
                const model = this[key as keyof this];
                if (
                    model &&
                    typeof model === 'object' &&
                    'deleteMany' in model &&
                    typeof model.deleteMany === 'function'
                ) {
                    return (model.deleteMany as () => Promise<{ count: number }>)();
                }
                return Promise.resolve();
            })
        );
    }
}