/**
 * Centralized DTO exports using Zod inference
 * This file replaces manual DTO definitions with Zod-inferred types
 */

// Import all Zod schemas
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
	queryUnitsSchema,
	signupSchema,
	updateLeaseSchema,
	updateMaintenanceRequestSchema,
	updatePropertySchema,
	updateTenantSchema,
	updateUnitSchema,
	uuidSchema
} from '../validation/zod-schemas'
import type { z } from 'zod'

// ========================================
// Property DTOs (Zod-inferred)
// ========================================
export type CreatePropertyDto = z.infer<typeof createPropertySchema>
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>
export type QueryPropertiesDto = z.infer<typeof queryPropertiesSchema>

// ========================================
// Unit DTOs (Zod-inferred)
// ========================================
export type CreateUnitDto = z.infer<typeof createUnitSchema>
export type UpdateUnitDto = z.infer<typeof updateUnitSchema>
export type QueryUnitsDto = z.infer<typeof queryUnitsSchema>

// ========================================
// Tenant DTOs (Zod-inferred)
// ========================================
export type TenantCreateDto = z.infer<typeof createTenantSchema>
export type TenantUpdateDto = z.infer<typeof updateTenantSchema>
export type TenantQueryDto = z.infer<typeof queryTenantsSchema>

// ========================================
// Maintenance DTOs (Zod-inferred)
// ========================================
export type CreateMaintenanceRequestDto = z.infer<
	typeof createMaintenanceRequestSchema
>
export type UpdateMaintenanceRequestDto = z.infer<
	typeof updateMaintenanceRequestSchema
>
export type MaintenanceRequestQueryDto = z.infer<
	typeof queryMaintenanceRequestsSchema
>

// ========================================
// Lease DTOs (Zod-inferred)
// ========================================
export type CreateLeaseDto = z.infer<typeof createLeaseSchema>
export type UpdateLeaseDto = z.infer<typeof updateLeaseSchema>
export type LeaseQueryDto = z.infer<typeof queryLeasesSchema>

// ========================================
// Authentication DTOs (Zod-inferred)
// ========================================
export type LoginDto = z.infer<typeof loginSchema>
export type SignupDto = z.infer<typeof signupSchema>

// ========================================
// Common DTOs (Zod-inferred)
// ========================================
export type UuidDto = z.infer<typeof uuidSchema>
export type EmailDto = z.infer<typeof emailSchema>
export type PhoneDto = z.infer<typeof phoneSchema>

// ========================================
// Export schemas for validation decorators
// ========================================
export {
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
	queryUnitsSchema,
	signupSchema,
	updateLeaseSchema,
	updateMaintenanceRequestSchema,
	updatePropertySchema,
	updateTenantSchema,
	updateUnitSchema,
	uuidSchema
}
