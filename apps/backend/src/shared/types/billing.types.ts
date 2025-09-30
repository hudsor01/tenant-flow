import type { Database } from '@repo/shared/types/supabase-generated'

// Use Database schema for billing types - NO DUPLICATION
export type Subscription = Database['public']['Tables']['Subscription']['Row']
export type Invoice = Database['public']['Tables']['Invoice']['Row']

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