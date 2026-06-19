/**
 * API Contract Types - Shared API request/response interfaces
 *
 * Centralized API contract definitions for type-safe communication
 * between frontend and backend services.
 *
 * Type Flow: supabase.ts → api-contracts.ts → Backend/Frontend
 *
 * Note: Base row types (Property, Tenant, etc.) are in core.ts
 * This file defines List/Detail response types and Insert/Update types
 */

// Import directly from supabase.ts (source of truth)
import type { Tables, TablesInsert, TablesUpdate } from "./supabase";

// Note: Base row types (Property, Tenant, Lease, etc.) are in core.ts
// Import them directly from '#types/core' — no re-exports per CLAUDE.md rules

import type { PropertyCreate } from "#lib/validation/properties";
// Import Zod-inferred types (Single Source of Truth)
import type { TenantCreate, TenantUpdate } from "#lib/validation/tenants";

export interface UserProfileOwnerData {
	properties_count: number;
	units_count: number;
}

export interface UserProfile {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	full_name: string;
	phone: string | null;
	avatar_url: string | null;
	is_admin: boolean;
	status: string;
	created_at: string | null;
	updated_at: string | null;
	owner_profile?: UserProfileOwnerData;
}

/**
 * Input for updating user profile (name, email, phone)
 */
export interface UpdateProfileInput {
	first_name: string;
	last_name: string;
	email: string;
	phone?: string | null;
}

/**
 * Input for updating phone number
 */
export interface UpdatePhoneInput {
	phone: string | null;
}

/**
 * Input for updating emergency contact (all fields required)
 * Different from UpdateEmergencyContactInput which has optional fields
 */
export interface SetEmergencyContactInput {
	name: string;
	phone: string;
	relationship: string;
}

/**
 * Response from avatar upload endpoint
 */
export interface AvatarUploadResponse {
	avatar_url: string;
}

/** Property list item - minimal fields for list views */
export type PropertyListItem = Pick<
	Tables<"properties">,
	| "id"
	| "name"
	| "address_line1"
	| "city"
	| "state"
	| "postal_code"
	| "status"
	| "property_type"
	| "created_at"
>;

/** Property detail - full row with related units */
export type PropertyDetail = Tables<"properties"> & {
	units?: Pick<
		Tables<"units">,
		"id" | "unit_number" | "status" | "bedrooms" | "bathrooms" | "rent_amount"
	>[];
};

/** Unit list item - minimal fields for list views */
export type UnitListItem = Pick<
	Tables<"units">,
	| "id"
	| "unit_number"
	| "property_id"
	| "status"
	| "bedrooms"
	| "bathrooms"
	| "rent_amount"
	| "square_feet"
>;

/** Unit detail - full row with property info */
export type UnitDetail = Tables<"units"> & {
	property?: Pick<
		Tables<"properties">,
		"id" | "name" | "address_line1" | "city" | "state"
	>;
};

/** Tenant list item - minimal fields for list views */
export type TenantListItem = Pick<Tables<"tenants">, "id" | "created_at">;

/** Tenant detail - full tenant with user and lease info */
export type TenantDetail = Tables<"tenants"> & {
	user: Pick<
		Tables<"users">,
		| "id"
		| "email"
		| "first_name"
		| "last_name"
		| "phone"
		| "status"
		| "avatar_url"
	>;
	leases?: Pick<
		Tables<"leases">,
		| "id"
		| "lease_status"
		| "start_date"
		| "end_date"
		| "rent_amount"
		| "unit_id"
	>[];
};

/** Lease list item - minimal fields for list views */
export type LeaseListItem = Pick<
	Tables<"leases">,
	| "id"
	| "lease_status"
	| "start_date"
	| "end_date"
	| "rent_amount"
	| "unit_id"
	| "primary_tenant_id"
	| "created_at"
>;

/** Lease detail - full row with relations */
export type LeaseDetail = Tables<"leases"> & {
	unit?: Pick<Tables<"units">, "id" | "unit_number" | "property_id"> & {
		property?: Pick<
			Tables<"properties">,
			"id" | "name" | "address_line1" | "city" | "state"
		>;
	};
	tenant?: Pick<
		Tables<"users">,
		"id" | "email" | "first_name" | "last_name" | "phone"
	>;
};

/** Maintenance request list item - minimal fields for list views */
export type MaintenanceRequestListItem = Pick<
	Tables<"maintenance_requests">,
	| "id"
	| "title"
	| "status"
	| "priority"
	| "unit_id"
	| "tenant_id"
	| "created_at"
	| "scheduled_date"
>;

