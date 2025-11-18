/**
 * CONSOLIDATED DOMAIN TYPES
 *
 * Merged small domain-specific type files into single consolidated file
 * Reduces type file count while maintaining domain separation
 */

// CONTACT DOMAIN

// UI-only const for contact form types (not stored in database)
export const ContactFormType = {
	GENERAL_INQUIRY: 'general',
	SALES: 'sales',
	SUPPORT: 'support',
	PARTNERSHIP: 'partnership',
	DEMO_REQUEST: 'demo'
} as const


export interface ContactFormRequest {
	name: string
	email: string
	subject: string
	message: string
	type: 'sales' | 'support' | 'general'
	phone?: string
	company?: string
	urgency?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface ContactFormResponse {
	success: boolean
	message: string
	contactId?: string
}


export const NotificationType = {
	PAYMENT: 'payment',
	BILLING: 'billing',
	SYSTEM: 'system'
} as const

export type NotificationTypeValue =
	(typeof NotificationType)[keyof typeof NotificationType]


export const WebVitalMetricName = {
	CLS: 'CLS',
	FCP: 'FCP',
	FID: 'FID',
	INP: 'INP',
	LCP: 'LCP',
	TTFB: 'TTFB'
} as const

export const WebVitalRating = {
	GOOD: 'good',
	NEEDS_IMPROVEMENT: 'needs-improvement',
	POOR: 'poor'
} as const

export const WebVitalLabel = {
	WEB_VITAL: 'web-vital',
	CUSTOM: 'custom'
} as const

export const WebVitalNavigationType = {
	NAVIGATE: 'navigate',
	RELOAD: 'reload',
	BACK_FORWARD: 'back-forward',
	PRERENDER: 'prerender'
} as const

export type WebVitalMetricNameValue =
	(typeof WebVitalMetricName)[keyof typeof WebVitalMetricName]
export type WebVitalRatingValue =
	(typeof WebVitalRating)[keyof typeof WebVitalRating]
export type WebVitalLabelValue =
	(typeof WebVitalLabel)[keyof typeof WebVitalLabel]
export type WebVitalNavigationTypeValue =
	(typeof WebVitalNavigationType)[keyof typeof WebVitalNavigationType]

// STRIPE WEBHOOK DOMAIN

// Use Stripe SDK types directly when available, or const for known webhook event types
export const StripeWebhookEventType = {
	CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
	CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
	CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
	CUSTOMER_CREATED: 'customer.created',
	CUSTOMER_UPDATED: 'customer.updated',
	INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
	INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
	CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed'
} as const

export type StripeWebhookEventTypeValue =
	(typeof StripeWebhookEventType)[keyof typeof StripeWebhookEventType]



export interface StorageUploadResult {
	url: string
	path: string
	filename: string
	size: number
	mimeType: string
	bucket: string
}

export type { FileUploadOptions } from './file-upload.js'

export type StorageEntityType = 'properties' | 'tenants' | 'maintenance' | 'user'
export type StorageFileType = 'document' | 'image' | 'avatar'



export interface RevenueAnalytics {
	period: string
	total_revenue: number
	subscription_revenue: number
	one_time_revenue: number
	customer_count: number
	new_customers: number
	churned_customers: number
	mrr: number
	arr: number
}

export interface ChurnAnalytics {
	month: string
	churned_subscriptions: number
	avg_lifetime_days: number
	churn_rate_percent: number
	total_active_start_month: number
}

export interface CustomerLifetimeValue {
	customer_id: string
	email: string
	total_revenue: number
	subscription_count: number
	first_subscription_date: string
	last_cancellation_date?: string
	avg_revenue_per_subscription: number
	status: 'Active' | 'Churned'
	lifetime_days?: number
}


export interface WebSocketMessage<
	T = Record<string, string | number | boolean | null>
> {
	type: string
	data: T
	timestamp?: string
	user_id?: string
}

export interface MaintenanceUpdateMessage
	extends WebSocketMessage<{
		id: string
		type: string
		status?: string
		priority?: string
		unit_id?: string
		assignedTo?: string
		metadata?: Record<string, string | number | boolean | null>
	}> {
	type: 'maintenance_update'
}

export type TypedWebSocketMessage = MaintenanceUpdateMessage | WebSocketMessage



export interface UserSession {
	id: string
	user_id: string
	user?: Record<string, unknown> | null
	token: string
	isAuthenticated: boolean
	expiresAt: string
	lastActivity: Date | null
	sessionExpiry: Date | null
	created_at: string
	metadata?: Record<string, unknown>
}

export interface SessionConfig {
	maxAge: number
	secure: boolean
	httpOnly: boolean
	sameSite: 'strict' | 'lax' | 'none'
}

// USER MANAGEMENT DOMAIN

export interface UserManagementConfig {
	maxLoginAttempts: number
	lockoutDuration: number
	passwordMinLength: number
	requireEmailVerification: boolean
}

export interface UserStats {
	totalUsers: number
	activeUsers: number
	newUsersThisMonth: number
	verifiedUsers: number
}



export type ThemeMode = 'light' | 'dark' | 'system'

export type SemanticColorToken =
	| 'background'
	| 'foreground'
	| 'primary'
	| 'primary-foreground'
	| 'secondary'
	| 'secondary-foreground'
	| 'accent'
	| 'accent-foreground'
	| 'muted'
	| 'muted-foreground'
	| 'success'
	| 'success-foreground'
	| 'warning'
	| 'warning-foreground'
	| 'error'
	| 'error-foreground'
	| 'info'
	| 'info-foreground'
	| 'border'
	| 'ring'
	| 'input'
	| 'card'
	| 'card-foreground'

export interface ColorRationale {
	primary: string
	secondary: string
	background: string
	reasoning: string
}



export type StripeWebhookEventTypes =
	| 'customer.subscription.created'
	| 'customer.subscription.updated'
	| 'customer.subscription.deleted'
	| 'invoice.payment_succeeded'
	| 'invoice.payment_failed'



export type { WebhookNotification } from './stripe.js'


export interface CSPViolationReport {
	'document-uri': string
	referrer: string
	'violated-directive': string
	'effective-directive': string
	'original-policy': string
	disposition: string
	'blocked-uri': string
	'line-number': number
	'column-number': number
	'source-file': string
	'status-code': number
	'script-sample': string
}

export interface CSPReportBody {
	'csp-report': CSPViolationReport
}

export type { SecurityEvent } from './security.js'