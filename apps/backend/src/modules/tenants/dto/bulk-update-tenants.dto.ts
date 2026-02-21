import { createZodDto } from 'nestjs-zod'
import { bulkUpdateTenantsSchema } from '@repo/shared/validation/tenants'

export class BulkUpdateTenantsDto extends createZodDto(bulkUpdateTenantsSchema) {}
