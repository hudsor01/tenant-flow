/**
 * Backend Constants
 * 
 * Re-export from shared package for backward compatibility
 */

// Re-export from centralized types
export {
  USER_ROLE,
  type UserRole,
  PLAN_TYPE,
  type PlanType,
  UNIT_STATUS,
  LEASE_STATUS,
  STRIPE_ERRORS,
  type AuthUser,
  type AuthenticatedContext,
  type AppError,
  type ErrorContext,
  type CreateCheckoutSessionParams,
  type WebhookEventHandler,
  type WebhookEventType,
  type StripeWebhookEvent
} from '@tenantflow/shared'