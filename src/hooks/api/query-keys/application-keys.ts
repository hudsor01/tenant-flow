/**
 * Rental Application query keys, options, typed boundary mappers and the four
 * owner mutations (Phase 66 — APPLY-01 / APPLY-03 / APPLY-04).
 *
 * NOT A BARREL FILE. Every symbol below is declared here; nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2). This is route-agnostic data
 * access and it is the ONLY module in the phase that talks to PostgREST for
 * `rental_applications`. Plans 66-13/14/15/16 consume it and add no data access
 * of their own.
 *
 * THE CONSTRAINT THAT SHAPES THIS FILE: `rental_applications` ships a SELECT
 * policy and a DELETE policy and NOTHING ELSE — no INSERT policy, no UPDATE
 * policy, for any role (migration 20260806120000). Reads go through PostgREST;
 * every write is one of the plan 66-04 SECURITY DEFINER RPCs, except the delete,
 * which is the single direct-table write `authenticated` holds. A `.update()` or
 * `.insert()` here would typecheck and then fail at runtime with no policy to
 * satisfy, so neither appears in this file and neither should be added.
 *
 * `mapRentalApplicationRow` is the typed PostgREST boundary mapper — the same
 * idiom as `mapDocumentRow` in `document-keys.ts`, which CLAUDE.md names as the
 * reference. Zero double-assertion casts (rule 8) — every field is narrowed off
 * a `Record<string, unknown>`. NOT NULL fields throw rather than silently
 * producing the literal string "undefined"; `numeric` columns are coerced
 * explicitly because PostgREST returns them as strings on some paths.
 */

