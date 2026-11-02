/**
 * An owner reads a record by its name, never by its id (66.2-39 fix round 1,
 * part P). The analytics page's active units printed each unit's property_id
 * (a UUID) as its subtitle, and the sweep that found it found the class in
 * three more places: the units page's Property column ("Property ID:
 * 3f2a9c1e..."), the lease page's heading ("Lease #3f2a9c1e") and the billing
 * history's rows (the first 12 characters of a Stripe invoice id, a reference
 * no owner can look up). Each now names the record (the property, the
 * property and unit) or, for the invoice, leads with its date.
 *
 * A guard reads every non-test .tsx under src/app and src/components and fails
 * on an id rendered as text: a JSX child `{x.id}` / `{x.property_id}` /
 * `{x.unitId}` (alone or behind a fallback), or an id cut with .slice /
 * .substring / .substr inside a JSX child. Two references are printed on
 * purpose and named here: the error boundary's Error ID, which the owner quotes
 * to support, and nothing else in the UI (the work order's Request ID is in an
 * HTML document template, a .ts file this does not read).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActiveUnitsTable } from "#app/(owner)/analytics/property-performance/active-units-table";
import type { BillingHistoryItem } from "#types/api-contracts";

// The global nuqs mock leaves the client table's page size unset ("Page 0 of
// Infinity", no rows), so the table here pages nothing: every row renders.
vi.mock("#hooks/use-client-data-table", async () => {
	const { getCoreRowModel, useReactTable } = await import(
		"@tanstack/react-table"
	);
	return {
		useClientDataTable: <TData,>(options: {
			data: TData[];
			columns: ColumnDef<TData>[];
		}) => ({
			table: useReactTable({
				data: options.data,
				columns: options.columns,
				getCoreRowModel: getCoreRowModel(),
			}),
		}),
	};
});

const ROOT = process.cwd();

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...collect(abs));
		else if (entry.name.endsWith(".tsx")) out.push(relative(ROOT, abs));
	}
	return out;
}

const TSX = ["src/app", "src/components"]
	.flatMap((root) => collect(join(ROOT, root)))
	.filter((f) => !/\.(test|spec)\.tsx$/.test(f) && !/\/__tests__\//.test(f));

const ID_FIELD = String.raw`(?:id|[A-Za-z]+_id|[A-Za-z]+Id)`;
const ID_RENDER = new RegExp(
	[
		// a JSX child `{x.property_id}` (not an attribute value `={...}`)
		String.raw`(?:^\s*|[^=$\s]\s*)\{\s*[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*\??\.${ID_FIELD}\s*(?:\}|\|\||\?\?)`,
		// an id cut to a fragment inside a JSX child
		String.raw`(?:^\s*|[^=$\s\x60]\s*)\{\s*[A-Za-z_$][\w$.?]*\.${ID_FIELD}\.(?:slice|substring|substr)\(`,
	].join("|"),
);

/** References printed on purpose: `file → snippet`. */
const PRINTED_ON_PURPOSE = [
	"src/components/error-boundary/error-boundary.tsx → Error ID: {errorState.errorId}",
];

function idRenders(): string[] {
	const out: string[] = [];
	for (const file of TSX) {
		readFileSync(join(ROOT, file), "utf8")
			.split("\n")
			.forEach((text, i) => {
				const trimmed = text.trim();
				if (/^(\/\/|\*|\/\*)/.test(trimmed)) return;
				if (!ID_RENDER.test(text)) return;
				// A form's error message keyed by its field (`{errors.property_id}`)
				// is a message, not an id.
				if (/\{\s*errors\??\.[A-Za-z_]+\s*\}/.test(text)) return;
				const hit = `${file} → ${trimmed}`;
				if (!PRINTED_ON_PURPOSE.includes(hit))
					out.push(`${file}:${i + 1} → ${trimmed}`);
			});
	}
	return out;
}

describe("no id is shown as text", () => {
	it("scans the UI (the sweep is not vacuous)", () => {
		expect(TSX.length).toBeGreaterThan(400);
	});

	it("renders no id as a JSX child, whole or cut", () => {
		expect(idRenders()).toEqual([]);
	});

	it("still finds the reference it allows", () => {
		const boundary = readFileSync(
			join(ROOT, "src/components/error-boundary/error-boundary.tsx"),
			"utf8",
		);
		expect(boundary).toContain("Error ID: {errorState.errorId}");
	});

	it("catches the shapes it names (positive controls)", () => {
		for (const shape of [
			"\t\t\t\t\t\t{row.original.property_id}",
			"Property ID: {row.original.property_id.substring(0, 8)}...",
			'<h2 className="text-lg">Lease #{lease.id.slice(0, 8)}</h2>',
			"{invoice.id.slice(0, 12)}",
			'{unit.unitId ?? "—"}',
		]) {
			expect(ID_RENDER.test(shape), shape).toBe(true);
		}
		for (const shape of [
			"key={invoice.id}",
			"onClick={() => onView(row.original.id)}",
			"href={`/leases/${lease.id}`}",
			"`work-order-${request.id.slice(0, 8)}.pdf`,",
		]) {
			expect(ID_RENDER.test(shape), shape).toBe(false);
		}
	});
});

