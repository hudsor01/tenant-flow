import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "#components/ui/tooltip";

function renderOpenTooltip() {
	return render(
		<TooltipProvider>
			<Tooltip defaultOpen>
				<TooltipTrigger>Trigger</TooltipTrigger>
				<TooltipContent>Tip body</TooltipContent>
			</Tooltip>
		</TooltipProvider>,
	);
}

describe("Tooltip (new-york-v4)", () => {
	it("throws outside a provider, so there is no self-wrap", () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		try {
			expect(() =>
				renderToStaticMarkup(
					<Tooltip>
						<TooltipTrigger>Trigger</TooltipTrigger>
						<TooltipContent>Tip body</TooltipContent>
					</Tooltip>,
				),
			).toThrow(/must be used within/);
		} finally {
			consoleError.mockRestore();
		}
	});

	it("renders the content and arrow with the upstream class tokens", () => {
		renderOpenTooltip();

		const content = document.querySelector('[data-slot="tooltip-content"]');
		expect(content).not.toBeNull();
		const contentClasses = Array.from(content?.classList ?? []);
		for (const token of [
			"origin-(--radix-tooltip-content-transform-origin)",
			"bg-foreground",
			"text-background",
			"text-balance",
			"z-50",
		]) {
			expect(contentClasses).toContain(token);
		}

		const arrow = content?.querySelector(".fill-foreground");
		expect(arrow).not.toBeNull();
		const arrowClasses = Array.from(arrow?.classList ?? []);
		expect(arrowClasses).toContain("translate-y-[calc(-50%_-_2px)]");
		expect(arrowClasses).toContain("fill-foreground");
	});

	it("marks the trigger with the tooltip-trigger data-slot", () => {
		renderOpenTooltip();

		expect(screen.getByText("Trigger")).toHaveAttribute(
			"data-slot",
			"tooltip-trigger",
		);
	});
});
