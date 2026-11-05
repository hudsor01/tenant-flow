/**
 * An owner reads a record by its name, never by its id (66.2-39 fix round 1,
 * part P). The analytics page's active units printed each unit's property_id
 * (a UUID) as its subtitle, and the sweep that found it found the class in
 * three more places: the units page's Property column ("Property ID:
 * 3f2a9c1e..."), the lease page's heading ("Lease #" and the id's first eight
 * characters) and the billing history's rows (the first 12 characters of a
 * Stripe invoice id, a reference no owner can look up). Each now names the
 * record (the property, the property and unit) or, for the invoice, leads
 * with its date.
 *
 * A guard reads every non-test .tsx under src/app and src/components and fails
 * on an id rendered as text: a JSX child `{x.id}` / `{x.property_id}` /
 * `{x.unitId}` (alone or behind a fallback), or an id cut with .slice /
 * .substring / .substr inside a JSX child. Two references are printed on
 * purpose and named here: the error boundary's Error ID, which the owner quotes
 * to support, and nothing else in the UI (the work order's Request ID is in an
 * HTML document template, a .ts file this does not read).
 *
 * An id can also reach JSX through a name (fix round 3, part 6c): the
 * maintenance board's card took `const unitNumber = request.unit?.name ??
 * request.unit_id ?? ""` and printed "Unit {unitNumber}", so every card showed
 * the unit's id and the guard, reading one JSX child at a time, saw only a
 * name. It now also collects, per file, each name a one-line declaration
 * gives an id (`const x = … ?? r.unit_id`, `const { unit_id } = r`) and fails
 * where JSX renders that name, alone or inside a template. A declaration
 * spread over several lines is outside what it reads.
 *
 * The same sweep found two more gaps. The field pattern took one word before
 * `_id` (so `{lease.primary_tenant_id}` passed), and it knew no foreign key
 * named otherwise: the maintenance detail's contact card printed
 * `{request.requested_by}` and `{request.assigned_to}`, user ids. Every
 * foreign-key column of the generated schema now counts as an id.
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

/**
 * The foreign-key columns of the generated schema whose names do not say
 * "id" (`requested_by`, `assigned_to`, `uploaded_by`, `created_by`): each
 * holds another row's id, so printing one prints an id.
 */
const FOREIGN_KEY_COLUMNS = [
	...new Set(
		[
			...readFileSync(join(ROOT, "src/types/supabase.ts"), "utf8").matchAll(
				/columns: \[([^\]]*)\];/g,
			),
		].flatMap((m) =>
			[...(m[1] ?? "").matchAll(/"([^"]+)"/g)].map((c) => c[1] ?? ""),
		),
	),
]
	.filter((column) => !/^(?:id|[A-Za-z]+(?:_[A-Za-z]+)*_id)$/.test(column))
	.sort();

// `x_id` with any number of words (`primary_tenant_id`, `owner_user_id`),
// `xId`, and the foreign keys named otherwise.
const ID_FIELD = String.raw`(?:id|[A-Za-z]+(?:_[A-Za-z]+)*_id|[A-Za-z]+Id|${FOREIGN_KEY_COLUMNS.join("|")})`;
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

/**
 * An id as a value: the whole initializer, or an operand of `??`, `||` or
 * `?:`, maybe behind `as`. An id passed to a call (`find(…x.id)`,
 * `has(x.id)`) is an argument, and the call's result is not an id.
 */
const ID_VALUE = new RegExp(
	String.raw`(?:^|\?\?|\|\||[?:])\s*[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*\??\.${ID_FIELD}\s*(?=$|\?\?|\|\||[;:),]|as\b)`,
);
const DECLARATION =
	/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(.+?)\s*;?\s*$/;
const DESTRUCTURING = /^\s*(?:const|let|var)\s*\{([^}]*)\}\s*=/;
const ID_KEY = new RegExp(String.raw`^${ID_FIELD}$`);

function isComment(trimmed: string): boolean {
	return /^(\/\/|\*|\/\*)/.test(trimmed);
}

/** The names a one-line declaration in this file gives an id. */
function idNames(lines: readonly string[]): Set<string> {
	const names = new Set<string>();
	for (const text of lines) {
		if (isComment(text.trim())) continue;
		const declared = DECLARATION.exec(text);
		if (declared?.[1] && declared[2] && ID_VALUE.test(declared[2]))
			names.add(declared[1]);
		const destructured = DESTRUCTURING.exec(text);
		for (const part of destructured?.[1]?.split(",") ?? []) {
			const [key, alias] = part.split(":").map((p) => p.trim());
			if (key && ID_KEY.test(key)) names.add(alias || key);
		}
	}
	return names;
}

function escapeName(name: string): string {
	return name.replace(/\$/g, "\\$");
}

/**
 * JSX renders the name: a child `{name}` (or behind a fallback), or `${name}`
 * in a child's template. A declaration line is not JSX, and `{ name }`
 * followed by `=`, `:`, `)` or `,` is a destructuring pattern.
 */
function rendersName(text: string, name: string): boolean {
	if (DECLARATION.test(text) || DESTRUCTURING.test(text)) return false;
	const n = escapeName(name);
	return (
		new RegExp(
			String.raw`(?:^\s*|[^=$\s]\s*)\{\s*${n}\s*(?:\}(?!\s*[=:),])|\|\||\?\?)`,
		).test(text) ||
		new RegExp(
			String.raw`(?:^\s*|[^=$\s\x60]\s*)\{[^{}]*\$\{\s*${n}\s*\}`,
		).test(text)
	);
}

