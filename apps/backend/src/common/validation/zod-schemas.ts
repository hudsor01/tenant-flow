import { z } from 'zod'
import {
	LeaseStatus,
	Priority,
	PropertyType,
	RequestStatus,
	UnitStatus
} from '@repo/database'

/**
 * Core Zod Validation Schemas
 * Single source of truth for all validation across the application
 */

// ========================================
// Base/Common Schemas
// ========================================

export const uuidSchema = z.string().uuid('Invalid UUID format')
export const emailSchema = z.string().email('Invalid email format')
export const phoneSchema = z
	.string()
	.regex(/^\+?[\d\s()-]{10,}$/, 'Invalid phone number format')
	.optional()
export const urlSchema = z.string().url('Invalid URL format').optional()
export const zipCodeSchema = z
	.string()
	.regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code format')
export const currencySchema = z
	.number()
	.min(0, 'Amount cannot be negative')
	.multipleOf(0.01, 'Invalid currency amount')

// Date schemas with proper validation
export const dateSchema = z.coerce
	.date()
	.refine(date => !isNaN(date.getTime()), 'Invalid date')
export const futureDateSchema = z.coerce
	.date()
	.refine(date => date > new Date(), 'Date must be in the future')
export const pastDateSchema = z.coerce
	.date()
	.refine(date => date < new Date(), 'Date must be in the past')

// Pagination schemas
export const paginationSchema = z.object({
	limit: z.number().int().min(1).max(1000).default(50),
	offset: z.number().int().min(0).default(0)
})

export const sortSchema = z.object({
	sortBy: z.string().optional(),
	sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const baseQuerySchema = paginationSchema.merge(sortSchema)

// ========================================
// User & Authentication Schemas
// ========================================

export const userIdSchema = uuidSchema
export const organizationIdSchema = uuidSchema

export const createUserSchema = z.object({
	email: emailSchema,
	firstName: z.string().min(1, 'First name is required').max(100),
	lastName: z.string().min(1, 'Last name is required').max(100),
	phone: phoneSchema,
	organizationId: organizationIdSchema.optional()
})

export const updateUserSchema = createUserSchema.partial()

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(8, 'Password must be at least 8 characters')
})

export const signupSchema = z.object({
	email: emailSchema,
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.regex(
			/(?=.*[a-z])/,
			'Password must contain at least one lowercase letter'
		)
		.regex(
			/(?=.*[A-Z])/,
			'Password must contain at least one uppercase letter'
		)
		.regex(/(?=.*\d)/, 'Password must contain at least one number'),
	firstName: z.string().min(1, 'First name is required').max(100),
	lastName: z.string().min(1, 'Last name is required').max(100),
	acceptTerms: z
		.boolean()
		.refine(val => val === true, 'You must accept the terms of service')
})

// ========================================
// Property Schemas
// ========================================

export const propertyTypeSchema = z.nativeEnum(PropertyType)

export const addressSchema = z.object({
	address: z.string().min(1, 'Address is required').max(500),
	city: z.string().min(1, 'City is required').max(100),
	state: z.string().min(2, 'State is required').max(50),
	zipCode: zipCodeSchema
})

export const createPropertySchema = z
	.object({
		name: z.string().min(1, 'Property name is required').max(200),
		description: z.string().max(2000).optional(),
		propertyType: propertyTypeSchema.default(PropertyType.SINGLE_FAMILY),
		imageUrl: urlSchema,
		units: z.number().int().min(0).max(1000).optional(),
		stripeCustomerId: z.string().optional()
	})
	.merge(addressSchema)

export const updatePropertySchema = createPropertySchema.partial()

export const queryPropertiesSchema = baseQuerySchema.extend({
	propertyType: propertyTypeSchema.optional(),
	search: z.string().max(200).optional(),
	city: z.string().max(100).optional(),
	state: z.string().max(50).optional(),
	ownerId: uuidSchema.optional()
})

// ========================================
// Unit Schemas
// ========================================

export const unitStatusSchema = z.nativeEnum(UnitStatus)

export const createUnitSchema = z.object({
	propertyId: uuidSchema,
	unitNumber: z.string().min(1, 'Unit number is required').max(50),
	bedrooms: z.number().int().min(0).max(20).default(1),
	bathrooms: z.number().min(0).max(20).default(1),
	squareFeet: z.number().int().min(1).max(50000).optional(),
	rent: currencySchema,
	status: unitStatusSchema.default(UnitStatus.VACANT),
	description: z.string().max(1000).optional()
})

export const updateUnitSchema = createUnitSchema
	.partial()
	.omit({ propertyId: true })

export const queryUnitsSchema = baseQuerySchema.extend({
	propertyId: uuidSchema.optional(),
	status: unitStatusSchema.optional(),
	minRent: currencySchema.optional(),
	maxRent: currencySchema.optional(),
	bedrooms: z.number().int().min(0).optional(),
	bathrooms: z.number().min(0).optional()
})

// ========================================
// Tenant Schemas
// ========================================

