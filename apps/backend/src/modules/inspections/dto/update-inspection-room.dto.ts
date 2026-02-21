import { createZodDto } from 'nestjs-zod'
import { updateInspectionRoomSchema } from '@repo/shared/validation/inspections'

export class UpdateInspectionRoomDto extends createZodDto(updateInspectionRoomSchema) {}
