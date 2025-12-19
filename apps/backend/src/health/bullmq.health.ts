import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'
import type { Queue } from 'bullmq'
import { AppConfigService } from '../config/app-config.service'

@Injectable()
export class BullMqHealthIndicator {
	constructor(
		@InjectQueue('emails') private readonly emailQueue: Queue,
		private readonly healthIndicatorService: HealthIndicatorService,
		private readonly config: AppConfigService
	) {}

	async quickPing<const TKey extends string>(key: TKey) {
		const indicator = this.healthIndicatorService.check(key)
		const startTime = Date.now()

		try {
			await Promise.race([this.emailQueue.getWaitingCount(), this.createTimeoutPromise(1000)])

			const responseTime = Date.now() - startTime
			return indicator.up({
				responseTime,
				queue: this.emailQueue.name,
				redis: {
					hasUrl: !!this.config.getRedisUrl(),
					hasHost: !!this.config.getRedisHost()
				}
			})
		} catch (error: unknown) {
			const responseTime = Date.now() - startTime

			return indicator.down({
				responseTime,
				queue: this.emailQueue.name,
				redis: {
					hasUrl: !!this.config.getRedisUrl(),
					hasHost: !!this.config.getRedisHost()
				},
				error: {
					message: error instanceof Error ? error.message : String(error),
					type: error instanceof Error ? error.constructor.name : 'Unknown'
				}
			})
		}
	}

	private createTimeoutPromise(timeoutMs: number): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Redis timeout after ${timeoutMs}ms`))
			}, timeoutMs)
		})
	}
}

