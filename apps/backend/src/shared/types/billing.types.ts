import type {
	MinimalInvoice,
	MinimalSubscription,
	PaymentNotificationData
} from '@repo/shared/types/backend-domain'
import type { Database } from '@repo/shared/types/supabase-generated'

// Use Database schema for billing types - NO DUPLICATION
export type Subscription = Database['public']['Tables']['subscription']['Row']
export type Invoice = Database['public']['Tables']['invoice']['Row']

export type { MinimalInvoice, MinimalSubscription, PaymentNotificationData }
