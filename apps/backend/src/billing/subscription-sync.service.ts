import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { StripeService } from './stripe.service'
import { ErrorHandlerService } from '../services/error-handler.service'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { StructuredLoggerService } from '../services/structured-logger.service'
import {
	SubscriptionCanceledEvent,
	SubscriptionCreatedEvent,
	SubscriptionEventType,
	SubscriptionUpdatedEvent,
	TrialWillEndEvent
} from '../shared/events/subscription.events'
import { 
	type PlanType,
	type StripeSubscription, 
	type Subscription,
	SubStatus 
} from '@repo/shared'
import { SupabaseService } from '../database/supabase.service'

// Note: StripeSubscription from our official types already includes current_period properties
// Using our comprehensive StripeSubscription type instead of extending StripeSubscription
type StripeSubscriptionWithPeriods = StripeSubscription

export interface SubscriptionSyncResult {
	success: boolean
	subscription?: Subscription
	changes?: string[]
	error?: string
}

export interface SubscriptionState {
	subscription: Subscription | null
	stripeSubscription: StripeSubscription | null
	isSync: boolean
	lastSyncAt?: Date
	discrepancies?: string[]
}

/**
 * Comprehensive subscription state synchronization service
 *
 * Responsibilities:
 * - Sync subscription data between Stripe and database
 * - Detect and resolve state discrepancies
 * - Emit events for subscription changes
 * - Handle subscription lifecycle events
 * - Maintain data consistency across systems
 */
@Injectable()
export class SubscriptionSyncService {
	private readonly logger = new Logger(SubscriptionSyncService.name)
	private readonly structuredLogger: StructuredLoggerService

	// Cache for recent sync operations to prevent duplicate work
	private readonly syncCache = new Map<
		string,
		{ result: SubscriptionSyncResult; timestamp: Date }
	>()
	private readonly cacheExpiry = 5 * 60 * 1000 // 5 minutes

	constructor(
		private readonly supabaseService: SupabaseService,
		@Inject(forwardRef(() => StripeService))
		private readonly stripeService: StripeService,
		private readonly subscriptionManager: SubscriptionsManagerService,
		private readonly eventEmitter: EventEmitter2,
		private readonly errorHandler: ErrorHandlerService
	) {
		this.structuredLogger = new StructuredLoggerService()

		// Clean up cache every 10 minutes
		setInterval(
			() => {
				this.cleanupSyncCache()
			},
			10 * 60 * 1000
		)
	}

