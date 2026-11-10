/**
 * A maintenance request's detail page names its own unit and property (66.2-39
 * fix round 3, part 6c). It looked both up in `unitQueries.list()` (the first
 * 50 units, deleted ones excluded) and `propertyQueries.list()` (deleted
 * properties excluded), so a request on the 51st unit, or on a property the
 * owner deleted, read "Unassigned property" with no unit. The detail now
 * embeds them, and an update returns the same embed, because its result
 * replaces the cached detail.
 *
 * Its contact card printed `requested_by` and `assigned_to`, user ids nothing
 * writes: an empty card on every new request, a user id as text on an older
 * one. It now reaches the request's tenant (name, email, phone) through the
 * same detail select.
 *
 * @vitest-environment jsdom
 */
import { QueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { render } from "#test/utils/test-render";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));
vi.mock("../photos-card", () => ({ PhotosCard: () => null }));
vi.mock("../expenses-card", () => ({ ExpensesCard: () => null }));
vi.mock("../schedule-dialog", () => ({ ScheduleDialog: () => null }));
vi.mock("../status-select", () => ({ StatusSelect: () => null }));
vi.mock("#components/documents/documents-section", () => ({
	DocumentsSection: () => null,
}));

import {
	maintenanceMutations,
	maintenanceQueries,
} from "#hooks/api/query-keys/maintenance-keys";
import { MaintenanceDetails } from "../maintenance-details.client";

const UNIT_ID = "3f2a9c1e-0000-4000-8000-00000000dead";
const REQUESTED_BY = "11111111-0000-4000-8000-0000000000aa";
const DETAIL_ROW = {
	id: "req-1",
	owner_user_id: "owner-1",
	unit_id: UNIT_ID,
	tenant_id: "7c0ffee0-0000-4000-8000-000000000001",
	title: "Heater makes noise",
	description: "Reported on the phone; needs a visit this week.",
	priority: "medium",
	status: "open",
	vendor_id: null,
	// An older row's user ids: nothing writes them now.
	requested_by: REQUESTED_BY,
	assigned_to: null,
	estimated_cost: null,
	scheduled_date: null,
	completed_at: null,
	inspection_date: null,
	inspection_findings: null,
	inspector_id: null,
	created_at: "2026-10-01T00:00:00Z",
	updated_at: "2026-10-01T00:00:00Z",
	units: {
		unit_number: "2B",
		property_id: "p-2",
		properties: { name: "Gamma Flats", status: "inactive" },
	},
	tenant: {
		name: null,
		first_name: "Sam",
		last_name: "Lee",
		email: "sam@example.com",
		phone: null,
	},
};

describe("the maintenance detail page names the request's unit and property", () => {
	beforeEach(() => {
		mockFrom.mockReset();
		// The request's own row; any unit or property list comes back without
		// this request's unit and property (a deleted property, a 51st unit).
		mockFrom.mockImplementation((table: string) =>
			table === "maintenance_requests"
				? createQueryChain({ data: DETAIL_ROW, error: null })
				: createQueryChain({ data: [], error: null, count: 0 }),
		);
	});

	it("from the request's own embed", async () => {
		render(
			<Suspense fallback={null}>
				<MaintenanceDetails id="req-1" />
			</Suspense>,
		);
		expect(await screen.findByText("Heater makes noise")).toBeInTheDocument();
		expect(document.body.textContent).not.toContain("Unassigned property");
		expect(screen.getByText("Gamma Flats (deleted)")).toBeInTheDocument();
		expect(screen.getByText("Unit 2B")).toBeInTheDocument();
		expect(document.body.textContent).not.toContain(UNIT_ID);
	});

	it("reaches the request's tenant on the contact card, never a user id", async () => {
		render(
			<Suspense fallback={null}>
				<MaintenanceDetails id="req-1" />
			</Suspense>,
		);
		expect(await screen.findByText("Contact Information")).toBeInTheDocument();
		expect(document.body.textContent).not.toContain(REQUESTED_BY);
		expect(screen.queryByText("Requested by")).toBeNull();
		expect(screen.getByText("Sam Lee")).toBeInTheDocument();
		expect(screen.getByText("sam@example.com")).toBeInTheDocument();
		expect(screen.getByText("Not provided")).toBeInTheDocument();
	});

	it("selects the unit embed for the detail and for an update's result", async () => {
		const detailChain = createQueryChain({ data: DETAIL_ROW, error: null });
		mockFrom.mockReturnValue(detailChain);
		const detail = await new QueryClient().query(
			maintenanceQueries.detail("req-1"),
		);
		const detailSelect = String(detailChain.select?.mock.calls[0]?.[0] ?? "");
		expect(detailSelect).toContain(
			"units(unit_number, property_id, properties(name, status))",
		);
		expect(detailSelect).toContain(
			"tenant:tenant_id(name, first_name, last_name, email, phone)",
		);
		expect(detail).toMatchObject({
			propertyName: "Gamma Flats (deleted)",
			unitNumber: "2B",
		});

		const updateChain = createQueryChain({ data: DETAIL_ROW, error: null });
		mockFrom.mockReturnValue(updateChain);
		const mutationFn = maintenanceMutations.update().mutationFn;
		const updated = await mutationFn?.(
			{ id: "req-1", data: { status: "in_progress" } },
			{ client: new QueryClient(), meta: undefined },
		);
		expect(String(updateChain.select?.mock.calls[0]?.[0] ?? "")).toBe(
			detailSelect,
		);
		expect(updated).toMatchObject({
			propertyName: "Gamma Flats (deleted)",
			unitNumber: "2B",
		});
	});
});
