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

function renderMenu(pathname: string) {
	return render(
		<NavbarMobileMenu
			isOpen
			onOpenChange={vi.fn()}
			onClose={vi.fn()}
			navItems={DEFAULT_NAV_ITEMS}
			pathname={pathname}
			ctaText="Start free trial"
			ctaHref="/signup"
			isAuthenticated={false}
		/>,
	);
}

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
