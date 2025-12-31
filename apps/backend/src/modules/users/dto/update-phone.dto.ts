import { createZodDto } from 'nestjs-zod'
import { updatePhoneSchema } from '@repo/shared/validation/users'

export class UpdatePhoneDto extends createZodDto(updatePhoneSchema) {}
