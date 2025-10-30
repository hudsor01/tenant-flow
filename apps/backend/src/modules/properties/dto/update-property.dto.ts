import { createZodDto } from 'nestjs-zod'
import { updatePropertyRequestSchema } from '@repo/shared/validation/properties'

export class UpdatePropertyDto extends createZodDto(updatePropertyRequestSchema) {}
