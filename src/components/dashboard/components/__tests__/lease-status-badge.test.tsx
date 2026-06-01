/**
 * Pin the shared lease-status pill contract (IN-03).
 *
 * LeaseStatusBadge is rendered identically in the portfolio table cell and the
 * grid card (DT-01 parity), so a single test guards the status -> chip-class
 * mapping AND the WR-01 border width that lets the status-* utilities'
 * border-color actually render.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeaseStatusBadge } from "../lease-status-badge";

describe("LeaseStatusBadge", () => {
	const cases = [
		{ status: "active", label: "Active", chip: "status-active" },
		{ status: "expiring", label: "Expiring", chip: "status-pending" },
		{ status: "vacant", label: "Vacant", chip: "status-inactive" },
	] as const;

	it.each(cases)("renders $status as the $chip pill with a border", ({
		status,
		label,
		chip,
	}) => {
		render(<LeaseStatusBadge status={status} />);
		const pill = screen.getByText(label);
		expect(pill).toHaveClass(chip);
		// WR-01: status-* set border-color; the pill must carry a border width.
		expect(pill).toHaveClass("border");
		expect(pill).toHaveClass("inline-flex");
	});
});
