/**
 * The maintenance page names each request by what it is for (66.2-39 fix
 * round 3, part 6c). The page cast `maintenanceQueries.list` rows, which
 * carried no embeds, to a "with relations" display type, so every board card
 * printed "Unknown Property · Unit " and the unit's id, every table row
 * "Unassigned", and a search by property never matched. The fixtures in the
 * older card test carried hand-built `property`/`unit` objects no query ever
 * returned, so they passed throughout.
 *
 * This renders the real page (its board, its table and its search) from rows
 * the real list queryFn maps out of PostgREST-shaped responses: only the
 * Supabase client, the cached user and the view preference are stubbed.
 *
 * @vitest-environment jsdom
 */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryChain } from "#test/mocks/supabase-query-mock";
import { render } from "#test/utils/test-render";

const { mockFrom, mockRpc, view } = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockRpc: vi.fn(),
	view: { current: "kanban" as "kanban" | "table" },
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom, rpc: mockRpc }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-1" }),
}));
vi.mock("#providers/preferences-provider", () => ({
	usePreferencesStore: (selector: (state: unknown) => unknown) =>
		selector({
			viewPreferences: { maintenance: view.current },
			setViewPreference: vi.fn(),
		}),
}));

import { MaintenanceViewClient } from "../maintenance-view.client";

const UNIT_4B = "3f2a9c1e-0000-4000-8000-000000000001";
const UNIT_2B = "3f2a9c1e-0000-4000-8000-00000000dead";

function postgrestRow(overrides: {
	id: string;
	title: string;
	unit_id: string;
	units: unknown;
	tenant: unknown;
}) {
	return {
		owner_user_id: "owner-1",
		tenant_id: "7c0ffee0-0000-4000-8000-000000000001",
		description: "Reported on the phone; needs a visit this week.",
		priority: "medium",
		status: "open",
		vendor_id: null,
		requested_by: null,
		assigned_to: null,
		estimated_cost: null,
		scheduled_date: null,
		completed_at: null,
		inspection_date: null,
		inspection_findings: null,
		inspector_id: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		...overrides,
	};
}

const ROWS = [
	postgrestRow({
		id: "req-1",
		title: "Kitchen faucet drips",
		unit_id: UNIT_4B,
		units: {
			unit_number: "4B",
			property_id: "p-1",
			properties: { name: "Maple Court", status: "active" },
		},
		tenant: { name: "Dana Rivera", first_name: null, last_name: null },
	}),
	postgrestRow({
		id: "req-2",
		title: "Heater makes noise",
		unit_id: UNIT_2B,
		units: {
			unit_number: "2B",
			property_id: "p-2",
			properties: { name: "Gamma Flats", status: "inactive" },
		},
		tenant: { name: null, first_name: "Sam", last_name: "Lee" },
	}),
];

describe("the maintenance page names each request's property and unit", () => {
	beforeEach(() => {
		mockFrom.mockReset();
		mockRpc.mockReset();
		mockFrom.mockImplementation(() =>
			createQueryChain({ data: ROWS, error: null, count: ROWS.length }),
		);
		mockRpc.mockResolvedValue({ data: {}, error: null });
	});

	it("prints them on every board card, never the unit's id", async () => {
		view.current = "kanban";
		render(<MaintenanceViewClient />);
		await screen.findByText("Kitchen faucet drips");
		expect(document.body.textContent).not.toContain(UNIT_4B);
		expect(document.body.textContent).not.toContain(UNIT_2B);
		expect(document.body.textContent).not.toContain("Unknown Property");
		expect(screen.getByText("Maple Court · Unit 4B")).toBeInTheDocument();
		expect(
			screen.getByText("Gamma Flats (deleted) · Unit 2B"),
		).toBeInTheDocument();
		expect(screen.getByText("Dana Rivera")).toBeInTheDocument();
		expect(screen.getByText("Sam Lee")).toBeInTheDocument();
	});

	it("prints them in the table's Location column", async () => {
		view.current = "table";
		render(<MaintenanceViewClient />);
		const table = await screen.findByRole("table");
		expect(table.textContent).not.toContain("Unassigned");
		expect(table.textContent).not.toContain(UNIT_4B);
		expect(
			within(table).getByText("Maple Court · Unit 4B"),
		).toBeInTheDocument();
		expect(
			within(table).getByText("Gamma Flats (deleted) · Unit 2B"),
		).toBeInTheDocument();
	});

	it("finds a request by its property's name", async () => {
		view.current = "kanban";
		render(<MaintenanceViewClient />);
		await screen.findByText("Kitchen faucet drips");
		await userEvent.type(
			screen.getByRole("textbox", { name: "Search maintenance requests" }),
			"gamma",
		);
		expect(screen.getByText("Heater makes noise")).toBeInTheDocument();
		expect(screen.queryByText("Kitchen faucet drips")).not.toBeInTheDocument();
	});
});
