/**
 * Lease bulk-import configuration (v2.3 Phase 58; names, not ids, since
 * 2026-11-26).
 *
 * A row names its lease the way a landlord knows it: the property's name,
 * the unit's number and the tenant's email. The app shows no internal ids,
 * so the old unit_id / primary_tenant_id columns could not be filled in.
 * `resolveRows` loads the owner's properties, units and tenants once and
 * matches each row to ids before the preview, so a name that matches
 * nothing (or more than one record) is a row error there, and nothing
 * imports until every row matches.
 *
 * Each row then goes through the `bulk_import_create_lease` SECURITY
 * DEFINER RPC, which inserts the lease and its lease_tenants row
 * atomically and enforces ownership, the overlap check and input ranges.
 */

import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import { parseCsvWithSchema } from "#components/bulk-import/parse-csv-with-schema";
import type { BulkImportConfig } from "#components/bulk-import/types";
import { leaseQueries } from "#hooks/api/query-keys/lease-keys";
import { ownerDashboardKeys } from "#hooks/api/query-keys/owner-dashboard-keys";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import { parseLocalYmd } from "#lib/formatters/date";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import { emailSchema } from "#lib/validation/common";
import { leaseInputSchema } from "#lib/validation/leases";
import {
	type LeaseImportLookup,
	resolveLeaseRows,
} from "./resolve-lease-import";

const TEMPLATE_HEADERS = [
	"property",
	"unit",
	"tenant_email",
	"start_date",
	"end_date",
	"rent_amount",
	"security_deposit",
	"payment_day",
	"rent_currency",
] as const;

const TEMPLATE_SAMPLE_ROWS = [
	[
		"Maple Street Duplex",
		"A",
		"jordan@example.com",
		"2026-05-01",
		"2027-04-30",
		"1800",
		"1800",
		"1",
		"USD",
	],
	[
		"Oak Avenue House",
		"",
		"sam@example.com",
		"2026-06-01",
		"2027-05-31",
		"2400",
		"2400",
		"5",
		"USD",
	],
] as const;

const ymdDate = (label: string) =>
	z
		.string()
		.min(1, `${label} is required`)
		.refine((value) => parseLocalYmd(value) !== undefined, {
			error: `${label} must be a real date written YYYY-MM-DD`,
		});

// The shared lease schema, with the names a landlord knows in place of the
// two ids, which `resolveRows` fills in. security_deposit stays required
// (no silent $0 for a blank cell), as do rent_amount and payment_day; the
// shared fields keep their whole-dollar and range guards.
const leaseImportSchema = leaseInputSchema
	.omit({ lease_status: true, unit_id: true, primary_tenant_id: true })
	.extend({
		property: z.string().trim().min(1, "Property name is required"),
		unit: z.string().trim(),
		tenant_email: emailSchema,
		start_date: ymdDate("Start date"),
		end_date: ymdDate("End date"),
		unit_id: z.string().optional(),
		primary_tenant_id: z.string().optional(),
	})
	.refine(
		(row) => {
			const start = parseLocalYmd(row.start_date);
			const end = parseLocalYmd(row.end_date);
			return !start || !end || end > start;
		},
		{ error: "End date must be after the start date", path: ["end_date"] },
	);

export type LeaseImportRow = z.infer<typeof leaseImportSchema>;

const PAGE_SIZE = 1000;

/** Every row of a select, a page at a time: PostgREST caps one at 1000. */
async function allRows<T>(
	page: (
		from: number,
		to: number,
	) => PromiseLike<{
		data: T[] | null;
		error: PostgrestError | null;
	}>,
): Promise<T[]> {
	const collected: T[] = [];
	for (let from = 0; ; from += PAGE_SIZE) {
		const { data, error } = await page(from, from + PAGE_SIZE - 1);
		if (error) handlePostgrestError(error, "lease import");
		collected.push(...(data ?? []));
		if ((data ?? []).length < PAGE_SIZE) return collected;
	}
}

