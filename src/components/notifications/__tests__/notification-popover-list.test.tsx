import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationPopoverList } from "../notification-popover-list";

// vi.hoisted so the mutable query state + refetch spy can be referenced inside
// the hoisted vi.mock factory below (CLAUDE.md testing rule).
const h = vi.hoisted(() => ({
	isError: { current: false },
	rows: { current: [] as Array<Record<string, unknown>> },
	refetch: vi.fn(),
}));

vi.mock("#hooks/api/use-notifications", () => ({
	useNotificationList: () => ({
		data: h.isError.current
			? undefined
			: { rows: h.rows.current, totalCount: h.rows.current.length },
		isLoading: false,
		isError: h.isError.current,
		refetch: h.refetch,
	}),
	useUnreadCount: () => ({ data: 0 }),
	useMarkAllNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
	useMarkNotificationRead: () => ({ mutate: vi.fn() }),
}));

describe("NotificationPopoverList error state (C11)", () => {
	beforeEach(() => {
		h.isError.current = false;
		h.rows.current = [];
		h.refetch.mockClear();
	});

	it("renders the error branch with a Retry action when the query fails", async () => {
		const user = userEvent.setup();
		h.isError.current = true;
		render(<NotificationPopoverList />);

		expect(
			screen.getByText("Couldn't load notifications."),
		).toBeInTheDocument();
		// The failed query must NOT fall through to the caught-up empty state.
		expect(screen.queryByText("You're all caught up")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Retry" }));
		expect(h.refetch).toHaveBeenCalledTimes(1);
	});

	it("shows the caught-up empty state when the query succeeds with no rows", () => {
		render(<NotificationPopoverList />);
		expect(screen.getByText("You're all caught up")).toBeInTheDocument();
		expect(
			screen.queryByText("Couldn't load notifications."),
		).not.toBeInTheDocument();
	});
});
