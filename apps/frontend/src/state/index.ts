/**
 * State Management Main Export - POST-JOTAI MIGRATION
 * State is now handled via React primitives and contexts
 */

// Type exports only - atoms removed
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

// State management patterns:
// - Auth: Use AuthProvider context from @/providers/auth-provider  
// - Forms: Use React Hook Form
// - Server data: Use TanStack Query
// - Local state: Use useState/useReducer
// - Subscription: Use consolidated hooks from @/hooks/useSubscription
