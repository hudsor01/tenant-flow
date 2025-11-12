import type { QueryParams, Tenant, TenantStats } from './core.js'
import type { Database, Tables } from './supabase-generated.js'
import type { BaseRepository } from './repository-base.js'

export type TenantInput = Database['public']['Tables']['tenant']['Insert']
export type TenantUpdate = Database['public']['Tables']['tenant']['Update']

export interface TenantQueryOptions extends QueryParams {
	propertyId?: string
	status?: string
}

export interface TenantsRepositoryContract
	extends BaseRepository<
		Tenant,
		TenantInput,
		TenantUpdate,
		TenantQueryOptions
	> {
	findByUserIdWithSearch(
		userId: string,
		options: TenantQueryOptions
	): Promise<Tenant[]>
	findByPropertyId(propertyId: string): Promise<Tenant[]>
	softDelete(
		userId: string,
		tenantId: string
	): Promise<{ success: boolean; message: string }>
	getStats(userId: string): Promise<TenantStats>
	getAnalytics(
		userId: string,
		options: { propertyId?: string; timeframe: string }
	): Promise<Tenant[]>
	getActivity(userId: string, tenantId: string): Promise<Tables<'activity'>[]>
}
