/**
 * The marketing dashboard mockup is an illustration, not a set of controls.
 *
 * It rendered three quick actions and a "View all" link as real `<button>`s with
 * no handler: four keyboard stops on `/`, `/about` and `/faq` that did nothing
 * (and, under the touch-target floor below 48rem (D-08), a 44px-tall "View
 * all"). They are plain elements now, styled exactly as before at rest, without
 * hover feedback that promised a click.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroDashboardMockup } from "../hero-dashboard-mockup";

describe("HeroDashboardMockup", () => {
	it("renders the quick actions and View all with no interactive element", () => {
		const { container } = render(<HeroDashboardMockup />);
		for (const label of [
			"Upload Document",
			"Maintenance",
			"Send for E-Sign",
			"View all",
		]) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
		expect(screen.queryAllByRole("button")).toHaveLength(0);
		expect(
			container.querySelectorAll("button, a[href], [tabindex]"),
		).toHaveLength(0);
	});

	it("offers no hover affordance on the quick actions", () => {
		render(<HeroDashboardMockup />);
		const row = screen.getByText("Upload Document").closest(".card-standard");
		expect(row).not.toBeNull();
		expect(row?.className).not.toMatch(/hover:/);
	});
});
