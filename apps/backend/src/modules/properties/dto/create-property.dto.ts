import { createZodDto } from 'nestjs-zod'
import { propertyCreateSchema } from '@repo/shared/validation/properties'

export class CreatePropertyDto extends createZodDto(propertyCreateSchema) {}
