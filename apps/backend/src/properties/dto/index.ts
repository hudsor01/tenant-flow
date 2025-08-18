// Re-export from centralized Zod-inferred DTOs
export type {
	CreatePropertyDto,
	UpdatePropertyDto,
	QueryPropertiesDto
} from '../../common/dto/dto-exports'

export {
	createPropertySchema,
	updatePropertySchema,
	queryPropertiesSchema
} from '../../common/dto/dto-exports'
