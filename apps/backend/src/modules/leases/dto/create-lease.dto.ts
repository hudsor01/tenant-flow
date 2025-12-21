import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Lease creation DTO
 *
 * IMPORTANT:
 * - Keep this schema permissive so service-level validation can produce
 *   domain-specific error messages (required fields, invalid date ranges,
 *   invalid lease status, etc.) that our integration tests assert on.
 * - Do not require optional fields that have server-side defaults.
 */
const createLeaseRequestSchema = z.object({
	unit_id: z.string().uuid().optional(),
	primary_tenant_id: z.string().uuid().optional(),
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	rent_amount: z.number().int().optional(),
	rent_currency: z.string().optional(),
	security_deposit: z.number().int().optional().nullable(),
	payment_day: z.number().int().optional().nullable(),
	grace_period_days: z.number().int().optional().nullable(),
	late_fee_amount: z.number().int().optional().nullable(),
	late_fee_days: z.number().int().optional().nullable(),
	lease_status: z.string().optional(),
	auto_pay_enabled: z.boolean().optional(),
	stripe_subscription_id: z.string().optional().nullable(),

	// Wizard/detail fields
	max_occupants: z.number().int().optional().nullable(),
	pets_allowed: z.boolean().optional(),
	pet_deposit: z.number().int().optional().nullable(),
	pet_rent: z.number().int().optional().nullable(),
	utilities_included: z.array(z.string()).optional().nullable(),
	tenant_responsible_utilities: z.array(z.string()).optional().nullable(),
	property_rules: z.string().optional().nullable(),
	property_built_before_1978: z.boolean().optional(),
	lead_paint_disclosure_acknowledged: z.boolean().optional().nullable(),
	governing_state: z.string().optional()
})

export class CreateLeaseDto extends createZodDto(createLeaseRequestSchema) {}
