import { createZodDto } from 'nestjs-zod'
import { updateEmergencyContactSchema } from '@repo/shared/validation/tenants'

export class UpdateEmergencyContactDto extends createZodDto(
	updateEmergencyContactSchema
) {}
