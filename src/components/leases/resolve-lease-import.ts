/**
 * Matching a lease import's rows to the owner's records (2026-11-26): a row
 * names its property, unit and tenant; this finds their ids. Pure, so the
 * rules are tested without a database; `leaseBulkImportConfig` loads the
 * records and calls it from `resolveRows`.
 */

import type { BulkImportParseResult } from "#components/bulk-import/types";
import { formatCount } from "#lib/formatters/count";
import type { LeaseImportRow } from "./bulk-import-config";

/** The owner's records a row is matched against. */
export interface LeaseImportLookup {
	properties: { id: string; name: string }[];
	units: { id: string; unit_number: string | null; property_id: string }[];
	tenants: { id: string; email: string | null }[];
}

const key = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();

/**
 * Matches each valid row's property name, unit number and tenant email
 * (case and surrounding spaces ignored) to ids. A row that matches nothing,
 * or more than one record, gets an error on that column and no ids.
 */
export function resolveLeaseRows(
	result: BulkImportParseResult<LeaseImportRow>,
	lookup: LeaseImportLookup,
): BulkImportParseResult<LeaseImportRow> {
	const rows = result.rows.map((row) => {
		const parsed = row.parsed;
		if (!parsed) return row;
		const errors: { field: string; message: string }[] = [];

		const properties = lookup.properties.filter(
			(p) => key(p.name) === key(parsed.property),
		);
		let unitId: string | undefined;
		if (properties.length === 0) {
			errors.push({
				field: "property",
				message: `No property named "${parsed.property}"`,
			});
		} else if (properties.length > 1) {
			errors.push({
				field: "property",
				message: `${formatCount(properties.length, "property", "properties")} are named "${parsed.property}": rename one so each name is unique`,
			});
		} else {
			const propertyId = properties[0]?.id;
			const propertyUnits = lookup.units.filter(
				(u) => u.property_id === propertyId,
			);
			if (parsed.unit === "") {
				if (propertyUnits.length === 1) unitId = propertyUnits[0]?.id;
				else
					errors.push({
						field: "unit",
						message:
							propertyUnits.length === 0
								? `"${parsed.property}" has no units yet: add one on its page first`
								: `"${parsed.property}" has ${formatCount(propertyUnits.length, "unit")}: name the unit`,
					});
			} else {
				const units = propertyUnits.filter(
					(u) => key(u.unit_number) === key(parsed.unit),
				);
				if (units.length === 1) unitId = units[0]?.id;
				else
					errors.push({
						field: "unit",
						message:
							units.length === 0
								? `"${parsed.property}" has no unit "${parsed.unit}"`
								: `"${parsed.property}" has ${formatCount(units.length, "unit")} numbered "${parsed.unit}"`,
					});
			}
		}

		const tenants = lookup.tenants.filter(
			(t) => key(t.email) === key(parsed.tenant_email),
		);
		if (tenants.length !== 1) {
			errors.push({
				field: "tenant_email",
				message:
					tenants.length === 0
						? `No tenant with the email ${parsed.tenant_email}: add the tenant first`
						: `${formatCount(tenants.length, "tenant")} have the email ${parsed.tenant_email}`,
			});
		}

		if (errors.length > 0) return { ...row, errors, parsed: null };
		return {
			...row,
			parsed: {
				...parsed,
				unit_id: unitId,
				primary_tenant_id: tenants[0]?.id,
			},
		};
	});
	return { ...result, rows };
}
