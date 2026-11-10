import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { SubscriptionStatusBanner } from "#components/billing/subscription-status-banner";
import { AppShell } from "#components/shell/app-shell";
import { parseSidebarOpen, SIDEBAR_COOKIE_NAME } from "#lib/sidebar-state";

/**
 * Owner Dashboard Layout
 *
 * Renders the owner shell on the canonical sidebar:
 * - Sidebar navigation with command palette trigger
 * - Header with the sidebar toggle, breadcrumbs and user menu
 * - Floating quick actions dock
 * - SubscriptionStatusBanner at top for past_due/unpaid/canceled states
 *
 * The `sidebar_state` cookie is read here so the server render already carries
 * the persisted collapse state (D-36). It holds a UI preference only and is
 * never used for an access decision; only the parsed boolean reaches AppShell.
 *
 * Auth is handled by proxy.ts - this is purely presentational.
 */
export async function OwnerDashboardLayout({
	children,
}: {
	children: ReactNode;
}) {
	const cookieStore = await cookies();
	const defaultSidebarOpen = parseSidebarOpen(
		cookieStore.get(SIDEBAR_COOKIE_NAME)?.value,
	);

	return (
		<AppShell defaultSidebarOpen={defaultSidebarOpen}>
			<SubscriptionStatusBanner />
			{children}
		</AppShell>
	);
}