import {
	mutationOptions,
	type QueryClient,
	queryOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import {
	APPLICATION_STATUSES,
	type ApplicationStatus,
	type DispositionReasonValue,
} from "#lib/applications/application-copy";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import type { Database } from "#types/supabase";
import { mutationKeys } from "../mutation-keys";
import { ownerDashboardKeys } from "./owner-dashboard-keys";
import { tenantQueries } from "./tenant-keys";

type RentalApplicationTableRow =
	Database["public"]["Tables"]["rental_applications"]["Row"];

/**
 * The owner-facing shape of one application. Derived from the generated table
 * Row (CLAUDE.md rule 3: no duplicate types) with two adjustments:
 *
 *  - `status` is narrowed from the generated `string` to the four-value D-07
 *    vocabulary. The column is `text` + CHECK, so the generator cannot know it.
 *  - Five columns are dropped: `certified_at`, `submission_id`, `submitted_ip`,
 *    `submitted_user_agent` and `updated_at`. They are submission-audit
 *    internals that no owner surface renders, and `submitted_ip` /
 *    `submitted_user_agent` are applicant network metadata that has no reason
 *    to reach a browser at all (T-66-34).
 */
export interface RentalApplicationRow
	extends Omit<
		RentalApplicationTableRow,
		| "status"
		| "certified_at"
		| "submission_id"
		| "submitted_ip"
		| "submitted_user_agent"
		| "updated_at"
	> {
	status: ApplicationStatus;
}

/**
 * What the queue actually renders (UI-SPEC §B-3) plus the NOT NULL fields the
 * mapper validates. Eleven columns of forty-one.
 *
 * This is a DISTINCT type from `RentalApplicationRow` on purpose. Typing the
 * list rows as the full row would be a lie: the thirty unselected nullable
 * columns would arrive as `null` and a consumer reading `row.employer_name` off
 * a queue row would silently render "Not provided" for every applicant, with
 * nothing failing. As a `Pick`, the same mistake is a compile error in wave 5.
 */
export type ApplicationSummaryRow = Pick<
	RentalApplicationRow,
	| "id"
	| "owner_user_id"
	| "unit_id"
	| "property_label"
	| "unit_label"
	| "status"
	| "created_at"
	| "applicant_first_name"
	| "applicant_last_name"
	| "applicant_email"
	| "anonymized_at"
>;

/**
 * Enumerated, never `select("*")`. Selecting all forty-one columns would ship
 * every applicant's income, employer, current address, landlord contact and
 * references to the browser on every queue render — a payload cost and a
 * retention surface in the browser cache (T-66-34). `occupant_count` is
 * deliberately absent: household size is familial-status data on a
 * fair-housing-regulated surface and the queue does not render it.
 *
 * Must stay in sync with `ApplicationSummaryRow`; a dropped NOT NULL column
 * throws at the mapper rather than rendering "undefined".
 */
const LIST_SELECT_COLUMNS =
	"id,owner_user_id,unit_id,property_label,unit_label,status,created_at,applicant_first_name,applicant_last_name,applicant_email,anonymized_at";

/** UI-SPEC §B-2: 25 per page. */
export const APPLICATIONS_PAGE_SIZE = 25;

export interface ApplicationListFilters {
	unitId?: string;
	status?: ApplicationStatus;
	/** 0-based. */
	page: number;
}

export interface ApplicationListPage {
	rows: ApplicationSummaryRow[];
	/** From the `{ count: 'exact' }` header, NEVER the loaded slice size. */
	total: number;
}

const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

function requireString(
	raw: Record<string, unknown>,
	field: string,
	mapper: string,
): string {
	const value = raw[field];
	if (typeof value !== "string") {
		throw new Error(
			`${mapper}: NOT NULL field '${field}' missing or non-string from PostgREST response`,
		);
	}
	return value;
}

function nullableString(
	raw: Record<string, unknown>,
	field: string,
): string | null {
	const value = raw[field];
	return typeof value === "string" ? value : null;
}

/**
 * `numeric` and `integer` columns. PostgREST hands `numeric` back as a JSON
 * string on some paths, so a bare `raw.x as number` would produce a string
 * typed as a number and every downstream `toFixed` / comparison would be wrong.
 * A value that is neither throws — a non-numeric value in a numeric column is
 * corruption, not an empty field.
 */
function nullableNumber(
	raw: Record<string, unknown>,
	field: string,
	mapper: string,
): number | null {
	const value = raw[field];
	if (value === null || value === undefined) return null;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	throw new Error(
		`${mapper}: numeric field '${field}' is neither a number nor a numeric string`,
	);
}

function requireNumber(
	raw: Record<string, unknown>,
	field: string,
	mapper: string,
): number {
	const parsed = nullableNumber(raw, field, mapper);
	if (parsed === null) {
		throw new Error(
			`${mapper}: NOT NULL field '${field}' missing from PostgREST response`,
		);
	}
	return parsed;
}

/**
 * Validated, never widened. An unknown value means the CHECK constraint and the
 * `APPLICATION_STATUSES` vocabulary have drifted apart, and a badge map keyed on
 * the drifted value would render blank rather than fail.
 */
function requireApplicationStatus(
	value: unknown,
	mapper: string,
): ApplicationStatus {
	const parsed = applicationStatusSchema.safeParse(value);
	if (!parsed.success) {
		throw new Error(
			`${mapper}: invalid 'status' value '${String(value)}' from PostgREST response`,
		);
	}
	return parsed.data;
}

/** Ownership, placement, decision record and retention state. */
function mapApplicationLifecycle(
	raw: Record<string, unknown>,
	mapper: string,
): Pick<
	RentalApplicationRow,
	| "id"
	| "owner_user_id"
	| "link_id"
	| "unit_id"
	| "property_label"
	| "unit_label"
	| "status"
	| "decided_at"
	| "disposition_reason"
	| "converted_tenant_id"
	| "converted_at"
	| "occupant_count"
	| "anonymized_at"
	| "created_at"
	| "owner_notes"
> {
	return {
		id: requireString(raw, "id", mapper),
		owner_user_id: requireString(raw, "owner_user_id", mapper),
		link_id: nullableString(raw, "link_id"),
		unit_id: nullableString(raw, "unit_id"),
		property_label: requireString(raw, "property_label", mapper),
		unit_label: nullableString(raw, "unit_label"),
		status: requireApplicationStatus(raw.status, mapper),
		decided_at: nullableString(raw, "decided_at"),
		disposition_reason: nullableString(raw, "disposition_reason"),
		converted_tenant_id: nullableString(raw, "converted_tenant_id"),
		converted_at: nullableString(raw, "converted_at"),
		occupant_count: requireNumber(raw, "occupant_count", mapper),
		anonymized_at: nullableString(raw, "anonymized_at"),
		created_at: requireString(raw, "created_at", mapper),
		owner_notes: nullableString(raw, "owner_notes"),
	};
}

/** Everything the applicant typed. Every field the 730-day sweep clears. */
function mapApplicantDetail(
	raw: Record<string, unknown>,
	mapper: string,
): Omit<
	RentalApplicationRow,
	keyof ReturnType<typeof mapApplicationLifecycle>
> {
	return {
		applicant_first_name: requireString(raw, "applicant_first_name", mapper),
		applicant_last_name: requireString(raw, "applicant_last_name", mapper),
		applicant_email: requireString(raw, "applicant_email", mapper),
		applicant_phone: nullableString(raw, "applicant_phone"),
		desired_move_in_date: nullableString(raw, "desired_move_in_date"),
		current_street: nullableString(raw, "current_street"),
		current_city: nullableString(raw, "current_city"),
		current_state: nullableString(raw, "current_state"),
		current_postal_code: nullableString(raw, "current_postal_code"),
		current_landlord_name: nullableString(raw, "current_landlord_name"),
		current_landlord_phone: nullableString(raw, "current_landlord_phone"),
		reason_for_moving: nullableString(raw, "reason_for_moving"),
		gross_monthly_income: nullableNumber(raw, "gross_monthly_income", mapper),
		employer_name: nullableString(raw, "employer_name"),
		employer_role: nullableString(raw, "employer_role"),
		employer_months: nullableNumber(raw, "employer_months", mapper),
		other_income_source: nullableString(raw, "other_income_source"),
		other_income_amount: nullableNumber(raw, "other_income_amount", mapper),
		pet_details: nullableString(raw, "pet_details"),
		vehicle_details: nullableString(raw, "vehicle_details"),
		reference_1_name: nullableString(raw, "reference_1_name"),
		reference_1_relationship: nullableString(raw, "reference_1_relationship"),
		reference_1_phone: nullableString(raw, "reference_1_phone"),
		reference_2_name: nullableString(raw, "reference_2_name"),
		reference_2_relationship: nullableString(raw, "reference_2_relationship"),
		reference_2_phone: nullableString(raw, "reference_2_phone"),
	};
}

/**
 * Detail-view mapper. Split in two only to keep each function under the 50-line
 * cap; the `Pick` / `Omit` pair makes the split exhaustive, so a forgotten field
 * is a compile error rather than an `undefined` on the page.
 */
export function mapRentalApplicationRow(
	raw: Record<string, unknown>,
): RentalApplicationRow {
	const mapper = "mapRentalApplicationRow";
	return {
		...mapApplicationLifecycle(raw, mapper),
		...mapApplicantDetail(raw, mapper),
	};
}

/** Queue mapper over `LIST_SELECT_COLUMNS`. Same guarantees, eleven columns. */
export function mapRentalApplicationSummaryRow(
	raw: Record<string, unknown>,
): ApplicationSummaryRow {
	const mapper = "mapRentalApplicationSummaryRow";
	return {
		id: requireString(raw, "id", mapper),
		owner_user_id: requireString(raw, "owner_user_id", mapper),
		unit_id: nullableString(raw, "unit_id"),
		property_label: requireString(raw, "property_label", mapper),
		unit_label: nullableString(raw, "unit_label"),
		status: requireApplicationStatus(raw.status, mapper),
		created_at: requireString(raw, "created_at", mapper),
		applicant_first_name: requireString(raw, "applicant_first_name", mapper),
		applicant_last_name: requireString(raw, "applicant_last_name", mapper),
		applicant_email: requireString(raw, "applicant_email", mapper),
		anonymized_at: nullableString(raw, "anonymized_at"),
	};
}

/**
 * D-11: the 730-day sweep replaces applicant fields with placeholders and stamps
 * `anonymized_at`. Accepts anything carrying the column so the queue row and the
 * detail row can both ask.
 */
export function isAnonymized(
	row: Pick<RentalApplicationRow, "anonymized_at">,
): boolean {
	return row.anonymized_at !== null;
}

export const applicationKeys = {
	all: ["applications"] as const,
	lists: () => [...applicationKeys.all, "list"] as const,
	list: (filters: ApplicationListFilters) =>
		[
			...applicationKeys.lists(),
			{
				unitId: filters.unitId ?? null,
				status: filters.status ?? null,
				page: filters.page,
			},
		] as const,
	details: () => [...applicationKeys.all, "detail"] as const,
	detail: (id: string) => [...applicationKeys.details(), id] as const,
};

export const applicationQueries = {
	/**
	 * The queue (UI-SPEC §B-2). Bounded by `.range()` at 25 per page; `total`
	 * comes from the `{ count: 'exact' }` header.
	 */
	list: (filters: ApplicationListFilters) =>
		queryOptions({
			queryKey: applicationKeys.list(filters),
			queryFn: async (): Promise<ApplicationListPage> => {
				const supabase = createClient();
				const from = filters.page * APPLICATIONS_PAGE_SIZE;

				let query = supabase
					.from("rental_applications")
					.select(LIST_SELECT_COLUMNS, { count: "exact" })
					.order("created_at", { ascending: false })
					// Deterministic tiebreaker: a burst of submissions through one
					// listing link can share a created_at, and unordered ties
					// duplicate or vanish across `.range()` pages.
					.order("id", { ascending: false });

				if (filters.unitId) query = query.eq("unit_id", filters.unitId);
				if (filters.status) query = query.eq("status", filters.status);

				const { data, error, count } = await query.range(
					from,
					from + APPLICATIONS_PAGE_SIZE - 1,
				);

				if (error) handlePostgrestError(error, "applications");

				// `total` is the count header, never the loaded slice length. A
				// slice-length total is invisible until page two, where the pager
				// reports "25 of 25" forever and Next never enables.
				return {
					rows: ((data ?? []) as Record<string, unknown>[]).map(
						mapRentalApplicationSummaryRow,
					),
					total: count ?? 0,
				};
			},
		}),

	/**
	 * The detail view (UI-SPEC §B-5), which genuinely renders every field, so
	 * `select("*")` is correct here and only here. `.limit(1)` + `[0]` rather
	 * than `.single()`: a deleted or non-owned id is a null result the page can
	 * render as "not found", not a thrown PGRST116.
	 */
	detail: (id: string) =>
		queryOptions({
			queryKey: applicationKeys.detail(id),
			queryFn: async (): Promise<RentalApplicationRow | null> => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("rental_applications")
					.select("*")
					.eq("id", id)
					.limit(1);

				if (error) handlePostgrestError(error, "applications");

				const row = (data ?? [])[0];
				return row ? mapRentalApplicationRow(row) : null;
			},
			enabled: !!id,
		}),
};

