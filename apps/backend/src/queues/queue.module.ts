import { DynamicModule, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { QueueService } from './queue.service'
import { EmailProcessor } from '../email/processors/email.processor'
import { PaymentProcessor } from './processors/payment.processor'
import { QueueErrorHandlerService } from './services/queue-error-handler.service'
import { QueueMetricsService } from './services/queue-metrics.service'
import { FUTURE_QUEUE_NAMES, QUEUE_NAMES } from './constants/queue-names'

// Re-export for backward compatibility
export { QUEUE_NAMES, FUTURE_QUEUE_NAMES }

@Module({})
export class QueueModule {
	static forRoot(): DynamicModule {
		return {
			module: QueueModule,
			imports: [
				ConfigModule,
				HttpModule,
				// Register Bull queues
				BullModule.forRootAsync({
					imports: [ConfigModule],
					useFactory: async (configService: ConfigService) => {
						const redisUrl = configService.get<string>('REDIS_URL')
						const redisHost =
							configService.get<string>('REDIS_HOST')

						// Base Redis configuration following official Bull patterns
						const baseRedisConfig = {
							maxRetriesPerRequest: 3,
							enableReadyCheck: false,
							lazyConnect: true,
							connectTimeout: 10000,
							commandTimeout: 5000,
							retryDelayOnFailover: 100,
							enableOfflineQueue: false,
							// Official Bull retry strategy with exponential backoff
							retryStrategy: (times: number) => {
								const delay = Math.min(
									Math.pow(2, times) * 100,
									3000
								)
								return delay + Math.random() * 100 // Add jitter
							}
						}

						// Default job options following official Bull best practices
						const defaultJobOptions = {
							attempts: 3,
							backoff: {
								type: 'exponential' as const,
								delay: 2000
							},
							removeOnComplete: 100,
							removeOnFail: 500,
							// Add timeout to prevent hanging jobs
							timeout: 300000, // 5 minutes
							// Enable job progress tracking
							progress: true
						}

						if (!redisUrl && !redisHost) {
							// Development fallback configuration
							return {
								redis: {
									host: 'localhost',
									port: 6379,
									...baseRedisConfig
								},
								defaultJobOptions
							}
						}

						if (redisUrl) {
							return {
								redis: {
									url: redisUrl,
									...baseRedisConfig
								},
								defaultJobOptions
							}
						}

						return {
							redis: {
								host: redisHost || 'localhost',
								port:
									configService.get<number>('REDIS_PORT') ||
									6379,
								password:
									configService.get<string>('REDIS_PASSWORD'),
								...baseRedisConfig
							},
							defaultJobOptions
						}
					},
					inject: [ConfigService]
				}),
				// Register only active queues with functional processors
				BullModule.registerQueue(
					{
						name: QUEUE_NAMES.EMAILS,
						defaultJobOptions: {
							attempts: 3,
							backoff: { type: 'exponential', delay: 10000 },
							removeOnComplete: 50,
							removeOnFail: 200
						}
					},
					{
						name: QUEUE_NAMES.PAYMENTS,
						defaultJobOptions: {
							attempts: 5,
							backoff: { type: 'exponential', delay: 3000 },
							removeOnComplete: 100,
							removeOnFail: 500
						}
					}
				)
			],
			providers: [
				QueueService,
				EmailProcessor,
				PaymentProcessor,
				QueueErrorHandlerService,
				QueueMetricsService
			],
			exports: [QueueService]
		}
	}
}
