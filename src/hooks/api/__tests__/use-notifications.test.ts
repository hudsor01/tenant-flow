/**
 * use-notifications mutation-hook tests (NOTIF-03).
 *
 * Pins:
 *   (a) useMarkNotificationRead updates { is_read, read_at } for one id via
 *       .eq('id', id) and invalidates notificationKeys.all + ownerDashboardKeys.all.
 *   (b) useMarkAllNotificationsRead scopes to the current user's unread rows
 *       (.eq('user_id').eq('is_read', false)) and invalidates the same keys.
 *   (c) REGRESSION PIN: the update payload uses `is_read` — NOT a bare `read`
 *       key (the column is `is_read`; the old notifications.rls.test.ts used
 *       the non-existent `read` column).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockUpdate, mockEq, mockGetCachedUser } = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockUpdate: vi.fn(),
	mockEq: vi.fn(),
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
	useMarkAllNotificationsRead,
	useMarkNotificationRead,
} from "../use-notifications";

function makeHarness() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
	return { queryClient, invalidateSpy, wrapper };
}

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCachedUser.mockResolvedValue({ id: "user-1" });
	// Chain: from → update → eq (resolved value carries .eq back so the
	// mark-all two-.eq chain lands on the same mock).
	const resolved = { eq: mockEq, error: null };
	mockFrom.mockReturnValue({ update: mockUpdate });
	mockUpdate.mockReturnValue({ eq: mockEq });
	mockEq.mockReturnValue(resolved);
});

afterEach(() => {
	vi.resetAllMocks();
});

describe("useMarkNotificationRead", () => {
	it("updates { is_read, read_at } for one id via .eq('id', id)", async () => {
		const { invalidateSpy, wrapper } = makeHarness();
		const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

		result.current.mutate("notif-1");
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockFrom).toHaveBeenCalledWith("notifications");
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				is_read: true,
				read_at: expect.any(String),
			}),
		);
		expect(mockEq).toHaveBeenCalledWith("id", "notif-1");

		// Invalidation contract: notificationKeys.all + ownerDashboardKeys.all.
		const invalidatedKeys = invalidateSpy.mock.calls.map(
			(call) => call[0]?.queryKey,
		);
		expect(invalidatedKeys).toContainEqual(["notifications"]);
		expect(invalidatedKeys).toContainEqual(["owner-dashboard"]);
	});

	it("REGRESSION: does NOT send a bare `read` key (column is is_read)", async () => {
		const { wrapper } = makeHarness();
		const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

		result.current.mutate("notif-1");
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockUpdate.mock.calls[0]?.[0]).not.toHaveProperty("read");
	});
});

describe("useMarkAllNotificationsRead", () => {
	it("scopes to the current user's unread rows and invalidates keys", async () => {
		const { invalidateSpy, wrapper } = makeHarness();
		const { result } = renderHook(() => useMarkAllNotificationsRead(), {
			wrapper,
		});

		result.current.mutate();
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockFrom).toHaveBeenCalledWith("notifications");
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ is_read: true, read_at: expect.any(String) }),
		);
		expect(mockEq).toHaveBeenCalledWith("user_id", "user-1");
		expect(mockEq).toHaveBeenCalledWith("is_read", false);

		const invalidatedKeys = invalidateSpy.mock.calls.map(
			(call) => call[0]?.queryKey,
		);
		expect(invalidatedKeys).toContainEqual(["notifications"]);
		expect(invalidatedKeys).toContainEqual(["owner-dashboard"]);
	});

	it("REGRESSION: does NOT send a bare `read` key (column is is_read)", async () => {
		const { wrapper } = makeHarness();
		const { result } = renderHook(() => useMarkAllNotificationsRead(), {
			wrapper,
		});

		result.current.mutate();
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockUpdate.mock.calls[0]?.[0]).not.toHaveProperty("read");
	});
});
