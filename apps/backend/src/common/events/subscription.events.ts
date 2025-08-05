/**
 * Subscription-related events for decoupled communication
 */

export enum SubscriptionEventType {
  PAYMENT_METHOD_REQUIRED = 'subscription.payment_method_required',
  FEATURE_ACCESS_RESTRICT = 'subscription.feature_access.restrict',
  FEATURE_ACCESS_RESTORE = 'subscription.feature_access.restore',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_CANCELED = 'subscription.canceled',
  TRIAL_WILL_END = 'subscription.trial_will_end',
  TRIAL_ENDED = 'subscription.trial_ended',
  PAYMENT_FAILED = 'subscription.payment_failed',
  PAYMENT_SUCCEEDED = 'subscription.payment_succeeded'
}

export interface PaymentMethodRequiredEvent {
  userId: string
  subscriptionId: string
  reason: string
  customerId?: string
  subscriptionStatus?: string
  trialEndDate?: Date
}

export interface FeatureAccessRestrictEvent {
  userId: string
  reason: 'TRIAL_ENDED' | 'SUBSCRIPTION_PAUSED' | 'PAYMENT_FAILED'
}

export interface FeatureAccessRestoreEvent {
  userId: string
  planType: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE'
}

export interface SubscriptionCreatedEvent {
  userId: string
  subscriptionId: string
  planType: string
  customerId: string
}

export interface SubscriptionUpdatedEvent {
  userId: string
  subscriptionId: string
  oldPlanType?: string
  newPlanType: string
  customerId: string
}

export interface SubscriptionCanceledEvent {
  userId: string
  subscriptionId: string
  planType: string
  cancelAtPeriodEnd: boolean
  cancelAt?: Date
}

export interface TrialWillEndEvent {
  userId: string
  subscriptionId: string
  trialEndDate: Date
  daysRemaining: number
}

export interface TrialEndedEvent {
  userId: string
  subscriptionId: string
}

export interface PaymentFailedEvent {
  userId: string
  subscriptionId: string
  attemptCount: number
  nextRetryAt?: Date
  amount: number
  currency: string
}

export interface PaymentSucceededEvent {
  userId: string
  subscriptionId: string
  amount: number
  currency: string
  invoiceId: string
}