/**
 * Subscription Hook
 * Provides subscription state and actions using Jotai
 * Replaces usePricingStore
 */

import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'
import {
	subscriptionAtom,
	usageMetricsAtom,
	subscriptionLoadingAtom,
	metricsLoadingAtom,
	subscriptionErrorAtom,
	hasActiveSubscriptionAtom,
	isSubscriptionCanceledAtom,
	subscriptionStatusAtom
} from '../subscription/atoms'
import {
	setSubscriptionAtom,
	clearSubscriptionAtom,
	setUsageMetricsAtom,
	syncSubscriptionAtom,
	syncUsageMetricsAtom
} from '../subscription/actions'
import { userAtom } from '@/atoms'

export function useSubscription() {
	// State atoms
	const [subscription] = useAtom(subscriptionAtom)
	const [usageMetrics] = useAtom(usageMetricsAtom)
	const [loading] = useAtom(subscriptionLoadingAtom)
	const [metricsLoading] = useAtom(metricsLoadingAtom)
	const [error] = useAtom(subscriptionErrorAtom)

	// Derived state
	const hasActiveSubscription = useAtomValue(hasActiveSubscriptionAtom)
	const isSubscriptionCanceled = useAtomValue(isSubscriptionCanceledAtom)
	const subscriptionStatus = useAtomValue(subscriptionStatusAtom)

	// Actions
	const setSubscription = useSetAtom(setSubscriptionAtom)
	const clearSubscription = useSetAtom(clearSubscriptionAtom)
	const setUsageMetrics = useSetAtom(setUsageMetricsAtom)
	const syncSubscription = useSetAtom(syncSubscriptionAtom)
	const syncUsageMetrics = useSetAtom(syncUsageMetricsAtom)

	// User for sync operations
	const user = useAtomValue(userAtom)

	// Sync both subscription and metrics
	const syncAll = useCallback(async () => {
		if (!user?.id) return

		await Promise.all([
			syncSubscription(user.id),
			syncUsageMetrics(user.id)
		])
	}, [user?.id, syncSubscription, syncUsageMetrics])

	return {
		// State
		subscription,
		usageMetrics,
		loading: loading || metricsLoading,
		error,
		hasActiveSubscription,
		isSubscriptionCanceled,
		subscriptionStatus,

		// Actions
		setSubscription,
		clearSubscription,
		setUsageMetrics,
		syncSubscription,
		syncUsageMetrics,
		syncAll
	}
}
