import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationPopoverList } from "../notification-popover-list";

// vi.hoisted so the mutable query state + refetch spy can be referenced inside
// the hoisted vi.mock factory below (CLAUDE.md testing rule).
const h = vi.hoisted(() => ({
	isError: { current: false },
	rows: { current: [] as Array<Record<string, unknown>> },
	unreadCount: { current: 0 },
	refetch: vi.fn(),
	markAll: vi.fn(),
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
	useUnreadCount: () => ({ data: h.unreadCount.current }),
	useMarkAllNotificationsRead: () => ({ mutate: h.markAll, isPending: false }),
	useMarkNotificationRead: () => ({ mutate: vi.fn() }),
}));

// A fully-populated read row (is_read: true) so a rendered NotificationItem
// never hits Invalid-Date / missing-field paths while we assert the header
// Mark-all-read disabled state, which is driven purely by the unread count.
function makeReadRow(id: string): Record<string, unknown> {
	return {
		id,
		user_id: "u1",
		notification_type: "lease_signed",
		title: "Lease signed",
		message: "123 Main St",
		entity_type: "lease",
		entity_id: "l1",
		action_url: "/leases/l1",
		is_read: true,
		read_at: new Date().toISOString(),
		created_at: new Date().toISOString(),
	};
}

describe("NotificationPopoverList error state (C11)", () => {
	beforeEach(() => {
		h.isError.current = false;
		h.rows.current = [];
		h.unreadCount.current = 0;
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

describe("NotificationPopoverList Mark-all-read disabled state (WR-01)", () => {
	beforeEach(() => {
		h.isError.current = false;
		// The visible slice is all-read on purpose: the disabled state must key
		// off the header unread count, never the loaded top-10.
		h.rows.current = Array.from({ length: 10 }, (_, i) => makeReadRow(`n${i}`));
		h.unreadCount.current = 0;
		h.refetch.mockClear();
	});

	it("disables Mark-all-read when the header unread count is 0", () => {
		h.unreadCount.current = 0;
		render(<NotificationPopoverList />);
		expect(
			screen.getByRole("button", { name: "Mark all read" }),
		).toBeDisabled();
	});

	it("enables Mark-all-read when unread count > 0 even though every visible row is read", () => {
		// Older unread rows exist outside the top-10 window; the badge count is
		// nonzero so the control must be actionable (WR-01 regression pin).
		h.unreadCount.current = 3;
		render(<NotificationPopoverList />);
		expect(
			screen.getByRole("button", { name: "Mark all read" }),
		).not.toBeDisabled();
	});

	it("clicking Mark-all-read fires the mark-all mutation exactly once", async () => {
		const user = userEvent.setup();
		h.unreadCount.current = 3;
		h.markAll.mockClear();
		render(<NotificationPopoverList />);

		await user.click(screen.getByRole("button", { name: "Mark all read" }));
		expect(h.markAll).toHaveBeenCalledTimes(1);
	});
});
