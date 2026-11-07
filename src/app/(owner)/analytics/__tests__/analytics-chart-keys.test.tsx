/**
 * @vitest-environment jsdom
 * The analytics pages' multi-series charts tell their series apart by more
 * than hue (66.2-39 fix round 3, the F39 class; WCAG 1.4.1). Their legends
 * named each series beside a color square only: the Scheduled Rent &
 * Expenses chart's three areas, and the property chart's occupancy and rent
 * received bars.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RevenueExpenseChart } from "#app/(owner)/analytics/financial/revenue-expense-chart";
import { PropertyOccupancyChart } from "#app/(owner)/analytics/property-performance/property-charts";
import { resetRechartsProbe, setRechartsProbe } from "#test/mocks/recharts";
import { render } from "#test/utils/test-render";

describe("the analytics charts' series keys", () => {
	afterEach(() => {
		resetRechartsProbe();
	});

	// Solid, dashed and dotted strokes, each drawn the same in its legend key.
	it("draws the three areas with three strokes and keys them alike", async () => {
		setRechartsProbe({
			legend: [
				{ value: "revenue", dataKey: "revenue", type: "line" },
				{ value: "expenses", dataKey: "expenses", type: "line" },
				{ value: "netIncome", dataKey: "netIncome", type: "line" },
			],
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
		const areas = await screen.findAllByTestId("area");
		expect(
			areas.map((area) => [
				area.getAttribute("data-key"),
				area.getAttribute("data-stroke-dasharray"),
				area.getAttribute("data-stroke-width"),
			]),
		).toEqual([
			["revenue", null, "2"],
			["expenses", "5 3", "2"],
			["netIncome", "2 2", "2"],
		]);
		const legend = screen.getByTestId("legend");
		expect(legend.textContent).toBe("Scheduled RentExpensesScheduled Net");
		const keys = [...legend.querySelectorAll("svg line")];
		expect(keys.map((key) => key.getAttribute("stroke-dasharray"))).toEqual([
			null,
			"5 3",
			"2 2",
		]);
		expect(keys.map((key) => key.getAttribute("stroke"))).toEqual([
			"var(--color-revenue)",
			"var(--color-expenses)",
			"var(--color-netIncome)",
		]);
	});

	// Occupancy's bars are solid; rent received's hatched, outlined in its
	// color, and its legend key is the same hatch.
	it("hatches the rent received bars and keys both bar series alike", async () => {
		setRechartsProbe({
			legend: [
				{ value: "occupancy", dataKey: "occupancy", type: "rect" },
				{ value: "rentReceived", dataKey: "rentReceived", type: "rect" },
			],
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
		const bars = await screen.findAllByTestId("bar");
		const [occupancy, rentReceived] = bars;
		if (!occupancy || !rentReceived) throw new Error("a bar series is missing");
		expect(occupancy.getAttribute("data-fill")).toBe("var(--color-occupancy)");
		const hatchFill = rentReceived.getAttribute("data-fill") ?? "";
		const hatchId = /^url\(#([\w-]+)\)$/.exec(hatchFill)?.[1];
		if (!hatchId)
			throw new Error(`rent received is not a pattern: ${hatchFill}`);
		const hatch = document.getElementById(hatchId);
		expect(hatch?.tagName.toLowerCase()).toBe("pattern");
		expect(hatch?.closest("[data-testid=bar-chart]")).not.toBeNull();
		expect(rentReceived.getAttribute("data-stroke")).toBe(
			"var(--color-rentReceived)",
		);

		const legend = screen.getByTestId("legend");
		expect(legend.textContent).toBe("Occupancy %Rent received");
		const swatches = [...legend.querySelectorAll("svg rect[stroke]")];
		expect(swatches.map((swatch) => swatch.getAttribute("stroke"))).toEqual([
			"var(--color-occupancy)",
			"var(--color-rentReceived)",
		]);
		const [solid, hatched] = swatches;
		expect(solid?.getAttribute("fill")).toBe("var(--color-occupancy)");
		const keyHatchId = /^url\(#([\w-]+)\)$/.exec(
			hatched?.getAttribute("fill") ?? "",
		)?.[1];
		if (!keyHatchId) throw new Error("the rent received key is not hatched");
		const keyHatch = document.getElementById(keyHatchId);
		expect(keyHatch?.tagName.toLowerCase()).toBe("pattern");
		expect(keyHatch?.closest("svg")).toBe(hatched?.closest("svg"));
	});
});
