import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { SubscriptionNotificationService } from './subscription-notification.service'
import { PrismaService } from '../prisma/prisma.service'
import {
  SubscriptionEventType,
  PaymentMethodRequiredEvent,
  SubscriptionCreatedEvent,
  TrialWillEndEvent,
  PaymentFailedEvent
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
        userEmail: user.email,
        userName: user.name || undefined,
        subscriptionId: event.subscriptionId,
        planType: 'FREE' // Default to FREE for payment method required
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
      
      await this.notificationService.sendSubscriptionActivated({
        userId: event.userId,
        userEmail: user.email,
        userName: user.name || undefined,
        subscriptionId: event.subscriptionId,
        planType: event.planType
      })
      
      this.logger.debug('Subscription created notification sent successfully')
    } catch (error) {
      this.logger.error('Failed to handle subscription created event', error)
    }
  }

  // TODO: Implement subscription updated notification
  // @OnEvent(SubscriptionEventType.SUBSCRIPTION_UPDATED)
  // async handleSubscriptionUpdated(event: SubscriptionUpdatedEvent) {
  //   // Implementation pending
  // }

  // TODO: Implement subscription canceled notification
  // @OnEvent(SubscriptionEventType.SUBSCRIPTION_CANCELED)
  // async handleSubscriptionCanceled(event: SubscriptionCanceledEvent) {
  //   // Implementation pending
  // }

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
      
      await this.notificationService.sendTrialEndingWarning({
        userId: event.userId,
        userEmail: user.email,
        userName: user.name || undefined,
        subscriptionId: event.subscriptionId,
        planType: 'FREE', // Default to FREE for trial ending
        trialEndDate: event.trialEndDate
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
        userEmail: user.email,
        userName: user.name || undefined,
        subscriptionId: event.subscriptionId,
        planType: 'FREE', // Default to FREE for payment failed
        attemptCount: event.attemptCount,
        amountDue: event.amount,
        currency: event.currency,
        nextRetryDate: event.nextRetryAt
      })
      
      this.logger.debug('Payment failed notification sent successfully')
    } catch (error) {
      this.logger.error('Failed to handle payment failed event', error)
    }
  }
}