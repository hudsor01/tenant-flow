import { createZodDto } from 'nestjs-zod'
import { maintenanceRequestUpdateSchema } from '@repo/shared/validation/maintenance'

export class UpdateMaintenanceDto extends createZodDto(
	maintenanceRequestUpdateSchema
) {}
