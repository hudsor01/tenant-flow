/**
 * Drift guard (66.2-39 fix round 1, part P): a lease status and a property type
 * reach the owner under one label, the one in #lib/constants/status-types.
 *
 * The same lease read "Pending Signature" on the leases page, its CSV and its
 * detail, and "Pending" on the tenants page, its CSV, the tenant sheet, the
 * tenant filter, the lease form's status select and both stat tiles; the
 * onboarding step offered MULTI_UNIT as "Multi Unit" where the property form,
 * the list and the property page say "Multi Family"; and the leases page's
 * pseudo-status read "Expiring" in its badge and "Expiring Soon" in its filter
 * and tile. Each place now reads LEASE_STATUS_LABELS, EXPIRING_LEASE_LABEL or
 * PROPERTY_TYPE_OPTIONS.
 *
 * What fails here, read from the source text of every non-test .ts/.tsx file
 * under src/ and supabase/functions/ (status-types.ts itself aside):
 *  - a `pending_signature` value paired with a written label: a map entry
 *    (`pending_signature: "Pending"`), an option object (`{ value:
 *    "pending_signature", label: "Pending" }`) or an `<option>` with text;
 *  - the "Multi Unit" label, in any case or with a hyphen;
 *  - the pseudo-status `expiring` paired with a written label on the leases
 *    page's surfaces (src/components/leases, src/app/(owner)/leases).
 * Wholly comment lines are skipped. Failures list `file:line → snippet`.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { mapMaintenanceCosts } from "#hooks/api/query-keys/analytics-mappers";
import {
	EXPIRING_LEASE_LABEL,
	LEASE_STATUS_LABELS,
	leaseStatusLabel,
	PROPERTY_STATUS_LABELS,
	PROPERTY_TYPE_LABELS,
	propertyStatusLabel,
} from "#lib/constants/status-types";
import { escapeRegExp } from "#test/utils/regexp-source";
import {
	expenseVendorLabel,
	NO_VENDOR_LABEL,
} from "../../../supabase/functions/_shared/tax-year-reports";

const ROOT = process.cwd();
const LABELS_FILE = "src/lib/constants/status-types.ts";

function isTestFile(relPath: string): boolean {
	return (
		/\.(test|spec)\.tsx?$/.test(relPath) ||
		/\/__tests__\//.test(relPath) ||
		relPath.startsWith("supabase/functions/tests/")
	);
}

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...collect(abs));
		else if (/\.tsx?$/.test(entry.name)) out.push(relative(ROOT, abs));
	}
	return out;
}

const SOURCES = ["src", "supabase/functions"]
	.flatMap((root) => collect(join(ROOT, root)))
	.filter((f) => !isTestFile(f) && f !== LABELS_FILE && !f.endsWith(".d.ts"));

const LEASE_SURFACES = SOURCES.filter(
	(f) =>
		f.startsWith("src/components/leases/") ||
		f.startsWith("src/app/(owner)/leases/"),
);

function hits(files: readonly string[], pattern: RegExp): string[] {
	const out: string[] = [];
	for (const file of files) {
		readFileSync(join(ROOT, file), "utf8")
			.split("\n")
			.forEach((text, i) => {
				const trimmed = text.trim();
				if (/^(\/\/|\*|\/\*)/.test(trimmed)) return;
				if (pattern.test(text)) out.push(`${file}:${i + 1} → ${trimmed}`);
			});
	}
	return out;
}

/** A value paired with a written, capitalized label. */
function pairedWithWrittenLabel(value: string): RegExp {
	const v = escapeRegExp(value);
	return new RegExp(
		[
			// a map entry: pending_signature: "Pending"
			String.raw`["']?\b${v}\b["']?\s*:\s*["'][A-Z][^"']*["']`,
			// an option object: { value: "pending_signature", label: "Pending" }
			String.raw`value:\s*["']${v}["']\s*,\s*label:\s*["']`,
			// an option element with text: <option value="pending_signature">Pending
			String.raw`value=["']${v}["']\s*>\s*[A-Za-z]`,
		].join("|"),
	);
}

const PENDING_LABEL_WRITTEN = pairedWithWrittenLabel("pending_signature");
const EXPIRING_LABEL_WRITTEN = pairedWithWrittenLabel("expiring");
const MULTI_UNIT_LABEL = /Multi[ -]Unit/i;

