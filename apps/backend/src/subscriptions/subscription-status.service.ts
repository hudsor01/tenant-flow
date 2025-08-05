import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { SubStatus, PlanType } from '@repo/database'

export interface UserSubscriptionStatus {
  hasActiveSubscription: boolean
  status: SubStatus | null
  planType: PlanType | null
  trialEndsAt: Date | null
  billingPeriodEndsAt: Date | null
  canExportData: boolean
  canAccessPremiumFeatures: boolean
  needsPaymentMethod: boolean
  stripeSubscriptionId: string | null
  subscriptionId: string | null
}

export interface SubscriptionAccess {
  allowed: boolean
  reason?: string
  action?: 'REDIRECT_TO_PAYMENT' | 'REDIRECT_TO_PRICING' | 'CONTACT_SUPPORT'
  subscriptionId?: string
  trialEndDate?: Date
}

@Injectable()
export class SubscriptionStatusService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get comprehensive subscription status for a user
   */
  async getUserSubscriptionStatus(userId: string): Promise<UserSubscriptionStatus> {
    const subscription = await this.prismaService.subscription.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        planType: true,
        stripeSubscriptionId: true,
        trialEnd: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        canceledAt: true
      }
    })

    if (!subscription) {
      return {
        hasActiveSubscription: false,
        status: null,
        planType: null,
        trialEndsAt: null,
        billingPeriodEndsAt: null,
        canExportData: false,
        canAccessPremiumFeatures: false,
        needsPaymentMethod: false,
        stripeSubscriptionId: null,
        subscriptionId: null
      }
    }

    const isActive = this.isSubscriptionActive(subscription.status as SubStatus)
    const canAccessPaidFeatures = this.canAccessPaidFeatures(subscription.status as SubStatus)

    return {
      hasActiveSubscription: isActive,
      status: subscription.status as SubStatus,
      planType: subscription.planType as PlanType,
      trialEndsAt: subscription.trialEnd,
      billingPeriodEndsAt: subscription.currentPeriodEnd,
      canExportData: canAccessPaidFeatures,
      canAccessPremiumFeatures: canAccessPaidFeatures,
      needsPaymentMethod: subscription.status === 'INCOMPLETE',
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      subscriptionId: subscription.id
    }
  }

  /**
   * Check if user can access a specific premium feature
   */
  async canAccessFeature(userId: string, feature: string): Promise<SubscriptionAccess> {
    const status = await this.getUserSubscriptionStatus(userId)

    // Define feature access rules
    const restrictedFeatures = [
      'data_export',
      'advanced_analytics',
      'bulk_operations',
      'api_access',
      'premium_integrations'
    ]

    if (restrictedFeatures.includes(feature)) {
      if (!status.hasActiveSubscription) {
        return {
          allowed: false,
          reason: 'Active subscription required',
          action: 'REDIRECT_TO_PRICING'
        }
      }

      if (status.status === ('PAUSED' as SubStatus)) {
        return {
          allowed: false,
          reason: 'Your free trial has ended. Add a payment method to access this feature.',
          action: 'REDIRECT_TO_PAYMENT',
          subscriptionId: status.stripeSubscriptionId || undefined,
          trialEndDate: status.trialEndsAt || undefined
        }
      }

      if (status.status === ('PAST_DUE' as SubStatus)) {
        return {
          allowed: false,
          reason: 'Payment failed. Please update your payment method.',
          action: 'REDIRECT_TO_PAYMENT',
          subscriptionId: status.stripeSubscriptionId || undefined
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Get user experience level based on subscription status
   */
  async getUserExperienceLevel(userId: string): Promise<{
    level: 'FREE' | 'TRIAL' | 'PAID' | 'PAYMENT_REQUIRED'
    message?: string
    callToAction?: string
    redirectUrl?: string
  }> {
    const status = await this.getUserSubscriptionStatus(userId)

    if (!status.hasActiveSubscription) {
      return {
        level: 'FREE',
        message: 'Upgrade to access premium features',
        callToAction: 'Start Free Trial',
        redirectUrl: '/pricing'
      }
    }

    switch (status.status as SubStatus | null) {
      case 'TRIALING' as SubStatus: {
        const daysLeft = status.trialEndsAt 
          ? Math.ceil((status.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0
        
        return {
          level: 'TRIAL',
          message: `${daysLeft} days left in your free trial`,
          callToAction: 'Add Payment Method',
          redirectUrl: '/billing'
        }
      }

      case 'ACTIVE' as SubStatus:
        return {
          level: 'PAID',
          message: `${status.planType} plan active`
        }

      case 'PAUSED' as SubStatus:
        return {
          level: 'PAYMENT_REQUIRED',
          message: 'Your free trial has ended. Add a payment method to continue using premium features.',
          callToAction: 'Add Payment Method',
          redirectUrl: '/billing/payment-method'
        }

      case 'INCOMPLETE' as SubStatus:
        // Trial ended without payment method (paused state)
        return {
          level: 'PAYMENT_REQUIRED',
          message: 'Your free trial has ended. Add a payment method to continue using premium features.',
          callToAction: 'Add Payment Method',
          redirectUrl: '/billing/payment-method'
        }

      case 'INCOMPLETE_EXPIRED' as SubStatus:
        return {
          level: 'FREE',
          message: 'Your subscription setup expired',
          callToAction: 'Start Over',
          redirectUrl: '/pricing'
        }

      case 'UNPAID' as SubStatus:
        return {
          level: 'PAYMENT_REQUIRED',
          message: 'Your subscription is unpaid. Please update your payment method.',
          callToAction: 'Update Payment Method',
          redirectUrl: '/billing/payment-method'
        }

      case 'PAST_DUE' as SubStatus:
        return {
          level: 'PAYMENT_REQUIRED',
          message: 'Your payment failed. Please update your payment method to restore access.',
          callToAction: 'Update Payment Method',
          redirectUrl: '/billing/payment-method'
        }

      case 'CANCELED' as SubStatus:
        return {
          level: 'FREE',
          message: 'Your subscription was canceled',
          callToAction: 'Resubscribe',
          redirectUrl: '/pricing'
        }

      default:
        return {
          level: 'FREE',
          message: 'Unable to verify subscription status',
          callToAction: 'Contact Support',
          redirectUrl: '/support'
        }
    }
  }

  /**
   * Check if subscription allows billing operations
   */
  async canManageBilling(userId: string): Promise<boolean> {
    const subscription = await this.prismaService.subscription.findUnique({
      where: { userId },
      select: { status: true }
    })

    // Users can manage billing if they have any subscription record
    // This includes paused subscriptions (they need to add payment method)
    return !!subscription
  }

  /**
   * Get payment action URL based on subscription status
   */
  async getPaymentActionUrl(userId: string): Promise<string | null> {
    const status = await this.getUserSubscriptionStatus(userId)

    if (!status.stripeSubscriptionId) {
      return '/pricing' // No subscription, go to pricing
    }

    switch (status.status as SubStatus | null) {
      case 'PAUSED' as SubStatus:
        return '/billing/add-payment-method'
      case 'PAST_DUE' as SubStatus:
      case 'INCOMPLETE' as SubStatus:
        return '/billing/update-payment-method'
      case 'CANCELED' as SubStatus:
        return '/pricing'
      default:
        return '/billing'
    }
  }

  /**
   * Check feature access for compatibility with subscriptions controller
   */
  async checkFeatureAccess(userId: string, feature: string): Promise<SubscriptionAccess> {
    return this.canAccessFeature(userId, feature)
  }

  // Private helper methods
  private isSubscriptionActive(status: SubStatus): boolean {
    return ['ACTIVE', 'TRIALING'].includes(status)
  }

  private canAccessPaidFeatures(status: SubStatus): boolean {
    // Only active and trialing users can access paid features
    // Incomplete/paused users are blocked from premium features
    return ['ACTIVE', 'TRIALING'].includes(status)
  }
}