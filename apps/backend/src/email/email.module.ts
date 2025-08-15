import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { ScheduleModule } from '@nestjs/schedule'
import { EmailService } from './email.service'
import { EmailQueueService } from './services/email-queue.service'
import { EmailMetricsService } from './services/email-metrics.service'
import { EmailIntegrationService } from './services/email-integration.service'
import { EmailTemplateService } from './services/email-template.service'
import { EmailProcessor } from './processors/email.processor'
import { EmailController } from './controllers/email.controller'
import { ExternalApiService } from '../common/services/external-api.service'

@Module({
  imports: [
    // Configure Bull for email queue (optional - only if Redis is configured)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Railway provides REDIS_URL when Redis plugin is added
        const redisUrl = configService.get<string>('REDIS_URL')
        // Fallback to individual Redis config
        const redisHost = configService.get<string>('REDIS_HOST') || configService.get<string>('REDISHOST')
        const redisPort = configService.get<number>('REDIS_PORT') || configService.get<number>('REDISPORT')
        const redisPassword = configService.get<string>('REDIS_PASSWORD') || configService.get<string>('REDISPASSWORD')
        
        // If Redis URL is provided (Railway), use it directly
        if (redisUrl) {
          return {
            redis: redisUrl, // Bull accepts a Redis URL string directly
            defaultJobOptions: {
              removeOnComplete: 100,
              removeOnFail: 50,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000
              }
            },
            settings: {
              stalledInterval: 30 * 1000,
              maxStalledCount: 1
            }
          }
        }
        
        // If no Redis is configured at all, fail fast in production
        if (!redisHost && process.env.NODE_ENV === 'production') {
          throw new Error('Redis is required in production. Add Redis plugin in Railway dashboard.')
        }
        
        // Development fallback
        if (!redisHost) {
          console.warn('⚠️ Redis not configured - using local Redis at localhost:6379')
          return {
            redis: {
              host: 'localhost',
              port: 6379,
              maxRetriesPerRequest: null,
              enableReadyCheck: false
            },
            defaultJobOptions: {
              removeOnComplete: 100,
              removeOnFail: 50,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000
              }
            },
            settings: {
              stalledInterval: 30 * 1000,
              maxStalledCount: 1
            }
          }
        }
        
        // Use individual Redis config
        return {
          redis: {
            host: redisHost,
            port: redisPort || 6379,
            password: redisPassword,
            db: configService.get<number>('REDIS_DB', 0),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true,
            keepAlive: 30000,
            family: 4,
            keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'tenantflow:'),
            retryDelayOnFailover: 100,
            maxLoadingTimeout: 5000
          },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            }
          },
          settings: {
            stalledInterval: 30 * 1000,
            maxStalledCount: 1
          }
        }
      },
      inject: [ConfigService]
    }),

    // Register email queue
    BullModule.registerQueue({
      name: 'email'
    }),

    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3
    }),

    ScheduleModule.forRoot(),
    ConfigModule
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailQueueService,
    EmailMetricsService,
    EmailIntegrationService,
    EmailTemplateService,
    EmailProcessor,
    ExternalApiService
  ],
  exports: [
    EmailService,
    EmailQueueService,
    EmailMetricsService,
    EmailIntegrationService
  ]
})
export class EmailModule {}