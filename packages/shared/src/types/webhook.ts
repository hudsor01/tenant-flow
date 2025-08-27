/**
 * Webhook Types - Shared webhook types for Stripe and other integrations
 */

// Stripe webhook event types
export type StripeWebhookEventType = string

// Webhook notification structure
export interface WebhookNotification {
	id: string
	type: 'success' | 'error' | 'warning' | 'info'
	title: string
	message: string
	timestamp: Date
	metadata?: Record<string, unknown>
}

// Webhook processor function type
export interface WebhookProcessorFunction {
	event: string
	processor: (event: unknown) => Promise<WebhookNotification[]>
}