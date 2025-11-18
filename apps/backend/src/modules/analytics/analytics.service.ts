import { Injectable, Logger } from '@nestjs/common'
import type { MobileAnalyticsEvent } from './dto/mobile-analytics-event.dto'

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
	user_id?: string
}

@Injectable()
export class AnalyticsService {
	private readonly logger = new Logger(AnalyticsService.name)
	private static readonly SENSITIVE_PROPERTY_KEYS = [
		'password',
		'secret',
		'token',
		'authorization',
		'cookie'
	]
	private static readonly MAX_PROPERTY_COUNT = 25
	private static readonly MAX_STRING_LENGTH = 256

	track(user_id: string, event: string, properties?: Record<string, unknown>) {
		this.logger.debug('Analytics event captured', {
			user_id,
			event,
			properties
		})
	}

	recordWebVitalMetric(metric: WebVitalData, distinctId?: string) {
		const { user_id, sessionId, ...properties } = metric
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
			distinctId ?? user_id ?? sessionId ?? metric.id,
			eventName,
			eventProperties
		)
	}

	recordMobileEvent(event: MobileAnalyticsEvent) {
		const sanitizedProperties = this.sanitizeProperties(event.properties ?? {})
		const distinctId =
			(typeof sanitizedProperties.user_id === 'string' &&
				sanitizedProperties.user_id) ||
			this.buildAnonymousId(event)

		const payload: Record<string, unknown> = {
			userAgent: event.userAgent,
			screenResolution: event.screenResolution,
			networkType: event.networkType,
			isOnline: event.isOnline,
			timestamp: new Date(event.timestamp).toISOString(),
			properties: sanitizedProperties,
			source: 'mobile-analytics-endpoint'
		}

		this.track(distinctId, `mobile:${event.eventName}`, payload)
	}

	private sanitizeProperties(properties: Record<string, unknown>) {
		const entries = Object.entries(properties)
			.slice(0, AnalyticsService.MAX_PROPERTY_COUNT)
			.filter(([key, value]) => this.isAllowedProperty(key, value))
			.map(([key, value]) => [key, this.normalizeValue(value as string | number | boolean | null)] as const)

		return Object.fromEntries(entries)
	}

	private isAllowedProperty(key: string, value: unknown) {
		if (!key) {
			return false
		}

		const lowerKey = key.toLowerCase()
		if (
			AnalyticsService.SENSITIVE_PROPERTY_KEYS.some(sensitive =>
				lowerKey.includes(sensitive)
			)
		) {
			return false
		}

		return (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean' ||
			value === null
		)
	}

	private normalizeValue(value: string | number | boolean | null) {
		if (typeof value === 'string') {
			return value.slice(0, AnalyticsService.MAX_STRING_LENGTH)
		}
		return value
	}

	private buildAnonymousId(event: MobileAnalyticsEvent) {
		const agentHash = Buffer.from(event.userAgent)
			.toString('base64')
			.slice(0, 12)
		return `mobile:${agentHash || 'unknown'}`
	}
}
