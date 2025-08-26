/**
 * Billing API - Direct Stripe integration
 * No abstractions, direct API calls only
 */

import { apiClient } from '@/lib/api-client'
<<<<<<< HEAD
import type {} from '@repo/shared'
import {
	CheckoutSessionResponseSchema,
	PortalSessionResponseSchema,
	SubscriptionResponseSchema
} from '@/lib/api/schemas/billing'

// Actual response types from backend endpoints
// Response interfaces are validated by Zod schemas in `/lib/api/schemas/billing`
=======
import type { Subscription, PaymentMethod, Invoice } from '@repo/shared'

// Actual response types from backend endpoints
interface CheckoutSessionResponse {
	url: string
	sessionId: string
}

interface PortalSessionResponse {
	url: string
}

interface SubscriptionResponse {
	subscription: {
		id: string
		status: string
	}
	clientSecret?: string
	requiresAction?: boolean
}
>>>>>>> origin/main

/**
 * Query keys for React Query caching
 */
export const billingKeys = {
	all: ['billing'] as const,
	subscription: () => [...billingKeys.all, 'subscription'] as const,
	paymentMethods: () => [...billingKeys.all, 'payment-methods'] as const,
	invoices: () => [...billingKeys.all, 'invoices'] as const,
	usage: () => [...billingKeys.all, 'usage'] as const
}

/**
 * Billing API functions - Direct calls only
 */
export const billingApi = {
	// Subscription - Managed through Stripe Customer Portal
	async getSubscription() {
		// Note: Subscription details are managed through Customer Portal
		// Backend doesn't expose subscription endpoints directly
		throw new Error(
			'Subscription details should be accessed through Customer Portal'
		)
	},

<<<<<<< HEAD
	async updateSubscription(_data: {
=======
	async updateSubscription(data: {
>>>>>>> origin/main
		newPriceId: string
		userId: string
		prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice'
	}) {
		// Note: Subscription updates are handled through Customer Portal
		const portalSession = await this.createPortalSession()
		return {
			message: 'Redirecting to customer portal for subscription update',
			portalUrl: portalSession.url
		}
	},

	async cancelSubscription() {
		// Note: Subscription management is handled through Stripe Customer Portal
		// This method redirects to portal for cancellation
		const portalSession = await this.createPortalSession()
		return {
			message: 'Redirecting to customer portal for cancellation',
			portalUrl: portalSession.url
		}
	},

	// Payment Methods - Managed through Stripe Customer Portal
	async getPaymentMethods() {
		// Note: Payment methods are managed through Customer Portal
		// Backend doesn't expose payment method endpoints directly
		const portalSession = await this.createPortalSession()
		return {
			portalUrl: portalSession.url,
			message: 'Redirecting to customer portal for payment methods'
		}
	},

<<<<<<< HEAD
	async addPaymentMethod(_paymentMethodId: string) {
=======
	async addPaymentMethod(paymentMethodId: string) {
>>>>>>> origin/main
		// Note: Adding payment methods is handled through Customer Portal
		const portalSession = await this.createPortalSession()
		return {
			portalUrl: portalSession.url,
			message: 'Redirecting to customer portal to add payment method'
		}
	},

<<<<<<< HEAD
	async setDefaultPaymentMethod(_paymentMethodId: string) {
=======
	async setDefaultPaymentMethod(paymentMethodId: string) {
>>>>>>> origin/main
		// Note: Payment method management is handled through Stripe Customer Portal
		// This method redirects to portal for payment method updates
		const portalSession = await this.createPortalSession()
		return {
			message: 'Redirecting to customer portal for payment method update',
			portalUrl: portalSession.url
		}
	},

<<<<<<< HEAD
	async removePaymentMethod(_paymentMethodId: string) {
=======
	async removePaymentMethod(paymentMethodId: string) {
>>>>>>> origin/main
		// Note: Removing payment methods is handled through Customer Portal
		const portalSession = await this.createPortalSession()
		return {
			message: 'Redirecting to customer portal to remove payment method',
			portalUrl: portalSession.url
		}
	},

	// Checkout & Portal - Match backend endpoints exactly
	async createCheckoutSession(data: {
		planId: string // Match backend DTO field name
		interval: 'monthly' | 'annual' // Match backend DTO field name
		successUrl?: string
		cancelUrl?: string
	}) {
<<<<<<< HEAD
		return apiClient.postValidated<{ url: string; sessionId?: string }>(
			'/stripe/checkout',
			CheckoutSessionResponseSchema,
			'CheckoutSession',
			data as Record<string, unknown>
		)
	},

	async createPortalSession(data?: { returnUrl?: string }) {
		return apiClient.postValidated<{ url: string }>(
			'/stripe/portal',
			PortalSessionResponseSchema,
			'PortalSession',
			data as Record<string, unknown>
		)
=======
		return apiClient.post<CheckoutSessionResponse>('/stripe/checkout', data)
	},

	async createPortalSession(data?: { returnUrl?: string }) {
		return apiClient.post<PortalSessionResponse>('/stripe/portal', data)
>>>>>>> origin/main
	},

	async createSubscription(data: {
		confirmationTokenId: string
		planType: string
		billingInterval: 'month' | 'year'
	}) {
<<<<<<< HEAD
		return apiClient.postValidated<{
			subscription: { id: string; status: string }
			clientSecret?: string
			requiresAction?: boolean
		}>(
			'/stripe/create-subscription',
			SubscriptionResponseSchema,
			'CreateSubscription',
			data as Record<string, unknown>
=======
		return apiClient.post<SubscriptionResponse>(
			'/stripe/create-subscription',
			data
>>>>>>> origin/main
		)
	},

	// Invoices - Managed through Stripe Customer Portal
	async getInvoices() {
		// Note: Invoice history is available through Customer Portal
		// Backend doesn't expose invoice endpoints directly
		const portalSession = await this.createPortalSession()
		return {
			portalUrl: portalSession.url,
			message: 'Redirecting to customer portal for invoice history'
		}
	},

<<<<<<< HEAD
	async downloadInvoice(_invoiceId: string) {
=======
	async downloadInvoice(invoiceId: string) {
>>>>>>> origin/main
		// Note: Invoice downloads are handled through Customer Portal
		const portalSession = await this.createPortalSession()
		return {
			portalUrl: portalSession.url,
			message: 'Redirecting to customer portal to download invoice'
		}
	}
}
