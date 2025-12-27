import { createZodDto } from 'nestjs-zod'
import { updatePropertySchema } from '../property.schemas'

export class UpdatePropertyDto extends createZodDto(updatePropertySchema) {}
