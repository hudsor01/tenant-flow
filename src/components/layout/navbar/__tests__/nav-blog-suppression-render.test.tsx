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
 * IMPORTANT: dropdown sub-items mount only when the dropdown is open. The
 * raw `render(...)` snapshot has `openDropdown === null`, so dropdown items
 * (where the historical regression actually lived) are NOT in the DOM by
 * default. Each test below opens every dropdown-owning item before
 * querying so a `/blog` href added to any `dropdownItems` array would
 * actually surface in `screen.queryAllByRole("link")`. CR-01 fix per
 * 15-REVIEW.md cycle 1.
 *
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavbarDesktopNav } from "#components/layout/navbar/navbar-desktop-nav";
import { NavbarMobileMenu } from "#components/layout/navbar/navbar-mobile-menu";
import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

const dropdownOwners = DEFAULT_NAV_ITEMS.filter(
	(item): item is typeof item & { dropdownItems: ReadonlyArray<unknown> } =>
		"dropdownItems" in item,
);

describe("NavbarDesktopNav — /blog suppression (Plan 15-05)", () => {
	it("renders no <a href='/blog'> across all DEFAULT_NAV_ITEMS (incl. open dropdowns)", () => {
		render(<NavbarDesktopNav navItems={DEFAULT_NAV_ITEMS} pathname="/" />);

		// Open every dropdown so its sub-items mount into the DOM. The wrapper
		// `<div>` that owns the `onMouseEnter` handler is the parent of the
		// trigger Link (see navbar-desktop-nav.tsx:89-93). Without this loop,
		// dropdownItems never render, and a `/blog` href added to any
		// dropdownItems array would silently pass (D-15 coverage gap).
		for (const item of dropdownOwners) {
			const trigger = screen.getByRole("link", {
				name: new RegExp(`^${item.name}$`),
			});
			const wrapper = trigger.parentElement;
			if (wrapper === null) {
				throw new Error(
					`Desktop nav: no wrapper element for dropdown owner "${item.name}"`,
				);
			}
			fireEvent.mouseEnter(wrapper);
		}

		const allLinks = screen.queryAllByRole("link");
		// WR-02 sanity check: render produced a non-trivial link surface. If
		// something silently breaks the render path (a future Radix/jsdom
		// regression, a thrown effect, etc.) the absence assertion below would
		// vacuously pass — this guard trips first.
		expect(allLinks.length).toBeGreaterThan(DEFAULT_NAV_ITEMS.length);
		const blogLinks = allLinks.filter(
			(link) => link.getAttribute("href") === "/blog",
		);
		expect(blogLinks).toHaveLength(0);
	});
});

describe("NavbarMobileMenu — /blog suppression (Plan 15-05)", () => {
	it("renders no <a href='/blog'> across all DEFAULT_NAV_ITEMS (incl. open dropdowns)", () => {
		const { container } = render(
			<NavbarMobileMenu
				isOpen={true}
				onOpenChange={() => {
					// no-op: test does not assert open/close transitions
				}}
				onClose={() => {
					// no-op: test does not assert close behavior
				}}
				navItems={DEFAULT_NAV_ITEMS}
				pathname="/"
				ctaText="Start free trial"
				ctaHref="/signup"
				isAuthenticated={false}
			/>,
		);

		// Open every dropdown by clicking the chevron icon inside each
		// dropdown-owning Link (see navbar-mobile-menu.tsx:66-77 — the
		// ChevronDown's onClick handler calls handleDropdownToggle and
		// preventDefault's the parent Link's navigation).
		for (const item of dropdownOwners) {
			const trigger = screen.getByRole("link", {
				name: new RegExp(`^${item.name}`),
			});
			const chevron = trigger.querySelector("svg");
			if (chevron === null) {
				throw new Error(
					`Mobile nav: no chevron icon found for dropdown owner "${item.name}"`,
				);
			}
			fireEvent.click(chevron);
		}

		const allLinks = screen.queryAllByRole("link");
		// WR-02 sanity check: mobile menu uses a Radix Sheet portal, which is
		// more exposed to jsdom-Radix incompatibilities than the desktop nav.
		// Guard against a silent portal failure that would let the absence
		// assertion below vacuously pass.
		expect(allLinks.length).toBeGreaterThan(DEFAULT_NAV_ITEMS.length);
		const blogLinks = allLinks.filter(
			(link) => link.getAttribute("href") === "/blog",
		);
		expect(blogLinks).toHaveLength(0);
		// Touch `container` so it is used (Radix portals append outside the
		// returned container, but we keep the destructure to make jsdom-portal
		// debugging easier if a future failure needs DOM inspection).
		expect(container).toBeTruthy();
	});
});
