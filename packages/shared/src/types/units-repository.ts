import type { QueryParams, Unit, UnitStats } from './core.js'
import type { Database } from './supabase-generated.js'

export type UnitInput = Database['public']['Tables']['unit']['Insert']
export type UnitUpdate = Database['public']['Tables']['unit']['Update']

export interface UnitQueryOptions extends QueryParams {
	propertyId?: string
	status?: Database['public']['Enums']['UnitStatus']
	type?: string
}

export interface UnitsRepositoryContract {
	findByUserIdWithSearch(
		userId: string,
		options: UnitQueryOptions
	): Promise<Unit[]>
	findById(unitId: string): Promise<Unit | null>
	findByPropertyId(propertyId: string): Promise<Unit[]>
	create(userId: string, unitData: UnitInput): Promise<Unit>
	update(unitId: string, unitData: UnitUpdate): Promise<Unit | null>
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
