import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Query parameters for GET /units
 * Validates filters, pagination, and sorting for unit listing
 */
export const findAllUnitsSchema = z.object({
  property_id: z.string().uuid().nullish(),
  status: z
    .enum(['available', 'occupied', 'maintenance', 'reserved'])
    .optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z
    .enum(['created_at', 'unit_number', 'bedrooms', 'rent', 'status'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export class FindAllUnitsDto extends createZodDto(findAllUnitsSchema) {}
