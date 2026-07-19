import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationBell } from "../notification-bell";

// vi.hoisted so the mutable unread count + spy can be referenced inside the
// hoisted vi.mock factory below (CLAUDE.md testing rule).
const h = vi.hoisted(() => ({
	count: { current: 0 as number | undefined },
	useUnreadCount: vi.fn(),
}));

// Mock the whole notifications hook module. `useUnreadCount` feeds the badge;
// the popover-list hooks are only exercised when the popover opens (radix
// portals its content on open), which these closed-trigger tests never do.
vi.mock("#hooks/api/use-notifications", () => ({
	useUnreadCount: () => {
		h.useUnreadCount();
		return { data: h.count.current };
	},
	useNotificationList: () => ({
		data: { rows: [], totalCount: 0 },
		isLoading: false,
	}),
	useMarkAllNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
	useMarkNotificationRead: () => ({ mutate: vi.fn() }),
}));

describe("NotificationBell (NOTIF-02)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("caps the badge at '9+' when unread count > 9", () => {
		h.count.current = 15;
		render(<NotificationBell />);
		expect(screen.getByText("9+")).toBeInTheDocument();
	});

	it("shows the exact number for 1-9 unread", () => {
		h.count.current = 5;
		render(<NotificationBell />);
		expect(screen.getByText("5")).toBeInTheDocument();
	});

	it("renders no badge at 0 unread", () => {
		h.count.current = 0;
		render(<NotificationBell />);
		expect(screen.queryByText("0")).not.toBeInTheDocument();
	});

	it("sources the badge from useUnreadCount (60s poll)", () => {
		h.count.current = 3;
		render(<NotificationBell />);
		expect(h.useUnreadCount).toHaveBeenCalled();
	});

	it("aria-label is 'Notifications' at 0 unread", () => {
		h.count.current = 0;
		render(<NotificationBell />);
		expect(
			screen.getByRole("button", { name: "Notifications" }),
		).toBeInTheDocument();
	});

	it("aria-label is 'Notifications, {n} unread' when unread > 0", () => {
		h.count.current = 7;
		render(<NotificationBell />);
		expect(
			screen.getByRole("button", { name: "Notifications, 7 unread" }),
		).toBeInTheDocument();
	});
});
