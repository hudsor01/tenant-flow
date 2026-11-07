/**
 * Decides where owner onboarding tour step 5 points: the sidebar rail or the
 * header SidebarTrigger.
 *
 * Used by:
 * - `src/components/tours/owner-onboarding-tour.tsx` (step 5)
 *
 * The rail is only on-screen when the sidebar is docked and expanded. Below the
 * desktop breakpoint the rail is a Sheet that is not mounted while closed, and
 * the collapsed desktop rail is translated off-screen, so in both cases the
 * step would spotlight nothing. The trigger is rendered at every width, which
 * makes it the only always-visible anchor (D-39, ledger S7).
 */
import type { useSidebar } from "#components/ui/sidebar";

export const SIDEBAR_TOUR_RAIL_SELECTOR = "[data-tour='sidebar-nav']";
export const SIDEBAR_TOUR_TRIGGER_SELECTOR = "[data-tour='sidebar-trigger']";

export type SidebarTourTargetInput = Pick<
	ReturnType<typeof useSidebar>,
	"isMobile" | "state"
>;

export interface SidebarTourTarget {
	anchor: "rail" | "trigger";
	target: string;
	side: "right" | "bottom";
}

export function getSidebarTourTarget({
	isMobile,
	state,
}: SidebarTourTargetInput): SidebarTourTarget {
	if (!isMobile && state === "expanded") {
		return {
			anchor: "rail",
			target: SIDEBAR_TOUR_RAIL_SELECTOR,
			side: "right",
		};
	}
	return {
		anchor: "trigger",
		target: SIDEBAR_TOUR_TRIGGER_SELECTOR,
		side: "bottom",
	};
}
