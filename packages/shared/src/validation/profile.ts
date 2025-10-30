import { z } from 'zod'

export const updateProfileSchema = z.object({
	firstName: z
		.string()
		.trim()
		.min(1, 'First name is required')
		.max(50, 'First name must be 50 characters or less'),
	lastName: z
		.string()
		.trim()
		.min(1, 'Last name is required')
		.max(50, 'Last name must be 50 characters or less'),
	email: z.string().email('Valid email address is required'),
	phone: z
		.string()
		.trim()
		.max(20, 'Phone number must be 20 characters or less')
		.optional(),
	company: z
		.string()
		.trim()
		.max(100, 'Company name must be 100 characters or less')
		.optional(),
	timezone: z.string().trim().optional(),
	bio: z
		.string()
		.trim()
		.max(500, 'Bio must be 500 characters or less')
		.optional()
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
