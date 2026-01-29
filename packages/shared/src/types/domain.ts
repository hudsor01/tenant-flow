/**
 * CONSOLIDATED DOMAIN TYPES
 *
 * Merged small domain-specific type files into single consolidated file
 * Reduces type file count while maintaining domain separation
 */

// CSP types - defined here as the canonical source (used by security.controller.ts)
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

// CONTACT DOMAIN

// UI-only const for contact form types (not stored in database)
// Using `satisfies` for type validation while preserving literal types
export const ContactFormType = {
	GENERAL_INQUIRY: 'general',
	SALES: 'sales',
	SUPPORT: 'support',
	PARTNERSHIP: 'partnership',
	DEMO_REQUEST: 'demo'
} as const satisfies Record<string, string>

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

export const WebVitalMetricName = {
	CLS: 'CLS',
	FCP: 'FCP',
	FID: 'FID',
	INP: 'INP',
	LCP: 'LCP',
	TTFB: 'TTFB'
} as const satisfies Record<string, string>

export const WebVitalRating = {
	GOOD: 'good',
	NEEDS_IMPROVEMENT: 'needs-improvement',
	POOR: 'poor'
} as const satisfies Record<string, string>

export const WebVitalLabel = {
	WEB_VITAL: 'web-vital',
	CUSTOM: 'custom'
} as const satisfies Record<string, string>

export const WebVitalNavigationType = {
	NAVIGATE: 'navigate',
	RELOAD: 'reload',
	BACK_FORWARD: 'back-forward',
	PRERENDER: 'prerender'
} as const satisfies Record<string, string>

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
} as const satisfies Record<string, string>

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

// NOTE: Import FileUploadOptions directly from './file-upload.js' - not re-exported here

export type StorageEntityType =
	| 'properties'
	| 'tenants'
	| 'maintenance'
	| 'user'
export type StorageFileType = 'document' | 'image' | 'avatar'

// UI/UX PREFERENCES DOMAIN

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Data Density modes for UI spacing and information density
 * - compact: Tighter spacing, smaller rows (h-8), more data visible
 * - comfortable: Default spacing (h-12), balanced view
 * - spacious: Generous spacing (h-16), easier scanning
 */
export type DataDensity = 'compact' | 'comfortable' | 'spacious'

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

// NOTE: Import WebhookNotification directly from './stripe.js' - not re-exported here
// NOTE: Import SecurityEvent directly from './security.js' - not re-exported here
