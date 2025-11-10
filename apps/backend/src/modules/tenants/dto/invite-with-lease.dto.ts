import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Zod schema for tenant invitation with lease creation
 * Per CLAUDE.md: Use nestjs-zod + createZodDto() for validation
 */
const InviteWithLeaseSchema = z
	.object({
		tenantData: z.object({
			email: z.string().email('Invalid email format'),
			firstName: z.string().min(1, 'First name is required'),
			lastName: z.string().min(1, 'Last name is required'),
			phone: z.string().optional()
		}),
		leaseData: z.object({
			propertyId: z.string().uuid('Invalid property ID'),
			unitId: z.string().uuid('Invalid unit ID').optional(),
			// IMPORTANT: rentAmount and securityDeposit must be in cents (multiply dollars by 100)
			rentAmount: z
				.number()
				.int('Rent amount must be an integer (cents)')
				.positive('Rent amount must be positive'),
			securityDeposit: z
				.number()
				.int('Security deposit must be an integer (cents)')
				.nonnegative('Security deposit cannot be negative'),
			startDate: z.preprocess(
				(val) => {
					// Convert YYYY-MM-DD to ISO 8601 datetime
					if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
						const isoDate = `${val}T00:00:00.000Z`
						// Validate it's a real date (not 2024-99-99)
						const date = new Date(isoDate)
						if (isNaN(date.getTime())) {
							return val // Return original to trigger validation error
						}
						return isoDate
					}
					return val
				},
				z.string().datetime('Invalid start date format')
			),
			endDate: z.preprocess(
				(val) => {
					// Convert YYYY-MM-DD to ISO 8601 datetime
					if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
						const isoDate = `${val}T00:00:00.000Z`
						// Validate it's a real date (not 2024-99-99)
						const date = new Date(isoDate)
						if (isNaN(date.getTime())) {
							return val // Return original to trigger validation error
						}
						return isoDate
					}
					return val
				},
				z.string().datetime('Invalid end date format')
			)
		})
	})
	.refine(
		(data) => {
			// Cross-field validation: endDate must be after startDate
			const start = new Date(data.leaseData.startDate)
			const end = new Date(data.leaseData.endDate)

			// If either date is invalid, let individual field validation handle it
			if (isNaN(start.getTime()) || isNaN(end.getTime())) {
				return true
			}

			return end > start
		},
		{
			message: 'Lease end date must be after start date',
			path: ['leaseData', 'endDate']
		}
	)

/**
 * DTO for inviting tenant with lease
 * Uses Zod validation per CLAUDE.md guidelines
 */
export class InviteWithLeaseDto extends createZodDto(InviteWithLeaseSchema) {}
