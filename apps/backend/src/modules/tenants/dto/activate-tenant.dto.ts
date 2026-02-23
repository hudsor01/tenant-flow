import { createZodDto } from 'nestjs-zod'
import { activateTenantSchema } from '@repo/shared/validation/tenants'

export class ActivateTenantDto extends createZodDto(activateTenantSchema) {}
