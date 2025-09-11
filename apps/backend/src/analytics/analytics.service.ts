import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PinoLogger } from 'nestjs-pino'
import type { Config } from '../config/config.schema'

@Injectable()
export class AnalyticsService {
	private posthogKey: string | undefined

	constructor(
		@Inject(ConfigService) private readonly configService: ConfigService<Config>,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
		try {
			this.posthogKey = this.configService.get('POSTHOG_KEY')
			if (this.posthogKey) {
				this.logger.info(
					{ posthog: { enabled: true, configured: true } },
					'PostHog analytics enabled'
				)
			} else {
				this.logger.info(
					{ posthog: { enabled: false, configured: false } },
					'PostHog key not configured, analytics disabled'
				)
			}
		} catch (error) {
			this.logger.warn(
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error)
					},
					posthog: { enabled: false, configured: false }
				},
				'Failed to initialize PostHog configuration, disabling analytics'
			)
			this.posthogKey = undefined
		}
	}

	track(userId: string, event: string, properties?: Record<string, unknown>) {
		if (!this.posthogKey) {
			return
		}

		// Simple PostHog tracking
		fetch('https://app.posthog.com/capture/', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				api_key: this.posthogKey,
				event,
				properties: { distinct_id: userId, ...properties },
				timestamp: new Date().toISOString()
			})
		}).catch(console.error)
	}
}
