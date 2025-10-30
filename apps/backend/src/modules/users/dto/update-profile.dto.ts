import { createZodDto } from 'nestjs-zod'
import { updateProfileSchema } from '@repo/shared/validation/profile'

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
