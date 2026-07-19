/**
 * In-app Notification query keys, options & typed row mapper.
 *
 * Surfaces the already-provisioned `notifications` table (NOTIF-02/03) to the
 * bell (Plan 05) and the inbox page (Plan 06). Two read paths:
 *
 *  - `unreadCount()` — a HEAD `count: 'exact'` query (zero rows transferred)
 *    scoped to the current user + `is_read = false`, polled every 60s. This is
 *    the ONLY head:true read besides propertyStatsQueries; never count via
 *    `data.length` (CLAUDE.md Data Access).
 *  - `list()` — a bounded inbox read: `.limit(10)` for the popover, or
 *    `.range(from, to)` + `{ count: 'exact' }` for the paginated page. Always
 *    ordered `created_at` desc; every row passes through `mapNotificationRow`.
 *
 * `mapNotificationRow` is the typed PostgREST boundary mapper — it throws on
 * missing NOT NULL fields rather than silently producing the literal string
 * "undefined". No `as unknown as` (CLAUDE.md rule #8).
 */

import { queryOptions } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { Database } from "#types/supabase";

// The generated Tables Row already carries the exact nullability for the
// `notifications` table (title / notification_type / user_id / id are NOT
// NULL; the rest are `| null`). Aliasing it avoids duplicating the shape
// (CLAUDE.md rule #3: no duplicate types).
export type NotificationRow =
	Database["public"]["Tables"]["notifications"]["Row"];

export interface NotificationListResult {
	rows: NotificationRow[];
	/** Total rows matching the query before the display limit / page window. */
	totalCount: number;
}

/** Default popover page size (D-02 density reference). */
const POPOVER_LIMIT = 10;

/**
 * Maps a PostgREST row (untyped at the TS level) into the strictly-typed
 * `NotificationRow`. NOT NULL fields throw if absent so a dropped column in a
 * hand-edited `.select(...)` surfaces immediately rather than corrupting React
 * keys / date rendering downstream. Mirrors `mapDocumentRow` in
 * `document-keys.ts` (CLAUDE.md "RPC / PostgREST Return Typing").
 */
export function mapNotificationRow(
	raw: Record<string, unknown>,
): NotificationRow {
	function requireString(field: string): string {
		const value = raw[field];
		if (typeof value !== "string") {
			throw new Error(
				`mapNotificationRow: NOT NULL field '${field}' missing or non-string from PostgREST response`,
			);
		}
		return value;
	}

	return {
		id: requireString("id"),
		user_id: requireString("user_id"),
		notification_type: requireString("notification_type"),
		title: requireString("title"),
		message: (raw.message as string | null) ?? null,
		entity_type: (raw.entity_type as string | null) ?? null,
		entity_id: (raw.entity_id as string | null) ?? null,
		action_url: (raw.action_url as string | null) ?? null,
		is_read: (raw.is_read as boolean | null) ?? null,
		read_at: (raw.read_at as string | null) ?? null,
		created_at: (raw.created_at as string | null) ?? null,
	};
}

// `all` is a plain value array (matching ownerDashboardKeys.all) so mutation
// invalidation can pass `notificationKeys.all` directly alongside
// `ownerDashboardKeys.all` without a call.
export const notificationKeys = {
	all: ["notifications"] as const,
	unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
	lists: () => [...notificationKeys.all, "list"] as const,
	list: (opts?: { limit?: number; from?: number; to?: number }) =>
		[
			...notificationKeys.lists(),
			{
				limit: opts?.limit ?? POPOVER_LIMIT,
				from: opts?.from ?? null,
				to: opts?.to ?? null,
			},
		] as const,
};

export const notificationQueries = {
	/**
	 * Unread badge source (NOTIF-02, D-11). HEAD `count: 'exact'` — the count
	 * comes back in the response header with zero rows transferred. Polled at
	 * 60s (explicit override; the shared REALTIME preset polls at 30s, twice
	 * as often as this phase wants).
	 */
	unreadCount: () =>
		queryOptions({
			queryKey: notificationKeys.unreadCount(),
			queryFn: async (): Promise<number> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const { count, error } = await supabase
					.from("notifications")
					.select("*", { count: "exact", head: true })
					.eq("user_id", user.id)
					.eq("is_read", false);

				if (error) handlePostgrestError(error, "notifications");
				return count ?? 0;
			},
			staleTime: 0,
			refetchInterval: 60_000,
			gcTime: 5 * 60 * 1000,
		}),

	/**
	 * Bounded inbox read (NOTIF-03). Popover → `.limit(10)`; paginated page →
	 * `.range(from, to)`. Both request `{ count: 'exact' }` so `totalCount`
	 * comes from the header, never `data.length`.
	 */
	list: (opts?: { limit?: number; from?: number; to?: number }) =>
		queryOptions({
			queryKey: notificationKeys.list(opts),
			queryFn: async (): Promise<NotificationListResult> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) throw new Error("Not authenticated");

				const base = supabase
					.from("notifications")
					// Explicit column list (every field mapNotificationRow reads); `*`
					// is reserved for detail reads per CLAUDE.md Data Access (IN-04).
					.select(
						"id,user_id,notification_type,title,message,entity_type,entity_id,action_url,is_read,read_at,created_at",
						{ count: "exact" },
					)
					.eq("user_id", user.id)
					.order("created_at", { ascending: false });

				const paginated = opts?.from !== undefined && opts?.to !== undefined;
				const { data, error, count } = paginated
					? await base.range(opts.from as number, opts.to as number)
					: await base.limit(opts?.limit ?? POPOVER_LIMIT);

				if (error) handlePostgrestError(error, "notifications");

				const rows = ((data ?? []) as Record<string, unknown>[]).map(
					mapNotificationRow,
				);
				return { rows, totalCount: count ?? rows.length };
			},
			staleTime: 0,
			gcTime: 5 * 60 * 1000,
		}),
};
