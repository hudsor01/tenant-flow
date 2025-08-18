import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { PostHog } from 'posthog-node'
import { ConfigService } from '@nestjs/config'

export interface PaymentAnalyticsEvent {
	userId: string
	event: string
	properties: Record<string, unknown>
	timestamp?: Date
}

export interface SubscriptionAnalyticsEvent {
	userId: string
	subscriptionId: string
	event: string
	properties: Record<string, unknown>
	timestamp?: Date
}

@Injectable()
export class PostHogAnalyticsService implements OnModuleInit {
	private readonly logger = new Logger(PostHogAnalyticsService.name)
	private posthog: PostHog | null = null
	private readonly isEnabled: boolean

	constructor(private readonly configService: ConfigService) {
		this.isEnabled = this.configService.get<boolean>(
			'POSTHOG_ENABLED',
			false
		)
	}

	async onModuleInit() {
		if (this.isEnabled) {
			const apiKey = this.configService.get<string>('POSTHOG_API_KEY')
			const host = this.configService.get<string>(
				'POSTHOG_HOST',
				'https://app.posthog.com'
			)

			if (!apiKey) {
				this.logger.warn(
					'PostHog API key not configured - analytics disabled'
				)
				return
			}

			try {
				this.posthog = new PostHog(apiKey, {
					host,
					flushAt: 20, // Flush after 20 events
					flushInterval: 10000, // Flush every 10 seconds
					personalApiKey: this.configService.get<string>(
						'POSTHOG_PERSONAL_API_KEY'
					),
					featureFlagsPollingInterval: 30000 // Poll feature flags every 30 seconds
				})

				this.logger.log('PostHog analytics initialized successfully')
			} catch (error) {
				this.logger.error('Failed to initialize PostHog:', error)
			}
		} else {
			this.logger.log('PostHog analytics disabled')
		}
	}

	/**
	 * Track payment-related events
	 */
	async trackPaymentEvent(data: PaymentAnalyticsEvent): Promise<void> {
		if (!this.posthog || !this.isEnabled) {
			return
		}

		try {
			await this.posthog.capture({
				distinctId: data.userId,
				event: data.event,
				properties: {
					...data.properties,
					$timestamp: data.timestamp || new Date(),
					category: 'payment',
					source: 'backend_api'
				}
			})

			this.logger.debug(
				`Payment event tracked: ${data.event} for user ${data.userId}`
			)
		} catch (error) {
			this.logger.error('Failed to track payment event:', error)
		}
	}

	/**
	 * Track subscription lifecycle events
	 */
	async trackSubscriptionEvent(
		data: SubscriptionAnalyticsEvent
	): Promise<void> {
		if (!this.posthog || !this.isEnabled) {
			return
		}

		try {
			await this.posthog.capture({
				distinctId: data.userId,
				event: data.event,
				properties: {
					...data.properties,
					subscriptionId: data.subscriptionId,
					$timestamp: data.timestamp || new Date(),
					category: 'subscription',
					source: 'backend_api'
				}
			})

			this.logger.debug(
				`Subscription event tracked: ${data.event} for user ${data.userId}`
			)
		} catch (error) {
			this.logger.error('Failed to track subscription event:', error)
		}
	}

	/**
	 * Track payment funnel events
	 */
	async trackPaymentFunnel(
		userId: string,
		step: string,
		properties: Record<string, unknown> = {}
	): Promise<void> {
		await this.trackPaymentEvent({
			userId,
			event: `payment_funnel_${step}`,
			properties: {
				funnel_step: step,
				...properties
			}
		})
	}

	/**
	 * Track subscription funnel events
	 */
	async trackSubscriptionFunnel(
		userId: string,
		subscriptionId: string,
		step: string,
		properties: Record<string, unknown> = {}
	): Promise<void> {
		await this.trackSubscriptionEvent({
			userId,
			subscriptionId,
			event: `subscription_funnel_${step}`,
			properties: {
				funnel_step: step,
				...properties
			}
		})
	}

	/**
	 * Track revenue events for business analytics
	 */
	async trackRevenue(
		userId: string,
		amount: number,
		currency: string,
		properties: Record<string, unknown> = {}
	): Promise<void> {
		await this.trackPaymentEvent({
			userId,
			event: 'revenue_generated',
			properties: {
				revenue: amount,
				currency,
				...properties
			}
		})
	}

	/**
	 * Track churn events
	 */
	async trackChurn(
		userId: string,
		subscriptionId: string,
		reason: string,
		properties: Record<string, unknown> = {}
	): Promise<void> {
		await this.trackSubscriptionEvent({
			userId,
			subscriptionId,
			event: 'subscription_churned',
			properties: {
				churn_reason: reason,
				...properties
			}
		})
	}

	/**
	 * Identify user for cohort analysis
	 */
	async identifyUser(
		userId: string,
		properties: Record<string, unknown> = {}
	): Promise<void> {
		if (!this.posthog || !this.isEnabled) {
			return
		}

		try {
			await this.posthog.identify({
				distinctId: userId,
				properties: {
					...properties,
					$timestamp: new Date()
				}
			})

			this.logger.debug(`User identified: ${userId}`)
		} catch (error) {
			this.logger.error('Failed to identify user:', error)
		}
	}

	/**
	 * Create user group for multi-tenant analytics
	 */
	async createGroup(
		groupType: string,
		groupId: string,
		properties: Record<string, unknown> = {}
	): Promise<void> {
		if (!this.posthog || !this.isEnabled) {
			return
		}

		try {
			await this.posthog.groupIdentify({
				groupType,
				groupKey: groupId,
				properties: {
					...properties,
					$timestamp: new Date()
				}
			})

			this.logger.debug(`Group identified: ${groupType}:${groupId}`)
		} catch (error) {
			this.logger.error('Failed to identify group:', error)
		}
	}

	/**
	 * Flush pending events (useful for testing and shutdown)
	 */
	async flush(): Promise<void> {
		if (!this.posthog || !this.isEnabled) {
			return
		}

		try {
			await this.posthog.flush()
			this.logger.debug('PostHog events flushed')
		} catch (error) {
			this.logger.error('Failed to flush PostHog events:', error)
		}
	}

	/**
	 * Shutdown PostHog client
	 */
	async shutdown(): Promise<void> {
		if (!this.posthog || !this.isEnabled) {
			return
		}

		try {
			await this.posthog.shutdown()
			this.logger.log('PostHog analytics shut down')
		} catch (error) {
			this.logger.error('Failed to shutdown PostHog:', error)
		}
	}
}
