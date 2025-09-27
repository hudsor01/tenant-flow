import { z } from 'zod'
import {
	emailSchema,
	nonEmptyStringSchema,
	phoneSchema,
	uuidSchema
} from './common.js'

// Emergency contact is just a text field in the database
export const emergencyContactSchema = z
	.string()
	.max(500, 'Emergency contact info cannot exceed 500 characters')
	.optional()

// Base tenant object schema - matches Supabase Tenant table exactly
const tenantBaseSchema = z.object({
	email: emailSchema,
	name: nonEmptyStringSchema
		.max(200, 'Name cannot exceed 200 characters')
		.optional(), // nullable in database
	firstName: nonEmptyStringSchema
		.max(100, 'First name cannot exceed 100 characters')
		.optional(), // nullable in database
	lastName: nonEmptyStringSchema
		.max(100, 'Last name cannot exceed 100 characters')
		.optional(), // nullable in database
	phone: phoneSchema.optional(),
	emergencyContact: emergencyContactSchema,
	avatarUrl: z.string().url().optional(),
	userId: uuidSchema.optional()
})

// Base tenant input schema (for forms and API creation)
export const tenantInputSchema = tenantBaseSchema

// Full tenant schema (includes server-generated fields)
export const tenantSchema = tenantBaseSchema.extend({
	id: uuidSchema,
	createdAt: z.date(),
	updatedAt: z.date()
})

// Tenant update schema (partial input)
export const tenantUpdateSchema = tenantBaseSchema.partial()

// Tenant query schema (for search/filtering)
export const tenantQuerySchema = z.object({
	search: z.string().optional(),
	userId: uuidSchema.optional(),
	sortBy: z
		.enum(['name', 'firstName', 'lastName', 'email', 'createdAt'])
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10)
})

// Tenant statistics schema
export const tenantStatsSchema = z.object({
	total: z.number().nonnegative()
})

// Export types
export type TenantInput = z.infer<typeof tenantInputSchema>
export type Tenant = z.infer<typeof tenantSchema>
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>
export type TenantQuery = z.infer<typeof tenantQuerySchema>
export type TenantStats = z.infer<typeof tenantStatsSchema>
export type EmergencyContact = z.infer<typeof emergencyContactSchema>

// Frontend-specific form schema (handles string inputs from HTML forms)
export const tenantFormSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email'),
	name: z.string().optional(),
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	phone: z.string().optional(),
	emergencyContact: z.string().optional(),
	avatarUrl: z.string().url().optional(),
	userId: z.string().optional()
})

export type TenantFormData = z.input<typeof tenantFormSchema>
export type TenantFormOutput = z.output<typeof tenantFormSchema>