/** Maintenance request detail - full row with relations */
export type MaintenanceRequestDetail = Tables<"maintenance_requests"> & {
	unit?: Pick<Tables<"units">, "id" | "unit_number" | "property_id"> & {
		property?: Pick<Tables<"properties">, "id" | "name" | "address_line1">;
	};
	tenant?: Pick<
		Tables<"users">,
		"id" | "email" | "first_name" | "last_name" | "phone"
	>;
	assigned_user?: Pick<Tables<"users">, "id" | "first_name" | "last_name">;
};

/** Property insert type */
export type PropertyInsert = TablesInsert<"properties">;

/** Property update type */
export type PropertyUpdate = TablesUpdate<"properties">;

/** Unit insert type */
export type UnitInsert = TablesInsert<"units">;

/** Unit update type */
export type UnitUpdate = TablesUpdate<"units">;

/** Lease insert type */
export type LeaseInsert = TablesInsert<"leases">;

/** Lease update type */
export type LeaseUpdate = TablesUpdate<"leases">;

/** Maintenance request insert type */
export type MaintenanceRequestInsert = TablesInsert<"maintenance_requests">;

/** Maintenance request update type */
export type MaintenanceRequestUpdate = TablesUpdate<"maintenance_requests">;

/**
 * Tenant status values (normalized to lowercase for consistency)
 * Maps to application-level status, not a database enum
 */
export type TenantStatus = "active" | "inactive" | "pending";

