/**
 * The maintenance request header's Location, Scheduled Date, Estimated Cost
 * and Spent to Date boxes space their lines as declared (66.2-39 fix round 3,
 * part 7). Each line is a `<p>` inside a `p-4` box, so the base `p` rule's
 * 16px margin stood between the property and its unit ("Unit 2B") and under
 * every box's last line, inside its padding: in Chrome the Location box was
 * 137.19px tall where its lines and padding make 105.19 (at 390; at 1280 its
 * row takes the Scheduled Date box's 109.19), each cost box 102 where they
 * make 86. Read through `computeParagraphCascade`, which reads the computed
 * value with the real base rule from globals.css.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { computeParagraphCascade } from "#test/utils/base-rule-cascade";
import { MaintenanceHeaderCard } from "../maintenance-header-card";

vi.mock("../schedule-dialog", () => ({ ScheduleDialog: () => null }));
vi.mock("../status-select", () => ({ StatusSelect: () => null }));

describe("the maintenance header's boxes", () => {
	it("leave no base margin under any of their lines", () => {
		render(
			<MaintenanceHeaderCard
				request={{
					id: "r1",
					title: "Heater makes noise",
					description: "Reported on the phone.",
					status: "open",
					priority: "medium",
					scheduled_date: "2026-11-12",
					estimated_cost: 150,
					propertyName: "Gamma Flats (deleted)",
					unitNumber: "2B",
				}}
				spentToDate={0}
				onRefresh={() => undefined}
				onExport={() => undefined}
			/>,
		);
		const boxes = [
			"Location",
			"Scheduled Date",
			"Estimated Cost",
			"Spent to Date",
		]
			.map((label) => screen.getByText(label).closest(".rounded-lg"))
			.filter((box): box is Element => box !== null);
		expect(boxes).toHaveLength(4);
		const lines = boxes.flatMap((box) => [...box.querySelectorAll("p")]);
		expect(lines.map((line) => line.textContent)).toEqual([
			"Gamma Flats (deleted)",
			"Unit 2B",
			"Thursday, November 12, 2026",
			"$150.00",
			"-",
		]);
		for (const line of lines) {
			const { neutralized, baseline } = computeParagraphCascade(line);
			expect(baseline.marginBottom).toBe("16px");
			expect(neutralized.marginBottom, line.textContent ?? "").toBe("0px");
		}
	});
});
