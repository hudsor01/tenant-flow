/**
 * @deprecated Use the unified apiClient from '../api-client' instead
 * This wrapper is maintained for backward compatibility only
 */

import { apiClient } from '../api-client'
import type { 
	Subscription, 
	Invoice, 
	PaymentMethod, 
	CreateCheckoutSessionRequest,
	CreateCheckoutSessionResponse,
	CreatePortalInput,
	UpdateSubscriptionParams
} from '@repo/shared'
import type { UsageMetrics } from '@/state/types'

export class BillingApi {
	static async getSubscription(): Promise<Subscription> {
		return apiClient.getSubscription()
	}

	static async getInvoices(): Promise<Invoice[]> {
		return apiClient.getInvoices()
	}

	static async getPaymentMethods(): Promise<PaymentMethod[]> {
		return apiClient.getPaymentMethods()
	}

	static async createCheckoutSession(data: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
		return apiClient.createCheckoutSession(data)
	}

	static async createPortalSession(data: CreatePortalInput): Promise<{ url: string }> {
		return apiClient.createPortalSession(data)
	}

	static async updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription> {
		return apiClient.updateSubscription(params)
	}

	static async cancelSubscription(): Promise<{ message: string }> {
		return apiClient.cancelSubscription()
	}

	static async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
		return apiClient.addPaymentMethod(paymentMethodId)
	}

	static async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ message: string }> {
		return apiClient.setDefaultPaymentMethod(paymentMethodId)
	}

	static async getUsage(): Promise<UsageMetrics> {
		const response = await apiClient.getUsage()
		// Map the API response to frontend UsageMetrics format
		return {
			properties_count: response.properties || 0,
			units_count: response.properties || 0, // Units are related to properties
			tenants_count: response.tenants || 0,
			team_members_count: response.tenants || 0, // Team members mapped from tenants
			storage_gb: 0, // Storage not available from this endpoint
			api_calls_this_month: 0, // API calls not available from this endpoint
			last_updated: new Date()
		}
	}

	static async downloadInvoice(invoiceId: string): Promise<{ url: string }> {
		return apiClient.downloadInvoice(invoiceId)
	}
}