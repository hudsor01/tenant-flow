import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { leaseInputSchema } from '@repo/shared/validation/leases'
import { createLeaseWizardRequestSchema } from '@repo/shared/validation/lease-wizard.schemas'

/**
 * Standard lease creation DTO (existing functionality)
 */
export class CreateLeaseDto extends createZodDto(leaseInputSchema) {}

/**
 * Enhanced lease creation DTO for the wizard flow
 * Includes all lease detail fields (occupancy, pets, utilities, disclosures)
 */
export class CreateLeaseWizardDto extends createZodDto(
	createLeaseWizardRequestSchema
) {}

/**
 * Combined schema that accepts both standard and wizard inputs
 * Used by the create endpoint to handle both flows
 */
const combinedCreateLeaseSchema = leaseInputSchema.extend({
	// Lease Details (Step 3) - Optional for backwards compatibility
	max_occupants: z.number().int().min(1).max(20).optional().nullable(),
	pets_allowed: z.boolean().optional().default(false),
	pet_deposit: z.number().min(0).optional().nullable(),
	pet_rent: z.number().min(0).optional().nullable(),
	utilities_included: z.array(z.string()).optional().default([]),
	tenant_responsible_utilities: z.array(z.string()).optional().default([]),
	property_rules: z.string().max(5000).optional().nullable(),
	property_built_before_1978: z.boolean().optional().default(false),
	lead_paint_disclosure_acknowledged: z.boolean().optional().nullable(),
	governing_state: z.string().length(2).optional().default('TX')
})

export class CreateLeaseWithDetailsDto extends createZodDto(
	combinedCreateLeaseSchema
) {}
