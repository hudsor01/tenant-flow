/**
 * @vitest-environment jsdom
 * RentAdjustment "Change:" value colors (66.2-39 F1).
 *
 * The signed change amount is status-colored TEXT on the `bg-muted` summary
 * panel, so it uses the AA `-text` companions: a rent increase reads
 * `text-success-text` and a decrease `text-destructive-text`. On bg-muted
 * success-text reads 5.09:1 light / 9.87:1 dark and destructive-text 5.51:1 /
 * 6.08:1 (token math; Chrome, painted over the dialog `bg-background`, read
 * success-text 4.50:1 light before fix round 4 darkened it). The
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

	// A sign only above or below zero, as the statements' zero figures print
	// (66.2-39 fix round 3, the F16 shape): a change under half a cent read
	// "+$0.00" or "-$0.00".
	// The color is the printed change's too (cycle 3, G19): it keyed on the
	// unrounded change, so 999.996 printed "$0.00 (0.0%)" in the destructive
	// color and 1000.004 the same text in the success color. A zero change is
	// colored as an increase, as the statements color a zero net figure.
	it.each([
		["1100", "+$100.00 (10.0%)", "text-success-text"],
		["900", "-$100.00 (-10.0%)", "text-destructive-text"],
		["1000.004", "$0.00 (0.0%)", "text-success-text"],
		["999.996", "$0.00 (0.0%)", "text-success-text"],
		// A cent's decrease is -0.001%: its percent read "-0.0%" (cycle 3, I1).
		["999.99", "-$0.01 (0.0%)", "text-destructive-text"],
	])("prints the change to %s as %s in %s", (newRent, text, color) => {
		const value = renderAdjustment(newRent);
		expect(value.textContent).toBe(text);
		expect(value).toHaveClass(color);
		expect(value).not.toHaveClass(
			color === "text-success-text"
				? "text-destructive-text"
				: "text-success-text",
		);
	});
});