/** Each line of one file that renders an id, directly or through a name. */
function idRendersIn(file: string, source: string): string[] {
	const out: string[] = [];
	const lines = source.split("\n");
	const names = idNames(lines);
	lines.forEach((text, i) => {
		const trimmed = text.trim();
		if (isComment(trimmed)) return;
		// A form's error message keyed by its field (`{errors.property_id}`)
		// is a message, not an id.
		if (/\{\s*errors\??\.[A-Za-z_]+\s*\}/.test(text)) return;
		const direct = ID_RENDER.test(text);
		const viaName = [...names].find((name) => rendersName(text, name));
		if (!direct && viaName === undefined) return;
		const hit = `${file} → ${trimmed}`;
		if (PRINTED_ON_PURPOSE.includes(hit)) return;
		out.push(
			`${file}:${i + 1} → ${trimmed}${direct ? "" : ` (the id in ${viaName})`}`,
		);
	});
	return out;
}

function idRenders(): string[] {
	return TSX.flatMap((file) =>
		idRendersIn(file, readFileSync(join(ROOT, file), "utf8")),
	);
}

describe("no id is shown as text", () => {
	it("scans the UI (the sweep is not vacuous)", () => {
		expect(TSX.length).toBeGreaterThan(400);
	});

	it("renders no id as a JSX child, whole or cut", () => {
		expect(idRenders()).toEqual([]);
	});

	it("collects the names the UI gives an id (the name scan is not vacuous)", () => {
		const named = TSX.filter(
			(file) =>
				idNames(readFileSync(join(ROOT, file), "utf8").split("\n")).size > 0,
		);
		expect(named.length).toBeGreaterThan(20);
		expect(named).toContain(
			"src/components/maintenance/kanban/maintenance-kanban.client.tsx",
		);
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
			// Before fix round 3's part 6c the field pattern took one word before
			// `_id`, and knew no foreign key named otherwise: these passed.
			"\t\t\t\t\t{lease.primary_tenant_id}",
			'<p className="font-medium text-sm">{request.requested_by}</p>',
			'<p className="font-medium text-sm">{request.assigned_to}</p>',
		]) {
			expect(ID_RENDER.test(shape), shape).toBe(true);
		}
		expect(FOREIGN_KEY_COLUMNS).toEqual(
			expect.arrayContaining(["assigned_to", "requested_by"]),
		);
		for (const shape of [
			"key={invoice.id}",
			"onClick={() => onView(row.original.id)}",
			"href={`/leases/${lease.id}`}",
			"`work-order-${request.id.slice(0, 8)}.pdf`,",
		]) {
			expect(ID_RENDER.test(shape), shape).toBe(false);
		}
	});

	// The board card's own lines before part 6c, planted in a fixture: the
	// one-child-at-a-time scan passed them, the name scan does not.
	it("follows an id through a name into JSX (planted fixture)", () => {
		const planted = [
			'\tconst unitNumber = request.unit?.name ?? request.unit_id ?? "";',
			"\t\t\t\t\t{propertyName}",
			"\t\t\t\t\t{unitNumber && ` · Unit ${unitNumber}`}",
		].join("\n");
		expect(ID_RENDER.test(planted.split("\n")[2] ?? "")).toBe(false);
		expect(idRendersIn("planted.tsx", planted)).toEqual([
			"planted.tsx:3 → {unitNumber && ` · Unit ${unitNumber}`} (the id in unitNumber)",
		]);
		for (const shape of [
			"\tconst { unit_id: unit } = request;\n\t\t<span>{unit}</span>",
			'\tconst label = named ? request.title : request.property_id;\n\t\t{label ?? "-"}',
		]) {
			expect(idRendersIn("planted.tsx", shape), shape).toHaveLength(1);
		}
		for (const shape of [
			"\tconst requestId = active.id as string;\n\t\trouter.push(`/maintenance/${requestId}`);",
			"\tconst requestId = active.id as string;\n\t\t<Card key={requestId} />",
			"\tconst match = units.find((u) => u.id === unitId);\n\t\t{match}",
			"\tconst { unitNumber, tenantName } = request;\n\t\t{unitNumber && ` · Unit ${unitNumber}`}",
		]) {
			expect(idRendersIn("planted.tsx", shape), shape).toEqual([]);
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
						unit_number: "4B",
						status: "occupied",
					},
					{
						property_id: "3f2a9c1e-0000-4000-8000-00000000dead",
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
						propertyName: "Maple Court",
					},
					{
						id: "u2",
						property_id: "3f2a9c1e-0000-4000-8000-00000000dead",
						owner_user_id: "owner-1",
						unit_number: "2B",
						bedrooms: 1,
						bathrooms: 1,
						square_feet: 600,
						rent_amount: 1100,
						rent_currency: "USD",
						rent_period: "month",
						status: "available",
						created_at: "2026-01-01T00:00:00Z",
						updated_at: "2026-01-01T00:00:00Z",
						propertyName: "Gamma Flats (deleted)",
					},
				],
				total: 2,
			},
			isLoading: false,
			error: null,
		};
		// The list's own embed names each unit's property (cycle 2, F23): no
		// second lookup, so a deleted property's unit keeps its property.
		vi.doMock("@tanstack/react-query", async () => {
			const actual = await vi.importActual<
				typeof import("@tanstack/react-query")
			>("@tanstack/react-query");
			return {
				...actual,
				useQuery: () => unitsResult,
			};
		});
		vi.doMock("#hooks/api/use-unit", () => ({
			useDeleteUnitMutation: () => ({ mutate: vi.fn(), isPending: false }),
		}));
		const { default: UnitsPage } = await import("#app/(owner)/units/page");
		render(<UnitsPage />);
		expect(screen.getByText("Maple Court")).toBeInTheDocument();
		expect(screen.getByText("Gamma Flats (deleted)")).toBeInTheDocument();
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
