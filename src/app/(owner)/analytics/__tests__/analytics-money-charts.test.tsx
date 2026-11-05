/**
 * @vitest-environment jsdom
 * The analytics pages' money charts state their figures as money (66.2-39
 * fix round 3, the F33 class): the property chart's rent received, the
 * Scheduled Net bars and the Scheduled Rent & Expenses areas read "0 / 4000"
 * on their axes and "1250.5" in their tooltips (ChartTooltipContent's
 * toLocaleString), with no $ and no cents.
 */
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NetOperatingIncomeChart } from "#app/(owner)/analytics/financial/financial-charts";
import { RevenueExpenseChart } from "#app/(owner)/analytics/financial/revenue-expense-chart";
import { PropertyOccupancyChart } from "#app/(owner)/analytics/property-performance/property-charts";
import { resetRechartsProbe, setRechartsProbe } from "#test/mocks/recharts";
import { render } from "#test/utils/test-render";

function axisTicks(axis: HTMLElement): string[] {
	return within(axis)
		.queryAllByTestId("y-tick")
		.map((tick) => tick.textContent ?? "");
}

describe("the analytics money charts", () => {
	afterEach(() => {
		resetRechartsProbe();
	});

	it("states the property chart's rent received in dollars", async () => {
		setRechartsProbe({
			yTicks: [0, 4000],
			tooltip: {
				active: true,
				label: "Maple Court",
				payload: [
					{
						dataKey: "occupancy",
						name: "occupancy",
						value: 92.5,
						color: "var(--color-occupancy)",
						payload: { property: "Maple Court" },
					},
					{
						dataKey: "rentReceived",
						name: "rentReceived",
						value: 1250.5,
						color: "var(--color-rentReceived)",
						payload: { property: "Maple Court" },
					},
				],
			},
		});
		render(
			<PropertyOccupancyChart
				data={[
					{
						property_id: "p1",
						propertyName: "Maple Court",
						occupancyRate: 92.5,
						rentReceived: 1250.5,
						totalUnits: 4,
						occupiedUnits: 3,
					},
				]}
			/>,
		);
		const axes = await screen.findAllByTestId("y-axis");
		const byId = new Map(
			axes.map((axis) => [axis.getAttribute("data-axis-id"), axis]),
		);
		const occupancy = byId.get("occupancy");
		const rentReceived = byId.get("rentReceived");
		if (!occupancy || !rentReceived) throw new Error("an axis is missing");
		// The occupancy axis keeps its plain ticks (recharts adds its `unit`).
		expect(axisTicks(occupancy)).toEqual(["0", "4000"]);
		expect(axisTicks(rentReceived)).toEqual(["$0", "$4,000"]);
		expect(screen.getByTestId("tooltip")).toHaveTextContent(
			/^Maple CourtOccupancy %92\.5Rent received\$1,250\.50$/,
		);
	});

	it("states the Scheduled Net bars in dollars", async () => {
		setRechartsProbe({
			yTicks: [-500, 0, 1500],
			tooltip: {
				active: true,
				label: "2026-10",
				payload: [
					{
						dataKey: "noi",
						name: "noi",
						value: 1239.5,
						color: "var(--color-noi)",
						payload: { property: "2026-10" },
					},
				],
			},
		});
		render(
			<NetOperatingIncomeChart
				data={[{ propertyName: "2026-10", noi: 1239.5 }]}
			/>,
		);
		const [axis] = await screen.findAllByTestId("y-axis");
		if (!axis) throw new Error("no axis");
		expect(axisTicks(axis)).toEqual(["-$500", "$0", "$1,500"]);
		expect(screen.getByTestId("tooltip")).toHaveTextContent(
			/^Scheduled Net\$1,239\.50$/,
		);
	});

	it("states the Scheduled Rent & Expenses areas in dollars", async () => {
		setRechartsProbe({
			yTicks: [0, 12000],
			tooltip: {
				active: true,
				label: "2026-10",
				payload: [
					{
						dataKey: "revenue",
						name: "revenue",
						value: 12000,
						color: "var(--color-revenue)",
						payload: { month: "2026-10" },
					},
					{
						dataKey: "expenses",
						name: "expenses",
						value: 760.5,
						color: "var(--color-expenses)",
						payload: { month: "2026-10" },
					},
					{
						dataKey: "netIncome",
						name: "netIncome",
						value: 11239.5,
						color: "var(--color-netIncome)",
						payload: { month: "2026-10" },
					},
				],
			},
		});
		render(
			<RevenueExpenseChart
				data={[
					{
						month: "2026-10",
						revenue: 12000,
						expenses: 760.5,
						netIncome: 11239.5,
					},
				]}
			/>,
		);
		const [axis] = await screen.findAllByTestId("y-axis");
		if (!axis) throw new Error("no axis");
		expect(axisTicks(axis)).toEqual(["$0", "$12,000"]);
		expect(screen.getByTestId("tooltip")).toHaveTextContent(
			/^2026-10Scheduled Rent\$12,000\.00Expenses\$760\.50Scheduled Net\$11,239\.50$/,
		);
	});
});