export const createTenantSchema = z.object({
	firstName: z.string().min(1, 'First name is required').max(100),
	lastName: z.string().min(1, 'Last name is required').max(100),
	email: emailSchema,
	phone: phoneSchema,
	emergencyContactName: z.string().max(100).optional(),
	emergencyContactPhone: phoneSchema,
	notes: z.string().max(2000).optional()
})

export const updateTenantSchema = createTenantSchema.partial()

export const queryTenantsSchema = baseQuerySchema.extend({
	search: z.string().max(200).optional(),
	unitId: uuidSchema.optional(),
	propertyId: uuidSchema.optional()
})

// ========================================
// Maintenance Request Schemas
// ========================================

export const maintenancePrioritySchema = z.nativeEnum(Priority)
export const maintenanceStatusSchema = z.nativeEnum(RequestStatus)

export const createMaintenanceRequestSchema = z.object({
	unitId: uuidSchema,
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().min(1, 'Description is required').max(2000),
	category: z.string().max(100).optional(),
	priority: maintenancePrioritySchema.default(Priority.MEDIUM),
	preferredDate: dateSchema.optional(),
	allowEntry: z.boolean().default(true),
	contactPhone: phoneSchema,
	requestedBy: z.string().max(100).optional(),
	photos: z.array(z.string().url()).default([])
})

export const updateMaintenanceRequestSchema = createMaintenanceRequestSchema
	.partial()
	.omit({ unitId: true })
	.extend({
		status: maintenanceStatusSchema.optional(),
		assignedTo: uuidSchema.optional(),
		estimatedCost: currencySchema.optional(),
		actualCost: currencySchema.optional(),
		completedAt: dateSchema.optional(),
		notes: z.string().max(2000).optional()
	})

export const queryMaintenanceRequestsSchema = baseQuerySchema.extend({
	unitId: uuidSchema.optional(),
	propertyId: uuidSchema.optional(),
	status: maintenanceStatusSchema.optional(),
	priority: maintenancePrioritySchema.optional(),
	assignedTo: uuidSchema.optional(),
	dateFrom: dateSchema.optional(),
	dateTo: dateSchema.optional()
})

// ========================================
// Lease Schemas
// ========================================

export const leaseStatusSchema = z.nativeEnum(LeaseStatus)

export const createLeaseSchema = z
	.object({
		unitId: uuidSchema,
		tenantId: uuidSchema,
		startDate: futureDateSchema,
		endDate: futureDateSchema,
		monthlyRent: currencySchema,
		securityDeposit: currencySchema.default(0),
		petDeposit: currencySchema.default(0),
		status: leaseStatusSchema.default(LeaseStatus.DRAFT),
		terms: z.string().max(5000).optional(),
		notes: z.string().max(2000).optional()
	})
	.refine(data => data.endDate > data.startDate, {
		message: 'End date must be after start date',
		path: ['endDate']
	})

export const updateLeaseSchema = createLeaseSchema
	.partial()
	.omit({ unitId: true, tenantId: true })

export const queryLeasesSchema = baseQuerySchema.extend({
	unitId: uuidSchema.optional(),
	tenantId: uuidSchema.optional(),
	propertyId: uuidSchema.optional(),
	status: leaseStatusSchema.optional(),
	startDateFrom: dateSchema.optional(),
	startDateTo: dateSchema.optional(),
	endDateFrom: dateSchema.optional(),
	endDateTo: dateSchema.optional()
})

// ========================================
// Document Schemas
// ========================================

export const createDocumentSchema = z.object({
	name: z.string().min(1, 'Document name is required').max(255),
	type: z.string().max(100),
	size: z
		.number()
		.int()
		.min(1)
		.max(100 * 1024 * 1024), // Max 100MB
	url: z.string().url('Invalid document URL'),
	propertyId: uuidSchema.optional(),
	unitId: uuidSchema.optional(),
	tenantId: uuidSchema.optional(),
	leaseId: uuidSchema.optional(),
	maintenanceRequestId: uuidSchema.optional()
})

export const updateDocumentSchema = createDocumentSchema.partial()

export const queryDocumentsSchema = baseQuerySchema.extend({
	propertyId: uuidSchema.optional(),
	unitId: uuidSchema.optional(),
	tenantId: uuidSchema.optional(),
	leaseId: uuidSchema.optional(),
	type: z.string().optional()
})

// ========================================
// Type Inference Exports
// ========================================

export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type SignupDto = z.infer<typeof signupSchema>

export type CreatePropertyDto = z.infer<typeof createPropertySchema>
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>
export type QueryPropertiesDto = z.infer<typeof queryPropertiesSchema>

export type CreateUnitDto = z.infer<typeof createUnitSchema>
export type UpdateUnitDto = z.infer<typeof updateUnitSchema>
export type QueryUnitsDto = z.infer<typeof queryUnitsSchema>

export type CreateTenantDto = z.infer<typeof createTenantSchema>
export type UpdateTenantDto = z.infer<typeof updateTenantSchema>
export type QueryTenantsDto = z.infer<typeof queryTenantsSchema>

export type CreateMaintenanceRequestDto = z.infer<
	typeof createMaintenanceRequestSchema
