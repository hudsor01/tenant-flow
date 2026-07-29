/**
 * In-app notification hooks (NOTIF-03).
 *
 * Read hooks (`useUnreadCount`, `useNotificationList`) are thin wrappers over
 * `notificationQueries` (notification-keys.ts). Mutation hooks flip
 * `is_read`/`read_at` and invalidate the notification keys AND
 * `ownerDashboardKeys.all` per the CLAUDE.md mutation-invalidation mandate.
 *
 * Column trap: the DB column is `is_read` (NOT `read`). The write path must
 * always use `is_read` — see the regression pin in use-notifications.test.ts.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMutationCallbacks } from "#hooks/create-mutation-callbacks";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { mutationKeys } from "./mutation-keys";
import {
	notificationKeys,
	notificationQueries,
} from "./query-keys/notification-keys";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";

// Both mutations invalidate the notification domain (list + unread badge) and
// the owner dashboard (activity feed / KPIs read the same rows).
const NOTIFICATION_INVALIDATION = [
	notificationKeys.all,
	ownerDashboardKeys.all,
] as const;

async function markNotificationRead(id: string): Promise<void> {
	const supabase = createClient();
	const user = await getCachedUser();
	if (!user) throw new Error("Not authenticated");

	const { error } = await supabase
		.from("notifications")
		.update({ is_read: true, read_at: new Date().toISOString() })
		.eq("id", id);

	if (error) handlePostgrestError(error, "notifications");
}

async function markAllNotificationsRead(): Promise<void> {
	const supabase = createClient();
	const user = await getCachedUser();
	if (!user) throw new Error("Not authenticated");

	const { error } = await supabase
		.from("notifications")
		.update({ is_read: true, read_at: new Date().toISOString() })
		.eq("user_id", user.id)
		.eq("is_read", false);

	if (error) handlePostgrestError(error, "notifications");
}

/** Marks a single notification read (D-03/D-10 row-click + navigate). */
export function useMarkNotificationRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: mutationKeys.notifications.markRead,
		mutationFn: markNotificationRead,
		...createMutationCallbacks<void, string>(queryClient, {
			invalidate: NOTIFICATION_INVALIDATION,
			errorContext: "Mark notification read",
		}),
	});
}

/** Marks every unread notification for the current user read. */
export function useMarkAllNotificationsRead() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: mutationKeys.notifications.markAllRead,
		mutationFn: markAllNotificationsRead,
		...createMutationCallbacks<void, void>(queryClient, {
			invalidate: NOTIFICATION_INVALIDATION,
			successMessage: "All notifications marked as read",
			errorContext: "Mark all notifications read",
		}),
	});
}

/** Bounded inbox list — popover (`.limit`) or paginated page (`.range`). */
export function useNotificationList(opts?: {
	limit?: number;
	from?: number;
	to?: number;
}) {
	return useQuery(notificationQueries.list(opts));
}

/** Unread badge source — 60s HEAD count poll. */
export function useUnreadCount() {
	return useQuery(notificationQueries.unreadCount());
}
