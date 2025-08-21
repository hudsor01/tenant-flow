import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { EnvironmentVariables } from '../config/config.schema'

@Injectable()
export class AnalyticsService {
	private posthogKey: string | undefined

	constructor(private configService: ConfigService<EnvironmentVariables>) {
		this.posthogKey = this.configService.get('POSTHOG_KEY', { infer: true })
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
