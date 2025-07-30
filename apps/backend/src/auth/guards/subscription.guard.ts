import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PrismaService } from '../../prisma/prisma.service'

export const SUBSCRIPTION_REQUIRED_KEY = 'subscriptionRequired'
export const REQUIRE_ACTIVE_SUBSCRIPTION = () => 
  Reflect.metadata(SUBSCRIPTION_REQUIRED_KEY, true)

export const ALLOW_PAUSED_SUBSCRIPTION = 'allowPausedSubscription'
export const PAUSED_SUBSCRIPTION_ALLOWED = () => 
  Reflect.metadata(ALLOW_PAUSED_SUBSCRIPTION, true)

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prismaService: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresSubscription = this.reflector.getAllAndOverride<boolean>(
      SUBSCRIPTION_REQUIRED_KEY,
      [context.getHandler(), context.getClass()]
    )

    const allowsPausedSubscription = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PAUSED_SUBSCRIPTION,
      [context.getHandler(), context.getClass()]
    )

    // If no subscription requirement is set, allow access
    if (!requiresSubscription) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new UnauthorizedException('User not authenticated')
    }

    // Get user's subscription status
    const subscription = await this.prismaService.subscription.findUnique({
      where: { userId: user.id },
      select: { 
        status: true, 
        stripeSubscriptionId: true,
        planType: true,
        trialEnd: true,
        currentPeriodEnd: true
      }
    })

    if (!subscription) {
      // No subscription found - block access to paid features
      throw new ForbiddenException({
        code: 'NO_SUBSCRIPTION',
        message: 'Active subscription required',
        action: 'REDIRECT_TO_PRICING'
      })
    }

    // Check subscription status
    const status = subscription.status

    switch (status) {
      case 'ACTIVE':
        // Active subscription - full access
        return true

      case 'TRIALING':
        // Trial period - full access
        return true

      case 'INCOMPLETE':
        // Incomplete subscription (paused trial) - restricted access
        if (allowsPausedSubscription) {
          // This endpoint allows paused users (like billing management)
          return true
        }
        
        // Block access and redirect to payment
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_PAUSED',
          message: 'Your free trial has ended. Add a payment method to continue.',
          subscriptionId: subscription.stripeSubscriptionId,
          action: 'REDIRECT_TO_PAYMENT',
          trialEndDate: subscription.trialEnd,
          planType: subscription.planType
        })

      case 'INCOMPLETE_EXPIRED':
        // Expired incomplete subscription - no access
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription setup expired. Please restart the signup process.',
          action: 'REDIRECT_TO_PRICING'
        })

      case 'UNPAID':
        // Unpaid subscription - limited access with payment prompt
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_UNPAID',
          message: 'Your subscription is unpaid. Please update your payment method.',
          subscriptionId: subscription.stripeSubscriptionId,
          action: 'REDIRECT_TO_PAYMENT_UPDATE'
        })

      case 'PAST_DUE':
        // Payment failed - limited access with payment prompt
        throw new ForbiddenException({
          code: 'PAYMENT_FAILED',
          message: 'Your payment failed. Please update your payment method.',
          subscriptionId: subscription.stripeSubscriptionId,
          action: 'REDIRECT_TO_PAYMENT_UPDATE'
        })

      case 'CANCELED':
        // Canceled subscription - no access to paid features
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_CANCELED',
          message: 'Your subscription has been canceled. Resubscribe to continue.',
          action: 'REDIRECT_TO_PRICING'
        })


      default:
        // Unknown status - default to blocking access
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_ERROR',
          message: 'Unable to verify subscription status. Please contact support.',
          action: 'CONTACT_SUPPORT'
        })
    }
  }
}