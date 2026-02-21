import { createZodDto } from 'nestjs-zod'
import { createInspectionRoomSchema } from '@repo/shared/validation/inspections'

export class CreateInspectionRoomDto extends createZodDto(createInspectionRoomSchema) {}
