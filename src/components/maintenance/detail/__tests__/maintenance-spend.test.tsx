/**
 * The maintenance request's header shows its spend to date from its expenses,
 * as get_maintenance_analytics counts total_cost (20261110123122), and never
 * `actual_cost`, which nothing writes (66.2-39 fix round 1, part N).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaintenanceHeaderCard } from "../maintenance-header-card";
import { spendToDate } from "../maintenance-utils";

vi.mock("../schedule-dialog", () => ({ ScheduleDialog: () => null }));
vi.mock("../status-select", () => ({ StatusSelect: () => null }));

describe("spendToDate", () => {
	it("sums the expenses dated through today, not one dated ahead", () => {
		expect(
			spendToDate(
				[
					{ amount: 200, expense_date: "2026-10-01" },
					{ amount: 50.5, expense_date: "2026-11-02" },
					{ amount: 77, expense_date: "2026-12-12" },
					{ amount: 9, expense_date: null },
				],
				"2026-11-02",
			),
		).toBe(250.5);
	});
});

describe("MaintenanceHeaderCard", () => {
	it("shows the estimate and the spend to date, and no actual cost", () => {
		render(
			<MaintenanceHeaderCard
				request={{
					id: "r1",
					title: "Leak",
					description: "Kitchen leak",
					status: "open",
					priority: "normal",
					scheduled_date: null,
					estimated_cost: 300,
					propertyName: "Maple Court",
					unitNumber: "4B",
				}}
				spentToDate={250.5}
				onRefresh={() => undefined}
				onExport={() => undefined}
			/>,
		);
		expect(screen.getByText("Estimated Cost")).toBeInTheDocument();
		expect(screen.getByText("$300.00")).toBeInTheDocument();
		expect(screen.getByText("Spent to Date")).toBeInTheDocument();
		expect(screen.getByText("$250.50")).toBeInTheDocument();
		expect(screen.queryByText("Actual Cost")).toBeNull();
		expect(screen.queryByText("Total Expenses")).toBeNull();
	});
});
