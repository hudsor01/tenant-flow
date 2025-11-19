import { createZodDto } from 'nestjs-zod'
import { maintenanceRequestCreateSchema } from '@repo/shared/validation/maintenance'

export class CreateMaintenanceDto extends createZodDto(
	maintenanceRequestCreateSchema
) {}
