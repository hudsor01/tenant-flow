/**
 * CENTRALIZED Email Component Types
 * Consolidated from packages/emails/* inline definitions
 */

/**
 * Email-related types shared between frontend and backend
 */

/**
 * Options for sending an email
 */
export interface EmailOptions {
	to: string
	subject: string
	html: string
	text?: string
	from?: string
}

/**
 * Response from email sending service
 */
export interface SendEmailResponse {
	success: boolean
	messageId?: string
	error?: string
}

/**
 * Email template data for various notifications
 */
export interface EmailTemplateData {
	recipientName?: string
	subject: string
	preheader?: string
	content: string
	actionUrl?: string
	actionText?: string
	footerText?: string
}

// Email Props Interfaces
export interface Day7DemoInvitationProps {
	recipientName?: string
	demoLink?: string
}

export interface PaymentReminderEmailProps {
	tenantName?: string
	propertyAddress?: string
	rentAmount?: number
	dueDate?: string
	daysOverdue?: number
	lateFee?: number
	ownerName?: string
	ownerPhone?: string
	paymentUrl?: string
	reminderType?: ReminderType
}

export interface PropertyTipsEmailProps {
	firstName?: string
	tipCategory?: TipCategory
	seasonalFocus?: SeasonalFocus
	propertyCount?: number
}

export interface Day3EducationEmailProps {
	firstName?: string
	propertyCount?: number
	lastLogin?: string
}

export interface TenantInvitationEmailProps {
	tenantName: string
	propertyName: string
	propertyAddress: string
	ownerName: string
	invitationUrl: string
	expiresAt: string
}

export interface ReEngagementEmailProps {
	firstName?: string
	lastLogin?: string
	propertyCount?: number
}

export interface WelcomeEmailProps {
	firstName?: string
	companyName?: string
	activationUrl?: string
}

export interface LeaseExpirationAlertEmailProps {
	ownerName?: string
	tenantName?: string
	propertyAddress?: string
	leaseEndDate?: string
	daysUntilExpiration?: number
	renewalUrl?: string
}

export interface EmailConfirmationProps {
	userName: string
	confirmationUrl: string
	expiryTime: string
}

export interface FeatureAnnouncementEmailProps {
	firstName?: string
	featureTitle?: string
	featureDescription?: string
	betaAccess?: boolean
}

// Email Type Enums and Unions
export type ReminderType = 'upcoming' | 'due' | 'overdue'

export type TipCategory =
	| 'maintenance'
	| 'financial'
	| 'tenant-relations'
	| 'legal'
	| 'marketing'

export type SeasonalFocus = 'spring' | 'summer' | 'fall' | 'winter'

// Email Template Data Types
export interface TipData {
	icon: string
	title: string
	description: string
	action: string
	priority: 'High' | 'Medium' | 'Low'
}

export interface SeasonalTipsData {
	title: string
	tips: TipData[]
}

export interface ReminderData {
	emoji: string
	title: string
	urgency: string
	color: string
	message: string
	buttonText: string
	priority: string
}

// ADDITIONAL EMAIL TYPES - MIGRATED from backend email components

// MIGRATED from apps/backend/src/emails/payment-failed-email.tsx
export interface PaymentFailedEmailProps {
	customerEmail: string
	amount: number
	currency: string
	attemptCount: number
	invoiceUrl: string | null
	isLastAttempt: boolean
}

// MIGRATED from apps/backend/src/emails/payment-success-email.tsx
export interface PaymentSuccessEmailProps {
	customerEmail: string
	amount: number
	currency: string
	invoiceUrl: string | null
	invoicePdf: string | null
}

// MIGRATED from apps/backend/src/emails/maintenance-request-email.tsx
export interface MaintenanceRequestEmailProps {
	recipientEmail: string
	title: string
	propertyName: string
	unitNumber: string
	description: string
	priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
}
