import { createZodDto } from 'nestjs-zod'
import { leaseInputSchema } from '@repo/shared/validation/leases'

export class CreateLeaseDto extends createZodDto(leaseInputSchema) {}
