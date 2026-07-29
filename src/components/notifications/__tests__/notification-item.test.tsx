import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationRow } from "#hooks/api/query-keys/notification-keys";
import { NotificationBell } from "../notification-bell";
import { NotificationItem } from "../notification-item";

// vi.hoisted so the mark-read spy + the popover query state can be referenced
// inside the hoisted vi.mock factory (CLAUDE.md testing rule).
const h = vi.hoisted(() => ({
	markRead: vi.fn(),
	count: { current: 0 as number | undefined },
	listData: {
		current: {
			rows: [] as NotificationRow[],
			totalCount: 0,
		},
	},
}));

// Mock the whole notifications hook module. `useMarkNotificationRead` is the
// click-through write path under test; the remaining hooks are only exercised
// by the NotificationBell popover open/close case (D-10).
vi.mock("#hooks/api/use-notifications", () => ({
	useMarkNotificationRead: () => ({ mutate: h.markRead }),
	useUnreadCount: () => ({ data: h.count.current }),
	useNotificationList: () => ({
		data: h.listData.current,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	}),
	useMarkAllNotificationsRead: () => ({ mutate: vi.fn(), isPending: false }),
}));

function makeRow(overrides: Partial<NotificationRow> = {}): NotificationRow {
	return {
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
		...overrides,
	};
}

describe("NotificationItem click-through (D-03/D-10)", () => {
	beforeEach(() => {
		h.markRead.mockClear();
	});

	it("marks an unread row read with its id and navigates to the resolved href", async () => {
		const user = userEvent.setup();
		const onNavigate = vi.fn();
		render(
			<ul>
				<NotificationItem
					notification={makeRow({ is_read: false })}
					onNavigate={onNavigate}
				/>
			</ul>,
		);

		const link = screen.getByRole("link", { name: /Lease signed/ });
		// Navigation target is the resolved (open-redirect-guarded) href.
		expect(link).toHaveAttribute("href", "/leases/l1");

		await user.click(link);

		expect(h.markRead).toHaveBeenCalledTimes(1);
		expect(h.markRead).toHaveBeenCalledWith("n1");
		// Click-through still closes the containing popover (S1).
		expect(onNavigate).toHaveBeenCalledTimes(1);
	});

	it("does not mark an already-read row read but still navigates", async () => {
		const user = userEvent.setup();
		const onNavigate = vi.fn();
		render(
			<ul>
				<NotificationItem
					notification={makeRow({ is_read: true })}
					onNavigate={onNavigate}
				/>
			</ul>,
		);

		const link = screen.getByRole("link", { name: /Lease signed/ });
		expect(link).toHaveAttribute("href", "/leases/l1");

		await user.click(link);

		expect(h.markRead).not.toHaveBeenCalled();
		expect(onNavigate).toHaveBeenCalledTimes(1);
	});
});

describe("NotificationBell popover open/close never marks read (D-10)", () => {
	beforeEach(() => {
		h.markRead.mockClear();
		h.count.current = 1;
		h.listData.current = {
			rows: [makeRow({ is_read: false })],
			totalCount: 1,
		};
	});

	it("opening then dismissing the popover triggers no mark-read", async () => {
		const user = userEvent.setup();
		render(<NotificationBell />);

		// Open the popover — the unread row renders but is never clicked.
		await user.click(
			screen.getByRole("button", { name: "Notifications, 1 unread" }),
		);
		expect(
			await screen.findByRole("link", { name: /Lease signed/ }),
		).toBeInTheDocument();

		// Dismiss via Escape (close, not click-through).
		await user.keyboard("{Escape}");
		await waitFor(() => {
			expect(
				screen.queryByRole("link", { name: /Lease signed/ }),
			).not.toBeInTheDocument();
		});

		// D-10: neither opening nor closing may mark anything read.
		expect(h.markRead).not.toHaveBeenCalled();
	});
});
