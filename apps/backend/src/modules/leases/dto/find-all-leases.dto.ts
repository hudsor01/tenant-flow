import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Query parameters for GET /leases
 * Validates filters, pagination, and sorting for lease listing
 */
export const findAllLeasesSchema = z.object({
	tenant_id: z.string().uuid().optional(),
	unit_id: z.string().uuid().optional(),
	property_id: z.string().uuid().optional(),
	status: z
		.enum(['draft', 'pending_signature', 'active', 'ended', 'terminated'])
		.optional(),
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	search: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(50).default(10),
	offset: z.coerce.number().int().min(0).default(0),
	sortBy: z
		.enum(['created_at', 'start_date', 'end_date', 'rent_amount', 'status'])
		.default('created_at'),
	sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export class FindAllLeasesDto extends createZodDto(findAllLeasesSchema) {}
