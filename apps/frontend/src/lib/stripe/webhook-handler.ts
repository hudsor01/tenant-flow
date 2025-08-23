/**
 * Unified Stripe Webhook Handler - Architectural Bridge
 * 
 * This file bridges the server-side webhook processor with client-side notifications.
 * Exports both server and client functionality with proper separation of concerns.
 */

// Re-export server-side components (no React dependencies)
export {
  processStripeWebhook,
  validateWebhookEvent,
  webhookProcessors,
  type StripeWebhookEvent,
  type WebhookNotification,
  type WebhookProcessor,
} from './webhook-server-processor'

// Re-export client-side components (React hooks enabled)
export {
  useStripeWebhookNotifications,
  useWebhookNotificationHandler,
  useStripePaymentNotifications,
  type WebhookClientOptions,
} from './webhook-client-notifier'

/**
 * Migration Guide:
 * 
 * BEFORE (broken - React hooks in server context):
 * ```typescript
 * const handlers = useStripeWebhookHandlers() // ❌ Breaks on server
 * processStripeWebhook(event, handlers)
 * ```
 * 
 * AFTER (fixed - proper separation):
 * 
 * Server-side usage (API routes, webhooks):
 * ```typescript
 * import { processStripeWebhook } from '@/lib/stripe/webhook-handler'
 * await processStripeWebhook(event, emitNotifications)
 * ```
 * 
 * Client-side usage (React components):
 * ```typescript
 * import { useStripeWebhookNotifications } from '@/lib/stripe/webhook-handler'
 * const { isConnected } = useStripeWebhookNotifications({ userId })
 * ```
 */