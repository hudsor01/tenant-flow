import {
	Body,
	Controller,
	Get,
	HttpException,
	HttpStatus,
	MessageEvent,
	Param,
	Post,
	Query,
	Sse,
	UseGuards
} from '@nestjs/common'
import { filter, interval, Observable, startWith, switchMap } from 'rxjs'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SubscriptionSyncService } from './subscription-sync.service'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AdminGuard } from '../auth/guards/admin.guard'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import type { SupabaseService } from '../common/supabase/supabase.service'
import type { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'
import type { User } from '@repo/shared'

interface SyncRequest {
	force?: boolean
}

interface BulkSyncRequest {
	userIds: string[]
	batchSize?: number
	delayMs?: number
}

/**
 * Subscription synchronization REST API controller
 *
 * Provides endpoints for:
 * - Manual subscription synchronization
 * - Real-time subscription state updates
 * - Bulk synchronization operations (admin)
 * - Subscription state debugging
 */
@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionSyncController {
	private readonly structuredLogger: StructuredLoggerService

	constructor(
		private readonly subscriptionSync: SubscriptionSyncService,
		private readonly subscriptionManager: SubscriptionsManagerService
	) {
		this.structuredLogger = new StructuredLoggerService(
			'SubscriptionSyncController'
		)
	}

	/**
	 * Get user's current subscription and plan information
	 */
	@Get('user/:userId')
	async getUserSubscription(
		@Param('userId') userId: string,
		@CurrentUser() user: User
	) {
		// Users can only access their own subscription
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			const subscription =
				await this.subscriptionManager.getUserSubscription(userId)

			return {
				subscription,
				plan: null, // Plan data is embedded in subscription
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.structuredLogger.error(
				'Failed to get user subscription',
				error as Error,
				{
					userId,
					requestedBy: user.id,
					operation: 'get_user_subscription'
				}
			)

			throw new HttpException(
				'Failed to retrieve subscription',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Get user's usage metrics
	 */
	@Get('usage/:userId')
	async getUserUsage(
		@Param('userId') userId: string,
		@CurrentUser() user: User
	) {
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			const usage =
				await this.subscriptionManager.calculateUsageMetrics(userId)
			const limits = await this.subscriptionManager.getUsageLimits(userId)

			return {
				...usage,
				limits,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.structuredLogger.error(
				'Failed to get user usage',
				error as Error,
				{
					userId,
					requestedBy: user.id,
					operation: 'get_user_usage'
				}
			)

			throw new HttpException(
				'Failed to retrieve usage metrics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Get subscription synchronization state (for debugging)
	 */
	@Get('sync-state/:userId')
	async getSubscriptionState(
		@Param('userId') userId: string,
		@CurrentUser() user: User
	) {
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			const state =
				await this.subscriptionSync.getSubscriptionState(userId)

			return {
				...state,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.structuredLogger.error(
				'Failed to get subscription state',
				error as Error,
				{
					userId,
					requestedBy: user.id,
					operation: 'get_subscription_state'
				}
			)

			throw new HttpException(
				'Failed to retrieve subscription state',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Simple subscription status check (lightweight)
	 */
	@Get('status/:userId')
	async getSubscriptionStatus(
		@Param('userId') userId: string,
		@CurrentUser() user: User
	) {
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			const subscription =
				await this.subscriptionManager.getSubscription(userId)
			const canUpgrade =
				await this.subscriptionManager.canAddProperty(userId)

			const now = new Date()
			let trialDaysRemaining = 0

			if (subscription?.trialEnd) {
				const trialEnd = new Date(subscription.trialEnd)
				trialDaysRemaining = Math.max(
					0,
					Math.ceil(
						(trialEnd.getTime() - now.getTime()) /
							(1000 * 60 * 60 * 24)
					)
				)
			}

			return {
				isActive:
					subscription?.status === 'ACTIVE' ||
					subscription?.status === 'TRIALING',
				planType: subscription?.planType || 'FREETRIAL',
				status: subscription?.status || 'unknown',
				trialDaysRemaining,
				canUpgrade,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.structuredLogger.error(
				'Failed to get subscription status',
				error as Error,
				{
					userId,
					requestedBy: user.id,
					operation: 'get_subscription_status'
				}
			)

			throw new HttpException(
				'Failed to retrieve subscription status',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Manually trigger subscription synchronization
	 */
	@Post('sync/:userId')
	async syncUserSubscription(
		@Param('userId') userId: string,
		@Body() body: SyncRequest,
		@CurrentUser() user: User
	) {
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			this.structuredLogger.info('Manual subscription sync requested', {
				userId,
				requestedBy: user.id,
				force: body.force || false,
				operation: 'manual_sync'
			})

			const result = await this.subscriptionSync.syncUserSubscription(
				userId,
				body.force || false
			)

			this.structuredLogger.info('Manual subscription sync completed', {
				userId,
				success: result.success,
				changes: result.changes?.length || 0,
				operation: 'manual_sync_complete'
			})

			return {
				...result,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.structuredLogger.error(
				'Manual subscription sync failed',
				error as Error,
				{
					userId,
					requestedBy: user.id,
					operation: 'manual_sync_error'
				}
			)

			throw new HttpException(
				'Failed to sync subscription',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Server-Sent Events for real-time subscription updates
	 */
	@Sse('events/:userId')
	subscriptionEvents(
		@Param('userId') userId: string,
		@CurrentUser() user: User
	): Observable<MessageEvent> {
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		this.structuredLogger.info('SSE connection established', {
			userId,
			connectedBy: user.id,
			operation: 'sse_connect'
		})

		// Create heartbeat and subscription change events
		return interval(30000).pipe(
			// 30 second heartbeat
			startWith(0),
			switchMap(async () => {
				try {
					// Get current subscription state
					const subscription =
						await this.subscriptionManager.getUserSubscription(
							userId
						)

					return {
						type: 'heartbeat',
						data: JSON.stringify({
							timestamp: new Date().toISOString(),
							subscription: subscription
								? {
										id: subscription.id,
										status: subscription.status,
										planType: subscription.planType,
										updatedAt: subscription.updatedAt
									}
								: null
						})
					} as MessageEvent
				} catch (_error) {
					return {
						type: 'error',
						data: JSON.stringify({
							error: 'Failed to fetch subscription state',
							timestamp: new Date().toISOString()
						})
					} as MessageEvent
				}
			}),
			filter(event => event !== null)
		)
	}

	/**
	 * Admin: Bulk synchronization of multiple users
	 */
	@Post('admin/bulk-sync')
	@UseGuards(AdminGuard)
	async bulkSyncSubscriptions(
		@Body() body: BulkSyncRequest,
		@CurrentUser() user: User
	) {
		try {
			this.structuredLogger.info('Bulk subscription sync requested', {
				userCount: body.userIds.length,
				requestedBy: user.id,
				batchSize: body.batchSize || 10,
				delayMs: body.delayMs || 100,
				operation: 'bulk_sync'
			})

			const results = await this.subscriptionSync.bulkSyncSubscriptions(
				body.userIds,
				{
					batchSize: body.batchSize,
					delayMs: body.delayMs,
					onProgress: (completed, total, errors) => {
						this.structuredLogger.debug('Bulk sync progress', {
							completed,
							total,
							errors,
							progress: `${((completed / total) * 100).toFixed(1)}%`
						})
					}
				}
			)

			this.structuredLogger.info('Bulk subscription sync completed', {
				...results,
				successRate:
					(
						((results.completed - results.errors) /
							results.completed) *
						100
					).toFixed(1) + '%',
				operation: 'bulk_sync_complete'
			})

			return {
				...results,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.structuredLogger.error(
				'Bulk subscription sync failed',
				error as Error,
				{
					userCount: body.userIds.length,
					requestedBy: user.id,
					operation: 'bulk_sync_error'
				}
			)

			throw new HttpException(
				'Failed to bulk sync subscriptions',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Admin: Get subscription metrics and statistics
	 */
	@Get('admin/metrics')
	@UseGuards(AdminGuard)
	async getSubscriptionMetrics(@Query('period') period = '30d') {
		try {
			// This would implement comprehensive subscription metrics
			// For now, return basic placeholder data
			return {
				totalSubscriptions: 0,
				activeSubscriptions: 0,
				trialSubscriptions: 0,
				canceledSubscriptions: 0,
				planDistribution: {
					FREETRIAL: 0,
					STARTER: 0,
					GROWTH: 0,
					TENANTFLOW_MAX: 0
				},
				revenueMetrics: {
					monthlyRecurringRevenue: 0,
					annualRecurringRevenue: 0,
					averageRevenuePerUser: 0
				},
				churnMetrics: {
					monthlyChurnRate: 0,
					annualChurnRate: 0
				},
				period,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.structuredLogger.error(
				'Failed to get subscription metrics',
				error as Error,
				{
					period,
					operation: 'get_admin_metrics'
				}
			)

			throw new HttpException(
				'Failed to retrieve subscription metrics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Admin: Force sync for all users (use with caution)
	 */
	@Post('admin/sync-all')
	@UseGuards(AdminGuard)
	async syncAllSubscriptions(
		@CurrentUser() user: User,
		@Query('limit') limit = '100'
	) {
		try {
			const limitNum = Math.min(parseInt(limit), 1000) // Max 1000 users at once

			this.structuredLogger.warn('Admin requested sync for all users', {
				requestedBy: user.id,
				limit: limitNum,
				operation: 'admin_sync_all'
			})

			// Get users with subscriptions using Supabase
			const userRepository = new (
				await import('../auth/user-supabase.repository')
			).UserSupabaseRepository(
				null as unknown as SupabaseService, // SupabaseService would be injected properly
				null as unknown as MultiTenantSupabaseService // MultiTenantSupabaseService would be injected properly
			)

			const usersWithSubscriptions =
				await userRepository.findUsersWithSubscriptions()
			const userIds = usersWithSubscriptions
				.map(u => u.id)
				.slice(0, limitNum)

			if (userIds.length === 0) {
				return {
					message: 'No users with subscriptions found',
					completed: 0,
					errors: 0,
					timestamp: new Date().toISOString()
				}
			}

			const results = await this.subscriptionSync.bulkSyncSubscriptions(
				userIds,
				{
					batchSize: 5, // Smaller batch size for full sync
					delayMs: 200 // Longer delay for full sync
				}
			)

			return {
				...results,
				message: `Synced ${results.completed} users`,
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.structuredLogger.error(
				'Admin sync all failed',
				error as Error,
				{
					requestedBy: user.id,
					operation: 'admin_sync_all_error'
				}
			)

			throw new HttpException(
				'Failed to sync all subscriptions',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}
}
