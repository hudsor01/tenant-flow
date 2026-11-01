/**
 * GlobalSyncIndicator: the tooltip trigger is a named, focusable button in both
 * states; the status text lives in one `role="status"` region that survives
 * the saved/syncing switch; focus opens the tooltip; and the tooltip text is
 * not a `p`, so the 16px `@layer base` paragraph margin cannot pad it.
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSyncIndicator } from "#components/ui/global-sync-indicator";
import { TooltipProvider } from "#components/ui/tooltip";

const { mockPending } = vi.hoisted(() => ({
	mockPending: vi.fn(),
}));

vi.mock("#hooks/api/use-pending-mutations", () => ({
	usePendingMutations: () => mockPending(),
}));

const SAVED = { isPending: false, count: 0, operations: [] };

function renderIndicator(compact = false) {
	return render(
		<TooltipProvider delayDuration={0}>
			<GlobalSyncIndicator compact={compact} />
		</TooltipProvider>,
	);
}

beforeEach(() => {
	mockPending.mockReturnValue(SAVED);
});

describe("GlobalSyncIndicator", () => {
	it("names a focusable button trigger 'Saved' and keeps the text in a status region", () => {
		renderIndicator();

		const trigger = screen.getByRole("button", { name: "Saved" });
		expect(trigger).toHaveAttribute("type", "button");
		expect(trigger).not.toBeDisabled();
		trigger.focus();
		expect(document.activeElement).toBe(trigger);
		expect(screen.getByRole("status")).toHaveTextContent("Saved");
	});

	it("announces 'Syncing' through the same status region it rendered while saved", () => {
		const { rerender } = renderIndicator();
		const status = screen.getByRole("status");

		mockPending.mockReturnValue({
			isPending: true,
			count: 2,
			operations: ["Creating property...", "Updating lease..."],
		});
		rerender(
			<TooltipProvider delayDuration={0}>
				<GlobalSyncIndicator />
			</TooltipProvider>,
		);

		expect(screen.getByRole("status")).toBe(status);
		expect(status).toHaveTextContent("Syncing (2)");
		expect(
			screen.getByRole("button", { name: "Syncing (2)" }),
		).not.toBeDisabled();
	});

	it("names the single-mutation syncing state 'Syncing...'", () => {
		mockPending.mockReturnValue({ isPending: true, count: 1, operations: [] });
		renderIndicator();

		expect(screen.getByRole("status")).toHaveTextContent("Syncing...");
		expect(screen.getByRole("button", { name: "Syncing..." })).toBeVisible();
	});

	it("keeps an sr-only name in compact mode", () => {
		renderIndicator(true);

		const trigger = screen.getByRole("button", { name: "Saved" });
		expect(screen.getByRole("status")).toHaveClass("sr-only");
		expect(trigger).toBeInTheDocument();
	});

	it("opens the tooltip on keyboard focus, with no p inside it", async () => {
		renderIndicator();

		const trigger = screen.getByRole("button", { name: "Saved" });
		await act(async () => {
			fireEvent.focus(trigger);
		});

		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveTextContent("All changes saved to TenantFlow.");
		const content = document.querySelector('[data-slot="tooltip-content"]');
		if (content === null) {
			throw new Error("no tooltip content rendered");
		}
		expect(content.querySelectorAll("p")).toHaveLength(0);
	});
});
