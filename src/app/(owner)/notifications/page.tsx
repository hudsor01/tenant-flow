import type { Metadata } from "next";
import { NotificationsInboxClient } from "#components/notifications/notifications-inbox.client";

export const metadata: Metadata = {
	title: "Notifications",
	description:
		"Review every lease, maintenance, and account notification across your portfolio",
};

// Plain owner route (NOTIF-01/03). Auth is enforced by the (owner) app shell +
// proxy middleware, so there is no per-page guard. Intentionally a plain route
// only: no parallel-route modal slot, no default segment file, and no catch-all
// segment. A modal-default or catch-all in the app tree soft-200s every unknown
// URL app-wide and re-breaks 404 handling (documented regression — T-52-18).
export default function NotificationsPage() {
	return <NotificationsInboxClient />;
}
