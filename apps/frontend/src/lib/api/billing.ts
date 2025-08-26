/**
 * Billing API - Direct Stripe integration
 * No abstractions, direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type {} from '@repo/shared'
import {
	CheckoutSessionResponseSchema,
	PortalSessionResponseSchema,
	SubscriptionResponseSchema
} from '@/lib/api/schemas/billing'

// Actual response types from backend endpoints
// Response interfaces are validated by Zod schemas in `/lib/api/schemas/billing`

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

	async updateSubscription(_data: {
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

	async addPaymentMethod(_paymentMethodId: string) {
		// Note: Adding payment methods is handled through Customer Portal
		const portalSession = await this.createPortalSession()
		return {
			portalUrl: portalSession.url,
			message: 'Redirecting to customer portal to add payment method'
		}
	},

	async setDefaultPaymentMethod(_paymentMethodId: string) {
		// Note: Payment method management is handled through Stripe Customer Portal
		// This method redirects to portal for payment method updates
		const portalSession = await this.createPortalSession()
		return {
			message: 'Redirecting to customer portal for payment method update',
			portalUrl: portalSession.url
		}
	},

	async removePaymentMethod(_paymentMethodId: string) {
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
	},

	async createSubscription(data: {
		confirmationTokenId: string
		planType: string
		billingInterval: 'month' | 'year'
	}) {
		return apiClient.postValidated<{
			subscription: { id: string; status: string }
			clientSecret?: string
			requiresAction?: boolean
		}>(
			'/stripe/create-subscription',
			SubscriptionResponseSchema,
			'CreateSubscription',
			data as Record<string, unknown>
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

	async downloadInvoice(_invoiceId: string) {
		// Note: Invoice downloads are handled through Customer Portal
		const portalSession = await this.createPortalSession()
		return {
			portalUrl: portalSession.url,
			message: 'Redirecting to customer portal to download invoice'
		}
	}
}
