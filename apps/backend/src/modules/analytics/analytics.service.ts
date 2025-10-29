import { Injectable, Logger } from '@nestjs/common'

// Local type definition - web vitals removed from frontend but keeping backend endpoint
interface WebVitalData {
	name: string
	value: number
	rating: 'good' | 'needs-improvement' | 'poor'
	delta: number
	id: string
	page: string
	timestamp?: string
	sessionId?: string
	userId?: string
}

@Injectable()
export class AnalyticsService {
	private readonly logger = new Logger(AnalyticsService.name)

	track(userId: string, event: string, properties?: Record<string, unknown>) {
		this.logger.debug('Analytics event captured', {
			userId,
			event,
			properties
		})
	}

	recordWebVitalMetric(metric: WebVitalData, distinctId?: string) {
		const { userId, sessionId, ...properties } = metric
		const eventProperties: Record<string, unknown> = {
			...properties,
			sessionId,
			receivedAt: new Date().toISOString(),
			source: 'web-vitals-endpoint'
		}

		if (!eventProperties.timestamp) {
			eventProperties.timestamp = eventProperties.receivedAt
		}

		const eventName = `web_vital:${metric.name.toLowerCase()}`
		this.track(
			distinctId ?? userId ?? sessionId ?? metric.id,
			eventName,
			eventProperties
		)
	}
}
