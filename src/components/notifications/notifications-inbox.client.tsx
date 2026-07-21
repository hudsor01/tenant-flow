"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { Skeleton } from "#components/ui/skeleton";
import {
	useMarkAllNotificationsRead,
	useNotificationList,
	useUnreadCount,
} from "#hooks/api/use-notifications";
import { NotificationItem } from "./notification-item";

/** Page size for the paginated inbox window. */
const PAGE_SIZE = 20;

/**
 * Full notification inbox (NOTIF-03, D-01). Renders the complete read+unread
 * history (audit-complete) paginated 20-at-a-time, with a header Mark-all-read.
 *
 * Pagination is bounded: passing `{ from, to }` drives
 * `notificationQueries.list()`'s `.range(from, to)` + `{ count: 'exact' }` path,
 * and the total page count derives from the header-sourced `totalCount` — never
 * `data.length` (CLAUDE.md Data Access). The disabled state of Mark-all-read
 * reads the header `useUnreadCount()` (dedupes with the header bell), so it is
 * accurate across pages, not just the loaded window.
 */
export function NotificationsInboxClient() {
	const [page, setPage] = useState(0);
	const from = page * PAGE_SIZE;
	const to = from + PAGE_SIZE - 1;

	const { data, isLoading, isError, refetch } = useNotificationList({
		from,
		to,
	});
	const { data: unreadCount = 0 } = useUnreadCount();
	const markAll = useMarkAllNotificationsRead();

	const rows = data?.rows ?? [];
	const totalCount = data?.totalCount ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
	const currentPage = page + 1;
	const canPrev = page > 0;
	const canNext = currentPage < totalPages;

	// Clamp the page back into range when the total shrinks below the current
	// window (retention cleanup / deletes + refetch). Without this, deleting the
	// rows on the last page strands the user on an empty page whose Prev/Next
	// controls are hidden by the `rows.length === 0` branch (C2). Snap to the
	// last valid page once the refetched count lands.
	useEffect(() => {
		if (!data) return;
		const lastPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
		if (page > lastPage) {
			setPage(lastPage);
		}
	}, [data, totalCount, page]);

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
			<div className="flex items-center justify-between gap-4">
				<h1 className="typography-h1">Notifications</h1>
				<button
					type="button"
					onClick={() => markAll.mutate()}
					disabled={unreadCount === 0 || markAll.isPending}
					className="text-sm text-primary-text hover:underline disabled:pointer-events-none disabled:opacity-50"
				>
					Mark all read
				</button>
			</div>

			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			) : isError ? (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
					<p className="text-sm text-muted-foreground">
						Couldn&apos;t load notifications.
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			) : rows.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Bell aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>No notifications yet</EmptyTitle>
						<EmptyDescription>
							When a lease is signed or a maintenance request comes in,
							you&apos;ll see it here.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<>
					<ul className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
						{rows.map((row) => (
							<NotificationItem key={row.id} notification={row} />
						))}
					</ul>

					{totalPages > 1 && (
						<div className="flex items-center justify-between gap-4 border-t border-border pt-4">
							<p className="text-sm text-muted-foreground">
								Page {currentPage} of {totalPages}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(0, p - 1))}
									disabled={!canPrev}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => p + 1)}
									disabled={!canNext}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
