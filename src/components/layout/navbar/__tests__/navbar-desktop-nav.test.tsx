/**
 * NavbarDesktopNav component test — Phase 8 CONS-03 regression pin.
 *
 * CONS-03's active-nav fix shipped in source already (commit 7540ebe48 +
 * the later 2-arg isActiveLink refactor); this test locks the aria-current
 * WIRING so a future matcher edit can't re-introduce the audit's symptom
 * (the "Compare" link false-highlighting on the homepage).
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavbarDesktopNav } from "#components/layout/navbar/navbar-desktop-nav";
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

describe("NavbarDesktopNav", () => {
	it('emits no aria-current="page" on the homepage (CONS-03)', () => {
		render(<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/" />);
		// No top-level nav link — Compare included — may be marked current on `/`.
		for (const item of DEFAULT_NAV_ITEMS) {
			const link = screen.getByRole("link", {
				name: new RegExp(`^${item.name}`),
			});
			expect(link).not.toHaveAttribute("aria-current", "page");
		}
	});

	it('marks the Compare link aria-current="page" on /compare (CONS-03)', () => {
		render(
			<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/compare" />,
		);
		const compare = screen.getByRole("link", { name: /^Compare/ });
		expect(compare).toHaveAttribute("aria-current", "page");
	});

	it("does not false-highlight Compare on a sibling route (CONS-03)", () => {
		render(
			<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/pricing" />,
		);
		const compare = screen.getByRole("link", { name: /^Compare/ });
		expect(compare).not.toHaveAttribute("aria-current", "page");
		const pricing = screen.getByRole("link", { name: /^Pricing/ });
		expect(pricing).toHaveAttribute("aria-current", "page");
	});

	it('marks Compare aria-current="page" on a /compare child route (CONS-03)', () => {
		// Pins isActiveLink's descendant-route prefix branch
		// (`pathname.startsWith(`${href}/`)`). A revert to a pure exact-match
		// matcher (`pathname === href`) would fail here.
		render(
			<NavbarDesktopNav
				navItems={DEFAULT_NAV_ITEMS}
				pathname="/compare/yardi"
			/>,
		);
		const compare = screen.getByRole("link", { name: /^Compare/ });
		expect(compare).toHaveAttribute("aria-current", "page");
	});

	it("does not false-highlight Compare on a /compare-prefixed sibling (CONS-03)", () => {
		// Pins the trailing-slash guard in isActiveLink's `startsWith` check —
		// without the `/`, `/compareXYZ` would false-positive against `/compare`.
		render(
			<NavbarDesktopNav
				navItems={DEFAULT_NAV_ITEMS}
				pathname="/compare-tools"
			/>,
		);
		const compare = screen.getByRole("link", { name: /^Compare/ });
		expect(compare).not.toHaveAttribute("aria-current", "page");
	});
});
