import { createZodDto } from 'nestjs-zod'
import { createPropertySchema } from '../property.schemas'

export class CreatePropertyDto extends createZodDto(createPropertySchema) {}
