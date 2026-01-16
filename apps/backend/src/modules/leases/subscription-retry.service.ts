/**
 * Subscription Retry Service
 *
 * Retries failed Stripe subscription creations for activated leases.
 * Uses exponential backoff with a maximum of 5 retry attempts.
 *
 * Runs every 5 minutes via cron job.
 */

import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SentryCron } from '@sentry/nestjs'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { LeaseSubscriptionService } from './lease-subscription.service'
import { logError } from '../../utils/error-serializer'
import { AppLogger } from '../../logger/app-logger.service'

/** Maximum number of subscription creation retry attempts */
const MAX_RETRY_ATTEMPTS = 5

/** Leases with pending/failed subscriptions query type */
interface LeaseWithSubscriptionPending {
	id: string
	rent_amount: number
	primary_tenant_id: string
	owner_user_id: string
	stripe_connected_account_id: string | null
	subscription_retry_count: number | null
	subscription_last_attempt_at: string | null
}

@Injectable()
export class SubscriptionRetryService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly leaseSubscriptionService: LeaseSubscriptionService,
		private readonly eventEmitter: EventEmitter2,
		private readonly logger: AppLogger
	) {}

	/**
	 * Retry failed subscription creations every 5 minutes
	 * Max 5 retry attempts with exponential backoff
	 */
	@Cron(CronExpression.EVERY_5_MINUTES)
	@SentryCron('subscription-retry', {
		schedule: { type: 'crontab', value: '*/5 * * * *' },
		checkinMargin: 2,
		maxRuntime: 5,
		timezone: 'UTC'
	})
	async retryFailedSubscriptions(): Promise<void> {
		this.logger.log('Starting subscription retry job')

		// Check database connection health before proceeding
		const healthCheck = await this.supabase.checkConnection()
		if (healthCheck.status === 'unhealthy') {
			this.logger.warn(
				'Skipping subscription retry job - database connection unhealthy',
				{
					reason: healthCheck.message,
					method: healthCheck.method
				}
			)
			return
		}

		const client = this.supabase.getAdminClient()

		// Query leases with pending or failed subscriptions that haven't exceeded max retries
		const { data: leases, error } = (await client
			.from('leases')
			.select(
				`
				id,
				rent_amount,
				primary_tenant_id,
				owner_user_id,
				stripe_connected_account_id,
				subscription_retry_count,
				subscription_last_attempt_at
			`
			)
			.in('stripe_subscription_status', ['pending', 'failed'])
			.lt('subscription_retry_count', MAX_RETRY_ATTEMPTS)
			.order('subscription_last_attempt_at', {
				ascending: true,
				nullsFirst: true
			})
			.limit(10)) as {
			data: LeaseWithSubscriptionPending[] | null
			error: unknown | null
		}

		if (error) {
			this.logger.error(
				logError('Failed to query leases for subscription retry', error)
			)
			return
		}

		if (!leases || leases.length === 0) {
			this.logger.debug('No failed subscriptions to retry')
			return
		}

		this.logger.log(`Retrying ${leases.length} failed subscription(s)`)

		// ⚠️ CONCURRENT PROCESSING WITH PARTIAL FAILURE HANDLING
		// ═══════════════════════════════════════════════════════════════════════════
		//
		// PATTERN: Process all retries concurrently using Promise.allSettled()
		//
		// RATIONALE:
		//   - Each retry is independent (no shared state between leases)
		//   - Query already limits to 10 leases max
		//   - Individual failures logged within retrySubscriptionCreation()
		//   - Stripe rate limit: 100 req/sec (test), 10,000 req/sec (prod)
		//   - 10 concurrent requests is well within safe limits
		//
		// ═══════════════════════════════════════════════════════════════════════════
		const retryResults = await Promise.allSettled(
			leases.map(lease => this.retrySubscriptionCreation(client, lease))
		)

		// Log any unexpected errors (retrySubscriptionCreation handles its own errors,
		// but Promise rejection would indicate an unhandled exception)
		const unexpectedFailures = retryResults.filter(
			(result): result is PromiseRejectedResult => result.status === 'rejected'
		)

		if (unexpectedFailures.length > 0) {
			this.logger.error('Unexpected failures during subscription retry batch', {
				failureCount: unexpectedFailures.length,
				errors: unexpectedFailures.map(f =>
					f.reason instanceof Error ? f.reason.message : String(f.reason)
				)
			})
		}

		this.logger.log('Subscription retry job completed', {
			total: leases.length,
			unexpectedFailures: unexpectedFailures.length
		})
	}

	/**
	 * Retry subscription creation for a single lease
	 * Respects exponential backoff based on retry count
	 */
	private async retrySubscriptionCreation(
		client: ReturnType<SupabaseService['getAdminClient']>,
		lease: LeaseWithSubscriptionPending
	): Promise<void> {
		const retryCount = lease.subscription_retry_count ?? 0

		// Check if we should retry yet (exponential backoff)
		if (lease.subscription_last_attempt_at) {
			const backoffMs = this.calculateBackoff(retryCount)
			const nextRetryTime =
				new Date(lease.subscription_last_attempt_at).getTime() + backoffMs
			const now = Date.now()

			if (now < nextRetryTime) {
				this.logger.debug(
					`Skipping lease ${lease.id} - retry scheduled for ${new Date(nextRetryTime).toISOString()}`
				)
				return
			}
		}

		// Validate property owner has Stripe account
		const stripeAccountId = lease.stripe_connected_account_id
		if (!stripeAccountId) {
			this.logger.error('Property owner missing Stripe account for lease', {
				leaseId: lease.id,
				propertyOwnerId: lease.owner_user_id
			})

			// Mark as failed with clear error
			await client
				.from('leases')
				.update({
					stripe_subscription_status: 'failed',
					subscription_failure_reason:
						'Property owner has no Stripe account configured',
					subscription_retry_count: retryCount + 1,
					subscription_last_attempt_at: new Date().toISOString()
				})
				.eq('id', lease.id)

			return
		}

		this.logger.log(
			`Retrying subscription for lease ${lease.id} (attempt ${retryCount + 1})`
		)

		try {
			// Use the lease signature service to create the subscription
			await this.leaseSubscriptionService.createSubscriptionForLease(
				client,
				{
					id: lease.id,
					primary_tenant_id: lease.primary_tenant_id,
					rent_amount: lease.rent_amount
				},
				stripeAccountId
			)

			// Check if subscription was created successfully
			const { data: updatedLease } = await client
				.from('leases')
				.select('stripe_subscription_status, stripe_subscription_id')
				.eq('id', lease.id)
				.single()

			if (updatedLease?.stripe_subscription_status === 'active') {
				this.logger.log(`Subscription retry succeeded for lease ${lease.id}`, {
					subscriptionId: updatedLease.stripe_subscription_id,
					attempts: retryCount + 1
				})

				// Log success metric (could be enhanced with Prometheus counters later)
			} else {
				// Check if max retries reached
				const newRetryCount =
					(updatedLease as { subscription_retry_count?: number })
						?.subscription_retry_count ?? retryCount + 1
				if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
					this.emitMaxRetriesReached(lease)
				}
			}
		} catch (error) {
			this.logger.error(`Failed to retry subscription for lease ${lease.id}`, {
				error: error instanceof Error ? error.message : String(error),
				attempt: retryCount + 1
			})

			// Check if max retries reached
			if (retryCount + 1 >= MAX_RETRY_ATTEMPTS) {
				this.emitMaxRetriesReached(lease)
			}

			// Log failure (could be enhanced with Prometheus counters later)
		}
	}

	/**
	 * Emit event when max retries reached for alerting
	 */
	private emitMaxRetriesReached(lease: LeaseWithSubscriptionPending): void {
		this.logger.error('CRITICAL: Subscription creation max retries reached', {
			leaseId: lease.id,
			propertyOwnerId: lease.owner_user_id,
			tenantId: lease.primary_tenant_id,
			action_required: 'Manual intervention required to create subscription'
		})

		this.eventEmitter.emit('lease.subscription_max_retries', {
			lease_id: lease.id,
			owner_user_id: lease.owner_user_id,
			tenant_id: lease.primary_tenant_id,
			retry_count: MAX_RETRY_ATTEMPTS
		})
	}

	/**
	 * Calculate exponential backoff delay
	 * Retry 0: 5 minutes
	 * Retry 1: 15 minutes
	 * Retry 2: 45 minutes
	 * Retry 3: 2.25 hours
	 * Retry 4: 6.75 hours
	 */
	private calculateBackoff(retryCount: number): number {
		const baseDelay = 5 * 60 * 1000 // 5 minutes in ms
		return baseDelay * Math.pow(3, retryCount)
	}

	/**
	 * Manual retry for a specific lease (called by admin)
	 */
	async manualRetry(
		leaseId: string
	): Promise<{ success: boolean; error?: string }> {
		this.logger.log('Manual subscription retry requested', { leaseId })

		const client = this.supabase.getAdminClient()

		// Get lease with property owner
		const { data: lease, error } = (await client
			.from('leases')
			.select(
				`
				id,
				rent_amount,
				primary_tenant_id,
				owner_user_id,
				stripe_connected_account_id,
				stripe_subscription_status
			`
			)
			.eq('id', leaseId)
			.single()) as {
			data: LeaseWithSubscriptionPending | null
			error: unknown
		}

		if (error || !lease) {
			return { success: false, error: 'Lease not found' }
		}

		const stripeAccountId = lease.stripe_connected_account_id
		if (!stripeAccountId) {
			return { success: false, error: 'Property owner has no Stripe account' }
		}

		try {
			await this.leaseSubscriptionService.createSubscriptionForLease(
				client,
				{
					id: lease.id,
					primary_tenant_id: lease.primary_tenant_id,
					rent_amount: lease.rent_amount
				},
				stripeAccountId
			)

			// Check result
			const { data: updatedLease } = await client
				.from('leases')
				.select('stripe_subscription_status')
				.eq('id', leaseId)
				.single()

			if (updatedLease?.stripe_subscription_status === 'active') {
				return { success: true }
			} else {
				return { success: false, error: 'Subscription creation failed' }
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	}
}
