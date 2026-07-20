"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import { Separator } from "#components/ui/separator";
import { Skeleton } from "#components/ui/skeleton";
import {
	useMarkAllNotificationsRead,
	useNotificationList,
	useUnreadCount,
} from "#hooks/api/use-notifications";
import { NotificationItem } from "./notification-item";

interface NotificationPopoverListProps {
	/**
	 * Called when the user navigates away via a row click-through or the
	 * View-all link, so the owning popover can close itself (S1). Never fires
	 * on open/close alone, keeping D-10 (opening never marks read) intact.
	 */
	onNavigate?: () => void;
}

/**
 * Popover inbox body (NOTIF-03). Density mirrors the header CommandDialog (D-02):
 * sticky header (title + Mark-all-read), a scrollable `max-h-96` body of the 10
 * most recent notifications, and a sticky footer linking to the full inbox.
 */
export function NotificationPopoverList({
	onNavigate,
}: NotificationPopoverListProps = {}) {
	const { data, isLoading, isError, refetch } = useNotificationList({
		limit: 10,
	});
	const markAll = useMarkAllNotificationsRead();
	// Drive the disabled state from the same header count the bell badge uses,
	// not the visible top-10 slice: is_read is independent of recency, so an
	// owner who has read the 10 newest rows can still have older unread ones
	// that Mark-all-read would clear (WR-01). Dedupes the already-polled query.
	const { data: unreadCount = 0 } = useUnreadCount();

	const rows = data?.rows ?? [];

	return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2">
				<span className="text-base font-semibold">Notifications</span>
				<button
					type="button"
					onClick={() => markAll.mutate()}
					disabled={unreadCount === 0 || markAll.isPending}
					className="text-sm text-primary-text hover:underline disabled:pointer-events-none disabled:opacity-50"
				>
					Mark all read
				</button>
			</div>
			<Separator />

			{/* Body */}
			<div className="max-h-96 overflow-y-auto">
				{isLoading ? (
					<div className="space-y-2 p-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : isError ? (
					// Error branch precedes the empty branch (C11): a failed list
					// query must not masquerade as "all caught up". Compact,
					// popover-sized version of the inbox error copy + Retry.
					<div className="flex flex-col items-center gap-3 p-6 text-center">
						<p className="text-sm text-muted-foreground">
							Couldn&apos;t load notifications.
						</p>
						<Button variant="outline" size="sm" onClick={() => refetch()}>
							Retry
						</Button>
					</div>
				) : rows.length === 0 ? (
					<Empty className="gap-2 p-8 md:p-8">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Bell aria-hidden="true" />
							</EmptyMedia>
							<EmptyTitle>You&apos;re all caught up</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : (
					<ul className="divide-y divide-border">
						{rows.map((row) => (
							<NotificationItem
								key={row.id}
								notification={row}
								onNavigate={onNavigate}
							/>
						))}
					</ul>
				)}
			</div>

			{/* Footer */}
			<Separator />
			<div className="px-4 py-2">
				<Link
					href="/notifications"
					onClick={() => onNavigate?.()}
					className="block text-sm font-medium text-primary-text hover:underline"
				>
					View all notifications
				</Link>
			</div>
		</div>
	);
}
