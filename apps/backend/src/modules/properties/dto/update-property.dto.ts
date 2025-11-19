import { createZodDto } from 'nestjs-zod'
import { propertyUpdateSchema } from '@repo/shared/validation/properties'

export class UpdatePropertyDto extends createZodDto(propertyUpdateSchema) {}
