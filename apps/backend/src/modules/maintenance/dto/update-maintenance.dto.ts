import { createZodDto } from 'nestjs-zod'
import { updateMaintenanceRequestSchema } from '@repo/shared/validation/maintenance'

export class UpdateMaintenanceDto extends createZodDto(
	updateMaintenanceRequestSchema
) {}
