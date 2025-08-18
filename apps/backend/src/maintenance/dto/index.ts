// Re-export from centralized Zod-inferred DTOs
export type {
	CreateMaintenanceRequestDto,
	UpdateMaintenanceRequestDto,
	MaintenanceRequestQueryDto
} from '../../common/dto/dto-exports'

export {
	createMaintenanceRequestSchema,
	updateMaintenanceRequestSchema,
	queryMaintenanceRequestsSchema
} from '../../common/dto/dto-exports'