describe("one label per lease status and property type", () => {
	it("scans the sources (the sweep is not vacuous)", () => {
		expect(SOURCES.length).toBeGreaterThan(900);
		expect(SOURCES).toContain(
			"src/components/tenants/tenant-table-helpers.tsx",
		);
		expect(SOURCES).toContain(
			"supabase/functions/_shared/financial-analytics-report.ts",
		);
		expect(LEASE_SURFACES).toContain(
			"src/components/leases/table/leases-table-toolbar.tsx",
		);
	});

	it("labels each value once", () => {
		expect(LEASE_STATUS_LABELS.pending_signature).toBe("Pending Signature");
		expect(EXPIRING_LEASE_LABEL).toBe("Expiring Soon");
		expect(PROPERTY_TYPE_LABELS.MULTI_UNIT).toBe("Multi Family");
		expect(leaseStatusLabel("pending_signature")).toBe("Pending Signature");
		expect(leaseStatusLabel("inactive")).toBe("inactive");
		expect(PROPERTY_STATUS_LABELS).toEqual({
			active: "Active",
			inactive: "Inactive",
			sold: "Sold",
		});
		expect(propertyStatusLabel("sold")).toBe("Sold");
		expect(propertyStatusLabel("archived")).toBe("archived");
	});

	it("writes no other label for pending_signature", () => {
		expect(hits(SOURCES, PENDING_LABEL_WRITTEN)).toEqual([]);
	});

	it("writes no other label for the expiring pseudo-status on the leases surfaces", () => {
		expect(hits(LEASE_SURFACES, EXPIRING_LABEL_WRITTEN)).toEqual([]);
	});

	it('writes no "Multi Unit" label', () => {
		expect(hits(SOURCES, MULTI_UNIT_LABEL)).toEqual([]);
	});

	it("catches the shapes it names (positive controls)", () => {
		expect(PENDING_LABEL_WRITTEN.test('\tpending_signature: "Pending",')).toBe(
			true,
		);
		expect(
			PENDING_LABEL_WRITTEN.test(
				'\t{ value: "pending_signature", label: "Pending" },',
			),
		).toBe(true);
		expect(
			PENDING_LABEL_WRITTEN.test(
				'<option value="pending_signature">Pending</option>',
			),
		).toBe(true);
		expect(
			PENDING_LABEL_WRITTEN.test('\tpending_signature: "status-pending",'),
		).toBe(false);
		expect(
			PENDING_LABEL_WRITTEN.test(
				"\tpending_signature: LEASE_STATUS_LABELS.pending_signature,",
			),
		).toBe(false);
		expect(EXPIRING_LABEL_WRITTEN.test('\t\t\tlabel: "Expiring",')).toBe(false);
		expect(
			EXPIRING_LABEL_WRITTEN.test(
				'<option value="expiring">Expiring Soon</option>',
			),
		).toBe(true);
		expect(
			MULTI_UNIT_LABEL.test('{ value: "MULTI_UNIT", label: "Multi Unit" }'),
		).toBe(true);
		expect(MULTI_UNIT_LABEL.test("MULTI_UNIT")).toBe(false);
	});
});

/**
 * An expense with no vendor recorded (get_expense_summary's NULL category and
 * get_maintenance_analytics' NULL vendor_name, 20261102184502 and
 * 20261102184503) has one name, NO_VENDOR_LABEL, written once (in
 * supabase/functions/_shared/tax-year-reports.ts, which the client mappers and
 * the Edge exports read), and is never shown as "Other", a vendor's name.
 */
const VENDOR_LABEL_FILE = "supabase/functions/_shared/tax-year-reports.ts";

describe("one name for the expenses with no vendor", () => {
	it("names no vendor once, and every vendor as entered", () => {
		expect(NO_VENDOR_LABEL).toBe("No vendor recorded");
		for (const none of [null, undefined, "", "   ", 0]) {
			expect(expenseVendorLabel(none)).toBe(NO_VENDOR_LABEL);
		}
		expect(expenseVendorLabel("Other")).toBe("Other");
		expect(expenseVendorLabel("acme plumbing")).toBe("acme plumbing");
	});

	it("names the maintenance analytics' vendor with none so", () => {
		const costs = mapMaintenanceCosts({
			costed_requests: 2,
			total_cost: 130,
			vendor_performance: [
				{ vendor_name: "Other", total_spend: 100, jobs: 1 },
				{ vendor_name: null, total_spend: 30, jobs: 1 },
			],
		});
		expect(costs?.vendors.map((v) => v.vendorName)).toEqual([
			"Other",
			"No vendor recorded",
		]);
	});

	it("writes the label nowhere else", () => {
		const written = hits(
			SOURCES.filter((f) => f !== VENDOR_LABEL_FILE),
			/No vendor recorded/i,
		);
		expect(written).toEqual([]);
		expect(SOURCES).toContain(VENDOR_LABEL_FILE);
	});
});
