import { getStatusConfig } from "#components/leases/detail/lease-detail-utils";
import { formatLocalYmd } from "#lib/formatters/date";
import { type CsvCell, csvNumber, toCsv } from "#lib/reports/csv";
import type { LeaseDisplay } from "./lease-utils";

/**
 * Leases as CSV: one row per lease, in table order, with the fields the leases
 * table shows (tenant, property, unit, status as its badge reads, start and
 * end dates) and the monthly rent in dollars with 2 decimals and no symbol.
 */
export const LEASES_CSV_HEADER = [
	"Tenant",
	"Property",
	"Unit",
	"Status",
	"Start Date",
	"End Date",
	"Monthly Rent (USD)",
] as const;

export function buildLeasesCsv(leases: readonly LeaseDisplay[]): string {
	const rows: CsvCell[][] = leases.map((l) => [
		l.tenantName,
		l.propertyName,
		l.unitNumber,
		getStatusConfig(l.status).label,
		l.startDate,
		l.endDate,
		csvNumber(l.rentAmount, 2),
	]);
	return toCsv(LEASES_CSV_HEADER, rows);
}

/** `tenantflow-leases-<export date>.csv`, the export date in local time. */
export function leasesCsvFilename(exportedAt: Date): string {
	return `tenantflow-leases-${formatLocalYmd(exportedAt)}.csv`;
}