export interface SetApplicationStatusInput {
	applicationId: string;
	status: ApplicationStatus;
	/** Required by UI-SPEC §B-7 when declining; closed vocabulary (D-11d). */
	dispositionReason?: DispositionReasonValue;
}

export interface RecordApplicationConversionInput {
	applicationId: string;
	tenantId: string;
}

export interface ApplicationConversionResult {
	success: boolean;
	/** `"already_converted"` on a benign repeat; null on success. */
	reason: string | null;
}

/**
 * `set_application_status` (plan 66-04). There is no `.update()` fallback —
 * the table has no UPDATE policy for any role.
 */
export function setApplicationStatusMutationOptions(queryClient: QueryClient) {
	return mutationOptions<void, Error, SetApplicationStatusInput>({
		mutationKey: mutationKeys.applications.setStatus,
		mutationFn: async ({ applicationId, status, dispositionReason }) => {
			const supabase = createClient();
			// The key is omitted rather than sent as undefined: the RPC arg is
			// optional and PostgREST would reject an explicit undefined.
			const args =
				dispositionReason === undefined
					? { p_application_id: applicationId, p_status: status }
					: {
							p_application_id: applicationId,
							p_status: status,
							p_disposition_reason: dispositionReason,
						};
			const { error } = await supabase.rpc("set_application_status", args);
			if (error) handlePostgrestError(error, "applications");
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: applicationKeys.all });
			await queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
		},
	});
}

