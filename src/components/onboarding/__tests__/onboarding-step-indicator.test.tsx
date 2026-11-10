/**
 * The onboarding step indicator (66.2-39 fix round 1, part F). It renders only
 * on the property step, the one step between welcome and complete, so it is a
 * single current bar. The completed (`bg-primary/50`, 2.16:1 on the light
 * popover) and upcoming (`bg-muted`) bars it used to branch to could not
 * render, and are gone.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "#test/utils/test-render";
import { OnboardingWizard } from "../onboarding-wizard";

vi.mock("../use-onboarding", () => ({
	useOnboarding: () => ({
		showWizard: true,
		isLoading: false,
		completeOnboarding: vi.fn(),
		skipOnboarding: vi.fn(),
	}),
}));

vi.mock("#hooks/api/use-property-mutations", () => ({
	useCreatePropertyMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const SOURCE = readFileSync(
	resolve(process.cwd(), "src/components/onboarding/onboarding-wizard.tsx"),
	"utf8",
);

describe("onboarding step indicator", () => {
	it("shows no indicator on the welcome step", () => {
		render(<OnboardingWizard />);
		expect(screen.queryByRole("group", { name: "Setup progress" })).toBeNull();
	});

	it("draws one current bar on the property step", () => {
		render(<OnboardingWizard />);
		fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
		const group = screen.getByRole("group", { name: "Setup progress" });
		expect(group.children).toHaveLength(1);
		const bar = group.children[0];
		expect(bar).toHaveAttribute("title", "Add Property");
		expect(bar).toHaveClass("h-1.5", "w-6", "rounded-full", "bg-primary");
	});

	it("carries no completed or upcoming bar it cannot render", () => {
		expect(SOURCE).not.toContain("bg-primary/50");
		expect(SOURCE).not.toMatch(/\bisCompleted\b/);
		expect(SOURCE).not.toMatch(/displaySteps/);
	});
});
