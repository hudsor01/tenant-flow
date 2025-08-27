import type { Database } from '@repo/shared'

// Use Database schema for billing types - NO DUPLICATION  
export type Subscription = Database['public']['Tables']['Subscription']['Row']
export type Invoice = Database['public']['Tables']['Invoice']['Row']

// Notification types enum
export enum NotificationType {
	PAYMENT = 'payment',
	BILLING = 'billing',
	SYSTEM = 'system'
}

// Minimal types for webhook/notification handling
export interface PaymentNotificationData {
	subscriptionId: string
	customerId: string
	userId: string
	amount: number
	currency: string
	status: 'succeeded' | 'failed' | 'pending' | 'canceled'
	paymentDate: string
	attemptCount?: number
	failureReason?: string
	invoiceUrl?: string
	invoicePdf?: string
	cancelAtPeriodEnd?: boolean
	currentPeriodEnd?: string
}

export interface MinimalSubscription {
	id: string
	customer: string | { id: string }
	customerId: string
	status: string
	currentPeriodStart: string
	currentPeriodEnd: string
}

export interface MinimalInvoice {
	id: string
	subscriptionId: string
	amount: number
	currency: string
	amount_due: number
	amount_paid: number
	status: string
	dueDate: string
}