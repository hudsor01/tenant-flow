/**
 * Pins that a tour step whose props change keeps its place in the tour
 * (66.2-39 fix round 4, Part 8f). The owner onboarding tour gives steps 2-4
 * a side that depends on the 48rem breakpoint; DiceUI removed a step and added
 * it again at the end whenever a prop changed, and each step kept the index
 * it was first added at, so a viewport that crossed the breakpoint on step 2
 * left the tour's spotlight up with no step in it.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	Tour,
	TourHeader,
	TourPortal,
	TourStep,
	TourTitle,
} from "#components/ui/tour";

function Steps({ side }: { side: "top" | "bottom" }) {
	return (
		<Tour open value={1} onValueChange={() => {}}>
			<TourPortal>
				<TourStep target="#target-1">
					<TourHeader>
						<TourTitle>First</TourTitle>
					</TourHeader>
				</TourStep>
				<TourStep target="#target-2" side={side}>
					<TourHeader>
						<TourTitle>Second</TourTitle>
					</TourHeader>
				</TourStep>
				<TourStep target="#target-3" side={side}>
					<TourHeader>
						<TourTitle>Third</TourTitle>
					</TourHeader>
				</TourStep>
				<TourStep target="#target-4">
					<TourHeader>
						<TourTitle>Fourth</TourTitle>
					</TourHeader>
				</TourStep>
			</TourPortal>
		</Tour>
	);
}

describe("a tour step whose props change", () => {
	it("stays the current step, in its place", () => {
		document.body.replaceChildren(
			...[1, 2, 3, 4].map((n) => {
				const target = document.createElement("div");
				target.id = `target-${n}`;
				return target;
			}),
		);
		const { rerender } = render(<Steps side="top" />);
		expect(screen.getByText("Second")).toBeTruthy();
		rerender(<Steps side="bottom" />);
		const shown = [...document.querySelectorAll('[data-slot="tour-step"]')];
		expect(
			shown.map((step) => step.textContent),
			"the step shown on step 2 after steps 2 and 3 changed side",
		).toEqual(["Second"]);
	});
});
