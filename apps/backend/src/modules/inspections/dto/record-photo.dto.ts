import { createZodDto } from 'nestjs-zod'
import { createInspectionPhotoSchema } from '@repo/shared/validation/inspections'

export class RecordPhotoDto extends createZodDto(createInspectionPhotoSchema) {}
