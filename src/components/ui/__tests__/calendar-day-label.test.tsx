/**
 * @vitest-environment jsdom
 * A calendar day's name contains the number it shows (66.2-39 fix round 4,
 * Part 8h; WCAG 2.5.3 Label in Name).
 *
 * react-day-picker names a day button with date-fns' "PPPP" format,
 * "Sunday, November 1st, 2026", which does not contain the "1" the button
 * shows: axe's label-content-name-mismatch failed every day of the documents
 * vault's date filter. The name now writes the day as its number.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Calendar } from "#components/ui/calendar";

describe("a calendar day's name", () => {
	it("holds the day number the button shows", () => {
		render(
			<Calendar
				mode="single"
				month={new Date(2026, 10, 1)}
				selected={new Date(2026, 10, 9)}
				today={new Date(2026, 10, 8)}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Sunday, November 1, 2026" }),
		).toHaveTextContent(/^1$/);
		expect(
			screen.getByRole("button", { name: "Today, Sunday, November 8, 2026" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Monday, November 9, 2026, selected",
			}),
		).toBeInTheDocument();
	});
});
