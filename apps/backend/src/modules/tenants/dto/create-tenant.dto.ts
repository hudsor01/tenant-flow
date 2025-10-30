import { createZodDto } from 'nestjs-zod'
import { createTenantRequestSchema } from '@repo/shared/validation/tenants'

export class CreateTenantDto extends createZodDto(createTenantRequestSchema) {}
