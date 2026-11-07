/**
 * Pin the shared occupancy pill contract (IN-03).
 *
 * OccupancyBadge is rendered identically in the portfolio table cell and the
 * grid card (DT-01 parity), so a single test guards the occupancy -> label and
 * chip-class mapping AND the WR-01 border width that lets the status-*
 * utilities' border-color actually render.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { portfolioOccupancy } from "#lib/constants/status-types";
import { OccupancyBadge } from "../occupancy-badge";

describe("OccupancyBadge", () => {
	const cases = [
		{ occupancy: "occupied", label: "Occupied", chip: "status-active" },
		{
			occupancy: "partly-vacant",
			label: "Partly vacant",
			chip: "status-pending",
		},
		{ occupancy: "vacant", label: "Vacant", chip: "status-inactive" },
		{ occupancy: "no-units", label: "No units", chip: "status-inactive" },
	] as const;

	it.each(cases)(
		"renders $occupancy as the $chip pill with a border",
		({ occupancy, label, chip }) => {
			render(<OccupancyBadge occupancy={occupancy} />);
			const pill = screen.getByText(label);
			expect(pill).toHaveClass(chip);
			// WR-01: status-* set border-color; the pill must carry a border width.
			expect(pill).toHaveClass("border");
			expect(pill).toHaveClass("inline-flex");
		},
	);
});

describe("portfolioOccupancy", () => {
	it("reads the row's own units, never a threshold on the rate", () => {
		expect(portfolioOccupancy(4, 4)).toBe("occupied");
		// 4 of 5 (80%) read "Expiring" and 3 of 4 (75%) "Vacant" before.
		expect(portfolioOccupancy(4, 5)).toBe("partly-vacant");
		expect(portfolioOccupancy(3, 4)).toBe("partly-vacant");
		expect(portfolioOccupancy(1, 10)).toBe("partly-vacant");
		expect(portfolioOccupancy(0, 4)).toBe("vacant");
		expect(portfolioOccupancy(0, 0)).toBe("no-units");
	});
});
