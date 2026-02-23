import { createZodDto } from 'nestjs-zod'
import { updateInspectionSchema } from '@repo/shared/validation/inspections'

export class UpdateInspectionDto extends createZodDto(updateInspectionSchema) {}
