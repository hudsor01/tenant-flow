/**
 * Tenant Validation Schemas
 *
 * Schema Pattern (Zod 4 Best Practices):
 * - InputSchema: User-provided fields only (no id, created_at, updated_at)
 * - Schema: Full schema = InputSchema.extend({ id, created_at, updated_at })
 * - CreateSchema: InputSchema.omit({ fields_with_server_defaults })
 * - UpdateSchema: InputSchema.partial()
 *
 * IMPORTANT: .omit() only accepts keys that exist in the source schema.
 * Zod 4 throws "Unrecognized key" errors for non-existent keys.
 */

import { z } from "zod";
import { VALIDATION_LIMITS } from "#lib/constants/billing";
import { phoneSchema, uuidSchema } from "./common";

// Tenant status enum validation
export const tenantStatusSchema = z.enum([
	"active",
	"inactive",
	"pending",
	"SUSPENDED",
	"DELETED",
]);

// Active-set tenant statuses (excludes SUSPENDED/DELETED which are system
// states, not user-set). Use this for any UI surface that lets an owner
// set a status directly — bulk-import, quick-add form, etc. Exported as a
// tuple so consumers can `z.enum(TENANT_ACTIVE_STATUSES)` without
// duplicating the list.
export const TENANT_ACTIVE_STATUSES = [
	"active",
	"inactive",
	"pending",
	"moved_out",
] as const;
export type TenantActiveStatus = (typeof TENANT_ACTIVE_STATUSES)[number];

// Base tenant input schema (matches landlord-managed tenants table).
// Contact fields live directly on the row. Tenants are records, never auth
// users, so there is no user_id (LEGACY-TENANT-06).
export const tenantInputSchema = z.object({
	owner_user_id: uuidSchema.optional(),

	first_name: z
		.string()
		.max(100, "First name cannot exceed 100 characters")
		.optional(),

	last_name: z
		.string()
		.max(100, "Last name cannot exceed 100 characters")
		.optional(),

	name: z.string().max(200, "Name cannot exceed 200 characters").optional(),

	email: z.email({ message: "Valid email is required" }).optional(),

	phone: phoneSchema.optional(),

	status: z.enum(TENANT_ACTIVE_STATUSES).optional(),

	date_of_birth: z.string().optional(),

	emergency_contact_name: z
		.string()
		.max(100, "Emergency contact name cannot exceed 100 characters")
		.optional(),

	emergency_contact_phone: phoneSchema.optional(),

	emergency_contact_relationship: z
		.string()
		.max(50, "Emergency contact relationship cannot exceed 50 characters")
		.optional(),

	identity_verified: z.boolean().optional(),

	ssn_last_four: z
		.string()
		.regex(/^\d{4}$/, "SSN last four must be 4 digits")
		.optional(),
});

// Full tenant schema (includes server-generated fields)
const tenantSchema = tenantInputSchema.extend({
	id: uuidSchema,
	created_at: z.string(),
	updated_at: z.string(),
});

// Tenant update schema (partial input)
export const tenantUpdateSchema = tenantInputSchema.partial().extend({
	id: uuidSchema.optional(),
});

// Tenant query schema (for search/filtering)
export const tenantQuerySchema = z.object({
	search: z.string().optional(),
	identity_verified: z.boolean().optional(),
	created_after: z.string().optional(),
	created_before: z.string().optional(),
	sort_by: z.enum(["created_at", "identity_verified"]).optional(),
	sort_order: z.enum(["asc", "desc"]).optional().default("asc"),
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce
		.number()
		.int()
		.positive()
		.max(VALIDATION_LIMITS.API_QUERY_MAX_LIMIT)
		.default(20),
});

// Tenant creation schema
// stripe_customer_id is optional/nullable to match DB (set by Stripe integration, not user)
export const tenantCreateSchema = tenantInputSchema;

// Emergency contact validation schema (single source of truth)
export const emergencyContactSchema = z.object({
	name: z
		.string()
		.min(1, "Emergency contact name is required")
		.max(100, "Emergency contact name cannot exceed 100 characters"),
	phone: phoneSchema,
	relationship: z
		.string()
		.min(1, "Emergency contact relationship is required")
		.max(50, "Emergency contact relationship cannot exceed 50 characters"),
});

