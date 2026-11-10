/**
 * Pins where tour step 5 points. The sidebar rail is on-screen only when it is
 * docked and expanded: the mobile rail is a Sheet that is not mounted while
 * closed, and the collapsed desktop rail is translated off-screen. Every other
 * state must target the always-visible SidebarTrigger (D-39, ledger S7).
 */
import { describe, expect, it } from "vitest";

import {
	getSidebarTourTarget,
	SIDEBAR_TOUR_RAIL_SELECTOR,
	SIDEBAR_TOUR_TRIGGER_SELECTOR,
} from "#components/tours/sidebar-tour-target";

const RAIL = {
	anchor: "rail",
	target: SIDEBAR_TOUR_RAIL_SELECTOR,
	side: "right",
} as const;

const TRIGGER = {
	anchor: "trigger",
	target: SIDEBAR_TOUR_TRIGGER_SELECTOR,
	side: "bottom",
} as const;

describe("getSidebarTourTarget", () => {
	it("targets the rail on the right when docked and expanded", () => {
		expect(
			getSidebarTourTarget({ isMobile: false, state: "expanded" }),
		).toEqual(RAIL);
	});

	it("targets the trigger below when the docked rail is collapsed", () => {
		expect(
			getSidebarTourTarget({ isMobile: false, state: "collapsed" }),
		).toEqual(TRIGGER);
	});

	it("targets the trigger when the sidebar is a sheet, whatever the desktop state says", () => {
		expect(getSidebarTourTarget({ isMobile: true, state: "expanded" })).toEqual(
			TRIGGER,
		);
	});

	it("targets the trigger when the sidebar is a sheet and collapsed", () => {
		expect(
			getSidebarTourTarget({ isMobile: true, state: "collapsed" }),
		).toEqual(TRIGGER);
	});

	it("pins the two selector strings, which differ", () => {
		expect(SIDEBAR_TOUR_RAIL_SELECTOR).toBe("[data-tour='sidebar-nav']");
		expect(SIDEBAR_TOUR_TRIGGER_SELECTOR).toBe("[data-tour='sidebar-trigger']");
		expect(SIDEBAR_TOUR_RAIL_SELECTOR).not.toBe(SIDEBAR_TOUR_TRIGGER_SELECTOR);
	});

	it("returns the exported selector for each anchor", () => {
		const combos = [
			{ isMobile: false, state: "expanded" },
			{ isMobile: false, state: "collapsed" },
			{ isMobile: true, state: "expanded" },
			{ isMobile: true, state: "collapsed" },
		] as const;
		for (const input of combos) {
			const result = getSidebarTourTarget(input);
			const expected =
				result.anchor === "rail"
					? SIDEBAR_TOUR_RAIL_SELECTOR
					: SIDEBAR_TOUR_TRIGGER_SELECTOR;
			expect(result.target).toBe(expected);
		}
	});
});
