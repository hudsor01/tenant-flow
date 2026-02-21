import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const recordPhotoSchema = z.object({
  inspection_room_id: z.string().uuid(),
  inspection_id: z.string().uuid(),
  storage_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().int().positive().optional(),
  mime_type: z.string().min(1),
  caption: z.string().optional()
})

export class RecordPhotoDto extends createZodDto(recordPhotoSchema) {}
