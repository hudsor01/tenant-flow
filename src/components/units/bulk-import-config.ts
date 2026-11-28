/**
 * Unit bulk-import configuration (v2.3 Phase 58).
 *
 * Thin wrapper over the generic `BulkImportConfig<T>` from
 * `src/components/bulk-import/types.ts`. Takes `propertyId` from the
 * caller because unit CSVs do not include it — it's derived from the
 * route that hosts the dialog.
 *
 * Duplicate checks before anything is inserted: two rows with the same
 * `unit_number` in one CSV, and a row whose `unit_number` the property
 * already has (`resolveRows`). The database does not enforce either (there
 * is no unique index on a property's unit numbers), so these checks are
 * what keeps an import from creating a second "101".
 */

import { parseCsvWithSchema } from "#components/bulk-import/parse-csv-with-schema";
import type {
	BulkImportConfig,
	BulkImportParseResult,
} from "#components/bulk-import/types";
import { ownerDashboardKeys } from "#hooks/api/query-keys/owner-dashboard-keys";
import { unitQueries } from "#hooks/api/query-keys/unit-keys";
import { omitUndefined } from "#lib/db-insert";
import { requireOwnerUserId } from "#lib/require-owner-user-id";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { UnitInput } from "#lib/validation/units";
import { unitInputSchema, unitStatusSchema } from "#lib/validation/units";
import type { ParsedRow } from "#types/api-contracts";

const TEMPLATE_HEADERS = [
	"unit_number",
	"bedrooms",
	"bathrooms",
	"square_feet",
	"rent_amount",
	"status",
] as const;

const TEMPLATE_SAMPLE_ROWS = [
	["101", "2", "1", "850", "1800", "available"],
	["102", "3", "2", "1100", "2400", "available"],
] as const;

// Bulk-import schema tightens the shared `unitInputSchema`'s
// `status: z.string().default('available')` down to the real enum so an
// invalid CSV status FAILS the row instead of being silently coerced to a
// default. A blank cell still falls back via `.default('available')`.
const unitImportSchema = unitInputSchema.extend({
	status: unitStatusSchema.default("available"),
});

function coerceOptionalNumber(value: string | undefined): number | undefined {
	if (value === undefined) return undefined;
	const trimmed = value.trim();
	if (trimmed === "") return undefined;
	const parsed = Number(trimmed);
	return Number.isNaN(parsed) ? undefined : parsed;
}

const unitNumberKey = (value: string | null | undefined) =>
	(value ?? "").trim().toLowerCase();

/**
 * The property's unit numbers, normalized for comparison. Deleted units
 * (`status = 'inactive'`) do not count. Paged in 1000-row chunks, because
 * PostgREST truncates a single read at `max_rows = 1000`.
 */
async function loadUnitNumbers(propertyId: string): Promise<Set<string>> {
	const supabase = createClient();
	const PAGE_SIZE = 1000;
	const numbers = new Set<string>();
	let from = 0;
	while (true) {
		const { data, error } = await supabase
			.from("units")
			.select("id, unit_number")
			.eq("property_id", propertyId)
			.neq("status", "inactive")
			.order("id", { ascending: true })
			.range(from, from + PAGE_SIZE - 1);
		if (error) throw error;
		const rows = data ?? [];
		for (const unit of rows) numbers.add(unitNumberKey(unit.unit_number));
		if (rows.length < PAGE_SIZE) break;
		from += PAGE_SIZE;
	}
	return numbers;
}

/** Holds back each row whose unit_number the property already has. */
function flagExistingUnitNumbers(
	result: BulkImportParseResult<UnitInput>,
	existing: Set<string>,
): BulkImportParseResult<UnitInput> {
	return {
		...result,
		rows: result.rows.map((row) => {
			if (row.parsed === null) return row;
			if (!existing.has(unitNumberKey(row.parsed.unit_number))) return row;
			return {
				...row,
				parsed: null,
				errors: [
					...row.errors,
					{
						field: "unit_number",
						message: `This property already has a unit "${row.parsed.unit_number}".`,
					},
				],
			};
		}),
	};
}

export function unitBulkImportConfig(
	propertyId: string,
): BulkImportConfig<UnitInput> {
	return {
		entityLabel: { singular: "Unit", plural: "Units" },
		templateFilename: "unit-import-template.csv",
		templateHeaders: TEMPLATE_HEADERS,
		templateSampleRows: TEMPLATE_SAMPLE_ROWS,
		requiredFields: "unit_number, rent_amount",
		optionalFields:
			"bedrooms, bathrooms, square_feet, status (defaults to available)",
		parseAndValidate: (csvText) => {
			const result: BulkImportParseResult<UnitInput> = parseCsvWithSchema(
				csvText,
				{
					schema: unitImportSchema,
					mapRow: (raw) => {
						// Pass a non-blank status THROUGH to the schema (an unknown
						// value then fails the row); a blank cell is omitted so the
						// schema's `.default('available')` supplies the fallback.
						const rawStatus = (raw.status ?? "").trim().toLowerCase();
						const bedrooms = coerceOptionalNumber(raw.bedrooms);
						const bathrooms = coerceOptionalNumber(raw.bathrooms);
						const square_feet = coerceOptionalNumber(raw.square_feet);
						// Blank rent_amount must fail validation instead of silently
						// becoming $0 (Number('') === 0 and the schema's
						// nonNegativeNumberSchema accepts 0). Pass undefined so the
						// schema's required-field check surfaces a clear row error.
						const rent_amount = coerceOptionalNumber(raw.rent_amount);
						return {
							property_id: propertyId,
							unit_number: (raw.unit_number ?? "").trim(),
							...(bedrooms !== undefined ? { bedrooms } : {}),
							...(bathrooms !== undefined ? { bathrooms } : {}),
							...(square_feet !== undefined ? { square_feet } : {}),
							...(rent_amount !== undefined ? { rent_amount } : {}),
							...(rawStatus ? { status: rawStatus } : {}),
						};
					},
				},
			);

			// Duplicate-within-CSV check: "rows 3 and 7 have the same
			// unit_number" is caught here, before any row is inserted.
			const seen = new Map<string, number>();
			const rowsWithDedup: ParsedRow<UnitInput>[] = result.rows.map((row) => {
				if (row.parsed === null) return row;
				const key = row.parsed.unit_number.toLowerCase();
				const firstSeen = seen.get(key);
				if (firstSeen !== undefined) {
					return {
						...row,
						parsed: null,
						errors: [
							...row.errors,
							{
								field: "unit_number",
								message: `Duplicate unit_number "${row.parsed.unit_number}" (also on row ${firstSeen}).`,
							},
						],
					};
				}
				seen.set(key, row.row);
				return row;
			});

			return { ...result, rows: rowsWithDedup };
		},
		resolveRows: async (result) =>
			flagExistingUnitNumbers(result, await loadUnitNumbers(propertyId)),
		insertRow: async (row) => {
			const supabase = createClient();
			const user = await getCachedUser();
			const ownerId = requireOwnerUserId(user?.id);
			const { error } = await supabase
				.from("units")
				.insert(omitUndefined({ ...row, owner_user_id: ownerId }));
			return { error };
		},
		invalidateKeys: [unitQueries.all(), ownerDashboardKeys.all],
	};
}
