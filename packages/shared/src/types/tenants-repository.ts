import type { Database, Tables } from './supabase-generated.js'
import type { QueryParams, Tenant, TenantStats } from './core.js'

export type TenantInput = Database['public']['Tables']['Tenant']['Insert']
export type TenantUpdate = Database['public']['Tables']['Tenant']['Update']

export interface TenantQueryOptions extends QueryParams {
  propertyId?: string
  status?: string
}

export interface TenantsRepositoryContract {
  findByUserIdWithSearch(userId: string, options: TenantQueryOptions): Promise<Tenant[]>
  findById(tenantId: string): Promise<Tenant | null>
  findByPropertyId(propertyId: string): Promise<Tenant[]>
  create(userId: string, tenantData: TenantInput): Promise<Tenant>
  update(tenantId: string, tenantData: TenantUpdate): Promise<Tenant | null>
  softDelete(userId: string, tenantId: string): Promise<{ success: boolean; message: string }>
  getStats(userId: string): Promise<TenantStats>
  getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<Tenant[]>
  getActivity(userId: string, tenantId: string): Promise<Tables<'Activity'>[]>
}
