import { SetMetadata } from '@nestjs/common'

// Decorator to require active subscription (blocks paused/canceled users)
export const RequireActiveSubscription = () => SetMetadata('subscriptionRequired', true)

// Decorator to allow paused subscription users (for billing/payment endpoints)
export const AllowPausedSubscription = () => SetMetadata('allowPausedSubscription', true)

// Decorator to require specific subscription features
export const RequireSubscriptionFeature = (feature: string) => 
  SetMetadata('requiredFeature', feature)

// Decorator for endpoints that should be blocked for paused users (like data export)
export const PremiumFeature = () => SetMetadata('subscriptionRequired', true)

// Decorator for billing/payment management endpoints (accessible to paused users)
export const BillingEndpoint = () => [
  SetMetadata('subscriptionRequired', true),
  SetMetadata('allowPausedSubscription', true)
]