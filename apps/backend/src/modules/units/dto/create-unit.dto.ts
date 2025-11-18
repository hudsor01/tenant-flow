import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Zod schema for unit creation
 * Per CLAUDE.md: Use nestjs-zod + createZodDto() for validation
 */
const CreateUnitSchema = z.object({
	property_id: z.string().uuid('Invalid property ID'),
	unit_number: z.string().min(1, 'Unit number is required'),
	bedrooms: z.number().int().nonnegative().optional(),
	bathrooms: z.number().nonnegative().optional(),
	square_feet: z.number().int().positive().optional(),
	// IMPORTANT: rent must be in cents (multiply dollars by 100)
	// This matches the lease rent_amount field convention
	rent: z
		.number()
		.int('Rent must be an integer (cents)')
		.nonnegative('Rent must be non-negative')
		.optional(),
	status: z
		.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'])
		.optional()
})

/**
 * DTO for creating a unit
 * Uses Zod validation per CLAUDE.md guidelines
 */
export class CreateUnitDto extends createZodDto(CreateUnitSchema) {}
