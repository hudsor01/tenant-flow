import { createZodDto } from 'nestjs-zod'
import { leaseUpdateSchema } from '@repo/shared/validation/leases'

export class UpdateLeaseDto extends createZodDto(leaseUpdateSchema) {}