/** The owner's properties, units and tenants (RLS scopes each read). */
async function loadLeaseLookup(): Promise<LeaseImportLookup> {
	const supabase = createClient();
	const [properties, units, tenants] = await Promise.all([
		allRows((from, to) =>
			supabase
				.from("properties")
				.select("id, name")
				.neq("status", "inactive")
				.order("id")
				.range(from, to),
		),
		allRows((from, to) =>
			supabase
				.from("units")
				.select("id, unit_number, property_id")
				.neq("status", "inactive")
				.order("id")
				.range(from, to),
		),
		allRows((from, to) =>
			supabase
				.from("tenants")
				.select("id, email")
				.neq("status", "inactive")
				.order("id")
				.range(from, to),
		),
	]);
	return { properties, units, tenants };
}

function coerceOptionalNumber(value: string | undefined): number | undefined {
	if (value === undefined) return undefined;
	const trimmed = value.trim();
	if (trimmed === "") return undefined;
	const parsed = Number(trimmed);
	return Number.isNaN(parsed) ? undefined : parsed;
}

function coerceOptionalCurrency(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const trimmed = value.trim().toUpperCase();
	// A blank cell falls back to the schema's `.default('USD')`.
	return trimmed === "" ? undefined : trimmed;
}

export function leaseBulkImportConfig(): BulkImportConfig<LeaseImportRow> {
	return {
		entityLabel: { singular: "Lease", plural: "Leases" },
		templateFilename: "lease-import-template.csv",
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields:
			"property (its name), tenant_email, start_date and end_date (YYYY-MM-DD), rent_amount, security_deposit, payment_day",
		optionalFields:
			"unit (its number; leave blank when the property has one unit), rent_currency (3-letter code, defaults to USD)",
		parseAndValidate: (csvText) =>
			parseCsvWithSchema(csvText, {
				schema: leaseImportSchema,
				mapRow: (raw) => {
					const rent_amount = coerceOptionalNumber(raw.rent_amount);
					const payment_day = coerceOptionalNumber(raw.payment_day);
					const security_deposit = coerceOptionalNumber(raw.security_deposit);
					const rent_currency = coerceOptionalCurrency(raw.rent_currency);
					return {
						property: raw.property ?? "",
						unit: raw.unit ?? "",
						tenant_email: (raw.tenant_email ?? "").trim(),
						start_date: (raw.start_date ?? "").trim(),
						end_date: (raw.end_date ?? "").trim(),
						...(rent_amount !== undefined ? { rent_amount } : {}),
						...(security_deposit !== undefined ? { security_deposit } : {}),
						...(payment_day !== undefined ? { payment_day } : {}),
						...(rent_currency !== undefined ? { rent_currency } : {}),
					};
				},
			}),
		resolveRows: async (result) =>
			resolveLeaseRows(result, await loadLeaseLookup()),
		insertRow: async (row) => {
			// resolveRows gives every importable row both ids; a row without
			// them never reaches here, but fail it rather than send nulls.
			if (!row.unit_id || !row.primary_tenant_id) {
				return {
					error: new Error("The row was not matched to a unit and tenant"),
				};
			}
			const supabase = createClient();
			const { error } = await supabase.rpc("bulk_import_create_lease", {
				p_unit_id: row.unit_id,
				p_primary_tenant_id: row.primary_tenant_id,
				p_start_date: row.start_date,
				p_end_date: row.end_date,
				p_rent_amount: row.rent_amount,
				p_security_deposit: row.security_deposit,
				p_payment_day: row.payment_day,
				...(row.rent_currency ? { p_rent_currency: row.rent_currency } : {}),
			});
			return { error };
		},
		invalidateKeys: [
			leaseQueries.all(),
			tenantQueries.all(),
			ownerDashboardKeys.all,
		],
	};
}
