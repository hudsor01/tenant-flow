import { z } from 'zod'
import { Constants } from '../types/supabase-generated.js'
import {
	nonEmptyStringSchema,
	nonNegativeNumberSchema,
	requiredString,
	uuidSchema
} from './common.js'

// Maintenance priority enum - uses auto-generated Supabase enums
export const maintenancePrioritySchema = z.enum(
	Constants.public.Enums.Priority as readonly [string, ...string[]]
)

// Maintenance status enum - uses auto-generated Supabase enums
export const maintenanceStatusSchema = z.enum(
	Constants.public.Enums.RequestStatus as readonly [string, ...string[]]
)

// Maintenance category enum - uses auto-generated Supabase enums
export const maintenanceCategorySchema = z.enum(
	Constants.public.Enums.MaintenanceCategory as readonly [string, ...string[]]
)

// Base maintenance request input schema (for forms and API creation)
export const maintenanceRequestInputSchema = z.object({
	title: nonEmptyStringSchema
		.min(5, 'Title must be at least 5 characters')
		.max(200, 'Title cannot exceed 200 characters'),

	description: nonEmptyStringSchema
		.min(10, 'Description must be at least 10 characters')
		.max(2000, 'Description cannot exceed 2000 characters'),

	priority: maintenancePrioritySchema.default('MEDIUM' as const),

	category: z.string().optional(), // Database shows this as string | null, not enum

	unitId: uuidSchema,

	// Optional assignment
	assignedTo: uuidSchema.optional(),

	// Request details
	requestedBy: uuidSchema.optional(),
	contactPhone: z.string().optional(),
	allowEntry: z.boolean().optional().default(false),

	// Cost information
	estimatedCost: nonNegativeNumberSchema
		.max(1000000, 'Estimated cost seems unrealistic')
		.optional(),

	// Photos/attachments (database field is 'photos', not 'images')
	photos: z.array(z.string()).optional().default([]),

	// Additional notes
	notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),

	// Preferred completion date (database field is 'preferredDate', not 'scheduledDate')
	preferredDate: z
		.string()
		.optional()
		.refine((val: string | undefined) => !val || !isNaN(Date.parse(val)), {
			message: 'Please enter a valid preferred date'
		})
		.transform((val: string | undefined) => (val ? new Date(val) : undefined))
})

// Full maintenance request schema (includes server-generated fields)
export const maintenanceRequestSchema = maintenanceRequestInputSchema.extend({
	id: uuidSchema,
	status: maintenanceStatusSchema.default('OPEN' as const),

	// Completion info
	completedAt: z.date().optional(),
	actualCost: nonNegativeNumberSchema.optional(),

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
			.refine((val: string | undefined) => !val || !isNaN(Date.parse(val)), {
				message: 'Please enter a valid completion date'
			})
			.transform((val: string | undefined) => (val ? new Date(val) : undefined))
	})

// Maintenance request query schema (for search/filtering)
export const maintenanceRequestQuerySchema = z.object({
	search: z.string().optional(),
	unitId: uuidSchema.optional(),
	requestedBy: uuidSchema.optional(),
	assignedTo: uuidSchema.optional(),
	status: maintenanceStatusSchema.optional(),
	priority: maintenancePrioritySchema.optional(),
	category: z.string().optional(), // Database shows this as string, not enum
	dateFrom: z
		.string()
		.optional()
		.refine((val: string | undefined) => !val || !isNaN(Date.parse(val)), {
			message: 'Invalid date format'
		}),
	dateTo: z
		.string()
		.optional()
		.refine((val: string | undefined) => !val || !isNaN(Date.parse(val)), {
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
			'preferredDate',
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
		category: z.string().optional().or(z.literal('')),
		unitId: requiredString,
		requestedBy: z.string().optional().or(z.literal('')),
		assignedTo: z.string().optional().or(z.literal('')),
		contactPhone: z.string().optional(),
		allowEntry: z.boolean().optional().default(false),
		estimatedCost: z
			.string()
			.optional()
			.transform((val: string | undefined) =>
				val ? parseFloat(val) : undefined
			),
		photos: z.array(z.string()).optional().default([]),
		preferredDate: z.string().optional().or(z.literal('')),
		notes: z.string().optional()
	})
	.transform(
		(data: {
			title: string
			description: string
			priority: string
			category?: string
			unitId: string
			requestedBy?: string
			assignedTo?: string
			contactPhone?: string
			allowEntry: boolean
			estimatedCost?: number
			photos: string[]
			preferredDate?: string
			notes?: string
		}) => ({
			...data,
			priority: data.priority as MaintenancePriorityValidation,
			category: data.category === '' ? undefined : data.category,
			requestedBy: data.requestedBy === '' ? undefined : data.requestedBy,
			assignedTo: data.assignedTo === '' ? undefined : data.assignedTo,
			preferredDate: data.preferredDate === '' ? undefined : data.preferredDate,
			photos: data.photos || []
		})
	)

export type MaintenanceRequestFormData = z.input<
	typeof maintenanceRequestFormSchema
>
export type MaintenanceRequestFormOutput = z.output<
	typeof maintenanceRequestFormSchema
>

// Frontend-specific form schema for updates (handles string inputs from HTML forms)
export const maintenanceRequestUpdateFormSchema = z
	.object({
		title: z.string().optional(),
		description: z.string().optional(),
		priority: z.string().optional(),
		category: z.string().optional().or(z.literal('')),
		estimatedCost: z
			.string()
			.optional()
			.transform((val: string | undefined) =>
				val ? parseFloat(val) : undefined
			),
		notes: z.string().optional(),
		preferredDate: z.string().optional().or(z.literal('')),
		allowEntry: z.boolean().optional().default(false),
		status: z.string().optional(),
		actualCost: z
			.string()
			.optional()
			.transform((val: string | undefined) =>
				val ? parseFloat(val) : undefined
			),
		completedAt: z.string().optional().or(z.literal(''))
	})
	.transform(
		(data: {
			title?: string
			description?: string
			priority?: string
			category?: string
			estimatedCost?: number
			notes?: string
			preferredDate?: string
			allowEntry: boolean
			status?: string
			actualCost?: number
			completedAt?: string
		}) => ({
			...data,
			priority: data.priority as MaintenancePriorityValidation | undefined,
			category: data.category === '' ? undefined : data.category,
			preferredDate: data.preferredDate === '' ? undefined : data.preferredDate,
			completedAt: data.completedAt === '' ? undefined : data.completedAt,
			status: data.status as MaintenanceStatusValidation | undefined
		})
	)

export type MaintenanceRequestUpdateFormData = z.input<
	typeof maintenanceRequestUpdateFormSchema
>
export type MaintenanceRequestUpdateFormOutput = z.output<
	typeof maintenanceRequestUpdateFormSchema
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
