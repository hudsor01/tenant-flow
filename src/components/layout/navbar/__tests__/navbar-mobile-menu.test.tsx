/**
 * NavbarMobileMenu aria-current wiring: only the exact current page is
 * `aria-current="page"`; a link matched as an ancestor section of the current
 * page is `"true"` (navAriaCurrent), in the top-level rows and the dropdowns.
 *
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NavbarMobileMenu } from "#components/layout/navbar/navbar-mobile-menu";
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

function renderMenu(pathname: string, isAuthenticated = false) {
	return render(
		<NavbarMobileMenu
			isOpen
			onOpenChange={vi.fn()}
			onClose={vi.fn()}
			navItems={DEFAULT_NAV_ITEMS}
			pathname={pathname}
			ctaText="Start free trial"
			ctaHref="/signup"
			isAuthenticated={isAuthenticated}
		/>,
	);
}

// Owner, 2026-11-09 (66.2-39 fix round 4, Part 8k): Settings is the one owner
// page a lapsed subscription reaches; the proxy sends that owner to /pricing.
describe("NavbarMobileMenu signed in", () => {
	it("links to Settings beside Dashboard", () => {
		renderMenu("/pricing", true);
		expect(screen.getByRole("link", { name: /^Settings$/ })).toHaveAttribute(
			"href",
			"/settings",
		);
		expect(screen.getByRole("link", { name: /^Dashboard/ })).toHaveAttribute(
			"href",
			"/dashboard",
		);
	});

	it("shows neither to a signed-out visitor", () => {
		renderMenu("/pricing");
		expect(screen.queryByRole("link", { name: /^Settings$/ })).toBeNull();
		expect(screen.queryByRole("link", { name: /^Dashboard/ })).toBeNull();
	});
});

describe("NavbarMobileMenu aria-current", () => {
	it('marks the exact page "page"', () => {
		renderMenu("/compare");
		expect(screen.getByRole("link", { name: /^Compare/ })).toHaveAttribute(
			"aria-current",
			"page",
		);
	});

	it('marks an ancestor section "true", never "page"', () => {
		renderMenu("/compare/yardi");
		expect(screen.getByRole("link", { name: /^Compare/ })).toHaveAttribute(
			"aria-current",
			"true",
		);
		expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
	});

	it('marks a dropdown child "true" on a page below it', () => {
		renderMenu("/help/getting-started");
		const toggle = screen.getAllByRole("button", { name: /Resources/ })[0];
		if (toggle === undefined) {
			throw new Error("no Resources dropdown toggle rendered");
		}
		fireEvent.click(toggle);
		expect(screen.getByRole("link", { name: /^Help Center/ })).toHaveAttribute(
			"aria-current",
			"true",
		);
		expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
	});
});
