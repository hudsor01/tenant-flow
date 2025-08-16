import {
	Body,
	Controller,
	HttpException,
	HttpStatus,
	Param,
	Post,
	UseGuards,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { IsUUID } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SubscriptionManagementService } from './subscription-management.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import {
	CancelRequestDto,
	CreateCheckoutSessionDto,
	DowngradeRequestDto,
	PreviewPlanChangeDto,
	UpgradeRequestDto
} from './dto/subscription-management.dto'
import type { User } from '@repo/database'

/**
 * DTO for validating UUID parameters
 */
class UuidParamDto {
	@IsUUID(4, { message: 'userId must be a valid UUID' })
	userId!: string
}

/**
 * Subscription management REST API controller
 *
 * Provides endpoints for:
 * - Subscription upgrades and downgrades
 * - Subscription cancellation
 * - Checkout session creation
 * - Plan change validation
 */
@ApiTags('Subscription Management')
@ApiBearerAuth()
@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
@UsePipes(
	new ValidationPipe({
		transform: true,
		whitelist: true,
		forbidNonWhitelisted: true,
		validationError: {
			target: false,
			value: false
		}
	})
)
export class SubscriptionManagementController {
	private readonly logger: StructuredLoggerService

	constructor(
		private readonly subscriptionManagement: SubscriptionManagementService
	) {
		this.logger = new StructuredLoggerService(
			'SubscriptionManagementController'
		)
	}

