/**
 * Payment Methods API Client
 * Phase 3: Tenant Payment System
 */

import type {
	CreateSetupIntentRequest,
	PaymentMethodResponse,
	PaymentMethodSetupIntent,
	SetDefaultPaymentMethodRequest
} from '@repo/shared/types/core'
import { apiClient } from '@repo/shared/utils/api-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export const paymentMethodsApi = {
	/**
	 * Create a SetupIntent for collecting payment method details
	 */
	createSetupIntent: async (
		data: CreateSetupIntentRequest
	): Promise<PaymentMethodSetupIntent> => {
		return await apiClient<PaymentMethodSetupIntent>(
			`${API_BASE_URL}/api/v1/payment-methods/setup-intent`,
			{
				method: 'POST',
				body: JSON.stringify(data)
			}
		)
	},

	/**
	 * Save a payment method after SetupIntent confirmation
	 */
	savePaymentMethod: async (paymentMethodId: string): Promise<{ success: boolean }> => {
		return await apiClient<{ success: boolean }>(
			`${API_BASE_URL}/api/v1/payment-methods/save`,
			{
				method: 'POST',
				body: JSON.stringify({ paymentMethodId })
			}
		)
	},

	/**
	 * List all payment methods for the current user
	 */
	listPaymentMethods: async (): Promise<PaymentMethodResponse[]> => {
		const response = await apiClient<{ paymentMethods: PaymentMethodResponse[] }>(
			`${API_BASE_URL}/api/v1/payment-methods`
		)
		return response.paymentMethods
	},

	/**
	 * Set a payment method as default
	 */
	setDefaultPaymentMethod: async (
		data: SetDefaultPaymentMethodRequest
	): Promise<{ success: boolean }> => {
		return await apiClient<{ success: boolean }>(
			`${API_BASE_URL}/api/v1/payment-methods/${data.paymentMethodId}/default`,
			{
				method: 'PATCH'
			}
		)
	},

	/**
	 * Delete a payment method
	 */
	deletePaymentMethod: async (paymentMethodId: string): Promise<{ success: boolean }> => {
		return await apiClient<{ success: boolean }>(
			`${API_BASE_URL}/api/v1/payment-methods/${paymentMethodId}`,
			{
				method: 'DELETE'
			}
		)
	}
}
