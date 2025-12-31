import { createZodDto } from 'nestjs-zod'
import { updateTourProgressSchema } from '@repo/shared/validation/users'

export class UpdateTourProgressDto extends createZodDto(
	updateTourProgressSchema
) {}
