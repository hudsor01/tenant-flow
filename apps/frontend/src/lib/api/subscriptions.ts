/**
 * Subscriptions API Client
 * Phase 4: Autopay Subscriptions
 */

import type {
	CreateSubscriptionRequest,
	RentSubscriptionResponse,
	SubscriptionActionResponse,
	UpdateSubscriptionRequest
} from '@repo/shared/types/core'
import { apiClient } from '@repo/shared/utils/api-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export const subscriptionsApi = {
	/**
	 * Create a new rent subscription
	 */
	create: async (
		data: CreateSubscriptionRequest
	): Promise<RentSubscriptionResponse> => {
		return await apiClient<RentSubscriptionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions`,
			{
				method: 'POST',
				body: JSON.stringify(data)
			}
		)
	},

	/**
	 * List all subscriptions for the current user
	 */
	list: async (): Promise<RentSubscriptionResponse[]> => {
		const response = await apiClient<{ subscriptions: RentSubscriptionResponse[] }>(
			`${API_BASE_URL}/api/v1/subscriptions`
		)
		return response.subscriptions
	},

	/**
	 * Get subscription by ID
	 */
	get: async (id: string): Promise<RentSubscriptionResponse> => {
		return await apiClient<RentSubscriptionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}`
		)
	},

	/**
	 * Update subscription
	 */
	update: async (
		id: string,
		data: UpdateSubscriptionRequest
	): Promise<RentSubscriptionResponse> => {
		return await apiClient<RentSubscriptionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}`,
			{
				method: 'PATCH',
				body: JSON.stringify(data)
			}
		)
	},

	/**
	 * Pause subscription
	 */
	pause: async (id: string): Promise<SubscriptionActionResponse> => {
		return await apiClient<SubscriptionActionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}/pause`,
			{
				method: 'POST'
			}
		)
	},

	/**
	 * Resume subscription
	 */
	resume: async (id: string): Promise<SubscriptionActionResponse> => {
		return await apiClient<SubscriptionActionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}/resume`,
			{
				method: 'POST'
			}
		)
	},

	/**
	 * Cancel subscription
	 */
	cancel: async (id: string): Promise<SubscriptionActionResponse> => {
		return await apiClient<SubscriptionActionResponse>(
			`${API_BASE_URL}/api/v1/subscriptions/${id}/cancel`,
			{
				method: 'POST'
			}
		)
	}
}
