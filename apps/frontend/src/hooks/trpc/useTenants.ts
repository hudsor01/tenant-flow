import { trpc } from '@/lib/trpcClient'
import type {
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantQuerySchema
} from '@/types/tenants'

// Tenants queries
export function useTenants(query?: TenantQuerySchema) {
  return trpc.tenants.list.useQuery(query || {})
}

export function useTenant(id: string) {
  return trpc.tenants.byId.useQuery({ id })
}

export function useTenantStats() {
  return trpc.tenants.stats.useQuery()
}

// Public invitation queries (no auth required)
export function useVerifyInvitation(token: string) {
  return trpc.tenants.verifyInvitation.useQuery(
    { token },
    { enabled: !!token }
  )
}

// Tenant mutations
export function useInviteTenant() {
  const utils = trpc.useUtils()
  
  return trpc.tenants.invite.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate()
      utils.tenants.stats.invalidate()
    },
  })
}

export function useUpdateTenant() {
  const utils = trpc.useUtils()
  
  return trpc.tenants.update.useMutation({
    onSuccess: (updatedTenant) => {
      utils.tenants.byId.setData({ id: updatedTenant.id }, updatedTenant)
      utils.tenants.list.invalidate()
    },
  })
}

export function useDeleteTenant() {
  const utils = trpc.useUtils()
  
  return trpc.tenants.delete.useMutation({
    onSuccess: () => {
      utils.tenants.list.invalidate()
      utils.tenants.stats.invalidate()
    },
  })
}

export function useAcceptInvitation() {
  return trpc.tenants.acceptInvitation.useMutation()
}

// Real-time tenant updates example
export function useRealtimeTenants(query?: TenantQuerySchema) {
  const tenantsQuery = useTenants(query)
  const utils = trpc.useUtils()
  
  // Could integrate with WebSocket or Supabase realtime here
  // For now, we'll use polling for important data
  return trpc.tenants.list.useQuery(
    query || {},
    {
      refetchInterval: 30000, // 30 seconds
      refetchIntervalInBackground: false,
    }
  )
}