import { createZodDto } from 'nestjs-zod'
import { propertyMarkedSoldSchema } from '@repo/shared/validation/properties'

export class MarkPropertyAsSoldDto extends createZodDto(
	propertyMarkedSoldSchema
) {}
