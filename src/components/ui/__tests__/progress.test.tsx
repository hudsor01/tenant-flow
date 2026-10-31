/**
 * @vitest-environment jsdom
 * Progress Component Tests
 *
 * Pins the C5 contract: Progress forwards `value` to the Radix root, so the
 * progressbar exposes its value to assistive technology, and the local
 * variant and size maps still apply.
 */

import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { render } from "#test/utils/test-render";
import { Progress } from "../progress";

describe("Progress", () => {
	test("exposes its value through the progressbar role", () => {
		render(<Progress value={43} aria-label="Probe progress" />);
		const bar = screen.getByRole("progressbar", { name: "Probe progress" });
		expect(bar).toHaveAttribute("aria-valuenow", "43");
		expect(bar).toHaveAttribute("aria-valuemin", "0");
		expect(bar).toHaveAttribute("aria-valuemax", "100");
		expect(bar).toHaveAttribute("aria-valuetext", "43%");
		expect(bar).toHaveAttribute("data-state", "loading");
		expect(bar).toHaveAttribute("data-slot", "progress");
		expect(bar.firstElementChild).toHaveAttribute(
			"data-slot",
			"progress-indicator",
		);
	});

	test("reports complete at the maximum value", () => {
		render(<Progress value={100} aria-label="Probe progress" />);
		const bar = screen.getByRole("progressbar", { name: "Probe progress" });
		expect(bar).toHaveAttribute("data-state", "complete");
		expect(bar).toHaveAttribute("aria-valuenow", "100");
	});

	test("is indeterminate when the value is null", () => {
		render(<Progress value={null} aria-label="Probe progress" />);
		const bar = screen.getByRole("progressbar", { name: "Probe progress" });
		expect(bar).not.toHaveAttribute("aria-valuenow");
		expect(bar).toHaveAttribute("data-state", "indeterminate");
	});

	test("is indeterminate when the value is omitted", () => {
		render(<Progress aria-label="Probe progress" />);
		const bar = screen.getByRole("progressbar", { name: "Probe progress" });
		expect(bar).not.toHaveAttribute("aria-valuenow");
		expect(bar).toHaveAttribute("data-state", "indeterminate");
	});

	test("keeps the variant and size classes", () => {
		render(
			<>
				<Progress
					value={10}
					variant="success"
					size="lg"
					aria-label="Success progress"
				/>
				<Progress value={10} aria-label="Default progress" />
			</>,
		);
		const success = screen.getByRole("progressbar", {
			name: "Success progress",
		});
		expect(success).toHaveClass("bg-success/20", "h-3");
		expect(success.firstElementChild).toHaveClass("bg-success");
		const fallback = screen.getByRole("progressbar", {
			name: "Default progress",
		});
		expect(fallback).toHaveClass("bg-primary/20", "h-2");
		expect(fallback.firstElementChild).toHaveClass("bg-primary");
	});
});
