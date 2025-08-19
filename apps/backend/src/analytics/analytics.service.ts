import { Injectable } from '@nestjs/common'

@Injectable()
export class AnalyticsService {
	private posthogKey = process.env.POSTHOG_KEY

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
