import type { Database } from '@repo/shared/types/supabase-generated'

export type RentPayment = Database['public']['Tables']['rent_payment']['Row']
export type Tenant = Database['public']['Tables']['tenant']['Row']
export type Lease = Database['public']['Tables']['lease']['Row']
export type Property = Database['public']['Tables']['property']['Row']
export type Unit = Database['public']['Tables']['unit']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Subscription = Database['public']['Tables']['subscription']['Row']
export type RentSubscription =
	Database['public']['Tables']['rent_subscription']['Row']
export type TenantPaymentMethod =
	Database['public']['Tables']['tenant_payment_method']['Row']
