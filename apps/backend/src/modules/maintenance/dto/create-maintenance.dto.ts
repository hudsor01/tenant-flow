import { createZodDto } from 'nestjs-zod'
import { createMaintenanceRequestSchema } from '@repo/shared/validation/maintenance'

export class CreateMaintenanceDto extends createZodDto(
	createMaintenanceRequestSchema
) {}
