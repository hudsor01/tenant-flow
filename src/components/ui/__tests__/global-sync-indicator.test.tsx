/**
 * GlobalSyncIndicator: the tooltip trigger is a named, focusable button in both
 * states; the status text is mirrored into one `role="status"` region beside
 * the button (not inside it) that survives the saved/syncing switch; focus
 * opens the tooltip; and the tooltip text is not a `p`, so the 16px
 * `@layer base` paragraph margin cannot pad it.
 *
 * jsdom's accessible-name algorithm counts a `role="status"` descendant's
 * text, which Chrome's does not (`status` is named by its author only), so a
 * name assertion here could not see the empty name the nested region gave the
 * button (66.2-39 fix round 3, F77). The structural assertions below can: the
 * button holds no live region, and its text sits in a role-free span.
 */

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("Saved");
		expect(status).toHaveClass("sr-only");
		expect(trigger.contains(status)).toBe(false);
		expect(trigger.querySelectorAll("[role]")).toHaveLength(0);
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
		expect(trigger.querySelector("span")).toHaveClass("sr-only");
		expect(trigger.querySelector("span")).toHaveTextContent("Saved");
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

	// The trigger runs no action, but Enter and Space fire a click on a native
	// button, and Radix's TooltipTrigger closes the tooltip on click (66.2-39
	// fix round 4, G43).
	it.each([
		["Enter", "{Enter}"],
		["Space", " "],
	])(
		"dismisses the focus-opened tooltip on %s and keeps focus",
		async (_key, press) => {
			const user = userEvent.setup();
			renderIndicator();
			const trigger = screen.getByRole("button", { name: "Saved" });

			await user.tab();
			expect(document.activeElement).toBe(trigger);
			expect(await screen.findByRole("tooltip")).toHaveTextContent(
				"All changes saved to TenantFlow.",
			);

			await user.keyboard(press);

			await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
			expect(document.activeElement).toBe(trigger);
		},
	);
});
