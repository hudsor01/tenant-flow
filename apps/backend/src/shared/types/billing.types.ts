import type { Database } from '@repo/shared/types/supabase-generated'
import type {
	MinimalInvoice,
	MinimalSubscription,
	PaymentNotificationData
} from '@repo/shared/types/backend-domain'

// Use Database schema for billing types - NO DUPLICATION
export type Subscription = Database['public']['Tables']['Subscription']['Row']
export type Invoice = Database['public']['Tables']['Invoice']['Row']

export type { PaymentNotificationData, MinimalSubscription, MinimalInvoice }
