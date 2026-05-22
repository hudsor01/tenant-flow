/**
 * Nav suppression render — Phase 15-05 regression pin.
 *
 * Renders `NavbarDesktopNav` and `NavbarMobileMenu` with `DEFAULT_NAV_ITEMS`
 * and asserts that no rendered anchor carries `href="/blog"`. Belt-and-
 * suspenders pair to `nav-blog-suppression-source.test.ts` per D-13: the
 * source-scan catches direct edits to `DEFAULT_NAV_ITEMS`, this render
 * test catches any hook- or config-injected blog link that would surface
 * in the rendered nav surface without touching the source array.
 *
 * `/blog` is deliberately deferred from the global nav until the first
 * content cohort publishes (AUDIT-2, 2026-05-18; see comment in
 * `src/components/layout/navbar/types.ts` lines 31-39).
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavbarDesktopNav } from "#components/layout/navbar/navbar-desktop-nav";
import { NavbarMobileMenu } from "#components/layout/navbar/navbar-mobile-menu";
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

describe("NavbarDesktopNav — /blog suppression (Plan 15-05)", () => {
	it("renders no <a href='/blog'> across all DEFAULT_NAV_ITEMS", () => {
		render(<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/" />);
		const blogLinks = screen
			.queryAllByRole("link")
			.filter((link) => link.getAttribute("href") === "/blog");
		expect(blogLinks).toHaveLength(0);
	});
});

describe("NavbarMobileMenu — /blog suppression (Plan 15-05)", () => {
	it("renders no <a href='/blog'> across all DEFAULT_NAV_ITEMS", () => {
		render(
			<NavbarMobileMenu
				isOpen={true}
				onOpenChange={() => {}}
				onClose={() => {}}
				navItems={DEFAULT_NAV_ITEMS}
				pathname="/"
				ctaText="Start free trial"
				ctaHref="/signup"
				isAuthenticated={false}
			/>,
		);
		const blogLinks = screen
			.queryAllByRole("link")
			.filter((link) => link.getAttribute("href") === "/blog");
		expect(blogLinks).toHaveLength(0);
	});
});
