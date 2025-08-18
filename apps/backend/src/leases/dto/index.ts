// Re-export from centralized Zod-inferred DTOs
export type {
	CreateLeaseDto,
	UpdateLeaseDto,
	LeaseQueryDto
} from '../../common/dto/dto-exports'

export {
	createLeaseSchema,
	updateLeaseSchema,
	queryLeasesSchema
} from '../../common/dto/dto-exports'
