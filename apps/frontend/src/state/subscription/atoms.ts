/**
 * Subscription Atoms
 * Core atoms for subscription and billing state
 * Replaces pricing-store.ts
 */

import { atom } from 'jotai'
import type { SubscriptionState, UsageMetrics } from '@/state/types'

// Core subscription atom - replaces usePricingStore's subscription
export const subscriptionAtom = atom<SubscriptionState | null>(null)

// Usage metrics atom - replaces usePricingStore's usageMetrics
export const usageMetricsAtom = atom<UsageMetrics | null>(null)

// Loading states
export const subscriptionLoadingAtom = atom<boolean>(false)
export const metricsLoadingAtom = atom<boolean>(false)

// Error states
export const subscriptionErrorAtom = atom<Error | null>(null)

// Derived atoms (selectors)
export const hasActiveSubscriptionAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	return (
		subscription?.status === 'active' || subscription?.status === 'trialing'
	)
})

export const isSubscriptionCanceledAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	return subscription?.cancel_at_period_end === true
})

export const subscriptionStatusAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	return subscription?.status || 'inactive'
})

export const daysUntilRenewalAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	if (!subscription?.current_period_end) return null

	const now = new Date()
	const endDate = new Date(subscription.current_period_end)
	const diffTime = endDate.getTime() - now.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

	return diffDays > 0 ? diffDays : 0
})

export const isInTrialAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	return subscription?.status === 'trialing'
})

export const trialDaysRemainingAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	if (!subscription?.trial_end) return null

	const now = new Date()
	const trialEnd = new Date(subscription.trial_end)
	const diffTime = trialEnd.getTime() - now.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

	return diffDays > 0 ? diffDays : 0
})

// Usage limit atoms
export const propertyLimitAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	// TODO: Get limits from subscription metadata or plan details
	return subscription?.status === 'active' ? 100 : 3
})

export const unitLimitAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	// TODO: Get limits from subscription metadata or plan details
	return subscription?.status === 'active' ? 500 : 10
})

export const tenantLimitAtom = atom(get => {
	const subscription = get(subscriptionAtom)
	// TODO: Get limits from subscription metadata or plan details
	return subscription?.status === 'active' ? 1000 : 25
})

// Usage percentage atoms
export const propertyUsagePercentageAtom = atom(get => {
	const metrics = get(usageMetricsAtom)
	const limit = get(propertyLimitAtom)
	if (!metrics || !limit) return 0
	return Math.round((metrics.properties_count / limit) * 100)
})

export const unitUsagePercentageAtom = atom(get => {
	const metrics = get(usageMetricsAtom)
	const limit = get(unitLimitAtom)
	if (!metrics || !limit) return 0
	return Math.round((metrics.units_count / limit) * 100)
})

export const tenantUsagePercentageAtom = atom(get => {
	const metrics = get(usageMetricsAtom)
	const limit = get(tenantLimitAtom)
	if (!metrics || !limit) return 0
	return Math.round((metrics.tenants_count / limit) * 100)
})
