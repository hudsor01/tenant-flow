/**
 * MaintenanceViewClient — unit filter wiring tests
 *
 * DASH-18: a `?unit_id=` param scopes the list via the query factory and shows
 * a dismissible filter indicator; DASH-20: the zero-state uses the Empty
 * compound with filter-aware copy + a clear-filter action.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maintenanceQueries } from "#hooks/api/query-keys/maintenance-keys";

const mockReplace = vi.fn();
let searchParamsString = "";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
	useSearchParams: () => new URLSearchParams(searchParamsString),
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();
	return { ...actual, useQuery: (...args: unknown[]) => useQueryMock(...args) };
});

vi.mock("#providers/preferences-provider", () => ({
	usePreferencesStore: (selector: (state: unknown) => unknown) =>
		selector({
			viewPreferences: { maintenance: "kanban" },
			setViewPreference: vi.fn(),
		}),
}));

vi.mock("./maintenance-view-tabs", () => ({
	MaintenanceOverviewTab: () => <div>overview-tab</div>,
	MaintenanceInsightsTab: () => <div>insights-tab</div>,
}));

import { MaintenanceViewClient } from "./maintenance-view.client";

describe("MaintenanceViewClient unit filter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		searchParamsString = "";
		// Every useQuery call (list, stats, unit detail) returns an empty set.
		useQueryMock.mockReturnValue({
			data: { data: [] },
			isLoading: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("passes { unit_id } to the list factory and shows the filter-aware empty state", async () => {
		searchParamsString = "unit_id=unit-9";
		const listSpy = vi.spyOn(maintenanceQueries, "list");

		render(<MaintenanceViewClient />);

		expect(listSpy).toHaveBeenCalledWith({ unit_id: "unit-9" });
		expect(
			screen.getByText("No maintenance requests for this unit"),
		).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "Clear filter" }));
		expect(mockReplace).toHaveBeenCalledWith("/maintenance");
	});

	it("passes undefined to the list factory when no unit_id param is present", () => {
		searchParamsString = "";
		const listSpy = vi.spyOn(maintenanceQueries, "list");

		render(<MaintenanceViewClient />);

		expect(listSpy).toHaveBeenCalledWith(undefined);
		expect(screen.getByText("No maintenance requests")).toBeInTheDocument();
	});
});