// Tenant-related API contracts
export interface TenantFilters {
	status?: TenantStatus;
	property_id?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface LeaseFilters {
	status?: string;
	property_id?: string;
	tenant_id?: string;
	start_date?: string;
	end_date?: string;
	limit?: number;
	offset?: number;
}

export interface SignatureStatus {
	lease_id: string;
	owner_signed: boolean;
	tenant_signed: boolean;
	owner_signed_at: string | null;
	tenant_signed_at: string | null;
	owner_signature_ip: string | null;
	tenant_signature_ip: string | null;
}

export interface SignatureStatusResponse {
	lease_id: string;
	status: "draft" | "pending_signature" | "active" | "ended" | "terminated";
	owner_signed: boolean;
	owner_signed_at: string | null;
	tenant_signed: boolean;
	tenant_signed_at: string | null;
	sent_for_signature_at: string | null;
	both_signed: boolean;
}

export interface PropertyApiFilters {
	status?: "active" | "SOLD" | "inactive";
	property_type?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface MaintenanceFilters {
	unit_id?: string;
	property_id?: string;
	status?: string;
	priority?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

export interface UnitFilters {
	property_id?: string;
	status?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

/**
 * Invoice response from Stripe API
 */
export interface StripeInvoice {
	id: string;
	amount_paid: number;
	status: string;
	created: number;
	invoice_pdf: string | null;
	hosted_invoice_url: string | null;
	currency: string;
	description: string | null;
}

/**
 * Billing history item -- a landlord's TenantFlow SaaS invoice.
 * Sourced from `public.get_user_invoices` which reads stripe.invoices through
 * the Supabase Stripe Foreign Data Wrapper.
 */
export interface BillingHistoryItem {
	id: string;
	amount: number;
	currency: string;
	status: "succeeded" | "failed" | "pending" | "cancelled";
	created_at: string;
	formattedAmount: string;
	formattedDate: string;
	isSuccessful: boolean;
	invoice_pdf: string | null;
	hosted_invoice_url: string | null;
}

/**
 * Subscription status response from Stripe API
 */
export interface SubscriptionStatusResponse {
	subscriptionStatus:
		| "active"
		| "trialing"
		| "cancelled"
		| "canceled"
		| "past_due"
		| "unpaid"
		| "incomplete"
		| "incomplete_expired"
		| "paused"
		| null;
	stripeCustomerId: string | null;
	stripePriceId: string | null;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	trialEndsAt: string | null;
}

export interface CreateMaintenanceRequestInput {
	title: string;
	description: string;
	property_id: string;
	unit_id?: string;
	priority: string;
	category?: string;
	preferred_date?: string;
	tenant_id?: string;
	scheduledDate?: string;
	scheduled_date?: string;
	estimated_cost?: number;
	photos?: string[];
}

export interface UpdateMaintenanceRequestInput {
	title?: string;
	description?: string;
	priority?: string;
	category?: string;
	status?: string;
	scheduledDate?: string;
	completedDate?: string | null;
	estimated_cost?: number;
}

export interface EmergencyContact {
	id: string;
	tenant_id: string;
	name: string;
	phone: string;
	relationship: string;
	created_at: string;
	updated_at: string;
}

export interface CreateEmergencyContactInput {
	tenant_id: string;
	name: string;
	phone: string;
	relationship: string;
}

export interface UpdateEmergencyContactInput {
	name?: string;
	phone?: string;
	relationship?: string;
}

export interface EmergencyContactResponse {
	id: string;
	tenant_id: string;
	name: string;
	phone: string;
	relationship: string;
	created_at: string;
	updated_at: string;
}

export interface OwnerPaymentSummaryResponse {
	lateFeeTotal: number;
	unpaidTotal: number;
	unpaidCount: number;
	tenantCount: number;
}

/** Default empty response for graceful degradation when API fails */
export const EMPTY_PAYMENT_SUMMARY: OwnerPaymentSummaryResponse = {
	lateFeeTotal: 0,
	unpaidTotal: 0,
	unpaidCount: 0,
	tenantCount: 0,
} as const;

export interface CreateLeaseInput {
	// Selection (Step 1)
	unit_id: string;
	primary_tenant_id: string;
	owner_user_id?: string;

	// Terms (Step 2)
	start_date: string;
	end_date: string;
	rent_amount: number;
	rent_currency?: string;
	security_deposit: number;
	payment_day?: number;
	grace_period_days?: number | null;
	late_fee_amount?: number | null;
	late_fee_days?: number | null;

	// Lease Details (Step 3)
	max_occupants?: number | null;
	pets_allowed?: boolean;
	pet_deposit?: number | null;
	pet_rent?: number | null;
	utilities_included?: string[];
	tenant_responsible_utilities?: string[];
	property_rules?: string | null;
	property_built_before_1978?: boolean;
	lead_paint_disclosure_acknowledged?: boolean | null;
	governing_state?: string;

	lease_status?:
		| "draft"
		| "pending_signature"
		| "active"
		| "ended"
		| "terminated";
}

export interface UpdateLeaseInput {
	unit_id?: string;
	primary_tenant_id?: string;
	start_date?: string;
	end_date?: string;
	rent_amount?: number;
	rent_currency?: string;
	security_deposit?: number;
	payment_day?: number;
	grace_period_days?: number | null;
	late_fee_amount?: number | null;
	late_fee_days?: number | null;

	// Lease Details
	max_occupants?: number | null;
	pets_allowed?: boolean;
	pet_deposit?: number | null;
	pet_rent?: number | null;
	utilities_included?: string[];
	tenant_responsible_utilities?: string[];
	property_rules?: string | null;
	property_built_before_1978?: boolean;
	lead_paint_disclosure_acknowledged?: boolean | null;
	governing_state?: string;

	lease_status?:
		| "draft"
		| "pending_signature"
		| "active"
		| "ended"
		| "terminated";
}

export interface CreatePropertyInput {
	name: string;
	address_line1: string;
	address_line2?: string;
	city: string;
	state: string;
	postal_code: string;
	country?: string;
	property_type?: string;
	owner_user_id: string;
	units_count?: number;
}

export interface UpdatePropertyInput {
	name?: string;
	address?: string;
	address_line1?: string;
	city?: string;
	state?: string;
	zip_code?: string;
	postal_code?: string;
	property_type?: string;
	units_count?: number;
}

export interface CreateUnitInput {
	property_id: string;
	unit_number?: string | null;
	bedrooms?: number | null | undefined;
	bathrooms?: number | null | undefined;
	square_feet?: number | null | undefined;
	rent_amount?: number | null | undefined;
	rent_currency?: string | null | undefined;
	status?:
		| "available"
		| "occupied"
		| "maintenance"
		| "reserved"
		| null
		| undefined;
}

export interface UpdateUnitInput {
	property_id?: string;
	unit_number?: string;
	bedrooms?: number | null;
	bathrooms?: number | null;
	square_feet?: number | null;
	rent_amount?: number | null;
	rent_currency?: string | null;
	status?: "available" | "occupied" | "maintenance" | "reserved" | null;
}

// Pagination response wrapper
export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
	data: T;
	success: boolean;
	message?: string;
	error?: string;
}

// Request/Response aliases for consistency
export type CreateTenantRequest = TenantCreate;
export type UpdateTenantRequest = TenantUpdate;
export type CreateUnitRequest = CreateUnitInput;
export type UpdateUnitRequest = UpdateUnitInput;
export type CreatePropertyRequest = CreatePropertyInput;
export type UpdatePropertyRequest = UpdatePropertyInput;
export type CreateMaintenanceRequest = CreateMaintenanceRequestInput;
export type UpdateMaintenanceRequest = UpdateMaintenanceRequestInput;

// Bulk Import types (merged from bulk-import.ts)
export type ImportStep = "upload" | "validate" | "confirm";

export interface BulkImportResult {
	success: boolean;
	imported: number;
	failed: number;
	errors: Array<{ row: number; error: string }>;
}

export interface ParsedRow<T = PropertyCreate> {
	row: number;
	data: Record<string, string>;
	errors: Array<{ field: string; message: string }>;
	parsed: T | null;
}

export interface ImportProgress {
	current: number;
	total: number;
	succeeded: number;
	failed: number;
}

export const DEFAULT_RETRY_ATTEMPTS = 3;
