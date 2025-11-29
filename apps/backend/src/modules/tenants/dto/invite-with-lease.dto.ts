import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Zod schema for tenant platform invitation
 * Per CLAUDE.md: Use nestjs-zod + createZodDto() for validation
 *
 * NEW ARCHITECTURE:
 * - Lease data is now OPTIONAL (platform-only invitation)
 * - Lease creation is a separate workflow after tenant accepts
 * - Stripe subscription created only when BOTH parties sign the lease
 */
const InviteWithLeaseSchema = z.object({
	tenantData: z.object({
		email: z.string().email('Invalid email format'),
		first_name: z.string().min(1, 'First name is required'),
		last_name: z.string().min(1, 'Last name is required'),
		phone: z.string().optional()
	}),
	// Optional context - can invite without assigning to property/unit
	leaseData: z
		.object({
			property_id: z.string().uuid('Invalid property ID').optional(),
			unit_id: z.string().uuid('Invalid unit ID').optional()
		})
		.optional()
})

/**
 * DTO for inviting tenant to platform
 * Uses Zod validation per CLAUDE.md guidelines
 */
export class InviteWithLeaseDto extends createZodDto(InviteWithLeaseSchema) {}
