/**
 * @vitest-environment jsdom
 * RentAdjustment "Change:" value colors (66.2-39 F1).
 *
 * The signed change amount is status-colored TEXT on the `bg-muted` summary
 * panel, so it uses the AA `-text` companions: a rent increase reads
 * `text-success-text` and a decrease `text-destructive-text`. Measured in
 * Chrome (painted, over the dialog `bg-background`), success-text on bg-muted
 * is 4.50:1 light / 9.88:1 dark and destructive-text 5.51:1 / 6.08:1. The
 * previous `text-accent-main` measured 2.96:1 light, and the decrease class
 * `text-error-main` was not a defined utility, so a decrease rendered in the
 * inherited color.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RentAdjustment } from "../renew-lease-form-fields";

function renderAdjustment(newRentAmount: string) {
	render(
		<RentAdjustment
			showRentIncrease
			currentRent={1000}
			newRentAmount={newRentAmount}
			onToggle={() => undefined}
			onRentChange={() => undefined}
		/>,
	);
	const label = screen.getByText("Change:");
	const value = label.nextElementSibling;
	if (!(value instanceof HTMLElement)) {
		throw new Error("the Change: label has no value sibling");
	}
	return value;
}

describe("RentAdjustment change value", () => {
	it("colors a rent increase with the AA success text token", () => {
		const value = renderAdjustment("1100");
		expect(value.className).toContain("text-success-text");
		expect(value.className).not.toContain("text-accent-main");
	});

	it("colors a rent decrease with the AA destructive text token", () => {
		const value = renderAdjustment("900");
		expect(value.className).toContain("text-destructive-text");
		expect(value.className).not.toContain("text-error-main");
	});
});
