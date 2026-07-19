"use client";

import { Bell } from "lucide-react";
import { Badge } from "#components/ui/badge";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#components/ui/popover";
import { useUnreadCount } from "#hooks/api/use-notifications";
import { NotificationPopoverList } from "./notification-popover-list";

/**
 * Header client island (NOTIF-02). Renders the bell trigger with a live unread
 * badge (60s HEAD poll via `useUnreadCount`, capped at "9+", hidden at 0) and
 * opens the notification popover. Opening the popover never clears the badge
 * (D-10) — only an explicit mark-read/mark-all-read does.
 */
export function NotificationBell() {
	const { data } = useUnreadCount();
	const count = data ?? 0;
	const hasUnread = count > 0;
	const badgeText = count > 9 ? "9+" : String(count);
	const ariaLabel = hasUnread
		? `Notifications, ${count} unread`
		: "Notifications";

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={ariaLabel}
					className="relative flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 transition-colors hover:bg-muted"
				>
					<Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
					{hasUnread && (
						<Badge
							aria-hidden="true"
							className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-xs font-semibold"
						>
							{badgeText}
						</Badge>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={8} className="w-80 p-0">
				<NotificationPopoverList />
			</PopoverContent>
		</Popover>
	);
}
