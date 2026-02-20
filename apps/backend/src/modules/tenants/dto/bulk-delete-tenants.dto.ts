import { createZodDto } from 'nestjs-zod'
import { bulkDeleteTenantsSchema } from '@repo/shared/validation/tenants'

export class BulkDeleteTenantsDto extends createZodDto(bulkDeleteTenantsSchema) {}
