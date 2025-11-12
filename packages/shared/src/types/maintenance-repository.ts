import type {
	MaintenanceRequest,
	MaintenanceStats,
	QueryParams
} from './core.js'
import type { Database } from './supabase-generated.js'
import type { BaseRepository } from './repository-base.js'

export type MaintenanceRequestInput =
	Database['public']['Tables']['maintenance_request']['Insert']
export type MaintenanceRequestUpdate =
	Database['public']['Tables']['maintenance_request']['Update']

export interface MaintenanceQueryOptions extends QueryParams {
	propertyId?: string
	unitId?: string
	tenantId?: string
	status?: string
	priority?: Database['public']['Enums']['Priority']
	category?: Database['public']['Enums']['MaintenanceCategory']
	assignedTo?: string
	dateFrom?: Date
	dateTo?: Date
}

export interface MaintenanceRepositoryContract
	extends BaseRepository<
		MaintenanceRequest,
		MaintenanceRequestInput,
		MaintenanceRequestUpdate,
		MaintenanceQueryOptions
	> {
	findByUserIdWithSearch(
		userId: string,
		options: MaintenanceQueryOptions
	): Promise<MaintenanceRequest[]>
	findByPropertyId(propertyId: string): Promise<MaintenanceRequest[]>
	findByUnitId(unitId: string): Promise<MaintenanceRequest[]>
	findByTenantId(tenantId: string): Promise<MaintenanceRequest[]>
	softDelete(
		userId: string,
		requestId: string
	): Promise<{ success: boolean; message: string }>
	getStats(
		userId: string
	): Promise<
		MaintenanceStats & { totalCost: number; avgResponseTimeHours: number }
	>
	getAnalytics(
		userId: string,
		options: { propertyId?: string; timeframe: string }
	): Promise<MaintenanceRequest[]>
	getOverdueRequests(userId: string): Promise<MaintenanceRequest[]>
	getHighPriorityRequests(userId: string): Promise<MaintenanceRequest[]>
	assignRequest(
		requestId: string,
		assignedTo: string,
		assignedBy: string
	): Promise<MaintenanceRequest | null>
	updateStatus(
		requestId: string,
		status: Database['public']['Enums']['RequestStatus'],
		updatedBy: string,
		notes?: string
	): Promise<MaintenanceRequest | null>
	addWorkLog(
		requestId: string,
		workLog: {
			description: string
			technicianId: string
			hoursWorked?: number
			cost?: number
			materials?: string
		}
	): Promise<MaintenanceRequest | null>
}