/** `set_application_notes`. Server normalizes blank/whitespace notes to NULL. */
export function setApplicationNotesMutationOptions(queryClient: QueryClient) {
	return mutationOptions<void, Error, { applicationId: string; notes: string }>(
		{
			mutationKey: mutationKeys.applications.setNotes,
			mutationFn: async ({ applicationId, notes }) => {
				const supabase = createClient();
				const { error } = await supabase.rpc("set_application_notes", {
					p_application_id: applicationId,
					p_notes: notes,
				});
				if (error) handlePostgrestError(error, "applications");
			},
			onSuccess: async () => {
				await queryClient.invalidateQueries({ queryKey: applicationKeys.all });
				await queryClient.invalidateQueries({
					queryKey: ownerDashboardKeys.all,
				});
			},
		},
	);
}

/**
 * `record_application_conversion` (APPLY-04). Called after the tenant form
 * saves; never creates a tenant itself.
 *
 * A REPEAT IS NOT AN ERROR. The RPC returns `(false, 'already_converted')`
 * instead of raising, because a second call is a double-click or a retried
 * navigation and the UI has already relabelled its control to "View tenant".
 * This mutation surfaces that as a resolved result, so the caller can branch on
 * `success` — throwing here would put an error toast on a benign action.
 */
export function recordApplicationConversionMutationOptions(
	queryClient: QueryClient,
) {
	return mutationOptions<
		ApplicationConversionResult,
		Error,
		RecordApplicationConversionInput
	>({
		mutationKey: mutationKeys.applications.recordConversion,
		mutationFn: async ({ applicationId, tenantId }) => {
			const supabase = createClient();
			const { data, error } = await supabase.rpc(
				"record_application_conversion",
				{ p_application_id: applicationId, p_tenant_id: tenantId },
			);
			if (error) handlePostgrestError(error, "applications");

			const row = (data ?? [])[0];
			if (!row) {
				throw new Error(
					"record_application_conversion returned no row from PostgREST response",
				);
			}
			// The generator strips `| null` from RETURNS TABLE columns, so `reason`
			// is typed `string` while the success branch returns NULL. Same reason
			// mapDocumentRow exists.
			return { success: row.success, reason: row.reason ?? null };
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: applicationKeys.all });
			await queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
			// The one mutation that creates a link between the two records, so the
			// tenant surfaces have to refetch too.
			await queryClient.invalidateQueries({ queryKey: tenantQueries.all() });
		},
	});
}

/**
 * The ONE owner write that is not an RPC (UI-SPEC §B-7, UI-17): the
 * `rental_applications_delete` policy is the only direct-table write
 * `authenticated` holds. `.select("id")` so an RLS-blocked row comes back as
 * zero rows — PostgREST reports no error for that — and surfaces as a failure
 * instead of a silent success.
 */
export function deleteApplicationMutationOptions(queryClient: QueryClient) {
	return mutationOptions<void, Error, string>({
		mutationKey: mutationKeys.applications.delete,
		mutationFn: async (applicationId) => {
			const supabase = createClient();
			const { data, error } = await supabase
				.from("rental_applications")
				.delete()
				.eq("id", applicationId)
				.select("id");
			if (error) handlePostgrestError(error, "applications");
			if (!data?.[0]) {
				throw new Error(
					"Application not found or you do not have permission to delete it.",
				);
			}
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: applicationKeys.all });
			await queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
		},
	});
}
