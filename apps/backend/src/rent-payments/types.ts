import type { Database } from '@repo/shared/types/supabase-generated'

export type RentPayment = Database['public']['Tables']['RentPayment']['Row']
export type Tenant = Database['public']['Tables']['Tenant']['Row']
export type Lease = Database['public']['Tables']['Lease']['Row']
export type Property = Database['public']['Tables']['Property']['Row']
export type Unit = Database['public']['Tables']['Unit']['Row']
export type User = Database['public']['Tables']['User']['Row']
export type Subscription = Database['public']['Tables']['Subscription']['Row']
export type RentSubscription =
  Database['public']['Tables']['RentSubscription']['Row']
export type TenantPaymentMethod = Database['public']['Tables']['TenantPaymentMethod']['Row']
