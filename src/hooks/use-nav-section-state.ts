"use client";

/**
 * Open state of the owner sidebar's collapsible sections (Analytics, Reports),
 * kept outside the sidebar itself: the mobile Sheet unmounts its content when
 * it closes (66.2 RESEARCH P10), so state held inside the nav would reset on
 * every close. The AppShell inner child (66.2-33) calls this hook and passes
 * the result down to MainNav.
 *
 * Defaults follow 66.2 UI-SPEC S-7 and CONTEXT D-50: a section is open when it
 * holds the active route (the same prefix rule as the core rows); a manual
 * toggle persists while the layout stays mounted; navigating into a section
 * clears that section's override, so entering it opens it.
 *
 * The override reset runs during render when the pathname changes (React's
 * "adjust state when a prop changes" pattern), never in an effect, so the
 * entered section is open on the same commit as the navigation.
 */

import { useState } from "react";

/**
 * The sidebar's active-route rule: `/dashboard` matches exactly, every other
 * href matches by prefix. Shared by the core rows, the section default and the
 * Settings footer row.
 */
export function isNavPathActive(href: string, pathname: string): boolean {
	if (href === "/dashboard") return pathname === href;
	return pathname.startsWith(href);
}

/** Section href → the user's last manual open/closed choice. */
export type SectionOverrides = Readonly<Record<string, boolean>>;

export function resolveSectionOpen(
	overrides: SectionOverrides,
	href: string,
	pathname: string,
): boolean {
	return overrides[href] ?? isNavPathActive(href, pathname);
}

/**
 * Drops the override of every section the pathname is inside. Returns the input
 * reference when nothing matches, so an unchanged result never triggers a state
 * update.
 */
export function clearEnteredSectionOverrides(
	overrides: SectionOverrides,
	pathname: string,
): SectionOverrides {
	const entries = Object.entries(overrides);
	const kept = entries.filter(([href]) => !isNavPathActive(href, pathname));
	if (kept.length === entries.length) return overrides;
	return Object.fromEntries(kept);
}

export interface NavSectionState {
	isSectionOpen: (href: string) => boolean;
	setSectionOpen: (href: string, open: boolean) => void;
}

export function useNavSectionState(pathname: string): NavSectionState {
	const [overrides, setOverrides] = useState<SectionOverrides>({});
	const [seenPathname, setSeenPathname] = useState(pathname);

	if (pathname !== seenPathname) {
		setSeenPathname(pathname);
		setOverrides((prev) => clearEnteredSectionOverrides(prev, pathname));
	}

	return {
		isSectionOpen: (href) => resolveSectionOpen(overrides, href, pathname),
		setSectionOpen: (href, open) =>
			setOverrides((prev) => ({ ...prev, [href]: open })),
	};
}