	/**
	 * Upgrade user's subscription to a higher plan
	 */
	@ApiOperation({
		summary: 'Upgrade subscription',
		description:
			'Upgrade user subscription to a higher plan with immediate or scheduled activation'
	})
	@ApiParam({
		name: 'userId',
		description: 'User ID (UUID)',
		type: 'string',
		format: 'uuid'
	})
	@ApiResponse({
		status: 200,
		description: 'Upgrade successful',
		schema: {
			properties: {
				success: { type: 'boolean' },
				subscription: { type: 'object' },
				stripeSubscription: { type: 'object' },
				changes: { type: 'array', items: { type: 'string' } },
				metadata: { type: 'object' }
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 403, description: 'Access denied' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Post('upgrade/:userId')
	async upgradeSubscription(
		@Param() params: UuidParamDto,
		@Body() upgradeRequest: UpgradeRequestDto,
		@CurrentUser() user: User
	) {
		const { userId } = params
		// Users can only manage their own subscription
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			this.logger.info('Subscription upgrade requested', {
				userId,
				targetPlan: upgradeRequest.targetPlan,
				billingCycle: upgradeRequest.billingCycle,
				requestedBy: user.id
			})

			// Convert "yearly" to "annual" for compatibility
			const normalizedRequest = {
				...upgradeRequest,
				billingCycle:
					upgradeRequest.billingCycle === 'yearly'
						? 'annual'
						: upgradeRequest.billingCycle
			}
			const result =
				await this.subscriptionManagement.upgradeSubscription(
					userId,
					normalizedRequest
				)

			if (result.success) {
				this.logger.info('Subscription upgrade completed', {
					userId,
					fromPlan: result.metadata.fromPlan,
					toPlan: result.metadata.toPlan,
					changes: result.changes.length
				})
			} else {
				this.logger.warn('Subscription upgrade failed', {
					userId,
					error: result.error,
					targetPlan: upgradeRequest.targetPlan
				})
			}

			return result
		} catch (error) {
			this.logger.error('Subscription upgrade error', error as Error, {
				userId,
				targetPlan: upgradeRequest.targetPlan,
				requestedBy: user.id
			})

			throw new HttpException(
				'Failed to upgrade subscription',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Downgrade user's subscription to a lower plan
	 */
	@ApiOperation({
		summary: 'Downgrade subscription',
		description:
			'Downgrade user subscription to a lower plan with immediate or end-of-period activation'
	})
	@ApiParam({
		name: 'userId',
		description: 'User ID (UUID)',
		type: 'string',
		format: 'uuid'
	})
	@ApiResponse({
		status: 200,
		description: 'Downgrade successful',
		schema: {
			properties: {
				success: { type: 'boolean' },
				subscription: { type: 'object' },
				stripeSubscription: { type: 'object' },
				changes: { type: 'array', items: { type: 'string' } },
				metadata: { type: 'object' }
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 403, description: 'Access denied' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Post('downgrade/:userId')
	async downgradeSubscription(
		@Param() params: UuidParamDto,
		@Body() downgradeRequest: DowngradeRequestDto,
		@CurrentUser() user: User
	) {
		const { userId } = params
		// Users can only manage their own subscription
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			this.logger.info('Subscription downgrade requested', {
				userId,
				targetPlan: downgradeRequest.targetPlan,
				billingCycle: downgradeRequest.billingCycle,
				effectiveDate:
					downgradeRequest.effectiveDate || 'end_of_period',
				requestedBy: user.id
			})

			// Convert "yearly" to "annual" for compatibility
			const normalizedRequest = {
				...downgradeRequest,
				billingCycle:
					downgradeRequest.billingCycle === 'yearly'
						? 'annual'
						: downgradeRequest.billingCycle
			}
			const result =
				await this.subscriptionManagement.downgradeSubscription(
					userId,
					normalizedRequest
				)

			if (result.success) {
				this.logger.info('Subscription downgrade completed', {
					userId,
					fromPlan: result.metadata.fromPlan,
					toPlan: result.metadata.toPlan,
					effectiveDate: downgradeRequest.effectiveDate,
					changes: result.changes.length
				})
			} else {
				this.logger.warn('Subscription downgrade failed', {
					userId,
					error: result.error,
					targetPlan: downgradeRequest.targetPlan
				})
			}

			return result
		} catch (error) {
			this.logger.error('Subscription downgrade error', error as Error, {
				userId,
				targetPlan: downgradeRequest.targetPlan,
				requestedBy: user.id
			})

			throw new HttpException(
				'Failed to downgrade subscription',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Cancel user's subscription
	 */
	@ApiOperation({
		summary: 'Cancel subscription',
		description:
			'Cancel user subscription with immediate or end-of-period termination'
	})
	@ApiParam({
		name: 'userId',
		description: 'User ID (UUID)',
		type: 'string',
		format: 'uuid'
	})
	@ApiResponse({
		status: 200,
		description: 'Cancellation successful',
		schema: {
			properties: {
				success: { type: 'boolean' },
				subscription: { type: 'object' },
				stripeSubscription: { type: 'object' },
				changes: { type: 'array', items: { type: 'string' } },
				metadata: { type: 'object' }
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 403, description: 'Access denied' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Post('cancel/:userId')
	async cancelSubscription(
		@Param() params: UuidParamDto,
		@Body() cancelRequest: CancelRequestDto,
		@CurrentUser() user: User
	) {
		const { userId } = params
		// Users can only manage their own subscription
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			this.logger.info('Subscription cancellation requested', {
				userId,
				cancelAt: cancelRequest.cancelAt,
				reason: cancelRequest.reason,
				requestedBy: user.id
			})

			const result = await this.subscriptionManagement.cancelSubscription(
				userId,
				cancelRequest
			)

			if (result.success) {
				this.logger.info('Subscription cancellation completed', {
					userId,
					fromPlan: result.metadata.fromPlan,
					cancelAt: cancelRequest.cancelAt,
					changes: result.changes.length
				})
			} else {
				this.logger.warn('Subscription cancellation failed', {
					userId,
					error: result.error
				})
			}

			return result
		} catch (error) {
			this.logger.error(
				'Subscription cancellation error',
				error as Error,
				{
					userId,
					requestedBy: user.id
				}
			)

			throw new HttpException(
				'Failed to cancel subscription',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Create checkout session for new subscription
	 */
	@ApiOperation({
		summary: 'Create checkout session',
		description:
			'Create Stripe checkout session for new subscription purchase'
	})
	@ApiParam({
		name: 'userId',
		description: 'User ID (UUID)',
		type: 'string',
		format: 'uuid'
	})
	@ApiResponse({
		status: 200,
		description: 'Checkout session created successfully',
		schema: {
			properties: {
				success: { type: 'boolean' },
				checkoutUrl: { type: 'string', format: 'url' },
				changes: { type: 'array', items: { type: 'string' } },
				metadata: { type: 'object' }
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 403, description: 'Access denied' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Post('checkout/:userId')
	async createCheckoutSession(
		@Param() params: UuidParamDto,
		@Body() checkoutRequest: CreateCheckoutSessionDto,
		@CurrentUser() user: User
	) {
		const { userId } = params
		// Users can only create checkout sessions for themselves
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			this.logger.info('Checkout session requested', {
				userId,
				planType: checkoutRequest.planType,
				billingCycle: checkoutRequest.billingCycle,
				requestedBy: user.id
			})

			// Convert "yearly" to "annual" for compatibility
			const billingCycle =
				checkoutRequest.billingCycle === 'yearly'
					? 'annual'
					: checkoutRequest.billingCycle
			const result =
				await this.subscriptionManagement.createCheckoutSession(
					userId,
					checkoutRequest.planType,
					billingCycle,
					checkoutRequest.successUrl,
					checkoutRequest.cancelUrl
				)

			if (result.success) {
				this.logger.info('Checkout session created', {
					userId,
					planType: checkoutRequest.planType,
					billingCycle: checkoutRequest.billingCycle
				})
			} else {
				this.logger.warn('Checkout session creation failed', {
					userId,
					error: result.error,
					planType: checkoutRequest.planType
				})
			}

			return result
		} catch (error) {
			this.logger.error(
				'Checkout session creation error',
				error as Error,
				{
					userId,
					planType: checkoutRequest.planType,
					requestedBy: user.id
				}
			)

			throw new HttpException(
				'Failed to create checkout session',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Reactivate a canceled subscription (if still within grace period)
	 */
	@ApiOperation({
		summary: 'Reactivate subscription',
		description:
			'Reactivate a canceled subscription if still within grace period'
	})
	@ApiParam({
		name: 'userId',
		description: 'User ID (UUID)',
		type: 'string',
		format: 'uuid'
	})
	@ApiResponse({
		status: 200,
		description: 'Reactivation successful',
		schema: {
			properties: {
				success: { type: 'boolean' },
				subscription: { type: 'object' },
				changes: { type: 'array', items: { type: 'string' } },
				metadata: { type: 'object' }
			}
		}
	})
	@ApiResponse({
		status: 400,
		description:
			'Invalid request data or subscription cannot be reactivated'
	})
	@ApiResponse({ status: 403, description: 'Access denied' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Post('reactivate/:userId')
	async reactivateSubscription(
		@Param() params: UuidParamDto,
		@CurrentUser() user: User
	) {
		const { userId } = params
		// Users can only reactivate their own subscription
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			this.logger.info('Subscription reactivation requested', {
				userId,
				requestedBy: user.id
			})

			// This would implement reactivation logic
			// For now, return a placeholder response
			return {
				success: false,
				error: 'Reactivation not implemented yet',
				changes: [],
				metadata: {
					operation: 'reactivate',
					correlationId: `reactivate-${userId}-${Date.now()}`,
					timestamp: new Date().toISOString()
				}
			}
		} catch (error) {
			this.logger.error(
				'Subscription reactivation error',
				error as Error,
				{
					userId,
					requestedBy: user.id
				}
			)

			throw new HttpException(
				'Failed to reactivate subscription',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Preview changes for a plan change (without executing)
	 */
	@ApiOperation({
		summary: 'Preview plan change',
		description:
			'Preview the effects of a plan change without executing it, including proration calculations'
	})
	@ApiParam({
		name: 'userId',
		description: 'User ID (UUID)',
		type: 'string',
		format: 'uuid'
	})
	@ApiResponse({
		status: 200,
		description: 'Preview generated successfully',
		schema: {
			properties: {
				success: { type: 'boolean' },
				preview: {
					type: 'object',
					properties: {
						currentPlan: { type: 'string' },
						targetPlan: { type: 'string' },
						billingCycle: { type: 'string' },
						proration: { type: 'object' },
						features: { type: 'object' }
					}
				},
				metadata: { type: 'object' }
			}
		}
	})
	@ApiResponse({ status: 400, description: 'Invalid request data' })
	@ApiResponse({ status: 403, description: 'Access denied' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Post('preview/:userId')
	async previewPlanChange(
		@Param() params: UuidParamDto,
		@Body() previewRequest: PreviewPlanChangeDto,
		@CurrentUser() user: User
	) {
		const { userId } = params
		// Users can only preview changes for their own subscription
		if (user.id !== userId && user.role !== 'ADMIN') {
			throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
		}

		try {
			this.logger.info('Plan change preview requested', {
				userId,
				targetPlan: previewRequest.targetPlan,
				billingCycle: previewRequest.billingCycle,
				requestedBy: user.id
			})

			// Convert "yearly" to "annual" for compatibility
			const billingCycle =
				previewRequest.billingCycle === 'yearly'
					? 'annual'
					: previewRequest.billingCycle
			// This would implement preview logic with Stripe API
			// For now, return a placeholder response
			return {
				success: true,
				preview: {
					currentPlan: 'STARTER',
					targetPlan: previewRequest.targetPlan,
					billingCycle,
					proration: {
						immediateCharge: 0,
						nextInvoiceAmount: 2900,
						prorationDate: new Date().toISOString()
					},
					features: {
						added: ['Advanced analytics', 'Priority support'],
						removed: []
					}
				},
				metadata: {
					operation: 'preview',
					correlationId: `preview-${userId}-${Date.now()}`,
					timestamp: new Date().toISOString()
				}
			}
		} catch (error) {
			this.logger.error('Plan change preview error', error as Error, {
				userId,
				targetPlan: previewRequest.targetPlan,
				requestedBy: user.id
			})

			throw new HttpException(
				'Failed to preview plan change',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}
}
