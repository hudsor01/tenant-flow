import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Zod schema for unit update
 * Per CLAUDE.md: Use nestjs-zod + createZodDto() for validation
 * All fields optional for PATCH semantics
 */
const UpdateUnitSchema = z.object({
	unit_number: z.string().min(1).optional(),
	bedrooms: z.number().int().nonnegative().optional(),
	bathrooms: z.number().nonnegative().optional(),
	square_feet: z.number().int().positive().optional(),
	rent: z.number().nonnegative().optional(),
	status: z
		.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'])
		.optional()
})

/**
 * DTO for updating a unit
 * Uses Zod validation per CLAUDE.md guidelines
 */
export class UpdateUnitDto extends createZodDto(UpdateUnitSchema) {}
