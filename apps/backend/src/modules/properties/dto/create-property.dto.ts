import { createZodDto } from 'nestjs-zod'
import { createPropertyRequestSchema } from '@repo/shared/validation/properties'

export class CreatePropertyDto extends createZodDto(createPropertyRequestSchema) {}
