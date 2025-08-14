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
    // Configure Bull for email queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          family: 4, // IPv4
          keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'tenantflow:'),
          retryDelayOnFailover: 100,
          enableReadyCheck: true,
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
          stalledInterval: 30 * 1000, // 30 seconds
          maxStalledCount: 1
        }
      }),
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