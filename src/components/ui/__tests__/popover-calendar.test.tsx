/**
 * @vitest-environment jsdom
 * Popover data-slots and the calendar's transparent-in-popover class (new-york-v4, ledger C7).
 *
 * The calendar root carries `bg-background` for standalone use and the upstream
 * `[[data-slot=popover-content]_&]:bg-transparent`, which only matches when PopoverContent renders
 * its data-slot; then the popover surface and its rounded border corners show through.
 */

import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Calendar } from "#components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#components/ui/popover";
import { render } from "#test/utils/test-render";

describe("Popover and Calendar data-slots", () => {
	it("tags the trigger, the content and the calendar root", () => {
		render(
			<Popover open>
				<PopoverTrigger>Pick a date</PopoverTrigger>
				<PopoverContent className="w-auto p-0">
					<Calendar mode="single" />
				</PopoverContent>
			</Popover>,
		);

		expect(
			screen.getByRole("button", { name: "Pick a date" }).dataset.slot,
		).toBe("popover-trigger");

		const contents = document.querySelectorAll('[data-slot="popover-content"]');
		expect(contents).toHaveLength(1);

		const calendar = contents[0]?.querySelector('[data-slot="calendar"]');
		expect(calendar).not.toBeNull();
		expect(
			calendar?.classList.contains(
				"[[data-slot=popover-content]_&]:bg-transparent",
			),
		).toBe(true);
		expect(calendar?.classList.contains("bg-background")).toBe(true);
	});

	it("lets a consumer data-slot override the content default", () => {
		render(
			<Popover open>
				<PopoverTrigger>Open</PopoverTrigger>
				<PopoverContent data-slot="probe-content">Body</PopoverContent>
			</Popover>,
		);

		expect(document.querySelector('[data-slot="popover-content"]')).toBeNull();
		expect(
			document.querySelectorAll('[data-slot="probe-content"]'),
		).toHaveLength(1);
	});
});
