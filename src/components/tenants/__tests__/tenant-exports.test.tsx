/**
 * The tenants page Export controls download CSV (66.2-39 fix round 1, part F).
 * The quick-action Export had no handler and the selection bar's Export only
 * logged and cleared the selection; the "Message All" quick action, a bulk
 * email feature that does not exist, had no handler either and is gone, and
 * Analytics links to the analytics overview.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import Papa from "papaparse";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTenantsStore } from "#stores/tenants-store";
import { computeAnchorRuleReach } from "#test/utils/base-rule-cascade";
import { loadProjectDesignSystem } from "#test/utils/tailwind-engine";
import type { TenantItem } from "#types/sections/tenants";
import {
	buildTenantsCsv,
	TENANTS_CSV_HEADER,
	tenantsCsvFilename,
} from "../tenants-csv";

const { handleMutationErrorMock } = vi.hoisted(() => ({
	handleMutationErrorMock: vi.fn(),
}));

let actionBarProps: Record<string, unknown> = {};
vi.mock("../tenant-action-bar", () => ({
	TenantActionBar: (props: Record<string, unknown>) => {
		actionBarProps = props;
		return null;
	},
}));
vi.mock("../tenant-detail-sheet", () => ({ TenantDetailSheet: () => null }));
vi.mock("../tenant-grid", () => ({ TenantGrid: () => null }));
vi.mock("../tenant-stats", () => ({ TenantStats: () => null }));
vi.mock("../tenant-table", () => ({ TenantTable: () => null }));
vi.mock("../tenant-toolbar", () => ({ TenantToolbar: () => null }));
vi.mock("#components/bulk-import/bulk-import-dialog", () => ({
	BulkImportDialog: () => null,
}));
vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: handleMutationErrorMock,
}));

const TENANTS: TenantItem[] = [
	{
		id: "t1",
		fullName: "Ada Lovelace",
		email: "ada@example.com",
		phone: "555-0100",
		currentProperty: "Maple Court",
		currentUnit: "2B",
		leaseStatus: "active",
		totalPaid: 0,
	},
	{
		id: "t2",
		fullName: "=Grace Hopper",
		email: "grace@example.com",
		totalPaid: 0,
	},
];

function parse(csv: string): string[][] {
	const result = Papa.parse<string[]>(csv, { newline: "\r\n" });
	expect(result.errors).toEqual([]);
	return result.data;
}

const createdBlobs: Blob[] = [];
const clickedDownloads: string[] = [];

async function renderTenants(tenants: TenantItem[] = TENANTS) {
	const { Tenants } = await import("../tenants");
	return render(
		<Tenants
			tenants={tenants}
			onViewTenant={vi.fn()}
			onEditTenant={vi.fn()}
			onContactTenant={vi.fn()}
			onViewLease={vi.fn()}
			onDeleteTenant={vi.fn()}
			onBulkDelete={vi.fn()}
		/>,
	);
}

beforeEach(() => {
	createdBlobs.length = 0;
	clickedDownloads.length = 0;
	actionBarProps = {};
	vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
		createdBlobs.push(blob as Blob);
		return "blob:tenants";
	});
	vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
		this: HTMLAnchorElement,
	) {
		clickedDownloads.push(this.download);
	});
});

afterEach(() => {
	useTenantsStore.getState().reset();
	handleMutationErrorMock.mockReset();
	vi.restoreAllMocks();
});

describe("buildTenantsCsv", () => {
	it("writes one row per tenant with the table's fields, formulas neutralized", () => {
		const rows = parse(buildTenantsCsv(TENANTS));
		expect(rows[0]).toEqual([...TENANTS_CSV_HEADER]);
		// No Move-In Date: nothing sets one on a tenant row, and neither the
		// table nor the grid shows one, so every cell was empty (cycle 2, F72,
		// OD-7).
		expect(rows[0]).toEqual([
			"Name",
			"Email",
			"Phone",
			"Property",
			"Unit",
			"Lease Status",
		]);
		expect(rows.slice(1)).toEqual([
			[
				"Ada Lovelace",
				"ada@example.com",
				"555-0100",
				"Maple Court",
				"2B",
				"Active",
			],
			["'=Grace Hopper", "grace@example.com", "", "", "", ""],
		]);
	});

	it("names the file by the local export date", () => {
		expect(tenantsCsvFilename(new Date(2026, 10, 1, 23, 30))).toBe(
			"tenantflow-tenants-2026-11-01.csv",
		);
	});
});

describe("tenants page Export controls", () => {
	it("the quick action downloads the tenants the list shows", async () => {
		await renderTenants();
		fireEvent.click(screen.getByRole("button", { name: /^Export/ }));
		expect(createdBlobs).toHaveLength(1);
		expect(createdBlobs[0]?.type).toBe("text/csv;charset=utf-8");
		expect(clickedDownloads[0]).toMatch(
			/^tenantflow-tenants-\d{4}-\d{2}-\d{2}\.csv$/,
		);
		const rows = parse((await createdBlobs[0]?.text()) ?? "");
		expect(rows.slice(1).map((r) => r[1])).toEqual([
			"ada@example.com",
			"grace@example.com",
		]);
	});

	it("the selection bar's Export downloads only the selected tenants and keeps them selected", async () => {
		useTenantsStore.setState({ selectedIds: new Set(["t2"]) });
		await renderTenants();
		(actionBarProps.onExport as () => void)();
		const rows = parse((await createdBlobs[0]?.text()) ?? "");
		expect(rows.slice(1).map((r) => r[1])).toEqual(["grace@example.com"]);
		expect([...useTenantsStore.getState().selectedIds]).toEqual(["t2"]);
	});

	it("reports a failed export through the sanitized handler", async () => {
		vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
			throw new Error("internal blob failure");
		});
		await renderTenants();
		fireEvent.click(screen.getByRole("button", { name: /^Export/ }));
		expect(handleMutationErrorMock).toHaveBeenCalledWith(
			expect.any(Error),
			"Export tenants",
			"Couldn't export the tenants. Please try again.",
		);
		expect(clickedDownloads).toHaveLength(0);
	});

	it("offers no control for a feature that does not exist, and links Analytics", async () => {
		await renderTenants();
		expect(screen.queryByRole("button", { name: /Message All/ })).toBeNull();
		expect(screen.getByRole("link", { name: /^Analytics/ })).toHaveAttribute(
			"href",
			"/analytics/overview",
		);
	});

	// The Analytics link is a plain Link, so the globals.css base text-link
	// rules reach it (link color, a hover underline across both lines). Its own
	// utilities must set both properties: utilities outrank @layer base, so
	// the compiled class list decides (66.2-39 fix round 3, F71).
	it("draws Analytics like the two buttons beside it", async () => {
		await renderTenants();
		const analytics = screen.getByRole("link", { name: /^Analytics/ });
		const reach = computeAnchorRuleReach(analytics);
		expect(reach.baseline).toEqual({ rest: true, hover: true });
		expect(reach.rest).toBe(true);
		const designSystem = await loadProjectDesignSystem();
		const css = designSystem
			.candidatesToCss([...analytics.classList])
			.filter((rule): rule is string => rule !== null)
			.join("\n");
		expect(css).toMatch(/text-decoration-line:\s*none/);
		expect(css).toMatch(/[{;\s]color:\s*var\(--foreground\)/);
	}, 30_000);
});
