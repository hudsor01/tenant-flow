// Re-export from centralized Zod-inferred DTOs
export type {
	TenantCreateDto,
	TenantUpdateDto,
	TenantQueryDto
} from '../../common/dto/dto-exports'

export {
	createTenantSchema,
	updateTenantSchema,
	queryTenantsSchema
} from '../../common/dto/dto-exports'
