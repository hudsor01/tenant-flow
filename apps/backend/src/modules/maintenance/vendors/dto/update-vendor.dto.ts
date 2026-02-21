import { createZodDto } from 'nestjs-zod'
import { vendorUpdateSchema } from '@repo/shared/validation/vendors'

export class UpdateVendorDto extends createZodDto(vendorUpdateSchema) {}
