import { createZodDto } from 'nestjs-zod'
import { propertySoldSchema } from '@repo/shared/validation/properties'

export class MarkPropertyAsSoldDto extends createZodDto(
	propertySoldSchema
) {}
