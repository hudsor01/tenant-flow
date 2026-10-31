/**
 * Pins tour step 5 to the sidebar state (D-39, ledger S7, VD-36). The rail is
 * the target only when it is docked and expanded; a sheet or a collapsed rail
 * sends the step to the header trigger, and the copy follows the target rather
 * than the tour's own below-768px width flag. Steps 1-4 and the step count are
 * pinned too, so stored tour progress stays valid.
 */
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SidebarTourTargetInput } from "#components/tours/sidebar-tour-target";

const sidebarMock = vi.hoisted(() => ({
	value: { isMobile: false, state: "expanded" } as SidebarTourTargetInput,
}));

vi.mock("#components/ui/sidebar", () => ({
	useSidebar: () => sidebarMock.value,
}));

vi.mock("#hooks/api/use-tour-progress", () => ({
	getTourProgress: vi.fn().mockResolvedValue({ status: "completed" }),
	updateTourProgress: vi.fn().mockResolvedValue(undefined),
}));

interface StubProps {
	children?: ReactNode;
	target?: string;
	side?: string;
	className?: string;
}

vi.mock("#components/ui/tour", () => {
	const Passthrough = ({ children }: StubProps) => <>{children}</>;
	const Nothing = (_props: StubProps) => null;
	return {
		Tour: Passthrough,
		TourPortal: Passthrough,
		TourHeader: Passthrough,
		TourFooter: Passthrough,
		TourStep: ({ children, target, side }: StubProps) => (
			<div data-testid="tour-step" data-target={target} data-side={side}>
				{children}
			</div>
		),
		TourTitle: ({ children }: StubProps) => <h2>{children}</h2>,
		TourDescription: ({ children, className }: StubProps) => (
			<p data-testid="tour-description" className={className}>
				{children}
			</p>
		),
		TourClose: Nothing,
		TourArrow: Nothing,
		TourSpotlight: Nothing,
		TourSkip: Nothing,
		TourPrev: Nothing,
		TourNext: Nothing,
		TourStepCounter: Nothing,
	};
});

import { OwnerOnboardingTour } from "../owner-onboarding-tour";

const TRIGGER_COPY =
	"Access Properties, Tenants, Leases, and more from the menu.";
const RAIL_COPY =
	"Use the sidebar to access Properties, Tenants, Leases, Maintenance, Documents, Analytics, and Reports. You're all set to manage your properties!";

async function renderSteps(input: SidebarTourTargetInput) {
	sidebarMock.value = input;
	render(<OwnerOnboardingTour />);
	return screen.findAllByTestId("tour-step");
}

describe("OwnerOnboardingTour step 5 (D-39)", () => {
	beforeEach(() => {
		sidebarMock.value = { isMobile: false, state: "expanded" };
	});

	it("targets the rail on the right with the desktop copy when docked and expanded", async () => {
		const steps = await renderSteps({ isMobile: false, state: "expanded" });
		const step = steps[4]!;
		expect(step).toHaveAttribute("data-target", "[data-tour='sidebar-nav']");
		expect(step).toHaveAttribute("data-side", "right");
		const description = within(step).getByTestId("tour-description");
		expect(description).toHaveTextContent(RAIL_COPY);
		expect(step).not.toHaveTextContent(TRIGGER_COPY);
	});

	it("targets the trigger below with the menu copy when the docked rail is collapsed", async () => {
		const steps = await renderSteps({ isMobile: false, state: "collapsed" });
		const step = steps[4]!;
		expect(step).toHaveAttribute(
			"data-target",
			"[data-tour='sidebar-trigger']",
		);
		expect(step).toHaveAttribute("data-side", "bottom");
		expect(within(step).getByTestId("tour-description")).toHaveTextContent(
			TRIGGER_COPY,
		);
	});

	it("keys the copy on the target, not the width flag, when the sidebar is a sheet", async () => {
		expect(window.innerWidth).toBeGreaterThanOrEqual(768);
		const steps = await renderSteps({ isMobile: true, state: "expanded" });
		const step = steps[4]!;
		expect(step).toHaveAttribute(
			"data-target",
			"[data-tour='sidebar-trigger']",
		);
		expect(step).toHaveAttribute("data-side", "bottom");
		const description = within(step).getByTestId("tour-description");
		expect(description).toHaveTextContent(TRIGGER_COPY);
		expect(description.className).toBe("");
	});

	it("keeps steps 1-4, the step count and the step-5 title", async () => {
		const steps = await renderSteps({ isMobile: false, state: "expanded" });
		expect(steps).toHaveLength(5);
		expect(
			steps.slice(0, 4).map((step) => step.getAttribute("data-target")),
		).toEqual([
			"[data-testid='dashboard-stats']",
			"[data-tour='trends-section']",
			"[data-tour='quick-actions']",
			"[data-tour='charts-section']",
		]);
		expect(
			within(steps[4]!).getByRole("heading", { level: 2 }),
		).toHaveTextContent("Navigate Your Portal");
	});
});
