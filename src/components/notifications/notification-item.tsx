"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertTriangle,
	Bell,
	ChevronRight,
	FileCheck,
	FileSignature,
	type LucideIcon,
	Wrench,
} from "lucide-react";
import Link from "next/link";
import type { NotificationRow } from "#hooks/api/query-keys/notification-keys";
import { useMarkNotificationRead } from "#hooks/api/use-notifications";
import { cn } from "#lib/utils";

interface TypeVisual {
	Icon: LucideIcon;
	/** Icon-chip utility (10% vivid bg + AA-safe -text glyph) per 52-UI-SPEC. */
	chip: string;
}

// notification_type -> icon/chip contract (Plan 02 + 52-UI-SPEC Color table).
const TYPE_VISUALS: Record<string, TypeVisual> = {
	lease_signed: { Icon: FileSignature, chip: "icon-bg-primary" },
	lease_executed: { Icon: FileCheck, chip: "icon-bg-primary" },
	lease_finalize_failed: {
		Icon: AlertTriangle,
		chip: "bg-destructive/10 text-destructive-text",
	},
	maintenance_created: { Icon: Wrench, chip: "icon-bg-info" },
	maintenance_status: { Icon: Wrench, chip: "icon-bg-info" },
};

// Neutral fallback for any future / unmapped notification_type (required by
// noUncheckedIndexedAccess — the lookup is otherwise `TypeVisual | undefined`).
const FALLBACK_VISUAL: TypeVisual = {
	Icon: Bell,
	chip: "bg-muted text-muted-foreground",
};

/**
 * Resolves a raw `action_url` to an app-relative href. Open-redirect guard
 * (T-52-15): navigate only when the value starts with a single "/" (app-local),
 * never a protocol-relative "//host" or an absolute external URL. Browsers
 * normalize backslashes to forward slashes and strip embedded tabs/newlines, so
 * "/\evil.com" and "/\t//evil.com" would resolve protocol-relative and slip
 * past a naive "//" check (WR-03) — reject any backslash or control char.
 * Anything else falls back to the inbox.
 *
 * Exported for direct unit coverage of the open-redirect guard (T-52-15).
 */
export function resolveHref(actionUrl: string | null): string {
	if (
		!actionUrl ||
		!actionUrl.startsWith("/") ||
		actionUrl.startsWith("//") ||
		actionUrl.includes("\\")
	) {
		return "/notifications";
	}
	// Browsers strip embedded tabs/newlines, so a value like "/\t//evil.com"
	// would collapse to a protocol-relative "//evil.com" open redirect. Reject
	// any control character outright.
	for (const char of actionUrl) {
		const code = char.charCodeAt(0);
		if (code < 0x20 || code === 0x7f) {
			return "/notifications";
		}
	}
	return actionUrl;
}

interface NotificationItemProps {
	notification: NotificationRow;
	/**
	 * Fired on row click-through (alongside mark-read + navigation) so a
	 * containing popover can close itself (S1). Optional — the full-page inbox
	 * renders items without it.
	 */
	onNavigate?: (() => void) | undefined;
}

export function NotificationItem({
	notification,
	onNavigate,
}: NotificationItemProps) {
	const markRead = useMarkNotificationRead();

	// Read only when is_read is explicitly true; false or null both mean unread.
	const unread = !notification.is_read;
	const { Icon, chip } =
		TYPE_VISUALS[notification.notification_type] ?? FALLBACK_VISUAL;
	const href = resolveHref(notification.action_url);

	const relativeTime = notification.created_at
		? formatDistanceToNow(new Date(notification.created_at), {
				addSuffix: true,
			})
		: "";
	const secondaryLine = notification.message
		? relativeTime
			? `${notification.message} · ${relativeTime}`
			: notification.message
		: relativeTime;

	return (
		<li className={cn(unread && "bg-primary/5")}>
			<Link
				href={href}
				onClick={() => {
					// Mark-read fires alongside navigation (D-03/D-10); it never blocks
					// the navigation. Skip the write for already-read rows.
					if (unread) markRead.mutate(notification.id);
					// Close the containing popover on click-through (S1); no-op in the
					// full-page inbox where onNavigate is undefined.
					onNavigate?.();
				}}
				className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
			>
				{unread && (
					<span
						className="size-2 shrink-0 rounded-full bg-primary"
						aria-hidden="true"
					/>
				)}
				<span
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-lg",
						chip,
					)}
				>
					<Icon className="size-4" aria-hidden="true" />
				</span>
				<div className="min-w-0 flex-1">
					<p
						className={cn(
							"truncate text-sm",
							unread ? "font-semibold" : "font-normal",
						)}
					>
						{notification.title}
					</p>
					{secondaryLine && (
						<p className="truncate text-xs text-muted-foreground">
							{secondaryLine}
						</p>
					)}
				</div>
				<ChevronRight
					className="size-4 shrink-0 text-muted-foreground"
					aria-hidden="true"
				/>
			</Link>
		</li>
	);
}
