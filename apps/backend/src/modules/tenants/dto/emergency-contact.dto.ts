import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Emergency Contact Validation Schemas
 *
 * Defines validation rules for tenant emergency contact information.
 * Used for creating and updating emergency contacts.
 */

// Base schema for emergency contact fields
export const EmergencyContactSchema = z.object({
	contactName: z
		.string()
		.min(1, 'Contact name is required')
		.max(255, 'Contact name must be less than 255 characters')
		.describe('Full name of emergency contact'),

	relationship: z
		.string()
		.min(1, 'Relationship is required')
		.max(100, 'Relationship must be less than 100 characters')
		.describe('Relationship to tenant (e.g., Spouse, Parent, Sibling)'),

	phoneNumber: z
		.string()
		.min(10, 'Phone number must be at least 10 characters')
		.max(20, 'Phone number must be less than 20 characters')
		.regex(
			/^\+?[\d\s\-()]+$/,
			'Phone number must contain only digits, spaces, dashes, parentheses, and optional leading +'
		)
		.refine(
			val => {
				const digitCount = val.replace(/\D/g, '').length
				return digitCount >= 10 && digitCount <= 20
			},
			{ message: 'Phone number must contain between 10 and 20 digits' }
		)
		.describe('Phone number of emergency contact'),

	email: z
		.string()
		.email('Invalid email address')
		.max(255, 'Email must be less than 255 characters')
		.optional()
		.nullable()
		.describe('Email address of emergency contact (optional)')
})

// Schema for creating emergency contact
export const CreateEmergencyContactSchema = EmergencyContactSchema.extend({
	tenant_id: z.string().uuid('Invalid tenant ID').describe('ID of the tenant')
})

// Schema for updating emergency contact (all fields optional)
export const UpdateEmergencyContactSchema = EmergencyContactSchema.partial()

// Response schema
export const EmergencyContactResponseSchema =
	CreateEmergencyContactSchema.extend({
		id: z.string().uuid().describe('Emergency contact ID'),
		created_at: z.string().datetime().describe('Creation timestamp'),
		updated_at: z.string().datetime().describe('Last update timestamp')
	})

// Export types
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>
export type CreateEmergencyContact = z.infer<
	typeof CreateEmergencyContactSchema
>
export type UpdateEmergencyContact = z.infer<
	typeof UpdateEmergencyContactSchema
>
export type EmergencyContactResponse = z.infer<
	typeof EmergencyContactResponseSchema
>

// Export DTOs for NestJS
export class CreateEmergencyContactDto extends createZodDto(
	CreateEmergencyContactSchema
) {}
export class UpdateEmergencyContactDto extends createZodDto(
	UpdateEmergencyContactSchema
) {}
