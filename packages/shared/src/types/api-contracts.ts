/**
 * API Contract Types - Shared API request/response interfaces
 *
 * Centralized API contract definitions for type-safe communication
 * between frontend and backend services.
 */

// Import Zod-inferred types (Single Source of Truth)
import type { TenantCreate, TenantUpdate } from '../validation/tenants.js'

/**
 * Tenant status values (normalized to lowercase for consistency)
 * Maps to application-level status, not a database enum
 */
export type TenantStatus = 'active' | 'inactive' | 'pending'

// Tenant-related API contracts
export interface TenantFilters {
	status?: TenantStatus
	property_id?: string
	search?: string
	limit?: number
	offset?: number
}

export interface TenantInvitation {
	id: string
	email: string
	first_name: string | null
	last_name: string | null
	unit_id: string
	unit_number: string
	property_name: string
	created_at: string
	expires_at: string
	accepted_at: string | null
	status: 'sent' | 'accepted' | 'expired'
}

export interface InvitationFilters {
	status?: 'sent' | 'accepted' | 'expired'
	page?: number
	limit?: number
}

export interface LeaseFilters {
	status?: string
	property_id?: string
	tenant_id?: string
	start_date?: string
	end_date?: string
	limit?: number
	offset?: number
}

export interface SignatureStatus {
	lease_id: string
	owner_signed: boolean
	tenant_signed: boolean
	owner_signed_at: string | null
	tenant_signed_at: string | null
	owner_signature_ip: string | null
	tenant_signature_ip: string | null
}

export interface SignatureStatusResponse {
	lease_id: string
	status: 'draft' | 'pending_signature' | 'active' | 'ended' | 'terminated'
	owner_signed: boolean
	owner_signed_at: string | null
	tenant_signed: boolean
	tenant_signed_at: string | null
	sent_for_signature_at: string | null
	both_signed: boolean
	docuseal_submission_id: string | null
}

export interface PropertyFilters {
	status?: 'active' | 'SOLD' | 'inactive'
	property_type?: string
	search?: string
	limit?: number
	offset?: number
}

export interface MaintenanceFilters {
	unit_id?: string
	property_id?: string
	status?: string
	priority?: string
	search?: string
	limit?: number
	offset?: number
}

export interface UnitFilters {
	property_id?: string
	status?: string
	search?: string
	limit?: number
	offset?: number
}

export interface PaymentHistoryItem {
	id: string
	amount: number
	status: string
	paid_date: string | null
	due_date: string
	created_at: string
	lease_id: string
	tenant_id: string
	payment_method_type: string
	period_start: string
	period_end: string
}

export interface FailedPaymentAttempt {
	id: string
	payment_id: string
	attempt_count: number
	last_error: string
	last_attempted_at: string
	status: string
}

export interface TenantPayment {
	id: string
	amount: number
	status: string
	due_date: string
	paid_date: string | null
	lease_id: string
	rent_amount: number
	late_fee_amount: number
	application_fee_amount: number
	period_start: string
	period_end: string
}

export interface TenantAutopayStatus {
	autopayEnabled: boolean
	paymentMethodId: string | null
	paymentMethodName: string | null
}

export interface TenantMaintenanceRequest {
	id: string
	title: string
	description: string
	status: string
	priority: string
	created_at: string
	completed_at: string | null
	property_id: string
	property_name: string
	unit_id: string
	unit_number: string
	assigned_to: string | null
	assigned_to_name: string | null
}

export interface TenantMaintenanceStats {
	total: number
	open: number
	in_progress: number
	completed: number
	emergency: number
}

export interface TenantLease {
	id: string
	start_date: string
	end_date: string
	rent_amount: number
	security_deposit: number
	status: string
	property_name: string
	unit_number: string
	property_address: string
}

export interface TenantDocument {
	id: string
	name: string
	type: string
	created_at: string
	file_size: number
	storage_url: string
	entity_id: string
	entity_type: string
}

export interface TenantProfile {
	id: string
	first_name: string | null
	last_name: string | null
	email: string
	phone: string | null
	date_of_birth: string | null
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	emergency_contact_relationship: string | null
}

export interface TenantSettings {
	profile: TenantProfile
	notification_preferences: TenantNotificationPreferences
}

export interface CreateMaintenanceRequestInput {
	title: string
	description: string
	property_id: string
	unit_id?: string
	priority: string
	category?: string
	preferred_date?: string
	tenant_id?: string
	scheduledDate?: string
	scheduled_date?: string
	estimated_cost?: number
	photos?: string[]
}