// Empty-safe emergency-contact schema for the tenant EDIT form (TEN-05).
// The form always submits present strings ("" when cleared, never undefined),
// so the fields must accept the empty string rather than require presence — an
// owner must be able to clear a field or save a name-only edit. Name and
// relationship are only max-bounded (empty passes); phone accepts "" OR a
// valid phone (a bare `.optional()` would NOT work because phoneSchema's
// `.min(10)` rejects "", and the value is never undefined). Do NOT `.required()`
// or `.partial()` this. Distinct from `emergencyContactSchema`, which validates
// a REQUIRED contact elsewhere.
export const tenantEmergencyContactEditSchema = z.object({
	emergency_contact_name: z
		.string()
		.max(100, "Emergency contact name cannot exceed 100 characters"),
	emergency_contact_phone: z.union([z.literal(""), phoneSchema]),
	emergency_contact_relationship: z
		.string()
		.max(50, "Emergency contact relationship cannot exceed 50 characters"),
});

// Tenant verification schema
export const tenantVerificationSchema = z.object({
	identity_verified: z.boolean(),
	verification_date: z.string().optional(),
});

// Export types
export type TenantInput = z.infer<typeof tenantInputSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type TenantUpdate = z.infer<typeof tenantUpdateSchema>;
export type TenantQuery = z.infer<typeof tenantQuerySchema>;
export type TenantCreate = z.infer<typeof tenantCreateSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type UpdateEmergencyContact = EmergencyContact; // Alias for user profile updates
export type TenantVerification = z.infer<typeof tenantVerificationSchema>;

// Frontend-specific form schemas
export const tenantFormSchema = z.object({
	first_name: z.string().max(100).optional(),
	last_name: z.string().max(100).optional(),
	name: z.string().max(200).optional(),
	email: z.email().optional(),
	phone: phoneSchema.optional(),
	date_of_birth: z.string().optional(),
	emergency_contact_name: z.string().max(100).optional(),
	emergency_contact_phone: phoneSchema.optional(),
	emergency_contact_relationship: z.string().max(50).optional(),
	identity_verified: z.boolean().optional(),
	ssn_last_four: z
		.string()
		.regex(/^\d{4}$/)
		.optional(),
});

// Transform functions for form data
const transformTenantFormData = (data: TenantFormData) => ({
	first_name: data.first_name || undefined,
	last_name: data.last_name || undefined,
	name: data.name || undefined,
	email: data.email || undefined,
	phone: data.phone || undefined,
	date_of_birth: data.date_of_birth || undefined,
	emergency_contact_name: data.emergency_contact_name || undefined,
	emergency_contact_phone: data.emergency_contact_phone || undefined,
	emergency_contact_relationship:
		data.emergency_contact_relationship || undefined,
	identity_verified: data.identity_verified,
	ssn_last_four: data.ssn_last_four || undefined,
});

export type TenantFormData = z.infer<typeof tenantFormSchema>;
export type TransformedTenantData = ReturnType<typeof transformTenantFormData>;

// Schema for adding a tenant to the platform (NO lease required)
// Flat structure - used for simple validation
export const addTenantSchema = z.object({
	email: z.email({ message: "Valid email is required" }),
	first_name: z.string().trim().min(1, "First name is required").max(100),
	last_name: z.string().trim().min(1, "Last name is required").max(100),
	phone: phoneSchema.optional(),
	// Property is OPTIONAL - tenant can be added without a property assignment
	// Property/unit assignment can be done later when creating a lease
	property_id: uuidSchema.optional(),
	unit_id: uuidSchema.optional(),
});

// Nested structure for creating a tenant record (with an optional lease)
// Used for API requests
export const addTenantRequestSchema = z.object({
	tenantData: z.object({
		email: z.email({ message: "Valid email is required" }),
		first_name: z.string().trim().min(1, "First name is required").max(100),
		last_name: z.string().trim().min(1, "Last name is required").max(100),
		phone: phoneSchema.optional(),
	}),
	// Property assignment is OPTIONAL - can add tenant without assigning to property
	leaseData: z
		.object({
			property_id: uuidSchema.optional(),
			unit_id: uuidSchema.optional(),
		})
		.optional(),
});

export type AddTenant = z.infer<typeof addTenantSchema>;
export type AddTenantRequest = z.infer<typeof addTenantRequestSchema>;

// Bulk operation schemas
export const bulkDeleteTenantsSchema = z.object({
	ids: z
		.array(uuidSchema)
		.min(1, "At least one tenant ID is required")
		.max(100, "Cannot delete more than 100 tenants at once"),
});

const bulkUpdateTenantsSchema = z.object({
	updates: z
		.array(
			z.object({
				id: uuidSchema,
				data: tenantUpdateSchema,
			}),
		)
		.min(1, "At least one update is required")
		.max(100, "Cannot update more than 100 tenants at once"),
});

export type BulkDeleteTenants = z.infer<typeof bulkDeleteTenantsSchema>;
export type BulkUpdateTenants = z.infer<typeof bulkUpdateTenantsSchema>;
