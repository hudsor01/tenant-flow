/**
 * Vendor Row Mapper: the typed PostgREST boundary for `vendors` rows (CLAUDE.md
 * "RPC / PostgREST return typing"; mirrors `mapMaintenanceRow`).
 *
 * NOT-NULL columns throw when absent, so a dropped `.select(...)` column
 * surfaces at the boundary. `trade` and `status` are validated against the
 * table's CHECK constraints (vendors_trade_check, vendors_status_check), so a
 * value outside them fails loudly instead of reaching a label lookup.
 */

import { z } from "zod";
import { DiagnosticError } from "#lib/diagnostic-error";
import type { Vendor, VendorStatus, VendorTrade } from "#types/domain";

const vendorTradeSchema: z.ZodType<VendorTrade> = z.enum([
	"plumbing",
	"electrical",
	"hvac",
	"carpentry",
	"painting",
	"landscaping",
	"appliance",
	"general",
	"other",
]);

const vendorStatusSchema: z.ZodType<VendorStatus> = z.enum([
	"active",
	"inactive",
]);

function requireString(row: Record<string, unknown>, field: string): string {
	const value = row[field];
	if (typeof value !== "string") {
		throw new DiagnosticError(
			`mapVendorRow: NOT NULL field '${field}' missing or non-string from PostgREST response`,
		);
	}
	return value;
}

function nullableString(
	row: Record<string, unknown>,
	field: string,
): string | null {
	const value = row[field];
	if (value === null || value === undefined) return null;
	if (typeof value !== "string") {
		throw new DiagnosticError(
			`mapVendorRow: '${field}' is not a string in the PostgREST response`,
		);
	}
	return value;
}

function nullableNumber(
	row: Record<string, unknown>,
	field: string,
): number | null {
	const value = row[field];
	if (value === null || value === undefined) return null;
	if (typeof value !== "number") {
		throw new DiagnosticError(
			`mapVendorRow: '${field}' is not a number in the PostgREST response`,
		);
	}
	return value;
}

function requireEnum<T>(
	schema: z.ZodType<T>,
	value: unknown,
	field: string,
): T {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		throw new DiagnosticError(
			`mapVendorRow: invalid ${field} '${String(value)}' from PostgREST response`,
		);
	}
	return parsed.data;
}

/** Map a `vendors` PostgREST row to the strictly-typed `Vendor`. */
export function mapVendorRow(raw: unknown): Vendor {
	const row =
		typeof raw === "object" && raw !== null && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: {};
	return {
		id: requireString(row, "id"),
		owner_user_id: requireString(row, "owner_user_id"),
		name: requireString(row, "name"),
		email: nullableString(row, "email"),
		phone: nullableString(row, "phone"),
		trade: requireEnum(vendorTradeSchema, row.trade, "trade"),
		hourly_rate: nullableNumber(row, "hourly_rate"),
		status: requireEnum(vendorStatusSchema, row.status, "status"),
		notes: nullableString(row, "notes"),
		created_at: requireString(row, "created_at"),
		updated_at: requireString(row, "updated_at"),
	};
}
