import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { SubscriptionNotificationService } from './subscription-notification.service'
import { PrismaService } from '../prisma/prisma.service'
import {
  SubscriptionEventType,
  PaymentMethodRequiredEvent,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
  SubscriptionCanceledEvent,
  TrialWillEndEvent,
  TrialEndedEvent,
  PaymentFailedEvent,
  PaymentSucceededEvent
} from '../common/events/subscription.events'

@Injectable()
export class SubscriptionEventListener {
  private readonly logger = new Logger(SubscriptionEventListener.name)

  constructor(
    private readonly notificationService: SubscriptionNotificationService,
    private readonly prismaService: PrismaService
  ) {}

  @OnEvent(SubscriptionEventType.PAYMENT_METHOD_REQUIRED)
  async handlePaymentMethodRequired(event: PaymentMethodRequiredEvent) {
    try {
      this.logger.debug('Handling payment method required event', { event })
      
      // Get user details for email notification
      const user = await this.prismaService.user.findUnique({
        where: { id: event.userId },
        select: { email: true, name: true }
      })
      
      if (!user) {
        this.logger.error(`User not found for payment method required notification: ${event.userId}`)
        return
      }
      
      await this.notificationService.sendPaymentMethodRequired({
        userId: event.userId,
        email: user.email,
        subscriptionId: event.subscriptionId,
        reason: event.reason,
        customerId: event.customerId,
        subscriptionStatus: event.subscriptionStatus,
        trialEndDate: event.trialEndDate
      })
      
      this.logger.debug('Payment method required notification sent successfully')
    } catch (error) {
      this.logger.error('Failed to handle payment method required event', error)
    }
  }

  @OnEvent(SubscriptionEventType.SUBSCRIPTION_CREATED)
  async handleSubscriptionCreated(event: SubscriptionCreatedEvent) {
    try {
      this.logger.debug('Handling subscription created event', { event })
      
      // Get user details
      const user = await this.prismaService.user.findUnique({
        where: { id: event.userId },
        select: { email: true, name: true }
      })
      
      if (!user) {
        this.logger.error(`User not found for subscription created notification: ${event.userId}`)
        return
      }
      
      await this.notificationService.sendSubscriptionCreated({
        userId: event.userId,
        email: user.email,
        name: user.name || undefined,
        subscriptionId: event.subscriptionId,
        planType: event.planType
      })
      
      this.logger.debug('Subscription created notification sent successfully')
    } catch (error) {
      this.logger.error('Failed to handle subscription created event', error)
    }
  }

  @OnEvent(SubscriptionEventType.SUBSCRIPTION_UPDATED)
  async handleSubscriptionUpdated(event: SubscriptionUpdatedEvent) {
    try {
      this.logger.debug('Handling subscription updated event', { event })
      
      // Get user details
      const user = await this.prismaService.user.findUnique({
        where: { id: event.userId },
        select: { email: true, name: true }
      })
      
      if (!user) {
        this.logger.error(`User not found for subscription updated notification: ${event.userId}`)
        return
      }
      
      await this.notificationService.sendSubscriptionUpdated({
        userId: event.userId,
        email: user.email,
        name: user.name || undefined,
        subscriptionId: event.subscriptionId,
        oldPlanType: event.oldPlanType,
        newPlanType: event.newPlanType
      })
      
      this.logger.debug('Subscription updated notification sent successfully')
    } catch (error) {
      this.logger.error('Failed to handle subscription updated event', error)
    }
  }

  @OnEvent(SubscriptionEventType.SUBSCRIPTION_CANCELED)
  async handleSubscriptionCanceled(event: SubscriptionCanceledEvent) {
    try {
      this.logger.debug('Handling subscription canceled event', { event })
      
      // Get user details
      const user = await this.prismaService.user.findUnique({
        where: { id: event.userId },
        select: { email: true, name: true }
      })
      
      if (!user) {
        this.logger.error(`User not found for subscription canceled notification: ${event.userId}`)
        return
      }
      
      await this.notificationService.sendSubscriptionCanceled({
        userId: event.userId,
        email: user.email,
        name: user.name || undefined,
        subscriptionId: event.subscriptionId,
        planType: event.planType,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        cancelAt: event.cancelAt
      })
      
      this.logger.debug('Subscription canceled notification sent successfully')
    } catch (error) {
      this.logger.error('Failed to handle subscription canceled event', error)
    }
  }

  @OnEvent(SubscriptionEventType.TRIAL_WILL_END)
  async handleTrialWillEnd(event: TrialWillEndEvent) {
    try {
      this.logger.debug('Handling trial will end event', { event })
      
      // Get user details
      const user = await this.prismaService.user.findUnique({
        where: { id: event.userId },
        select: { email: true, name: true }
      })
      
      if (!user) {
        this.logger.error(`User not found for trial will end notification: ${event.userId}`)
        return
      }
      
      await this.notificationService.sendTrialWillEnd({
        userId: event.userId,
        email: user.email,
        name: user.name || undefined,
        subscriptionId: event.subscriptionId,
        trialEndDate: event.trialEndDate,
        daysRemaining: event.daysRemaining
      })
      
      this.logger.debug('Trial will end notification sent successfully')
    } catch (error) {
      this.logger.error('Failed to handle trial will end event', error)
    }
  }

  @OnEvent(SubscriptionEventType.PAYMENT_FAILED)
  async handlePaymentFailed(event: PaymentFailedEvent) {
    try {
      this.logger.debug('Handling payment failed event', { event })
      
      // Get user details
      const user = await this.prismaService.user.findUnique({
        where: { id: event.userId },
        select: { email: true, name: true }
      })
      
      if (!user) {
        this.logger.error(`User not found for payment failed notification: ${event.userId}`)
        return
      }
      
      await this.notificationService.sendPaymentFailed({
        userId: event.userId,
        email: user.email,
        name: user.name || undefined,
        subscriptionId: event.subscriptionId,
        attemptCount: event.attemptCount,
        nextRetryAt: event.nextRetryAt,
        amount: event.amount,
        currency: event.currency
      })
      
      this.logger.debug('Payment failed notification sent successfully')
    } catch (error) {
      this.logger.error('Failed to handle payment failed event', error)
    }
  }
}