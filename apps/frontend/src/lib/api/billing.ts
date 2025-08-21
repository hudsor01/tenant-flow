/**
 * Billing API client
 * Provides billing and subscription related API calls
 */

import { ApiService } from './api-service'
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
		return ApiService.getSubscription()
	}

	static async getInvoices(): Promise<Invoice[]> {
		return ApiService.getInvoices()
	}

	static async getPaymentMethods(): Promise<PaymentMethod[]> {
		return ApiService.getPaymentMethods()
	}

	static async createCheckoutSession(data: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
		return ApiService.createCheckoutSession(data)
	}

	static async createPortalSession(data: CreatePortalInput): Promise<{ url: string }> {
		return ApiService.createPortalSession(data)
	}

	static async updateSubscription(params: UpdateSubscriptionParams): Promise<Subscription> {
		return ApiService.updateSubscription(params)
	}

	static async cancelSubscription(): Promise<{ message: string }> {
		return ApiService.cancelSubscription()
	}

	static async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
		return ApiService.addPaymentMethod(paymentMethodId)
	}

	static async setDefaultPaymentMethod(paymentMethodId: string): Promise<{ message: string }> {
		return ApiService.setDefaultPaymentMethod(paymentMethodId)
	}

	static async getUsage(): Promise<UsageMetrics> {
		const response = await ApiService.getUsage()
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
		return ApiService.downloadInvoice(invoiceId)
	}
}