export interface UpdateMaintenanceRequestInput {
	title?: string
	description?: string
	priority?: string
	category?: string
	status?: string
	scheduledDate?: string
	completedDate?: string | null
	estimated_cost?: number
}

export interface AmountDueResponse {
	base_rent_cents: number
	late_fees_cents: number
	other_charges_cents: number
	total_due_cents: number
	next_payment_date: string
}

export interface PayRentRequest {
	payment_method_id: string
	lease_id: string
	amount: number
}

export interface PayRentResponse {
	success: boolean
	payment_id: string
	status: string
	message?: string
}

export interface TenantNotificationPreferences {
	emailNotifications: boolean
	smsNotifications: boolean
	maintenanceUpdates: boolean
	paymentReminders: boolean
}

export interface LateFeeConfig {
	lease_id: string
	late_fee_amount: number
	late_fee_days: number
	grace_period_days: number
}

export interface OverduePayment {
	id: string
	lease_id: string
	tenant_id: string
	amount: number
	due_date: string
	late_fee_amount: number
	status: string
}

export interface ProcessLateFeesResult {
	processed: number
	failed: number
	total_amount: number
	errors: string[]
}

export interface ApplyLateFeeResult {
	invoiceItemId: string
	amount: number
	success: boolean
	message?: string
}

export interface FinancialChartDatum {
	date: string
	income: number
	expenses: number
	net: number
}

export interface EmergencyContact {
	id: string
	tenant_id: string
	name: string
	phone: string
	relationship: string
	created_at: string
	updated_at: string
}

export interface CreateEmergencyContactInput {
	tenant_id: string
	name: string
	phone: string
	relationship: string
}

export interface UpdateEmergencyContactInput {
	name?: string
	phone?: string
	relationship?: string
}

export interface EmergencyContactResponse {
	id: string
	tenant_id: string
	name: string
	phone: string
	relationship: string
	created_at: string
	updated_at: string
}

export interface PaymentStatus {
	status: 'paid' | 'DUE' | 'OVERDUE' | 'pending'
	due_date: string
	amount: number
}

export interface NotificationPreferences {
	rentReminders: boolean
	maintenanceUpdates: boolean
	leaseNotifications: boolean
	paymentReminders: boolean
}

export interface OwnerPaymentSummaryResponse {
	lateFeeTotal: number
	unpaidTotal: number
	unpaidCount: number
	tenantCount: number
}

/** Default empty response for graceful degradation when API fails */
export const EMPTY_PAYMENT_SUMMARY: OwnerPaymentSummaryResponse = {
	lateFeeTotal: 0,
	unpaidTotal: 0,
	unpaidCount: 0,
	tenantCount: 0
} as const

export interface TenantPaymentRecord {
	id: string
	amount: number
	currency?: string
	status: string
	paid_date: string | null
	due_date: string
	created_at: string
	lease_id: string
	tenant_id: string
	payment_method_type: string
	period_start: string
	period_end: string
	description?: string
	metadata?: Record<string, unknown> | null
	receipt_email?: string | null
	receiptEmail?: string | null
}

export interface CreateLeaseInput {
	// Selection (Step 1)
	unit_id: string
	primary_tenant_id: string
	property_owner_id?: string

	// Terms (Step 2)
	start_date: string
	end_date: string
	rent_amount: number
	rent_currency?: string
	security_deposit: number
	payment_day?: number
	grace_period_days?: number | null
	late_fee_amount?: number | null
	late_fee_days?: number | null

	// Lease Details (Step 3)
	max_occupants?: number | null
	pets_allowed?: boolean
	pet_deposit?: number | null
	pet_rent?: number | null
	utilities_included?: string[]
	tenant_responsible_utilities?: string[]
	property_rules?: string | null
	property_built_before_1978?: boolean
	lead_paint_disclosure_acknowledged?: boolean | null
	governing_state?: string

	// Status and billing
	lease_status?:
		| 'draft'
		| 'pending_signature'
		| 'active'
		| 'ended'
		| 'terminated'
	auto_pay_enabled?: boolean
	stripe_subscription_id?: string
}

export interface UpdateLeaseInput {
	unit_id?: string
	primary_tenant_id?: string
	start_date?: string
	end_date?: string
	rent_amount?: number
	rent_currency?: string
	security_deposit?: number
	payment_day?: number
	grace_period_days?: number | null
	late_fee_amount?: number | null
	late_fee_days?: number | null

