import { LEASE_STATUS_LABELS } from "#lib/constants/status-types";
import { formatLocalYmd } from "#lib/formatters/date";
import { type CsvCell, toCsv } from "#lib/reports/csv";
import type { TenantItem } from "#types/sections/tenants";

/**
 * Tenant records as CSV: one row per tenant, in list order, with the fields
 * the tenant table shows (name, email, phone, property and unit, lease status
 * as its badge reads). Empty fields are empty cells.
 */
export const TENANTS_CSV_HEADER = [
	"Name",
	"Email",
	"Phone",
	"Property",
	"Unit",
	"Lease Status",
] as const;

export function buildTenantsCsv(tenants: readonly TenantItem[]): string {
	const rows: CsvCell[][] = tenants.map((t) => [
		t.fullName,
		t.email,
		t.phone ?? "",
		t.currentProperty ?? "",
		t.currentUnit ?? "",
		t.leaseStatus ? LEASE_STATUS_LABELS[t.leaseStatus] : "",
	]);
	return toCsv(TENANTS_CSV_HEADER, rows);
}

/** `tenantflow-tenants-<export date>.csv`, the export date in local time. */
export function tenantsCsvFilename(exportedAt: Date): string {
	return `tenantflow-tenants-${formatLocalYmd(exportedAt)}.csv`;
}
