import { createZodDto } from 'nestjs-zod'
import { vendorCreateSchema } from '@repo/shared/validation/vendors'

export class CreateVendorDto extends createZodDto(vendorCreateSchema) {}
