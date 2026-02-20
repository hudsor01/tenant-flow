import { createZodDto } from 'nestjs-zod'
import { rejectLeaseSchema } from '@repo/shared/validation/leases'

export class RejectLeaseDto extends createZodDto(rejectLeaseSchema) {}
