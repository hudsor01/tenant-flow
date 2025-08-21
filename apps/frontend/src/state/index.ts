/**
 * State Management Main Export
 * Centralized exports for all state atoms, actions, and hooks
 */

// Store exports
export { store } from './store'

// Type exports
export type {
	User,
	AuthError,
	SubscriptionState,
	SubscriptionItem,
	UsageMetrics,
	Notification,
	Modal,
	FormState
} from './types'

// Auth exports - Re-export from core atoms
export {
	// Atoms
	userAtom,
	authLoadingAtom,
	isAuthenticatedAtom,
	organizationAtom,
	userRoleAtom,
	isSessionActiveAtom,
	userPermissionsAtom,
	// Actions
	setUserAtom,
	updateUserAtom,
	clearAuthAtom,
	updateLastActivityAtom
} from '../atoms/core/user'

// Subscription exports
export {
	// Atoms
	subscriptionAtom,
	usageMetricsAtom,
	subscriptionLoadingAtom,
	metricsLoadingAtom,
	subscriptionErrorAtom,
	hasActiveSubscriptionAtom,
	isSubscriptionCanceledAtom,
	subscriptionStatusAtom,
	daysUntilRenewalAtom,
	isInTrialAtom,
	trialDaysRemainingAtom,
	propertyLimitAtom,
	unitLimitAtom,
	tenantLimitAtom,
	propertyUsagePercentageAtom,
	unitUsagePercentageAtom,
	tenantUsagePercentageAtom
} from './subscription/atoms'

export {
	// Actions
	setSubscriptionAtom,
	clearSubscriptionAtom,
	setUsageMetricsAtom,
	updateSubscriptionStatusAtom,
	setSubscriptionLoadingAtom,
	setMetricsLoadingAtom,
	setSubscriptionErrorAtom,
	syncSubscriptionAtom,
	syncUsageMetricsAtom
} from './subscription/actions'

// Hook exports
export { useSubscription } from './hooks/use-subscription'
