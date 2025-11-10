import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Zod schema for unit creation
 * Per CLAUDE.md: Use nestjs-zod + createZodDto() for validation
 */
const CreateUnitSchema = z.object({
	propertyId: z.string().uuid('Invalid property ID'),
	unitNumber: z.string().min(1, 'Unit number is required'),
	bedrooms: z.number().int().nonnegative().optional(),
	bathrooms: z.number().nonnegative().optional(),
	squareFeet: z.number().int().positive().optional(),
	rent: z.number().nonnegative('Rent must be non-negative').optional(),
	status: z
		.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'])
		.optional()
})

/**
 * DTO for creating a unit
 * Uses Zod validation per CLAUDE.md guidelines
 */
export class CreateUnitDto extends createZodDto(CreateUnitSchema) {}
