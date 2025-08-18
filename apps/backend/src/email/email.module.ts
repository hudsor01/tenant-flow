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
import { ResendEmailService } from './services/resend-email.service'
import { EmailProcessor } from '../queues/processors/email.processor'
import { EmailController } from './controllers/email.controller'
import { ExternalApiService } from '../common/services/external-api.service'

@Module({
	imports: [
		// Configure Bull with Redis - Redis is required for email queues
		BullModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => {
				const redisUrl = configService.get<string>('REDIS_URL')
				const redisHost = configService.get<string>('REDIS_HOST')
				const redisPort = configService.get<number>('REDIS_PORT', 6379)

				if (!redisUrl && !redisHost) {
					throw new Error(
						'Redis configuration missing. Please set REDIS_URL or REDIS_HOST environment variables.'
					)
				}

				return {
					redis: redisUrl
						? redisUrl
						: {
								host: redisHost,
								port: redisPort
							},
					defaultJobOptions: {
						removeOnComplete: 100,
						removeOnFail: 50,
						attempts: 3,
						backoff: {
							type: 'exponential',
							delay: 2000
						}
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
		ResendEmailService,
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
