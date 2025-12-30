import { createZodDto } from 'nestjs-zod'
import { updateEmergencyContactSchema } from '@repo/shared/validation/users'

export class UpdateEmergencyContactDto extends createZodDto(
	updateEmergencyContactSchema
) {}
