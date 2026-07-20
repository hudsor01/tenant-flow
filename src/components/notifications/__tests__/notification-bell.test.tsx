import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationBell } from "../notification-bell";

// vi.hoisted so the mutable unread count + list data + spy can be referenced
// inside the hoisted vi.mock factory below (CLAUDE.md testing rule).
const h = vi.hoisted(() => ({
	count: { current: 0 as number | undefined },
	listData: {
		current: {
			rows: [] as Array<Record<string, unknown>>,
			totalCount: 0,
		},
	},
	useUnreadCount: vi.fn(),
}));

// Mock the whole notifications hook module. `useUnreadCount` feeds the badge;
// the popover-list hooks are exercised once the popover opens (radix portals
// its content on open — jsdom pointer-capture is polyfilled in unit-setup).
vi.mock("#hooks/api/use-notifications", () => ({
	useUnreadCount: () => {
		h.useUnreadCount();
		return { data: h.count.current };
	},
	useNotificationList: () => ({
		data: h.listData.current,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	}),
	useMarkAllNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
	useMarkNotificationRead: () => ({ mutate: vi.fn() }),
}));

const sampleRow = {
	id: "n1",
	user_id: "u1",
	notification_type: "lease_signed",
	title: "Lease signed",
	message: "123 Main St",
	entity_type: "lease",
	entity_id: "l1",
	action_url: "/leases/l1",
	is_read: false,
	read_at: null,
	created_at: new Date().toISOString(),
};

describe("NotificationBell (NOTIF-02)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		h.count.current = 0;
		h.listData.current = { rows: [], totalCount: 0 };
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

	// S1: the popover is controlled by the bell and closes on navigation.
	it("opens the popover on trigger click", async () => {
		const user = userEvent.setup();
		render(<NotificationBell />);
		await user.click(screen.getByRole("button", { name: "Notifications" }));
		expect(
			await screen.findByRole("link", { name: "View all notifications" }),
		).toBeInTheDocument();
	});

	it("closes the popover when 'View all notifications' is clicked", async () => {
		const user = userEvent.setup();
		render(<NotificationBell />);
		await user.click(screen.getByRole("button", { name: "Notifications" }));
		const viewAll = await screen.findByRole("link", {
			name: "View all notifications",
		});
		await user.click(viewAll);
		await waitFor(() => {
			expect(
				screen.queryByRole("link", { name: "View all notifications" }),
			).not.toBeInTheDocument();
		});
	});

	it("closes the popover when a notification row is clicked", async () => {
		const user = userEvent.setup();
		h.count.current = 1;
		h.listData.current = { rows: [sampleRow], totalCount: 1 };
		render(<NotificationBell />);
		await user.click(
			screen.getByRole("button", { name: "Notifications, 1 unread" }),
		);
		const row = await screen.findByRole("link", { name: /Lease signed/ });
		await user.click(row);
		await waitFor(() => {
			expect(
				screen.queryByRole("link", { name: /Lease signed/ }),
			).not.toBeInTheDocument();
		});
	});
});
