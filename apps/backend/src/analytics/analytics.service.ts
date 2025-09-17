import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Config } from '../config/config.schema'

@Injectable()
export class AnalyticsService {
	private readonly logger = new Logger(AnalyticsService.name)
	private posthogKey: string | undefined

	constructor(
		@Inject(ConfigService) private readonly configService: ConfigService<Config>
	) {
		try {
			this.posthogKey = this.configService.get('POSTHOG_KEY')
			if (this.posthogKey) {
				this.logger.log(
					'PostHog analytics enabled',
					{ posthog: { enabled: true, configured: true } }
				)
			} else {
				this.logger.log(
					'PostHog key not configured, analytics disabled',
					{ posthog: { enabled: false, configured: false } }
				)
			}
		} catch (error) {
			this.logger.warn(
				'Failed to initialize PostHog configuration, disabling analytics',
				{
					error: {
						name: error instanceof Error ? error.constructor.name : 'Unknown',
						message: error instanceof Error ? error.message : String(error)
					},
					posthog: { enabled: false, configured: false }
				}
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
