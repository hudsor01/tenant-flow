import { createZodDto } from 'nestjs-zod'
import { tenantReviewSchema } from '@repo/shared/validation/inspections'

export class TenantReviewDto extends createZodDto(tenantReviewSchema) {}
