import { createZodDto } from 'nestjs-zod'
import { updateTenantRequestSchema } from '@repo/shared/validation/tenants'

export class UpdateTenantDto extends createZodDto(updateTenantRequestSchema) {}
