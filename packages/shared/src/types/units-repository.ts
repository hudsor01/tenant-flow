import type { QueryParams, Unit, UnitStats } from './core.js'
import type { Database } from './supabase-generated.js'
import type { BaseRepository } from './repository-base.js'

export type UnitInput = Database['public']['Tables']['unit']['Insert']
export type UnitUpdate = Database['public']['Tables']['unit']['Update']

export interface UnitQueryOptions extends QueryParams {
	propertyId?: string
	status?: Database['public']['Enums']['UnitStatus']
	type?: string
}

export interface UnitsRepositoryContract
	extends BaseRepository<Unit, UnitInput, UnitUpdate, UnitQueryOptions> {
	findByUserIdWithSearch(
		userId: string,
		options: UnitQueryOptions
	): Promise<Unit[]>
	findByPropertyId(propertyId: string): Promise<Unit[]>
	softDelete(
		userId: string,
		unitId: string
	): Promise<{ success: boolean; message: string }>
	getStats(userId: string): Promise<UnitStats>
	getAnalytics(
		userId: string,
		options: { propertyId?: string; timeframe: string }
	): Promise<Unit[]>
	getOccupancyAnalytics(
		userId: string,
		options: { propertyId?: string; period: string }
	): Promise<Unit[]>
	getAvailableUnits(propertyId: string): Promise<Unit[]>
	updateStatus(
		unitId: string,
		status: Database['public']['Enums']['UnitStatus']
	): Promise<Unit | null>
}
