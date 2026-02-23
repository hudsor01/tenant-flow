import { createZodDto } from 'nestjs-zod'
import { createInspectionSchema } from '@repo/shared/validation/inspections'

export class CreateInspectionDto extends createZodDto(createInspectionSchema) {}
