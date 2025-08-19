// Subscription event types
export enum SubscriptionEventType {
  CREATED = 'subscription.created',
  UPDATED = 'subscription.updated',
  CANCELED = 'subscription.canceled',
  TRIAL_WILL_END = 'subscription.trial_will_end',
  PAYMENT_FAILED = 'subscription.payment_failed',
  PAYMENT_SUCCEEDED = 'subscription.payment_succeeded'
}

// Base event interface
export interface BaseSubscriptionEvent {
  userId: string
  subscriptionId: string
  timestamp: Date
}

// Subscription created event
export interface SubscriptionCreatedEvent extends BaseSubscriptionEvent {
  planType: string
  status?: string
  trialEnd?: Date
}

// Subscription updated event
export interface SubscriptionUpdatedEvent extends BaseSubscriptionEvent {
  previousStatus?: string
  newStatus?: string
  planType?: string
  changes?: Record<string, unknown>
}

// Subscription canceled event
export interface SubscriptionCanceledEvent extends BaseSubscriptionEvent {
  canceledAt?: Date
  cancelationReason?: string
  effectiveEndDate?: Date
  cancelAtPeriodEnd?: boolean
  cancelAt?: Date
}

// Trial will end event
export interface TrialWillEndEvent extends BaseSubscriptionEvent {
  trialEndDate: Date
  planType: string
  daysRemaining: number
}

// Payment failed event
export interface PaymentFailedEvent extends BaseSubscriptionEvent {
  paymentIntentId: string
  error: string
  attemptCount: number
}

// Payment succeeded event
export interface PaymentSucceededEvent extends BaseSubscriptionEvent {
  paymentIntentId: string
  amount: number
  currency: string
}