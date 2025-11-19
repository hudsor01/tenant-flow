import type { Database } from '@repo/shared/types/supabase'

export type RentPayment = Database['public']['Tables']['rent_payments']['Row']
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type Lease = Database['public']['Tables']['leases']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type Unit = Database['public']['Tables']['units']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type RentSubscription =
	Database['public']['Tables']['subscriptions']['Row']
export type TenantPaymentMethod =
	Database['public']['Tables']['payment_methods']['Row']
