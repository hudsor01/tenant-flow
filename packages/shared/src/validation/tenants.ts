import { z } from 'zod'
import {
	uuidSchema,
	nonEmptyStringSchema,
	emailSchema,
	phoneSchema,
	requiredString
} from './common'
import { Constants } from '../types/supabase-generated'

// Tenant status enum - uses auto-generated Supabase enums
export const tenantStatusSchema = z.enum(Constants.public.Enums.TenantStatus as readonly [string, ...string[]])

// Emergency contact schema
export const emergencyContactSchema = z
	.object({
		name: nonEmptyStringSchema.max(
			100,
			'Emergency contact name cannot exceed 100 characters'
		),
		phone: phoneSchema.refine(val => val && val.length > 0, {
			message: 'Emergency contact phone is required'
		}),
		relationship: nonEmptyStringSchema.max(
			50,
			'Relationship cannot exceed 50 characters'
		)
	})
	.optional()

// Base tenant object schema (without refinements)
const tenantBaseSchema = z.object({
	email: emailSchema,

	firstName: nonEmptyStringSchema
		.min(1, 'First name is required')
		.max(50, 'First name cannot exceed 50 characters'),

	lastName: nonEmptyStringSchema
		.min(1, 'Last name is required')
		.max(50, 'Last name cannot exceed 50 characters'),

	phone: phoneSchema.optional(),

	dateOfBirth: z
		.string()
		.optional()
		.refine(val => !val || !isNaN(Date.parse(val)), {
			message: 'Please enter a valid date of birth'
		})
		.transform(val => (val ? new Date(val) : undefined)),

	emergencyContact: emergencyContactSchema,

	// Optional property/unit associations
	propertyId: uuidSchema.optional(),
	unitId: uuidSchema.optional(),

	// Optional lease dates for context
	leaseStartDate: z
		.string()
		.optional()
		.refine(val => !val || !isNaN(Date.parse(val)), {
			message: 'Please enter a valid lease start date'
		})
		.transform(val => (val ? new Date(val) : undefined)),

	leaseEndDate: z
		.string()
		.optional()
		.refine(val => !val || !isNaN(Date.parse(val)), {
			message: 'Please enter a valid lease end date'
		})
		.transform(val => (val ? new Date(val) : undefined)),

	notes: z
		.string()
		.max(1000, 'Notes cannot exceed 1000 characters')
		.optional()
})

// Base tenant input schema (for forms and API creation)
export const tenantInputSchema = tenantBaseSchema.refine(
	data => {
		// Validate lease date logic
		if (data.leaseStartDate && data.leaseEndDate) {
			return data.leaseEndDate > data.leaseStartDate
		}
		return true
	},
	{
		message: 'Lease end date must be after start date',
		path: ['leaseEndDate']
	}
)

// Full tenant schema (includes server-generated fields)
export const tenantSchema = tenantBaseSchema.extend({
	id: uuidSchema,
	ownerId: uuidSchema,
	status: tenantStatusSchema.default('PENDING' as const),
	createdAt: z.date(),
	updatedAt: z.date()
})

// Tenant update schema (partial input)
export const tenantUpdateSchema = tenantBaseSchema.partial().extend({
	status: tenantStatusSchema.optional()
})

// Tenant query schema (for search/filtering)
export const tenantQuerySchema = z.object({
	search: z.string().optional(),
	propertyId: uuidSchema.optional(),
	unitId: uuidSchema.optional(),
	status: tenantStatusSchema.optional(),
	leaseStatus: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
	moveInDateFrom: z
		.string()
		.optional()
		.refine(val => !val || !isNaN(Date.parse(val)), {
			message: 'Invalid move-in date format'
		}),
	moveInDateTo: z
		.string()
		.optional()
		.refine(val => !val || !isNaN(Date.parse(val)), {
			message: 'Invalid move-in date format'
		}),
	sortBy: z
		.enum(['firstName', 'lastName', 'email', 'createdAt', 'leaseStartDate'])
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10)
})

// Tenant statistics schema
export const tenantStatsSchema = z.object({
	total: z.number().nonnegative(),
	active: z.number().nonnegative(),
	inactive: z.number().nonnegative(),
	pending: z.number().nonnegative(),
	former: z.number().nonnegative()
})

// Export types
export type TenantInput = z.infer<typeof tenantInputSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>
export type TenantQuery = z.infer<typeof tenantQuerySchema>
export type TenantStats = z.infer<typeof tenantStatsSchema>
export type TenantStatus = z.infer<typeof tenantStatusSchema>
export type EmergencyContact = z.infer<typeof emergencyContactSchema>

// Frontend-specific form schema (handles string inputs from HTML forms)
export const tenantFormSchema = z
	.object({
		email: z
			.string()
			.min(1, 'Email is required')
			.email('Please enter a valid email'),
		firstName: requiredString,
		lastName: requiredString,
		phone: z.string().optional(),
		dateOfBirth: z.string().optional(),
		propertyId: z.string().optional(),
		unitId: z.string().optional(),
		leaseStartDate: z.string().optional(),
		leaseEndDate: z.string().optional(),
		notes: z.string().optional(),
		// Emergency contact as nested object in form
		emergencyContactName: z.string().optional(),
		emergencyContactPhone: z.string().optional(),
		emergencyContactRelationship: z.string().optional()
	})
	.transform(data => ({
		email: data.email,
		firstName: data.firstName,
		lastName: data.lastName,
		phone: data.phone,
		dateOfBirth: data.dateOfBirth,
		propertyId: data.propertyId,
		unitId: data.unitId,
		leaseStartDate: data.leaseStartDate,
		leaseEndDate: data.leaseEndDate,
		notes: data.notes,
		emergencyContact:
			data.emergencyContactName && data.emergencyContactPhone
				? {
						name: data.emergencyContactName,
						phone: data.emergencyContactPhone,
						relationship: data.emergencyContactRelationship ?? ''
					}
				: undefined
	}))

export type TenantFormData = z.input<typeof tenantFormSchema>
export type TenantFormOutput = z.output<typeof tenantFormSchema>
