import { z } from 'zod'
import {
	uuidSchema,
	nonEmptyStringSchema,
	nonNegativeNumberSchema,
	urlSchema,
	requiredString
} from './common'
import { Constants } from '../types/supabase-generated'

// Maintenance priority enum - uses auto-generated Supabase enums
export const maintenancePrioritySchema = z.enum(Constants.public.Enums.Priority as readonly [string, ...string[]])

// Maintenance status enum - uses auto-generated Supabase enums
export const maintenanceStatusSchema = z.enum(Constants.public.Enums.RequestStatus as readonly [string, ...string[]])

// Maintenance category enum - uses auto-generated Supabase enums
export const maintenanceCategorySchema = z.enum(Constants.public.Enums.MaintenanceCategory as readonly [string, ...string[]])

// Base maintenance request input schema (for forms and API creation)
export const maintenanceRequestInputSchema = z.object({
	title: nonEmptyStringSchema
		.min(5, 'Title must be at least 5 characters')
		.max(200, 'Title cannot exceed 200 characters'),

	description: nonEmptyStringSchema
		.min(10, 'Description must be at least 10 characters')
		.max(2000, 'Description cannot exceed 2000 characters'),

	priority: maintenancePrioritySchema.default('MEDIUM' as const),

	category: maintenanceCategorySchema.default('GENERAL' as const),

	unitId: uuidSchema,

	tenantId: uuidSchema.optional(),

	// Optional assignment
	assignedTo: uuidSchema.optional(),

	// Estimated cost
	estimatedCost: nonNegativeNumberSchema
		.max(1000000, 'Estimated cost seems unrealistic')
		.optional(),

	// Images/attachments
	images: z.array(urlSchema).optional().default([]),

	// Additional notes
	notes: z
		.string()
		.max(1000, 'Notes cannot exceed 1000 characters')
		.optional(),

	// Scheduled/preferred completion date
	scheduledDate: z
		.string()
		.optional()
		.refine(val => !val || !isNaN(Date.parse(val)), {
			message: 'Please enter a valid scheduled date'
		})
		.transform(val => (val ? new Date(val) : undefined)),

	// Tenant access info
	accessInstructions: z
		.string()
		.max(500, 'Access instructions cannot exceed 500 characters')
		.optional()
})

// Full maintenance request schema (includes server-generated fields)
export const maintenanceRequestSchema = maintenanceRequestInputSchema.extend({
	id: uuidSchema,
	ownerId: uuidSchema,
	status: maintenanceStatusSchema.default('OPEN' as const),

	// Completion info
	completedAt: z.date().optional(),
	actualCost: nonNegativeNumberSchema.optional(),

	// Vendor/contractor info
	vendorId: uuidSchema.optional(),
	vendorNotes: z.string().optional(),

	createdAt: z.date(),
	updatedAt: z.date()
})

// Maintenance request update schema (partial input)
export const maintenanceRequestUpdateSchema = maintenanceRequestInputSchema
	.partial()
	.extend({
		status: maintenanceStatusSchema.optional(),
		actualCost: nonNegativeNumberSchema.optional(),
		completedAt: z
			.string()
			.optional()
			.refine(val => !val || !isNaN(Date.parse(val)), {
				message: 'Please enter a valid completion date'
			})
			.transform(val => (val ? new Date(val) : undefined)),
		vendorId: uuidSchema.optional(),
		vendorNotes: z.string().max(1000).optional()
	})