	/**
	 * Sync a subscription from Stripe webhook event
	 * Primary entry point for webhook-driven synchronization
	 */
	async syncSubscriptionFromWebhook(
		stripeSubscription: StripeSubscription
	): Promise<SubscriptionSyncResult> {
		const correlationId = `webhook-${stripeSubscription.id}-${Date.now()}`

		try {
			this.structuredLogger.info('Starting webhook subscription sync', {
				subscriptionId: stripeSubscription.id,
				status: stripeSubscription.status,
				customerId: stripeSubscription.customer,
				correlationId,
				operation: 'subscription.sync.webhook'
			})

			// Find user by Stripe customer ID
			const user = await this.findUserByCustomerId(
				stripeSubscription.customer as string
			)
			if (!user) {
				throw new Error(
					`User not found for customer ${stripeSubscription.customer}`
				)
			}

			const result = await this.performSubscriptionSync(
				user.id,
				stripeSubscription as StripeSubscriptionWithPeriods,
				correlationId
			)

			if (result.success && result.subscription) {
				await this.emitSubscriptionEvents(
					result.subscription,
					stripeSubscription,
					result.changes || []
				)
			}

			return result
		} catch (error) {
			this.logger.error('Webhook subscription sync failed', {
				subscriptionId: stripeSubscription.id,
				error: error instanceof Error ? error.message : String(error),
				correlationId
			})

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	}

	/**
	 * Sync subscription for a specific user
	 * Used for on-demand synchronization and consistency checks
	 */
	async syncUserSubscription(
		userId: string,
		force = false
	): Promise<SubscriptionSyncResult> {
		const cacheKey = `user-${userId}`
		const correlationId = `user-sync-${userId}-${Date.now()}`

		// Check cache unless forced
		if (!force) {
			const cached = this.syncCache.get(cacheKey)
			if (
				cached &&
				Date.now() - cached.timestamp.getTime() < this.cacheExpiry
			) {
				this.structuredLogger.debug('Returning cached sync result', {
					userId,
					correlationId,
					cacheAge: Date.now() - cached.timestamp.getTime()
				})
				return cached.result
			}
		}

		try {
			this.structuredLogger.info('Starting user subscription sync', {
				userId,
				force,
				correlationId,
				operation: 'subscription.sync.user'
			})

			// Get current subscription from database
			const dbSubscriptionRaw =
				await this.subscriptionManager.getUserSubscription(userId)
			let dbSubscription: Subscription | null = null
			if (dbSubscriptionRaw) {
				dbSubscription = {
					...(dbSubscriptionRaw as Record<string, unknown>),
					plan:
						(dbSubscriptionRaw as Record<string, unknown>).plan ??
						'FREETRIAL',
					planType:
						(dbSubscriptionRaw as Record<string, unknown>)
							.planType ?? 'FREETRIAL'
				} as Subscription
			}

			if (!dbSubscription?.stripeSubscriptionId) {
				// No Stripe subscription exists, sync not needed
				const result: SubscriptionSyncResult = {
					success: true,
					subscription: dbSubscription || undefined,
					changes: []
				}
				this.syncCache.set(cacheKey, { result, timestamp: new Date() })
				return result
			}

			// Fetch current state from Stripe
			const stripeSubscription =
				await this.stripeService.client.subscriptions.retrieve(
					dbSubscription.stripeSubscriptionId
				)

			const result = await this.performSubscriptionSync(
				userId,
				stripeSubscription as unknown as StripeSubscriptionWithPeriods,
				correlationId
			)

			// Cache the result
			this.syncCache.set(cacheKey, { result, timestamp: new Date() })

			return result
		} catch (error) {
			this.logger.error('User subscription sync failed', {
				userId,
				error: error instanceof Error ? error.message : String(error),
				correlationId
			})

			const result: SubscriptionSyncResult = {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			}

			this.syncCache.set(cacheKey, { result, timestamp: new Date() })
			return result
		}
	}

	/**
	 * Get comprehensive subscription state for debugging
	 */
	async getSubscriptionState(userId: string): Promise<SubscriptionState> {
		try {
			const dbSubscriptionRaw =
				await this.subscriptionManager.getUserSubscription(userId)
			let dbSubscription: Subscription | null = null
			if (dbSubscriptionRaw) {
				// Ensure required Subscription fields exist - normalize the returned record
				dbSubscription = {
					...(dbSubscriptionRaw as Record<string, unknown>),
					plan:
						(dbSubscriptionRaw as Record<string, unknown>).plan ??
						'FREETRIAL',
					planType:
						(dbSubscriptionRaw as Record<string, unknown>)
							.planType ?? 'FREETRIAL'
				} as Subscription
			}
			let stripeSubscription: StripeSubscription | null = null
			let discrepancies: string[] = []

			if (dbSubscription?.stripeSubscriptionId) {
				try {
					const subscription =
						await this.stripeService.client.subscriptions.retrieve(
							dbSubscription.stripeSubscriptionId,
							{ expand: ['customer', 'latest_invoice'] }
						)

					// Cast to our StripeSubscription type
					stripeSubscription =
						subscription as unknown as StripeSubscription

					// Detect discrepancies only if stripeSubscription is not null
					if (stripeSubscription) {
						discrepancies = this.detectDiscrepancies(
							dbSubscription,
							stripeSubscription
						)
					}
				} catch (error) {
					discrepancies.push(
						`Unable to fetch Stripe subscription: ${error}`
					)
				}
			}

			return {
				subscription: dbSubscription,
				stripeSubscription,
				isSync: discrepancies.length === 0,
				discrepancies:
					discrepancies.length > 0 ? discrepancies : undefined
			}
		} catch (error) {
			throw new Error(`Failed to get subscription state: ${error}`)
		}
	}

	/**
	 * Bulk sync multiple users - useful for data consistency audits
	 */
	async bulkSyncSubscriptions(
		userIds: string[],
		options: {
			batchSize?: number
			delayMs?: number
			onProgress?: (
				completed: number,
				total: number,
				errors: number
			) => void
		} = {}
	): Promise<{
		completed: number
		errors: number
		results: { userId: string; result: SubscriptionSyncResult }[]
	}> {
		const { batchSize = 10, delayMs = 100, onProgress } = options
		const results: { userId: string; result: SubscriptionSyncResult }[] = []
		let completed = 0
		let errors = 0

		this.logger.log(`Starting bulk sync for ${userIds.length} users`, {
			userCount: userIds.length,
			batchSize,
			delayMs
		})

		// Process in batches to avoid overwhelming the API
		for (let i = 0; i < userIds.length; i += batchSize) {
			const batch = userIds.slice(i, i + batchSize)

			const batchPromises = batch.map(async userId => {
				try {
					const result = await this.syncUserSubscription(userId, true)
					if (!result.success) {
						errors++
					}
					completed++

					return { userId, result }
				} catch (error) {
					errors++
					completed++

					return {
						userId,
						result: {
							success: false,
							error:
								error instanceof Error
									? error.message
									: 'Unknown error'
						}
					}
				}
			})

			const batchResults = await Promise.all(batchPromises)
			results.push(...batchResults)

			// Report progress
			if (onProgress) {
				onProgress(completed, userIds.length, errors)
			}

			// Delay between batches to be API-friendly
			if (i + batchSize < userIds.length && delayMs > 0) {
				await new Promise(resolve => setTimeout(resolve, delayMs))
			}
		}

		this.logger.log(`Bulk sync completed`, {
			totalUsers: userIds.length,
			completed,
			errors,
			successRate:
				(((completed - errors) / completed) * 100).toFixed(1) + '%'
		})

		return { completed, errors, results }
	}

	/**
	 * Core synchronization logic
	 */
	private async performSubscriptionSync(
		userId: string,
		stripeSubscription: StripeSubscriptionWithPeriods,
		correlationId: string
	): Promise<SubscriptionSyncResult> {
		const changes: string[] = []

		try {
			// Get current database subscription
			const currentSubscription =
				await this.subscriptionManager.getUserSubscription(userId)

			// Determine the plan type from Stripe subscription
			const planType = this.mapStripeToPlanType(stripeSubscription)
			const status = this.mapStripeStatus(stripeSubscription.status)

			// Prepare subscription update data
			const updateData: Record<string, unknown> = {
				planType,
				plan: planType, // Add plan field for compatibility
				status,
				stripeSubscriptionId: stripeSubscription.id,
				stripeCustomerId: stripeSubscription.customer as string,
				currentPeriodStart: new Date(
					stripeSubscription.current_period_start * 1000
				),
				currentPeriodEnd: new Date(
					stripeSubscription.current_period_end * 1000
				),
				cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
				updatedAt: new Date()
			}

			// Add trial information if applicable
			if (
				stripeSubscription.trial_start &&
				stripeSubscription.trial_end
			) {
				updateData.trialStart = new Date(
					stripeSubscription.trial_start * 1000
				)
				updateData.trialEnd = new Date(
					stripeSubscription.trial_end * 1000
				)
			}

			// Add cancellation information if applicable
			if (stripeSubscription.canceled_at) {
				updateData.canceledAt = new Date(
					stripeSubscription.canceled_at * 1000
				)
			}

			// Track changes for event emission
			if (!currentSubscription) {
				changes.push('created')
			} else {
				// Cast to ensure TypeScript knows it's not null
				const existingSubscription = currentSubscription as Record<
					string,
					unknown
				>

				if (existingSubscription.planType !== planType) {
					changes.push(
						`plan: ${existingSubscription.planType} → ${planType}`
					)
				}

				// Normalize statuses to strings (lowercase) to safely compare different enum/union types
				const currentStatus = String(
					existingSubscription.status
				).toLowerCase()
				const newStatus = String(status).toLowerCase()
				if (currentStatus !== newStatus) {
					changes.push(
						`status: ${existingSubscription.status} → ${status}`
					)
				}

				if (
					existingSubscription.cancelAtPeriodEnd !==
					stripeSubscription.cancel_at_period_end
				) {
					changes.push(
						`cancelAtPeriodEnd: ${existingSubscription.cancelAtPeriodEnd} → ${stripeSubscription.cancel_at_period_end}`
					)
				}
			}

			// Upsert subscription in database
			const { data: subscription, error } = await this.supabaseService
				.getAdminClient()
				.from('Subscription')
				.upsert({
					userId,
					status: 'ACTIVE', // Default status
					...updateData
				})
				.select()
				.single()

			if (error) {
				throw new Error(
					`Failed to upsert subscription: ${error.message}`
				)
			}

			this.structuredLogger.info('Subscription sync completed', {
				userId,
				subscriptionId: stripeSubscription.id,
				planType,
				status,
				changes,
				correlationId,
				operation: 'subscription.sync.complete'
			})

			return {
				success: true,
				subscription: subscription as unknown as Subscription,
				changes
			}
		} catch (error) {
			this.structuredLogger.error(
				'Subscription sync failed',
				undefined,
				{
					error: error as Error,
					userId,
					subscriptionId: stripeSubscription.id,
					correlationId,
					operation: 'subscription.sync.error'
				}
			)

			throw this.errorHandler.handleError(error as Error, {
				operation: 'SubscriptionSyncService.performSubscriptionSync',
				resource: 'subscription',
				metadata: {
					userId,
					subscriptionId: stripeSubscription.id,
					correlationId
				}
			})
		}
	}

	/**
	 * Emit appropriate events based on subscription changes
	 */
	private async emitSubscriptionEvents(
		subscription: Subscription,
		stripeSubscription: StripeSubscription,
		changes: string[]
	): Promise<void> {
		try {
			const eventData = {
				userId: subscription.userId,
				subscriptionId: stripeSubscription.id,
				planType: subscription.planType || 'FREETRIAL',
				customerId: subscription.stripeCustomerId || ''
			}

			// Determine which events to emit based on changes
			if (changes.includes('created')) {
				const event: SubscriptionCreatedEvent = {
					...eventData,
					timestamp: new Date()
				}
				this.eventEmitter.emit(SubscriptionEventType.CREATED, event)
			} else if (
				changes.some(
					change =>
						change.startsWith('plan:') ||
						change.startsWith('status:')
				)
			) {
				// const _planChange = changes.find(change =>
				// 	change.startsWith('plan:')
				// )
				const event: SubscriptionUpdatedEvent = {
					...eventData,
					timestamp: new Date(),
					planType: subscription.planType || 'FREETRIAL'
				}
				this.eventEmitter.emit(SubscriptionEventType.UPDATED, event)
			}

			// Handle cancellation events
			if (changes.some(change => change.includes('cancelAtPeriodEnd'))) {
				const event: SubscriptionCanceledEvent = {
					...eventData,
					timestamp: new Date(),
					cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
					cancelAt: subscription.canceledAt
						? new Date(subscription.canceledAt)
						: undefined
				}
				this.eventEmitter.emit(SubscriptionEventType.CANCELED, event)
			}

			// Handle trial events
			if (
				stripeSubscription.trial_end &&
				stripeSubscription.status === 'trialing'
			) {
				const trialEndDate = new Date(
					stripeSubscription.trial_end * 1000
				)
				const daysRemaining = Math.ceil(
					(trialEndDate.getTime() - Date.now()) /
						(1000 * 60 * 60 * 24)
				)

				if (daysRemaining <= 3 && daysRemaining > 0) {
					const event: TrialWillEndEvent = {
						...eventData,
						timestamp: new Date(),
						trialEndDate,
						daysRemaining
					}
					this.eventEmitter.emit(
						SubscriptionEventType.TRIAL_WILL_END,
						event
					)
				}
			}
		} catch (error) {
			this.logger.error('Failed to emit subscription events', {
				subscriptionId: stripeSubscription.id,
				changes,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Find user by Stripe customer ID
	 */
	private async findUserByCustomerId(
		customerId: string
	): Promise<{ id: string } | null> {
		// First try to find user by direct stripe customer ID
		const { data: userByStripeId } = await this.supabaseService
			.getAdminClient()
			.from('User')
			.select('id')
			.eq('stripeCustomerId', customerId)
			.single()

		if (userByStripeId) {
			return userByStripeId
		}

		// Then try to find user via subscription table
		const { data: subscription } = await this.supabaseService
			.getAdminClient()
			.from('Subscription')
			.select('userId')
			.eq('stripeCustomerId', customerId)
			.single()

		if (subscription) {
			return { id: subscription.userId }
		}

		return null
	}

	/**
	 * Map Stripe subscription status to internal status
	 */
	private mapStripeStatus(
		stripeStatus: StripeSubscription['status']
	): SubStatus {
		const statusMap: Record<string, SubStatus> = {
			incomplete: 'INCOMPLETE',
			incomplete_expired: 'INCOMPLETE_EXPIRED',
			trialing: 'TRIALING',
			active: 'ACTIVE',
			past_due: 'PAST_DUE',
			canceled: 'CANCELLED',
			unpaid: 'UNPAID',
			paused: 'CANCELLED' // Map paused to cancelled since we don't have a paused status
		}

		return statusMap[stripeStatus] || 'INCOMPLETE'
	}

	/**
	 * Map Stripe subscription to plan type
	 */
	private mapStripeToPlanType(subscription: StripeSubscription): PlanType {
		// Get the first active price item
		const priceItem = subscription.items.data[0]
		if (!priceItem) {
			return 'FREETRIAL'
		}

		const priceId = priceItem.price.id

		// Map price IDs to plan types (this should match your billing plans configuration)
		const priceMapping: Record<string, PlanType> = {
			// Add your actual Stripe price IDs here
			price_starter_monthly: 'STARTER',
			price_starter_annual: 'STARTER',
			price_growth_monthly: 'GROWTH',
			price_growth_annual: 'GROWTH',
			price_max_monthly: 'TENANTFLOW_MAX',
			price_max_annual: 'TENANTFLOW_MAX'
		}

		return priceMapping[priceId] || 'FREETRIAL'
	}

	/**
	 * Detect discrepancies between database and Stripe
	 */
	private detectDiscrepancies(
		dbSubscription: Subscription,
		stripeSubscription: StripeSubscription
	): string[] {
		const discrepancies: string[] = []

		// Check status
		const expectedStatus = this.mapStripeStatus(stripeSubscription.status)
		if (
			(dbSubscription.status as SubStatus)?.toLowerCase?.() !==
			expectedStatus?.toLowerCase?.()
		) {
			discrepancies.push(
				`Status mismatch: DB=${dbSubscription.status}, Stripe=${expectedStatus}`
			)
		}

		// Check plan type
		const expectedPlan = this.mapStripeToPlanType(stripeSubscription)
		if (dbSubscription.planType !== expectedPlan) {
			discrepancies.push(
				`Plan mismatch: DB=${dbSubscription.planType}, Stripe=${expectedPlan}`
			)
		}

		// Check cancellation status
		if (
			dbSubscription.cancelAtPeriodEnd !==
			stripeSubscription.cancel_at_period_end
		) {
			discrepancies.push(
				`Cancel at period end mismatch: DB=${dbSubscription.cancelAtPeriodEnd}, Stripe=${stripeSubscription.cancel_at_period_end}`
			)
		}

		// Check period dates
		const stripeCurrentPeriodEnd = new Date(
			(stripeSubscription as StripeSubscriptionWithPeriods)
				.current_period_end * 1000
		)
		if (
			dbSubscription.currentPeriodEnd &&
			Math.abs(
				dbSubscription.currentPeriodEnd.getTime() -
					stripeCurrentPeriodEnd.getTime()
			) > 60000
		) {
			discrepancies.push(
				`Current period end mismatch: DB=${dbSubscription.currentPeriodEnd.toISOString()}, Stripe=${stripeCurrentPeriodEnd.toISOString()}`
			)
		}

		return discrepancies
	}

	/**
	 * Clean up expired cache entries
	 */
	private cleanupSyncCache(): void {
		const now = Date.now()
		let cleaned = 0

		// Convert to array to avoid iterator issues
		const entries = Array.from(this.syncCache.entries())
		for (const [key, value] of entries) {
			if (now - value.timestamp.getTime() > this.cacheExpiry) {
				this.syncCache.delete(key)
				cleaned++
			}
		}

		if (cleaned > 0) {
			this.structuredLogger.debug('Cleaned up sync cache', {
				entriesRemoved: cleaned,
				remainingEntries: this.syncCache.size
			})
		}
	}
}