	// Lease Details
	max_occupants?: number | null
	pets_allowed?: boolean
	pet_deposit?: number | null
	pet_rent?: number | null
	utilities_included?: string[]
	tenant_responsible_utilities?: string[]
	property_rules?: string | null
	property_built_before_1978?: boolean
	lead_paint_disclosure_acknowledged?: boolean | null
	governing_state?: string

	lease_status?:
		| 'draft'
		| 'pending_signature'
		| 'active'
		| 'ended'
		| 'terminated'
	auto_pay_enabled?: boolean
}

export interface CreatePropertyInput {
	name: string
	address_line1: string
	address_line2?: string
	city: string
	state: string
	postal_code: string
	country?: string
	property_type?: string
	property_owner_id: string
	units_count?: number
}

export interface UpdatePropertyInput {
	name?: string
	address?: string
	address_line1?: string
	city?: string
	state?: string
	zip_code?: string
	postal_code?: string
	property_type?: string
	units_count?: number
}



export interface CreateUnitInput {
	property_id: string
	unit_number?: string | null
	bedrooms?: number | null | undefined
	bathrooms?: number | null | undefined
	square_feet?: number | null | undefined
	rent_amount?: number | null | undefined
	rent_currency?: string | null | undefined
	status?: 'vacant' | 'occupied' | 'maintenance' | 'RESERVED' | null | undefined
}

export interface UpdateUnitInput {
	property_id?: string
	unit_number?: string
	bedrooms?: number | null
	bathrooms?: number | null
	square_feet?: number | null
	rent_amount?: number | null
	rent_currency?: string | null
	status?: 'vacant' | 'occupied' | 'maintenance' | 'RESERVED' | null
}

// Pagination response wrapper
export interface PaginatedResponse<T> {
	data: T[]
	total: number
	pagination: {
		page: number
		limit: number
		total: number
		totalPages: number
	}
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
	data: T
	success: boolean
	message?: string
	error?: string
}

// Tenant payment history response
export interface TenantPaymentHistoryResponse {
	payments: PaymentHistoryItem[]
	pagination: {
		page: number
		limit: number
		total: number
	}
}

// Subscription types
export interface CreateRentSubscriptionRequest {
	leaseId: string
	paymentMethodId: string
	amount: number
	billingDayOfMonth: number
	currency?: string
}

export interface RentSubscriptionResponse {
	id: string
	leaseId: string
	tenantId: string
	ownerId: string
	stripeSubscriptionId: string
	stripeCustomerId: string
	paymentMethodId?: string | undefined
	amount?: number | undefined
	currency: string
	billingDayOfMonth: number
	nextChargeDate?: string | undefined
	status: string
	platformFeePercentage: number
	pausedAt?: string | undefined
	canceledAt?: string | undefined
	createdAt: string
	updatedAt: string
}

export interface UpdateSubscriptionRequest {
	paymentMethodId?: string
	status?: 'active' | 'paused' | 'cancelled'
	amount?: number
	billingDayOfMonth?: number
}

export interface SubscriptionActionResponse {
	success: boolean
	message: string
	subscription?: RentSubscriptionResponse
}

// Payment reminder types
export interface SendPaymentReminderRequest {
	tenant_id: string
	lease_id?: string
	payment_id?: string
}

export interface SendPaymentReminderResponse {
	success: boolean
	message: string
	reminder_sent_at: string
}

// Request/Response aliases for consistency
export type CreateSubscriptionRequest = CreateRentSubscriptionRequest
export type CreateTenantRequest = TenantCreate
export type UpdateTenantRequest = TenantUpdate
export type CreateUnitRequest = CreateUnitInput
export type UpdateUnitRequest = UpdateUnitInput
export type CreatePropertyRequest = CreatePropertyInput
export type UpdatePropertyRequest = UpdatePropertyInput
export type CreateMaintenanceRequest = CreateMaintenanceRequestInput
export type UpdateMaintenanceRequest = UpdateMaintenanceRequestInput

// Bulk Import types (merged from bulk-import.ts)
export type ImportStep = 'upload' | 'validate' | 'confirm'

export interface BulkImportResult {
	success: boolean
	imported: number
	failed: number
	errors: Array<{ row: number; error: string }>
}

export interface ParsedRow {
	row: number
	data: Record<string, string>
	errors: string[]
}

export interface BulkImportStepperProps {
	currentStep: ImportStep
	onStepChange: (step: ImportStep) => void
	modalId: string
}

// Constants
export const DEFAULT_RETRY_ATTEMPTS = 3
