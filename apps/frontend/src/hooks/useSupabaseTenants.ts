import { useInfiniteQuery, type SupabaseTableData } from './use-infinite-query'
import { supabaseSafe } from '@/lib/clients'
import { toast } from 'sonner'
import { useAuth } from './useAuth'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Type-safe tenant data
type TenantData = SupabaseTableData<'Tenant'>
type LeaseData = SupabaseTableData<'Lease'>

// Extended tenant type with relations - omit string relations and add object ones
type TenantWithRelations = Omit<TenantData, 'Lease'> & {
  Lease?: LeaseData[]
}

interface UseSupabaseTenantsOptions {
  pageSize?: number
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
  searchQuery?: string
}

export function useSupabaseTenants(options: UseSupabaseTenantsOptions = {}) {
  const { user } = useAuth()
  const {
    pageSize = 20,
    invitationStatus,
    searchQuery
  } = options

  const query = useInfiniteQuery<TenantWithRelations>({
    tableName: 'Tenant',
    columns: '*, Lease(*)',
    pageSize,
    trailingQuery: (query) => {
      let modifiedQuery = query

      // Apply filters
      if (invitationStatus) {
        modifiedQuery = modifiedQuery.eq('invitationStatus', invitationStatus)
      }

      // Search by name or email
      if (searchQuery) {
        modifiedQuery = modifiedQuery.or(
          `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        )
      }

      // Only show tenants invited by current user
      if (user?.id) {
        modifiedQuery = modifiedQuery.eq('invitedBy', user.id)
      }

      // Sort by name
      modifiedQuery = modifiedQuery.order('name', { ascending: true })

      return modifiedQuery
    }
  })

  return {
    ...query,
    tenants: query.data,
    totalCount: query.count,
    isEmpty: query.data.length === 0 && !query.isLoading
  }
}

// Mutations
export function useCreateTenant() {
  const { user } = useAuth()

  const create = async (data: Omit<TenantData, 'id' | 'createdAt' | 'updatedAt' | 'invitedBy' | 'invitedAt'>) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { data: tenant, error } = await supabaseSafe
      .from('Tenant')
      .insert({
        ...data,
        invitedBy: user.id,
        invitedAt: new Date().toISOString(),
        invitationToken,
        expiresAt: expiresAt.toISOString(),
        invitationStatus: 'PENDING'
      })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    // Send invitation email (you would implement this)
    // await sendInvitationEmail(tenant.email, invitationToken)

    toast.success('Tenant invited successfully')
    return tenant
  }

  return { create }
}

export function useUpdateTenant() {
  const update = async (id: string, data: Partial<TenantData>) => {
    const { data: tenant, error } = await supabaseSafe
      .from('Tenant')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Tenant updated successfully')
    return tenant
  }

  return { update }
}

export function useDeleteTenant() {
  const deleteTenant = async (id: string) => {
    const { error } = await supabaseSafe
      .from('Tenant')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Tenant removed successfully')
  }

  return { deleteTenant }
}

// Resend invitation
export function useResendInvitation() {
  const resend = async (tenantId: string) => {
    const newToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error } = await supabaseSafe
      .from('Tenant')
      .update({
        invitationToken: newToken,
        expiresAt: expiresAt.toISOString(),
        invitationStatus: 'PENDING'
      })
      .eq('id', tenantId)

    if (error) {
      toast.error(error.message)
      throw error
    }

    toast.success('Invitation resent successfully')
  }

  return { resend }
}

// Real-time subscription
export function useRealtimeTenants(onUpdate?: (payload: unknown) => void) {
  const { user } = useAuth()

  if (!user?.id) return

  const channel = supabaseSafe
    .channel('tenants-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'Tenant',
        filter: `invitedBy=eq.${user.id}`
      },
      (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
        if (onUpdate) {
          onUpdate(payload)
        }
      }
    )
    .subscribe()

  return () => {
    void supabaseSafe.getRawClient().removeChannel(channel)
  }
}

// Composite hook
export function useTenantActions() {
  const tenants = useSupabaseTenants()
  const { create } = useCreateTenant()
  const { update } = useUpdateTenant()
  const { deleteTenant } = useDeleteTenant()
  const { resend } = useResendInvitation()

  return {
    // Data
    tenants: tenants.tenants,
    total: tenants.totalCount,
    
    // Loading states
    isLoading: tenants.isLoading,
    isFetching: tenants.isFetching,
    
    // Pagination
    hasMore: tenants.hasMore,
    fetchNextPage: tenants.fetchNextPage,
    
    // Mutations
    create,
    update,
    delete: deleteTenant,
    resendInvitation: resend,
    
    // Utility
    refresh: () => tenants.fetchNextPage()
  }
}