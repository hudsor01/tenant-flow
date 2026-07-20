import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationsInboxClient } from "../notifications-inbox.client";

// vi.hoisted so the mutable list/unread state can be referenced inside the
// hoisted vi.mock factory below (CLAUDE.md testing rule). Mutating
// `h.list.current` between renders simulates a retention/delete refetch.
const h = vi.hoisted(() => ({
	list: {
		current: {
			rows: [] as Array<Record<string, unknown>>,
			totalCount: 0,
		},
	},
	unread: { current: 0 },
	markAll: vi.fn(),
}));

vi.mock("#hooks/api/use-notifications", () => ({
	useNotificationList: () => ({
		data: h.list.current,
		isLoading: false,
		isError: false,
		refetch: vi.fn(),
	}),
	useUnreadCount: () => ({ data: h.unread.current }),
	useMarkAllNotificationsRead: () => ({ mutate: h.markAll, isPending: false }),
	useMarkNotificationRead: () => ({ mutate: vi.fn() }),
}));

function makeRows(n: number): Array<Record<string, unknown>> {
	return Array.from({ length: n }, (_, i) => ({
		id: `n${i}`,
		user_id: "u1",
		notification_type: "lease_signed",
		title: `Notification ${i}`,
		message: null,
		entity_type: null,
		entity_id: null,
		action_url: null,
		is_read: true,
		read_at: null,
		created_at: new Date().toISOString(),
	}));
}

describe("NotificationsInboxClient pagination clamp (C2)", () => {
	beforeEach(() => {
		h.list.current = { rows: [], totalCount: 0 };
		h.unread.current = 0;
	});

	it("clamps the page back into range when the total count shrinks", async () => {
		const user = userEvent.setup();
		// 5 full pages (100 rows total) — Next is enabled. rows.length is
		// irrelevant to pagination (driven by header totalCount), so 2 rows keep
		// the list branch rendered without mounting 100 items.
		h.list.current = { rows: makeRows(2), totalCount: 100 };
		const { rerender } = render(<NotificationsInboxClient />);
		expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();

		// Walk forward to page 3 of 5.
		await user.click(screen.getByRole("button", { name: "Next" }));
		await user.click(screen.getByRole("button", { name: "Next" }));
		expect(screen.getByText("Page 3 of 5")).toBeInTheDocument();

		// Retention cleanup shrinks the total to 2 pages while the user sits on 3.
		h.list.current = { rows: makeRows(2), totalCount: 25 };
		rerender(<NotificationsInboxClient />);

		// The clamp effect snaps back to the last valid page (page 2 of 2)
		// instead of stranding the user on an out-of-range empty page.
		expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
	});

	it("leaves an in-range page untouched", () => {
		h.list.current = { rows: makeRows(2), totalCount: 40 };
		render(<NotificationsInboxClient />);
		expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
	});

	it("clicking Mark all read fires the mark-all mutation exactly once", async () => {
		const user = userEvent.setup();
		h.list.current = { rows: makeRows(2), totalCount: 2 };
		h.unread.current = 2;
		h.markAll.mockClear();
		render(<NotificationsInboxClient />);

		await user.click(screen.getByRole("button", { name: "Mark all read" }));
		expect(h.markAll).toHaveBeenCalledTimes(1);
	});
});
