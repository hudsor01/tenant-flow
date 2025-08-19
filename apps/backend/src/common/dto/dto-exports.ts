/**
 * Central export point for all DTOs in the application
 */

import {
	createLeaseSchema,
	createMaintenanceRequestSchema,
	createPropertySchema,
	createTenantSchema,
	createUnitSchema,
	emailSchema,
	loginSchema,
	phoneSchema,
	queryLeasesSchema,
	queryMaintenanceRequestsSchema,
	queryPropertiesSchema,
	queryTenantsSchema,
	signupSchema,
	updateLeaseSchema,
	updateMaintenanceRequestSchema,
	updatePropertySchema,
	updateTenantSchema,
	updateUnitSchema,
	uuidSchema
} from '../validation/zod-schemas'
import type { z } from 'zod'

// Property DTOs
export type CreatePropertyDto = z.infer<typeof createPropertySchema>
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>
export type QueryPropertiesDto = z.infer<typeof queryPropertiesSchema>

// Unit DTOs
export type CreateUnitDto = z.infer<typeof createUnitSchema>
export type UpdateUnitDto = z.infer<typeof updateUnitSchema>

// Tenant DTOs
export type TenantCreateDto = z.infer<typeof createTenantSchema>
export type TenantUpdateDto = z.infer<typeof updateTenantSchema>
export type TenantQueryDto = z.infer<typeof queryTenantsSchema>

// Lease DTOs
export type CreateLeaseDto = z.infer<typeof createLeaseSchema>
export type UpdateLeaseDto = z.infer<typeof updateLeaseSchema>
export type LeaseQueryDto = z.infer<typeof queryLeasesSchema>

// Maintenance DTOs
export type CreateMaintenanceRequestDto = z.infer<typeof createMaintenanceRequestSchema>
export type UpdateMaintenanceRequestDto = z.infer<typeof updateMaintenanceRequestSchema>
export type MaintenanceRequestQueryDto = z.infer<typeof queryMaintenanceRequestsSchema>

// Auth DTOs
export type LoginDto = z.infer<typeof loginSchema>
export type SignupDto = z.infer<typeof signupSchema>

// Common DTOs
export type UuidDto = z.infer<typeof uuidSchema>
export type EmailDto = z.infer<typeof emailSchema>
export type PhoneDto = z.infer<typeof phoneSchema>

// Export schemas for validation decorators
export {
	createPropertySchema,
	updatePropertySchema,
	queryPropertiesSchema,
	createUnitSchema,
	updateUnitSchema,
	createTenantSchema,
	updateTenantSchema,
	queryTenantsSchema,
	createLeaseSchema,
	updateLeaseSchema,
	queryLeasesSchema,
	createMaintenanceRequestSchema,
	updateMaintenanceRequestSchema,
	queryMaintenanceRequestsSchema,
	loginSchema,
	signupSchema,
	uuidSchema,
	emailSchema,
	phoneSchema
}