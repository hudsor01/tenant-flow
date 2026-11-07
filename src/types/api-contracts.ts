/**
 * API contract types: the request and response shapes the data layer and its
 * callers share (profile, tenant filters, billing, pagination, bulk import).
 *
 * Row types come from supabase.ts (generated) and core.ts; Insert/Update
 * shapes from supabase.ts (`TablesInsert`/`TablesUpdate`) or the Zod payload
 * types in `src/lib/validation/` (CLAUDE.md, Type Lookup Order). Every export
 * here has an importer (`__tests__/api-contracts-exports-imported.test.ts`).
 */

import type { PropertyCreate } from "#lib/validation/properties";

interface UserProfileOwnerData {
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
 * Response from avatar upload endpoint
 */
export interface AvatarUploadResponse {
	avatar_url: string;
}

// Tenant-related API contracts
export interface TenantFilters {
	search?: string;
	limit?: number;
	offset?: number;
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
 * An owner's subscription state, from the `users.subscription_*` columns the
 * Stripe webhooks write (`get_subscription_status`); the app never calls the
 * Stripe API.
 */
export interface SubscriptionStatusResponse {
	// The real writer set: Stripe webhooks write Stripe's own spellings
	// (`canceled`, etc.); `expire_trials()` writes `expired`. Nothing writes
	// the British `cancelled` — it was removed (BILL-18). Keep in sync with
	// `mapSubscriptionStatus` in subscription-keys.ts.
	subscriptionStatus:
		| "active"
		| "trialing"
		| "canceled"
		| "past_due"
		| "unpaid"
		| "incomplete"
		| "incomplete_expired"
		| "paused"
		| "expired"
		| null;
	stripeCustomerId: string | null;
	stripePriceId: string | null;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	trialEndsAt: string | null;
}

export interface OwnerPaymentSummaryResponse {
	lateFeeTotal: number;
	unpaidTotal: number;
	unpaidCount: number;
	tenantCount: number;
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
