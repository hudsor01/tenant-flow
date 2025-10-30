import { createZodDto } from 'nestjs-zod'
import { propertyImageUploadSchema } from '@repo/shared/validation/properties'

export class PropertyImageUploadDto extends createZodDto(
	propertyImageUploadSchema
) {}
