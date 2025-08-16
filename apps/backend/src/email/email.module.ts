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
				const redisHost =
					configService.get<string>('REDIS_HOST') ||
					configService.get<string>('REDISHOST')
				const redisPort =
					configService.get<number>('REDIS_PORT') ||
					configService.get<number>('REDISPORT')
				const redisPassword =
					configService.get<string>('REDIS_PASSWORD') ||
					configService.get<string>('REDISPASSWORD')

				// If Redis URL is provided (Railway), use it directly
				if (redisUrl) {
					return {
						redis: {
							// Parse the Redis URL and apply production fixes
							url: redisUrl,
							// Critical production fixes for Bull Redis connection hanging
							maxRetriesPerRequest: null, // Prevents Bull Redis errors
							enableReadyCheck: false, // Prevents subscriber conflicts
							lazyConnect: true, // Connect only when needed
							connectTimeout: 3000, // 3 second connection timeout
							commandTimeout: 2000, // 2 second command timeout
							retryDelayOnFailover: 100,
							maxRetryDelay: 1000,
							// TLS configuration for production Redis
							tls: {}, // Enable TLS for secure connections
							family: 4, // Force IPv4
							keepAlive: 30000, // Keep connection alive
							// Retry strategy with exponential backoff
							retryStrategy: times => {
								const delay = Math.min(times * 50, 1000)
								return delay
							}
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

				// If no Redis is configured in production, log warning but don't fail
				if (!redisHost && process.env.NODE_ENV === 'production') {
					console.error(
						'⚠️ WARNING: Redis not configured in production - email queue disabled'
					)
					console.error(
						'Add Redis plugin in Railway dashboard and link it to backend service'
					)
					// Return a minimal config that won't crash
					return {
						redis: {
							host: 'localhost',
							port: 6379,
							maxRetriesPerRequest: null,
							enableReadyCheck: false,
							lazyConnect: true,
							enableOfflineQueue: true // Allow queueing when Redis isn't available
						},
						defaultJobOptions: {
							removeOnComplete: 100,
							removeOnFail: 50,
							attempts: 1 // Reduce retries since Redis isn't available
						},
						settings: {
							stalledInterval: 300 * 1000, // 5 minutes
							maxStalledCount: 0 // Don't check for stalled jobs
						}
					}
				}

				// Development fallback
				if (!redisHost) {
					console.warn(
						'⚠️ Redis not configured - using local Redis at localhost:6379'
					)
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
						keyPrefix: configService.get<string>(
							'REDIS_KEY_PREFIX',
							'tenantflow:'
						),
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
