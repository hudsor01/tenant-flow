import { createZodDto } from 'nestjs-zod'
import { adminUpdateUserSchema } from '@repo/shared/validation/admin'

export class AdminUpdateUserDto extends createZodDto(adminUpdateUserSchema) {}
