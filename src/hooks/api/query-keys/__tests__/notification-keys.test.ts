/**
 * notificationQueries + mapNotificationRow unit tests
 *
 * Pins the NOTIF-02 / NOTIF-03 data-layer invariants:
 *   (a) mapNotificationRow throws on missing NOT NULL fields
 *       (id / title / notification_type / user_id) and returns null for the
 *       six nullable columns — the typed PostgREST boundary mapper
 *       (CLAUDE.md rule #8: no `as unknown as`).
 *   (b) the unread-count query is a HEAD count:exact query (zero rows
 *       transferred) polled at 60s, scoped to the current user + is_read=false.
 *   (c) every list path is bounded (`.limit()` for the popover,
 *       `.range()` + `{ count: 'exact' }` for the inbox page) and ordered
 *       created_at desc — never `data.length` for counting.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockSelect, mockEq, mockOrder, mockLimit, mockRange } =
	vi.hoisted(() => ({
		mockFrom: vi.fn(),
		mockSelect: vi.fn(),
		mockEq: vi.fn(),
		mockOrder: vi.fn(),
		mockLimit: vi.fn(),
		mockRange: vi.fn(),
	}));

const { mockGetCachedUser } = vi.hoisted(() => ({
	mockGetCachedUser: vi.fn(),
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ from: mockFrom }),
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: mockGetCachedUser,
}));

vi.mock("#lib/postgrest-error-handler", () => ({
	handlePostgrestError: vi.fn(),
}));

import {
	mapNotificationRow,
	notificationKeys,
	notificationQueries,
} from "../notification-keys";

const fullRow = {
	id: "00000000-0000-0000-0000-000000000001",
	user_id: "00000000-0000-0000-0000-000000000002",
	notification_type: "maintenance",
	title: "New maintenance request",
	message: "A tenant submitted a request",
	entity_type: "maintenance_request",
	entity_id: "00000000-0000-0000-0000-000000000003",
	action_url: "/maintenance/00000000-0000-0000-0000-000000000003",
	is_read: false,
	read_at: null,
	created_at: "2026-07-19T00:00:00Z",
};

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCachedUser.mockResolvedValue({ id: "user-1" });
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("mapNotificationRow", () => {
	it("maps a full row through unchanged", () => {
		const mapped = mapNotificationRow(fullRow);
		expect(mapped.id).toBe(fullRow.id);
		expect(mapped.user_id).toBe(fullRow.user_id);
		expect(mapped.notification_type).toBe("maintenance");
		expect(mapped.title).toBe("New maintenance request");
		expect(mapped.is_read).toBe(false);
	});

	it("throws on each NOT NULL field independently", () => {
		for (const field of [
			"id",
			"user_id",
			"notification_type",
			"title",
		] as const) {
			const broken = { ...fullRow, [field]: undefined };
			expect(
				() => mapNotificationRow(broken),
				`expected throw when ${field} is missing`,
			).toThrowError(new RegExp(`'${field}'`));
		}
	});

	it("returns null for the six nullable fields when absent", () => {
		const mapped = mapNotificationRow({
			...fullRow,
			message: null,
			entity_type: null,
			entity_id: null,
			action_url: null,
			read_at: null,
			created_at: null,
			// is_read is nullable too; assert it coerces null through
			is_read: null,
		});
		expect(mapped.message).toBeNull();
		expect(mapped.entity_type).toBeNull();
		expect(mapped.entity_id).toBeNull();
		expect(mapped.action_url).toBeNull();
		expect(mapped.read_at).toBeNull();
		expect(mapped.created_at).toBeNull();
		expect(mapped.is_read).toBeNull();
	});
});

describe("notificationKeys", () => {
	it("exposes a stable `all` root array for invalidation", () => {
		expect(notificationKeys.all).toEqual(["notifications"]);
	});

	it("derives unreadCount / lists / list keys from the root", () => {
		expect(notificationKeys.unreadCount()).toEqual([
			"notifications",
			"unread-count",
		]);
		expect(notificationKeys.lists()).toEqual(["notifications", "list"]);
		expect(notificationKeys.list({ limit: 10 })[0]).toBe("notifications");
	});
});

describe("notificationQueries.unreadCount", () => {
	it("polls at 60s (refetchInterval === 60000) and is always stale", () => {
		const opts = notificationQueries.unreadCount();
		expect(opts.refetchInterval).toBe(60_000);
		expect(opts.staleTime).toBe(0);
	});

	it("issues a HEAD count:exact query scoped to the user + is_read=false", async () => {
		// Chain: from → select → eq(user) → eq(is_read) [resolved value carries
		// the second .eq back so both calls hit the same mock].
		const resolved = { eq: mockEq, count: 4, error: null };
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ eq: mockEq });
		mockEq.mockReturnValue(resolved);

		const count = await notificationQueries
			.unreadCount()
			.queryFn?.({} as never);

		expect(mockFrom).toHaveBeenCalledWith("notifications");
		expect(mockSelect).toHaveBeenCalledWith("*", {
			count: "exact",
			head: true,
		});
		expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
		expect(mockEq).toHaveBeenCalledWith("is_read", false);
		expect(count).toBe(4);
	});

	it("returns 0 when the count is null", async () => {
		const resolved = { eq: mockEq, count: null, error: null };
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ eq: mockEq });
		mockEq.mockReturnValue(resolved);

		const count = await notificationQueries
			.unreadCount()
			.queryFn?.({} as never);
		expect(count).toBe(0);
	});
});

describe("notificationQueries.list", () => {
	it("popover default applies .limit(10) + .order('created_at', desc)", async () => {
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ eq: mockEq });
		mockEq.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ limit: mockLimit, range: mockRange });
		mockLimit.mockResolvedValue({ data: [fullRow], error: null, count: 1 });

		const result = await notificationQueries.list().queryFn?.({} as never);

		expect(mockFrom).toHaveBeenCalledWith("notifications");
		expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
		expect(mockOrder).toHaveBeenCalledWith("created_at", {
			ascending: false,
		});
		expect(mockLimit).toHaveBeenCalledWith(10);
		expect(mockRange).not.toHaveBeenCalled();
		expect(result?.rows).toHaveLength(1);
		expect(result?.totalCount).toBe(1);
	});

	it("respects an explicit limit", async () => {
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ eq: mockEq });
		mockEq.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ limit: mockLimit, range: mockRange });
		mockLimit.mockResolvedValue({ data: [], error: null, count: 0 });

		await notificationQueries.list({ limit: 5 }).queryFn?.({} as never);
		expect(mockLimit).toHaveBeenCalledWith(5);
	});

	it("paginated page applies .range(from,to) + { count: 'exact' }", async () => {
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ eq: mockEq });
		mockEq.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ limit: mockLimit, range: mockRange });
		mockRange.mockResolvedValue({
			data: [fullRow, fullRow],
			error: null,
			count: 42,
		});

		const result = await notificationQueries
			.list({ from: 0, to: 9 })
			.queryFn?.({} as never);

		expect(mockSelect).toHaveBeenCalledWith(
			"id,user_id,notification_type,title,message,entity_type,entity_id,action_url,is_read,read_at,created_at",
			{ count: "exact" },
		);
		expect(mockRange).toHaveBeenCalledWith(0, 9);
		expect(mockLimit).not.toHaveBeenCalled();
		expect(result?.totalCount).toBe(42);
		expect(result?.rows).toHaveLength(2);
	});

	it("falls back to totalCount 0 (not rows.length) when the count header is null", async () => {
		mockFrom.mockReturnValue({ select: mockSelect });
		mockSelect.mockReturnValue({ eq: mockEq });
		mockEq.mockReturnValue({ order: mockOrder });
		mockOrder.mockReturnValue({ limit: mockLimit, range: mockRange });
		mockLimit.mockResolvedValue({
			data: [fullRow, fullRow],
			error: null,
			count: null,
		});

		const result = await notificationQueries.list().queryFn?.({} as never);

		// Convention parity with every other list factory (S1): a null count
		// header resolves to 0, never the loaded slice length.
		expect(result?.rows).toHaveLength(2);
		expect(result?.totalCount).toBe(0);
	});
});
