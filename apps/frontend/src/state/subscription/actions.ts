/**
 * Subscription Actions
 * Write-only atoms for subscription state mutations
 * Replaces usePricingStore methods
 */

import { atom } from 'jotai'
import type { SubscriptionState, UsageMetrics } from '@/state/types'
import {
	subscriptionAtom,
	usageMetricsAtom,
	subscriptionLoadingAtom,
	metricsLoadingAtom,
	subscriptionErrorAtom
} from './atoms'

// Set subscription - replaces usePricingStore.setSubscription
export const setSubscriptionAtom = atom(
	null,
	(_get, set, subscription: SubscriptionState | null) => {
		set(subscriptionAtom, subscription)
		set(subscriptionLoadingAtom, false)
		set(subscriptionErrorAtom, null)
	}
)

// Clear subscription - replaces usePricingStore.clearSubscription
export const clearSubscriptionAtom = atom(null, (_get, set) => {
	set(subscriptionAtom, null)
	set(usageMetricsAtom, null)
	set(subscriptionErrorAtom, null)
	set(subscriptionLoadingAtom, false)
	set(metricsLoadingAtom, false)
})

// Set usage metrics - replaces usePricingStore.setUsageMetrics
export const setUsageMetricsAtom = atom(
	null,
	(_get, set, metrics: UsageMetrics | null) => {
		set(usageMetricsAtom, metrics)
		set(metricsLoadingAtom, false)
	}
)

// Update subscription status
export const updateSubscriptionStatusAtom = atom(
	null,
	(_get, set, status: SubscriptionState['status']) => {
		const current = _get(subscriptionAtom)
		if (current) {
			set(subscriptionAtom, { ...current, status })
		}
	}
)

// Set subscription loading
export const setSubscriptionLoadingAtom = atom(
	null,
	(_get, set, loading: boolean) => {
		set(subscriptionLoadingAtom, loading)
	}
)

// Set metrics loading
export const setMetricsLoadingAtom = atom(
	null,
	(_get, set, loading: boolean) => {
		set(metricsLoadingAtom, loading)
	}
)

// Set subscription error
export const setSubscriptionErrorAtom = atom(
	null,
	(_get, set, error: Error | null) => {
		set(subscriptionErrorAtom, error)
		set(subscriptionLoadingAtom, false)
	}
)

// Sync subscription (async action)
export const syncSubscriptionAtom = atom(
	null,
	async (_get, set, _userId: string) => {
		set(subscriptionLoadingAtom, true)
		set(subscriptionErrorAtom, null)

		try {
			// Fetch subscription from backend API
			const response = await fetch('/api/subscriptions/current', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			})

			if (!response.ok) {
				if (response.status === 404) {
					// No active subscription
					set(subscriptionAtom, null)
					return null
				}
				throw new Error(
					`Failed to fetch subscription: ${response.statusText}`
				)
			}

			const { subscription } = await response.json()

			if (!subscription) {
				set(subscriptionAtom, null)
				return null
			}

			// Transform to our format
			const subscriptionState: SubscriptionState = {
				id: subscription.id,
				status: subscription.status,
				current_period_start: new Date(
					subscription.current_period_start * 1000
				),
				current_period_end: new Date(
					subscription.current_period_end * 1000
				),
				cancel_at_period_end: subscription.cancel_at_period_end,
				canceled_at: subscription.canceled_at
					? new Date(subscription.canceled_at * 1000)
					: undefined,
				ended_at: subscription.ended_at
					? new Date(subscription.ended_at * 1000)
					: undefined,
				trial_start: subscription.trial_start
					? new Date(subscription.trial_start * 1000)
					: undefined,
				trial_end: subscription.trial_end
					? new Date(subscription.trial_end * 1000)
					: undefined,
				items:
					subscription.items?.map((item: {
						id: string
						price?: { id?: string; product?: { id?: string } }
						price_id?: string
						product_id?: string
						quantity: number
					}) => ({
						id: item.id,
						price_id: item.price?.id || item.price_id,
						product_id: item.price?.product?.id || item.product_id,
						quantity: item.quantity
					})) || [],
				metadata: subscription.metadata
			}

			set(subscriptionAtom, subscriptionState)
			return subscriptionState
		} catch (error) {
			set(subscriptionErrorAtom, error as Error)
			return null
		} finally {
			set(subscriptionLoadingAtom, false)
		}
	}
)

// Sync usage metrics (async action)
export const syncUsageMetricsAtom = atom(
	null,
	async (_get, set, _userId: string) => {
		set(metricsLoadingAtom, true)

		try {
			const response = await fetch('/api/subscriptions/usage', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			})

			if (!response.ok) {
				throw new Error(
					`Failed to fetch usage metrics: ${response.statusText}`
				)
			}

			const { metrics } = await response.json()

			const usageMetrics: UsageMetrics = {
				properties_count: metrics.properties_count ?? 0,
				units_count: metrics.units_count ?? 0,
				tenants_count: metrics.tenants_count ?? 0,
				team_members_count: metrics.team_members_count ?? 0,
				storage_gb: metrics.storage_gb ?? 0,
				api_calls_this_month: metrics.api_calls_this_month ?? 0,
				last_updated: new Date(metrics.last_updated ?? Date.now())
			}

			set(usageMetricsAtom, usageMetrics)
			return usageMetrics
		} catch (error) {
			console.error('Usage metrics sync error:', error)
			return null
		} finally {
			set(metricsLoadingAtom, false)
		}
	}
)
