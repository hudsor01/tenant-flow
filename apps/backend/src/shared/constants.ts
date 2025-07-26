/**
 * Backend Constants - Deprecated
 * 
 * @deprecated Use @tenantflow/types-core instead
 * This file is kept temporarily for backward compatibility during migration
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
} from '@tenantflow/types-core'