// Maintenance request query schema (for search/filtering)
export const maintenanceRequestQuerySchema = z.object({
	search: z.string().optional(),
	unitId: uuidSchema.optional(),
	tenantId: uuidSchema.optional(),
	assignedTo: uuidSchema.optional(),
	status: maintenanceStatusSchema.optional(),
	priority: maintenancePrioritySchema.optional(),
	category: maintenanceCategorySchema.optional(),
	dateFrom: z
		.string()
		.optional()
		.refine(val => !val || !isNaN(Date.parse(val)), {
			message: 'Invalid date format'
		}),
	dateTo: z
		.string()
		.optional()
		.refine(val => !val || !isNaN(Date.parse(val)), {
			message: 'Invalid date format'
		}),
	minCost: nonNegativeNumberSchema.optional(),
	maxCost: nonNegativeNumberSchema.optional(),
	sortBy: z
		.enum([
			'title',
			'priority',
			'status',
			'createdAt',
			'scheduledDate',
			'estimatedCost'
		])
		.optional(),
	sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(10)
})

// Maintenance statistics schema
export const maintenanceStatsSchema = z.object({
	total: z.number().nonnegative(),
	open: z.number().nonnegative(),
	inProgress: z.number().nonnegative(),
	completed: z.number().nonnegative(),
	canceled: z.number().nonnegative(),
	onHold: z.number().nonnegative(),
	overdue: z.number().nonnegative(),
	averageCompletionTime: z.number().nonnegative(), // in days
	totalCost: z.number().nonnegative(),
	averageCost: z.number().nonnegative()
})

// Export types
export type MaintenanceRequestInput = z.infer<
	typeof maintenanceRequestInputSchema
>
export type MaintenanceRequest = z.infer<typeof maintenanceRequestSchema>
export type MaintenanceRequestUpdate = z.infer<
	typeof maintenanceRequestUpdateSchema
>
export type MaintenanceRequestQuery = z.infer<
	typeof maintenanceRequestQuerySchema
>
export type MaintenanceStats = z.infer<typeof maintenanceStatsSchema>
export type MaintenancePriorityValidation = z.infer<
	typeof maintenancePrioritySchema
>
export type MaintenanceStatusValidation = z.infer<
	typeof maintenanceStatusSchema
>
export type MaintenanceCategoryValidation = z.infer<
	typeof maintenanceCategorySchema
>

// Frontend-specific form schema (handles string inputs from HTML forms)
export const maintenanceRequestFormSchema = z
	.object({
		title: requiredString,
		description: requiredString,
		priority: z.string().default('MEDIUM'),
		category: z.string().default('GENERAL'),
		unitId: requiredString,
		tenantId: z.string().optional().or(z.literal('')),
		assignedTo: z.string().optional().or(z.literal('')),
		estimatedCost: z
			.string()
			.optional()
			.transform(val => (val ? parseFloat(val) : undefined)),
		scheduledDate: z.string().optional().or(z.literal('')),
		accessInstructions: z.string().optional(),
		notes: z.string().optional()
	})
	.transform(data => ({
		...data,
		priority: data.priority as MaintenancePriorityValidation,
		category: data.category as MaintenanceCategoryValidation,
		tenantId: data.tenantId === '' ? undefined : data.tenantId,
		assignedTo: data.assignedTo === '' ? undefined : data.assignedTo,
		scheduledDate:
			data.scheduledDate === '' ? undefined : data.scheduledDate
	}))

export type MaintenanceRequestFormData = z.input<
	typeof maintenanceRequestFormSchema
>
export type MaintenanceRequestFormOutput = z.output<
	typeof maintenanceRequestFormSchema
>

// Backward compatibility aliases
export const maintenanceInputSchema = maintenanceRequestInputSchema
export const maintenanceUpdateSchema = maintenanceRequestUpdateSchema
export const maintenanceCommentSchema = z.object({
	content: z
		.string()
		.min(1, 'Comment is required')
		.max(1000, 'Comment too long'),
	maintenanceRequestId: uuidSchema
})
export type MaintenanceRequestData = MaintenanceRequest

// Backend DTO compatibility aliases
export type CreateMaintenanceRequestInput = MaintenanceRequestInput
export type UpdateMaintenanceRequestInput = MaintenanceRequestUpdate
export type MaintenanceQueryInput = MaintenanceRequestQuery
