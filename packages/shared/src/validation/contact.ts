/**
 * Zod validation schemas for contact form
 */
import { z } from 'zod'
import type { ContactFormRequest } from '../types/domain'

export const contactFormSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, 'Name is required')
			.max(100, 'Name must be 100 characters or less'),
		email: z.string().trim().email('Valid email address is required'),
		subject: z
			.string()
			.trim()
			.min(1, 'Subject is required')
			.max(200, 'Subject must be 200 characters or less'),
		message: z
			.string()
			.trim()
			.min(10, 'Message must be at least 10 characters')
			.max(5000, 'Message must be 5000 characters or less'),
		type: z.enum(['sales', 'support', 'general'], {
			message: 'Type must be one of: sales, support, general'
		}),
		phone: z.string().optional(),
		company: z.string().optional(),
		urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional()
	})
	.transform(data => {
		// Transform undefined optional properties to be truly optional
		const { phone, company, urgency, ...rest } = data
		return {
			...rest,
			...(phone !== undefined && phone !== '' ? { phone } : {}),
			...(company !== undefined && company !== '' ? { company } : {}),
			...(urgency !== undefined ? { urgency } : {})
		}
	}) satisfies z.ZodType<ContactFormRequest>

export type ContactFormInput = z.infer<typeof contactFormSchema>