>
export type UpdateMaintenanceRequestDto = z.infer<
	typeof updateMaintenanceRequestSchema
>
export type QueryMaintenanceRequestsDto = z.infer<
	typeof queryMaintenanceRequestsSchema
>

export type CreateLeaseDto = z.infer<typeof createLeaseSchema>
export type UpdateLeaseDto = z.infer<typeof updateLeaseSchema>
export type QueryLeasesDto = z.infer<typeof queryLeasesSchema>

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>
export type QueryDocumentsDto = z.infer<typeof queryDocumentsSchema>

// ========================================
// Validation Functions
// ========================================

export const validateCreateProperty = (data: unknown) =>
	createPropertySchema.parse(data)
export const validateUpdateProperty = (data: unknown) =>
	updatePropertySchema.parse(data)
export const validateQueryProperties = (data: unknown) =>
	queryPropertiesSchema.parse(data)

export const validateCreateUnit = (data: unknown) =>
	createUnitSchema.parse(data)
export const validateUpdateUnit = (data: unknown) =>
	updateUnitSchema.parse(data)
export const validateQueryUnits = (data: unknown) =>
	queryUnitsSchema.parse(data)

export const validateCreateTenant = (data: unknown) =>
	createTenantSchema.parse(data)
export const validateUpdateTenant = (data: unknown) =>
	updateTenantSchema.parse(data)
export const validateQueryTenants = (data: unknown) =>
	queryTenantsSchema.parse(data)

export const validateCreateMaintenanceRequest = (data: unknown) =>
	createMaintenanceRequestSchema.parse(data)
export const validateUpdateMaintenanceRequest = (data: unknown) =>
	updateMaintenanceRequestSchema.parse(data)
export const validateQueryMaintenanceRequests = (data: unknown) =>
	queryMaintenanceRequestsSchema.parse(data)

export const validateCreateLease = (data: unknown) =>
	createLeaseSchema.parse(data)
export const validateUpdateLease = (data: unknown) =>
	updateLeaseSchema.parse(data)
export const validateQueryLeases = (data: unknown) =>
	queryLeasesSchema.parse(data)

export const validateCreateDocument = (data: unknown) =>
	createDocumentSchema.parse(data)
export const validateUpdateDocument = (data: unknown) =>
	updateDocumentSchema.parse(data)
export const validateQueryDocuments = (data: unknown) =>
	queryDocumentsSchema.parse(data)

export const validateUserId = (id: unknown) => userIdSchema.parse(id)
export const validatePropertyId = (id: unknown) => uuidSchema.parse(id)
export const validateUnitId = (id: unknown) => uuidSchema.parse(id)
export const validateTenantId = (id: unknown) => uuidSchema.parse(id)
export const validateLeaseId = (id: unknown) => uuidSchema.parse(id)
export const validateMaintenanceRequestId = (id: unknown) =>
	uuidSchema.parse(id)
export const validateDocumentId = (id: unknown) => uuidSchema.parse(id)

// ========================================
// Safe Validation Functions (returns Result type)
// ========================================

export const safeValidateCreateProperty = (data: unknown) =>
	createPropertySchema.safeParse(data)
export const safeValidateUpdateProperty = (data: unknown) =>
	updatePropertySchema.safeParse(data)
export const safeValidateQueryProperties = (data: unknown) =>
	queryPropertiesSchema.safeParse(data)

export const safeValidateCreateUnit = (data: unknown) =>
	createUnitSchema.safeParse(data)
export const safeValidateUpdateUnit = (data: unknown) =>
	updateUnitSchema.safeParse(data)
export const safeValidateQueryUnits = (data: unknown) =>
	queryUnitsSchema.safeParse(data)

export const safeValidateCreateTenant = (data: unknown) =>
	createTenantSchema.safeParse(data)
export const safeValidateUpdateTenant = (data: unknown) =>
	updateTenantSchema.safeParse(data)
export const safeValidateQueryTenants = (data: unknown) =>
	queryTenantsSchema.safeParse(data)

export const safeValidateCreateMaintenanceRequest = (data: unknown) =>
	createMaintenanceRequestSchema.safeParse(data)
export const safeValidateUpdateMaintenanceRequest = (data: unknown) =>
	updateMaintenanceRequestSchema.safeParse(data)
export const safeValidateQueryMaintenanceRequests = (data: unknown) =>
	queryMaintenanceRequestsSchema.safeParse(data)

export const safeValidateCreateLease = (data: unknown) =>
	createLeaseSchema.safeParse(data)
export const safeValidateUpdateLease = (data: unknown) =>
	updateLeaseSchema.safeParse(data)
export const safeValidateQueryLeases = (data: unknown) =>
	queryLeasesSchema.safeParse(data)

export const safeValidateCreateDocument = (data: unknown) =>
	createDocumentSchema.safeParse(data)
export const safeValidateUpdateDocument = (data: unknown) =>
	updateDocumentSchema.safeParse(data)
export const safeValidateQueryDocuments = (data: unknown) =>
	queryDocumentsSchema.safeParse(data)
