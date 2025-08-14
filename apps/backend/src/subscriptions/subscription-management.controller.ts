import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SubscriptionManagementService } from './subscription-management.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import type { User } from '@repo/database'
import type {
  UpgradeRequest,
  DowngradeRequest,
  CancelRequest
} from './subscription-management.service'

interface CheckoutRequest {
  planType: 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
  billingCycle: 'monthly' | 'annual'
  successUrl: string
  cancelUrl: string
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
@Controller('api/subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionManagementController {
  private readonly logger: StructuredLoggerService

  constructor(
    private readonly subscriptionManagement: SubscriptionManagementService
  ) {
    this.logger = new StructuredLoggerService('SubscriptionManagementController')
  }

  /**
   * Upgrade user's subscription to a higher plan
   */
  @Post('upgrade/:userId')
  async upgradeSubscription(
    @Param('userId') userId: string,
    @Body() upgradeRequest: UpgradeRequest,
    @CurrentUser() user: User
  ) {
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

      const result = await this.subscriptionManagement.upgradeSubscription(userId, upgradeRequest)

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
  @Post('downgrade/:userId')
  async downgradeSubscription(
    @Param('userId') userId: string,
    @Body() downgradeRequest: DowngradeRequest,
    @CurrentUser() user: User
  ) {
    // Users can only manage their own subscription
    if (user.id !== userId && user.role !== 'ADMIN') {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN)
    }

    try {
      this.logger.info('Subscription downgrade requested', {
        userId,
        targetPlan: downgradeRequest.targetPlan,
        billingCycle: downgradeRequest.billingCycle,
        effectiveDate: downgradeRequest.effectiveDate || 'end_of_period',
        requestedBy: user.id
      })

      const result = await this.subscriptionManagement.downgradeSubscription(userId, downgradeRequest)

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
  @Post('cancel/:userId')
  async cancelSubscription(
    @Param('userId') userId: string,
    @Body() cancelRequest: CancelRequest,
    @CurrentUser() user: User
  ) {
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

      const result = await this.subscriptionManagement.cancelSubscription(userId, cancelRequest)

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
      this.logger.error('Subscription cancellation error', error as Error, {
        userId,
        requestedBy: user.id
      })

      throw new HttpException(
        'Failed to cancel subscription',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  /**
   * Create checkout session for new subscription
   */
  @Post('checkout/:userId')
  async createCheckoutSession(
    @Param('userId') userId: string,
    @Body() checkoutRequest: CheckoutRequest,
    @CurrentUser() user: User
  ) {
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

      const result = await this.subscriptionManagement.createCheckoutSession(
        userId,
        checkoutRequest.planType,
        checkoutRequest.billingCycle,
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
      this.logger.error('Checkout session creation error', error as Error, {
        userId,
        planType: checkoutRequest.planType,
        requestedBy: user.id
      })

      throw new HttpException(
        'Failed to create checkout session',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  /**
   * Reactivate a canceled subscription (if still within grace period)
   */
  @Post('reactivate/:userId')
  async reactivateSubscription(
    @Param('userId') userId: string,
    @CurrentUser() user: User
  ) {
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
      this.logger.error('Subscription reactivation error', error as Error, {
        userId,
        requestedBy: user.id
      })

      throw new HttpException(
        'Failed to reactivate subscription',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
    }
  }

  /**
   * Preview changes for a plan change (without executing)
   */
  @Post('preview/:userId')
  async previewPlanChange(
    @Param('userId') userId: string,
    @Body() previewRequest: {
      targetPlan: 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
      billingCycle: 'monthly' | 'annual'
    },
    @CurrentUser() user: User
  ) {
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

      // This would implement preview logic with Stripe API
      // For now, return a placeholder response
      return {
        success: true,
        preview: {
          currentPlan: 'STARTER',
          targetPlan: previewRequest.targetPlan,
          billingCycle: previewRequest.billingCycle,
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