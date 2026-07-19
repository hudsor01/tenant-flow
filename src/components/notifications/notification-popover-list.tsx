"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
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
} from "#hooks/api/use-notifications";
import { NotificationItem } from "./notification-item";

/**
 * Popover inbox body (NOTIF-03). Density mirrors the header CommandDialog (D-02):
 * sticky header (title + Mark-all-read), a scrollable `max-h-96` body of the 10
 * most recent notifications, and a sticky footer linking to the full inbox.
 */
export function NotificationPopoverList() {
	const { data, isLoading } = useNotificationList({ limit: 10 });
	const markAll = useMarkAllNotificationsRead();

	const rows = data?.rows ?? [];
	const unreadVisible = rows.filter((row) => !row.is_read).length;

	return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2">
				<span className="text-base font-semibold">Notifications</span>
				<button
					type="button"
					onClick={() => markAll.mutate()}
					disabled={unreadVisible === 0 || markAll.isPending}
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
							<NotificationItem key={row.id} notification={row} />
						))}
					</ul>
				)}
			</div>

			{/* Footer */}
			<Separator />
			<div className="px-4 py-2">
				<Link
					href="/notifications"
					className="block text-sm font-medium text-primary-text hover:underline"
				>
					View all notifications
				</Link>
			</div>
		</div>
	);
}
