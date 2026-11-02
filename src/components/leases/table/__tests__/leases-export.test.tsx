/**
 * @vitest-environment jsdom
 * The leases selection bar's Export downloads the selected leases as CSV
 * (66.2-39 fix round 1, part F). It was a button with no handler.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import Papa from "papaparse";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lease } from "#types/core";
import type { LeaseDisplay } from "../lease-utils";
import {
	buildLeasesCsv,
	LEASES_CSV_HEADER,
	leasesCsvFilename,
} from "../leases-csv";
import { LeasesTable } from "../leases-table";

const { handleMutationErrorMock } = vi.hoisted(() => ({
	handleMutationErrorMock: vi.fn(),
}));
vi.mock("#lib/mutation-error-handler", () => ({
	handleMutationError: handleMutationErrorMock,
}));

function lease(
	id: string,
	overrides: Partial<LeaseDisplay> = {},
): LeaseDisplay {
	return {
		id,
		tenantName: `Tenant ${id}`,
		propertyName: "Maple Apartments",
		unitNumber: "4B",
		status: "active",
		startDate: "2026-01-01",
		endDate: "2026-12-31",
		rentAmount: 1500,
		original: { id } as Lease,
		...overrides,
	};
}

const LEASES = [
	lease("l1"),
	lease("l2", { status: "expiring", rentAmount: 2100 }),
];

function parse(csv: string): string[][] {
	const result = Papa.parse<string[]>(csv, { newline: "\r\n" });
	expect(result.errors).toEqual([]);
	return result.data;
}

const createdBlobs: Blob[] = [];
const clickedDownloads: string[] = [];

function renderTable(selected: string[]) {
	return render(
		<LeasesTable
			leases={LEASES}
			paginatedLeases={LEASES}
			searchQuery=""
			statusFilter="all"
			sortField="tenant"
			sortDirection="asc"
			selectedRows={new Set(selected)}
			currentPage={1}
			totalPages={1}
			itemsPerPage={10}
			onSearchChange={vi.fn()}
			onStatusFilterChange={vi.fn()}
			onSort={vi.fn()}
			onToggleSelectAll={vi.fn()}
			onToggleSelect={vi.fn()}
			onPageChange={vi.fn()}
			onView={vi.fn()}
			onEdit={vi.fn()}
			onRenew={vi.fn()}
			onTerminate={vi.fn()}
			onClearSelection={vi.fn()}
		/>,
	);
}

beforeEach(() => {
	createdBlobs.length = 0;
	clickedDownloads.length = 0;
	vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
		createdBlobs.push(blob as Blob);
		return "blob:leases";
	});
	vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
		this: HTMLAnchorElement,
	) {
		clickedDownloads.push(this.download);
	});
});

afterEach(() => {
	handleMutationErrorMock.mockReset();
	vi.restoreAllMocks();
});

describe("buildLeasesCsv", () => {
	it("writes one row per lease with the table's fields and the rent in dollars", () => {
		const rows = parse(buildLeasesCsv(LEASES));
		expect(rows[0]).toEqual([...LEASES_CSV_HEADER]);
		expect(rows.slice(1)).toEqual([
			[
				"Tenant l1",
				"Maple Apartments",
				"4B",
				"Active",
				"2026-01-01",
				"2026-12-31",
				"1500.00",
			],
			[
				"Tenant l2",
				"Maple Apartments",
				"4B",
				"Expiring Soon",
				"2026-01-01",
				"2026-12-31",
				"2100.00",
			],
		]);
	});

	it("names the file by the local export date", () => {
		expect(leasesCsvFilename(new Date(2026, 0, 9))).toBe(
			"tenantflow-leases-2026-01-09.csv",
		);
	});
});

describe("leases selection Export", () => {
	it("downloads only the selected leases", async () => {
		renderTable(["l2"]);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		expect(createdBlobs).toHaveLength(1);
		expect(createdBlobs[0]?.type).toBe("text/csv;charset=utf-8");
		expect(clickedDownloads[0]).toMatch(
			/^tenantflow-leases-\d{4}-\d{2}-\d{2}\.csv$/,
		);
		const rows = parse((await createdBlobs[0]?.text()) ?? "");
		expect(rows.slice(1).map((r) => r[0])).toEqual(["Tenant l2"]);
	});

	it("reports a failed export through the sanitized handler", () => {
		vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
			throw new Error("internal blob failure");
		});
		renderTable(["l1"]);
		fireEvent.click(screen.getByRole("button", { name: "Export" }));
		expect(handleMutationErrorMock).toHaveBeenCalledWith(
			expect.any(Error),
			"Export leases",
			"Couldn't export the leases. Please try again.",
		);
		expect(clickedDownloads).toHaveLength(0);
	});
});