describe("each record is named instead", () => {
	afterEach(() => {
		cleanup();
		vi.resetModules();
		vi.doUnmock("#hooks/api/use-billing");
		vi.doUnmock("#hooks/api/use-billing-mutations");
	});

	it("subtitles an active unit with its property's name", () => {
		render(
			<ActiveUnitsTable
				units={[
					{
						property_id: "3f2a9c1e-0000-4000-8000-000000000001",
						unit_id: "u1",
						unit_number: "4B",
						status: "occupied",
					},
					{
						property_id: "3f2a9c1e-0000-4000-8000-00000000dead",
						unit_id: "u2",
						unit_number: "5C",
						status: "available",
					},
				]}
				propertyNames={
					new Map([["3f2a9c1e-0000-4000-8000-000000000001", "Maple Court"]])
				}
			/>,
		);
		expect(screen.getByText("Maple Court")).toBeInTheDocument();
		expect(document.body.textContent).not.toMatch(/3f2a9c1e/);
	});

	it("names each unit's property on the units page", async () => {
		const unitsResult = {
			data: {
				data: [
					{
						id: "u1",
						property_id: "3f2a9c1e-0000-4000-8000-000000000001",
						owner_user_id: "owner-1",
						unit_number: "4B",
						bedrooms: 2,
						bathrooms: 1,
						square_feet: 850,
						rent_amount: 1500,
						rent_currency: "USD",
						rent_period: "month",
						status: "occupied",
						created_at: "2026-01-01T00:00:00Z",
						updated_at: "2026-01-01T00:00:00Z",
					},
				],
				total: 1,
			},
			isLoading: false,
			error: null,
		};
		const optionsResult = {
			data: [
				{
					id: "3f2a9c1e-0000-4000-8000-000000000001",
					name: "Maple Court",
					address_line1: "1 Main St",
					city: "Austin",
					state: "TX",
				},
			],
		};
		vi.doMock("@tanstack/react-query", async () => {
			const actual = await vi.importActual<
				typeof import("@tanstack/react-query")
			>("@tanstack/react-query");
			return {
				...actual,
				useQuery: (options: { queryKey: readonly unknown[] }) =>
					options.queryKey.includes("select-options")
						? optionsResult
						: unitsResult,
			};
		});
		vi.doMock("#hooks/api/use-unit", () => ({
			useDeleteUnitMutation: () => ({ mutate: vi.fn(), isPending: false }),
		}));
		const { default: UnitsPage } = await import("#app/(owner)/units/page");
		render(<UnitsPage />);
		expect(screen.getByText("Maple Court")).toBeInTheDocument();
		expect(document.body.textContent).not.toMatch(/3f2a9c1e/);
		vi.doUnmock("@tanstack/react-query");
		vi.doUnmock("#hooks/api/use-unit");
	});

	it("leads a billing history row with its date, never the invoice id", async () => {
		const invoice: BillingHistoryItem = {
			id: "in_1PqRsTuVwXyZ0123456789",
			amount: 4900,
			currency: "usd",
			status: "succeeded",
			created_at: "2026-10-01T00:00:00Z",
			formattedAmount: "$49.00",
			formattedDate: "Oct 1, 2026",
			isSuccessful: true,
			invoice_pdf: null,
			hosted_invoice_url: null,
		};
		vi.doMock("#hooks/api/use-billing", () => ({
			useBillingHistory: () =>
				({ data: [invoice] }) as Pick<
					UseQueryResult<BillingHistoryItem[]>,
					"data"
				>,
		}));
		vi.doMock("#hooks/api/use-billing-mutations", () => ({
			useBillingPortalMutation: () => ({ mutate: vi.fn(), isPending: false }),
		}));
		const { BillingHistorySection } = await import(
			"#components/settings/sections/billing-history-section"
		);
		render(<BillingHistorySection />);
		expect(screen.getByText("Oct 1, 2026")).toBeInTheDocument();
		expect(document.body.textContent).not.toMatch(/in_1Pq/);
	});
});
