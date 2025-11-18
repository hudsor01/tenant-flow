import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { validateDateString } from '@repo/shared/validation/lease-generation.schemas'

/**
 * Zod schema for tenant invitation with lease creation
 * Per CLAUDE.md: Use nestjs-zod + createZodDto() for validation
 */
const InviteWithLeaseSchema = z
	.object({
		tenantData: z.object({
			email: z.string().email('Invalid email format'),
			first_name: z.string().min(1, 'First name is required'),
			last_name: z.string().min(1, 'Last name is required'),
			phone: z.string().optional()
		}),
		leaseData: z.object({
			property_id: z.string().uuid('Invalid property ID'),
			unit_id: z.string().uuid('Invalid unit ID'),
			// IMPORTANT: rent_amount and security_deposit must be in cents (multiply dollars by 100)
			rent_amount: z
				.number()
				.int('Rent amount must be an integer (cents)')
				.positive('Rent amount must be positive'),
			security_deposit: z
				.number()
				.int('Security deposit must be an integer (cents)')
				.nonnegative('Security deposit cannot be negative'),
			start_date: z.preprocess(validateDateString, z.string().min(1, 'Start date is required')),
			end_date: z.preprocess(validateDateString, z.string().min(1, 'End date is required'))
		})
	})
	.refine(
		(data) => {
			// Cross-field validation: end_date must be after start_date
			// Parse as UTC midnight for consistent comparison (same as validateDateString)
			const start = new Date(`${data.leaseData.start_date}T00:00:00.000Z`)
			const end = new Date(`${data.leaseData.end_date}T00:00:00.000Z`)

			// If either date is invalid, let individual field validation handle it
			if (isNaN(start.getTime()) || isNaN(end.getTime())) {
				return true
			}

			return end > start
		},
		{
			message: 'Lease end date must be after start date',
			path: ['leaseData', 'end_date']
		}
	)

/**
 * DTO for inviting tenant with lease
 * Uses Zod validation per CLAUDE.md guidelines
 */
export class InviteWithLeaseDto extends createZodDto(InviteWithLeaseSchema) {}
