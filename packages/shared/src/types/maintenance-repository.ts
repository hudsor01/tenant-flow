import type {
	MaintenanceRequest,
	MaintenanceStats,
	QueryParams
} from './core.js'
import type { Database } from './supabase-generated.js'

export type MaintenanceRequestInput =
	Database['public']['Tables']['MaintenanceRequest']['Insert']
export type MaintenanceRequestUpdate =
	Database['public']['Tables']['MaintenanceRequest']['Update']

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

export interface MaintenanceRepositoryContract {
	findByUserIdWithSearch(
		userId: string,
		options: MaintenanceQueryOptions
	): Promise<MaintenanceRequest[]>
	findById(requestId: string): Promise<MaintenanceRequest | null>
	findByPropertyId(propertyId: string): Promise<MaintenanceRequest[]>
	findByUnitId(unitId: string): Promise<MaintenanceRequest[]>
	findByTenantId(tenantId: string): Promise<MaintenanceRequest[]>
	create(
		userId: string,
		requestData: MaintenanceRequestInput
	): Promise<MaintenanceRequest>
	update(
		requestId: string,
		requestData: MaintenanceRequestUpdate
	): Promise<MaintenanceRequest | null>
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
		status: string,
		updatedBy: string,
		notes?: string
	): Promise<MaintenanceRequest | null>
	addWorkLog(
		requestId: string,
		workLog: {
			description: string
			hoursWorked?: number
			cost?: number
			materials?: string
			completedBy: string
		}
	): Promise<MaintenanceRequest | null>
	getCostAnalytics(
		userId: string,
		options: { propertyId?: string; period: string }
	): Promise<MaintenanceRequest[]>
	getContractorPerformance(
		userId: string,
		contractorId?: string
	): Promise<MaintenanceRequest[]>
}
