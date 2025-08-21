/**
 * Shared Types for State Management
 * Centralized type definitions used across all state modules
 */

// Re-export common types
export type { User, AuthError } from '@/types/auth'

// Subscription Types
export interface SubscriptionState {
	id: string
	status:
		| 'active'
		| 'canceled'
		| 'past_due'
		| 'trialing'
		| 'incomplete'
		| 'incomplete_expired'
		| 'unpaid'
	current_period_start: Date
	current_period_end: Date
	cancel_at_period_end: boolean
	canceled_at?: Date
	ended_at?: Date
	trial_start?: Date
	trial_end?: Date
	items: SubscriptionItem[]
	metadata?: Record<string, unknown>
}

export interface SubscriptionItem {
	id: string
	price_id: string
	product_id: string
	quantity: number
}

export interface UsageMetrics {
	properties_count: number
	units_count: number
	tenants_count: number
	team_members_count: number
	storage_gb: number
	api_calls_this_month: number
	last_updated: Date
}

// UI Types
export interface Notification {
	id: string
	type: 'success' | 'error' | 'warning' | 'info'
	title: string
	message?: string
	duration?: number
	action?: {
		label: string
		onClick: () => void
	}
}

export interface Modal {
	id: string
	component: React.ComponentType<Record<string, unknown>>
	props?: Record<string, unknown>
	onClose?: () => void
}

// Form Types
export interface FormState<T = unknown> {
	values: T
	errors: Record<string, string>
	touched: Record<string, boolean>
	isSubmitting: boolean
	isValid: boolean
}
