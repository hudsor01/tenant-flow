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

// Webhook processor function type - generic for extensibility
export interface WebhookProcessorFunction<T = unknown> {
	event: string
	processor: (event: T) => Promise<WebhookNotification[]>
}

// Stripe-specific webhook processor with proper Stripe event typing
export interface StripeWebhookProcessor {
	event: string
	processor: (event: StripeWebhookEvent) => Promise<WebhookNotification[]>
}

// Stripe webhook event structure (simplified)
export interface StripeWebhookEvent {
	id: string
	type: string
	data: {
		object: unknown
		previous_attributes?: Record<string, unknown>
	}
	created: number
	livemode: boolean
}

// Supabase webhook event structure for auth events
export interface SupabaseWebhookEvent {
	type: 'INSERT' | 'UPDATE' | 'DELETE'
	table: string
	schema: 'auth' | 'public'
	record: {
		id: string
		email?: string
		email_confirmed_at?: string | null
		user_metadata?: {
			name?: string
			full_name?: string
		}
		created_at: string
		updated_at: string
	}
	old_record?: string | null
}