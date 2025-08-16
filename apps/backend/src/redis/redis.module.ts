import { Global, Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import IORedis from 'ioredis'
import { RedisService } from './redis.service'
import { CacheService } from './cache.service'
import { RedisPubSubService } from './redis-pubsub.service'
import { CacheMetricsService } from './cache-metrics.service'
import { CacheDebugController } from './cache-debug.controller'

/**
 * Global Redis Module
 * Provides Redis client instances for caching, pub/sub, and Bull queues
 */
@Global()
@Module({
	providers: [
		{
			provide: 'REDIS_CLIENT',
			useFactory: async (configService: ConfigService) => {
				const logger = new Logger('RedisModule')

				const redisUrl =
					configService.get<string>('REDIS_URL') ||
					configService.get<string>('REDIS_CONNECTION_STRING')

				if (!redisUrl) {
					logger.warn(
						'Redis URL not configured, using in-memory fallback'
					)
					return null
				}

				const client = new IORedis(redisUrl, {
					maxRetriesPerRequest: 3,
					retryStrategy: (times: number) => {
						if (times > 3) {
							logger.error(
								`Redis connection failed after ${times} attempts`
							)
							return null
						}
						const delay = Math.min(times * 200, 2000)
						logger.warn(
							`Retrying Redis connection in ${delay}ms...`
						)
						return delay
					},
					reconnectOnError: (err: Error) => {
						const targetErrors = [
							'READONLY',
							'ECONNRESET',
							'ETIMEDOUT'
						]
						if (targetErrors.some(e => err.message.includes(e))) {
							return true
						}
						return false
					}
				})

				client.on('connect', () => {
					logger.log('Redis client connected successfully')
				})

				client.on('error', (err: Error) => {
					logger.error('Redis client error:', err.message)
				})

				client.on('ready', () => {
					logger.log('Redis client ready')
				})

				return client
			},
			inject: [ConfigService]
		},
		RedisService,
		CacheService,
		RedisPubSubService,
		CacheMetricsService
	],
	controllers: [CacheDebugController],
	exports: [
		'REDIS_CLIENT',
		RedisService,
		CacheService,
		RedisPubSubService,
		CacheMetricsService
	]
})
export class RedisModule {}
