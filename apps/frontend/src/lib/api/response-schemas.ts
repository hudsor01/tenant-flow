/**
 * Zod schemas for API response validation
 * Based on shared types from @repo/shared
 */

import { z } from 'zod'
import { commonValidators } from './response-validator'

// Core shared schemas
const userSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	name: z.string().optional(),
	avatar: z.string().url().optional(),
	role: z.enum(['OWNER', 'MANAGER', 'TENANT']).optional(),
	organizationId: z.string().uuid().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
})

const propertySchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	address: z.string(),
	type: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE']),
	units: z.number().int().positive(),
	description: z.string().optional(),
	amenities: z.array(z.string()).optional(),
	images: z.array(z.string().url()).optional(),
	organizationId: z.string().uuid(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
})

const tenantSchema = z.object({
	id: z.string().uuid(),
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().email(),
	phone: z.string().optional(),
	emergencyContact: z
		.object({
			name: z.string(),
			phone: z.string(),
			relationship: z.string()
		})
		.optional(),
	propertyId: z.string().uuid(),
	unitId: z.string().uuid().optional(),
	organizationId: z.string().uuid(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
})

const leaseSchema = z.object({
	id: z.string().uuid(),
	propertyId: z.string().uuid(),
	tenantId: z.string().uuid(),
	unitId: z.string().uuid().optional(),
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
	monthlyRent: z.number().positive(),
	securityDeposit: z.number().nonnegative(),
	terms: z.record(z.string(), z.unknown()).optional(),
	status: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED']),
	organizationId: z.string().uuid(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
})

const maintenanceRequestSchema = z.object({
	id: z.string().uuid(),
	propertyId: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	unitId: z.string().uuid().optional(),
	title: z.string(),
	description: z.string(),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
	status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
	category: z.string().optional(),
	assignedTo: z.string().uuid().optional(),
	completedAt: z.string().datetime().optional(),
	organizationId: z.string().uuid(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
})

const unitSchema = z.object({
	id: z.string().uuid(),
	propertyId: z.string().uuid(),
	unitNumber: z.string(),
	bedrooms: z.number().int().nonnegative(),
	bathrooms: z.number().nonnegative(),
	squareFeet: z.number().positive().optional(),
	rent: z.number().positive().optional(),
	isOccupied: z.boolean(),
	description: z.string().optional(),
	organizationId: z.string().uuid(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
})

// Statistics schemas
const dashboardStatsSchema = z.object({
	totalProperties: z.number().int().nonnegative(),
	totalUnits: z.number().int().nonnegative(),
	occupiedUnits: z.number().int().nonnegative(),
	occupancyRate: z.number().min(0).max(100),
	totalTenants: z.number().int().nonnegative(),
	monthlyRevenue: z.number().nonnegative(),
	pendingMaintenance: z.number().int().nonnegative(),
	recentActivity: z
		.array(
			z.object({
				id: z.string(),
				type: z.string(),
				description: z.string(),
				timestamp: z.string().datetime()
			})
		)
		.optional()
})

const propertyStatsSchema = z.object({
	totalProperties: z.number().int().nonnegative(),
	occupancyRate: z.number().min(0).max(100),
	averageRent: z.number().nonnegative(),
	totalRevenue: z.number().nonnegative(),
	maintenanceRequests: z.number().int().nonnegative()
})

const tenantStatsSchema = z.object({
	totalTenants: z.number().int().nonnegative(),
	activeLeases: z.number().int().nonnegative(),
	expiringSoon: z.number().int().nonnegative(),
	averageStayLength: z.number().nonnegative()
})

const maintenanceStatsSchema = z.object({
	totalRequests: z.number().int().nonnegative(),
	openRequests: z.number().int().nonnegative(),
	inProgress: z.number().int().nonnegative(),
	completedThisMonth: z.number().int().nonnegative(),
	averageResolutionTime: z.number().nonnegative()
})

// Billing schemas
const subscriptionSchema = z.object({
	id: z.string(),
	status: z.enum(['active', 'canceled', 'past_due', 'trialing']),
	currentPlan: z.enum(['free', 'starter', 'professional', 'enterprise']),
	billingCycle: z.enum(['monthly', 'annually']),
	nextBillingDate: z.string().datetime().optional(),
	features: z.array(z.string()),
	limits: z.object({
		properties: z.number().int().positive(),
		tenants: z.number().int().positive(),
		storage: z.number().positive()
	})
})

// API Response schemas using commonValidators
export const responseSchemas = {
	// Auth responses
	user: commonValidators.apiResponse(userSchema),
	session: commonValidators.apiResponse(
		z.object({
			user: userSchema,
			session: z.object({
				access_token: z.string(),
				refresh_token: z.string(),
				expires_at: z.number()
			})
		})
	),

	// Property responses
	property: commonValidators.apiResponse(propertySchema),
	properties: commonValidators.apiResponse(z.array(propertySchema)),
	paginatedProperties: commonValidators.apiResponse(
		commonValidators.paginatedResponse(propertySchema)
	),
	propertyStats: commonValidators.apiResponse(propertyStatsSchema),

	// Tenant responses
	tenant: commonValidators.apiResponse(tenantSchema),
	tenants: commonValidators.apiResponse(z.array(tenantSchema)),
	paginatedTenants: commonValidators.apiResponse(
		commonValidators.paginatedResponse(tenantSchema)
	),
	tenantStats: commonValidators.apiResponse(tenantStatsSchema),

	// Lease responses
	lease: commonValidators.apiResponse(leaseSchema),
	leases: commonValidators.apiResponse(z.array(leaseSchema)),
	paginatedLeases: commonValidators.apiResponse(
		commonValidators.paginatedResponse(leaseSchema)
	),

	// Maintenance responses
	maintenanceRequest: commonValidators.apiResponse(maintenanceRequestSchema),
	maintenanceRequests: commonValidators.apiResponse(
		z.array(maintenanceRequestSchema)
	),
	paginatedMaintenanceRequests: commonValidators.apiResponse(
		commonValidators.paginatedResponse(maintenanceRequestSchema)
	),
	maintenanceStats: commonValidators.apiResponse(maintenanceStatsSchema),

	// Unit responses
	unit: commonValidators.apiResponse(unitSchema),
	units: commonValidators.apiResponse(z.array(unitSchema)),

	// Dashboard responses
	dashboardStats: commonValidators.apiResponse(dashboardStatsSchema),

	// Billing responses
	subscription: commonValidators.apiResponse(subscriptionSchema),

	// Generic responses
	success: commonValidators.successResponse,
	id: commonValidators.apiResponse(commonValidators.idResponse),
	error: commonValidators.errorResponse
} as const

// Export individual schemas for direct use
export {
	userSchema,
	propertySchema,
	tenantSchema,
	leaseSchema,
	maintenanceRequestSchema,
	unitSchema,
	dashboardStatsSchema,
	propertyStatsSchema,
	tenantStatsSchema,
	maintenanceStatsSchema,
	subscriptionSchema
}

export default responseSchemas
