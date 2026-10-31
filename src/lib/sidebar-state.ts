/**
 * Source of truth for the `sidebar_state` cookie (D-36).
 * Non-client on purpose: the async owner layout (owner-dashboard-layout.tsx)
 * reads the cookie on the server and passes the parsed value to the sidebar
 * provider as its default, and the vendored sidebar writes it on each desktop
 * toggle. The cookie is a UI preference with no identity and no access
 * meaning. Any value other than the literal `false` means expanded.
 */
import { secureCookie } from "./dom-utils";

export const SIDEBAR_COOKIE_NAME = "sidebar_state" as const;
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function parseSidebarOpen(value: string | undefined): boolean {
	return value !== "false";
}

export function persistSidebarOpen(open: boolean): void {
	secureCookie.set(SIDEBAR_COOKIE_NAME, String(open), {
		path: "/",
		maxAge: SIDEBAR_COOKIE_MAX_AGE,
		sameSite: "Lax",
	});
}
